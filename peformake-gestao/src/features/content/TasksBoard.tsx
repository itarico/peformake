import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { DESIGN_AREAS, inAreas, useProduction } from '@/features/production/useProduction'
import { TaskDialog, type Task } from '@/features/social/SocialPage'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { NewArtButton } from './NewArt'
import { groupTasks, ORIGIN_LABEL, ORIGIN_TONE, taskOrigin, TASK_COLUMNS, type TaskOrigin } from './taskBoardRules'

async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from('social_tasks').select('*').order('created_at', { ascending: false }).limit(400)
  if (error) throw error
  return (data ?? []) as unknown as Task[]
}

const FILTERS: { id: TaskOrigin | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todas' }, { id: 'cliente', label: 'Do cliente' }, { id: 'sistema', label: 'Do sistema' }, { id: 'minha', label: 'Minhas' },
]

/**
 * Tarefas do Social Media, separadas das artes (pedido do Italo, 24/11): o que o cliente pediu, o que o sistema sugeriu
 * (estratégia aprovada, agente) e o que a pessoa anotou. Todo cartão tem o mesmo desenho: origem, o que fazer, cliente e prazo.
 * Tarefa que é uma arte vira arte com 1 toque ("Virar arte") e sai daqui.
 */
export function TasksBoard() {
  const queryClient = useQueryClient()
  const today = todayInBrazil()
  const { clients, clientName, isLive, isPending, isError, refetch } = useProduction()
  const tasks = useQuery({ queryKey: ['social', 'tasks', 'kanban'], queryFn: listTasks })
  const [filter, setFilter] = useState<TaskOrigin | 'todas'>('todas')
  const [chosenTab, setTab] = useState<(typeof TASK_COLUMNS)[number]['id'] | null>(null)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Task['status'] }) => {
      const { error } = await supabase.rpc('social_task_save', { _id: id, _data: { status } })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['social', 'tasks'] }),
  })

  const cols = useMemo(() => {
    const live = (tasks.data ?? []).filter((t) => (!t.client_id || isLive(t.client_id, 'conteudo')) && (filter === 'todas' || taskOrigin(t.source) === filter))
    return groupTasks(live, Date.now())
  }, [tasks.data, filter, isLive])

  if (!tasks.data || !clients) return <LoadState isPending={tasks.isPending || isPending} isError={tasks.isError || isError} refetch={() => { refetch(); void tasks.refetch() }} />
  const tab = chosenTab ?? (TASK_COLUMNS.find((c) => cols[c.id].length > 0)?.id ?? 'a_fazer')

  const card = (t: Task) => {
    const origin = taskOrigin(t.source)
    const late = !!t.due_date && t.due_date < today && t.status !== 'feito'
    return (
      <li key={t.id} className={cn('flex min-w-0 flex-col gap-2 rounded-2xl border bg-surface p-3', t.priority || late ? 'border-warn/50' : 'border-line', t.status === 'feito' && 'opacity-60')}>
        <button type="button" onClick={() => setEditing(t)} className="flex min-w-0 cursor-pointer flex-col gap-1 text-left">
          <span className="flex w-full min-w-0 items-center justify-between gap-2 text-[12px] text-muted">
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', ORIGIN_TONE[origin])}>{ORIGIN_LABEL[origin]}</span>
            <span className={cn('min-w-0 truncate', late && 'font-semibold text-warn-ink')}>{t.client_id ? clientName(t.client_id) : 'Geral'}{t.due_date ? ` · até ${t.due_date.slice(8)}/${t.due_date.slice(5, 7)}` : ''}</span>
          </span>
          <span className="font-semibold leading-snug">{t.title}</span>
        </button>
        {t.status !== 'feito' && (
          <div className="flex flex-wrap gap-1.5">
            {t.status === 'a_fazer'
              ? <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={move.isPending} onClick={() => move.mutate({ id: t.id, status: 'fazendo' })}><Play size={14} aria-hidden="true" /> Começar</Button>
              : <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={move.isPending} onClick={() => move.mutate({ id: t.id, status: 'feito' })}><Check size={14} aria-hidden="true" /> Concluir</Button>}
            {t.ref_table !== 'content_items' && (
              <NewArtButton label="Virar arte" variant="secondary" className="min-h-10 px-3 text-[13px]"
                start={{ clientId: t.client_id ?? undefined, text: [t.title, t.description].filter(Boolean).join('. ') }}
                onSent={() => move.mutate({ id: t.id, status: 'feito' })} />
            )}
          </div>
        )}
      </li>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Origem da tarefa" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
              className={cn('min-h-10 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', filter === f.id ? 'bg-fill text-on-fill' : 'border border-line text-muted hover:text-ink')}>{f.label}</button>
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
            {cols[c.id].length === 0 && <p className="px-1.5 text-[12px] text-muted">{c.empty}</p>}
            <ul className="flex flex-col gap-2">{cols[c.id].slice(0, 60).map(card)}</ul>
          </section>
        ))}
      </div>
      {editing && <TaskDialog task={editing === 'new' ? null : editing} clients={clients.filter((c) => inAreas(c, DESIGN_AREAS))} onClose={() => setEditing(null)} />}
    </>
  )
}
