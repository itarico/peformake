import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ExternalLink, FileText, Lightbulb, Newspaper, Plus, Sparkles, X } from 'lucide-react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { useMonthParam } from '@/features/content/useMonthParam'
import { DESIGN_AREAS, inAreas, useProduction } from '@/features/production/useProduction'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel } from '@/features/traffic/planRules'
import { COLUMNS, NETWORKS, NETWORK_LABEL, SOURCE_LABEL, SOURCE_TONE, briefingProgress, type Network, type TaskSource, type TaskStatus } from './socialRules'

interface Task { id: string; client_id: string | null; title: string; description: string | null; status: TaskStatus; source: TaskSource; network: Network; priority: boolean; due_date: string | null; ref_table: string | null; ref_id: string | null; created_at: string }
interface News { id: string; network: Network; title: string; summary: string; what_to_do: string | null; impact: 'alto' | 'medio' | 'baixo'; source_url: string | null; published_at: string | null; status: string; created_at: string }
interface Suggestion { id: string; client_id: string | null; network: Network; title: string; body: string; reason: string | null; status: string; created_at: string }
interface Doc { id: string; client_id: string; kind: 'estrategia' | 'relatorio'; network: Network; month: string; status: string; summary: string | null; body: string | null; requested_at: string }

const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const TABS = [
  { to: '/social/painel', label: 'Painel' },
  { to: '/social/quadro', label: 'Quadro' },
  { to: '/social/briefings', label: 'Briefings do mês' },
  { to: '/social/agente', label: 'Agente e novidades' },
  { to: '/social/estrategia', label: 'Estratégia e relatórios' },
  { to: '/social/contas', label: 'Contas das redes' },
]

function useSocial<T>(key: string, table: string, order = 'created_at') {
  return useQuery({
    queryKey: ['social', key],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from(table as 'social_tasks').select('*').order(order, { ascending: false }).limit(500)
      if (error) throw error
      return (data ?? []) as unknown as T[]
    },
  })
}

/** Social Media: quadro automático, briefings do mês, agente com novidades das redes, estratégia e relatórios orgânicos. */
export function SocialPage() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Social Media</h1>
          <p className="text-[13px] text-muted">Gestão das redes dos clientes. Começa pelo Instagram; TikTok, YouTube e Google Meu Negócio entram na mesma estrutura.</p>
        </div>
        <MonthSwitcher />
      </div>
      <nav aria-label="Social Media" className="-mx-4 flex gap-0.5 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] md:mx-0 md:px-0">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => cn('-mb-px flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-3.5 text-[14px] font-medium no-underline', isActive ? 'border-ink font-semibold text-ink' : 'border-transparent text-muted hover:text-ink')}>{t.label}</NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Navigate to="/social/painel" replace />} />
        <Route path="painel" element={<Overview />} />
        <Route path="quadro" element={<Board />} />
        <Route path="briefings" element={<Briefings />} />
        <Route path="agente" element={<Agent />} />
        <Route path="estrategia" element={<Docs />} />
        <Route path="contas" element={<Accounts />} />
        <Route path="*" element={<Navigate to="/social/painel" replace />} />
      </Routes>
    </>
  )
}

/** Carregando, ou erro com "Tentar de novo" (nunca fica carregando para sempre). */
function NotReady({ isError, retry }: { isError: boolean; retry: () => void }) {
  return <LoadState isPending={!isError} isError={isError} refetch={retry} />
}

