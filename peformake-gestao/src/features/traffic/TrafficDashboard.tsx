import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { summarize } from './accountRules'
import { LoadState } from './LoadState'
import { listDailyMetrics } from './metricsApi'
import { brl, brl0, changeLabel, currentPeriods, dailySpend, inRange, lastMonthRange, projectMonth, sumMetrics, todayInBrazil } from './metricsRules'
import { useCountUp, useMounted } from './motion'
import { useTrafficData } from './useTrafficData'

const NUMBER = new Intl.NumberFormat('pt-BR')
const NONE = 'Sem dado'
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

function readAtLabel(value: string | undefined): string {
  if (!value) return 'Ainda sem leitura neste período'
  const text = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Recife' }).format(new Date(value))
  return `Atualizado em ${text}`
}

const percent = (value: number | null) => (value === null ? NONE : `${value.toFixed(2).replace('.', ',')}%`)
const dayLabel = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`
const perResult = (cents: number, count: number) => (count > 0 ? brl(Math.round(cents / count)) : NONE)

export function TrafficDashboard() {
  const { clients, accounts, isPending, isError, refetch } = useTrafficData()
  const today = todayInBrazil()
  const periods = currentPeriods(today)
  const lastMonth = lastMonthRange(today)
  const [view, setView] = useState<'current' | 'last'>('current')
  const [clientId, setClientId] = useState('')
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const mounted = useMounted()

  const metrics = useQuery({
    queryKey: ['traffic-metrics', lastMonth.from, today],
    queryFn: () => listDailyMetrics(lastMonth.from, today),
  })

  const accountClient = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a.clientId])), [accounts])
  const scoped = useMemo(
    () => (metrics.data ?? []).filter((row) => !clientId || accountClient.get(row.accountId) === clientId),
    [metrics.data, clientId, accountClient],
  )
  const isCurrent = view === 'current'
  const range = isCurrent ? periods.current : lastMonth
  const rows = useMemo(() => inRange(scoped, range.from, range.to), [scoped, range.from, range.to])
  const totals = useMemo(() => sumMetrics(rows), [rows])
  const shownSpend = useCountUp(totals.spendCents)

  if (!clients || !accounts || !metrics.data) {
    return (
      <LoadState
        isPending={isPending || metrics.isPending}
        isError={isError || metrics.isError}
        refetch={() => {
          refetch()
          void metrics.refetch()
        }}
      />
    )
  }

  const previous = sumMetrics(inRange(scoped, periods.previous.from, periods.previous.to))
  const totalDays = isCurrent ? periods.daysInMonth : Number(lastMonth.to.slice(-2))
  const days = dailySpend(rows, range.from, totalDays)
  const maxDay = Math.max(...days.map((day) => day.spendCents), 1)
  const hovered = days.find((day) => day.day === hoveredDay)
  const readAt = rows.map((row) => row.readAt).sort().at(-1)
  const summary = summarize(clients, accounts)
  const compare = (current: number, past: number) => (isCurrent ? changeLabel(current, past) : 'Mês inteiro')

  const byAccount = accounts
    .map((account) => ({
      account,
      client: clients.find((client) => client.id === account.clientId)?.name ?? 'Sem cliente',
      totals: sumMetrics(rows.filter((row) => row.accountId === account.id)),
    }))
    .filter((item) => item.totals.spendCents > 0)
    .sort((a, b) => b.totals.spendCents - a.totals.spendCents)

  const side = [
    { label: 'Conversas iniciadas', value: NUMBER.format(totals.conversations), note: compare(totals.conversations, previous.conversations) },
    { label: 'Custo por conversa', value: perResult(totals.spendCents, totals.conversations), note: 'Investido dividido pelas conversas' },
    { label: 'Contas com gasto', value: NUMBER.format(byAccount.length), note: `de ${summary.accounts} contas encontradas` },
  ]

  const more = [
    { label: 'Leads', value: NUMBER.format(totals.leads) },
    { label: 'Compras', value: NUMBER.format(totals.purchases) },
    { label: 'Receita rastreada', value: totals.purchaseValueCents ? brl0(totals.purchaseValueCents) : NONE },
    { label: 'Retorno', value: totals.roas ? `${totals.roas.toFixed(1).replace('.', ',')}x` : NONE },
    { label: 'CTR', value: percent(totals.ctr) },
    { label: 'CPM', value: totals.cpmCents === null ? NONE : brl(Math.round(totals.cpmCents)) },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Período" className="inline-flex rounded-full border border-line p-0.5">
          {([['current', 'Este mês'], ['last', 'Mês passado']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={cn('min-h-10 cursor-pointer rounded-full px-4 font-medium', view === id ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}
            >
              {label}
            </button>
          ))}
        </div>
        <label htmlFor="painel-cliente" className="sr-only">Cliente</label>
        <select id="painel-cliente" value={clientId} onChange={(event) => setClientId(event.target.value)} className="min-h-11 max-w-[260px] rounded-full border border-line-strong bg-surface px-3.5">
          <option value="">Todos os clientes</option>
          {clients.filter((client) => client.isActive && client.hasTraffic).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        {readAt && Date.now() - new Date(readAt).getTime() > 12 * 3600_000 ? (
          <Link to="/trafego/saldo" className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full bg-warn-soft px-3 text-[13px] font-semibold text-warn-ink no-underline">
            {readAtLabel(readAt)} · leitura parada, ver motivo
          </Link>
        ) : <span className="ml-auto text-[13px] text-muted">{readAtLabel(readAt)}</span>}
      </div>

      <div className="@container">
        <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-4">
          <section aria-label="Investido" className="flex min-w-0 flex-col rounded-3xl border border-line bg-surface p-6 @4xl:col-span-3">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
              <div>
                <h2 className="text-[13px] font-medium text-muted">Investido</h2>
                <p className="mt-1 text-[44px] font-semibold leading-none tracking-tighter tabular-nums @2xl:text-[56px]">{brl0(shownSpend)}</p>
              </div>
              <div className="text-[13px] text-muted">
                <p>{compare(totals.spendCents, previous.spendCents)}</p>
                {isCurrent && <p>Estimativa do mês: <b className="font-semibold text-ink">{brl0(projectMonth(totals.spendCents, periods.dayOfMonth, periods.daysInMonth))}</b></p>}
              </div>
            </div>

            <div
              className="mt-8 flex min-h-36 flex-1 items-end gap-[3px]"
              role="img"
              aria-label={`Investido por dia, total de ${brl0(totals.spendCents)}`}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {days.map((day, index) => (
                <div key={day.day} title={`${dayLabel(day.day)}: ${brl(day.spendCents)}`} onMouseEnter={() => setHoveredDay(day.day)} className="flex h-full flex-1 items-end">
                  <span
                    className="block w-full rounded-[4px] bg-accent"
                    style={{
                      height: day.spendCents ? (mounted ? `${Math.max((day.spendCents / maxDay) * 100, 3)}%` : '3%') : '2px',
                      opacity: !day.spendCents ? 0.18 : hoveredDay === null || hoveredDay === day.day ? 1 : 0.3,
                      transition: `height 800ms ${EASE} ${index * 14}ms, opacity 160ms ease`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-muted tabular-nums">
              <span>{dayLabel(range.from)}</span>
              <span aria-live="polite" className="text-ink">{hovered ? `${dayLabel(hovered.day)}: ${brl(hovered.spendCents)}` : 'Passe o mouse para ver o dia'}</span>
              <span>{dayLabel(days.at(-1)?.day ?? range.to)}</span>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-1">
            {side.map((item) => (
              <section key={item.label} aria-label={item.label} className="rounded-3xl border border-line bg-surface p-5">
                <h2 className="text-[13px] font-medium text-muted">{item.label}</h2>
                <p className="mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums">{item.value}</p>
                <p className="mt-2 text-[12px] text-muted">{item.note}</p>
              </section>
            ))}
          </div>
        </div>
      </div>

      <details className="group rounded-3xl border border-line bg-surface">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 font-medium">
          Mais métricas
          <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
          {more.map((item) => (
            <div key={item.label}>
              <dt className="text-[12px] text-muted">{item.label}</dt>
              <dd className="text-[17px] font-semibold tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      </details>

      {summary.unlinkedAccounts > 0 && (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-3xl bg-accent-soft px-5 py-3.5">
          <span><b>{summary.unlinkedAccounts}</b> de {summary.accounts} contas sem cliente. O filtro por cliente só considera contas vinculadas.</span>
          <Link to="/trafego/contas?filtro=unlinked" className="font-semibold text-accent-ink underline underline-offset-2">Vincular contas</Link>
        </p>
      )}

      <section aria-labelledby="contas-gasto" className="rounded-3xl border border-line bg-surface p-5">
        <h2 id="contas-gasto" className="mb-3 text-[15px] font-semibold">Contas com gasto</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-b border-line text-left text-[13px] text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Conta</th>
                <th scope="col" className="py-2 pr-4 font-medium">Cliente</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Investido</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Conversas</th>
                <th scope="col" className="py-2 text-right font-medium">Custo por conversa</th>
              </tr>
            </thead>
            <tbody className="text-[13px] tabular-nums">
              {byAccount.map(({ account, client, totals: item }) => (
                <tr key={account.id} className="border-b border-line last:border-b-0">
                  <td className="py-2.5 pr-4 font-sans text-[14px] font-medium">{account.name}</td>
                  <td className={cn('py-2.5 pr-4 font-sans text-[14px]', client === 'Sem cliente' && 'text-muted')}>{client}</td>
                  <td className="py-2.5 pr-4 text-right font-semibold">{brl(item.spendCents)}</td>
                  <td className="py-2.5 pr-4 text-right">{NUMBER.format(item.conversations)}</td>
                  <td className="py-2.5 text-right">{perResult(item.spendCents, item.conversations)}</td>
                </tr>
              ))}
              {byAccount.length === 0 && <tr><td colSpan={5} className="py-6 text-center font-sans text-muted">Nenhuma conta com gasto neste período.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
