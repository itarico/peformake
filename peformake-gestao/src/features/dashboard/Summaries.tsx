import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BucketBars, DailyBars, FunnelBars, KpiRow, Panel, RankBars, ScoreGauge, SegmentedBar, StatTile, type Part, type ScoreBand } from '@/components/charts/Charts'
import { fillDays, fmt, pctChange } from '@/components/charts/chartRules'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/auth/context'
import { ACTIVITY_LABEL } from '@/features/clients/intelApi'
import { todayBR } from '@/features/finance/money'
import { LoadState } from '@/features/traffic/LoadState'
import { dashAv, dashClients, dashClientsAvulsos, dashCommercial, dashContent, dashTraffic, dismissLostSuggestion, type AvulsosDash, type ClientsDash } from './dashApi'
import { daysSince, funnelSteps, HEALTH_BAND_LABEL, HEALTH_BANDS, healthScore, monthlyChurn, monthsText, npsLabel, npsScore, retentionRate } from './retentionRules'

const cpr = (spend: number, results: number) => (results > 0 ? spend / results : null)

// ===== Tráfego =====
export function TrafficSummary({ days = 30, compact = false }: { days?: number; compact?: boolean }) {
  const q = useQuery({ queryKey: ['dash-traffic', days], queryFn: () => dashTraffic(days) })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const d = q.data
  const [from, to] = d.period
  const spend = fillDays(from, to, d.daily.map((r) => ({ day: r.day, value: r.spend_cents })))
  const nowCpr = cpr(d.totals.spend_cents, d.totals.results)
  const prevCpr = cpr(d.previous.spend_cents, d.previous.results)
  const tiles = (
    <KpiRow label="Tráfego em números">
      <StatTile label={`Investido em ${days} dias`} value={fmt.money(d.totals.spend_cents)} delta={{ pct: pctChange(d.totals.spend_cents, d.previous.spend_cents), goodWhenUp: true }} spark={spend.map((s) => s.value)} to="/trafego/painel" />
      <StatTile label="Resultados" value={fmt.int(d.totals.results)} delta={{ pct: pctChange(d.totals.results, d.previous.results), goodWhenUp: true }} spark={fillDays(from, to, d.daily.map((r) => ({ day: r.day, value: r.results }))).map((s) => s.value)} to="/trafego/campanhas" />
      <StatTile label="Custo por resultado" value={nowCpr === null ? 'Sem resultado' : fmt.moneyExact(nowCpr)} delta={nowCpr !== null && prevCpr !== null ? { pct: pctChange(nowCpr, prevCpr), goodWhenUp: false } : undefined} to="/trafego/campanhas" />
      <StatTile label="Precisa de você" value={fmt.int(d.open_alerts + d.tasks.review + d.recommendations_open)} tone={d.open_alerts + d.tasks.review > 0 ? 'warn' : 'default'}
        hint={`${d.open_alerts} alertas | ${d.tasks.review} para aprovar | ${d.recommendations_open} recomendações`} to="/trafego/agente" />
    </KpiRow>
  )
  if (compact) return tiles
  return (
    <>
      {tiles}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Investimento por dia"><DailyBars data={spend} format={fmt.money} label={`Últimos ${days} dias`} /></Panel>
        <Panel title="Onde está o dinheiro">
          <RankBars label="Clientes que mais investiram" format={fmt.money}
            rows={d.top_clients.map((c) => {
              const v = cpr(c.spend_cents, c.results)
              return { label: c.name, value: c.spend_cents, note: v === null ? 'sem resultado' : `${fmt.moneyExact(v)} por resultado`, tone: v === null ? 'warn' as const : undefined, to: '/trafego/campanhas' }
            })} />
        </Panel>
      </div>
    </>
  )
}

// ===== Conteúdo =====
const CONTENT_PARTS: { key: string; label: string; slot: Part['slot'] }[] = [
  { key: 'briefing', label: 'Briefing', slot: 0 },
  { key: 'ready', label: 'Pronto p/ design', slot: 1 },
  { key: 'in_production', label: 'Em produção', slot: 2 },
  { key: 'changes_requested', label: 'Ajuste', slot: 3 },
  { key: 'review', label: 'Revisão interna', slot: 4 },
  { key: 'client_review', label: 'Com o cliente', slot: 5 },
]

