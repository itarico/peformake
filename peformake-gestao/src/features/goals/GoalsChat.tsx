import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { APP_ROLE, calendar, fmt, GOAL_META, monthStartOf, paceOf, ROLE_LABEL, STATE, useGoalsBoard, useInsights, type GoalRole, type GoalRow } from './goals'
import { useClientDeliveries } from '@/features/clients/DeliveryBar'
import { listNotifications, markRead } from '@/features/notifications/notificationsApi'
import { useProduction } from '@/features/production/useProduction'
import { noticesFrom, pendingFrom, type Notice } from './chatNotices'
import { brl, cheer, clientCard, formatFor, primaryAction, goalIntro, greeting, pickWith, plain, projection, seeded, steps, suggestion, type Action, type Coach, type GoalFormat } from './coach'

// Chat de metas: conversa diária, uma mensagem por vez, montada com os dados do sistema.
// Cada resposta mostra "atualizando seus dados…" por um instante, como quem foi buscar.

type NewMsg =
  | { from: 'bot'; kind: 'text'; text: string }
  | { from: 'bot'; kind: 'goal'; key: string; role: GoalRole; format: GoalFormat }
  | { from: 'bot'; kind: 'client'; card: Card }
  | { from: 'bot'; kind: 'all'; role: GoalRole }
  | { from: 'bot'; kind: 'notice'; n: Notice }
  | { from: 'bot'; kind: 'pending'; list: Pend[] }
  | { from: 'bot'; kind: 'summary' }
  | { from: 'bot'; kind: 'view'; view: 'pendencias' | 'tarefas' | 'novidades' }
  | { from: 'bot'; kind: 'divider'; text: string }
  | { from: 'me'; kind: 'text'; text: string }
type Msg = NewMsg & { id: number }
type Reply = { label: string; act: 'how' | 'next' | 'all' | 'tip' | 'bye' | 'summary' | 'pend' | 'tasks' | 'news'; key?: string; role?: GoalRole }
/** O que ainda não foi visto: mudança de número, meta batida, meta do dia ou dica. */
type Pend = { id: string; client: string; label: string; late: number }
type Item = { id: string; kind: 'change' | 'hit' | 'day' | 'tip' | 'notice' | 'pending' | 'tasks'; key?: string; from?: number; text?: string; notice?: Notice; pend?: Pend[] }

const PATH_ROLE: [RegExp, GoalRole][] = [[/^\/comercial/, 'comercial'], [/^\/financeiro/, 'financeiro'], [/^\/clientes/, 'relacionamento'], [/^\/trafego/, 'trafego'], [/^\/conteudo/, 'conteudo'], [/^\/audiovisual/, 'audiovisual']]
const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())
const store = { get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sem armazenamento */ } } }

function useCoach() {
  return useQuery({
    queryKey: ['company-goals', 'coach'], staleTime: 10 * 60_000, retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)('goals_coach', {})
      if (error) throw new Error(error.message)
      return data as Coach
    },
  })
}

/** Nome da assistente (um lugar só para trocar). */
export const BOT_NAME = 'Cobradora'

/** Foto da assistente (imagem gerada, não é pessoa real), redonda como foto de contato. */
function Mascot({ size = 36 }: { size?: number }) {
  return <img src="/assistente.webp" alt="" width={size} height={size} aria-hidden="true" className="shrink-0 rounded-full bg-raised object-cover" style={{ width: size, height: size }} />
}

function GoalBubble({ r, day, days }: { r: GoalRow; day: number; days: number }) {
  const m = GOAL_META[r.key]!
  const p = paceOf(r, day, days)
  const st = STATE[p.state]
  const actual = r.actual ?? 0
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-start justify-between gap-2"><b className="text-[13px] leading-tight">{m.title(r.info)}</b><span className={cn('shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold', st.tone)}>{st.label}</span></span>
      <span className="text-[15px] font-semibold tabular-nums">{fmt(actual, m.money)} <span className="text-[12px] font-normal text-muted">{m.kind === 'atMost' ? `limite ${fmt(r.target, m.money)}` : `de ${fmt(r.target, m.money)}`}</span></span>
      <span className="relative mt-0.5 h-2 rounded-full bg-raised">
        <span className={cn('pf-grow-x block h-full rounded-full', st.bar)} style={{ width: `${m.kind === 'atMost' ? 100 : Math.max(4, p.pct)}%` }} />
        {m.kind !== 'atMost' && p.state !== 'batida' && <span title="Onde deveria estar hoje" className="absolute -top-1 h-4 w-0.5 rounded bg-ink/60" style={{ left: `${Math.min(100, p.expectedPct)}%` }} />}
      </span>
      <span className="text-[12px] text-muted">{plain(r, p, day, days, m.money, m.kind)}</span>
    </div>
  )
}

function Head({ r, p }: { r: GoalRow; p: ReturnType<typeof paceOf> }) {
  const st = STATE[p.state]
  return <span className="flex items-start justify-between gap-2"><b className="text-[13px] leading-tight">{GOAL_META[r.key]!.title(r.info)}</b><span className={cn('shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold', st.tone)}>{st.label}</span></span>
}

/** Gráfico do mês: o que foi feito até hoje, o ritmo ideal e para onde vai no ritmo atual. */
function GoalChart({ r, day, days }: { r: GoalRow; day: number; days: number }) {
  const m = GOAL_META[r.key]!
  const p = paceOf(r, day, days)
  const stock = m.kind === 'stock'
  const base = stock ? (r.info.base ?? 0) : 0
  const actual = r.actual ?? 0
  const proj = projection(r, day, days, stock)
  const lo = Math.min(base, actual, proj) * (stock ? 0.97 : 1), hi = Math.max(r.target, actual, proj, base + 1) * 1.08
  const W = 260, H = 96, P = 6
  const x = (d: number) => P + (d / days) * (W - 2 * P)
  const y = (v: number) => H - P - ((v - lo) / Math.max(1e-9, hi - lo)) * (H - 2 * P)
  const ok = proj >= r.target
  return (
    <div className="flex flex-col gap-1">
      <Head r={r} p={p} />
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label={`Até hoje ${fmt(actual, m.money)}; no ritmo atual termina com ${fmt(Math.round(proj), m.money)}; meta ${fmt(r.target, m.money)}`}>
        <line x1={P} x2={W - P} y1={y(r.target)} y2={y(r.target)} className="stroke-ok" strokeWidth="1.2" strokeDasharray="4 3" />
        <text x={W - P} y={y(r.target) - 4} textAnchor="end" className="fill-ok-ink text-[9px] font-semibold">meta {fmt(r.target, m.money)}</text>
        <line x1={x(0)} y1={y(base)} x2={x(days)} y2={y(r.target)} className="stroke-muted/40" strokeWidth="1" />
        <line x1={x(day)} y1={y(actual)} x2={x(days)} y2={y(proj)} className={ok ? 'stroke-accent' : 'stroke-[#eda100]'} strokeWidth="2" strokeDasharray="2 3" strokeLinecap="round" />
        <polyline points={`${x(0)},${y(base)} ${x(day)},${y(actual)}`} className="pf-grow-x fill-none stroke-accent" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx={x(day)} cy={y(actual)} r="4" className="fill-accent stroke-surface" strokeWidth="2" />
      </svg>
      <span className="flex justify-between text-[10px] text-muted"><span>dia 1</span><span>hoje · {fmt(actual, m.money)}</span><span>dia {days}</span></span>
      {!stock && actual === 0 ? <span className="text-[12px] text-muted">Ainda sem número este mês. O primeiro resultado já faz a linha subir. 📈</span> : <span className="text-[12px] text-muted">No ritmo de hoje, fecha o mês com <b className={ok ? 'text-ok-ink' : 'text-ink'}>{fmt(Math.max(0, Math.round(proj)), m.money)}</b>{ok ? '. Passa da meta! 🎯' : `. Faltariam ${fmt(Math.max(0, Math.round(r.target - proj)), m.money)}.`}</span>}
    </div>
  )
}

