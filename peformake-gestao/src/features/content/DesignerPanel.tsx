import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/cn'
import { useProduction } from '@/features/production/useProduction'
import { listDesignWork } from './contentApi'
import { designerStats, hoursLabel, type DesignerStats } from './contentRules'

// Desempenho do design (pedido do Italo, 19/11): entregas do mês, no prazo, tempo médio fazendo, taxa de ajuste e a fila.
// Calculado das datas que o relógio do design já grava em cada peça (sem tabela nova).

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

function useStats(month: string) {
  const q = useQuery({ queryKey: ['design-work', month], queryFn: () => listDesignWork(month), staleTime: 60_000 })
  return { ...q, stats: q.data ? designerStats(q.data, month, Date.now()) : null }
}

function sum(list: DesignerStats[]): DesignerStats & { avgHours: number | null } {
  const withH = list.filter((s) => s.avgHours !== null)
  const weight = withH.reduce((n, s) => n + s.delivered, 0)
  return {
    designerId: 'todos',
    delivered: list.reduce((n, s) => n + s.delivered, 0), onTime: list.reduce((n, s) => n + s.onTime, 0),
    withRevision: list.reduce((n, s) => n + s.withRevision, 0), pending: list.reduce((n, s) => n + s.pending, 0), lateNow: list.reduce((n, s) => n + s.lateNow, 0),
    avgHours: weight ? Math.round((withH.reduce((n, s) => n + (s.avgHours ?? 0) * s.delivered, 0) / weight) * 10) / 10 : null,
  }
}

/** Aba Design: números do designer escolhido (o designer vê os dele). */
export function DesignerPanel({ month }: { month: string }) {
  const { staffName, myStaffId, isDesigner, canPlan } = useProduction()
  const { stats } = useStats(month)
  const [pick, setPick] = useState<string | null>(null)
  if (!stats || stats.length === 0) return null
  const mineOnly = isDesigner && !canPlan && myStaffId
  const list = mineOnly ? stats.filter((s) => s.designerId === myStaffId) : stats
  if (list.length === 0) return null
  const chosen = pick ?? (list.length === 1 ? list[0]!.designerId : 'todos')
  const s = chosen === 'todos' ? sum(list) : list.find((x) => x.designerId === chosen) ?? sum(list)
  const cell = (label: string, value: string, sub?: string, warn?: boolean) => (
    <div className="min-w-0 rounded-2xl bg-raised px-3 py-2.5">
      <p className="text-[12px] text-muted">{label}</p>
      <p className={cn('text-[20px] font-semibold tabular-nums leading-tight', warn && 'text-warn-ink')}>{value}</p>
      {sub && <p className="truncate text-[12px] text-muted">{sub}</p>}
    </div>
  )
  return (
    <section aria-label="Desempenho do design" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Desempenho no mês</h2>
        {list.length > 1 && (
          <div role="group" aria-label="Designer" className="flex flex-wrap gap-1">
            {[{ id: 'todos', name: 'Todos' }, ...list.map((x) => ({ id: x.designerId, name: staffName(x.designerId).split(' ')[0] ?? '' }))].map((o) => (
              <button key={o.id} type="button" aria-pressed={chosen === o.id} onClick={() => setPick(o.id)}
                className={cn('min-h-9 cursor-pointer rounded-full px-3 text-[13px] font-medium', chosen === o.id ? 'bg-fill text-on-fill' : 'border border-line text-muted hover:text-ink')}>{o.name}</button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {cell('Entregues', String(s.delivered))}
        {cell('No prazo', s.delivered ? `${pct(s.onTime, s.delivered)}%` : '—', s.delivered ? `${s.onTime} de ${s.delivered}` : undefined, s.delivered > 0 && pct(s.onTime, s.delivered) < 90)}
        {cell('Tempo médio fazendo', hoursLabel(s.avgHours), 'de "Comecei" à entrega')}
        {cell('Pediram ajuste', s.delivered ? `${pct(s.withRevision, s.delivered)}%` : '—', s.delivered ? `${s.withRevision} de ${s.delivered}` : undefined, s.delivered > 0 && pct(s.withRevision, s.delivered) > 30)}
        {cell('Na fila agora', String(s.pending), s.lateNow ? `${s.lateNow} atrasada${s.lateNow > 1 ? 's' : ''}` : 'nada atrasado', s.lateNow > 0)}
      </div>
    </section>
  )
}

/** Aba Peças: uma linha por designer, para a social media ver como o design está. */
export function DesignerSummary({ month }: { month: string }) {
  const { staffName } = useProduction()
  const { stats } = useStats(month)
  if (!stats || stats.length === 0) return null
  return (
    <ul aria-label="Como está o design" className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
      {stats.slice(0, 4).map((s) => (
        <li key={s.designerId} className="min-w-0">
          <b className="font-semibold text-ink">{staffName(s.designerId).split(' ')[0]}</b>
          {' · '}{s.pending} na fila{s.lateNow ? <span className="font-semibold text-warn-ink"> ({s.lateNow} atrasada{s.lateNow > 1 ? 's' : ''})</span> : ''}
          {s.delivered > 0 && <> · <span className={cn(pct(s.onTime, s.delivered) < 90 && 'font-semibold text-warn-ink')}>{pct(s.onTime, s.delivered)}% no prazo</span></>}
          {s.avgHours !== null && <> · média {hoursLabel(s.avgHours)}</>}
        </li>
      ))}
    </ul>
  )
}
