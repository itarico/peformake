import { supabase } from '@/lib/supabase'
import type { ActionStatus, Task, TaskCategory, TaskPriority, TaskSource, TaskStatus } from './taskRules'

export interface TaskDraft {
  title: string
  description: string
  priority: TaskPriority
  category: TaskCategory
  clientId: string
  dueDate: string
  assigneeId: string
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('traffic_tasks')
    .select('id, client_id, title, description, status, priority, category, source, due_date, assignee_id, position, created_by, created_at, updated_at, completed_at, action_summary, action_status, action_result, proposed_action, effect, undo_of')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    category: row.category as TaskCategory,
    source: row.source as TaskSource,
    dueDate: row.due_date,
    assigneeId: row.assignee_id,
    position: Number(row.position),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    actionSummary: row.action_summary,
    actionStatus: row.action_status as ActionStatus | null,
    actionResult: row.action_result,
    proposedAction: (row.proposed_action as Task['proposedAction']) ?? null,
    effect: (row.effect as Task['effect']) ?? null,
    undoOf: row.undo_of,
  }))
}

export async function saveTask(id: string | null, expectedUpdatedAt: string | null, draft: TaskDraft): Promise<string> {
  const { data, error } = await supabase.rpc('task_save', {
    _task_id: id,
    _expected_updated_at: expectedUpdatedAt,
    _data: {
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      category: draft.category,
      client_id: draft.clientId,
      due_date: draft.dueDate,
      assignee_id: draft.assigneeId,
    },
  })
  if (error) throw error
  return data
}

export async function moveTask(id: string, status: TaskStatus): Promise<void> {
  const { error } = await supabase.rpc('task_move', { _task_id: id, _status: status, _position: null })
  if (error) throw error
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.rpc('task_delete', { _task_id: id })
  if (error) throw error
}

export function taskErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  if (code === '42501') return 'Você não tem permissão para esta ação. Aprovar e apagar tarefas de outras pessoas é só para administrador ou head.'
  if (code === 'PF001') return 'Outra pessoa alterou esta tarefa agora. Feche e abra de novo.'
  if (code === 'PF004') return 'Esta tarefa não existe mais. Atualize a página.'
  if (code === 'PF006') return 'Confira o título, o cliente e o responsável.'
  return 'Não foi possível salvar. Nada foi alterado. Tente de novo.'
}

/** Cria o card que desfaz a ação; ele também espera aprovação. */
export async function undoTask(id: string): Promise<void> {
  const { error } = await supabase.rpc('task_undo', { _task_id: id })
  if (error) throw error
}
