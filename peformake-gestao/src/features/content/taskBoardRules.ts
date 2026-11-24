// Tarefas do Social Media (quadro separado das artes): regras puras.
import type { TaskSource, TaskStatus } from '@/features/social/socialRules'

/** De onde veio a tarefa, em 3 grupos iguais em todas as áreas: o cliente pediu, o sistema sugeriu, a pessoa anotou. */
export type TaskOrigin = 'cliente' | 'sistema' | 'minha'

export function taskOrigin(source: TaskSource): TaskOrigin {
  if (source === 'pedido_cliente') return 'cliente'
  if (source === 'manual') return 'minha'
  return 'sistema'
}

export const ORIGIN_LABEL: Record<TaskOrigin, string> = { cliente: 'Cliente pediu', sistema: 'Sistema sugeriu', minha: 'Minha' }
export const ORIGIN_TONE: Record<TaskOrigin, string> = { cliente: 'bg-warn-soft text-warn-ink', sistema: 'bg-accent-soft text-accent-ink', minha: 'bg-raised text-muted' }

export const TASK_COLUMNS = [
  { id: 'a_fazer', label: 'A fazer', empty: 'Nada para fazer. Pedidos do cliente e sugestões do sistema chegam aqui.' },
  { id: 'fazendo', label: 'Fazendo', empty: 'Nada em andamento.' },
  { id: 'feito', label: 'Feito', empty: 'O que for concluído fica aqui por 7 dias.' },
] as const
export type TaskColumn = (typeof TASK_COLUMNS)[number]['id']

interface Sortable { status: TaskStatus; priority: boolean; due_date: string | null; created_at: string }

/**
 * Separa nas 3 colunas. "Em revisão" (status antigo) conta como Fazendo. Feito some depois de 7 dias.
 * Ordem dentro da coluna: prioridade, depois o prazo mais perto, depois a mais nova.
 */
export function groupTasks<T extends Sortable>(tasks: readonly T[], now: number): Record<TaskColumn, T[]> {
  const out: Record<TaskColumn, T[]> = { a_fazer: [], fazendo: [], feito: [] }
  for (const t of tasks) {
    if (t.status === 'feito') { if (now - new Date(t.created_at).getTime() < 7 * 864e5) out.feito.push(t) }
    else out[t.status === 'a_fazer' ? 'a_fazer' : 'fazendo'].push(t)
  }
  const order = (a: T, b: T) => Number(b.priority) - Number(a.priority)
    || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
    || b.created_at.localeCompare(a.created_at)
  out.a_fazer.sort(order); out.fazendo.sort(order)
  return out
}
