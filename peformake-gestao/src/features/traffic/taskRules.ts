export type TaskStatus = 'todo' | 'doing' | 'review' | 'done'
export type TaskPriority = 'high' | 'normal' | 'low'
export type TaskCategory = 'criativo' | 'campanha' | 'ajuste' | 'relatorio' | 'atendimento' | 'outro'
export type TaskSource = 'manual' | 'agent' | 'whatsapp' | 'strategist' | 'alert'
export type ActionStatus = 'waiting_approval' | 'queued' | 'running' | 'done' | 'failed' | 'rejected'

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  waiting_approval: 'Ação aguardando aprovação',
  queued: 'Ação aprovada, na fila do agente',
  running: 'Agente executando',
  done: 'Ação executada',
  failed: 'Ação falhou',
  rejected: 'Ação recusada',
}

export interface Task {
  id: string
  clientId: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  category: TaskCategory
  source: TaskSource
  dueDate: string | null
  assigneeId: string | null
  position: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  actionSummary: string | null
  actionStatus: ActionStatus | null
  actionResult: string | null
  proposedAction: import('./taskEffectRules').ProposedAction | null
  effect: import('./taskEffectRules').TaskEffect | null
  undoOf: string | null
}

export const COLUMNS: readonly { id: TaskStatus; label: string; hint: string }[] = [
  { id: 'todo', label: 'A fazer', hint: 'Ainda não começou' },
  { id: 'doing', label: 'Fazendo', hint: 'Em andamento' },
  { id: 'review', label: 'Aguardando aprovação', hint: 'Pronto, falta aprovar para ir ao ar' },
  { id: 'done', label: 'Feito', hint: 'Concluído nos últimos 14 dias' },
]

export const PRIORITY_LABEL: Record<TaskPriority, string> = { high: 'Alta', normal: 'Normal', low: 'Baixa' }
export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  criativo: 'Criativo', campanha: 'Campanha', ajuste: 'Ajuste', relatorio: 'Relatório', atendimento: 'Atendimento', outro: 'Outro',
}
export const SOURCE_LABEL: Record<TaskSource, string> = {
  manual: 'Equipe', agent: 'Agente', whatsapp: 'WhatsApp do cliente', strategist: 'Estrategista', alert: 'Alerta',
}

/** Concluídas somem do quadro depois deste prazo. */
export const DONE_VISIBLE_DAYS = 14

const DAY = 86_400_000
const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 }

export function isOverdue(task: Pick<Task, 'dueDate' | 'status'>, today: string): boolean {
  return task.status !== 'done' && !!task.dueDate && task.dueDate < today
}

export interface TaskFilters {
  clientId: string
  assigneeId: string
  priority: TaskPriority | ''
  search: string
}

export const EMPTY_TASK_FILTERS: TaskFilters = { clientId: '', assigneeId: '', priority: '', search: '' }

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function filterTasks(tasks: readonly Task[], filters: TaskFilters, now: number): Task[] {
  const term = normalize(filters.search)
  return tasks.filter((task) => {
    if (task.status === 'done' && task.completedAt && now - Date.parse(task.completedAt) > DONE_VISIBLE_DAYS * DAY) return false
    if (filters.clientId && task.clientId !== filters.clientId) return false
    if (filters.assigneeId && task.assigneeId !== filters.assigneeId) return false
    if (filters.priority && task.priority !== filters.priority) return false
    if (term && !normalize(`${task.title} ${task.description ?? ''}`).includes(term)) return false
    return true
  })
}

/** Dentro da coluna: prioridade alta primeiro, depois o prazo mais próximo, sem prazo por último. */
export function sortColumn(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) =>
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
    || a.position - b.position
    || a.createdAt.localeCompare(b.createdAt))
}

/** Concluir o que espera aprovação é aprovar: só quem aprova. */
export function canMove(from: TaskStatus, to: TaskStatus, canApprove: boolean): boolean {
  if (from === to) return false
  if (from === 'review' && to === 'done') return canApprove
  return true
}

export function validateTaskTitle(title: string): string | null {
  const clean = title.trim()
  if (clean.length < 3) return 'Descreva a tarefa com pelo menos 3 letras.'
  if (clean.length > 200) return 'Use no máximo 200 caracteres. Detalhes vão na descrição.'
  return null
}

export function dueLabel(dueDate: string | null, today: string): string | null {
  if (!dueDate) return null
  const days = Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY)
  if (days < 0) return `Atrasada ${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'}`
  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence amanhã'
  return `Vence em ${days} dias`
}
