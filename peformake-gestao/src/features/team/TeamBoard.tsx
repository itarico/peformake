import { useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Crown, Flame, Gem, Medal, ShieldCheck, Target, Timer, UserPlus, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CountUp } from '@/components/charts/HomeCharts'
import { useAuth } from '@/auth/context'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { ROLES, ROLE_LABELS, type AppRole } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import { useMonthParam } from '@/features/content/useMonthParam'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel } from '@/features/traffic/planRules'

type Level = 'bronze' | 'prata' | 'ouro' | 'diamante'
interface Row {
  id: string; name: string; role: string | null; job_title: string | null; avatar: string | null
  has_login: boolean; is_me: boolean; points: number; deliveries: number; late: number; clients: number
  level: Level; next_at: number | null; badges: string[]
  breakdown: Record<string, number>
}

const LEVEL: Record<Level, { label: string; chip: string; from: number }> = {
  bronze: { label: 'Bronze', chip: 'bg-[color-mix(in_oklab,#b8733a_22%,transparent)] text-ink', from: 0 },
  prata: { label: 'Prata', chip: 'bg-[color-mix(in_oklab,#9aa7b0_28%,transparent)] text-ink', from: 50 },
  ouro: { label: 'Ouro', chip: 'bg-[color-mix(in_oklab,var(--color-series-4)_30%,transparent)] text-ink', from: 150 },
  diamante: { label: 'Diamante', chip: 'bg-accent-soft text-accent-ink', from: 300 },
}
const BADGE: Record<string, { label: string; hint: string; icon: typeof Zap }> = {
  sem_atraso: { label: 'Sem atraso', hint: '3 ou mais entregas no mês e nada atrasado', icon: ShieldCheck },
  de_primeira: { label: 'De primeira', hint: '80% das artes aprovadas sem pedido de ajuste', icon: Target },
  relampago: { label: 'Relâmpago', hint: 'Mandou o material bruto em até 3 horas', icon: Zap },
  pontual: { label: 'Pontual', hint: 'Check-in no horário em todas as gravações', icon: Timer },
}
const LINES: { key: string; label: string; pts: string; bad?: boolean }[] = [
  { key: 'arts_done', label: 'Artes aprovadas', pts: '+10' },
  { key: 'arts_first', label: 'Aprovadas de primeira', pts: '+5' },
  { key: 'arts_late', label: 'Artes atrasadas', pts: '−5', bad: true },
  { key: 'edits_done', label: 'Edições entregues', pts: '+20' },
  { key: 'edits_on_time', label: 'Edições no prazo', pts: '+10' },
  { key: 'edits_late', label: 'Edições atrasadas', pts: '−10', bad: true },
  { key: 'shoots', label: 'Captações feitas', pts: '+10' },
  { key: 'checkins_on_time', label: 'Check-in no horário', pts: '+5' },
  { key: 'raw_fast', label: 'Bruto em até 3 h', pts: '+10' },
  { key: 'scripts', label: 'Roteiros aprovados', pts: '+5' },
  { key: 'tasks_done', label: 'Tarefas de tráfego feitas', pts: '+3' },
  { key: 'tasks_late', label: 'Tarefas vencidas', pts: '−2', bad: true },
  { key: 'social_done', label: 'Peças aprovadas dos seus clientes', pts: '+3' },
  { key: 'social_late', label: 'Peças sem briefing vencidas', pts: '−3', bad: true },
]

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
const roleLabel = (r: Row) => r.job_title || (r.role ? ROLE_LABELS[r.role as AppRole] ?? r.role : 'Equipe')
const vars = (i: number) => ({ '--i': i }) as CSSProperties

function Avatar({ r, size = 'size-10', ring }: { r: Row; size?: string; ring?: string }) {
  return r.avatar && /^https?:/.test(r.avatar)
    ? <img src={r.avatar} alt="" className={cn(size, 'shrink-0 rounded-2xl object-cover', ring)} />
    : <span className={cn(size, 'grid shrink-0 place-items-center rounded-2xl bg-raised text-[13px] font-semibold', ring)} aria-hidden="true">{initials(r.name)}</span>
}

function LevelChip({ level }: { level: Level }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', LEVEL[level].chip)}>{level === 'diamante' ? <Gem size={11} aria-hidden="true" /> : <Medal size={11} aria-hidden="true" />}{LEVEL[level].label}</span>
}

