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
  if (!row) return null
  const t = operationTone(row.pct)
  return (
    <section aria-labelledby="entregas-mes" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="entregas-mes" className="text-[15px] font-semibold">Entregas do mês</h2>
        <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', t.chip)}>{row.pct == null ? t.label : `${row.pct}% · ${t.label}`}</span>
      </div>
      <OperationBar row={row} />
      <OperationChips row={row} />
    </section>
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
