import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { actionChange, canUndo, clientMessageForAction, effectVerdict, type EffectTone } from './taskEffectRules'
import { ClientPhoneTag, ClientReply } from '@/components/ClientReply'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, Check, CheckCheck, ChevronDown, ChevronsDownUp, ChevronsUpDown, Loader2, Plus, Trash2, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { listStaff } from '@/features/clients/clientsApi'
import { useClientPermissions } from '@/features/clients/useClients'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import { LoadState } from './LoadState'
import { todayInBrazil } from './metricsRules'
import {
  canMove,
  CATEGORY_LABEL,
  DONE_VISIBLE_DAYS,
  COLUMNS,
  dueLabel,
  EMPTY_TASK_FILTERS,
  filterTasks,
  isOverdue,
  PRIORITY_LABEL,
  SOURCE_LABEL,
  ACTION_STATUS_LABEL,
  sortColumn,
  validateTaskTitle,
  type Task,
  type TaskCategory,
  type TaskFilters,
  type TaskPriority,
  type TaskStatus,
} from './taskRules'
import { deleteTask, listTasks, moveTask, saveTask, taskErrorMessage, type TaskDraft, undoTask } from './tasksApi'
import { useTrafficData } from './useTrafficData'
import { GuideButton } from '@/features/clients/BrandGuideCard'
import { ask } from '@/components/ui/confirm'

const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'
const pill = 'min-h-11 rounded-full border border-line-strong bg-surface px-3.5'

const PRIORITY_TONE: Record<TaskPriority, string> = {
  high: 'bg-warn-soft text-warn-ink',
  normal: 'bg-raised text-ink',
  low: 'bg-raised text-muted',
}

function draftOf(task: Task | null): TaskDraft {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'normal',
    category: task?.category ?? 'outro',
    clientId: task?.clientId ?? '',
    dueDate: task?.dueDate ?? '',
    assigneeId: task?.assigneeId ?? '',
  }
}