function Progress({ r }: { r: Row }) {
  if (r.next_at === null) return <p className="text-[12px] text-muted">Nível máximo do mês.</p>
  const from = LEVEL[r.level].from
  const pct = Math.min(100, Math.round(((r.points - from) / (r.next_at - from)) * 100))
  return (
    <div className="flex flex-col gap-1">
      <span className="h-2 rounded-full bg-raised" aria-hidden="true"><span className="pf-grow-x block h-full rounded-full bg-accent" style={{ width: `${Math.max(2, pct)}%` }} /></span>
      <p className="text-[12px] text-muted">Faltam <b className="text-ink tabular-nums">{r.next_at - r.points}</b> pontos para o próximo nível</p>
    </div>
  )
}

function Podium({ top }: { top: Row[] }) {
  const order = [top[1], top[0], top[2]].filter(Boolean) as Row[]
  const height = (r: Row) => (r === top[0] ? 'h-28' : r === top[1] ? 'h-20' : 'h-14')
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6" aria-label="Pódio do mês">
      {order.map((r, i) => (
        <div key={r.id} className="pf-rise flex w-24 flex-col items-center gap-1.5 sm:w-32" style={vars(i)}>
          {r === top[0] && <Crown size={20} className="text-[var(--color-series-4)]" aria-hidden="true" />}
          <Avatar r={r} size={r === top[0] ? 'size-16' : 'size-12'} ring={r === top[0] ? 'ring-2 ring-[var(--color-series-4)]' : undefined} />
          <p className="w-full truncate text-center text-[13px] font-semibold">{r.name}</p>
          <p className="text-[12px] tabular-nums text-muted"><b className="text-ink"><CountUp value={r.points} format={(n) => String(Math.round(n))} /></b> pts</p>
          <div className={cn('pf-grow-y flex w-full items-start justify-center rounded-t-2xl bg-raised pt-2 text-[18px] font-semibold text-muted', height(r))} style={vars(i)}>
            {r === top[0] ? '1º' : r === top[1] ? '2º' : '3º'}
          </div>
        </div>
      ))}
    </div>
  )
}

function ViewAsButton({ r }: { r: Row }) {
  const { state, setViewAs } = useAuth()
  const navigate = useNavigate()
  if (state.status !== 'ready' || !state.user.realRoles.includes('admin') || !r.role || !(ROLES as readonly string[]).includes(r.role)) return null
  return (
    <button type="button" onClick={() => { setViewAs({ staffId: r.id, name: r.name, role: r.role as AppRole }); navigate('/inicio') }}
      className="min-h-9 cursor-pointer self-start rounded-full border border-line-strong px-3 text-[12px] font-semibold hover:border-ink">Ver o sistema como {r.name.split(' ')[0]}</button>
  )
}

