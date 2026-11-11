import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { AV_LABEL, type AvStatus } from '@/features/av/avRules'
import { brl, dayLabel, todayBR } from '@/features/finance/money'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { ClientAvatar } from './ClientAvatar'
import { whatsappLink } from './clientRules'
import { logoPublicUrl } from './clientsApi'
import { Block, ErrorBox } from './ui'

interface Sheet {
  id: string; name: string; logo_path: string | null; legacy_logo_url: string | null; is_active: boolean; instagram: string | null
  contact: string; phone: string | null
  projects: { id: string; title: string; status: AvStatus; shoot_at: string | null; due_date: string | null; delivered_at: string | null }[]
  invoices: { id: string; description: string; amount: number; due_date: string; status: string; paid_at: string | null }[]
}

type Rpc = (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>

/** Ficha resumida do cliente para quem é da Ellcazo: contato, projetos e faturas da Ellcazo. Nada da Peformake. */
export function EllcazoClientSheet() {
  const { id = '' } = useParams()
  const q = useQuery({
    queryKey: ['ellcazo-client-sheet', id],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as Rpc)('ellcazo_client_sheet', { _client: id })
      if (error) throw new Error(error.message)
      return data as Sheet | null
    },
  })
  if (q.isPending) return <p role="status" className="text-muted">Carregando</p>
  if (q.isError) {
    return /permiss/i.test((q.error as Error).message)
      ? <CenteredMessage title="Este cliente não é da Ellcazo" text="Aqui aparecem só os clientes com projeto, orçamento, fotos ou fatura da Ellcazo." />
      : <ErrorBox text="Não foi possível carregar o cliente." onRetry={() => void q.refetch()} />
  }
  const c = q.data
  if (!c) return <CenteredMessage title="Cliente não encontrado" />
  const wa = whatsappLink(c.phone)
  const today = todayBR()
  const open = c.invoices.filter((i) => i.status === 'pendente' || i.status === 'vencido')
  const late = open.filter((i) => i.due_date < today)

  return (
    <div className="flex flex-col gap-4">
      <Link to="/audiovisual" className="inline-flex min-h-10 items-center gap-1 self-start text-[13px] font-medium text-muted no-underline hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Audiovisual</Link>
      <header className="flex items-center gap-3">
        <ClientAvatar name={c.name} url={logoPublicUrl(c.logo_path) ?? c.legacy_logo_url} size="md" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-semibold tracking-tight md:text-3xl">{c.name}</h1>
          <p className="truncate text-[13px] text-muted">{c.contact !== c.name ? `${c.contact} · ` : ''}{c.is_active ? 'Cliente ativo' : 'Cliente inativo'}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-fill px-4 font-semibold text-on-fill no-underline"><MessageCircle size={16} aria-hidden="true" /> WhatsApp</a>}
        {c.phone && <a href={`tel:+${c.phone.length <= 11 ? '55' + c.phone : c.phone}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-semibold text-ink no-underline hover:border-ink"><Phone size={16} aria-hidden="true" /> Ligar</a>}
        {!c.phone && <p className="text-[13px] text-muted">Sem telefone cadastrado. Peça ao administrador para completar o contato.</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Block title="Projetos da Ellcazo">
          {c.projects.length === 0 ? <p className="text-[13px] text-muted">Nenhum projeto ainda.</p> : (
            <ul className="flex flex-col">
              {c.projects.map((p) => (
                <li key={p.id} className="border-b border-line last:border-b-0">
                  <Link to={`/audiovisual/projeto/${p.id}`} className="flex min-h-12 items-center justify-between gap-3 py-1.5 text-ink no-underline hover:underline">
                    <span className="min-w-0 truncate font-medium">{p.title}</span>
                    <span className="shrink-0 text-[12px] text-muted">{AV_LABEL[p.status] ?? p.status}{p.shoot_at ? ` · ${dayLabel(p.shoot_at.slice(0, 10))}` : ''}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Block>
        <Block title="Faturas da Ellcazo" action={open.length > 0 ? <Link to="/financeiro/cobranca" className="text-[13px] font-semibold">Ir para Cobrança</Link> : undefined}>
          {c.invoices.length === 0 ? <p className="text-[13px] text-muted">Nenhuma fatura.</p> : (
            <>
              {late.length > 0 && <p className="mb-2 rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-semibold text-warn-ink">{late.length === 1 ? '1 fatura vencida' : `${late.length} faturas vencidas`}: {brl(late.reduce((a, i) => a + Number(i.amount), 0))}</p>}
              <ul className="flex flex-col">
                {c.invoices.map((i) => {
                  const st = i.status === 'pago' ? { t: `Pago ${i.paid_at ? dayLabel(i.paid_at.slice(0, 10)) : ''}`, c: 'bg-ok-soft text-ok-ink' }
                    : i.due_date < today ? { t: 'Vencida', c: 'bg-warn-soft text-warn-ink' } : { t: 'Em aberto', c: 'bg-raised text-muted' }
                  return (
                    <li key={i.id} className="flex min-h-12 items-center justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
                      <span className="min-w-0"><span className="block truncate font-medium">{i.description}</span><span className="text-[12px] text-muted">vence {dayLabel(i.due_date)}</span></span>
                      <span className="flex shrink-0 items-center gap-2"><span className="tabular-nums text-[13px]">{brl(i.amount)}</span><span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', st.c)}>{st.t}</span></span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </Block>
      </div>
    </div>
  )
}