function TaskEditor({ task, clients, staff, canApprove, userId, onClose }: {
  task: Task | null
  clients: { id: string; name: string; isActive: boolean; hasTraffic: boolean }[]
  staff: { id: string; name: string }[]
  canApprove: boolean
  userId: string | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<TaskDraft>(() => draftOf(task))
  const [touched, setTouched] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const titleError = touched ? validateTaskTitle(draft.title) : null
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['traffic-tasks'] })
  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const save = useMutation({
    mutationFn: () => saveTask(task?.id ?? null, task?.updatedAt ?? null, draft),
    onSuccess: () => {
      refresh()
      onClose()
    },
  })
  const remove = useMutation({ mutationFn: () => deleteTask(task!.id), onSuccess: () => { refresh(); onClose() } })
  const canDelete = !!task && (canApprove || task.createdBy === userId)

  const submit = () => {
    setTouched(true)
    if (validateTaskTitle(draft.title)) return
    save.mutate()
  }

  return (
    <section aria-label={task ? 'Editar tarefa' : 'Nova tarefa'} className="flex flex-col gap-3 rounded-3xl border border-line-strong bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold tracking-tight">{task ? 'Editar tarefa' : 'Nova tarefa'}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:text-ink"><X size={18} aria-hidden="true" /></button>
      </div>
      {task && <p className="-mt-2 text-[12px] text-muted">Origem: {SOURCE_LABEL[task.source]}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="md:col-span-4">
          <label htmlFor="tarefa-titulo" className="mb-1 block text-[13px] font-semibold">O que precisa ser feito *</label>
          <input id="tarefa-titulo" value={draft.title} maxLength={200} onChange={(e) => set('title', e.target.value)} onBlur={() => setTouched(true)} aria-invalid={titleError ? true : undefined} className={cn(field, titleError && 'border-2 border-warn')} placeholder="Ex.: Elaborar criativo novo para a promoção de Natal" />
          {titleError && <p role="alert" className="mt-1 text-[13px] font-medium text-warn-ink">{titleError}</p>}
        </div>
        <label className="flex flex-col text-[13px] font-semibold">Cliente
          <select value={draft.clientId} onChange={(e) => set('clientId', e.target.value)} className={cn(field, 'mt-1 font-normal')}>
            <option value="">Sem cliente (interno)</option>
            {clients.filter((c) => (c.isActive && c.hasTraffic) || c.id === draft.clientId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Responsável
          <select value={draft.assigneeId} onChange={(e) => set('assigneeId', e.target.value)} className={cn(field, 'mt-1 font-normal')}>
            <option value="">Ninguém ainda</option>
            {staff.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Prioridade
          <select value={draft.priority} onChange={(e) => set('priority', e.target.value as TaskPriority)} className={cn(field, 'mt-1 font-normal')}>
            {(['high', 'normal', 'low'] as const).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Prazo
          <input type="date" value={draft.dueDate} onChange={(e) => set('dueDate', e.target.value)} className={cn(field, 'mt-1 font-normal')} />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Tipo
          <select value={draft.category} onChange={(e) => set('category', e.target.value as TaskCategory)} className={cn(field, 'mt-1 font-normal')}>
            {Object.entries(CATEGORY_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold md:col-span-3">Detalhes
          <textarea rows={3} maxLength={4000} value={draft.description} onChange={(e) => set('description', e.target.value)} className={cn(field, 'mt-1 resize-y font-normal')} placeholder="Contexto, links, o que conta como pronto." />
        </label>
      </div>

      {(save.isError || remove.isError) && <p role="alert" className="font-medium text-warn-ink">{taskErrorMessage(save.error ?? remove.error)}</p>}
      {confirmDelete && (
        <div role="alertdialog" aria-label="Confirmar exclusão" className="flex flex-wrap items-center gap-2 rounded-2xl border border-line-strong p-3">
          <span className="flex-1 text-[13px]">Apagar esta tarefa? Não tem volta.</span>
          <Button className="min-h-9 px-3 text-[13px]" disabled={remove.isPending} onClick={() => remove.mutate()}>Apagar</Button>
          <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={save.isPending} onClick={submit}>{save.isPending ? 'Salvando' : task ? 'Salvar' : 'Criar tarefa'}</Button>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        {canDelete && !confirmDelete && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 font-medium text-muted hover:text-ink">
            <Trash2 size={15} aria-hidden="true" /> Apagar
          </button>
        )}
      </div>
    </section>
  )
}


const TONE: Record<EffectTone, string> = { good: 'bg-ok-soft text-ok-ink', bad: 'bg-warn-soft text-warn-ink', neutral: 'bg-raised text-muted' }

/** Ação na Meta: o que muda, em que pé está, o efeito depois e o botão de desfazer. */
function ActionBox({ task, canApprove, onUndo, undoing }: { task: Task; canApprove: boolean; onUndo: () => void; undoing: boolean }) {
  const change = actionChange(task.proposedAction)
  const verdict = effectVerdict(task.effect)
  const failed = task.actionStatus === 'failed'
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-xl px-2.5 py-2 text-[12px]', failed ? 'bg-warn-soft text-warn-ink' : 'bg-accent-soft/70 text-ink')}>
      {change ? (
        <p className="flex flex-wrap items-center gap-1.5 font-medium">
          <span className="rounded-md bg-surface px-1.5 py-0.5 tabular-nums line-through decoration-muted/70">{change.from}</span>
          <ArrowRight size={13} aria-hidden="true" className="text-muted" />
          <span className="rounded-md bg-surface px-1.5 py-0.5 font-semibold tabular-nums">{change.to}</span>
        </p>
      ) : <p>{task.actionSummary}</p>}
      {task.actionStatus && task.actionStatus !== 'waiting_approval' && (
        <p className="flex items-center gap-1 font-medium">
          {task.actionStatus === 'done' ? <CheckCheck size={13} aria-hidden="true" /> : task.actionStatus === 'failed' ? <AlertTriangle size={13} aria-hidden="true" /> : <Loader2 size={13} aria-hidden="true" className="animate-spin" />}
          {task.actionResult ?? ACTION_STATUS_LABEL[task.actionStatus]}
        </p>
      )}
      {task.actionStatus === 'done' && (verdict
        ? <p className={cn('rounded-md px-1.5 py-1 font-semibold', TONE[verdict.tone])} title={verdict.detail}>{verdict.text}</p>
        : <p className="text-muted">O efeito aparece aqui a partir de amanhã, comparando com os 7 dias antes.</p>)}
      {canApprove && canUndo(task.proposedAction, task.actionStatus) && (
        <button type="button" disabled={undoing} onClick={() => { void ask('Criar um card para desfazer esta ação? Ele também passa pela aprovação.').then((ok) => { if (ok) onUndo() }) }}
          className="inline-flex w-fit cursor-pointer items-center gap-1 rounded-full px-1 font-semibold text-accent-ink hover:underline disabled:opacity-50">
          <Undo2 size={13} aria-hidden="true" /> {undoing ? 'Criando' : 'Desfazer'}
        </button>
      )}
    </div>
  )
}

/** Cartão padrão do quadro: o essencial sempre à vista, o resto em "Ver detalhes". */
function TaskCard({ task, today, clientName, staffName, canApprove, detailed, dragging, onDragStart, onDragEnd, onOpen, onMove, onUndo, undoing }: {
  task: Task; today: string; clientName: Map<string, string>; staffName: Map<string, string>; canApprove: boolean; detailed: boolean; dragging: boolean
  onDragStart: () => void; onDragEnd: () => void; onOpen: () => void; onMove: (s: TaskStatus) => void; onUndo: () => void; undoing: boolean
}) {
  const [open, setOpen] = useState(false)
  const expanded = detailed || open
  const due = dueLabel(task.dueDate, today)
  const late = isOverdue(task, today)
  const change = actionChange(task.proposedAction)
  const verdict = task.actionStatus === 'done' ? effectVerdict(task.effect) : null
  const client = task.clientId ? clientName.get(task.clientId) ?? 'Cliente' : 'Interno'
  const why = task.description && task.source !== 'manual' && !task.undoOf ? task.description : null
  const reply = Boolean(task.clientId && (task.source === 'whatsapp' || (task.proposedAction && task.actionStatus === 'done')))
  return (
    <article draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      className={cn('flex cursor-grab flex-col gap-1.5 rounded-2xl border bg-surface p-3 active:cursor-grabbing', dragging && 'opacity-50', late ? 'border-warn' : 'border-line')}>
      <button type="button" onClick={onOpen} title={task.title}
        className={cn('cursor-pointer text-left font-medium leading-snug hover:underline', !expanded && 'line-clamp-2')}>{task.title}</button>
      <p className="truncate text-[12px] text-muted">{client} · {CATEGORY_LABEL[task.category]}</p>

      {!expanded && change && (
        <p className="flex flex-wrap items-center gap-1 text-[12px] font-medium">
          <span className="rounded-md bg-raised px-1.5 py-0.5 tabular-nums line-through decoration-muted/70">{change.from}</span>
          <ArrowRight size={12} aria-hidden="true" className="text-muted" />
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-semibold tabular-nums">{change.to}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {task.priority !== 'normal' && <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', PRIORITY_TONE[task.priority])}>{PRIORITY_LABEL[task.priority]}</span>}
        {task.source !== 'manual' && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent-ink">{SOURCE_LABEL[task.source]}</span>}
        {due && task.status !== 'done' && <span className={cn('text-[12px]', late ? 'font-semibold text-warn-ink' : 'text-muted')}>{due}</span>}
        {verdict && !expanded && <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', TONE[verdict.tone])} title={verdict.detail}>{verdict.text}</span>}
      </div>

      {expanded && (
        <div className="flex flex-col gap-1.5 border-t border-line pt-2">
          {task.assigneeId && <p className="text-[12px] text-muted">Responsável: {staffName.get(task.assigneeId) ?? 'Responsável'}</p>}
          {task.clientId && (task.category === 'criativo' || task.category === 'campanha') && <GuideButton clientId={task.clientId} start="design" className="self-start px-0" />}
          {why && <p className="text-[12.5px] leading-snug text-ink/80"><b className="font-semibold text-ink">Por quê: </b>{why}</p>}
          {task.actionSummary && <ActionBox task={task} canApprove={canApprove} onUndo={onUndo} undoing={undoing} />}
          {reply && task.clientId && (() => {
            const name = clientName.get(task.clientId) ?? 'Cliente'
            const first = name.split(' ')[0] ?? name
            const suggestion = task.source === 'whatsapp'
              ? `Oi, ${first}! Recebemos seu pedido: ${task.title}. Já estamos cuidando disso e te avisamos assim que estiver no ar.`
              : clientMessageForAction(task.proposedAction, first, /"([^"]+)"/.exec(task.actionSummary ?? '')?.[1] ?? null) ?? ''
            return (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {task.source === 'whatsapp' && <ClientPhoneTag clientId={task.clientId} />}
                <ClientReply compact clientId={task.clientId} clientName={name} source="traffic_tasks" sourceId={task.id} suggestion={suggestion}
                  label={task.source === 'whatsapp' ? 'Responder cliente' : 'Avisar cliente'} />
              </div>
            )
          })()}
          <label className="sr-only" htmlFor={`mover-${task.id}`}>Mover {task.title}</label>
          <select id={`mover-${task.id}`} value="" onChange={(e) => onMove(e.target.value as TaskStatus)}
            className="min-h-9 rounded-full border border-line bg-surface px-2.5 text-[12px] text-muted">
            <option value="">Mover para</option>
            {COLUMNS.filter((c) => canMove(task.status, c.id, canApprove)).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 pt-0.5">
        {task.status === 'review' && canApprove && (
          <>
            <Button className="min-h-9 px-3 text-[13px]" onClick={() => onMove('done')}><Check size={14} aria-hidden="true" /> {task.actionSummary ? 'Aprovar e executar' : 'Aprovar'}</Button>
            <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => onMove('doing')}><Undo2 size={14} aria-hidden="true" /> Devolver</Button>
          </>
        )}
        {!detailed && (
          <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}
            className="ml-auto inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-2 text-[12px] font-medium text-muted hover:bg-raised hover:text-ink">
            {open ? 'Menos' : 'Ver detalhes'} <ChevronDown size={14} aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>
    </article>
  )
}

/** Tudo o que já foi concluído, sem o limite de 14 dias do quadro. */
function TaskHistory({ tasks, filters, clientName, canApprove, onOpen, onUndo }: {
  tasks: readonly Task[]; filters: TaskFilters; clientName: Map<string, string>; canApprove: boolean; onOpen: (t: Task) => void; onUndo: (id: string) => void
}) {
  const [onlyActions, setOnlyActions] = useState(false)
  const rows = filterTasks(tasks.filter((t) => t.status === 'done'), filters, Number.NaN)
    .filter((t) => !onlyActions || t.proposedAction)
    .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt))
  const when = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo' })
  return (
    <section aria-label="Histórico" className="flex flex-col gap-2">
      <label className="flex min-h-10 w-fit cursor-pointer items-center gap-2 text-[14px]">
        <input type="checkbox" checked={onlyActions} onChange={(e) => setOnlyActions(e.target.checked)} className="size-4" /> Só ações feitas na Meta
      </label>
      <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
        {rows.map((t) => {
          const verdict = effectVerdict(t.effect)
          return (
            <li key={t.id} className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-line px-4 py-3 last:border-b-0 md:grid-cols-[90px_minmax(0,1fr)_minmax(0,260px)_auto] md:items-center">
              <span className="text-[12px] text-muted tabular-nums">{when(t.completedAt ?? t.updatedAt)}</span>
              <span className="min-w-0">
                <button type="button" onClick={() => onOpen(t)} className="block cursor-pointer truncate text-left font-medium hover:underline">{t.title}</button>
                <span className="text-[12px] text-muted">{t.clientId ? clientName.get(t.clientId) ?? 'Cliente' : 'Interno'} · {SOURCE_LABEL[t.source]}{t.actionResult ? ` · ${t.actionResult}` : ''}</span>
              </span>
              <span>{verdict ? <span className={cn('inline-block rounded-md px-1.5 py-1 text-[12px] font-semibold', TONE[verdict.tone])} title={verdict.detail}>{verdict.text}</span> : <span className="text-[12px] text-muted">{t.proposedAction ? 'Efeito em breve' : '-'}</span>}</span>
              <span>{canApprove && canUndo(t.proposedAction, t.actionStatus) && (
                <button type="button" onClick={() => { void ask('Criar um card para desfazer esta ação?').then((ok) => { if (ok) onUndo(t.id) }) }} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-2 text-[13px] font-semibold text-accent-ink hover:bg-raised">
                  <Undo2 size={14} aria-hidden="true" /> Desfazer
                </button>
              )}</span>
            </li>
          )
        })}
        {rows.length === 0 && <li className="p-6 text-center text-muted">Nada concluído com estes filtros.</li>}
      </ul>
    </section>
  )
}

export function TasksPage() {
  const queryClient = useQueryClient()
  const { state } = useAuth()
  const userId = state.status === 'ready' ? state.user.id : null
  const { canManage: canApprove } = useClientPermissions()
  const { clients, isPending: clientsPending, isError: clientsError, refetch } = useTrafficData()
  const tasks = useQuery({ queryKey: ['traffic-tasks'], queryFn: listTasks })
  const staff = useQuery({ queryKey: ['staff'], queryFn: listStaff })
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_TASK_FILTERS)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null)
  const [detailed, setDetailed] = useState(() => { try { return localStorage.getItem('pfmk-task-cards') === 'detalhado' } catch { return false } })
  const [openCols, setOpenCols] = useState<Partial<Record<TaskStatus, boolean>>>({})
  const shownCount = (col: TaskStatus, total: number) => (openCols[col] ? total : Math.min(total, 8))
  const toggleDetailed = () => setDetailed((v) => { try { localStorage.setItem('pfmk-task-cards', v ? 'compacto' : 'detalhado') } catch { /* sem storage */ } return !v })
  const today = todayInBrazil()

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => moveTask(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['traffic-tasks'] })
      const previous = queryClient.getQueryData<Task[]>(['traffic-tasks'])
      queryClient.setQueryData<Task[]>(['traffic-tasks'], (list) => list?.map((t) => (t.id === id ? { ...t, status } : t)))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['traffic-tasks'], context.previous)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['traffic-tasks'] }),
  })

  const undo = useMutation({
    mutationFn: undoTask,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['traffic-tasks'] }),
  })
  const approveAll = useMutation({
    mutationFn: async (ids: string[]) => { for (const id of ids) await moveTask(id, 'done') },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['traffic-tasks'] }),
  })
  const [params, setParams] = useSearchParams()
  const view = params.get('ver') === 'historico' ? 'history' : 'board'
  // Link da notificação abre a tarefa direto.
  const linked = params.get('tarefa')
  useEffect(() => {
    const task = linked ? tasks.data?.find((t) => t.id === linked) : undefined
    if (!task) return
    setEditing(task)
    setParams((current) => { const next = new URLSearchParams(current); next.delete('tarefa'); return next }, { replace: true })
  }, [linked, tasks.data, setParams])
  const [now] = useState(() => Date.now())
  // Tarefa de cliente perdido ou desativado some do quadro (o dado fica; volta se o cliente voltar).
  const visible = useMemo(() => {
    const dead = new Set((clients ?? []).filter((c) => !c.isActive || c.isLost).map((c) => c.id))
    return filterTasks((tasks.data ?? []).filter((t) => !t.clientId || !dead.has(t.clientId)), filters, now)
  }, [tasks.data, filters, now, clients])
  const clientName = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c.name])), [clients])
  const staffName = useMemo(() => new Map((staff.data ?? []).map((p) => [p.id, p.name])), [staff.data])

  if (!tasks.data || !clients || !staff.data) {
    return (
      <LoadState
        isPending={tasks.isPending || clientsPending || staff.isPending}
        isError={tasks.isError || clientsError || staff.isError}
        refetch={() => { void tasks.refetch(); void staff.refetch(); refetch() }}
      />
    )
  }

  const tryMove = (task: Task, status: TaskStatus) => {
    if (canMove(task.status, status, canApprove)) move.mutate({ id: task.id, status })
  }
  const drop = (event: DragEvent, status: TaskStatus) => {
    event.preventDefault()
    setOverColumn(null)
    const task = tasks.data.find((t) => t.id === dragId)
    setDragId(null)
    if (task) tryMove(task, status)
  }
  const overdue = visible.filter((t) => isOverdue(t, today)).length
  const waiting = visible.filter((t) => t.status === 'review').length


  return (
    <>
      <div role="tablist" aria-label="Ver tarefas" className="inline-flex w-fit rounded-full border border-line p-0.5">
        {([['board', 'Quadro'], ['history', 'Histórico']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={view === id}
            onClick={() => setParams((current) => { const next = new URLSearchParams(current); if (id === 'history') next.set('ver', 'historico'); else next.delete('ver'); return next }, { replace: true })}
            className={cn('min-h-10 cursor-pointer rounded-full px-4 font-medium', view === id ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="tarefa-cliente" className="sr-only">Cliente</label>
        <select id="tarefa-cliente" value={filters.clientId} onChange={(e) => setFilters({ ...filters, clientId: e.target.value })} className={cn(pill, 'max-w-[220px]')}>
          <option value="">Todos os clientes</option>
          {clients.filter((c) => c.isActive && c.hasTraffic).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label htmlFor="tarefa-resp" className="sr-only">Responsável</label>
        <select id="tarefa-resp" value={filters.assigneeId} onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })} className={pill}>
          <option value="">Todos os responsáveis</option>
          {staff.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label htmlFor="tarefa-prio" className="sr-only">Prioridade</label>
        <select id="tarefa-prio" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value as TaskPriority | '' })} className={pill}>
          <option value="">Toda prioridade</option>
          {(['high', 'normal', 'low'] as const).map((p) => <option key={p} value={p}>Prioridade {PRIORITY_LABEL[p].toLowerCase()}</option>)}
        </select>
        <div className="min-w-[180px] flex-1">
          <label htmlFor="tarefa-busca" className="sr-only">Buscar tarefa</label>
          <input id="tarefa-busca" type="search" placeholder="Buscar tarefa" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="min-h-11 w-full rounded-full border border-line-strong bg-surface px-4" />
        </div>
        {view === 'board' && (
          <Button variant="secondary" onClick={toggleDetailed} aria-pressed={detailed} title="Mostrar todos os detalhes nos cartões ou só o essencial">
            {detailed ? <><ChevronsDownUp size={16} aria-hidden="true" /> Compactar cartões</> : <><ChevronsUpDown size={16} aria-hidden="true" /> Expandir cartões</>}
          </Button>
        )}
        <Button onClick={() => setEditing('new')}><Plus size={18} aria-hidden="true" /> Nova tarefa</Button>
      </div>

      {(overdue > 0 || (waiting > 0 && canApprove)) && (
        <p className="rounded-3xl bg-warn-soft px-5 py-3 text-warn-ink">
          {overdue > 0 && <><b>{overdue}</b> {overdue === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}. </>}
          {waiting > 0 && canApprove && <><b>{waiting}</b> {waiting === 1 ? 'espera' : 'esperam'} a sua aprovação.</>}
        </p>
      )}

      {editing && (
        <TaskEditor
          key={editing === 'new' ? 'new' : `${editing.id}-${editing.updatedAt}`}
          task={editing === 'new' ? null : editing}
          clients={clients}
          staff={staff.data}
          canApprove={canApprove}
          userId={userId}
          onClose={() => setEditing(null)}
        />
      )}
      {move.isError && <p role="alert" className="font-medium text-warn-ink">{taskErrorMessage(move.error)}</p>}

      {view === 'history' && (
        <TaskHistory tasks={tasks.data} filters={filters} clientName={clientName} canApprove={canApprove} onOpen={setEditing} onUndo={(id) => undo.mutate(id)} />
      )}
      {undo.isError && <p role="alert" className="font-medium text-warn-ink">{taskErrorMessage(undo.error)}</p>}

      {view === 'board' && <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const items = sortColumn(visible.filter((t) => t.status === column.id))
          return (
            <section
              key={column.id}
              aria-label={column.label}
              onDragOver={(e) => { e.preventDefault(); setOverColumn(column.id) }}
              onDragLeave={() => setOverColumn((current) => (current === column.id ? null : current))}
              onDrop={(e) => drop(e, column.id)}
              className={cn('flex min-h-40 flex-col gap-2 rounded-3xl border bg-raised/50 p-3 transition-colors', overColumn === column.id ? 'border-accent' : 'border-line')}
            >
              <header className="px-1">
                <h2 className="flex items-center justify-between font-semibold">{column.label}<span className="text-[13px] text-muted tabular-nums">{items.length}</span></h2>
                <p className="text-[12px] text-muted">{column.id === 'done' ? `Últimos ${DONE_VISIBLE_DAYS} dias. O resto fica no Histórico.` : column.hint}</p>
                {column.id === 'review' && canApprove && items.length > 1 && (
                  <Button variant="secondary" className="mt-2 min-h-9 w-full px-3 text-[13px]" disabled={approveAll.isPending}
                    onClick={() => { void ask(`Aprovar as ${items.length} tarefas? As ações na Meta saem em até 2 minutos.`).then((ok) => { if (ok) approveAll.mutate(items.map((t) => t.id)) }) }}>
                    <CheckCheck size={14} aria-hidden="true" /> {approveAll.isPending ? 'Aprovando' : `Aprovar todas (${items.length})`}
                  </Button>
                )}
              </header>
              {items.length === 0 && <p className="px-1 py-4 text-center text-[13px] text-muted">Nada aqui.</p>}
              <div className="-mx-1 flex flex-col gap-2 px-1 pb-1 xl:max-h-[calc(100dvh-300px)] xl:overflow-y-auto">
                {items.slice(0, shownCount(column.id, items.length)).map((task) => (
                  <TaskCard key={task.id} task={task} today={today} clientName={clientName} staffName={staffName} canApprove={canApprove}
                    detailed={detailed} dragging={dragId === task.id}
                    onDragStart={() => setDragId(task.id)} onDragEnd={() => { setDragId(null); setOverColumn(null) }}
                    onOpen={() => setEditing(task)} onMove={(st) => tryMove(task, st)}
                    onUndo={() => undo.mutate(task.id)} undoing={undo.isPending && undo.variables === task.id} />
                ))}
                {items.length > shownCount(column.id, items.length) && (
                  <button type="button" onClick={() => setOpenCols((c) => ({ ...c, [column.id]: true }))}
                    className="min-h-10 cursor-pointer rounded-2xl border border-dashed border-line-strong text-[13px] font-medium text-muted hover:border-ink hover:text-ink">
                    Ver mais {items.length - shownCount(column.id, items.length)}
                  </button>
                )}
              </div>
            </section>
          )
        })}
      </div>}
      <p className="text-[12px] text-muted">Arraste os cartões entre colunas ou use "Mover para". Concluir o que espera aprovação é só para administrador ou head.</p>
    </>
  )
}
