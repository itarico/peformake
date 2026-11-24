import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, Plus } from 'lucide-react'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { Button } from '@/components/ui/Button'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { DESIGN_AREAS, inAreas, useProduction } from '@/features/production/useProduction'
import { TaskDialog, type Task } from '@/features/social/SocialPage'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
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
 * Tarefas do Social Media, gerais e separadas das artes (pedido do Italo, 24/11): o que o cliente pediu (pedido de arte
 * pelo WhatsApp também chega aqui), o que o sistema sugeriu e o que a pessoa anotou. Em cada coluna, agrupadas por
 * cliente com a logo; tocar abre os títulos e tocar na tarefa abre o pop-up para aceitar, recusar ou virar arte.
 */
export function TasksBoard({ clientId }: { clientId?: string } = {}) {
  const today = todayInBrazil()
  const { clients, clientName, clientLogo, isLive, isPending, isError, refetch } = useProduction()
  const tasks = useQuery({ queryKey: ['social', 'tasks', 'kanban'], queryFn: listTasks })
  const [filter, setFilter] = useState<TaskOrigin | 'todas'>('todas')
  // Dentro do cliente o filtro é fixo; na aba geral dá para escolher o cliente.
  const [pickedClient, setPickedClient] = useState('')
  const [chosenTab, setTab] = useState<(typeof TASK_COLUMNS)[number]['id'] | null>(null)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())

  const cols = useMemo(() => {
    const only = clientId ?? clients?.find((c) => c.name === pickedClient)?.id ?? null
    const live = (tasks.data ?? []).filter((t) => (!t.client_id || isLive(t.client_id, 'conteudo')) && (filter === 'todas' || taskOrigin(t.source) === filter)
      && (!only || t.client_id === only))
    return groupTasks(live, Date.now())
  }, [tasks.data, filter, isLive, clientId, clients, pickedClient])

  if (!tasks.data || !clients) return <LoadState isPending={tasks.isPending || isPending} isError={tasks.isError || isError} refetch={() => { refetch(); void tasks.refetch() }} />
  const tab = chosenTab ?? (TASK_COLUMNS.find((c) => cols[c.id].length > 0)?.id ?? 'a_fazer')

  const card = (t: Task) => {
    const origin = taskOrigin(t.source)
    const late = !!t.due_date && t.due_date < today && t.status !== 'feito'
    return (
      <li key={t.id}>
        <button type="button" onClick={() => setEditing(t)}
          className={cn('flex w-full min-w-0 cursor-pointer flex-col gap-1 rounded-xl border bg-surface p-2.5 text-left hover:border-line-strong', t.status === 'feito' && 'opacity-60', late ? 'border-warn/50' : 'border-line')}>
          <span className="flex w-full min-w-0 items-center justify-between gap-2 text-[11.5px] text-muted">
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', t.refused_at ? 'bg-raised text-muted' : ORIGIN_TONE[origin])}>{t.refused_at ? 'Recusada' : t.art_id ? 'Virou arte' : ORIGIN_LABEL[origin]}</span>
            {t.due_date && <span className={cn('shrink-0 tabular-nums', late && 'font-semibold text-warn-ink')}>até {t.due_date.slice(8)}/{t.due_date.slice(5, 7)}</span>}
          </span>
          <span className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{t.priority && <AlertTriangle size={13} className="mr-1 inline text-warn-ink" aria-label="Prioridade" />}{t.title}</span>
        </button>
      </li>
    )
  }

  // Agrupado por cliente dentro da coluna (pedido do Italo, 24/11): a logo e quantas; tocar abre os títulos.
  const byClient = (list: Task[]) => {
    const m = new Map<string, Task[]>()
    for (const t of list) m.set(t.client_id ?? '', [...(m.get(t.client_id ?? '') ?? []), t])
    return [...m.entries()].sort((a, b) => Number(b[1].some((x) => x.priority)) - Number(a[1].some((x) => x.priority)) || b[1].length - a[1].length)
  }
  const toggle = (key: string) => setOpenRows((cur) => { const n = new Set(cur); if (n.has(key)) n.delete(key); else n.add(key); return n })

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Origem da tarefa" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
              className={cn('min-h-10 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', filter === f.id ? 'bg-fill text-on-fill' : 'border border-line text-muted hover:text-ink')}>{f.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!clientId && (
            <div className="w-56 max-w-full">
              <SearchSelect id="tarefas-cliente" value={pickedClient} onChange={setPickedClient} allowNew={false} placeholder="Todos os clientes"
                options={clients.filter((c) => c.isActive && inAreas(c, DESIGN_AREAS)).map((c) => c.name)} />
            </div>
          )}
          <Button variant="secondary" onClick={() => setEditing('new')}><Plus size={16} aria-hidden="true" /> Tarefa</Button>
        </div>
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
            <ul className="flex flex-col gap-1.5">
              {byClient(cols[c.id].slice(0, 120)).map(([cid, list]) => {
                const key = `${c.id}:${cid}`
                const isOpen = openRows.has(key)
                const late = list.some((t) => !!t.due_date && t.due_date < today && t.status !== 'feito')
                const asked = list.filter((t) => taskOrigin(t.source) === 'cliente' && !t.refused_at).length
                return (
                  <li key={key} className="rounded-2xl bg-surface">
                    <button type="button" aria-expanded={isOpen} onClick={() => toggle(key)} className="flex min-h-12 w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left">
                      {cid ? <ClientAvatar name={clientName(cid)} url={clientLogo(cid)} size="row" /> : <span className="flex size-8 items-center justify-center rounded-full bg-raised text-[11px] font-semibold text-muted">Geral</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">{cid ? clientName(cid) : 'Geral'}</span>
                        <span className="block text-[12px] text-muted">{list.length} {list.length === 1 ? 'tarefa' : 'tarefas'}{asked ? ` · ${asked} do cliente` : ''}</span>
                      </span>
                      {late && <AlertTriangle size={15} className="shrink-0 text-warn-ink" aria-label="Atrasada" />}
                      <ChevronDown size={16} aria-hidden="true" className={cn('shrink-0 text-muted transition-transform', isOpen && 'rotate-180')} />
                    </button>
                    {isOpen && <ul className="flex flex-col gap-1.5 px-2 pb-2">{list.map(card)}</ul>}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      {editing && <TaskDialog task={editing === 'new' ? (clientId ? ({ client_id: clientId } as unknown as Task) : null) : editing} clients={clients.filter((c) => inAreas(c, DESIGN_AREAS))} onClose={() => setEditing(null)} />}
    </>
  )
}