export function ContentSummary({ month, compact = false }: { month: string; compact?: boolean }) {
  const q = useQuery({ queryKey: ['dash-content', month], queryFn: () => dashContent(month) })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const d = q.data
  const s = (k: string) => d.by_status[k] ?? 0
  const done = s('approved') + s('published')
  const pct = d.total ? Math.round((done / d.total) * 100) : 0
  const tiles = (
    <KpiRow label="Design em números">
      <StatTile label="Peças do mês" value={fmt.int(d.total)} hint={`${d.clients} clientes | ${d.plans_ready} de ${d.plans_total} planejamentos prontos`} to={`/conteudo/planejamento?mes=${month}`} />
      <StatTile label="Aprovadas" value={fmt.pct(pct)} tone={pct >= 80 ? 'ok' : 'default'} hint={`${done} de ${d.total} peças`} to={`/conteudo/quadro?mes=${month}`} />
      <StatTile label="Sem briefing" value={fmt.int(s('briefing'))} tone={s('briefing') > 0 ? 'warn' : 'default'} hint="Social media precisa escrever" to={`/conteudo/quadro?mes=${month}`} />
      <StatTile label="Atrasadas" value={fmt.int(d.late)} tone={d.late > 0 ? 'warn' : 'ok'} hint={`${d.publish_next7} publicam nos próximos 7 dias`} to={`/conteudo/calendario?mes=${month}`} />
    </KpiRow>
  )
  if (compact) return tiles
  return (
    <>
      {tiles}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Onde estão as peças">
          <SegmentedBar label="Peças em andamento" parts={CONTENT_PARTS.map((p) => ({ label: p.label, value: s(p.key), slot: p.slot }))} empty="Tudo aprovado ou ainda sem peças." />
        </Panel>
        <Panel title="Carga do design">
          <RankBars label="Peças abertas por designer" format={fmt.int} empty="Nenhuma peça com designer agora."
            rows={d.designers.map((x) => ({ label: x.name, value: x.open, note: x.late ? `${x.late} atrasada${x.late > 1 ? 's' : ''}` : undefined, tone: x.late ? 'warn' as const : undefined }))} />
        </Panel>
      </div>
    </>
  )
}

// ===== Audiovisual =====
const AV_PARTS: { key: string; label: string; slot: Part['slot'] }[] = [
  { key: 'script', label: 'Roteiro', slot: 0 },
  { key: 'scheduled', label: 'Captação marcada', slot: 1 },
  { key: 'captured', label: 'Captado', slot: 2 },
  { key: 'editing', label: 'Em edição', slot: 3 },
  { key: 'review', label: 'Revisão interna', slot: 4 },
  { key: 'client_review', label: 'Com o cliente', slot: 5 },
]

export function AvSummary({ month, compact = false }: { month: string; compact?: boolean }) {
  const q = useQuery({ queryKey: ['dash-av', month], queryFn: () => dashAv(month) })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const d = q.data
  const s = (k: string) => d.by_status[k] ?? 0
  const tiles = (
    <KpiRow label="Audiovisual em números">
      <StatTile label="Projetos abertos" value={fmt.int(d.total - s('delivered'))} hint={`${d.videos_planned} vídeos previstos`} to={`/audiovisual?mes=${month}`} />
      <StatTile label="Captações em 7 dias" value={fmt.int(d.shoots_next7)} to={`/audiovisual?mes=${month}`} />
      <StatTile label="Esperando revisão" value={fmt.int(s('review'))} tone={s('review') > 0 ? 'warn' : 'default'} hint={`${s('client_review')} com o cliente`} to={`/audiovisual?mes=${month}`} />
      <StatTile label="Edição atrasada" value={fmt.int(d.late)} tone={d.late > 0 ? 'warn' : 'ok'} hint={`${d.delivered_month} entregues no mês`} to={`/audiovisual?mes=${month}`} />
    </KpiRow>
  )
  if (compact) return tiles
  return (
    <>
      {tiles}
      <Panel title="Onde estão os vídeos">
        <SegmentedBar label="Projetos em andamento" parts={AV_PARTS.map((p) => ({ label: p.label, value: s(p.key), slot: p.slot }))} />
      </Panel>
    </>
  )
}

