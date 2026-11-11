import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { operationOverview, operationTone, servicesProgress, useOperation } from './operationApi'
import { OperationBar, OperationChips, RatingsSummary } from './OperationSummaries'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { useMonthParam } from '@/features/content/useMonthParam'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel } from '@/features/traffic/planRules'
import { useTrafficGoals } from '@/features/traffic/TrafficGoals'
import { STATUS_TONE, goalsSummary, type GoalProgress } from '@/features/traffic/goalsRules'

type AreaFilter = 'todas' | 'design' | 'audiovisual' | 'trafego'

function Bar({ pct, tone = 'bg-ok', label, big = false }: { pct: number; tone?: string; label: string; big?: boolean }) {
  return (
    <div className={cn('overflow-hidden rounded-full bg-raised', big ? 'h-3' : 'h-2')} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span className={cn('block h-full rounded-full transition-[width] duration-700', tone)} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Progresso operacional: o que já foi entregue no mês, no geral, por serviço e por cliente, lido do trabalho real. */
export function OperationPage() {
  const [month] = useMonthParam()
  const [area, setArea] = useState<AreaFilter>('todas')
  const data = useOperation(month)
  const goals = useTrafficGoals(month)
  const goalsByClient = useMemo(() => {
    const m = new Map<string, GoalProgress[]>()
    for (const g of goals.data ?? []) m.set(g.client_id, [...(m.get(g.client_id) ?? []), g])
    return m
  }, [goals.data])

  const all = data.data ?? []
  const rows = all.filter((r) => area === 'todas' || (area === 'design' ? !!r.design : area === 'audiovisual' ? !!r.audiovisual : !!r.trafego))
  const { onTrack, late: lateRows } = operationOverview(rows)
  const { services, overall } = servicesProgress(all)
  const goalsAll = goalsSummary(goals.data ?? [])

  return (
    <>
      <div className="flex items-center justify-between gap-2 md:flex-wrap md:items-end md:gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-semibold tracking-tight md:text-3xl">Operação</h1>
          <p className="hidden text-[13px] text-muted md:block">Entregas de {monthLabel(month).toLowerCase()}. O sistema conta sozinho: peças aprovadas, vídeos entregues, relatórios enviados e estratégia revisada.</p>
        </div>
        <MonthSwitcher />
      </div>

      {data.data && (
        <section aria-labelledby="progresso-geral" data-conteudo className="grid gap-3 lg:grid-cols-[1.1fr_1.6fr]">
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-surface p-5">
            <div>
              <h2 id="progresso-geral" className="text-[13px] font-semibold uppercase tracking-wide text-muted">Entregue no mês</h2>
              <p className="mt-1 text-[44px] font-semibold leading-none tabular-nums">{overall.pct}%</p>
              <p className="mt-1 text-[13px] text-muted">{overall.done} de {overall.total} entregas previstas</p>
            </div>
            <Bar pct={overall.pct} big label="Entregue no mês, no geral" tone={overall.pct >= 80 ? 'bg-ok' : overall.pct >= 40 ? 'bg-accent' : 'bg-warn'} />
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
              <span><b className="tabular-nums">{onTrack}</b> <span className="text-muted">clientes em dia</span></span>
              <span className={cn(lateRows.length > 0 && 'text-warn-ink')}><b className="tabular-nums">{lateRows.length}</b> <span className={cn(lateRows.length === 0 && 'text-muted')}>atrasados</span></span>
              {goalsAll.total > 0 && <span><b className="tabular-nums">{goalsAll.hit}/{goalsAll.total}</b> <span className="text-muted">metas de tráfego batendo</span></span>}
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">Por serviço</h2>
            {services.map((s) => (
              <div key={s.key} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{s.label} <span className="text-[13px] font-normal text-muted">· {s.clients} {s.clients === 1 ? 'cliente' : 'clientes'}</span></span>
                  <span className="text-[13px] tabular-nums"><b>{s.pct}%</b> <span className="text-muted">({s.done} de {s.total}{s.waiting ? ` · ${s.waiting} com o cliente` : ''})</span></span>
                </div>
                <Bar pct={s.pct} label={`${s.label}: ${s.pct}% entregue`} tone={s.pct >= 80 ? 'bg-ok' : s.pct >= 40 ? 'bg-accent' : 'bg-warn'} />
              </div>
            ))}
            {services.length === 0 && <p className="text-[13px] text-muted">Nenhum cliente com serviço de produção ativo.</p>}
          </div>
        </section>
      )}

      <div role="group" aria-label="Área" className="flex flex-wrap gap-1">
        {([['todas', 'Todos os clientes'], ['design', 'Design'], ['audiovisual', 'Vídeos'], ['trafego', 'Tráfego']] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={area === k} onClick={() => setArea(k)}
            className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', area === k ? 'bg-fill text-on-fill' : 'text-muted hover:bg-raised hover:text-ink')}>{l}</button>
        ))}
      </div>

      {!data.data ? <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} /> : (
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {rows.map((r) => {
            const t = operationTone(r.pct)
            const g = goalsSummary(goalsByClient.get(r.client_id) ?? [])
            return (
              <li key={r.client_id} className="flex flex-col gap-2 border-b border-line px-5 py-3.5 last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/clientes/${r.client_id}`} className="font-semibold text-ink hover:underline">{r.name}</Link>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {g.total > 0 && g.worst && (
                      <Link to={`/estrategia/trafego?cliente=${r.client_id}`} className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold no-underline', STATUS_TONE[g.worst].chip)}>
                        Metas {g.hit}/{g.total}
                      </Link>
                    )}
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', t.chip)}>{r.pct == null ? t.label : `${r.pct}% · ${t.label}`}</span>
                  </div>
                </div>
                <OperationBar row={r} />
                <OperationChips row={r} />
              </li>
            )
          })}
          {rows.length === 0 && <li className="p-8 text-center text-muted">Nenhum cliente com serviço nesta área.</li>}
        </ul>
      )}
      <RatingsSummary />
    </>
  )
}
