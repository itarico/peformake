import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, Copy, ExternalLink, Plus } from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { DueDialog, PayInvoiceDialog, openAmount } from '@/features/finance/BillingPage'
import { ServiceJobDialog } from '@/features/finance/ServiceJobDialog'
import { cn } from '@/lib/cn'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { supabase } from '@/lib/supabase'
import { getSetupFee } from './clientsApi'
import type { ClientRecord } from './clientRules'
import { brlValue, dateBr } from './format'
import { clientValue, lineValue } from './portfolioRules'
import { Block, Fact } from './ui'
import { ClientDialog } from './ClientFormPage'
import { BidsSection } from '@/features/bids/BidsSection'
import { isBidInvoice } from '@/features/bids/bidRules'
import { useSearchParams } from 'react-router-dom'

interface InvoiceRow { id: string; description: string | null; amount: number; due_date: string; status: string; paid_at: string | null; payment_url: string | null; unit: string; pay_token: string; group_id: string | null; source: string; ref?: string | null; partial_paid?: number | null }
type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = (fn: string, a?: Record<string, unknown>) => (supabase.rpc as unknown as Rpc)(fn, a)
const RECEIVER = [['', 'Cada empresa cobra a sua'], ['peformake', 'Peformake recebe tudo e repassa à Ellcazo'], ['ellcazo', 'Ellcazo recebe tudo e repassa à Peformake']] as const

const STATUS: Record<string, [string, string]> = {
  pago: ['Pago', 'bg-ok-soft text-ok-ink'],
  vencido: ['Em atraso', 'bg-warn-soft text-warn-ink'],
  pendente: ['Em aberto', 'bg-raised text-muted'],
  atrasado: ['Em atraso', 'bg-warn-soft text-warn-ink'],
  cancelado: ['Cancelado', 'bg-raised text-muted'],
}

