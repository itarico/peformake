import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { Panel } from '@/components/charts/Charts'
import { ClientFlow, CountUp, DemandBars, MonthStackBars, TrendArea, ValueBars } from '@/components/charts/HomeCharts'
import { deltaTone, fillDays, pctChange } from '@/components/charts/chartRules'
import { cn } from '@/lib/cn'
import { AV_ROLES, COMMERCIAL_ROLES, CONTENT_PLANNER_ROLES, CONTENT_ROLES, TRAFFIC_ROLES, hasAnyRole, type AppRole } from '@/lib/roles'
import { MyDay } from './MyDay'
import { SetupPendingCard } from '@/features/clients/SetupPendingCard'
import { LoadState } from '@/features/traffic/LoadState'
import { describeClient } from '@/features/clients/clientRules'
import { ATTENTION_LABEL } from '@/features/clients/portfolioRules'
import { useClients } from '@/features/clients/useClients'
import { servicesProgress, useOperation } from '@/features/operation/operationApi'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { monthStart } from '@/features/traffic/planRules'
import { dashAv, dashCommercial, dashContent, dashHomeBusiness, dashTraffic } from './dashApi'
import { businessKpis, clientsInsight, concentrationInsight, mrrOf, revenueInsight, serviceInsight, type BusinessDash } from './businessRules'
import { clientsToCall, greeting, pendingActions, type ActionItem } from './homeRules'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brlShort = (n: number) => (n >= 1000 ? `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : brl.format(n))
const monthName = (ym: string) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function Delta({ pct, goodWhenUp, suffix }: { pct: number | null; goodWhenUp: boolean; suffix: string }) {
  if (pct === null) return null
  const tone = deltaTone(pct, goodWhenUp)
  const r = Math.round(pct)
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums', tone === 'good' ? 'bg-ok-soft text-ok-ink' : tone === 'bad' ? 'bg-warn-soft text-warn-ink' : 'bg-raised text-muted')}>
      {r > 0 ? '+' : ''}{r}% {suffix}
    </span>
  )
}

function Insight({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-accent-soft px-3 py-2 text-[13px] leading-snug text-ink">{children}</p>
}

function Kpi({ label, value, format, sub, tone, i }: { label: string; value: number | null; format: (n: number) => string; sub: React.ReactNode; tone?: 'warn' | 'ok'; i: number }) {
  return (
    <div className="pf-rise flex min-w-0 flex-col gap-0.5 px-4 py-3" style={{ '--i': i } as React.CSSProperties}>
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p className={cn('break-words text-[19px] font-semibold leading-tight tracking-tight tabular-nums sm:text-[24px]', tone === 'warn' && 'text-warn-ink', tone === 'ok' && 'text-ok-ink')}>
        {value === null ? '—' : <CountUp value={value} format={format} />}
      </p>
      <p className="truncate text-[12px] text-muted">{sub}</p>
    </div>
  )
}

/** Visão do dono: MRR, recebido, clientes, ticket e perdas. Tudo sai do banco, mês a mês. */
function BusinessSection({ side }: { side: React.ReactNode }) {
  const q = useQuery({ queryKey: ['dash-home-business', 12], queryFn: () => dashHomeBusiness(12) })
  if (!q.data) return <Panel title="Negócio"><LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} /></Panel>
  const d: BusinessDash = q.data
  const k = businessKpis(d)
  const months = d.months
  const mrrSeries = months.map((m) => ({ label: monthName(m.month), values: [m.mrr_peformake, m.mrr_ellcazo], line: m.received }))
  const serviceTotal = d.by_service.reduce((s, r) => s + r.amount, 0)
  return (
    <>
      <section aria-label="Indicadores do negócio" className="grid grid-cols-2 divide-line overflow-hidden rounded-3xl border border-line bg-surface sm:grid-cols-3 xl:grid-cols-5 [&>*]:border-line max-sm:[&>*:nth-child(odd)]:border-r sm:[&>*:not(:last-child)]:border-r">
        <Kpi i={0} label="MRR (previsto no mês)" value={k.mrr} format={(n) => brl.format(n)} sub={<Delta pct={pctChange(k.mrr, k.mrrPrev3)} goodWhenUp suffix="em 3 meses" />} />
        <Kpi i={1} label="Recebido no mês" value={k.realized === null ? null : k.received} format={(n) => brl.format(n)} sub={k.realized === null ? 'Nada lançado no caixa' : `${k.realized}% do previsto`} tone={k.realized !== null && k.realized < 70 ? 'warn' : undefined} />
        <Kpi i={2} label="Clientes ativos" value={k.active} format={(n) => String(Math.round(n))} sub={`+${k.joined} entraram · −${k.left} saíram no mês`} />
        <Kpi i={3} label="Ticket médio" value={k.ticket} format={(n) => brl.format(n)} sub={`${d.paying_clients} clientes pagando mensalidade`} />
        <Kpi i={4} label="Perdas em 3 meses" value={k.churn3} format={(n) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`} sub={d.tenure_avg_months ? `Tempo médio de casa: ${d.tenure_avg_months.toLocaleString('pt-BR')} meses` : 'Sem histórico'} tone={k.churn3 !== null && k.churn3 >= 15 ? 'warn' : undefined} />
      </section>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
        <Panel title="MRR e recebido por mês" className="pf-rise lg:col-span-2" action={<Link to="/financeiro" className="inline-flex min-h-10 items-center gap-1 text-[13px] font-medium">Financeiro <ArrowRight size={14} aria-hidden="true" /></Link>}>
          <Insight>{revenueInsight(k)}</Insight>
          <MonthStackBars
            label="MRR por empresa e recebido por mês"
            format={brlShort}
            series={[{ name: 'Peformake', swatch: 'bg-series-1' }, { name: 'Ellcazo', swatch: 'bg-series-3' }]}
            line={{ name: 'Recebido', color: 'var(--color-ink)' }}
            data={mrrSeries}
          />
        </Panel>
        {side}
      </div>

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Clientes que entram e saem" className="pf-rise" action={<Link to="/clientes" className="inline-flex min-h-10 items-center gap-1 text-[13px] font-medium">Clientes <ArrowRight size={14} aria-hidden="true" /></Link>}>
          <Insight>{clientsInsight(k, d.lost_tenure_avg_months)}</Insight>
          <ClientFlow data={months.map((m) => ({ label: monthName(m.month), joined: m.joined, left: m.left, active: m.active }))} />
        </Panel>
        <Panel title="MRR por serviço" className="pf-rise">
          <Insight>{serviceInsight(d.by_service)}</Insight>
          <ValueBars rows={d.by_service.map((r) => ({ label: r.name, value: r.amount }))} format={(n) => brl.format(n)} total={serviceTotal} />
        </Panel>
        <Panel title="Maiores clientes" className="pf-rise">
          <Insight>{concentrationInsight(k, d.top_clients[0]?.name)}</Insight>
          <ValueBars rows={d.top_clients.map((r) => ({ label: r.name, value: r.amount }))} format={(n) => brl.format(n)} total={mrrOf(months[months.length - 1])} swatch="bg-series-3" />
        </Panel>
      </div>
    </>
  )
}