// ===== Painel =====
function Overview() {
  const tasks = useSocial<Task>('tasks', 'social_tasks')
  const news = useSocial<News>('news', 'social_news')
  const sugg = useSocial<Suggestion>('suggestions', 'social_suggestions')
  const { clientName } = useProduction()
  if (!tasks.data) return <NotReady isError={tasks.isError} retry={() => void tasks.refetch()} />
  const open = tasks.data.filter((t) => t.status !== 'feito')
  const fresh = (news.data ?? []).filter((n) => n.status === 'nova')
  const pending = (sugg.data ?? []).filter((s) => s.status === 'nova')
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Resumo" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: 'Tarefas abertas', value: open.length, to: '/social/quadro' },
          { label: 'Pedidos de clientes', value: open.filter((t) => t.source === 'pedido_cliente').length, to: '/social/quadro', warn: true },
          { label: 'Novidades das redes', value: fresh.length, to: '/social/agente' },
          { label: 'Sugestões do agente', value: pending.length, to: '/social/agente' },
        ].map((t) => (
          <Link key={t.label} to={`../${t.to}`} className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink no-underline hover:border-ink">
            <p className="text-[12px] font-medium text-muted">{t.label}</p>
            <p className={cn('text-[26px] font-semibold tabular-nums', t.warn && t.value > 0 && 'text-warn-ink')}>{t.value}</p>
          </Link>
        ))}
      </section>
      <div className="grid gap-3 lg:grid-cols-2">
        <section aria-labelledby="urgente" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
          <h2 id="urgente" className="font-semibold">Para fazer agora</h2>
          {open.slice(0, 6).map((t) => (
            <Link key={t.id} to="../quadro" className="flex items-center justify-between gap-2 rounded-2xl bg-raised px-3 py-2 text-ink no-underline">
              <span className="min-w-0 truncate text-[14px]">{t.priority && <b className="text-warn-ink">! </b>}{t.title}{t.client_id ? <span className="text-muted"> · {clientName(t.client_id)}</span> : null}</span>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', SOURCE_TONE[t.source])}>{SOURCE_LABEL[t.source]}</span>
            </Link>
          ))}
          {open.length === 0 && <p className="text-[14px] text-ok-ink">Nada pendente. Bom trabalho.</p>}
        </section>
        <section aria-labelledby="novas" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
          <h2 id="novas" className="flex items-center gap-2 font-semibold"><Newspaper size={16} aria-hidden="true" /> Últimas novidades das redes</h2>
          {fresh.slice(0, 4).map((n) => (
            <Link key={n.id} to="../agente" className="rounded-2xl bg-raised px-3 py-2 text-ink no-underline">
              <p className="text-[14px] font-semibold">{n.impact === 'alto' && <span className="mr-1 rounded-full bg-warn-soft px-1.5 text-[11px] text-warn-ink">Importante</span>}{n.title}</p>
              <p className="line-clamp-2 text-[13px] text-muted">{n.summary}</p>
            </Link>
          ))}
          {fresh.length === 0 && <p className="text-[13px] text-muted">O agente pesquisa as mudanças do Instagram e das outras redes toda semana e traz aqui.</p>}
        </section>
      </div>
    </div>
  )
}

// ===== Quadro =====
export function Board() {
  const queryClient = useQueryClient()
  const tasks = useSocial<Task>('tasks', 'social_tasks')
  const { clients, clientName } = useProduction()
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [client, setClient] = useState('')
  const move = useMutation({
    mutationFn: async (v: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.rpc('social_task_save', { _id: v.id, _data: { status: v.status } })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['social', 'tasks'] }),
  })
  if (!tasks.data) return <NotReady isError={tasks.isError} retry={() => void tasks.refetch()} />
  const list = tasks.data.filter((t) => !client || t.client_id === client)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Cliente
          <select value={client} onChange={(e) => setClient(e.target.value)} className={cn(field, 'mt-0 w-auto min-w-[220px]')}>
            <option value="">Todos</option>
            {(clients ?? []).filter((c) => inAreas(c, DESIGN_AREAS)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <Button onClick={() => setEditing('new')}><Plus size={15} aria-hidden="true" /> Tarefa</Button>
      </div>
      <p className="text-[12px] text-muted">Entram sozinhos: pedidos dos clientes no WhatsApp, itens de social media aprovados na estratégia, sugestões aceitas do agente e novidades das redes.</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = list.filter((t) => t.status === col.id).sort((a, b) => Number(b.priority) - Number(a.priority))
          return (
            <section key={col.id} aria-label={col.label} className="flex min-h-40 flex-col gap-2 rounded-3xl bg-raised/60 p-3">
              <h2 className="px-1 text-[13px] font-semibold text-muted">{col.label} · {items.length}</h2>
              {items.length === 0 && <p className="px-1 text-[12px] text-muted">{col.id === 'a_fazer' ? 'Nada novo. Pedidos e sugestões aceitas aparecem aqui.' : 'Vazio.'}</p>}
              {items.map((t) => (
                <article key={t.id} className={cn('flex flex-col gap-2 rounded-2xl border bg-surface p-3', t.priority ? 'border-warn/50' : 'border-line')}>
                  <button type="button" onClick={() => setEditing(t)} className="cursor-pointer text-left">
                    <p className="text-[14px] font-semibold leading-snug">{t.title}</p>
                    <p className="text-[12px] text-muted">{t.client_id ? clientName(t.client_id) : 'Geral'} · {NETWORK_LABEL[t.network]}{t.due_date ? ` · até ${t.due_date.slice(8)}/${t.due_date.slice(5, 7)}` : ''}</p>
                  </button>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', SOURCE_TONE[t.source])}>{SOURCE_LABEL[t.source]}</span>
                    <select aria-label={`Mover ${t.title}`} value={t.status} disabled={move.isPending} onChange={(e) => move.mutate({ id: t.id, status: e.target.value as TaskStatus })} className="min-h-8 rounded-lg border border-line bg-surface px-1.5 text-[12px]">
                      {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                </article>
              ))}
            </section>
          )
        })}
      </div>
      {editing && <TaskDialog task={editing === 'new' ? null : editing} clients={(clients ?? []).filter((c) => inAreas(c, DESIGN_AREAS))} onClose={() => setEditing(null)} />}
    </div>
  )
}