function PersonRow({ r, pos, max }: { r: Row; pos: number; max: number }) {
  const [open, setOpen] = useState(false)
  const lines = LINES.filter((l) => (r.breakdown[l.key] ?? 0) > 0)
  return (
    <li className={cn('pf-rise border-t border-line first:border-t-0', r.is_me && 'bg-accent-soft')} style={vars(Math.min(pos, 10))}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-raised/60 sm:px-5">
        <span className="w-7 text-[13px] font-semibold tabular-nums text-muted">{pos}º</span>
        <Avatar r={r} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold">{r.name}{r.is_me && ' (você)'}</span>
            <LevelChip level={r.level} />
            {r.badges.map((b) => { const B = BADGE[b]; if (!B) return null; const I = B.icon; return <span key={b} title={B.hint} className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-semibold text-ok-ink"><I size={11} aria-hidden="true" />{B.label}</span> })}
          </span>
          <span className="mt-1 block h-1.5 rounded-full bg-raised" aria-hidden="true"><span className="pf-grow-x block h-full rounded-full bg-series-1" style={{ ...vars(pos), width: `${Math.max(2, (r.points / max) * 100)}%` }} /></span>
          <span className="mt-1 block truncate text-[12px] text-muted">{roleLabel(r)} · {r.deliveries} entregas{r.late > 0 && <span className="text-warn-ink"> · {r.late} atrasad{r.late === 1 ? 'a' : 'as'}</span>} · {r.clients} clientes{!r.has_login && ' · sem login'}</span>
        </span>
        <span className="text-right"><b className="block text-[20px] font-semibold tabular-nums leading-none">{r.points}</b><span className="text-[11px] text-muted">pontos</span></span>
        <ChevronDown size={16} className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-[1fr_220px] sm:px-5 sm:pl-[88px]">
          {lines.length ? (
            <ul className="grid gap-1 text-[13px]">
              {lines.map((l) => (
                <li key={l.key} className="flex justify-between gap-3 border-b border-line pb-1">
                  <span>{l.label} <span className="text-muted">({l.pts} cada)</span></span>
                  <b className={cn('tabular-nums', l.bad && 'text-warn-ink')}>{r.breakdown[l.key]}</b>
                </li>
              ))}
            </ul>
          ) : <p className="text-[13px] text-muted">Nada pontuado neste mês ainda.</p>}
          <div className="flex flex-col gap-3">
            <Progress r={r} />
            <ViewAsButton r={r} />
          </div>
        </div>
      )}
    </li>
  )
}

/** Placar do mês: pontos pelo trabalho entregue, nível, selos e o que falta para subir. */
export function TeamBoard({ isAdmin }: { isAdmin: boolean }) {
  const [month] = useMonthParam()
  const q = useQuery({
    queryKey: ['team-board', month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('team_board', { _month: month })
      if (error) throw error
      return data as unknown as Row[]
    },
  })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const rows = q.data
  const me = rows.find((r) => r.is_me)
  const scored = rows.filter((r) => r.points > 0)
  const max = Math.max(1, ...rows.map((r) => r.points))
  const noLogin = rows.filter((r) => !r.has_login).length
  const total = rows.reduce((s, r) => s + r.points, 0)

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && noLogin > 0 && (
        <p className="pf-rise flex flex-wrap items-center gap-2 rounded-2xl bg-accent-soft px-4 py-3 text-[14px]">
          <UserPlus size={16} aria-hidden="true" />
          <span><b>{noLogin} de {rows.length}</b> pessoas ainda não têm login: a pontuação já conta, mas elas não veem o próprio placar.</span>
          <Link to="/equipe/membros" className="font-semibold">Convidar em Membros</Link>
        </p>
      )}

      <section aria-label="Pódio" className="pf-rise flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold"><Flame size={18} className="text-[var(--color-series-2)]" aria-hidden="true" /> Placar de {monthLabel(month).toLowerCase()}</h2>
          <p className="text-[13px] text-muted">{total} pontos no time · {scored.length} {scored.length === 1 ? 'pessoa pontuou' : 'pessoas pontuaram'}</p>
        </div>
        {scored.length >= 1 ? <Podium top={scored.slice(0, 3)} /> : <p className="py-6 text-center text-muted">Ninguém pontuou ainda neste mês. Cada arte aprovada, vídeo entregue e tarefa feita soma pontos.</p>}
      </section>

      {me && (
        <section aria-label="Você" className="pf-rise grid gap-3 rounded-3xl border border-line bg-surface p-5 sm:grid-cols-[auto_1fr]">
          <Avatar r={me} size="size-14" />
          <div className="flex flex-col gap-2">
            <p className="flex flex-wrap items-center gap-2 font-semibold">Você está em {rows.indexOf(me) + 1}º com {me.points} pontos <LevelChip level={me.level} /></p>
            <Progress r={me} />
          </div>
        </section>
      )}

      <section aria-label="Ranking" className="overflow-hidden rounded-3xl border border-line bg-surface">
        <ol>{rows.map((r, i) => <PersonRow key={r.id} r={r} pos={i + 1} max={max} />)}</ol>
      </section>

      <details className="rounded-3xl border border-line bg-surface p-5 text-[13px]">
        <summary className="cursor-pointer font-semibold">Como os pontos são contados</summary>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {LINES.map((l) => <li key={l.key} className="flex justify-between gap-3 border-b border-line pb-1"><span>{l.label}</span><b className={cn('tabular-nums', l.bad && 'text-warn-ink')}>{l.pts}</b></li>)}
        </ul>
        <p className="mt-3 text-muted">Níveis do mês: Bronze até 49, Prata a partir de 50, Ouro a partir de 150, Diamante a partir de 300. O placar zera todo mês; o histórico fica em cada mês.</p>
      </details>
    </div>
  )
}
