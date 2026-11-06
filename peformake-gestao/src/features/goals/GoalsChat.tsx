import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { APP_ROLE, calendar, fmt, GOAL_META, monthStartOf, paceOf, ROLE_LABEL, STATE, useGoalsBoard, useInsights, type GoalRole, type GoalRow } from './goals'
import { cheer, clientCard, formatFor, primaryAction, goalIntro, greeting, pickWith, plain, projection, seeded, steps, suggestion, type Action, type Coach, type GoalFormat } from './coach'

// Chat de metas: conversa diária, uma mensagem por vez, montada com os dados do sistema.
// Cada resposta mostra "atualizando seus dados…" por um instante, como quem foi buscar.

type NewMsg =
  | { from: 'bot'; kind: 'text'; text: string }
  | { from: 'bot'; kind: 'goal'; key: string; role: GoalRole; format: GoalFormat }
  | { from: 'bot'; kind: 'client'; card: Card }
  | { from: 'bot'; kind: 'all'; role: GoalRole }
  | { from: 'me'; kind: 'text'; text: string }
type Msg = NewMsg & { id: number }
type Reply = { label: string; act: 'how' | 'next' | 'all' | 'tip' | 'bye'; key?: string }
/** O que ainda não foi visto: mudança de número, meta batida, meta do dia ou dica. */
type Item = { id: string; kind: 'change' | 'hit' | 'day' | 'tip'; key?: string; from?: number; text?: string }

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