function TaskDialog({ task, clients, onClose }: { task: Task | null; clients: { id: string; name: string }[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [d, setD] = useState({ title: task?.title ?? '', description: task?.description ?? '', client_id: task?.client_id ?? '', network: task?.network ?? 'instagram', due_date: task?.due_date ?? '', priority: task?.priority ?? false })
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('social_task_save', { _id: task?.id ?? null, _data: d })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['social', 'tasks'] }); onClose() },
  })
  return (
    <Dialog open onClose={onClose} title={task ? 'Tarefa' : 'Nova tarefa'} size="sm" footer={<Button disabled={d.title.trim().length < 2 || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>}>
      <div className="flex flex-col gap-3">
        {task && <p className={cn('self-start rounded-full px-2.5 py-0.5 text-[12px] font-semibold', SOURCE_TONE[task.source])}>{SOURCE_LABEL[task.source]}</p>}
        <label className="flex flex-col text-[13px] font-semibold">O que fazer<input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} maxLength={200} className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">Detalhes<textarea rows={5} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} maxLength={4000} className={cn(field, 'py-2')} /></label>
        {!task && (
          <label className="flex flex-col text-[13px] font-semibold">Cliente
            <select value={d.client_id} onChange={(e) => setD({ ...d, client_id: e.target.value })} className={field}><option value="">Geral</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-[13px] font-semibold">Rede
            <select value={d.network} disabled={!!task} onChange={(e) => setD({ ...d, network: e.target.value as Network })} className={field}>
              {NETWORKS.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}<option value="geral">Geral</option>
            </select>
          </label>
          <label className="flex flex-col text-[13px] font-semibold">Prazo<input type="date" value={d.due_date} onChange={(e) => setD({ ...d, due_date: e.target.value })} className={field} /></label>
        </div>
        <label className="flex min-h-11 items-center gap-2 font-medium"><input type="checkbox" checked={d.priority} onChange={(e) => setD({ ...d, priority: e.target.checked })} className="size-4" /> Prioridade</label>
        {task?.ref_table === 'content_items' && task.ref_id && <Link to={`/conteudo/peca/${task.ref_id}`} className="text-[13px] font-medium underline">Abrir a pauta no Design</Link>}
        {save.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</p>}
      </div>
    </Dialog>
  )
}

// ===== Briefings do mês =====
function Briefings() {
  const [month] = useMonthParam()
  const { clients } = useProduction()
  const data = useQuery({
    queryKey: ['social-briefings', month],
    queryFn: async () => {
      const plans = await supabase.from('content_plans').select('id, client_id, notes, planned_at').eq('month', month)
      if (plans.error) throw plans.error
      const ids = (plans.data ?? []).map((p) => p.id)
      const items = ids.length ? await supabase.from('content_items').select('plan_id, status, briefing').in('plan_id', ids).limit(5000) : { data: [], error: null }
      if (items.error) throw items.error
      return { plans: plans.data ?? [], items: (items.data ?? []) as { plan_id: string; status: string; briefing: string | null }[] }
    },
  })
  const rows = useMemo(() => {
    const list = (clients ?? []).filter((c) => inAreas(c, DESIGN_AREAS))
    return list.map((c) => {
      const plan = data.data?.plans.find((p) => p.client_id === c.id)
      const items = plan ? data.data!.items.filter((i) => i.plan_id === plan.id) : []
      const pr = briefingProgress({ hasNotes: !!plan?.notes?.trim(), planned: !!plan?.planned_at, items: items.length, briefed: items.filter((i) => (i.briefing ?? '').trim().length > 10).length })
      return { client: c, items: items.length, ...pr }
    }).sort((a, b) => a.pct - b.pct)
  }, [clients, data.data])
  if (!data.data || !clients) return <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} />
  const ready = rows.filter((r) => r.pct === 100).length
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Briefings de {monthLabel(month).toLowerCase()}</h2>
          <span className="text-[13px] tabular-nums"><b>{ready}</b> de {rows.length} clientes prontos para o design</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-ok transition-[width] duration-700" style={{ width: `${rows.length ? (ready / rows.length) * 100 : 0}%` }} /></div>
        <p className="text-[12px] text-muted">Quatro passos por cliente: pauta do mês, peças criadas, briefing de cada peça e planejamento fechado. Itens de social media aprovados na estratégia já entram como peça com briefing.</p>
      </div>
      <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
        {rows.map((r) => (
          <li key={r.client.id} className="flex flex-col gap-2 border-b border-line px-5 py-3 last:border-b-0 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{r.client.name}</p>
              <p className={cn('text-[13px]', r.pct === 100 ? 'text-ok-ink' : 'text-muted')}>{r.label}{r.items ? ` · ${r.items} peças` : ''}</p>
            </div>
            <div className="flex items-center gap-1" aria-label={`Passo ${r.step} de 4`}>
              {[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-1.5 w-8 rounded-full', i < r.step ? 'bg-ok' : 'bg-line-strong')} />)}
            </div>
            <Link to={`/conteudo/planejamento?cliente=${r.client.id}&mes=${month}`} className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-[13px] font-semibold text-ink no-underline hover:border-ink">{r.pct === 100 ? 'Ver' : 'Continuar'}</Link>
          </li>
        ))}
        {rows.length === 0 && <li className="p-8 text-center text-muted">Nenhum cliente com Design ou Social media ativo.</li>}
      </ul>
    </div>
  )
}

// ===== Agente e novidades =====
export function Agent() {
  const queryClient = useQueryClient()
  const news = useSocial<News>('news', 'social_news')
  const sugg = useSocial<Suggestion>('suggestions', 'social_suggestions')
  const { clientName } = useProduction()
  const setNews = useMutation({
    mutationFn: async (v: { id: string; status: string }) => {
      const { error } = await supabase.rpc('social_news_set', { _id: v.id, _status: v.status })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['social'] }) },
  })
  const decide = useMutation({
    mutationFn: async (v: { id: string; accept: boolean }) => {
      const { error } = await supabase.rpc('social_suggestion_set', { _id: v.id, _accept: v.accept })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['social'] }) },
  })
  if (!news.data) return <NotReady isError={news.isError} retry={() => void news.refetch()} />
  const openSugg = (sugg.data ?? []).filter((s) => s.status === 'nova')
  const visibleNews = news.data.filter((n) => n.status === 'nova' || n.status === 'lida')
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section aria-labelledby="sug" className="flex flex-col gap-3">
        <h2 id="sug" className="flex items-center gap-2 font-semibold"><Lightbulb size={17} aria-hidden="true" /> Sugestões para os clientes · {openSugg.length}</h2>
        {openSugg.map((s) => (
          <article key={s.id} className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4">
            <p className="text-[12px] text-muted">{s.client_id ? clientName(s.client_id) : 'Geral'} · {NETWORK_LABEL[s.network]}</p>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="whitespace-pre-wrap text-[14px]">{s.body}</p>
            {s.reason && <p className="text-[13px] text-muted">Por quê: {s.reason}</p>}
            <div className="flex gap-2">
              <Button disabled={decide.isPending} onClick={() => decide.mutate({ id: s.id, accept: true })}><Check size={15} aria-hidden="true" /> Virar tarefa</Button>
              <Button variant="secondary" disabled={decide.isPending} onClick={() => decide.mutate({ id: s.id, accept: false })}><X size={15} aria-hidden="true" /> Agora não</Button>
            </div>
          </article>
        ))}
        {openSugg.length === 0 && <p className="rounded-3xl border border-dashed border-line-strong p-5 text-[14px] text-muted">Quando as contas dos clientes estiverem ligadas, o agente lê os números do Instagram e sugere o que fazer em cada perfil.</p>}
      </section>
      <section aria-labelledby="nov" className="flex flex-col gap-3">
        <h2 id="nov" className="flex items-center gap-2 font-semibold"><Sparkles size={17} aria-hidden="true" /> Novidades das redes</h2>
        {visibleNews.map((n) => (
          <article key={n.id} className={cn('flex flex-col gap-2 rounded-3xl border bg-surface p-4', n.status === 'nova' ? 'border-ink' : 'border-line')}>
            <p className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
              {NETWORK_LABEL[n.network]}{n.published_at ? ` · ${new Date(`${n.published_at}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}
              {n.impact === 'alto' && <span className="rounded-full bg-warn-soft px-2 py-0.5 font-semibold text-warn-ink">Impacto alto</span>}
            </p>
            <h3 className="font-semibold">{n.title}</h3>
            <p className="text-[14px]">{n.summary}</p>
            {n.what_to_do && <p className="rounded-2xl bg-raised px-3 py-2 text-[13px]"><b>O que fazer:</b> {n.what_to_do}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" disabled={setNews.isPending} onClick={() => setNews.mutate({ id: n.id, status: 'virou_tarefa' })}>Virar tarefa</Button>
              {n.status === 'nova' && <Button variant="link" onClick={() => setNews.mutate({ id: n.id, status: 'lida' })}>Marcar como lida</Button>}
              {n.source_url && <a href={n.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] underline"><ExternalLink size={13} aria-hidden="true" /> Fonte</a>}
            </div>
          </article>
        ))}
        {visibleNews.length === 0 && <p className="rounded-3xl border border-dashed border-line-strong p-5 text-[14px] text-muted">O agente pesquisa toda semana o que mudou no Instagram (formatos, algoritmo, regras) e traz aqui com o que fazer.</p>}
      </section>
    </div>
  )
}

