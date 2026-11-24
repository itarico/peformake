import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronRight, Play, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { groupTasks, ORIGIN_LABEL, ORIGIN_TONE, TASK_COLUMNS, type TaskColumn, type TaskOrigin } from '@/features/content/taskBoardRules'
import { useProduction, type OpArea } from '@/features/production/useProduction'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'

// Tabela team_tasks (24/11/2026): tarefas da equipe por área, ainda fora dos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export type TeamArea = 'audiovisual' | 'design' | 'trafego' | 'comercial' | 'social'
export interface TeamTask {
  id: string; area: TeamArea; client_id: string | null; title: string; description: string | null
  status: 'a_fazer' | 'fazendo' | 'feito'; source: 'manual' | 'pedido_cliente' | 'sistema'
  priority: boolean; due_date: string | null; ref_table: string | null; ref_id: string | null; created_at: string
}

const ORIGIN: Record<TeamTask['source'], TaskOrigin> = { manual: 'minha', pedido_cliente: 'cliente', sistema: 'sistema' }
/** Para onde o cartão leva quando a tarefa nasceu de um registro do sistema. */
const refLink = (t: TeamTask) => (t.ref_table === 'av_projects' && t.ref_id ? `/audiovisual/projeto/${t.ref_id}` : null)

function TaskForm({ area, task, clients, onClose }: { area: TeamArea; task: TeamTask | null; clients: { id: string; name: string }[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [client, setClient] = useState(clients.find((c) => c.id === task?.client_id)?.name ?? '')
  const [due, setDue] = useState(task?.due_date ?? '')
  const [priority, setPriority] = useState(task?.priority ?? false)
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc('team_task_save', { _id: task?.id ?? null, _area: area, _data: { title, description, client_id: clients.find((c) => c.name === client)?.id ?? '', due_date: due, priority } })
      if (error) throw error
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['team-tasks', area] }); onClose() },
  })
  return (
    <Dialog open onClose={onClose} title={task ? 'Tarefa' : 'Nova tarefa'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Voltar</Button><Button disabled={title.trim().length < 2 || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button></>}>
      <div className="flex flex-col gap-3">
        <Field label="O que fazer" autoFocus maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Marcar reunião com o cliente na quinta" />
        <div>
          <label className="mb-1 block text-[13px] font-semibold" htmlFor="tarefa-cliente">Cliente (opcional)</label>
          <SearchSelect id="tarefa-cliente" value={client} onChange={setClient} options={clients.map((c) => c.name)} allowNew={false} placeholder="Digite o nome do cliente" />
        </div>
        <div className="grid grid-cols-2 items-end gap-3">
          <Field label="Prazo" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <label className="flex min-h-11 items-center gap-2 font-medium"><input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} className="size-4" /> Prioridade</label>
        </div>
        <Field label="Detalhes (opcional)" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        {save.error && <p role="alert" className="text-[14px] font-medium text-warn-ink">Não foi possível salvar. Nada foi alterado.</p>}
      </div>
    </Dialog>
  )
}

/**
 * Quadro de tarefas de uma área (A fazer · Fazendo · Feito), no mesmo padrão do Social Media: cartão com origem, o que fazer,
 * cliente e prazo. Aqui entram as tarefas que o sistema cria sozinho (ex.: entrega do vídeo N dias depois da gravação),
 * os pedidos de cliente e o que a pessoa anotar.
 */
