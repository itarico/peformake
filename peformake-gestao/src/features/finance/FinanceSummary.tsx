// Financeiro → Resumo (só admin). Uma chamada ao banco (fin_dashboard) traz tudo já calculado: cartões, selo de
// confiança, "o que fazer agora", gráficos e sinais. Sem IA e sem conta feita aqui (anti-falha 1: uma fonte de verdade).
import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, ChevronDown, Lightbulb, ShieldCheck, ShieldAlert, Target, TrendingDown, TrendingUp, Gauge as GaugeIcon } from 'lucide-react'
import { useAuth } from '@/auth/context'
import { SectionHeader } from '@/components/layout/SectionTabs'
import { MonthStackBars, ValueBars } from '@/components/charts/HomeCharts'
import { Panel } from '@/components/charts/Charts'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { useMonthParam } from '@/features/content/useMonthParam'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel } from '@/features/traffic/planRules'
import { FINANCE_TABS } from './financeTabs'
import { brl, dayLabel } from './money'
import { parseMoney } from './statement'
import {
  SUMMARY_UNITS, TRUST_MIN, areaLabel, brlShort, linePoints, parseUnit, resultHint, shortMonth, topActions, trustSentence, trustTone,
  type DashAction, type SummaryUnit, type TrustReason,
} from './summaryRules'