// ===== Comercial =====
// Ordem do funil. Pós-venda conta como ganho (já fechou).
const STAGES: { keys: string[]; label: string }[] = [
  { keys: ['novo'], label: 'Novo' },
  { keys: ['qualificacao'], label: 'Qualificação' },
  { keys: ['negociacao'], label: 'Negociação' },
  { keys: ['aguardando'], label: 'Aguardando' },
  { keys: ['ganho', 'pos_venda'], label: 'Ganho' },
]

export function CommercialSummary({ days = 30, compact = false }: { days?: number; compact?: boolean }) {
  const q = useQuery({ queryKey: ['dash-commercial', days], queryFn: () => dashCommercial(days) })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const d = q.data
  const [from, to] = d.period
  const contacts = fillDays(from, to, d.new_contacts_daily.map((r) => ({ day: r.day, value: r.n })))
  const closed = d.won + d.lost
  const nps = d.nps.responses ? Math.round(((d.nps.promoters - d.nps.detractors) / d.nps.responses) * 100) : null
  const tiles = (
    <KpiRow label="Comercial em números">
      <StatTile label={`Novos contatos em ${days} dias`} value={fmt.int(d.new_contacts)} delta={{ pct: pctChange(d.new_contacts, d.new_contacts_prev), goodWhenUp: true }} spark={contacts.map((c) => c.value)} to="/whatsapp/conversas" />
      <StatTile label="Sem resposta" value={fmt.int(d.unanswered)} tone={d.unanswered > 0 ? 'warn' : 'ok'} hint="Conversas esperando a equipe" to="/whatsapp/conversas" />
      <StatTile label="Vendas confirmadas" value={fmt.money(d.sales_cents)} delta={{ pct: pctChange(d.sales_cents, d.sales_cents_prev), goodWhenUp: true }} hint={d.sales_pending ? `${d.sales_pending} para confirmar` : undefined} to="/comercial/vendas" />
      <StatTile label="Conversão" value={closed ? fmt.pct((d.won / closed) * 100) : 'Sem fechamento'} hint={`${d.won} ganhas | ${d.lost} perdidas | NPS ${nps ?? 'sem dados'}`} to="/comercial/funil" />
    </KpiRow>
  )
  if (compact) return tiles
  return (
    <>
      {tiles}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Novos contatos por dia"><DailyBars data={contacts} format={fmt.int} label={`Últimos ${days} dias`} /></Panel>
        <Panel title="Funil">
          <FunnelBars label="Chegaram até a etapa" to="/comercial/funil" empty="Nenhuma oportunidade aberta."
            steps={funnelSteps(STAGES.map((st) => ({ label: st.label, value: st.keys.reduce((n, k) => n + (d.deals_by_stage[k] ?? 0), 0) })))} />
          <p className="text-[13px] text-muted">Em negociação: <b className="font-semibold text-ink">{fmt.money(d.pipeline_cents)}</b></p>
        </Panel>
      </div>
    </>
  )
}

// ===== Carteira de clientes =====
// Velocímetro usa cor de status (laranja, âmbar, verde) com o nome da faixa escrito: nunca só a cor.
const HEALTH_GAUGE: ScoreBand[] = [
  { from: 0, label: HEALTH_BAND_LABEL.ruim, color: 'var(--warn)', ink: 'text-warn-ink' },
  { from: HEALTH_BANDS.atencao, label: HEALTH_BAND_LABEL.atencao, color: '#eda100', ink: 'text-ink' },
  { from: HEALTH_BANDS.boa, label: HEALTH_BAND_LABEL.boa, color: 'var(--ok)', ink: 'text-ok-ink' },
]
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