/** Bate Meta: o mascote. Um alvo sorridente com uma flecha no centro. */
function Mascot({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" className="shrink-0">
      <circle cx="20" cy="20" r="19" fill="#1fc8db" />
      <circle cx="20" cy="21" r="14" fill="#fff" />
      <circle cx="20" cy="21" r="10" fill="#e5484d" />
      <circle cx="20" cy="21" r="6" fill="#fff" />
      <circle cx="16.2" cy="18.6" r="1.6" fill="#061417" />
      <circle cx="23.8" cy="18.6" r="1.6" fill="#061417" />
      <path d="M15.8 23.2 Q20 27 24.2 23.2" fill="none" stroke="#061417" strokeWidth="1.6" strokeLinecap="round" />
      {/* Flecha cravada no centro: penas para fora. */}
      <path d="M23 18 L34 7" stroke="#061417" strokeWidth="2" strokeLinecap="round" />
      <path d="M34 7 l0.5 -3.5 M34 7 l3.5 -0.5 M31.5 9.5 l0.5 -3.5 M31.5 9.5 l3.5 -0.5" stroke="#eda100" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
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

  // Memória do que já foi mostrado (no aparelho): não repete no mesmo dia; meta batida avisa uma vez no mês.
  const [seen, setSeen] = useState<Set<string>>(() => new Set(JSON.parse(store.get('pf-goals-seen') ?? '[]') as string[]))
  const mark = (ids: string[]) => setSeen((cur) => {
    const next = new Set(cur); ids.forEach((i) => next.add(i))
    const keep = [...next].filter((i) => i.includes(month))
    store.set('pf-goals-seen', JSON.stringify(keep))
    return new Set(keep)
  })
  const lastSnap = useMemo(() => new Map<string, number | null>((JSON.parse(store.get('pf-goals-snap') ?? '[]') as [string, number | null][])), []) // eslint-disable-line react-hooks/exhaustive-deps

  const pool = (insights.data ?? []).filter((x) => x.role === role)
  const items: Item[] = useMemo(() => {
    if (!role || !list.length) return []
    const out: Item[] = []
    for (const r of list) {
      const k = `${r.role}:${r.key}`
      const prev = lastSnap.get(k)
      if (prev !== undefined && prev !== r.actual && !seen.has(`chg:${month}:${k}:${r.actual}`)) out.push({ id: `chg:${month}:${k}:${r.actual}`, kind: 'change', key: r.key, from: prev ?? 0 })
      if (paceOf(r, day, days).state === 'batida' && !seen.has(`hit:${month}:${k}`)) out.push({ id: `hit:${month}:${k}`, kind: 'hit', key: r.key })
    }
    const today = list[cal.doy % list.length]!
    const dayId = `day:${cal.iso}:${role}:${today.key}`
    if (!seen.has(dayId) && !out.some((i) => i.key === today.key)) out.push({ id: dayId, kind: 'day', key: today.key })
    pool.forEach((t, i) => { const id = `tip:${cal.iso}:${role}:${i}`; if (!seen.has(id)) out.push({ id, kind: 'tip', text: t.text }) })
    return out
  }, [role, list, seen, pool, lastSnap, cal.iso, cal.doy, day, days, month])
  const news = items.filter((i) => i.kind !== 'tip')
  const tips = items.filter((i) => i.kind === 'tip')

  const [open, setOpen] = useState(false)
  const [log, setLog] = useState<Msg[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [typing, setTyping] = useState<string | null>(null)
  const [links, setLinks] = useState<Action[]>([])
  const idRef = useRef(1)
  const genRef = useRef(0)
  const lastFormat = useRef<GoalFormat | undefined>(undefined)
  const box = useRef<HTMLDivElement>(null)
  const rnd = useMemo(() => seeded(`${cal.iso}-${role}`), [cal.iso, role])
  const pick = useMemo(() => pickWith(rnd), [rnd])
  const started = useRef(false)

  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }) }, [log, typing])
  // Abre sozinho quando tem novidade de verdade (uma vez por sessão).
  useEffect(() => { if (news.length && !started.current && state.status === 'ready') setOpen(true) }, [news.length, state.status])
  const talked = useRef<GoalRole | undefined>(undefined)
  useEffect(() => {
    if (!open || !role) return
    // Abriu agora, ou mudou de tela com o chat aberto: conversa da área nova.
    if (!started.current || talked.current !== role) { started.current = true; talked.current = role; begin() }
  }, [open, role]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.status !== 'ready' || board.isError || !role || rows.length === 0) return null
  // Nada novo e chat fechado: some.
  if (!open && news.length === 0) return null

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
  /** No máximo 3 botões: o mais útil primeiro, e sempre uma saída. */
  const repliesFor = (key: string | undefined, remaining: Item[]): Reply[] => {
    const tipsLeft = tips.some((x) => !seen.has(x.id))
    const opts: Reply[] = [
      ...(key ? [{ label: 'Como bater?', act: 'how' as const, key }] : []),
      ...(remaining.some((x) => x.kind !== 'tip') ? [{ label: pick(['Próxima novidade', 'Tem mais?']), act: 'next' as const }] : []),
      ...(tipsLeft ? [{ label: tipLabel(), act: 'tip' as const }] : []),
      { label: 'Ver todas as metas', act: 'all' as const },
    ]
    return [...opts.slice(0, 2), { label: remaining.length ? 'Depois eu vejo' : 'Entendi', act: 'bye' as const }]
  }

  /** Mostra um item novo e já marca como visto. */
  function show(item: Item | undefined, prefix: NewMsg[] = []) {
    const remaining = news.filter((x) => x.id !== item?.id && !seen.has(x.id))
    if (!item) {
      say([...prefix, { from: 'bot', kind: 'text', text: pick(['Por hoje é isso! ✅ Volto quando tiver novidade.', 'Tudo visto por hoje. Quando um número mudar, eu aviso.']) }], [{ label: 'Ver todas as metas', act: 'all' }, { label: 'Fechar', act: 'bye' }])
      return
    }
    mark([item.id])
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

  function begin() {
    setLog([])
    const hello: NewMsg = { from: 'bot', kind: 'text', text: greeting(pick, firstName, day, days, MONTH) }
    show(news[0] ?? tips[0], [hello])
  }

  function act(r: Reply) {
    me(r.label)
    if (r.act === 'how') {
      const g = goal(r.key)
      const all = steps(g, coach.data, day, days)
      const remaining = news.filter((x) => !seen.has(x.id))
      say([{ from: 'bot', kind: 'text', text: `${pick(['Fiz as contas:', 'O caminho é este:', 'Passo a passo:'])}\n\n${all.map((t, i) => `${i + 1}. ${t}`).join('\n\n')}` }],
        [...(remaining.length ? [{ label: 'Próxima novidade', act: 'next' as const }] : []), { label: 'Ver todas as metas', act: 'all' as const }, { label: 'Bora fazer', act: 'bye' as const }].slice(0, 3), one(g))
    }
    if (r.act === 'next') show(news.find((x) => !seen.has(x.id)) ?? tips.find((x) => !seen.has(x.id)))
    if (r.act === 'tip') show(tips.find((x) => !seen.has(x.id)))
    if (r.act === 'all') {
      setLog([])
      setTimeout(() => say([{ from: 'bot', kind: 'text', text: pick(['Suas 3 metas do mês:', 'O placar completo:']) }, { from: 'bot', kind: 'all', role: role! }],
        [...list.slice(0, 2).map((x) => ({ label: `Como bater ${GOAL_META[x.key]!.short.toLowerCase()}?`, act: 'how' as const, key: x.key })), { label: 'Fechar', act: 'bye' as const }]), 50)
    }
    if (r.act === 'bye') close()
  }

  function close() {
    setOpen(false)
    store.set('pf-goals-snap', JSON.stringify(rows.map((r) => [`${r.role}:${r.key}`, r.actual])))
  }

  return (
    <div className="pointer-events-none fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-[max(16px,env(safe-area-inset-right))] z-40 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open && (
        <section role="dialog" aria-label="Bate Meta, assistente de metas" className="pf-rise pointer-events-auto flex max-h-[min(560px,calc(100dvh-150px))] w-[min(370px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl shadow-black/30">
          <header onClick={close} title="Clique para recolher" className="flex cursor-pointer items-center gap-2.5 bg-[#075e54] px-3 py-2 text-white dark:bg-[#1f2c34]">
            <span className="relative"><Mascot size={38} /><span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-[#25d366] ring-2 ring-[#075e54] dark:ring-[#1f2c34]" /></span>
            <span className="min-w-0 flex-1"><b className="block text-[14.5px] leading-tight">Bate Meta</b><span className={cn('text-[12px]', typing ? 'text-[#b6f5c9]' : 'opacity-80')}>{typing ? 'digitando…' : 'online'}</span></span>
            <span className="hidden text-[11px] opacity-70 sm:inline">{ROLE_LABEL[role]} · dia {day}/{days}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); close() }} aria-label="Recolher" className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-white/10"><ChevronDown size={18} aria-hidden="true" /></button>
          </header>
          <div ref={box} aria-live="polite" className="wa-wallpaper flex min-h-[180px] flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
            {log.map((m) => m.from === 'me'
              ? <p key={m.id} className="wa-out pf-rise max-w-[80%] self-end rounded-xl rounded-tr-sm px-3 py-1.5 text-[13px] shadow-sm">{m.text}</p>
              : (
                <div key={m.id} className="pf-rise max-w-[92%] self-start whitespace-pre-line rounded-xl rounded-tl-sm bg-surface px-3 py-2 text-[13px] shadow-sm">
                  {m.kind === 'text' && m.text}
                  {m.kind === 'goal' && rowOf(m.role, m.key) && <GoalView r={rowOf(m.role, m.key)!} day={day} days={days} format={m.format} />}
                  {m.kind === 'client' && <ClientCard c={m.card} onGo={close} />}
                  {m.kind === 'all' && <span className="flex flex-col gap-3">{rows.filter((x) => x.role === m.role).map((r) => <GoalBubble key={r.key} r={r} day={day} days={days} />)}</span>}
                </div>
              ))}
            {typing && <span className="inline-flex w-fit gap-1 rounded-xl rounded-tl-sm bg-surface px-3 py-3 shadow-sm" aria-label={typing}>{[0, 1, 2].map((i) => <i key={i} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>}
          </div>
          {links.length > 0 && !typing && (
            <div className="flex flex-wrap gap-1.5 border-t border-line bg-accent-soft/40 px-3 py-2">
              <span className="w-full text-[11px] font-semibold uppercase tracking-wide text-muted">Agir agora</span>
              {links.map((l) => <Link key={l.to + l.label} to={l.to} onClick={close} className="inline-flex min-h-8 items-center rounded-full bg-fill px-3 text-[12.5px] font-semibold text-on-fill no-underline hover:opacity-90">{l.label} →</Link>)}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2">
            {replies.map((r) => <button key={r.label} type="button" onClick={() => act(r)} className="min-h-8 cursor-pointer rounded-full border border-line-strong px-3 text-[12.5px] font-medium hover:border-ink">{r.label}</button>)}
            {!replies.length && <span className="py-1 text-[12px] text-muted">{typing ? 'digitando…' : ' '}</span>}
          </div>
        </section>
      )}
      {!open && news.length > 0 && (
        <button type="button" onClick={() => { started.current = false; setOpen(true) }} aria-label={`Bate Meta: ${news.length} ${news.length === 1 ? 'novidade' : 'novidades'}`}
          className="pf-hop pointer-events-auto relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-fill px-4 text-[13px] font-semibold text-on-fill shadow-xl shadow-black/30 hover:-translate-y-0.5">
          <span className="-ml-2 rounded-full bg-white/20"><Mascot size={30} /></span> Bate Meta
          <span className="pf-blink absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#e5484d] text-[11px] font-bold text-white ring-2 ring-canvas">{news.length}</span>
        </button>
      )}
    </div>
  )
}
