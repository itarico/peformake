import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Target } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { APP_ROLE, calendar, fmt, GOAL_META, monthStartOf, paceOf, ROLE_LABEL, STATE, useGoalsBoard, useInsights, type GoalRole, type GoalRow } from './goals'
import { actions, cheer, goalIntro, greeting, pickWith, plain, seeded, steps, suggestion, type Action, type Coach } from './coach'

// Chat de metas: conversa diária, uma mensagem por vez, montada com os dados do sistema.
// Cada resposta mostra "atualizando seus dados…" por um instante, como quem foi buscar.

type NewMsg =
  | { from: 'bot'; kind: 'text'; text: string }
  | { from: 'bot'; kind: 'goal'; key: string }
  | { from: 'bot'; kind: 'all' }
  | { from: 'me'; kind: 'text'; text: string }
type Msg = NewMsg & { id: number }
type Reply = { label: string; act: 'next' | 'how' | 'step' | 'all' | 'tip' | 'bye' | 'goal'; key?: string }

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

function GoalBubble({ r, day, days }: { r: GoalRow; day: number; days: number }) {
  const m = GOAL_META[r.key]!
  const p = paceOf(r, day, days)
  const st = STATE[p.state]
  const actual = r.actual ?? 0
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-start justify-between gap-2"><b className="text-[13px] leading-tight">{m.title(r.info)}</b><span className={cn('shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold', st.tone)}>{st.label}</span></span>
      <span className="text-[15px] font-semibold tabular-nums">{fmt(actual, m.money)} <span className="text-[12px] font-normal text-muted">{m.kind === 'atMost' ? `limite ${fmt(r.target, m.money)}` : `de ${fmt(r.target, m.money)}`}</span></span>
      <span className="relative mt-0.5 h-2 rounded-full bg-surface">
        <span className={cn('pf-grow-x block h-full rounded-full', st.bar)} style={{ width: `${m.kind === 'atMost' ? 100 : Math.max(4, p.pct)}%` }} />
        {m.kind !== 'atMost' && p.state !== 'batida' && <span title="Onde deveria estar hoje" className="absolute -top-1 h-4 w-0.5 rounded bg-ink/60" style={{ left: `${Math.min(100, p.expectedPct)}%` }} />}
      </span>
      <span className="text-[12px] text-muted">{plain(r, p, day, days, m.money, m.kind)}</span>
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
  const [tab, setTab] = useState<GoalRole | null>(null)
  const role = (tab && available.includes(tab) ? tab : fromPath && available.includes(fromPath) ? fromPath : available[0]) as GoalRole | undefined
  const list = rows.filter((r) => r.role === role)

  // Novidade: primeira visita do dia ou número que mudou desde a última vez que abriu.
  const snapshot = JSON.stringify(rows.map((r) => [r.role, r.key, r.actual]))
  const seenDay = store.get('pf-goals-day') === cal.iso
  const lastSnap = store.get('pf-goals-snap')
  const changed = !!lastSnap && !!rows.length && lastSnap !== snapshot
  const unread = !seenDay || changed

  const [open, setOpen] = useState(false)
  const [log, setLog] = useState<Msg[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [typing, setTyping] = useState<string | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [focus, setFocus] = useState<string | null>(null)
  const [links, setLinks] = useState<Action[]>([])
  const idRef = useRef(1)
  const box = useRef<HTMLDivElement>(null)
  const turn = useRef(0)
  const rnd = useMemo(() => seeded(`${cal.iso}-${role}-${turn.current}`), [cal.iso, role]) // eslint-disable-line react-hooks/exhaustive-deps
  const pick = useMemo(() => pickWith(rnd), [rnd])

  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }) }, [log, typing])
  // Abre sozinho na primeira visita do dia.
  useEffect(() => { if (!seenDay && list.length && state.status === 'ready') setOpen(true) }, [seenDay, list.length, state.status])
  useEffect(() => {
    if (!open || !role || !list.length) return
    store.set('pf-goals-day', cal.iso)
    start(changed)
    store.set('pf-goals-snap', snapshot)
  }, [open, role]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.status !== 'ready' || board.isError || !role || rows.length === 0) return null

  const day = cal.day, days = cal.days
  const todayGoal = list[cal.doy % list.length]!
  const goal = (key: string | null) => list.find((r) => r.key === key) ?? todayGoal
  const pool = (insights.data ?? []).filter((x) => x.role === role || mine.includes(x.role))

  /** Envia uma mensagem do assistente depois de "buscar os dados". */
  const say = (msgs: NewMsg[], next: Reply[]) => {
    setReplies([])
    let i = 0
    const send = () => {
      const m = msgs[i++]
      if (!m) { setTyping(null); setReplies(next); return }
      setTyping(i === 1 ? pick(['atualizando seus dados…', 'buscando seus números…', 'conferindo o mês…']) : 'digitando…')
      const text = m.kind === 'text' ? m.text : ''
      setTimeout(() => { setLog((l) => [...l, { ...m, id: idRef.current++ }]); setTyping(null); setTimeout(send, 250) }, Math.min(1700, 900 + text.length * 8))
    }
    send()
  }
  const me = (text: string) => setLog((l) => [...l, { id: idRef.current++, from: 'me', kind: 'text', text }])

  const after = (key: string): Reply[] => [{ label: pick(['Como bato essa meta?', 'Me mostra o passo a passo', 'O que eu faço?']), act: 'how', key }, { label: 'Ver todas as metas', act: 'all' }, { label: pick(['Me dá uma dica', 'Alguma ideia para hoje?']), act: 'tip' }]

  function start(withChange: boolean) {
    setLog([]); setStepIdx(0); setFocus(todayGoal.key); setLinks([])
    const msgs: NewMsg[] = [{ from: 'bot', kind: 'text', text: greeting(pick, firstName, day, days, MONTH) }]
    if (withChange) {
      const before = new Map<string, number | null>((JSON.parse(lastSnap ?? '[]') as [string, string, number | null][]).map(([ro, k, a]) => [`${ro}:${k}`, a]))
      const moved = list.find((r) => before.has(`${r.role}:${r.key}`) && before.get(`${r.role}:${r.key}`) !== r.actual)
      if (moved) {
        const b = before.get(`${moved.role}:${moved.key}`) ?? 0
        const m = GOAL_META[moved.key]!
        msgs.push({ from: 'bot', kind: 'text', text: `${(moved.actual ?? 0) > (b ?? 0) ? pick(['Novidade boa! 🎉', 'Opa, andou! ↗']) : 'Atualizei aqui:'} ${m.short}: ${fmt(b ?? 0, m.money)} → ${fmt(moved.actual ?? 0, m.money)}.` })
        setFocus(moved.key)
        setLinks(actions(moved, coach.data))
        msgs.push({ from: 'bot', kind: 'goal', key: moved.key })
        say(msgs, after(moved.key))
        return
      }
    }
    say(msgs, [{ label: pick(['Bora ver', 'Mostra a meta do dia', 'Manda']), act: 'next' }])
  }

  function act(r: Reply) {
    turn.current += 1
    me(r.label)
    const g = goal(r.key ?? focus)
    if (r.act === 'next') {
      const sug = suggestion(pick, g, coach.data)
      setLinks(actions(g, coach.data))
      say([{ from: 'bot', kind: 'text', text: goalIntro(pick) }, { from: 'bot', kind: 'goal', key: g.key }, { from: 'bot', kind: 'text', text: cheer(pick, paceOf(g, day, days)) }, ...(sug ? [{ from: 'bot' as const, kind: 'text' as const, text: sug }] : [])], after(g.key))
    }
    if (r.act === 'how' || r.act === 'step') {
      const all = steps(g, coach.data, day, days)
      const idx = r.act === 'how' ? 0 : stepIdx
      setFocus(g.key)
      setLinks(actions(g, coach.data))
      const text = `${r.act === 'how' ? pick(['Bora! Passo a passo:', 'Vamos lá, um passo de cada vez.', 'Fiz as contas. Olha o caminho:']) + '\n\n' : ''}${idx + 1}. ${all[idx]}`
      const last = idx + 1 >= all.length
      setStepIdx(idx + 1)
      say([{ from: 'bot', kind: 'text', text }], last
        ? [{ label: pick(['Valeu!', 'Bora fazer', 'Entendi']), act: 'bye' }, { label: 'Ver todas as metas', act: 'all' }]
        : [{ label: pick(['Próximo passo', 'E depois?', 'Continua']), act: 'step', key: g.key }, { label: 'Ver todas as metas', act: 'all' }])
    }
    if (r.act === 'all') {
      setLog([]); setStepIdx(0); setLinks([])
      setTimeout(() => say([{ from: 'bot', kind: 'text', text: pick(['Suas 3 metas do mês:', 'Aqui está o placar completo:', 'Todas de uma vez:']) }, { from: 'bot', kind: 'all' }],
        list.map((x) => ({ label: `Como bater ${GOAL_META[x.key]!.short.toLowerCase()}?`, act: 'how' as const, key: x.key }))), 50)
    }
    if (r.act === 'tip') {
      const tip = pool.length ? pool[(cal.doy + turn.current) % pool.length]!.text : 'Hoje a dica é simples: escolha uma meta e faça uma ação concreta antes do almoço.'
      say([{ from: 'bot', kind: 'text', text: `💡 ${tip}` }], [{ label: 'Como bato a meta do dia?', act: 'how', key: todayGoal.key }, { label: 'Ver todas as metas', act: 'all' }])
    }
    if (r.act === 'bye') say([{ from: 'bot', kind: 'text', text: pick(['Combinado! Amanhã eu trago mais. 💪', 'Fechado. Qualquer coisa é só me chamar aqui.', 'Isso aí! Te vejo amanhã com os números novos.']) }], [{ label: 'Ver todas as metas', act: 'all' }])
  }

  const close = () => { setOpen(false); store.set('pf-goals-snap', snapshot) }

  return (
    <div className="pointer-events-none fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-[max(16px,env(safe-area-inset-right))] z-40 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open && (
        <section role="dialog" aria-label="Assistente de metas" className="pf-rise pointer-events-auto flex h-[min(560px,calc(100dvh-150px))] w-[min(370px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl shadow-black/30">
          <header onClick={close} title="Clique para recolher" className="flex cursor-pointer items-center gap-2.5 border-b border-line px-3.5 py-2.5 hover:bg-raised/50">
            <span className="grid size-8 place-items-center rounded-full bg-fill text-on-fill"><Target size={15} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><b className="block text-[13.5px]">Assistente de metas</b><span className="text-[11.5px] text-muted">{typing ?? `online · ${ROLE_LABEL[role]}`}</span></span>
            <button type="button" onClick={(e) => { e.stopPropagation(); close() }} aria-label="Minimizar" className="grid size-8 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised"><ChevronDown size={18} aria-hidden="true" /></button>
          </header>
          {available.length > 1 && (
            <div role="tablist" aria-label="Função" className="flex gap-1 overflow-x-auto border-b border-line px-3 py-1.5 [scrollbar-width:none]">
              {available.map((m) => (
                <button key={m} type="button" role="tab" aria-selected={role === m} onClick={() => { setTab(m) }}
                  className={cn('min-h-7 shrink-0 cursor-pointer rounded-full px-2.5 text-[11.5px] font-semibold', role === m ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{ROLE_LABEL[m]}</button>
              ))}
            </div>
          )}
          <div ref={box} aria-live="polite" className="flex flex-1 flex-col gap-2 overflow-y-auto bg-canvas/50 px-3 py-3 [scrollbar-width:thin]">
            {log.map((m) => m.from === 'me'
              ? <p key={m.id} className="pf-rise max-w-[80%] self-end rounded-2xl rounded-br-sm bg-accent-soft px-3 py-1.5 text-[13px]">{m.text}</p>
              : (
                <div key={m.id} className="pf-rise max-w-[90%] self-start whitespace-pre-line rounded-2xl rounded-bl-sm bg-raised px-3 py-2 text-[13px]">
                  {m.kind === 'text' && m.text}
                  {m.kind === 'goal' && <GoalBubble r={goal(m.key)} day={day} days={days} />}
                  {m.kind === 'all' && <span className="flex flex-col gap-3">{list.map((r) => <GoalBubble key={r.key} r={r} day={day} days={days} />)}</span>}
                </div>
              ))}
            {typing && <span className="inline-flex w-fit gap-1 rounded-2xl rounded-bl-sm bg-raised px-3 py-3" aria-label={typing}>{[0, 1, 2].map((i) => <i key={i} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>}
          </div>
          {links.length > 0 && !typing && (
            <div className="flex flex-wrap gap-1.5 border-t border-line bg-accent-soft/40 px-3 py-2">
              <span className="w-full text-[11px] font-semibold uppercase tracking-wide text-muted">Agir agora</span>
              {links.map((l) => <Link key={l.to + l.label} to={l.to} onClick={close} className="inline-flex min-h-8 items-center rounded-full bg-fill px-3 text-[12.5px] font-semibold text-on-fill no-underline hover:opacity-90">{l.label} →</Link>)}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2">
            {replies.map((r) => <button key={r.label} type="button" onClick={() => act(r)} className="min-h-8 cursor-pointer rounded-full border border-line-strong px-3 text-[12.5px] font-medium hover:border-ink">{r.label}</button>)}
            {!replies.length && !typing && <span className="py-1 text-[12px] text-muted">…</span>}
            {isAdmin && replies.length > 0 && <Link to="/configuracoes/metas" onClick={close} className="ml-auto self-center text-[11.5px] text-muted no-underline hover:text-ink">Configurar</Link>}
          </div>
        </section>
      )}
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label={`Acompanhar metas${unread ? ': tem novidade' : ''}`}
          className={cn('pointer-events-auto relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-fill px-4 text-[13px] font-semibold text-on-fill shadow-xl shadow-black/30 transition-transform hover:-translate-y-0.5', unread && 'animate-[pf-nudge_2.4s_ease-in-out_infinite]')}>
          <Target size={16} aria-hidden="true" /> Acompanhar metas
          {unread && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#e5484d] text-[11px] font-bold text-white ring-2 ring-canvas">1</span>}
          {unread && <span aria-hidden="true" className="absolute inset-0 -z-10 animate-ping rounded-full bg-fill opacity-40" />}
        </button>
      )}
    </div>
  )
}
