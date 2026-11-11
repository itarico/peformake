import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { getLastRun, listAccountStatus, listOpenAlerts, readNow, resolveAlert } from './balanceApi'
import { byUrgency, describeBalance, STATE_LABEL, type BalanceState } from './balanceRules'
import { LoadState } from './LoadState'
import { listDailyMetrics } from './metricsApi'
import { brl, todayInBrazil } from './metricsRules'
import { readProblemText, summarizeReadError } from './readErrorRules'
import { useTrafficData } from './useTrafficData'

const when = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Recife' }).format(new Date(value))

const minus = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

const TONE: Record<BalanceState, string> = {
  problem: 'bg-warn-soft text-warn-ink',
  low: 'bg-warn-soft text-warn-ink',
  ending: 'bg-warn-soft text-warn-ink',
  unknown: 'bg-raised text-muted',
  ok: 'bg-ok-soft text-ok-ink',
  postpaid: 'bg-raised text-ink',
}

async function loadAlertLimit(): Promise<number> {
  const { data, error } = await supabase.from('traffic_settings').select('balance_alert_cents').single()
  if (error) throw error
  return Number(data.balance_alert_cents)
}

export function BalancePage() {
  const queryClient = useQueryClient()
  const today = todayInBrazil()
  const { clients, accounts, isPending, isError, refetch } = useTrafficData()
  const status = useQuery({ queryKey: ['traffic-status'], queryFn: listAccountStatus })
  const alerts = useQuery({ queryKey: ['traffic-alerts'], queryFn: listOpenAlerts })
  const run = useQuery({ queryKey: ['traffic-last-run'], queryFn: getLastRun })
  const limit = useQuery({ queryKey: ['traffic-alert-limit'], queryFn: loadAlertLimit })
  const metrics = useQuery({ queryKey: ['traffic-metrics', minus(today, 8), today], queryFn: () => listDailyMetrics(minus(today, 8), today) })

  const refreshAll = () => {
    for (const key of ['traffic-status', 'traffic-alerts', 'traffic-last-run', 'traffic-metrics']) void queryClient.invalidateQueries({ queryKey: [key] })
  }
  const read = useMutation({ mutationFn: readNow, onSettled: refreshAll })
  const resolve = useMutation({ mutationFn: resolveAlert, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['traffic-alerts'] }) })

  const enabled = useMemo(() => (accounts ?? []).filter((account) => account.enabled), [accounts])
  const views = useMemo(() => {
    if (!status.data || !metrics.data || limit.data === undefined) return []
    return enabled
      .map((account) => ({
        account,
        client: clients?.find((client) => client.id === account.clientId)?.name ?? 'Sem cliente',
        view: describeBalance(
          status.data.find((item) => item.accountId === account.id) ?? null,
          metrics.data.filter((row) => row.accountId === account.id),
          today,
          limit.data,
        ),
      }))
      .sort((a, b) => byUrgency(a.view, b.view))
  }, [enabled, clients, status.data, metrics.data, limit.data, today])

  const loading = isPending || status.isPending || metrics.isPending || limit.isPending || run.isPending
  const failed = isError || status.isError || metrics.isError || limit.isError || run.isError
  if (loading || failed) {
    return <LoadState isPending={loading} isError={failed} refetch={() => { refetch(); refreshAll(); void limit.refetch() }} />
  }

  const last = run.data
  // Contas lidas pelo MCP oficial da Meta (rotina na nuvem a cada 6 h). "Ler agora" só existe para contas da API antiga.
  const hasApi = enabled.some((a) => a.readSource !== 'mcp')
  const tokenMissing = hasApi && last?.error?.includes('META_SYSTEM_TOKEN')
  const count = (state: BalanceState) => views.filter((item) => item.view.state === state).length
  const totalAvailable = views.reduce((sum, item) => sum + (item.view.state !== 'postpaid' ? item.view.remainingCents ?? 0 : 0), 0)
  const cards = [
    { label: 'Contas monitoradas', value: String(views.length), note: 'Com leitura ligada' },
    { label: 'Pedem recarga', value: String(count('low') + count('ending')), note: `Abaixo do limite ou acabam em até 3 dias`, warn: count('low') + count('ending') > 0 },
    { label: 'Alertas abertos', value: String(alerts.data?.length ?? 0), note: 'Gasto fora do padrão, saldo e restrições', warn: (alerts.data?.length ?? 0) > 0 },
    { label: 'Saldo somado', value: brl(totalAvailable), note: 'Pré-pago e limites de gasto' },
  ]

  const problem = readProblemText(summarizeReadError(read.data?.failures?.length ? read.data.failures.join(' | ') : !read.data && last && !last.ok ? last.error : null))

  return (
    <>
      <div className="flex items-center justify-between gap-3 md:flex-wrap">
        <p className="min-w-0 text-[13px] text-muted max-md:truncate">
          {last
            ? `Última leitura ${last.trigger === 'auto' ? 'automática' : 'manual'} em ${when(last.startedAt)}${last.finishedAt ? (last.ok ? ', sem erros.' : ', com problemas.') : ', em andamento.'}`
            : 'Nenhuma leitura feita ainda.'}
          <span className="hidden md:inline">{' '}Leitura automática pela Meta (MCP oficial) a cada 6 horas.</span>
        </p>
        {hasApi && (
          <Button variant="secondary" className="shrink-0" disabled={read.isPending} onClick={() => read.mutate()}>
            <RefreshCw size={16} aria-hidden="true" className={read.isPending ? 'animate-spin' : ''} /> {read.isPending ? 'Lendo a Meta' : 'Ler agora'}
          </Button>
        )}
      </div>

      {tokenMissing && (
        <div role="alert" className="rounded-3xl bg-warn-soft px-5 py-4 text-warn-ink">
          <p className="font-semibold">Falta o token da Meta no servidor.</p>
          <p className="text-[14px]">No painel do Supabase, em Edge Functions, Secrets, crie <b>META_SYSTEM_TOKEN</b> com o token do usuário do sistema. Depois clique em Ler agora.</p>
        </div>
      )}
      {read.data?.error && !tokenMissing && <p role="alert" className="rounded-3xl bg-warn-soft p-4 font-medium text-warn-ink">{read.data.error}</p>}
      {problem && !tokenMissing && (
        <p className="flex flex-wrap items-center gap-x-2 rounded-2xl bg-warn-soft px-4 py-2.5 text-[13px] text-warn-ink">
          <span className="font-medium">{problem}</span>
          <Link to="/trafego/contas?filtro=alerts" className="font-semibold underline underline-offset-2">Ver contas</Link>
        </p>
      )}

      <div data-conteudo className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <section key={card.label} aria-label={card.label} className="rounded-3xl border border-line bg-surface p-4">
            <h2 className="text-[13px] font-medium text-muted">{card.label}</h2>
            <p className={cn('mt-1 text-[24px] font-semibold tabular-nums', card.warn && 'text-warn-ink')}>{card.value}</p>
            <p className="mt-1 text-[12px] text-muted">{card.note}</p>
          </section>
        ))}
      </div>

      {(alerts.data?.length ?? 0) > 0 && (
        <section aria-labelledby="alertas" className="rounded-3xl border border-line bg-surface p-5">
          <h2 id="alertas" className="mb-2 font-semibold">Alertas abertos</h2>
          <ul className="flex flex-col">
            {alerts.data!.map((alert) => (
              <li key={alert.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2.5 first:border-t-0">
                <span className="min-w-0">
                  <span className="font-medium">{alert.message}</span>
                  <span className="block text-[12px] text-muted">
                    {when(alert.createdAt)}
                    {alert.clientNotifiedAt && ' | cliente avisado'}
                    {alert.groupNotifiedAt && ' | grupo avisado'}
                    {alert.notifyError && <span className="text-warn-ink"> | falha no aviso: {alert.notifyError}</span>}
                  </span>
                </span>
                <Button variant="secondary" className="min-h-9 px-3 text-[13px]" disabled={resolve.isPending} onClick={() => resolve.mutate(alert.id)}>
                  <Check size={15} aria-hidden="true" /> Resolvido
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {views.length === 0 ? (
        <p className="rounded-3xl border border-line bg-surface p-6 text-center text-muted">
          Nenhuma conta com leitura ligada. <Link to="/trafego/contas" className="font-medium text-accent-ink underline underline-offset-2">Ligue a leitura nas contas</Link> para acompanhar o saldo.
        </p>
      ) : (
        <div className="@container">
          <ul className="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface">
            <li aria-hidden="true" className="hidden grid-cols-[minmax(0,2fr)_140px_110px_110px_110px_150px] gap-4 border-b border-line px-5 py-2.5 text-[12px] font-medium text-muted @3xl:grid">
              <span>Conta</span><span className="text-right">Saldo</span><span className="text-right">Dura cerca de</span><span className="text-right">Ontem</span><span className="text-right">Média 7 dias</span><span>Situação</span>
            </li>
            {views.map(({ account, client, view }) => (
              <li key={account.id} className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-line px-5 py-3.5 last:border-b-0 @3xl:grid-cols-[minmax(0,2fr)_140px_110px_110px_110px_150px] @3xl:items-center">
                <div className="col-span-2 min-w-0 @3xl:col-span-1">
                  <p className="truncate font-semibold">{client}</p>
                  <p className="truncate text-[13px] text-muted">{account.name}</p>
                </div>
                <p className="tabular-nums @3xl:text-right" title={view.remainingLabel}>
                  <span className="font-sans text-[12px] text-muted @3xl:hidden">Saldo: </span>
                  {view.remainingCents === null ? <span className="font-sans text-[13px] text-muted">{view.remainingLabel}</span> : brl(view.remainingCents)}
                </p>
                <p className="tabular-nums @3xl:text-right">
                  <span className="text-[12px] text-muted @3xl:hidden">Dura: </span>
                  {view.daysLeft === null ? '-' : `${view.daysLeft} ${view.daysLeft === 1 ? 'dia' : 'dias'}`}
                </p>
                <p className="tabular-nums @3xl:text-right"><span className="font-sans text-[12px] text-muted @3xl:hidden">Ontem: </span>{brl(view.yesterdayCents)}</p>
                <p className="tabular-nums @3xl:text-right"><span className="font-sans text-[12px] text-muted @3xl:hidden">Média: </span>{brl(view.averageCents)}</p>
                <p><span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold', TONE[view.state])}>{STATE_LABEL[view.state]}</span></p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[12px] text-muted">"Dura cerca de" divide o saldo pela média de gasto dos últimos 7 dias. A leitura não usa IA e não tem custo de Claude.</p>
    </>
  )
}