type Rpc = (f: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = (f: string, a?: Record<string, unknown>) => (supabase.rpc as unknown as Rpc)(f, a)

interface Insight { kind: 'ritmo' | 'gasto' | 'lucro' | 'gargalo' | 'dica'; tone: 'ok' | 'warn' | 'neutral'; title: string; value: number; source: string; to: string | null; label: string | null }
interface ClientRow { id: string; name: string; mrr: number; paid3: number; overdue: number; days: number; nps: number | null; risk: 'alto' | 'medio' | 'baixo' }
export interface Dash {
  unit: SummaryUnit; units: ('peformake' | 'ellcazo')[]; month: string; today: string; is_current: boolean
  cards: {
    received: number; received_prev: number; received_delta_pct: number | null; expected: number; to_receive: number; to_receive_n: number
    overdue: number; overdue_clients: number; overdue_max_days: number; expenses_paid: number; expenses_open: number
    result: number; margin_pct: number | null; goal: number | null; goal_pct: number | null; mrr: number
  }
  goals: Partial<Record<'peformake' | 'ellcazo', number | null>>
  trust: { pct: number; reasons: TrustReason[]; checks: { unit: string; name: string; a: number; b: number; ok: boolean }[]; no_profit: boolean }
  actions: DashAction[]
  series: { month: string; received_p: number; received_e: number; expected_p: number; expected_e: number; expenses: number }[]
  cash: { start: number; points: { date: string; balance: number }[]; min: number; min_date: string; negative_on: string | null; end: number; in: number; out: number }
  by_area: { area: string; amount: number }[]
  concentration: { top: { id: string; name: string; amount: number; pct: number }[]; total: number; top1_pct: number; top5_pct: number }
  delinquency: { month: string; billed: number; late: number; pct: number }[]
  expenses: { category: string; amount: number; avg3: number }[]
  insights: Insight[]
  clients: ClientRow[]
}

/** /financeiro: o Resumo para admin. Quem não é admin (ou chegou com parâmetro do Caixa, ex.: ?repasses=1) vai para o Caixa. */
export function FinanceHome() {
  const { state } = useAuth()
  const { search } = useLocation()
  const isAdmin = state.status === 'ready' && state.user.roles.includes('admin')
  const caixaParam = [...new URLSearchParams(search).keys()].some((k) => k !== 'mes' && k !== 'empresa')
  if (!isAdmin || caixaParam) return <Navigate to={`/financeiro/caixa${search}`} replace />
  return <FinanceSummary />
}

export function FinanceSummary() {
  const [month] = useMonthParam()
  const [params, setParams] = useSearchParams()
  const unit = parseUnit(params.get('empresa'))
  const setUnit = (u: SummaryUnit) => setParams((cur) => { const n = new URLSearchParams(cur); if (u === 'juntas') n.delete('empresa'); else n.set('empresa', u); return n }, { replace: true })
  const q = useQuery({
    queryKey: ['fin-dashboard', unit, month],
    queryFn: async () => {
      const { data, error } = await rpc('fin_dashboard', { _unit: unit, _month: month })
      if (error) throw error
      return data as Dash
    },
  })
  const d = q.data
  return (
    <>
      <SectionHeader title="Financeiro" sub={`Resumo de ${monthLabel(month).toLowerCase()}: o que entrou, o que falta e o que fazer agora.`} tabs={FINANCE_TABS}
        actions={<MonthSwitcher />} />
      <div className="flex items-center gap-2 md:flex-wrap">
        <div role="group" aria-label="Empresa" className="inline-flex shrink-0 rounded-full border border-line p-0.5">
          {SUMMARY_UNITS.map((u) => (
            <button key={u.id} type="button" aria-pressed={u.id === unit} onClick={() => setUnit(u.id)}
              className={cn('min-h-9 cursor-pointer rounded-full px-3 text-[13px] font-semibold md:min-h-10 md:px-3.5', u.id === unit ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{u.label}</button>
          ))}
        </div>
        {d && <TrustSeal d={d} />}
      </div>
      {!d ? <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} /> : <Body d={d} unit={unit} />}
    </>
  )
}

// ===== Selo de confiança: uma linha; o detalhe (motivos e conferência) abre em pop-up =====
function TrustSeal({ d }: { d: Dash }) {
  const [open, setOpen] = useState(false)
  const t = d.trust
  const tone = trustTone(t.pct)
  const Icon = tone === 'ok' ? ShieldCheck : ShieldAlert
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-trust={t.pct}
        aria-label={trustSentence(t.pct, t.reasons)}
        className={cn('flex min-h-10 min-w-0 cursor-pointer items-center gap-1.5 rounded-full px-3 max-md:min-h-9 text-left text-[13px] md:max-w-full md:flex-1 md:gap-2 md:px-3.5',
          tone === 'ok' ? 'bg-ok-soft text-ok-ink' : tone === 'warn' ? 'bg-raised text-ink' : 'bg-warn-soft text-warn-ink')}>
        <Icon size={16} aria-hidden="true" className="shrink-0" />
        <span className="min-w-0 truncate"><b className="font-semibold">Dados {t.pct}%</b><span className="max-md:hidden">{trustSentence(t.pct, t.reasons).replace(/^Dados \d+% completos/, ' completos')}</span></span>
        <span className="shrink-0 font-semibold underline underline-offset-2 max-md:hidden">Ver</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} size="sm" title={`Dados ${t.pct}% completos`}
        description={t.pct < TRUST_MIN ? 'Abaixo de 80% os gráficos ficam em cinza: os números podem mudar quando estes pontos forem resolvidos.' : 'Quanto mais completo, mais certo o Resumo.'}
        footer={<Button onClick={() => setOpen(false)}>Fechar</Button>}>
        <ul className="flex flex-col gap-2">
          {t.reasons.length === 0 && <li className="text-[13px] text-muted">Nada faltando.</li>}
          {t.reasons.map((r) => (
            <li key={`${r.key}:${r.unit}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2 text-[13px]">
              <span className="min-w-0"><span className="first-letter:uppercase">{r.text}</span> <span className="text-muted">· −{r.weight} pts</span></span>
              <Link to={r.to} className="shrink-0 font-semibold">{r.label}</Link>
            </li>
          ))}
        </ul>
        <h3 className="mt-4 text-[13px] font-semibold">Conferência automática</h3>
        <ul className="mt-1.5 flex flex-col gap-1 text-[13px]">
          {t.checks.map((c) => (
            <li key={c.unit + c.name} className={cn('flex justify-between gap-2', !c.ok && 'font-semibold text-warn-ink')}>
              <span>{c.name} · {c.unit === 'ellcazo' ? 'Ellcazo' : 'Peformake'}</span>
              <span className="tabular-nums">{c.ok ? 'Bate' : `${brl(c.a)} × ${brl(c.b)}`}</span>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  )
}

function Body({ d, unit }: { d: Dash; unit: SummaryUnit }) {
  const [more, setMore] = useState(false)
  const [details, setDetails] = useState(false)
  const [goal, setGoal] = useState(false)
  const c = d.cards
  const low = d.trust.pct < TRUST_MIN
  const units = d.units
  const actions = topActions(d.actions)
  return (
    <>
      <section data-kpi-row aria-label="Números do mês" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Card label="Recebido no mês" value={brl(c.received)} to="/financeiro/caixa"
          sub={c.received_delta_pct === null ? (c.received_prev ? '' : 'Mês passado sem recebimentos') : <>{c.received_delta_pct >= 0 ? '▲' : '▼'} {Math.abs(c.received_delta_pct).toLocaleString('pt-BR')}%<span className="max-md:hidden"> vs mês passado</span></>}
          subTone={c.received_delta_pct === null ? undefined : c.received_delta_pct >= 0 ? 'ok' : 'warn'}
          extra={c.goal ? <GoalBar pct={c.goal_pct ?? 0} goal={c.goal} onEdit={() => setGoal(true)} /> : <button type="button" onClick={() => setGoal(true)} className="mt-1 inline-flex min-h-8 cursor-pointer items-center gap-1 text-[12px] font-medium text-muted hover:text-ink"><Target size={13} aria-hidden="true" /> Definir meta</button>} />
        <Card label="A receber até o fim do mês" short="A receber no mês" value={brl(c.to_receive)} to="/financeiro/cobranca" sub={`${c.to_receive_n} ${c.to_receive_n === 1 ? 'fatura' : 'faturas'}`} />
        <Card label="Em atraso" value={brl(c.overdue)} to="/financeiro/cobranca" tone={c.overdue > 0 ? 'warn' : undefined}
          sub={c.overdue > 0 ? <>{c.overdue_clients} {c.overdue_clients === 1 ? 'cliente' : 'clientes'} · <span className="max-md:hidden">maior atraso </span>{c.overdue_max_days} dias</> : 'Ninguém atrasado'} />
        <Card label="Resultado do mês" value={d.trust.no_profit ? 'Conferir' : brl(c.result)} tone={!d.trust.no_profit && c.result < 0 ? 'warn' : undefined} to="/financeiro/caixa"
          sub={resultHint(c.expenses_paid, c.margin_pct, d.trust.no_profit)} subTone={c.margin_pct !== null && c.expenses_paid > 0 ? (c.margin_pct >= 30 ? 'ok' : 'warn') : undefined} />
      </section>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <Panel title="O que fazer agora">
          {actions.length === 0 ? <p className="text-[13px] text-muted">Nada urgente. Bom sinal.</p> : (
            <ol className="flex flex-col divide-y divide-line">
              {actions.map((a) => (
                <li key={a.key} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[14px] font-medium">{a.urgent && <span className="size-2 shrink-0 rounded-full bg-warn" aria-label="Urgente" />}<span className="min-w-0 first-letter:uppercase">{a.title}</span></span>
                    <span className="block text-[12px] text-muted">{a.source}</span>
                  </span>
                  <Link to={a.to} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-line-strong px-3.5 text-[13px] font-semibold text-ink no-underline hover:border-ink">{a.label}</Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Signals insights={d.insights} />
      </div>

      <Grey low={low} pct={d.trust.pct}>
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
          <Panel title="Receita 12 meses">
            <MonthStackBars label="Recebido por empresa e previsto por mês" format={brlShort} height={180}
              series={units.map((u) => ({ name: u === 'peformake' ? 'Recebido Peformake' : 'Recebido Ellcazo', swatch: u === 'peformake' ? 'bg-series-1' : 'bg-series-3' }))}
              line={{ name: 'Previsto', color: 'var(--color-ink)' }}
              data={d.series.map((s) => ({ label: shortMonth(s.month), values: units.map((u) => (u === 'peformake' ? s.received_p : s.received_e)), line: units.reduce((t, u) => t + (u === 'peformake' ? s.expected_p : s.expected_e), 0) }))} />
          </Panel>
          <Panel title="Caixa projetado 90 dias">
            <CashLine cash={d.cash} />
          </Panel>
        </div>
      </Grey>

      <div className="flex flex-wrap gap-2">
        <button type="button" aria-expanded={more} onClick={() => setMore((v) => !v)} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold hover:border-ink">
          {more ? 'Menos gráficos' : 'Ver mais gráficos'} <ChevronDown size={15} aria-hidden="true" className={cn('transition-transform', more && 'rotate-180')} />
        </button>
        <button type="button" onClick={() => setDetails(true)} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold hover:border-ink">
          Ver detalhes por cliente <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>

      {more && (
        <Grey low={low} pct={d.trust.pct}>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
            <Panel title="Receita por área">
              {d.by_area.length === 0 ? <Empty>Sem itens de fatura no mês.</Empty> : (
                <ValueBars rows={d.by_area.map((a) => ({ label: areaLabel(a.area), value: a.amount }))} format={brl} total={d.by_area.reduce((t, a) => t + a.amount, 0)} />
              )}
            </Panel>
            <Panel title="Concentração (3 meses)">
              {d.concentration.top.length === 0 ? <Empty>Sem faturamento nos últimos 3 meses.</Empty> : (
                <>
                  <p className={cn('text-[13px]', d.concentration.top1_pct > 20 ? 'font-medium text-warn-ink' : 'text-muted')}>
                    5 maiores = {d.concentration.top5_pct.toLocaleString('pt-BR')}% · maior = {d.concentration.top1_pct.toLocaleString('pt-BR')}%{d.concentration.top1_pct > 20 ? ' (risco acima de 20%)' : ''}
                  </p>
                  <ValueBars rows={d.concentration.top.map((t) => ({ label: t.name, value: t.amount }))} format={brl} total={d.concentration.total} swatch="bg-series-3" />
                </>
              )}
            </Panel>
            <Panel title="Inadimplência por mês">
              <PctBars rows={d.delinquency.map((m) => ({ label: shortMonth(m.month), pct: m.pct, note: m.billed ? `${brl(m.late)} de ${brl(m.billed)}` : 'sem faturas' }))} />
            </Panel>
            <Panel title="Despesas por categoria">
              {d.expenses.length === 0 ? <Empty>Nenhuma saída lançada no mês. Importe o extrato ou cadastre as contas fixas no <Link to="/financeiro/caixa">Caixa</Link>.</Empty> : (
                <ValueBars rows={d.expenses.map((e) => ({ label: e.avg3 > 0 && e.amount > 1.3 * e.avg3 ? `${e.category} ▲` : e.category, value: e.amount }))} format={brl} total={c.expenses_paid} swatch="bg-series-2" />
              )}
            </Panel>
          </div>
        </Grey>
      )}

      {details && <ClientsDialog rows={d.clients} onClose={() => setDetails(false)} />}
      {goal && <GoalDialog d={d} unit={unit} onClose={() => setGoal(false)} />}
    </>
  )
}

function Card({ label, short, value, sub, subTone, tone, to, extra }: { label: string; short?: string; value: string; sub?: ReactNode; subTone?: 'ok' | 'warn'; tone?: 'warn'; to: string; extra?: ReactNode }) {
  return (
    <div data-stat className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface px-3.5 py-3 md:px-4">
      <Link to={to} className="text-ink no-underline">
        <p className="truncate text-[12px] font-medium text-muted">{short ? <><span className="md:hidden">{short}</span><span className="max-md:hidden">{label}</span></> : label}</p>
        <p className={cn('mt-0.5 truncate text-[19px] font-semibold leading-tight tracking-tight tabular-nums md:text-[24px]', tone === 'warn' && 'text-warn-ink')}>{value}</p>
        {sub && <p className={cn('mt-0.5 text-[12px] leading-snug', subTone === 'ok' ? 'font-medium text-ok-ink' : subTone === 'warn' ? 'font-medium text-warn-ink' : 'text-muted')}>{sub}</p>}
      </Link>
      {extra}
    </div>
  )
}

function GoalBar({ pct, goal, onEdit }: { pct: number; goal: number; onEdit: () => void }) {
  return (
    <button type="button" onClick={onEdit} aria-label={`Meta ${brl(goal)}: ${pct}%. Editar meta`} className="mt-1.5 cursor-pointer text-left">
      <span className="block h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
        <span className={cn('block h-full rounded-full', pct >= 100 ? 'bg-ok' : 'bg-series-1')} style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
      </span>
      <span className="mt-0.5 block truncate text-[12px] text-muted">{pct.toLocaleString('pt-BR')}%<span className="max-md:hidden"> da meta de</span><span className="md:hidden"> de</span> {brlShort(goal)}</span>
    </button>
  )
}

const SIGNAL_ICON = { ritmo: GaugeIcon, gasto: TrendingDown, lucro: TrendingUp, gargalo: AlertTriangle, dica: Lightbulb } as const
function Signals({ insights }: { insights: Insight[] }) {
  const [all, setAll] = useState(false)
  const shown = all ? insights : insights.slice(0, 4)
  return (
    <Panel title="Sinais do mês" action={insights.length > 4 ? <button type="button" onClick={() => setAll((v) => !v)} className="min-h-10 cursor-pointer text-[13px] font-medium">{all ? 'Menos' : `Ver todos (${insights.length})`}</button> : undefined}>
      {insights.length === 0 ? <p className="text-[13px] text-muted">Sem sinais fora do normal.</p> : (
        <ul className="flex flex-col gap-2.5">
          {shown.map((s, i) => {
            const Icon = SIGNAL_ICON[s.kind] ?? Lightbulb
            return (
              <li key={i} className="flex items-start gap-2.5">
                <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-full', s.tone === 'warn' ? 'bg-warn-soft text-warn-ink' : s.tone === 'ok' ? 'bg-ok-soft text-ok-ink' : 'bg-raised text-muted')}><Icon size={14} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium">{s.title}</span>
                  <span className="block text-[12px] text-muted">{s.source}</span>
                </span>
                {s.to && s.label && <Link to={s.to} className="inline-flex min-h-10 shrink-0 items-center text-[13px] font-semibold">{s.label}</Link>}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/** Gráficos em cinza com aviso quando os dados estão abaixo de 80% (anti-falha 3). */
function Grey({ low, pct, children }: { low: boolean; pct: number; children: ReactNode }) {
  if (!low) return <>{children}</>
  return (
    <div className="flex flex-col gap-1.5" data-grey>
      <div className="grayscale opacity-70">{children}</div>
      <p className="text-[12px] text-muted">Gráficos em cinza: dados {pct}% completos. Os números podem mudar quando o extrato e as contas fixas entrarem.</p>
    </div>
  )
}

const Empty = ({ children }: { children: ReactNode }) => <p className="text-[13px] text-muted">{children}</p>

function CashLine({ cash }: { cash: Dash['cash'] }) {
  const values = cash.points.map((p) => p.balance)
  const W = 300, H = 120
  const { pts, zeroY } = linePoints(values, W, H)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const neg = cash.negative_on
  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12px] text-muted">
        <span>Hoje <b className="font-semibold text-ink tabular-nums">{brl(cash.start)}</b></span>
        <span>Em 90 dias <b className={cn('font-semibold tabular-nums', cash.end < 0 ? 'text-warn-ink' : 'text-ink')}>{brl(cash.end)}</b></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-36 w-full overflow-visible" role="img" aria-label={`Caixa projetado: hoje ${brl(cash.start)}, em 90 dias ${brl(cash.end)}${neg ? `, fica negativo em ${dayLabel(neg)}` : ''}`}>
        <defs>
          <clipPath id="cx-pos"><rect x="0" y="-10" width={W} height={zeroY + 10} /></clipPath>
          <clipPath id="cx-neg"><rect x="0" y={zeroY} width={W} height={H - zeroY + 10} /></clipPath>
        </defs>
        <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="var(--color-line-strong)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        <path d={`${line} L${W},${zeroY} L0,${zeroY} Z`} fill="var(--color-series-1)" opacity="0.12" clipPath="url(#cx-pos)" />
        <path d={`${line} L${W},${zeroY} L0,${zeroY} Z`} fill="var(--color-warn)" opacity="0.15" clipPath="url(#cx-neg)" />
        <path d={line} fill="none" stroke="var(--color-series-1)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" clipPath="url(#cx-pos)" />
        <path d={line} fill="none" stroke="var(--color-warn)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" clipPath="url(#cx-neg)" />
      </svg>
      <div className="flex justify-between text-[11px] text-muted" aria-hidden="true">
        {cash.points.filter((_, i, a) => i === 0 || i === Math.floor(a.length / 2) || i === a.length - 1).map((p) => <span key={p.date}>{dayLabel(p.date)}</span>)}
      </div>
      <p className={cn('text-[12px]', neg ? 'font-medium text-warn-ink' : 'text-muted')}>
        {neg ? `Fica negativo em ${dayLabel(neg)} (mínimo ${brl(cash.min)} em ${dayLabel(cash.min_date)}).` : `Entram ${brl(cash.in)} · saem ${brl(cash.out)}. Faturas vencidas ficam de fora.`}
      </p>
      <table className="sr-only"><caption>Caixa projetado por semana</caption><tbody>{cash.points.map((p) => <tr key={p.date}><th scope="row">{dayLabel(p.date)}</th><td>{brl(p.balance)}</td></tr>)}</tbody></table>
    </figure>
  )
}

function PctBars({ rows }: { rows: { label: string; pct: number; note: string }[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 text-[13px]">
          <span className="text-muted">{r.label}</span>
          <span className="h-2 rounded-full bg-raised" aria-hidden="true"><span className={cn('block h-full rounded-full', r.pct > 10 ? 'bg-warn' : 'bg-ok')} style={{ width: `${Math.max(r.pct ? 2 : 0, Math.min(100, r.pct))}%` }} /></span>
          <span className="tabular-nums"><b className={cn('font-semibold', r.pct > 10 && 'text-warn-ink')}>{r.pct.toLocaleString('pt-BR')}%</b> <span className="text-[12px] text-muted max-sm:hidden">{r.note}</span></span>
        </li>
      ))}
    </ol>
  )
}

type SortKey = 'name' | 'mrr' | 'paid3' | 'overdue' | 'days'
function ClientsDialog({ rows, onClose }: { rows: ClientRow[]; onClose: () => void }) {
  const [sort, setSort] = useState<SortKey>('overdue')
  const sorted = [...rows].sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : (b[sort] as number) - (a[sort] as number)))
  const cols: [SortKey, string][] = [['name', 'Cliente'], ['mrr', 'Mensalidade'], ['paid3', 'Pago 3 meses'], ['overdue', 'Em atraso'], ['days', 'Dias']]
  const risk = { alto: 'bg-warn-soft text-warn-ink', medio: 'bg-raised text-ink', baixo: 'bg-ok-soft text-ok-ink' } as const
  return (
    <Dialog open onClose={onClose} size="lg" title="Detalhes por cliente" description={`${rows.length} clientes com mensalidade ou fatura nos últimos 3 meses. Toque no título para ordenar.`} footer={<Button onClick={onClose}>Fechar</Button>}>
      <div role="group" aria-label="Ordenar por" className="mb-2 flex flex-wrap gap-1 md:hidden">
        {cols.map(([k, l]) => <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)} className={cn('min-h-10 cursor-pointer rounded-full px-3 text-[12px] font-medium', sort === k ? 'bg-fill text-on-fill' : 'border border-line text-muted')}>{l}</button>)}
      </div>
      <table className="w-full text-[13px] max-md:hidden">
        <thead><tr className="border-b border-line text-left text-[12px] text-muted">
          {cols.map(([k, l]) => <th key={k} scope="col" className={cn('py-2 font-medium', k !== 'name' && 'text-right')}><button type="button" onClick={() => setSort(k)} className={cn('cursor-pointer', sort === k && 'font-semibold text-ink')}>{l}{sort === k ? ' ↓' : ''}</button></th>)}
          <th scope="col" className="py-2 text-right font-medium">NPS</th><th scope="col" className="py-2 text-right font-medium">Risco</th>
        </tr></thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              <td className="py-1.5"><Link to={`/clientes/${r.id}?aba=contrato`} className="font-medium text-ink no-underline hover:underline">{r.name}</Link></td>
              <td className="py-1.5 text-right tabular-nums">{r.mrr ? brl(r.mrr) : '—'}</td>
              <td className="py-1.5 text-right tabular-nums">{brl(r.paid3)}</td>
              <td className={cn('py-1.5 text-right tabular-nums', r.overdue > 0 && 'font-semibold text-warn-ink')}>{r.overdue ? brl(r.overdue) : '—'}</td>
              <td className="py-1.5 text-right tabular-nums">{r.days || '—'}</td>
              <td className="py-1.5 text-right tabular-nums">{r.nps ?? '—'}</td>
              <td className="py-1.5 text-right"><span className={cn('rounded-full px-2 py-0.5 text-[12px] font-medium', risk[r.risk])}>{r.risk === 'medio' ? 'médio' : r.risk}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="flex flex-col divide-y divide-line md:hidden">
        {sorted.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
            <Link to={`/clientes/${r.id}?aba=contrato`} className="min-w-0 flex-1 text-ink no-underline">
              <span className="block truncate font-medium">{r.name}</span>
              <span className="block text-[12px] text-muted">{r.mrr ? `${brl(r.mrr)}/mês` : 'avulso'} · pago 3 meses {brl(r.paid3)}</span>
            </Link>
            {r.overdue > 0 ? <span className="shrink-0 text-right text-[12px] font-semibold text-warn-ink">{brl(r.overdue)}<br />{r.days} dias</span> : <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium', risk[r.risk])}>{r.risk === 'medio' ? 'médio' : r.risk}</span>}
          </li>
        ))}
      </ul>
    </Dialog>
  )
}

function GoalDialog({ d, unit, onClose }: { d: Dash; unit: SummaryUnit; onClose: () => void }) {
  const qc = useQueryClient()
  const editable = unit === 'juntas' ? (['peformake', 'ellcazo'] as const) : ([unit] as const)
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(editable.map((u) => [u, d.goals[u] ? String(d.goals[u]).replace('.', ',') : ''])))
  const bad = editable.some((u) => (vals[u] ?? '').trim() !== '' && (parseMoney(vals[u] ?? '') ?? -1) < 0)
  const save = useMutation({
    mutationFn: async () => {
      for (const u of editable) {
        const raw = (vals[u] ?? '').trim()
        const { error } = await rpc('fin_goal_save', { _unit: u, _target: raw ? parseMoney(raw) : null })
        if (error) throw error
      }
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['fin-dashboard'] }); onClose() },
  })
  return (
    <Dialog open onClose={onClose} size="sm" title="Meta de faturamento" description="Por mês, por empresa. Opcional: sem meta, a barra não aparece."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={bad || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button></>}>
      <div className="flex flex-col gap-3">
        {editable.map((u) => (
          <Field key={u} label={u === 'peformake' ? 'Peformake (R$ por mês)' : 'Ellcazo (R$ por mês)'} inputMode="decimal" placeholder="Sem meta" value={vals[u] ?? ''}
            onChange={(e) => setVals((v) => ({ ...v, [u]: e.target.value }))} error={(vals[u] ?? '').trim() && parseMoney(vals[u] ?? '') === null ? 'Valor inválido' : null} />
        ))}
        {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível salvar.</p>}
      </div>
    </Dialog>
  )
}