/** Número grande: o que falta, sem rodeio. */
function GoalBig({ r, day, days }: { r: GoalRow; day: number; days: number }) {
  const m = GOAL_META[r.key]!
  const p = paceOf(r, day, days)
  const actual = r.actual ?? 0
  const left = Math.max(1, days - day)
  const atMost = m.kind === 'atMost'
  const rem = Math.max(0, r.target - actual)
  const wk = Math.ceil((rem / left) * 7)
  const hit = p.state === 'batida'
  const sizes = 'pf-rise text-[38px] leading-none tabular-nums'
  const color = STATE[p.state].bar.replace('bg-', 'text-')
  const note = atMost ? (actual <= r.target ? 'Segue assim: dentro do limite.' : 'Passou do limite. Vale entender o porquê.')
    : hit ? `Feito: ${fmt(actual, m.money)} de ${fmt(r.target, m.money)}.`
      : `${m.money ? `São uns ${fmt(wk, true)} por semana.` : wk <= 1 ? 'Basta 1 por semana para chegar lá.' : `São uns ${wk} por semana.`} Até agora: ${fmt(actual, m.money)} de ${fmt(r.target, m.money)}.`
  return (
    <div className="flex flex-col gap-1">
      <Head r={r} p={p} />
      <span className="flex items-end gap-2 py-1 text-[13px] text-muted">
        {atMost ? <><b className={cn(sizes, color)}>{fmt(actual, m.money)}</b><span className="pb-1">no mês (limite {fmt(r.target, m.money)})</span></>
          : hit ? <><b className={cn(sizes, color)}>✓</b><span className="pb-1">Meta batida!</span></>
            : <><span className="pb-1">{rem === 1 ? 'Falta' : 'Faltam'}</span><b className={cn(sizes, color)}>{fmt(rem, m.money)}</b><span className="pb-1">e você tem {left} dias</span></>}
      </span>
      <span className="text-[12px] text-muted">{note}</span>
    </div>
  )
}

/** Tempo × meta: quanto do mês já passou contra quanto da meta já foi feita. */
function GoalTime({ r, day, days }: { r: GoalRow; day: number; days: number }) {
  const m = GOAL_META[r.key]!
  const p = paceOf(r, day, days)
  const t = Math.round((day / days) * 100), g = Math.round(p.pct)
  const row = (label: string, v: number, cls: string) => (
    <span className="grid grid-cols-[52px_1fr_34px] items-center gap-2 text-[11.5px]"><span className="text-muted">{label}</span><span className="h-2.5 rounded-full bg-raised"><span className={cn('pf-grow-x block h-full rounded-full', cls)} style={{ width: `${Math.max(3, Math.min(100, v))}%` }} /></span><b className="text-right tabular-nums">{v}%</b></span>
  )
  return (
    <div className="flex flex-col gap-1.5">
      <Head r={r} p={p} />
      {row('Mês', t, 'bg-muted/50')}
      {row('Meta', g, STATE[p.state].bar)}
      <span className="text-[12px] text-muted">{g >= t ? `A meta (${g}%) está na frente do calendário (${t}%). 💪` : `Já foi ${t}% do mês e ${g}% da meta (${fmt(r.actual ?? 0, m.money)} de ${fmt(r.target, m.money)}). Dá para alcançar o calendário.`}</span>
    </div>
  )
}

function GoalView({ format, ...p }: { r: GoalRow; day: number; days: number; format: GoalFormat }) {
  const kind = GOAL_META[p.r.key]!.kind
  if (format === 'chart' && kind !== 'atMost') return <GoalChart {...p} />
  if (format === 'big') return <GoalBig {...p} />
  if (format === 'time' && kind !== 'atMost') return <GoalTime {...p} />
  return <GoalBubble {...p} />
}

/** Aviso do sistema: vídeo pronto, cliente aprovou, venda para confirmar... */
function NoticeCard({ n }: { n: Notice }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-start gap-2"><span className="text-[18px] leading-none">{n.icon}</span><b className="flex-1 text-[13px] leading-tight">{n.title}</b><span className="shrink-0 text-[10.5px] text-muted">{n.when}</span></span>
      {n.lines.length > 0 && <span className="flex flex-col gap-0.5 pl-7 text-[12px] leading-snug text-muted">{n.lines.map((l, i) => <span key={i} className="line-clamp-2">{n.lines.length > 1 && i < 3 ? '• ' : ''}{l}</span>)}</span>}
    </div>
  )
}