const MONTH_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Entradas para cima, saídas para baixo, um par por mês. Uma escala só para os dois. */
function FlowChart({ flow }: { flow: ClientsDash['flow'] }) {
  const max = Math.max(1, ...flow.map((m) => Math.max(m.joined, m.left)))
  const h = 64
  return (
    <figure className="m-0">
      <div className="flex items-end gap-1.5" aria-hidden="true">
        {flow.map((m) => (
          <div key={m.month} className="group flex min-w-0 flex-1 flex-col items-center" title={`${MONTH_SHORT[Number(m.month.slice(5, 7)) - 1]}: ${m.joined} entraram, ${m.left} saíram`}>
            <div className="flex w-full items-end justify-center" style={{ height: h }}>
              <div className="w-full max-w-[18px] rounded-t-[4px] bg-series-3" style={{ height: m.joined ? Math.max(3, (m.joined / max) * h) : 0 }} />
            </div>
            <div className="h-px w-full bg-line-strong" />
            <div className="flex w-full items-start justify-center" style={{ height: h * 0.6 }}>
              <div className="w-full max-w-[18px] rounded-b-[4px] bg-series-2" style={{ height: m.left ? Math.max(3, (m.left / max) * h * 0.6) : 0 }} />
            </div>
            <span className="mt-1 text-[11px] text-muted">{MONTH_SHORT[Number(m.month.slice(5, 7)) - 1]}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex gap-4 text-[12px] text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-series-3" /> Entraram</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-series-2" /> Saíram</span>
      </figcaption>
      <table className="sr-only">
        <caption>Clientes que entraram e saíram por mês</caption>
        <thead><tr><th>Mês</th><th>Entraram</th><th>Saíram</th></tr></thead>
        <tbody>{flow.map((m) => <tr key={m.month}><td>{m.month.slice(0, 7)}</td><td>{m.joined}</td><td>{m.left}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

export function ClientsSummary() {
  const q = useQuery({ queryKey: ['dash-clients'], queryFn: dashClients })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const d = q.data
  const atRisk = (d.health.ruim ?? 0) + (d.health.muito_ruim ?? 0)
  const retention = retentionRate(d.flow, 6)
  const churn = monthlyChurn(d.flow)
  const nps = npsScore(d.nps)
  const b = d.tenure.buckets
  return (
    <>
      <KpiRow label="Clientes em números">
        <StatTile label="Clientes ativos" value={fmt.int(d.active)} hint={`${d.lost_90d} saíram em 90 dias`} spark={d.flow.map((m) => m.at_start)} />
        <StatTile label="Retenção em 6 meses" value={retention === null ? 'Sem base' : `${Math.round(retention)}%`}
          hint={churn === null ? 'Sem histórico' : `Cancelamento médio de ${churn.toFixed(1).replace('.', ',')}% ao mês`} tone={retention !== null && retention < 70 ? 'warn' : 'default'} />
        <StatTile label="Tempo médio de casa" value={monthsText(d.tenure.avg_months)} hint={`Quem saiu ficou ${monthsText(d.tenure.lost_avg_months).toLowerCase()}`} />
        <StatTile label="NPS" value={nps === null ? '-' : String(nps)} hint={d.nps.answers ? `${npsLabel(nps)} | ${d.nps.answers} respostas em 180 dias` : 'Peça a nota pelo Comercial'} tone={nps !== null && nps < 0 ? 'warn' : 'default'} />
      </KpiRow>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Entradas e saídas" action={<span className="text-[12px] text-muted">Últimos 12 meses</span>}>
          <FlowChart flow={d.flow} />
        </Panel>
        <Panel title="Saúde da carteira" action={<span className="text-[12px] text-muted">{atRisk > 0 ? `${atRisk} em risco` : 'Ninguém em risco'}</span>}>
          <ScoreGauge label="Nota da carteira pela última avaliação de cada cliente" value={healthScore(d.health)} bands={HEALTH_GAUGE} />
          <p className="text-center text-[13px] text-muted">
            {d.unassessed > 0 ? `${d.unassessed} sem avaliação nos últimos 45 dias.` : 'Todos avaliados.'}
            {d.renewals_60d > 0 && ` ${d.renewals_60d} ${d.renewals_60d === 1 ? 'contrato vence' : 'contratos vencem'} em 60 dias.`}
          </p>
        </Panel>
        <Panel title="Tempo de casa" action={<span className="text-[12px] text-muted">Clientes ativos</span>}>
          <BucketBars label="Clientes por tempo com a gente" rows={[
            { label: 'Até 3 meses', value: b.lt3 },
            { label: '3 a 6 meses', value: b['3to6'] },
            { label: '6 a 12 meses', value: b['6to12'] },
            { label: '1 a 2 anos', value: b['12to24'] ?? b.gt12 },
            { label: '2 anos ou mais', value: b.gt24 ?? 0 },
            ...(b.unknown ? [{ label: 'Sem data', value: b.unknown }] : []),
          ]} />
        </Panel>
        <Panel title="NPS" action={<span className="text-[12px] text-muted">{d.nps.answers} respostas</span>}>
          <SegmentedBar label="Notas de 0 a 10" empty="Nenhuma nota ainda. Peça pelo Comercial." parts={[
            { label: 'Promotores (9 e 10)', value: d.nps.promoters, color: 'bg-ok' },
            { label: 'Neutros (7 e 8)', value: d.nps.neutral, color: 'bg-line-strong' },
            { label: 'Detratores (0 a 6)', value: d.nps.detractors, color: 'bg-warn' },
          ]} />
        </Panel>
        <Panel title="Serviços mais contratados">
          <RankBars label="Clientes ativos por serviço" format={fmt.int} rows={d.services.slice(0, 5).map((s) => ({ label: s.name, value: s.n }))} />
        </Panel>
        <Panel title="Por que os clientes saíram" action={<span className="text-[12px] text-muted">Últimos 12 meses</span>}>
          <RankBars label="Motivos de saída" format={fmt.int} empty="Nenhuma saída no período." rows={d.lost_reasons.slice(0, 4).map((r) => ({ label: r.reason, value: r.n, tone: 'warn' as const }))} />
        </Panel>
        {(d.lost_suggested?.length ?? 0) > 0 && <LostSuggestions rows={d.lost_suggested!} />}
      </div>
      <AvulsosBlock />
    </>
  )
}

// Recorrente 60 dias sem serviço ativo: o sistema só sugere. Perdido é marcado à mão, com motivo.
function LostSuggestions({ rows }: { rows: NonNullable<ClientsDash['lost_suggested']> }) {
  const { state } = useAuth()
  const canDismiss = state.status === 'ready' && (state.user.roles.includes('admin') || state.user.roles.includes('head_marketing'))
  const qc = useQueryClient()
  const dismiss = useMutation({ mutationFn: dismissLostSuggestion, onSuccess: () => void qc.invalidateQueries({ queryKey: ['dash-clients'] }) })
  return (
    <Panel title="Saíram sem avisar?" action={<span className="text-[12px] text-muted">60+ dias sem serviço</span>}>
      <ul className="flex flex-col gap-2">
        {rows.slice(0, 4).map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-[13px]">
            <span className="min-w-0 flex-1">
              <Link to={`/clientes/${r.id}?aba=arquivos`} className="block truncate font-medium text-ink no-underline hover:underline">{r.name}</Link>
              <span className="text-[12px] text-muted">Sem serviço desde {dm(r.since)}</span>
            </span>
            {canDismiss && (
              <button type="button" disabled={dismiss.isPending} onClick={() => dismiss.mutate(r.id)} className="min-h-9 shrink-0 cursor-pointer rounded-full border border-line px-3 text-[12px] font-medium hover:border-ink">Não saiu</button>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-muted">Se saiu, abra e marque como perdido com o motivo.{rows.length > 4 ? ` E mais ${rows.length - 4}.` : ''}</p>
    </Panel>
  )
}

// Base de clientes avulsos: um cartão só, separado dos recorrentes. Dinheiro só para administrador.
function AvulsosBlock() {
  const { state } = useAuth()
  const isAdmin = state.status === 'ready' && state.user.roles.includes('admin')
  const q = useQuery({ queryKey: ['dash-clients-avulsos'], queryFn: dashClientsAvulsos })
  const d = q.data
  if (!d) return null
  const repeatPct = d.buyers > 0 ? Math.round((d.repeat / d.buyers) * 100) : null
  const to = '/clientes?aba=avulsos'
  const f = d.frequency
  const r = d.recency
  const once = f ? f.f1 : 0
  const bought = f ? f.f1 + f.f2 + f.f3 + f.f4 : 0
  const nums: [string, string, string?][] = [
    ['Cadastrados', fmt.int(d.total)],
    ['Ativos', fmt.int(d.bought_90d), 'compraram em 90 dias'],
    ['Novos no mês', fmt.int(d.new_month)],
    ['Voltaram a comprar', repeatPct === null ? '—' : `${repeatPct}%`, `${d.repeat} de ${d.buyers}`],
  ]
  return (
    <Panel title="Clientes avulsos" className="pf-rise" action={<Link to={to} className="inline-flex min-h-10 items-center gap-1 text-[13px] font-medium">Ver avulsos <ArrowRight size={14} aria-hidden="true" /></Link>}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {nums.map(([label, value, hint]) => (
              <div key={label}>
                <dt className="text-[12px] text-muted">{label}</dt>
                <dd className="m-0 text-[22px] font-semibold leading-tight tabular-nums">{value}</dd>
                {hint && <dd className="m-0 text-[11.5px] text-muted">{hint}</dd>}
              </div>
            ))}
          </dl>
          {r && (
            <SegmentedBar label="Pela última compra" empty="Nenhuma compra registrada." parts={[
              { label: 'Até 90 dias', value: r.le90, slot: 0 },
              { label: 'Esfriando', value: r.d91to180, slot: 1 },
              { label: 'Pausados', value: r.gt180, slot: 3 },
              { label: 'Sem compra', value: r.none, slot: 5 },
            ]} />
          )}
          <p className="m-0 text-[13px] text-muted">
            {bought > 0 ? `${once} de ${bought} compraram só uma vez.` : 'Nenhuma compra registrada ainda.'}
            {' Esfriando: 91 a 180 dias sem comprar. Pausado: mais de 180, volta se comprar.'}
            {isAdmin && d.revenue_12m !== null && ` Receita em 12 meses: ${fmt.money(d.revenue_12m * 100)} (${d.paid_count_12m ?? 0} pagamentos${d.ticket !== null ? `, ticket ${fmt.money(d.ticket * 100)}` : ''}).`}
          </p>
          <CoolingButton rows={d.cooling ?? []} />
        </div>
        <DailyBars label="Novos por mês (12 meses)" format={fmt.int} data={d.new_by_month.map((m) => ({ day: m.month, value: m.n }))} height={100} />
      </div>
    </Panel>
  )
}

// Esfriando (91 a 180 dias sem comprar): oportunidade de recompra. Discreto; um toque abre a lista.
function CoolingButton({ rows }: { rows: NonNullable<AvulsosDash['cooling']> }) {
  const [open, setOpen] = useState(false)
  if (!rows.length) return null
  const today = todayBR()
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 cursor-pointer items-center gap-2 self-start rounded-full bg-accent-soft px-3 text-[13px] font-medium text-accent-ink">
        {rows.length} {rows.length === 1 ? 'esfriando' : 'esfriando'}: oferecer de novo <ArrowRight size={14} aria-hidden="true" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={ACTIVITY_LABEL.esfriando} description="Sem comprar há 91 a 180 dias. Bom momento para oferecer de novo." size="sm">
        <ul className="flex flex-col gap-2">
          {rows.slice(0, 10).map((c) => (
            <li key={c.id} className="flex items-baseline justify-between gap-2 text-[13px]">
              <Link to={`/clientes/${c.id}`} onClick={() => setOpen(false)} className="min-w-0 truncate font-medium text-ink no-underline hover:underline">{c.name}</Link>
              <span className="shrink-0 text-[12px] tabular-nums text-muted">{c.last ? `${daysSince(c.last, today)} dias` : 'sem compra'} · {c.n}x</span>
            </li>
          ))}
        </ul>
        {rows.length > 10 && <p className="mt-2 text-[12px] text-muted">E mais {rows.length - 10}. Veja na aba Avulsos.</p>}
      </Dialog>
    </>
  )
}