/** Financeiro do cliente (só administrador): valor do contrato, quanto já pagou e cada fatura. */
export function ClientFinanceTab({ client }: { client: ClientRecord }) {
  const invoices = useQuery({
    queryKey: ['client-invoices', client.id],
    queryFn: async () => {
      const cols = 'id, description, amount, due_date, status, paid_at, payment_url, unit, pay_token, group_id, source, ref'
      const first = await supabase.from('invoices').select(`${cols}, partial_paid`).eq('client_id', client.id).order('due_date', { ascending: false })
      const { data, error } = first.error?.code === '42703' ? await supabase.from('invoices').select(cols).eq('client_id', client.id).order('due_date', { ascending: false }) : first
      if (error) throw error
      return (data ?? []) as unknown as InvoiceRow[]
    },
  })
  const fee = useQuery({ queryKey: ['client-fee', client.id], queryFn: () => getSetupFee(client.id) })
  const today = todayInBrazil()
  const rows = invoices.data ?? []
  const paid = rows.filter((r) => r.status === 'pago').reduce((s, r) => s + Number(r.amount), 0)
  const open = rows.filter((r) => r.status !== 'pago' && r.status !== 'cancelado')
  const late = open.filter((r) => r.due_date < today)
  const value = clientValue(client.services, client.clientType === 'one-off' ? 'avulso' : undefined)
  const active = client.services.filter((s) => s.isActive)
  // Próximo vencimento: a próxima fatura em aberto; sem fatura, o dia de cobrança do contrato no mês corrente ou seguinte.
  const nextOpen = [...open].sort((a, b) => a.due_date.localeCompare(b.due_date))[0]?.due_date ?? null
  const day = client.contract?.billingDay ?? null
  const nextFromDay = day ? (() => { const [y, m] = today.split('-').map(Number); const pad = (n: number) => String(n).padStart(2, '0'); const thisMonth = `${y}-${pad(m!)}-${pad(day)}`; return thisMonth >= today ? thisMonth : `${m === 12 ? y! + 1 : y}-${pad(m === 12 ? 1 : m! + 1)}-${pad(day)}` })() : null
  const nextDue = nextOpen ?? (client.clientType === 'one-off' ? null : nextFromDay)
  const [editing, setEditing] = useState(false)
  const [job, setJob] = useState(false)
  const [paying, setPaying] = useState<InvoiceRow | null>(null)
  const [dueFor, setDueFor] = useState<InvoiceRow | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const [, setParams] = useSearchParams()
  const refresh = () => { for (const k of ['client-invoices', 'invoices', 'fin-entries', 'fin-summary']) void queryClient.invalidateQueries({ queryKey: [k] }) }
  const pay = useMutation({
    mutationFn: async (v: { id: string; date: string; amount: number | null }) => {
      const { error } = await rpc('invoice_set_paid', { _id: v.id, _paid_at: v.date, _amount: v.amount })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setNotice('Pagamento registrado. Caixa e Cobrança já foram atualizados.'); refresh() },
    onError: (e) => setNotice(`Não foi possível registrar: ${(e as Error).message}`),
  })
  const receiver = useQuery({
    queryKey: ['client-receiver', client.id],
    queryFn: async () => {
      const from = supabase.from as unknown as (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { billing_receiver: string | null } | null; error: unknown }> } } }
      const { data, error } = await from('clients').select('billing_receiver').eq('id', client.id).maybeSingle()
      return error ? undefined : (data?.billing_receiver ?? '')
    },
  })
  const saveReceiver = useMutation({
    mutationFn: async (v: string) => {
      const { error } = await rpc('client_receiver_save', { _client: client.id, _receiver: v || null })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setNotice('Quem recebe atualizado. As próximas cobranças seguem essa escolha.'); void receiver.refetch(); refresh() },
    onError: (e) => setNotice(`Não foi possível salvar: ${(e as Error).message}`),
  })
  const copyPay = (token: string) => { void navigator.clipboard.writeText(`${window.location.origin}/pagar/${token}`); setNotice('Link copiado. É só colar na conversa com o cliente.') }

  return (
    <div className="flex flex-col gap-3">
      <BidsSection clientId={client.id} />
      <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-5">
        {[
          ['Vencimento', client.contract?.billingDay ? `Todo dia ${client.contract.billingDay}` : 'Não definido', nextDue ? `Próximo: ${dateBr(nextDue)}` : ''],
          ['Valor do contrato', `${brlValue(value.value)}${client.contract?.model === 'MRR' ? '/mês' : ''}`],
          ['Já recebido', brlValue(paid)],
          ['Em aberto', brlValue(open.reduce((s, r) => s + Number(r.amount), 0))],
          ['Em atraso', late.length ? `${late.length} · ${brlValue(late.reduce((s, r) => s + Number(r.amount), 0))}` : 'Nada'],
        ].map(([label, v, hint], i) => (
          <div key={label} className={cn('rounded-2xl border border-line bg-surface px-4 py-3', i === 4 && late.length > 0 && 'border-warn/40 bg-warn-soft/50')}>
            <p className="text-[12px] font-medium text-muted">{label}</p>
            <p className="mt-1 text-[18px] font-semibold tabular-nums">{v}</p>
            {hint && <p className="text-[12px] text-muted">{hint}</p>}
            {i === 0 && client.clientType !== 'one-off' && (
              <button type="button" onClick={() => setEditing(true)} className="mt-1.5 inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full border border-line-strong px-2.5 text-[12px] font-semibold hover:border-ink">
                <CalendarClock size={13} aria-hidden="true" /> Mudar vencimento
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Block title="Faturas" action={<span className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setParams((c) => { const p = new URLSearchParams(c); p.set('licitacao', 'nova'); return p }, { replace: true })} className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full border border-line-strong px-2.5 text-[12px] font-semibold hover:border-ink">
            <Plus size={13} aria-hidden="true" /> Licitação
          </button>
          <button type="button" onClick={() => setJob(true)} className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full border border-line-strong px-2.5 text-[12px] font-semibold hover:border-ink">
            <Plus size={13} aria-hidden="true" /> Serviço avulso
          </button>
        </span>}>
          {invoices.isPending && <p role="status" className="text-muted">Carregando</p>}
          {invoices.isError && <p role="alert" className="text-warn-ink">Não foi possível carregar as faturas.</p>}
          {!invoices.isPending && rows.length === 0 && <p className="text-muted">Nenhuma fatura ainda. Elas aparecem aqui quando a cobrança do mês é gerada no Financeiro.</p>}
          {notice && <p role="status" className="mb-1 rounded-xl bg-raised px-3 py-2 text-[13px] font-medium">{notice}</p>}
          <ul className="flex flex-col">
            {rows.map((r) => {
              const isOpenRow = r.status === 'pendente' || r.status === 'vencido'
              const isLate = r.status !== 'pago' && r.status !== 'cancelado' && r.due_date < today
              const [label, tone] = isLate ? STATUS.atrasado! : STATUS[r.status] ?? [r.status, 'bg-raised text-muted']
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2 text-[13px] first:border-t-0">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.description ?? 'Mensalidade'}</span>
                    <span className="text-muted">vence {dateBr(r.due_date)}{r.paid_at && ` · pago em ${dateBr(r.paid_at)}`}{r.unit === 'ellcazo' && ' · Ellcazo'}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">{brlValue(Number(r.amount))}</span>
                    {isOpenRow && Number(r.partial_paid ?? 0) > 0 && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[12px] font-semibold text-warn-ink">Parcial: falta {brlValue(openAmount(r))}</span>}
                    <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', tone)}>{label}</span>
                    {isOpenRow && !isBidInvoice(r) && <button type="button" onClick={() => copyPay(r.pay_token)} aria-label="Copiar link de pagamento" title="Copiar link de pagamento"
                      className="grid size-11 cursor-pointer place-items-center rounded-full border border-line hover:border-ink"><Copy size={15} aria-hidden="true" /></button>}
                    <ActionMenu label={`Ações da fatura ${r.description ?? ''}`} actions={[
                      { label: 'Recebi (marcar pago)', icon: <Check size={15} aria-hidden="true" />, hidden: !isOpenRow, disabled: pay.isPending, onClick: () => setPaying(r) },
                      { label: 'Mudar data', icon: <CalendarClock size={15} aria-hidden="true" />, hidden: !isOpenRow || !!r.payment_url, onClick: () => setDueFor(r) },
                      { label: 'Abrir link no Asaas', icon: <ExternalLink size={15} aria-hidden="true" />, href: r.payment_url ?? undefined, hidden: !r.payment_url },
                      { label: 'Ver na Cobrança', icon: <ExternalLink size={15} aria-hidden="true" />, onClick: () => { window.location.assign(`/financeiro/cobranca?fatura=${r.id}`) } },
                    ]} />
                  </span>
                </li>
              )
            })}
          </ul>
        </Block>
        <div className="flex flex-col gap-3">
        <Block title="Quem recebe">
          {receiver.data === undefined ? <p className="text-[13px] text-muted">{receiver.isPending ? 'Carregando' : 'Disponível assim que a atualização do banco for aplicada.'}</p> : (
            <label className="flex flex-col gap-1 text-[13px] font-semibold">Pagamento das duas empresas
              <select value={receiver.data} disabled={saveReceiver.isPending} onChange={(e) => saveReceiver.mutate(e.target.value)} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal">
                {RECEIVER.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <span className="font-normal text-muted">{receiver.data ? 'Uma cobrança só, emitida por quem recebe. A parte da outra empresa vira "a repassar" no Caixa.' : 'Peformake e Ellcazo mandam cobranças separadas.'}</span>
            </label>
          )}
        </Block>
        <Block title="Composição do valor">
          <dl className="flex flex-col gap-2">
            {active.map((s) => <Fact key={s.id} label={`${s.name}${s.quantity && s.quantity > 1 ? ` × ${s.quantity}` : ''}`} value={<span className="tabular-nums">{s.price === null || s.price === undefined ? <span className="text-warn-ink">sem preço</span> : brlValue(lineValue(s))}</span>} />)}
            {active.length === 0 && <p className="text-muted">Nenhum serviço ativo.</p>}
            <Fact label="Taxa de implantação" value={fee.data ? brlValue(fee.data) : 'Nenhuma'} />
          </dl>
        </Block>
        </div>
      </div>
      {editing && <ClientDialog open clientId={client.id} startTab="contrato" onClose={() => setEditing(false)} />}
      {paying && <PayInvoiceDialog invoice={{ ...paying, description: paying.description ?? 'Mensalidade' }} name={client.name} single={!paying.group_id && 'partial_paid' in paying} onClose={() => setPaying(null)}
        onPay={(date, amount) => { pay.mutate({ id: paying.id, date, amount }); setPaying(null) }} />}
      {dueFor && <DueDialog target={{ id: dueFor.id, label: `${client.name} · ${dueFor.description ?? 'Fatura'}`, due: dueFor.due_date, monthly: dueFor.source === 'mensalidade' }} onClose={() => setDueFor(null)} onSaved={(msg) => { setNotice(msg); refresh() }} />}
      {job && <ServiceJobDialog clientId={client.id} onClose={() => setJob(false)} />}
    </div>
  )
}
