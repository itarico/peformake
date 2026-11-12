import type { CSSProperties, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarClock, CheckCircle2, Clapperboard, Flame, Link2, MapPin, Palette, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { Panel } from '@/components/charts/Charts'
import { cn } from '@/lib/cn'
import { ROLE_LABELS, type AppRole } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { countdown } from '@/features/av/avRules'
import { TONE_CLASS } from '@/features/av/AvShell'
import { ArtRequestButton } from '@/features/content/ArtRequest'
import { Attainment, fetchOte, goalTitle } from '@/features/team/MemberPay'
import { progressText } from '@/features/team/memberGoals'

interface Day {
  linked: boolean
  staff?: { id: string; name: string; role: string | null; job_title: string | null; has_login: boolean }
  board?: { points: number; level: 'bronze' | 'prata' | 'ouro' | 'diamante'; next_at: number | null; deliveries: number; late: number; badges: string[] } | null
  clients: { id: string; name: string; role: string | null; pieces_month: number; no_brief: number; to_review: number; with_client: number; approved_month: number; next_shoot: string | null }[]
  pieces: { id: string; client: string; title: string; status: string; deadline: string | null; publish_date: string | null; revision_count: number | null }[]
  videos: { id: string; client: string; title: string; status: string; shoot_at: string | null; edit_due_at: string | null; location: string | null; staff_token: string | null; my_part: string; checkin_at: string | null; raw_sent_at: string | null }[]
  tasks: { id: string; client: string | null; title: string; status: string; due_date: string | null; priority: string | null }[]
  leads: { id: string; name: string; stage: string }[]
}

const LEVEL = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', diamante: 'Diamante' } as const
const LEVEL_FROM = { bronze: 0, prata: 50, ouro: 150, diamante: 300 } as const
const vars = (i: number) => ({ '--i': i }) as CSSProperties
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const endOfDay = (d: string) => `${d}T21:00:00-03:00`

function Chip({ tone, children }: { tone: 'red' | 'yellow' | 'green'; children: ReactNode }) {
  return <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[tone])}>{children}</span>
}

function Kpi({ label, value, warn, i }: { label: string; value: number | string; warn?: boolean; i: number }) {
  return (
    <div className="pf-rise rounded-2xl border border-line bg-surface px-4 py-3" style={vars(i)}>
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p className={cn('text-[26px] font-semibold leading-tight tabular-nums', warn && 'text-warn-ink')}>{value}</p>
    </div>
  )
}

function Points({ d }: { d: Day }) {
  const b = d.board
  if (!b) return null
  const from = LEVEL_FROM[b.level]
  const pct = b.next_at ? Math.min(100, Math.round(((b.points - from) / (b.next_at - from)) * 100)) : 100
  return (
    <Link to="/equipe/placar" className="pf-rise flex min-w-[220px] flex-col gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3 text-ink no-underline hover:border-line-strong">
      <span className="flex items-center justify-between gap-2 text-[12px] font-medium text-muted"><span className="flex items-center gap-1"><Flame size={13} aria-hidden="true" /> Meus pontos do mês</span><span className="font-semibold text-ink">{LEVEL[b.level]}</span></span>
      <span className="text-[26px] font-semibold leading-tight tabular-nums">{b.points}</span>
      <span className="h-1.5 rounded-full bg-raised" aria-hidden="true"><span className="pf-grow-x block h-full rounded-full bg-accent" style={{ width: `${Math.max(2, pct)}%` }} /></span>
      <span className="text-[11px] text-muted">{b.next_at ? `Faltam ${b.next_at - b.points} para o próximo nível` : 'Nível máximo'}</span>
    </Link>
  )
}

const PIECE_COLUMNS: { id: string; label: string; match: string[]; hint: string }[] = [
  { id: 'fazer', label: 'Para fazer', match: ['ready', 'changes_requested', 'in_production'], hint: 'Briefing pronto ou ajuste pedido' },
  { id: 'revisao', label: 'Em revisão', match: ['review'], hint: 'A social pediu para ver antes do cliente' },
  { id: 'cliente', label: 'Com o cliente', match: ['client_review'], hint: 'Esperando aprovação no portal' },
  { id: 'briefing', label: 'Esperando briefing', match: ['briefing'], hint: 'A social media ainda não escreveu' },
]