/** Entregas atrasadas: quem, o quê e há quantos dias. */
function PendingCard({ list }: { list: Pend[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <b className="text-[13px]">⏰ {list.length} {list.length === 1 ? 'entrega atrasada' : 'entregas atrasadas'}</b>
      {list.slice(0, 4).map((p, i) => (
        <span key={i} className="flex items-center justify-between gap-2 text-[12px]"><span className="min-w-0 truncate"><b className="font-semibold">{p.client}</b> · {p.label}</span><span className={cn('shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold', p.late > 3 ? 'bg-warn-soft text-warn-ink' : 'bg-[#eda100]/15 text-[#8a5d00] dark:text-[#eda100]')}>{p.late} {p.late === 1 ? 'dia' : 'dias'}</span></span>
      ))}
      {list.length > 4 && <span className="text-[11.5px] text-muted">e mais {list.length - 4}</span>}
    </div>
  )
}

type Task = { id: string; client: string | null; title: string; status: string; due_date: string | null }
type Piece = { id: string; client: string; title: string; status: string; deadline: string | null }
type Video = { id: string; client: string; title: string; status: string; shoot_at: string | null; edit_due_at: string | null; my_part: string }
type MyDayLite = { linked: boolean; tasks?: Task[]; pieces?: Piece[]; videos?: Video[] }
type Tab = 'chat' | 'metas' | 'novidades' | 'tarefas' | 'pendencias'
const isOpenTask = (t: Task) => !/done|conclu|feit|cancel/i.test(t.status)
const isOpenPiece = (p: Piece) => !/approved|aprovad|published|publicad|cancel/i.test(p.status)
const isOpenVideo = (v: Video) => !/delivered|cancelled|approved/i.test(v.status)
const dmy = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '')
const PIECE_STATUS: Record<string, string> = { briefing: 'briefing', in_production: 'em produção', review: 'revisão interna', client_review: 'com o cliente', changes_requested: 'ajuste pedido', ready: 'pronta' }
const VIDEO_STATUS: Record<string, string> = { script: 'roteiro', scheduled: 'captação marcada', captured: 'captado', editing: 'em edição', review: 'revisão interna', client_review: 'com o cliente', changes_requested: 'ajuste pedido' }

/** Linha de lista das abas: texto, detalhe à direita e clique que leva ao lugar certo. */
function Row({ to, onGo, title, sub, right, tone }: { to: string; onGo: () => void; title: string; sub?: string; right?: string; tone?: 'warn' | 'ok' }) {
  return (
    <Link to={to} onClick={onGo} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-ink no-underline transition-colors hover:bg-raised">
      <span className="min-w-0 flex-1"><b className="block truncate text-[12.5px] font-semibold">{title}</b>{sub && <span className="block truncate text-[11.5px] text-muted">{sub}</span>}</span>
      {right && <span className={cn('shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-semibold', tone === 'warn' ? 'bg-warn-soft text-warn-ink' : tone === 'ok' ? 'bg-ok-soft text-ok-ink' : 'bg-raised text-muted')}>{right}</span>}
    </Link>
  )
}
function Group({ title, children, empty }: { title: string; children: React.ReactNode[]; empty: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-2.5 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}{children.length ? ` · ${children.length}` : ''}</span>
      {children.length ? children : <span className="px-2.5 py-1.5 text-[12px] text-muted">{empty}</span>}
    </div>
  )
}

/** Resumo: o que está pendente, o que fazer e o que aconteceu, num lugar só. */
function SummaryCard({ pend, tasks, pieces, updates, today }: { pend: Pend[]; tasks: Task[]; pieces: Piece[]; updates: Notice[]; today: string }) {
  const latePieces = pieces.filter((p) => p.deadline && p.deadline < today)
  const Sec = ({ title, n, children }: { title: string; n: number; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1"><span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">{title}<span className={cn('rounded-full px-1.5 text-[10px]', n ? 'bg-accent-soft text-accent-ink' : 'bg-raised')}>{n}</span></span>{children}</div>
  )
  const row = (k: string, a: string, b?: string, tone?: 'warn') => <span key={k} className="flex items-center justify-between gap-2 text-[12px]"><span className="min-w-0 truncate">{a}</span>{b && <span className={cn('shrink-0 text-[10.5px]', tone ? 'font-semibold text-warn-ink' : 'text-muted')}>{b}</span>}</span>
  const none = (t: string) => <span className="text-[12px] text-muted">{t}</span>
  return (
    <div className="flex flex-col gap-3">
      <Sec title="Pendências" n={pend.length + latePieces.length}>
        {pend.length + latePieces.length === 0 ? none('Nada atrasado. 👌') : <>
          {pend.slice(0, 3).map((p, i) => row(`p${i}`, `${p.client} · ${p.label}`, `${p.late} ${p.late === 1 ? 'dia' : 'dias'}`, 'warn'))}
          {latePieces.slice(0, 2).map((p) => row(p.id, `${p.client} · ${p.title}`, 'peça atrasada', 'warn'))}
        </>}
      </Sec>
      <Sec title="Tarefas a fazer" n={tasks.length}>
        {tasks.length === 0 ? none('Nenhuma tarefa aberta com você.') : tasks.slice(0, 3).map((t) => row(t.id, `${t.client ? `${t.client} · ` : ''}${t.title}`, t.due_date ? `até ${t.due_date.slice(8, 10)}/${t.due_date.slice(5, 7)}` : undefined, t.due_date && t.due_date < today ? 'warn' : undefined))}
      </Sec>
      <Sec title="Atualizações (24 h)" n={updates.length}>
        {updates.length === 0 ? none('Sem novidade nas últimas 24 horas.') : updates.slice(0, 3).map((u) => row(u.id, `${u.icon} ${u.title}`, u.when))}
      </Sec>
    </div>
  )
}

type Card = NonNullable<ReturnType<typeof clientCard>>
/** Cartão de cliente: quem procurar hoje, por quê, e o botão. */
function ClientCard({ c, onGo }: { c: Card; onGo: () => void }) {
  const ini = c.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Cliente para procurar hoje</span>
      <span className="flex items-center gap-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fill text-[13px] font-bold text-on-fill">{ini}</span>
        <span className="min-w-0"><b className="block truncate text-[13.5px]">{c.name}</b><span className="block text-[12px] leading-snug text-muted">{c.why}</span></span>
      </span>
      <Link to={c.to} onClick={onGo} className="inline-flex min-h-8 items-center justify-center rounded-full border border-line-strong px-3 text-[12.5px] font-semibold no-underline hover:border-ink">{c.label} →</Link>
    </div>
  )
}