// ===== Estratégia e relatórios orgânicos =====
const DOC_STATUS: Record<string, [string, string]> = {
  pedido: ['Pedido ao agente', 'bg-raised text-muted'], gerando: ['Agente gerando', 'bg-accent-soft text-accent-ink'], revisar: ['Para revisar', 'bg-warn-soft text-warn-ink'],
  aprovado: ['Aprovado', 'bg-ok-soft text-ok-ink'], enviado: ['Enviado ao cliente', 'bg-ok-soft text-ok-ink'], erro: ['Erro', 'bg-warn-soft text-warn-ink'],
}
export function Docs() {
  const queryClient = useQueryClient()
  const [month] = useMonthParam()
  const { clients } = useProduction()
  const docs = useSocial<Doc>('docs', 'social_docs', 'requested_at')
  const [open, setOpen] = useState<Doc | null>(null)
  const request = useMutation({
    mutationFn: async (v: { client: string; kind: 'estrategia' | 'relatorio' }) => {
      const { error } = await supabase.rpc('social_doc_request', { _client: v.client, _kind: v.kind, _month: month, _network: 'instagram' })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['social', 'docs'] }),
  })
  if (!docs.data || !clients) return <NotReady isError={docs.isError} retry={() => void docs.refetch()} />
  const list = clients.filter((c) => inAreas(c, DESIGN_AREAS))
  const find = (client: string, kind: string) => docs.data!.find((d) => d.client_id === client && d.kind === kind && d.month === month)
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted">Estratégia de conteúdo e comunicação do mês (o que postar, como falar, frequência) e relatório do Instagram. O agente gera, você revisa e aprova. Design e vídeo continuam na Operação.</p>
      <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
        {list.map((c) => (
          <li key={c.id} className="flex flex-col gap-2 border-b border-line px-5 py-3 last:border-b-0 md:flex-row md:items-center">
            <p className="min-w-0 flex-1 font-semibold">{c.name}</p>
            {(['estrategia', 'relatorio'] as const).map((kind) => {
              const d = find(c.id, kind)
              const [label, tone] = d ? DOC_STATUS[d.status] ?? [d.status, 'bg-raised'] : ['', '']
              return d ? (
                <button key={kind} type="button" onClick={() => setOpen(d)} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-[13px] hover:border-ink">
                  <FileText size={14} aria-hidden="true" /> {kind === 'estrategia' ? 'Estratégia' : 'Relatório'} <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', tone)}>{label}</span>
                </button>
              ) : (
                <Button key={kind} variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={request.isPending} onClick={() => request.mutate({ client: c.id, kind })}>
                  Pedir {kind === 'estrategia' ? 'estratégia' : 'relatório'}
                </Button>
              )
            })}
          </li>
        ))}
        {list.length === 0 && <li className="p-8 text-center text-muted">Nenhum cliente com Social media ativo.</li>}
      </ul>
      {open && <DocDialog doc={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function DocDialog({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [body, setBody] = useState(doc.body ?? '')
  const review = useMutation({
    mutationFn: async (approve: boolean) => {
      const { error } = await supabase.rpc('social_doc_review', { _id: doc.id, _approve: approve, _body: body })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['social', 'docs'] }); onClose() },
  })
  return (
    <Dialog open onClose={onClose} title={`${doc.kind === 'estrategia' ? 'Estratégia' : 'Relatório'} do Instagram · ${monthLabel(doc.month)}`} size="lg"
      footer={doc.body ? <div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={review.isPending} onClick={() => review.mutate(false)}>Salvar sem aprovar</Button><Button disabled={review.isPending} onClick={() => review.mutate(true)}><Check size={15} aria-hidden="true" /> Aprovar</Button></div> : undefined}>
      {doc.body ? (
        <div className="flex flex-col gap-3">
          {doc.summary && <p className="rounded-2xl bg-raised px-4 py-3 text-[14px]">{doc.summary}</p>}
          <textarea rows={18} value={body} onChange={(e) => setBody(e.target.value)} className="w-full rounded-2xl border border-line-strong bg-surface p-3 text-[14px] leading-relaxed" />
        </div>
      ) : <p className="text-muted">O agente ainda não terminou. Quando terminar, o texto aparece aqui para revisar.</p>}
    </Dialog>
  )
}

// ===== Contas das redes =====
export function Accounts() {
  const queryClient = useQueryClient()
  const { clients } = useProduction()
  const accounts = useSocial<{ id: string; client_id: string; network: Network; handle: string; status: string }>('accounts', 'social_accounts')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const save = useMutation({
    mutationFn: async (v: { client: string; network: Network; handle: string; remove?: boolean }) => {
      const { error } = await supabase.rpc('social_account_save', { _client: v.client, _network: v.network, _handle: v.handle, _remove: v.remove ?? false })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['social', 'accounts'] }),
  })
  if (!accounts.data || !clients) return <NotReady isError={accounts.isError} retry={() => void accounts.refetch()} />
  const list = clients.filter((c) => inAreas(c, DESIGN_AREAS))
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted">Cadastre o @ de cada cliente. Quando a conta for ligada pela API oficial do Instagram, os números entram sozinhos para o agente analisar. As outras redes já têm lugar aqui e ficam prontas para ligar depois.</p>
      <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
        {list.map((c) => (
          <li key={c.id} className="flex flex-col gap-2 border-b border-line px-5 py-3 last:border-b-0">
            <p className="font-semibold">{c.name}</p>
            <div className="flex flex-wrap gap-2">
              {NETWORKS.map((n) => {
                const acc = accounts.data!.find((a) => a.client_id === c.id && a.network === n.id)
                const key = `${c.id}:${n.id}`
                if (acc) return (
                  <span key={n.id} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-3 text-[13px]">
                    <b>{n.label}</b> @{acc.handle} <span className={cn('text-[11px] font-semibold', acc.status === 'conectada' ? 'text-ok-ink' : 'text-muted')}>{acc.status === 'conectada' ? 'ligada' : 'cadastrada'}</span>
                    <button type="button" aria-label={`Tirar ${n.label}`} onClick={() => save.mutate({ client: c.id, network: n.id, handle: acc.handle, remove: true })} className="cursor-pointer text-muted hover:text-ink"><X size={14} aria-hidden="true" /></button>
                  </span>
                )
                return (
                  <form key={n.id} onSubmit={(e) => { e.preventDefault(); if ((drafts[key] ?? '').trim().length > 1) save.mutate({ client: c.id, network: n.id, handle: drafts[key]! }) }} className="inline-flex items-center gap-1">
                    <input aria-label={`@ do ${n.label} de ${c.name}`} placeholder={`@ ${n.label}${n.ready ? '' : ' (em breve)'}`} value={drafts[key] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                      className="min-h-10 w-44 rounded-full border border-line-strong bg-surface px-3 text-[13px]" />
                  </form>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
