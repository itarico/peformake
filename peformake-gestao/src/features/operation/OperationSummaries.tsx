import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import { operationOverview, operationTone, useOperation, type OperationRow } from './operationApi'

export function OperationChips({ row }: { row: OperationRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {row.design && <Chip label="Design" value={`${row.design.done}/${row.design.total}${row.design.waiting ? ` · ${row.design.waiting} com o cliente` : ''}`} warn={row.design.total === 0} />}
      {row.audiovisual && <Chip label="Vídeo" value={row.audiovisual.total === 0 ? 'projeto do mês não criado' : `${row.audiovisual.done}/${row.audiovisual.total}`} warn={row.audiovisual.total === 0} />}
      {row.trafego && <Chip label="Tráfego" value={`${Math.min(row.trafego.weekly_sent, row.trafego.weekly_due)}/${row.trafego.weekly_due} relatórios · estratégia ${row.trafego.strategy ? 'revisada' : 'pendente'}`} warn={!row.trafego.strategy} />}
    </div>
  )
}

function Chip({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium', warn ? 'bg-warn-soft text-warn-ink' : 'bg-raised')}><span className="text-muted">{label}</span> {value}</span>
}

export function OperationBar({ row }: { row: OperationRow }) {
  const t = operationTone(row.pct)
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={row.pct ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Entrega de ${row.name}`}>
      <span className={cn('block h-full rounded-full', t.bar)} style={{ width: `${row.pct ?? 0}%` }} />
    </div>
  )
}

/** Início: média de entrega do mês e os três clientes mais atrasados. */
export function OperationHomeSummary({ month }: { month: string }) {
  const q = useOperation(month)
  if (!q.data) return q.isPending ? <p role="status" className="text-[13px] text-muted">Carregando</p> : null
  const o = operationOverview(q.data)
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Média de entrega', value: o.avg == null ? '—' : `${o.avg}%` },
          { label: 'Em dia', value: String(o.onTrack) },
          { label: 'Atrasados', value: String(o.late.length), warn: o.late.length > 0 },
        ].map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-surface px-4 py-3">
            <p className="text-[12px] font-medium text-muted">{t.label}</p>
            <p className={cn('text-[22px] font-semibold tabular-nums', t.warn && 'text-warn-ink')}>{t.value}</p>
          </div>
        ))}
      </div>
      {o.late.length > 0 && (
        <ul className="flex flex-col gap-2">
          {o.late.slice(0, 3).map((r) => (
            <li key={r.client_id} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3">
              <div className="flex justify-between gap-2"><Link to={`/clientes/${r.client_id}`} className="font-semibold text-ink hover:underline">{r.name}</Link><span className="text-[13px] font-semibold text-warn-ink tabular-nums">{r.pct}%</span></div>
              <OperationBar row={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Página do cliente: entregas do mês deste cliente. */
export function ClientOperationBlock({ clientId, month }: { clientId: string; month: string }) {
  const q = useOperation(month)
  const row = q.data?.find((r) => r.client_id === clientId)
  const status = useServiceStatus(clientId, month)
  if (!row) return null
  // Selo pela situação dos serviços (mesma regra do fechamento): atraso só depois do dia 25, e o que está com o cliente não é atraso nosso.
  const rows = status.data ?? []
  const open = rows.filter((r) => r.state !== 'entregue')
  const base = operationTone(row.pct)
  const t = !rows.length ? base
    : rows.some((r) => r.state === 'faltou' || r.state === 'sem_planejamento') ? { ...base, label: 'Atrasado', chip: 'bg-warn-soft text-warn-ink' }
    : !open.length ? { ...base, label: 'Em dia', chip: 'bg-ok-soft text-ok-ink' }
    : open.every((r) => r.state === 'esperando_cliente') ? { ...base, label: 'Esperando o cliente', chip: 'bg-accent-soft text-accent-ink' }
    : { ...base, label: `No prazo até 25/${month.slice(5, 7)}`, chip: 'bg-raised text-muted' }
  return (
    <section aria-labelledby="entregas-mes" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="entregas-mes" className="text-[15px] font-semibold">Entregas do mês</h2>
        <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', t.chip)}>{row.pct == null ? t.label : `${row.pct}% · ${t.label}`}</span>
      </div>
      <OperationBar row={row} />
      <ServiceStatusList clientId={clientId} month={month} />
    </section>
  )
}

interface ServiceStatus { client_service_id: string; service: string; measure: string | null; contracted: number | null; delivered: number | null; with_client: number; client_late: number; ours_missing: number | null; state: string }
const STATE: Record<string, { label: string; tone: string }> = {
  entregue: { label: 'Entregue', tone: 'bg-ok-soft text-ok-ink' },
  em_andamento: { label: 'Em andamento', tone: 'bg-raised text-muted' },
  esperando_cliente: { label: 'Esperando o cliente', tone: 'bg-accent-soft text-accent-ink' },
  faltou: { label: 'Faltou (nosso)', tone: 'bg-warn-soft text-warn-ink' },
  sem_planejamento: { label: 'Sem planejamento', tone: 'bg-warn-soft text-warn-ink' },
}

/** Contratado × entregue por serviço, com a culpa do cliente separada (mesma regra da Operação e do fechamento). */
function useServiceStatus(clientId: string, month: string) {
  return useQuery({
    queryKey: ['service-status', clientId, month],
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)('client_service_status', { _month: month, _client: clientId })
      if (error) throw error
      return ((data ?? []) as ServiceStatus[]).filter((r) => r.state !== 'sem_medicao')
    },
  })
}

function ServiceStatusList({ clientId, month }: { clientId: string; month: string }) {
  const q = useServiceStatus(clientId, month)
  const rows = q.data ?? []
  if (!rows.length) return null
  return (
    <ul className="flex flex-col divide-y divide-line text-[13px]">
      {rows.map((r) => {
        const st = STATE[r.state] ?? { label: r.state, tone: 'bg-raised text-muted' }
        return (
          <li key={r.client_service_id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5">
            <span className="min-w-0">
              <b className="font-semibold">{r.service}</b>{' '}
              <span className="text-muted">
                {r.state === 'sem_planejamento' ? 'planejamento do mês não feito' : `${Number(r.delivered ?? 0)} de ${Number(r.contracted ?? 0)} ${r.measure ?? ''}`}
                {r.with_client > 0 && ` · ${r.with_client} com o cliente${r.client_late > 0 ? ` (${r.client_late} há mais de 2 dias)` : ''}`}
              </span>
            </span>
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', st.tone)}>{st.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

interface RatingRow { area: string; avg: number; count: number; improve: string[] | null }
const AREA: Record<string, string> = { design: 'Design', social: 'Social media', trafego: 'Tráfego', audiovisual: 'Vídeos', consultoria: 'Consultoria', outros: 'Atendimento e NPS' }

/** Média das notas que os clientes deram no portal (últimas 8 semanas), sem dizer quem deu. */
export function RatingsSummary() {
  const q = useQuery({
    queryKey: ['ratings-summary'],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ratings_summary', { _weeks: 8 })
      if (error) throw error
      return (data ?? []) as unknown as RatingRow[]
    },
  })
  if (!q.data || q.data.length === 0) return null
  return (
    <section aria-labelledby="avaliacoes" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <h2 id="avaliacoes" className="text-[17px] font-semibold">Como os clientes avaliam (8 semanas)</h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {q.data.map((r) => (
          <li key={r.area} className="flex flex-col gap-1 rounded-2xl bg-raised px-4 py-3">
            <div className="flex justify-between"><span className="font-semibold">{AREA[r.area] ?? r.area}</span><span className={cn('font-semibold tabular-nums', r.avg < 3.5 ? 'text-warn-ink' : 'text-ok-ink')}>{r.avg} / 5 · {r.count} notas</span></div>
            {(r.improve ?? []).slice(0, 3).map((t, n) => <p key={n} className="text-[13px] text-muted">"{t}"</p>)}
          </li>
        ))}
      </ul>
    </section>
  )
}