function ActionList({ actions, loading }: { actions: ActionItem[]; loading: boolean }) {
  const sorted = [...actions].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent))
  return (
    <Panel title="Precisa de você" className="pf-rise" action={actions.length > 0 ? <span className="text-[13px] tabular-nums text-muted">{actions.length} {actions.length === 1 ? 'item' : 'itens'}</span> : undefined}>
      {loading && actions.length === 0 && <p role="status" className="text-[13px] text-muted">Carregando</p>}
      {!loading && actions.length === 0 && <p className="flex items-center gap-2 text-[14px] text-ok-ink"><CheckCircle2 size={16} aria-hidden="true" /> Tudo em dia.</p>}
      <ul className="-mx-2 flex flex-col">
        {sorted.map((x) => (
          <li key={x.key}>
            <Link to={x.to} className="group flex min-h-12 items-center gap-3 rounded-xl px-2 text-ink no-underline hover:bg-raised">
              <span className={cn('w-10 shrink-0 text-right text-[20px] font-semibold tabular-nums', x.urgent && 'text-warn-ink')}>{x.count}</span>
              <span className="min-w-0 flex-1 text-[14px] leading-snug">{x.label}</span>
              {x.urgent && <span className="pf-pulse size-2 shrink-0 rounded-full bg-warn" aria-label="Urgente" />}
              <ArrowRight size={15} className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function TrendPanel({ title, to, total, pct, goodWhenUp, data, format }: {
  title: string; to: string; total: string; pct: number | null; goodWhenUp: boolean
  data: { day: string; value: number }[]; format: (n: number) => string
}) {
  return (
    <Panel title={title} className="pf-rise" action={<Link to={to} className="inline-flex min-h-10 items-center gap-1 text-[13px] font-medium">Abrir <ArrowRight size={14} aria-hidden="true" /></Link>}>
      <div className="-mt-1 flex flex-wrap items-baseline gap-2">
        <p className="text-[26px] font-semibold leading-none tracking-tight tabular-nums">{total}</p>
        <Delta pct={pct} goodWhenUp={goodWhenUp} suffix="vs 30 dias antes" />
      </div>
      <TrendArea label={title} data={data} format={format} />
    </Panel>
  )
}

function DeliveriesPanel({ month }: { month: string }) {
  const q = useOperation(month)
  const p = q.data ? servicesProgress(q.data) : null
  return (
    <Panel title="Entregas do mês" className="pf-rise" action={<Link to={`/operacao?mes=${month}`} className="inline-flex min-h-10 items-center gap-1 text-[13px] font-medium">Abrir <ArrowRight size={14} aria-hidden="true" /></Link>}>
      {!p && (q.isPending || q.isError
        ? <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
        : <p role="status" className="text-[13px] text-muted">Sem dados.</p>)}
      {p && (
        <>
          <div className="-mt-1 flex items-baseline gap-2">
            <p className="text-[26px] font-semibold leading-none tracking-tight tabular-nums">{p.overall.pct}%</p>
            <span className="text-[13px] text-muted">{p.overall.done} de {p.overall.total} entregas previstas</span>
          </div>
          <ul className="flex flex-col gap-3">
            {p.services.filter((s) => s.total > 0).map((s) => (
              <li key={s.key} className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="font-medium">{s.label}</span>
                  <span className="tabular-nums text-muted"><b className="font-semibold text-ink">{s.done}</b>/{s.total}{s.waiting > 0 ? ` · ${s.waiting} com o cliente` : ''}</span>
                </span>
                <span className="h-2.5 rounded-full bg-raised" role="progressbar" aria-label={s.label} aria-valuenow={s.pct} aria-valuemin={0} aria-valuemax={100}>
                  <span className="pf-grow-x block h-full rounded-full bg-series-1" style={{ width: `${Math.max(s.pct > 0 ? 2 : 0, s.pct)}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}

function ClientsToCall() {
  const { query } = useClients()
  const today = todayInBrazil()
  const list = useMemo(() => clientsToCall((query.data ?? []).map((c) => describeClient(c, today))), [query.data, today])
  return (
    <Panel title="Clientes para olhar hoje" className="pf-rise" action={<Link to="/clientes?atencao=any" className="inline-flex min-h-10 items-center gap-1 text-[13px] font-medium">Ver todos <ArrowRight size={14} aria-hidden="true" /></Link>}>
      {query.isPending && <p role="status" className="text-[13px] text-muted">Carregando</p>}
      {query.data && list.length === 0 && <p className="flex items-center gap-2 text-[14px] text-ok-ink"><CheckCircle2 size={16} aria-hidden="true" /> Nenhum cliente pedindo atenção.</p>}
      <ul className="-mx-2 flex flex-col">
        {list.slice(0, 6).map((v) => (
          <li key={v.client.id}>
            <Link to={`/clientes/${v.client.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-ink no-underline hover:bg-raised">
              <span className="min-w-0 truncate font-medium">{v.client.name}</span>
              <span className="shrink-0 truncate text-right text-[12px] text-muted">{v.flags.map((f) => ATTENTION_LABEL[f]).slice(0, 2).join(' · ')}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

const CONTENT_DONE = ['approved', 'published', 'scheduled', 'done']
const AV_DONE = ['delivered', 'cancelled']

const PERSONAL: AppRole[] = ['designer', 'social_media', 'videomaker', 'editor', 'traffic_manager', 'sdr', 'closer']

export function HomePage() {
  const { state } = useAuth()
  const roles = state.status === 'ready' ? state.user.roles : []
  const [hour] = useState(() => Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' })))
  if (!hasAnyRole(roles, ['admin', 'head_marketing']) && hasAnyRole(roles, PERSONAL)) return <MyDay greeting={greeting(hour)} />
  return <BusinessHome />
}

function BusinessHome() {
  const { state } = useAuth()
  const roles = state.status === 'ready' ? state.user.roles : []
  const name = state.status === 'ready' ? (state.user.fullName || '').split(' ')[0] : ''
  const today = todayInBrazil()
  const month = monthStart(today, 0)
  const [hour] = useState(() => Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' })))

  const can = {
    admin: hasAnyRole(roles, ['admin']),
    traffic: hasAnyRole(roles, TRAFFIC_ROLES),
    content: hasAnyRole(roles, CONTENT_ROLES),
    planner: hasAnyRole(roles, CONTENT_PLANNER_ROLES),
    av: hasAnyRole(roles, AV_ROLES),
    commercial: hasAnyRole(roles, COMMERCIAL_ROLES),
    operation: hasAnyRole(roles, ['admin', 'head_marketing']),
  }
  const traffic = useQuery({ queryKey: ['dash-traffic', 30], queryFn: () => dashTraffic(30), enabled: can.traffic })
  const content = useQuery({ queryKey: ['dash-content', month], queryFn: () => dashContent(month), enabled: can.content })
  const av = useQuery({ queryKey: ['dash-av', month], queryFn: () => dashAv(month), enabled: can.av })
  const commercial = useQuery({ queryKey: ['dash-commercial', 30], queryFn: () => dashCommercial(30), enabled: can.commercial })

  const t = traffic.data
  const c = content.data
  const a = av.data
  const m = commercial.data
  const cs = (k: string) => c?.by_status[k] ?? 0
  const actions: ActionItem[] = pendingActions([
    ...(t ? [
      { key: 'balance', label: 'Contas de anúncio com saldo baixo', count: t.low_balance, to: '/trafego/saldo', urgent: true },
      { key: 'meta', label: 'Ações na Meta esperando aprovação', count: t.tasks.review, to: '/trafego/tarefas' },
      { key: 'recs', label: 'Recomendações do agente de tráfego', count: t.recommendations_open, to: '/trafego/agente' },
    ] : []),
    ...(c && can.planner ? [
      { key: 'brief', label: 'Peças sem briefing', count: cs('briefing'), to: `/conteudo/quadro?mes=${month}` },
      { key: 'review', label: 'Artes para revisar', count: cs('review'), to: `/conteudo/quadro?mes=${month}`, urgent: true },
    ] : []),
    ...(c && !can.planner ? [{ key: 'design', label: 'Artes para produzir', count: cs('ready') + cs('changes_requested'), to: `/conteudo/quadro?mes=${month}` }] : []),
    ...(c ? [{ key: 'late', label: 'Artes atrasadas', count: c.late, to: `/conteudo/calendario?mes=${month}`, urgent: true }] : []),
    ...(a ? [
      { key: 'avreview', label: 'Vídeos para revisar', count: a.by_status.review ?? 0, to: '/audiovisual/producao' },
      { key: 'avlate', label: 'Edições atrasadas', count: a.late, to: '/audiovisual/producao', urgent: true },
    ] : []),
    ...(m ? [
      { key: 'unanswered', label: 'Conversas sem resposta', count: m.unanswered, to: '/whatsapp/conversas', urgent: true },
      { key: 'sales', label: 'Vendas para confirmar', count: m.sales_pending, to: '/comercial/vendas' },
    ] : []),
  ])
  const loading = [traffic, content, av, commercial].some((q) => q.isLoading)

  const sumStatus = (by: Record<string, number> | undefined, done: string[]) => Object.entries(by ?? {}).reduce((s, [k, n]) => (done.includes(k) ? s : s + n), 0)
  const demands = [
    ...(c ? [{ label: 'Social Media', open: sumStatus(c.by_status, CONTENT_DONE), late: Math.min(c.late, sumStatus(c.by_status, CONTENT_DONE)), to: `/conteudo/quadro?mes=${month}`, unit: 'peças' }] : []),
    ...(a ? [{ label: 'Audiovisual', open: sumStatus(a.by_status, AV_DONE), late: Math.min(a.late, sumStatus(a.by_status, AV_DONE)), to: '/audiovisual/producao', unit: 'vídeos' }] : []),
    ...(t ? [{ label: 'Tráfego', open: t.tasks.todo + t.tasks.doing + t.tasks.review, late: 0, to: '/trafego/tarefas', unit: 'tarefas' }] : []),
    ...(m ? [{ label: 'Comercial', open: m.unanswered, late: m.unanswered, to: '/whatsapp/conversas', unit: 'conversas', lateLabel: 'sem resposta' }] : []),
  ]

  const spend = t ? fillDays(t.period[0], t.period[1], t.daily.map((d) => ({ day: d.day, value: d.spend_cents / 100 }))) : []
  const contacts = m ? fillDays(m.period[0], m.period[1], m.new_contacts_daily.map((d) => ({ day: d.day, value: d.n }))) : []

  const actionList = <ActionList actions={actions} loading={loading} />

  return (
    <>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{greeting(hour)}{name ? `, ${name}` : ''}</h1>
        <p className="text-muted first-letter:uppercase">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })}</p>
      </header>

      <SetupPendingCard />

      {can.admin ? <BusinessSection side={actionList} /> : (
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
          {actionList}
          {demands.length > 0 && <Panel title="Demandas abertas" className="pf-rise lg:col-span-2"><DemandBars rows={demands} /></Panel>}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {can.admin && demands.length > 0 && <Panel title="Demandas abertas" className="pf-rise"><DemandBars rows={demands} /></Panel>}
        {t && <TrendPanel title="Investimento em anúncios" to="/trafego/painel" total={brl.format(t.totals.spend_cents / 100)} pct={pctChange(t.totals.spend_cents, t.previous.spend_cents)} goodWhenUp data={spend} format={(n) => brl.format(n)} />}
        {m && <TrendPanel title="Novos contatos no WhatsApp" to="/whatsapp/conversas" total={String(m.new_contacts)} pct={pctChange(m.new_contacts, m.new_contacts_prev)} goodWhenUp data={contacts} format={(n) => `${n} contato${n === 1 ? '' : 's'}`} />}
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        {can.operation && <DeliveriesPanel month={month} />}
        {can.traffic && <ClientsToCall />}
      </div>
    </>
  )
}