export function TeamTasksBoard({ area, clientArea }: { area: TeamArea; clientArea: OpArea }) {
  const queryClient = useQueryClient()
  const today = todayInBrazil()
  const { clients, clientName } = useProduction()
  const tasks = useQuery({
    queryKey: ['team-tasks', area],
    queryFn: async () => {
      const { data, error } = await db.from('team_tasks').select('id, area, client_id, title, description, status, source, priority, due_date, ref_table, ref_id, created_at').eq('area', area).order('created_at', { ascending: false }).limit(400)
      if (error) throw error
      return (data ?? []) as TeamTask[]
    },
  })
  const [filter, setFilter] = useState<TaskOrigin | 'todas'>('todas')
  const [chosenTab, setTab] = useState<TaskColumn | null>(null)
  const [editing, setEditing] = useState<TeamTask | 'new' | null>(null)
  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TeamTask['status'] }) => { const { error } = await db.rpc('team_task_save', { _id: id, _area: null, _data: { status } }); if (error) throw error },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['team-tasks', area] }),
  })
  const cols = useMemo(() => groupTasks((tasks.data ?? []).filter((t) => filter === 'todas' || ORIGIN[t.source] === filter), Date.now()), [tasks.data, filter])
  if (!tasks.data || !clients) return <LoadState isPending={tasks.isPending} isError={tasks.isError} refetch={() => void tasks.refetch()} />

  const tab = chosenTab ?? (TASK_COLUMNS.find((c) => cols[c.id].length > 0)?.id ?? 'a_fazer')
  const areaClients = clients.filter((c) => c.isActive && c.areas.includes(clientArea)).map((c) => ({ id: c.id, name: c.name }))
  const card = (t: TeamTask) => {
    const origin = ORIGIN[t.source]
    const late = !!t.due_date && t.due_date < today && t.status !== 'feito'
    const link = refLink(t)
    return (
      <li key={t.id} className={cn('flex min-w-0 flex-col gap-2 rounded-2xl border bg-surface p-3', t.priority || late ? 'border-warn/50' : 'border-line', t.status === 'feito' && 'opacity-60')}>
        <button type="button" onClick={() => setEditing(t)} className="flex min-w-0 cursor-pointer flex-col gap-1 text-left">
          <span className="flex w-full min-w-0 items-center justify-between gap-2 text-[12px] text-muted">
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', ORIGIN_TONE[origin])}>{ORIGIN_LABEL[origin]}</span>
            <span className={cn('min-w-0 truncate', late && 'font-semibold text-warn-ink')}>{t.client_id ? clientName(t.client_id) : 'Geral'}{t.due_date ? ` · até ${t.due_date.slice(8)}/${t.due_date.slice(5, 7)}` : ''}</span>
          </span>
          <span className="font-semibold leading-snug">{t.title}</span>
        </button>
        {(t.status !== 'feito' || link) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {t.status === 'a_fazer' && <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={move.isPending} onClick={() => move.mutate({ id: t.id, status: 'fazendo' })}><Play size={14} aria-hidden="true" /> Começar</Button>}
            {t.status === 'fazendo' && <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={move.isPending} onClick={() => move.mutate({ id: t.id, status: 'feito' })}><Check size={14} aria-hidden="true" /> Concluir</Button>}
            {link && <Link to={link} className="inline-flex min-h-10 items-center gap-1 px-2 text-[13px] font-medium text-accent-ink no-underline hover:underline">Abrir <ChevronRight size={14} aria-hidden="true" /></Link>}
          </div>
        )}
      </li>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Origem da tarefa" className="flex flex-wrap gap-1">
          {([['todas', 'Todas'], ['cliente', 'Do cliente'], ['sistema', 'Do sistema'], ['minha', 'Minhas']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
              className={cn('min-h-10 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', filter === id ? 'bg-fill text-on-fill' : 'border border-line text-muted hover:text-ink')}>{label}</button>
          ))}
        </div>
        <Button variant="secondary" onClick={() => setEditing('new')}><Plus size={16} aria-hidden="true" /> Tarefa</Button>
      </div>
      <div role="tablist" aria-label="Colunas das tarefas" className="grid grid-cols-3 rounded-full border border-line p-0.5 xl:hidden">
        {TASK_COLUMNS.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={tab === c.id} onClick={() => setTab(c.id)}
            className={cn('min-h-11 min-w-0 cursor-pointer truncate rounded-full px-1 text-[12.5px] font-medium', tab === c.id ? 'bg-fill text-on-fill' : 'text-muted')}>
            {c.label} <span className="tabular-nums opacity-70">{cols[c.id].length}</span>
          </button>
        ))}
      </div>
      <div data-conteudo className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {TASK_COLUMNS.map((c) => (
          <section key={c.id} aria-label={c.label} className={cn('flex min-w-0 flex-col gap-2 rounded-3xl bg-raised p-2.5', tab !== c.id && 'max-xl:hidden')}>
            <h2 className="flex items-center justify-between px-1.5 text-[13px] font-semibold max-xl:hidden">{c.label} <span className="font-normal text-muted">{cols[c.id].length}</span></h2>
            {cols[c.id].length === 0 && <p className="px-1.5 text-[12px] text-muted">{c.id === 'a_fazer' ? 'Nada para fazer. As entregas das gravações marcadas e os pedidos chegam aqui.' : c.empty}</p>}
            <ul className="flex flex-col gap-2">{cols[c.id].slice(0, 60).map(card)}</ul>
          </section>
        ))}
      </div>
      {editing && <TaskForm area={area} task={editing === 'new' ? null : editing} clients={areaClients} onClose={() => setEditing(null)} />}
    </>
  )
}