export function GoalsChat() {
  const { state } = useAuth()
  const location = useLocation()
  const board = useGoalsBoard(monthStartOf(0))
  const coach = useCoach()
  const insights = useInsights()
  const queryClient = useQueryClient()
  const notifs = useQuery({ queryKey: ['notifications'], queryFn: listNotifications, staleTime: 60_000, refetchInterval: 120_000, enabled: state.status === 'ready' })
  const cal = calendar()
  const roles = state.status === 'ready' ? state.user.roles : []
  const isAdmin = roles.includes('admin')
  const firstName = state.status === 'ready' ? (state.user.fullName ?? '').split(' ')[0] ?? '' : ''
  const mine = useMemo<GoalRole[]>(() => (isAdmin ? ['gestao', 'comercial', 'relacionamento', 'financeiro', 'trafego', 'conteudo', 'audiovisual'] : [...new Set(roles.map((r) => APP_ROLE[r]).filter(Boolean) as GoalRole[])]), [isAdmin, roles])
  const rows = (board.data ?? []).filter((r) => mine.includes(r.role) && GOAL_META[r.key])
  const available = mine.filter((m) => rows.some((r) => r.role === m))
  const fromPath = PATH_ROLE.find(([re]) => re.test(location.pathname))?.[1]
  const role = (fromPath && available.includes(fromPath) ? fromPath : available[0]) as GoalRole | undefined
  const list = rows.filter((r) => r.role === role)
  const day = cal.day, days = cal.days, month = cal.iso.slice(0, 7)
  // Entregas pendentes só para quem cuida dos clientes.
  const seesDeliveries = isAdmin || mine.includes('relacionamento')
  const deliveries = useClientDeliveries(seesDeliveries && state.status === 'ready')
  const { clientName } = useProduction()
  const myDay = useQuery({
    queryKey: ['my-day', 'me'], staleTime: 60_000, retry: false, enabled: state.status === 'ready',
    queryFn: async () => { const { data, error } = await (supabase.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)('my_day', { _staff_id: null }); if (error) throw new Error(error.message); return data as MyDayLite },
  })
  // Recolhido pela pessoa: fica só o ícone pequeno até chegar novidade nova.
  const [minimized, setMinimized] = useState(() => store.get('pf-goals-min') ?? '')

  // Memória do que já foi mostrado (no aparelho): não repete no mesmo dia; meta batida avisa uma vez no mês.
  const [seen, setSeen] = useState<Set<string>>(() => new Set(JSON.parse(store.get('pf-goals-seen') ?? '[]') as string[]))
  const mark = (ids: string[]) => setSeen((cur) => {
    const next = new Set(cur); ids.forEach((i) => next.add(i))
    store.set('pf-goals-seen', JSON.stringify([...next].filter((i) => i.includes(month) || i.startsWith('ntf:')).slice(-400)))
    return next
  })
  const lastSnap = useMemo(() => new Map<string, number | null>((JSON.parse(store.get('pf-goals-snap') ?? '[]') as [string, number | null][])), []) // eslint-disable-line react-hooks/exhaustive-deps

  const pool = (insights.data ?? []).filter((x) => x.role === role)
  const pendAll = useMemo(() => (seesDeliveries ? pendingFrom(deliveries.data, clientName, cal.iso) : []), [seesDeliveries, deliveries.data, clientName, cal.iso])
  // O que está com a pessoa: tarefas, peças, vídeos e o que passou do prazo.
  const tasksOpen = (myDay.data?.tasks ?? []).filter(isOpenTask)
  const piecesOpen = (myDay.data?.pieces ?? []).filter(isOpenPiece)
  const videosOpen = (myDay.data?.videos ?? []).filter(isOpenVideo)
  const latePieces = piecesOpen.filter((p) => p.deadline && p.deadline < cal.iso)
  const lateTasks = tasksOpen.filter((t) => t.due_date && t.due_date < cal.iso)
  const overdue = isAdmin ? coach.data?.overdue ?? [] : []
  const noticesWeek = noticesFrom(notifs.data ?? [], Date.now(), { includeRead: true })
  const unreadNotices = noticesFrom(notifs.data ?? []).length
  const pendCount = pendAll.length + latePieces.length + lateTasks.length + overdue.length
  const taskCount = tasksOpen.length + piecesOpen.length + videosOpen.length
  // A conversa guia a pessoa nesta ordem: metas, novidades, pendências e tarefas.
  const items: Item[] = useMemo(() => {
    const out: Item[] = []
    if (role && list.length) {
      for (const r of list) {
        const k = `${r.role}:${r.key}`
        const prev = lastSnap.get(k)
        if (prev !== undefined && prev !== r.actual && !seen.has(`chg:${month}:${k}:${r.actual}`)) out.push({ id: `chg:${month}:${k}:${r.actual}`, kind: 'change', key: r.key, from: prev ?? 0 })
        if (paceOf(r, day, days).state === 'batida' && !seen.has(`hit:${month}:${k}`)) out.push({ id: `hit:${month}:${k}`, kind: 'hit', key: r.key })
      }
      const today = list[cal.doy % list.length]!
      const dayId = `day:${cal.iso}:${role}:${today.key}`
      if (!seen.has(dayId) && !out.some((i) => i.key === today.key)) out.push({ id: dayId, kind: 'day', key: today.key })
    }
    for (const n of noticesFrom(notifs.data ?? [])) if (!seen.has(n.id)) out.push({ id: n.id, kind: 'notice', notice: n })
    const pendId = `pend:${cal.iso}:${pendCount}`
    if (pendCount && !seen.has(pendId)) out.push({ id: pendId, kind: 'pending' })
    const taskId = `tasks:${cal.iso}:${taskCount}`
    if (taskCount && !seen.has(taskId)) out.push({ id: taskId, kind: 'tasks' })
    pool.forEach((t, i) => { const id = `tip:${cal.iso}:${role}:${i}`; if (!seen.has(id)) out.push({ id, kind: 'tip', text: t.text }) })
    return out
  }, [role, list, seen, pool, lastSnap, cal.iso, cal.doy, day, days, month, notifs.data, pendCount, taskCount])
  const news = items.filter((i) => i.kind !== 'tip')
  const updates = useMemo(() => noticesFrom(notifs.data ?? [], Date.now(), { includeRead: true, maxAgeH: 24 }), [notifs.data])
  const tips = items.filter((i) => i.kind === 'tip')

  const [open, setOpen] = useState(false)
  // Celular: trava a página de trás enquanto o chat está aberto.
  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 767px)').matches) return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => { html.style.overflow = prev }
  }, [open])
  // Conversa do dia: fica guardada no aparelho até o fim do dia, para reler quando quiser.
  const LOG_KEY = `pf-goals-log:${cal.iso}`
  const [log, setLog] = useState<Msg[]>(() => { try { return JSON.parse(store.get(LOG_KEY) ?? '[]') as Msg[] } catch { return [] } })
  const [metaRole, setMetaRole] = useState<GoalRole | undefined>(undefined)
  const [replies, setReplies] = useState<Reply[]>([])
  const [typing, setTyping] = useState<string | null>(null)
  const [links, setLinks] = useState<Action[]>([])
  const idRef = useRef(Math.max(0, ...log.map((m) => m.id)) + 1)
  const genRef = useRef(0)
  const lastFormat = useRef<GoalFormat | undefined>(undefined)
  const box = useRef<HTMLDivElement>(null)
  const rnd = useMemo(() => seeded(`${cal.iso}-${role}`), [cal.iso, role])
  const pick = useMemo(() => pickWith(rnd), [rnd])
  const started = useRef(false)

  // Sempre mostra a última mensagem, inclusive quando aparecem os botões embaixo.
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }) }, [log, typing, links, replies])
  useEffect(() => { store.set(LOG_KEY, JSON.stringify(log.slice(-80))) }, [log, LOG_KEY])
  // Meia-noite (Brasília): conversa nova e limpa, mesmo com o sistema aberto. Conversas antigas saem do aparelho.
  const [, setTick] = useState(0)
  useEffect(() => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const next = new Date(now); next.setHours(24, 0, 5, 0)
    const t = setTimeout(() => setTick((n) => n + 1), next.getTime() - now.getTime())
    return () => clearTimeout(t)
  }, [cal.iso])
  const dayRef = useRef(cal.iso)
  useEffect(() => {
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('pf-goals-log:') && k !== LOG_KEY) localStorage.removeItem(k) } catch { /* sem armazenamento */ }
    if (dayRef.current === cal.iso) return
    dayRef.current = cal.iso
    genRef.current++
    started.current = false
    talked.current = undefined
    setLog([]); setReplies([]); setLinks([]); setTyping(null)
  }, [cal.iso, LOG_KEY])
  // Não abre sozinho: o botão "Abre aí!" e o balão chamam, a pessoa decide quando abrir.
  const talked = useRef<GoalRole | undefined>(undefined)
  useEffect(() => {
    if (!open) return
    // Abriu agora, ou mudou de tela com o chat aberto: conversa da área nova.
    if (!started.current || talked.current !== role) { started.current = true; talked.current = role; begin() }
  }, [open, role]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.status !== 'ready') return null
  const newsSig = news.map((x) => x.id).join('|')
  const showPill = news.length > 0 && minimized !== newsSig
  const minimize = () => { store.set('pf-goals-min', newsSig); setMinimized(newsSig) }
  // Sem metas e sem nada do sistema para mostrar: não aparece.
  if (!role && !items.length && !pendAll.length && !updates.length && !(myDay.data?.tasks?.length)) return null

  const goal = (key?: string) => list.find((r) => r.key === key) ?? list[0]!
  /** Mensagens antigas guardam a área: trocar de tela não muda o que já foi dito. */
  const rowOf = (rl: GoalRole, key: string) => rows.find((r) => r.role === rl && r.key === key)
  const say = (msgs: NewMsg[], next: Reply[], newLinks: Action[] = []) => {
    setReplies([]); setLinks([])
    // Uma conversa por vez: se outra começar (troca de tela), esta para de mandar.
    const gen = ++genRef.current
    let i = 0
    const send = () => {
      if (gen !== genRef.current) return
      const m = msgs[i++]
      if (!m) { setTyping(null); setReplies(next); setLinks(newLinks); return }
      setTyping(i === 1 ? pick(['atualizando seus dados…', 'buscando seus números…', 'conferindo o mês…']) : 'digitando…')
      const text = m.kind === 'text' ? m.text : ''
      setTimeout(() => { if (gen !== genRef.current) return; setLog((l) => [...l, { ...m, id: idRef.current++ }]); setTyping(null); setTimeout(send, 200) }, Math.min(1500, 850 + text.length * 6))
    }
    send()
  }
  const one = (g: GoalRow): Action[] => { const p = primaryAction(g, coach.data); return p ? [{ label: p.hint ? `${p.label}: ${p.hint}` : p.label, to: p.to }] : [] }
  const me = (text: string) => setLog((l) => [...l, { id: idRef.current++, from: 'me', kind: 'text', text }])

  const tipLabel = () => {
    const left = tips.filter((x) => !seen.has(x.id)).length
    const shown = pool.length - left
    return left <= 1 ? 'Última dica' : shown === 0 ? 'Uma dica' : 'Outra dica'
  }
  /** Nome do próximo passo, para a pessoa saber para onde a conversa vai. */
  const nextLabel = (x: Item, remaining: Item[]): string => {
    if (x.kind === 'notice') { const n = remaining.filter((y) => y.kind === 'notice').length; return n > 1 ? `Ver novidades (${n})` : 'Ver novidade' }
    if (x.kind === 'pending') return `Ver pendências (${pendCount})`
    if (x.kind === 'tasks') return `Ver tarefas (${taskCount})`
    return 'Próxima meta'
  }
  /** Menu do fim (ou quando não há nada novo): metas, pendências e tarefas, no máximo 3 botões. */
  const menu = (): Reply[] => [
    ...(role ? [{ label: 'Ver metas', act: 'all' as const }] : []),
    { label: pendCount ? `Pendências (${pendCount})` : 'Pendências', act: 'pend' as const },
    { label: taskCount ? `Tarefas (${taskCount})` : 'Tarefas', act: 'tasks' as const },
  ]
  /** No máximo 3 botões: o próximo passo primeiro, depois a ajuda da meta, e sempre uma saída. */
  const repliesFor = (key: string | undefined, remaining: Item[]): Reply[] => {
    const nx = remaining.find((x) => x.kind !== 'tip')
    const tipsLeft = !!key && tips.some((x) => !seen.has(x.id))
    const opts: Reply[] = [
      ...(nx ? [{ label: nextLabel(nx, remaining), act: 'next' as const }] : [{ label: 'Finalizar ✅', act: 'next' as const }]),
      ...(key ? [{ label: 'Como bater?', act: 'how' as const, key }] : []),
      ...(tipsLeft ? [{ label: tipLabel(), act: 'tip' as const }] : []),
    ]
    return [...opts.slice(0, 2), { label: 'Depois eu vejo', act: 'bye' as const }]
  }

  /** Mostra um item novo e já marca como visto. */
  function show(item: Item | undefined, prefix: NewMsg[] = []) {
    const remaining = news.filter((x) => x.id !== item?.id && !seen.has(x.id))
    if (!item) {
      say([...prefix, { from: 'bot', kind: 'text', text: pick(['Pronto, tudo em dia por aqui! ✅ Quando chegar novidade, eu chamo. Quer rever algo?', 'Por agora é isso. ✅ Se quiser, abro de novo suas metas, pendências ou tarefas.']) }], menu())
      return
    }
    mark([item.id])
    if (item.kind === 'notice') {
      const n = item.notice!
      // Visto no chat = lido no sininho também.
      void markRead(n.ids).then(() => { void queryClient.invalidateQueries({ queryKey: ['notifications'] }); void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] }) }).catch(() => undefined)
      const pk = pickWith(seeded(item.id))
      say([...prefix, ...(prefix.length ? [] : [{ from: 'bot' as const, kind: 'text' as const, text: pk(['Chegou novidade:', 'Olha o que aconteceu:', 'Aviso rápido:', 'Novidade por aqui:']) }]), { from: 'bot', kind: 'notice', n }], repliesFor(undefined, remaining), n.action ? [n.action] : [])
      return
    }
    if (item.kind === 'pending') {
      const pk = pickWith(seeded(item.id))
      say([...prefix, { from: 'bot', kind: 'text', text: pk([`Agora as pendências: ${pendCount} ${pendCount === 1 ? 'coisa passou' : 'coisas passaram'} do prazo. Toque para resolver:`, `Bora limpar o atrasado? São ${pendCount}. Toque em cada uma para resolver:`]) }, { from: 'bot', kind: 'view', view: 'pendencias' }], repliesFor(undefined, remaining))
      return
    }
    if (item.kind === 'tasks') {
      const pk = pickWith(seeded(item.id))
      say([...prefix, { from: 'bot', kind: 'text', text: pk([`Por último, o que está com você hoje (${taskCount}):`, `Suas tarefas do momento (${taskCount}). Toque para abrir:`]) }, { from: 'bot', kind: 'view', view: 'tarefas' }], repliesFor(undefined, remaining))
      return
    }
    if (item.kind === 'tip') { say([...prefix, { from: 'bot', kind: 'text', text: `💡 ${item.text}` }], repliesFor(undefined, remaining.filter((x) => x.kind !== 'tip'))); return }
    const g = goal(item.key)
    const m = GOAL_META[g.key]!
    // Sorteio próprio de cada mensagem: formato, frase e cartão mudam de uma para outra.
    const pk = pickWith(seeded(item.id))
    const head: NewMsg = item.kind === 'change'
      ? { from: 'bot', kind: 'text', text: `${(g.actual ?? 0) > (item.from ?? 0) ? pk(['Novidade boa! 🎉', 'Andou! ↗']) : 'Atualizei aqui:'} ${m.short}: ${fmt(item.from ?? 0, m.money)} → ${fmt(g.actual ?? 0, m.money)}.` }
      : item.kind === 'hit' ? { from: 'bot', kind: 'text', text: pk([`🏆 Meta batida: ${m.title(g.info).toLowerCase()}!`, `🏆 Bateu! ${m.title(g.info)} com ${days - day} dias de folga.`]) }
        : { from: 'bot', kind: 'text', text: goalIntro(pk) }
    // Cada mensagem num formato: barra, gráfico, número grande ou tempo × meta; às vezes já vem o cliente para procurar.
    const format: GoalFormat = item.kind === 'hit' ? 'big' : formatFor(m.kind, cal.doy, Math.max(0, list.indexOf(g)), lastFormat.current)
    lastFormat.current = format
    const card = item.kind !== 'hit' && paceOf(g, day, days).state !== 'ok' && pk([true, true, false]) ? clientCard(g, coach.data) : null
    const sug = item.kind !== 'hit' && !card ? suggestion(pk, g, coach.data) : null
    const tail: NewMsg[] = card
      ? [{ from: 'bot', kind: 'text', text: cheer(pk, paceOf(g, day, days)) }, { from: 'bot', kind: 'client', card }]
      : [{ from: 'bot', kind: 'text', text: `${cheer(pk, paceOf(g, day, days))}${sug ? `\n\n${sug}` : ''}` }]
    say([...prefix, head, { from: 'bot', kind: 'goal', key: g.key, role: g.role, format }, ...tail], repliesFor(g.key, remaining), card || paceOf(g, day, days).state === 'ok' ? [] : one(g))
  }

  /** Resumo do dia: pendências, tarefas e atualizações. Abre quando não há novidade, ou quando a pessoa pede. */
  function summary(prefix: NewMsg[] = []) {
    const first = pendAll[0]
    say([...prefix, { from: 'bot', kind: 'text', text: pick(['Seu resumo de agora:', 'Aqui está o que está com você:', 'Resumo rápido:']) }, { from: 'bot', kind: 'summary' }],
      [...(role ? [{ label: 'Ver todas as metas', act: 'all' as const }] : []), { label: 'Fechar', act: 'bye' as const }],
      [...(first ? [{ label: `Resolver ${first.client.split(' ').slice(0, 2).join(' ')}`, to: `/clientes/${first.id}` }] : []), ...((myDay.data?.tasks?.length ?? 0) > 0 ? [{ label: 'Ver meu dia', to: '/' }] : []), ...(updates.length ? [{ label: 'Ver avisos', to: '/notificacoes' }] : [])].slice(0, 2))
  }

  function begin() {
    const talkedToday = log.some((m) => m.from === 'bot')
    // Já conversamos hoje: a conversa continua de onde parou, sem cumprimentar de novo.
    if (talkedToday) {
      if (!news.length) { setReplies(menu()); setLinks([]); return }
      setLog((l) => [...l, { id: idRef.current++, from: 'bot', kind: 'divider', text: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) }])
      show(news[0], [{ from: 'bot', kind: 'text', text: pick(['Voltei com novidade:', 'Chegou coisa nova desde a última vez:', 'Atualizei por aqui:']) }])
      return
    }
    const hello: NewMsg = { from: 'bot', kind: 'text', text: greeting(pick, firstName, day, days, MONTH) }
    if (!news.length) { say([hello, { from: 'bot', kind: 'text', text: 'Nada novo desde a última vez. O que você quer ver?' }], menu()); return }
    show(news[0] ?? tips[0], [hello])
  }

  function act(r: Reply) {
    me(r.label)
    if (r.act === 'how') {
      const g = (r.role ? rowOf(r.role, r.key ?? '') : undefined) ?? goal(r.key)
      const all = steps(g, coach.data, day, days)
      const remaining = news.filter((x) => !seen.has(x.id))
      say([{ from: 'bot', kind: 'text', text: `${pick(['Fiz as contas:', 'O caminho é este:', 'Passo a passo:'])}\n\n${all.map((t, i) => `${i + 1}. ${t}`).join('\n\n')}` }],
        [...(remaining.length ? [{ label: 'Próxima novidade', act: 'next' as const }] : []), { label: 'Ver todas as metas', act: 'all' as const }, { label: 'Bora fazer', act: 'bye' as const }].slice(0, 3), one(g))
    }
    if (r.act === 'next') show(news.find((x) => !seen.has(x.id)))
    if (r.act === 'tip') show(tips.find((x) => !seen.has(x.id)))
    if (r.act === 'all') {
      say([{ from: 'bot', kind: 'text', text: pick(['Suas metas do mês:', 'O placar completo:']) }, { from: 'bot', kind: 'all', role: role! }], menu().filter((x) => x.act !== 'all').concat([{ label: 'Fechar', act: 'bye' }]))
    }
    if (r.act === 'summary') summary()
    if (r.act === 'pend') say([{ from: 'bot', kind: 'text', text: pendCount ? 'Suas pendências agora:' : 'Nada atrasado agora. 👌' }, ...(pendCount ? [{ from: 'bot' as const, kind: 'view' as const, view: 'pendencias' as const }] : [])], menu())
    if (r.act === 'tasks') say([{ from: 'bot', kind: 'text', text: taskCount ? 'O que está com você:' : 'Nenhuma tarefa aberta com você. 👌' }, ...(taskCount ? [{ from: 'bot' as const, kind: 'view' as const, view: 'tarefas' as const }] : [])], menu())
    if (r.act === 'news') say([{ from: 'bot', kind: 'text', text: 'Novidades da semana:' }, { from: 'bot', kind: 'view', view: 'novidades' }], menu())
    if (r.act === 'bye') close()
  }

  function close() {
    setOpen(false)
    store.set('pf-goals-snap', JSON.stringify(rows.map((r) => [`${r.role}:${r.key}`, r.actual])))
  }

  const go = () => close()
  function panel(tab: Tab) {
    if (tab === 'metas') {
      const r0 = metaRole && available.includes(metaRole) ? metaRole : role
      const goals = rows.filter((x) => x.role === r0)
      return (
        <div className="flex flex-col gap-2 px-1.5 py-1.5">
          {available.length > 1 && <span className="flex flex-wrap gap-1">{available.map((a) => <button key={a} type="button" onClick={() => setMetaRole(a)} className={cn('min-h-7 cursor-pointer rounded-full border px-2.5 text-[11.5px] font-semibold', a === r0 ? 'border-ink bg-raised' : 'border-line text-muted hover:border-line-strong')}>{ROLE_LABEL[a]}</button>)}</span>}
          {goals.map((g) => {
            const a = one(g)[0]
            return (
              <div key={g.key} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3">
                <GoalBubble r={g} day={day} days={days} />
                <span className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => { act({ label: `Como bater ${GOAL_META[g.key]!.short.toLowerCase()}?`, act: 'how', key: g.key, role: g.role }) }} className="min-h-7 cursor-pointer rounded-full border border-line-strong px-2.5 text-[11.5px] font-medium hover:border-ink">Como bater?</button>
                  {a && <Link to={a.to} onClick={go} className="inline-flex min-h-7 items-center rounded-full bg-fill px-2.5 text-[11.5px] font-semibold text-on-fill no-underline">{a.label} →</Link>}
                </span>
              </div>
            )
          })}
        </div>
      )
    }
    if (tab === 'novidades') {
      return (
        <div className="flex flex-col">
          {unreadNotices > 0 && <button type="button" onClick={() => { const ids = noticesFrom(notifs.data ?? []).flatMap((n) => n.ids); void markRead(ids).then(() => { void queryClient.invalidateQueries({ queryKey: ['notifications'] }); void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] }) }) }} className="mx-2.5 mt-1.5 cursor-pointer self-end text-[11.5px] font-semibold text-accent-ink hover:underline">Marcar tudo como lido</button>}
          <Group title="Últimos 7 dias" empty="Nenhuma novidade esta semana.">
            {noticesWeek.map((n) => {
              const unread = (notifs.data ?? []).some((x) => n.ids.includes(x.id) && !x.readAt)
              return <Row key={n.id} to={n.action?.to ?? '/notificacoes'} onGo={go} title={`${unread ? '🔵 ' : ''}${n.icon} ${n.title}`} sub={n.lines.join(' · ')} right={n.when} />
            })}
          </Group>
          <Link to="/notificacoes" onClick={go} className="mx-2.5 my-2 text-[12px] font-semibold text-accent-ink no-underline hover:underline">Ver todos os avisos →</Link>
        </div>
      )
    }
    if (tab === 'tarefas') {
      if (myDay.data && !myDay.data.linked) return <p className="px-3 py-4 text-[12.5px] text-muted">Seu login ainda não está ligado ao seu cadastro na equipe. Peça ao administrador em Configurações → Acessos para ver suas tarefas aqui.</p>
      return (
        <div className="flex flex-col">
          <Group title="Tarefas" empty="Nenhuma tarefa aberta com você. 👌">
            {tasksOpen.map((t) => <Row key={t.id} to="/" onGo={go} title={t.title} sub={t.client ?? undefined} right={t.due_date ? `até ${dmy(t.due_date)}` : undefined} tone={t.due_date && t.due_date < cal.iso ? 'warn' : undefined} />)}
          </Group>
          <Group title="Peças" empty="Nenhuma peça com você agora.">
            {piecesOpen.map((p) => <Row key={p.id} to={`/conteudo/peca/${p.id}`} onGo={go} title={`${p.client} · ${p.title}`} sub={PIECE_STATUS[p.status] ?? p.status} right={p.deadline ? `até ${dmy(p.deadline)}` : undefined} tone={p.deadline && p.deadline < cal.iso ? 'warn' : undefined} />)}
          </Group>
          <Group title="Vídeos" empty="Nenhum vídeo com você agora.">
            {videosOpen.map((v) => <Row key={v.id} to={`/audiovisual/projeto/${v.id}`} onGo={go} title={`${v.client} · ${v.title}`} sub={`${VIDEO_STATUS[v.status] ?? v.status}${v.my_part ? ` · você: ${v.my_part}` : ''}`} right={v.shoot_at && v.status === 'scheduled' ? `grava ${dmy(v.shoot_at.slice(0, 10))}` : v.edit_due_at ? `edita até ${dmy(v.edit_due_at.slice(0, 10))}` : undefined} />)}
          </Group>
        </div>
      )
    }
    // Pendências: tudo que passou do prazo.
    return (
      <div className="flex flex-col">
        {seesDeliveries && <Group title="Entregas dos clientes" empty="Nenhuma entrega atrasada. 👏">
          {pendAll.map((p, i) => <Row key={`${p.id}${i}`} to={`/clientes/${p.id}`} onGo={go} title={p.client} sub={p.label} right={`${p.late} ${p.late === 1 ? 'dia' : 'dias'}`} tone="warn" />)}
        </Group>}
        <Group title="Suas peças e tarefas atrasadas" empty="Nada seu atrasado. 👌">
          {[...latePieces.map((p) => <Row key={p.id} to={`/conteudo/peca/${p.id}`} onGo={go} title={`${p.client} · ${p.title}`} sub="peça" right={`venceu ${dmy(p.deadline)}`} tone="warn" />),
            ...lateTasks.map((t) => <Row key={t.id} to="/" onGo={go} title={t.title} sub={t.client ?? 'tarefa'} right={`venceu ${dmy(t.due_date)}`} tone="warn" />)]}
        </Group>
        {isAdmin && <Group title="Cobranças em atraso" empty="Ninguém devendo. 💚">
          {overdue.map((o) => <Row key={o.id} to={`/clientes/${o.id}?aba=contrato`} onGo={go} title={o.name} sub="fatura em aberto" right={o.amount ? brl(o.amount) : undefined} tone="warn" />)}
        </Group>}
      </div>
    )
  }

  return (
    <>
    {/* Celular: com o chat aberto, o fundo escurece e não rola; tocar fora recolhe. */}
    {open && <div aria-hidden="true" onClick={close} className="fixed inset-0 z-30 touch-none bg-black/30 md:hidden" />}
    <div className="pointer-events-none fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-[max(16px,env(safe-area-inset-right))] z-40 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open && (
        <section role="dialog" aria-label={`${BOT_NAME}, assistente de metas`} className="pf-rise pointer-events-auto flex h-[min(600px,calc(100dvh-150px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl shadow-black/30">
          <header onClick={close} title="Clique para recolher" className="flex cursor-pointer items-center gap-2.5 bg-[#075e54] px-3 py-2 text-white dark:bg-[#1f2c34]">
            <span className="relative"><Mascot size={38} /><span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-[#25d366] ring-2 ring-[#075e54] dark:ring-[#1f2c34]" /></span>
            <span className="min-w-0 flex-1"><b className="block text-[14.5px] leading-tight">{BOT_NAME} <span className="font-normal opacity-75">· cobra suas metas</span></b><span className={cn('text-[12px]', typing ? 'text-[#b6f5c9]' : 'opacity-80')}>{typing ? 'digitando…' : 'online'}</span></span>
            <span className="hidden text-[11px] opacity-70 sm:inline">{role ? `${ROLE_LABEL[role]} · ` : ''}dia {day}/{days}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); close() }} aria-label="Recolher" className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-white/10"><ChevronDown size={18} aria-hidden="true" /></button>
          </header>
          <div ref={box} aria-live="polite" className="wa-wallpaper flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:thin]">
            {log.map((m) => m.kind === 'divider'
              ? <span key={m.id} className="my-1 self-center rounded-full bg-raised px-2.5 py-0.5 text-[10.5px] font-semibold text-muted">{m.text}</span>
              : m.from === 'me'
              ? <p key={m.id} className="wa-out pf-rise max-w-[80%] self-end rounded-xl rounded-tr-sm px-3 py-1.5 text-[13px] shadow-sm">{m.text}</p>
              : (
                <div key={m.id} className="pf-rise max-w-[92%] self-start whitespace-pre-line rounded-xl rounded-tl-sm bg-surface px-3 py-2 text-[13px] shadow-sm">
                  {m.kind === 'text' && m.text}
                  {m.kind === 'goal' && rowOf(m.role, m.key) && <GoalView r={rowOf(m.role, m.key)!} day={day} days={days} format={m.format} />}
                  {m.kind === 'client' && <ClientCard c={m.card} onGo={close} />}
                  {m.kind === 'notice' && <NoticeCard n={m.n} />}
                  {m.kind === 'pending' && <PendingCard list={m.list} />}
                  {m.kind === 'summary' && <SummaryCard pend={pendAll} tasks={(myDay.data?.tasks ?? []).filter((t) => !/done|conclu|feita/i.test(t.status))} pieces={myDay.data?.pieces ?? []} updates={updates} today={cal.iso} />}
                  {m.kind === 'all' && <div className="-mx-2 -my-1 w-[300px] max-w-full">{panel('metas')}</div>}
                  {m.kind === 'view' && <div className="-mx-2 -my-1 w-[300px] max-w-full">{panel(m.view)}</div>}
                </div>
              ))}
            {typing && <span className="inline-flex w-fit gap-1 rounded-xl rounded-tl-sm bg-surface px-3 py-3 shadow-sm" aria-label={typing}>{[0, 1, 2].map((i) => <i key={i} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>}
          </div>
          {links.length > 0 && !typing && (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-line bg-accent-soft/40 px-3 py-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Agir agora</span>
              {links.map((l) => <Link key={l.to + l.label} to={l.to} onClick={close} className="inline-flex min-h-8 items-center rounded-full bg-fill px-3 text-[12.5px] font-semibold text-on-fill no-underline hover:opacity-90">{l.label} →</Link>)}
            </div>
          )}
          <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-line px-3 py-2">
            {replies.map((r) => <button key={r.label} type="button" onClick={() => act(r)} className="min-h-8 cursor-pointer rounded-full border border-line-strong px-3 text-[12.5px] font-medium hover:border-ink">{r.label}</button>)}
            {!replies.length && <span className="py-1 text-[12px] text-muted">{typing ? 'digitando…' : ' '}</span>}
          </div>
        </section>
      )}
      {/* Um elemento só: a foto da assistente (como bolha de conversa). Com novidade, aparece um balão ao lado que dá para fechar. */}
      {!open && (
        <div className="pointer-events-none flex items-end gap-2">
          {showPill && (
            <span className="pf-rise pointer-events-auto relative mb-1 flex max-w-[230px] items-center rounded-2xl rounded-br-sm border border-line bg-surface py-2 pl-3 pr-8 text-left shadow-xl shadow-black/20">
              <button type="button" onClick={() => { started.current = false; setOpen(true) }} className="cursor-pointer text-left">
                <b className="block text-[12.5px] leading-tight text-ink">{BOT_NAME}</b>
                <span className="block text-[12.5px] leading-snug text-muted">{news.length === 1 ? 'Tenho 1 novidade para você.' : `Tenho ${news.length} novidades para você.`} Abre aí!</span>
              </button>
              <button type="button" onClick={minimize} aria-label="Fechar o aviso" title="Fechar o aviso"
                className="absolute right-1 top-1 grid size-7 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"><X size={14} aria-hidden="true" /></button>
            </span>
          )}
          <button type="button" onClick={() => { started.current = false; setOpen(true) }}
            aria-label={news.length ? `${BOT_NAME}: ${news.length} ${news.length === 1 ? 'novidade' : 'novidades'}. Abrir` : `${BOT_NAME}: ver pendências, tarefas e atualizações`}
            className={cn('pointer-events-auto relative size-14 shrink-0 cursor-pointer rounded-full shadow-xl shadow-black/30 ring-2 ring-surface transition-transform hover:-translate-y-0.5', showPill && 'pf-hop')}>
            <Mascot size={56} />
            <span className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full bg-[#25d366] ring-2 ring-surface" />
            {news.length > 0 && <span className="pf-blink absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#e5484d] px-1 text-[11px] font-bold text-white ring-2 ring-canvas">{news.length}</span>}
          </button>
        </div>
      )}
    </div>
    </>
  )
}
