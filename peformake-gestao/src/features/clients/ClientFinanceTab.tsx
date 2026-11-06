import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/cn'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { supabase } from '@/lib/supabase'
import { getSetupFee } from './clientsApi'
import type { ClientRecord } from './clientRules'
import { brlValue, dateBr } from './format'
import { clientValue, lineValue } from './portfolioRules'
import { Block, Fact } from './ui'

interface InvoiceRow { id: string; description: string | null; amount: number; due_date: string; status: string; paid_at: string | null; payment_url: string | null; unit: string }

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
      const { data, error } = await supabase.from('invoices').select('id, description, amount, due_date, status, paid_at, payment_url, unit').eq('client_id', client.id).order('due_date', { ascending: false })
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

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-4">
        {[
          ['Valor do contrato', `${brlValue(value.value)}${client.contract?.model === 'MRR' ? '/mês' : ''}`],
          ['Já recebido', brlValue(paid)],
          ['Em aberto', brlValue(open.reduce((s, r) => s + Number(r.amount), 0))],
          ['Em atraso', late.length ? `${late.length} · ${brlValue(late.reduce((s, r) => s + Number(r.amount), 0))}` : 'Nada'],
        ].map(([label, v], i) => (
          <div key={label} className={cn('rounded-2xl border border-line bg-surface px-4 py-3', i === 3 && late.length > 0 && 'border-warn/40 bg-warn-soft/50')}>
            <p className="text-[12px] font-medium text-muted">{label}</p>
            <p className="mt-1 text-[18px] font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Block title="Faturas">
          {invoices.isPending && <p role="status" className="text-muted">Carregando</p>}
          {invoices.isError && <p role="alert" className="text-warn-ink">Não foi possível carregar as faturas.</p>}
          {!invoices.isPending && rows.length === 0 && <p className="text-muted">Nenhuma fatura ainda. Elas aparecem aqui quando a cobrança do mês é gerada no Financeiro.</p>}
          <ul className="flex flex-col">
            {rows.map((r) => {
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
                    <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', tone)}>{label}</span>
                  </span>
                </li>
              )
            })}
          </ul>
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
  )
}