function DesignerView({ d, now }: { d: Day; now: number }) {
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {PIECE_COLUMNS.map((col, ci) => {
        const list = d.pieces.filter((p) => col.match.includes(p.status))
        return (
          <section key={col.id} aria-label={col.label} className="pf-rise flex flex-col gap-2 rounded-3xl border border-line bg-surface p-3" style={vars(ci)}>
            <header className="flex items-baseline justify-between px-1"><h2 className="text-[14px] font-semibold">{col.label}</h2><span className="text-[13px] tabular-nums text-muted">{list.length}</span></header>
            <p className="px-1 text-[12px] text-muted">{col.hint}</p>
            <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
              {list.slice(0, 30).map((p) => {
                const c = countdown(p.deadline ? endOfDay(p.deadline) : null, now)
                return (
                  <li key={p.id}>
                    <Link to={`/conteudo/peca/${p.id}`} className="flex flex-col gap-1 rounded-2xl bg-raised/60 px-3 py-2.5 text-ink no-underline transition-colors hover:bg-raised">
                      <span className="flex items-start justify-between gap-2 text-[12px] text-muted"><span className="truncate">{p.client}</span>{c && <Chip tone={c.tone}>{c.text}</Chip>}</span>
                      <span className="line-clamp-2 text-[14px] font-medium leading-snug">{p.title}</span>
                      {(p.revision_count ?? 0) > 0 && <span className="text-[11px] text-warn-ink">{p.revision_count} ajuste{p.revision_count === 1 ? '' : 's'} pedido{p.revision_count === 1 ? '' : 's'}</span>}
                    </Link>
                  </li>
                )
              })}
              {list.length === 0 && <li className="px-1 py-4 text-center text-[13px] text-muted">Nada aqui.</li>}
              {list.length > 30 && <li className="px-1 text-center text-[12px] text-muted">e mais {list.length - 30} no quadro de Peças</li>}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function ClientsTable({ d, social }: { d: Day; social: boolean }) {
  return (
    <Panel title={social ? 'Meus clientes no mês' : 'Clientes que eu atendo'} className="pf-rise">
      {/* Celular: um cartão por cliente com o que importa (pendências em destaque). */}
      <ul className="flex flex-col divide-y divide-line md:hidden">
        {d.clients.map((c) => (
          <li key={c.id} className="flex flex-col gap-1.5 py-3">
            <span className="flex items-center gap-2">
              <Link to={`/clientes/${c.id}`} className="min-w-0 flex-1 truncate font-semibold text-ink">{c.name}</Link>
              {social && <ArtRequestButton clientId={c.id} className="min-h-9 px-3 text-[12px]" />}
            </span>
            <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] tabular-nums text-muted">
              <span>{c.pieces_month} peças</span>
              {c.no_brief > 0 && <span className="font-semibold text-warn-ink">{c.no_brief} sem briefing</span>}
              {c.to_review > 0 && <span className="font-semibold text-accent-ink">{c.to_review} para revisar</span>}
              {c.with_client > 0 && <span>{c.with_client} com o cliente</span>}
              <span className="text-ok-ink">{c.approved_month} aprovadas</span>
              {c.next_shoot && <span>Gravação {when(c.next_shoot)}</span>}
            </span>
          </li>
        ))}
        {d.clients.length === 0 && <li className="py-6 text-center text-muted">Nenhum cliente ligado a você no cadastro.</li>}
      </ul>
      <div className="-mx-2 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="text-[12px] text-muted"><tr className="[&>th]:px-2 [&>th]:py-2 [&>th]:font-medium">
            <th>Cliente</th><th className="text-right">Peças</th><th className="text-right">Sem briefing</th><th className="text-right">Para revisar</th><th className="text-right">Com o cliente</th><th className="text-right">Aprovadas</th><th>Próxima gravação</th>{social && <th />}
          </tr></thead>
          <tbody>
            {d.clients.map((c) => (
              <tr key={c.id} className="border-t border-line [&>td]:px-2 [&>td]:py-2.5">
                <td className="font-medium"><Link to={`/clientes/${c.id}`} className="text-ink">{c.name}</Link></td>
                <td className="text-right tabular-nums">{c.pieces_month}</td>
                <td className={cn('text-right tabular-nums', c.no_brief > 0 && 'font-semibold text-warn-ink')}>{c.no_brief}</td>
                <td className={cn('text-right tabular-nums', c.to_review > 0 && 'font-semibold text-accent-ink')}>{c.to_review}</td>
                <td className="text-right tabular-nums">{c.with_client}</td>
                <td className="text-right tabular-nums text-ok-ink">{c.approved_month}</td>
                <td className="text-muted">{c.next_shoot ? when(c.next_shoot) : '—'}</td>
                {social && <td className="text-right"><ArtRequestButton clientId={c.id} className="min-h-9 px-3 text-[12px]" /></td>}
              </tr>
            ))}
            {d.clients.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted">Nenhum cliente ligado a você no cadastro.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function VideosView({ d, now }: { d: Day; now: number }) {
  return (
    <Panel title="Meus vídeos" className="pf-rise">
      <ul className="flex flex-col">
        {d.videos.map((v) => {
          const target = v.my_part.includes('captação') && !v.raw_sent_at ? v.shoot_at : v.edit_due_at
          const c = countdown(target, now)
          return (
            <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line py-3 first:border-t-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised"><Clapperboard size={17} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <Link to={`/audiovisual/projeto/${v.id}`} className="block truncate font-semibold text-ink">{v.client} · {v.title}</Link>
                <span className="flex flex-wrap gap-x-3 text-[12px] text-muted">
                  <span>Minha parte: {v.my_part}</span>
                  {v.shoot_at && <span className="flex items-center gap-1"><CalendarClock size={12} aria-hidden="true" />{when(v.shoot_at)}</span>}
                  {v.location && <span className="flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{v.location}</span>}
                </span>
              </span>
              {c && <Chip tone={c.tone}>{c.text}</Chip>}
              {v.staff_token && <Link to={`/captacao/${v.staff_token}`} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-fill px-3 text-[12px] font-semibold text-on-fill no-underline"><Link2 size={13} aria-hidden="true" /> Link da captação</Link>}
            </li>
          )
        })}
        {d.videos.length === 0 && <li className="py-6 text-center text-muted">Nenhum vídeo com você agora.</li>}
      </ul>
    </Panel>
  )
}

function TasksView({ d, now }: { d: Day; now: number }) {
  return (
    <Panel title="Minhas tarefas de tráfego" className="pf-rise" action={<Link to="/trafego/tarefas" className="inline-flex min-h-10 items-center gap-1 text-[13px] font-medium">Quadro <ArrowRight size={14} aria-hidden="true" /></Link>}>
      <ul className="flex flex-col">
        {d.tasks.map((t) => {
          const c = countdown(t.due_date ? endOfDay(t.due_date) : null, now)
          return (
            <li key={t.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{t.title}</span><span className="text-[12px] text-muted">{t.client ?? 'Sem cliente'}</span></span>
              {c && <Chip tone={c.tone}>{c.text}</Chip>}
            </li>
          )
        })}
        {d.tasks.length === 0 && <li className="py-6 text-center text-muted">Nenhuma tarefa aberta com você.</li>}
      </ul>
    </Panel>
  )
}

/** Tela inicial de quem é da equipe: só o que é dela, cruzando clientes, peças, vídeos, tarefas e pontos. */
export function MyDay({ greeting }: { greeting: string }) {
  const { state } = useAuth()
  const viewAs = state.status === 'ready' ? state.user.viewAs : null
  const role = (state.status === 'ready' ? state.user.roles[0] : undefined) as AppRole | undefined
  const q = useQuery({
    queryKey: ['my-day', viewAs?.staffId ?? 'me'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_day', { _staff_id: viewAs?.staffId ?? null })
      if (error) throw error
      return data as unknown as Day
    },
  })
  const now = Date.now()
  if (!q.data) return q.isError
    ? <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
    : <p role="status" className="py-10 text-center text-muted">Carregando o seu dia</p>
  const d = q.data
  if (!d.linked) {
    return (
      <Panel title="Seu login ainda não está ligado a você na equipe">
        <p className="text-muted">Peça ao administrador para ligar o seu login ao seu cadastro em Equipe &gt; Membros. Depois disso, aqui aparecem os seus clientes, peças, vídeos e pontos.</p>
      </Panel>
    )
  }
  const first = (d.staff?.name ?? '').split(' ')[0]
  const isDesigner = role === 'designer'
  const isSocial = role === 'social_media'
  const isAv = role === 'videomaker' || role === 'editor'
  const isTraffic = role === 'traffic_manager'
  const toReview = d.clients.reduce((s, c) => s + c.to_review, 0)
  const noBrief = d.clients.reduce((s, c) => s + c.no_brief, 0)
  const late = d.pieces.filter((p) => p.deadline && endOfDay(p.deadline) < new Date(now).toISOString()).length

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{greeting}{first ? `, ${first}` : ''}</h1>
          <p className="text-muted">{d.staff?.job_title || (role ? ROLE_LABELS[role] : '')} · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })}</p>
        </div>
        <Points d={d} />
      </header>
      <MyPayables staffId={viewAs?.staffId ?? null} />
      {d.staff?.id && <MyGoals staffId={d.staff.id} />}

      <section aria-label="Resumo" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {isDesigner && <>
          <Kpi i={0} label="Para fazer" value={d.pieces.filter((p) => ['ready', 'changes_requested', 'in_production'].includes(p.status)).length} />
          <Kpi i={1} label="Atrasadas" value={late} warn={late > 0} />
          <Kpi i={2} label="Com o cliente" value={d.pieces.filter((p) => p.status === 'client_review').length} />
          <Kpi i={3} label="Clientes" value={d.clients.length} />
        </>}
        {isSocial && <>
          <Kpi i={0} label="Peças sem briefing" value={noBrief} warn={noBrief > 0} />
          <Kpi i={1} label="Artes para revisar" value={toReview} warn={toReview > 0} />
          <Kpi i={2} label="Com os clientes" value={d.clients.reduce((s, c) => s + c.with_client, 0)} />
          <Kpi i={3} label="Aprovadas no mês" value={d.clients.reduce((s, c) => s + c.approved_month, 0)} />
        </>}
        {isAv && <>
          <Kpi i={0} label="Vídeos comigo" value={d.videos.length} />
          <Kpi i={1} label="Gravações marcadas" value={d.videos.filter((v) => v.shoot_at && new Date(v.shoot_at).getTime() > now).length} />
          <Kpi i={2} label="Edições com prazo" value={d.videos.filter((v) => v.edit_due_at).length} />
          <Kpi i={3} label="Clientes" value={d.clients.length} />
        </>}
        {!isDesigner && !isSocial && !isAv && <>
          <Kpi i={0} label="Tarefas abertas" value={d.tasks.length} />
          <Kpi i={1} label="Clientes" value={d.clients.length} />
          <Kpi i={2} label="Entregas no mês" value={d.board?.deliveries ?? 0} />
          <Kpi i={3} label="Leads que trouxe" value={d.leads.length} />
        </>}
      </section>

      {isDesigner && <DesignerView d={d} now={now} />}
      {isSocial && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-accent-soft px-5 py-4">
          <p className="flex items-center gap-2 text-[14px]"><Palette size={17} aria-hidden="true" /> Precisa de uma arte rápida? O agente de design faz sob medida para qualquer cliente seu.</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/conteudo/datas" className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 font-medium text-ink hover:border-ink">Datas sazonais</Link>
            <ArtRequestButton />
          </div>
        </div>
      )}
      {isAv && <VideosView d={d} now={now} />}
      {(isTraffic || (!isDesigner && !isSocial && !isAv && d.tasks.length > 0)) && <TasksView d={d} now={now} />}
      <ClientsTable d={d} social={isSocial} />
      {!isDesigner && d.pieces.length > 0 && (
        <p className="flex items-center gap-2 text-[13px] text-muted"><CheckCircle2 size={14} aria-hidden="true" /> Também há {d.pieces.length} peças de design com você. <Link to="/conteudo/design">Abrir fila do design</Link></p>
      )}
      {d.leads.length > 0 && (
        <Panel title="Leads que eu trouxe" className="pf-rise" action={<Link to="/comercial/funil" className="inline-flex min-h-10 items-center gap-1 text-[13px] font-medium">Abrir <ArrowRight size={14} aria-hidden="true" /></Link>}>
          <ul className="flex flex-wrap gap-2">{d.leads.map((l) => <li key={l.id} className="flex items-center gap-1.5 rounded-full bg-raised px-3 py-1 text-[13px]"><Users size={12} aria-hidden="true" />{l.name}<span className="text-muted">· {STAGE_NAME[l.stage] ?? l.stage}</span></li>)}</ul>
        </Panel>
      )}
    </>
  )
}

/** Minhas metas do mês (OTE): as 2 metas, o realizado e quanto da variável já está garantido. Some sem OTE. */
function MyGoals({ staffId }: { staffId: string }) {
  const q = useQuery({ queryKey: ['member-ote', staffId], queryFn: () => fetchOte(staffId), retry: false, staleTime: 5 * 60_000 })
  const o = q.data
  if (!o || !o.variable_enabled || o.goals.length === 0) return null
  return (
    <section aria-label="Minhas metas do mês" className="pf-rise flex flex-col gap-2 rounded-2xl border border-line bg-surface px-4 py-3">
      <p className="text-[12px] font-medium text-muted">Minhas metas do mês · cada meta batida vale metade da variável</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {o.goals.slice(0, 2).map((g) => {
          const c = o.catalog?.find((x) => x.key === g.key)
          const hit = g.hit ?? (g.pct ?? 0) >= 100
          return (
            <li key={g.key} className="flex items-center justify-between gap-2 rounded-xl bg-raised px-3 py-2 text-[13px]">
              <span className="min-w-0"><b className="block truncate font-medium">{goalTitle(g.key, g.param)}</b>
                <span className="block truncate text-[12px] text-muted">{c ? progressText(c, { done: g.done ?? 0, total: g.total ?? 0, actual: g.actual }) : `${Math.round(g.actual ?? 0)} de ${Math.round(g.target)}`} · alvo {Math.round(g.target)}{c?.unit === 'pct' ? '%' : ''}</span></span>
              <Chip tone={hit ? 'green' : 'yellow'}>{hit ? 'Batida' : `${g.pct ?? 0}%`}</Chip>
            </li>
          )
        })}
      </ul>
      <Attainment goals={o.goals} earned={o.variable_earned} variable={o.variable_target} />
    </section>
  )
}

const STAGE_NAME: Record<string, string> = { novo: 'Novo', qualificacao: 'Qualificação', negociacao: 'Negociação', aguardando: 'Aguardando', pos_venda: 'Pós-venda' }

interface Payables { pending: number; paid_month: number; waiting?: number; waiting_items?: { id: string; title: string; client: string; amount: number; due_date: string }[]; items: { id: string; description: string; amount: number; due_date: string; status: string; paid_at: string | null }[] }
const money = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dayMonth = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7)

/** O que a pessoa tem para receber por serviços avulsos (só dela). Some quando não há nada. */
function MyPayables({ staffId }: { staffId: string | null }) {
  const q = useQuery({
    queryKey: ['my-payables', staffId ?? 'me'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)('my_payables', { _staff_id: staffId })
      if (error) throw error
      return data as Payables
    },
  })
  const p = q.data
  if (!p || (Number(p.pending) <= 0 && Number(p.paid_month) <= 0 && Number(p.waiting ?? 0) <= 0)) return null
  const open = p.items.filter((i) => i.status === 'pendente')
  return (
    <section aria-label="A receber" className="flex flex-col gap-2 rounded-3xl border border-ok/30 bg-ok-soft/40 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium text-muted">Você tem para receber</p>
        {Number(p.paid_month) > 0 && <p className="text-[12px] text-muted">Recebido no mês: {money(p.paid_month)}</p>}
      </div>
      <p className="text-[26px] font-semibold tabular-nums text-ok-ink">{money(p.pending)}</p>
      {Number(p.waiting ?? 0) > 0 && (
        <p className="text-[13px] text-muted" title={(p.waiting_items ?? []).map((w) => `${w.title} · ${w.client}`).join(' / ')}>
          + {money(p.waiting ?? 0)} aguardando o cliente pagar ({(p.waiting_items ?? []).length} {(p.waiting_items ?? []).length === 1 ? 'serviço' : 'serviços'}). Entra no seu próximo dia de pagamento depois que ele pagar.
        </p>
      )}
      {open.length > 0 && (
        <ul className="flex flex-col text-[13px]">
          {open.slice(0, 4).map((i) => (
            <li key={i.id} className="flex justify-between gap-3 border-t border-ok/20 py-1.5 first:border-t-0">
              <span className="min-w-0 truncate">{i.description.split(' · ').slice(1).join(' · ') || i.description}</span>
              <span className="shrink-0 tabular-nums text-muted">{money(i.amount)} · {dayMonth(i.due_date)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
