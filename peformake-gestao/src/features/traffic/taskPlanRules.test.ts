import { describe, expect, it } from 'vitest'
import { answeredCount, monthLabel, monthStart, planProgress, safeFileName, validateFile, type PlanFields } from './planRules'
import { canMove, dueLabel, EMPTY_TASK_FILTERS, filterTasks, isOverdue, sortColumn, validateTaskTitle, type Task } from './taskRules'

const TODAY = '2026-11-03'
const NOW = Date.parse('2026-11-03T12:00:00Z')
const task = (over: Partial<Task> = {}): Task => ({
  id: '1', clientId: 'c1', title: 'Elaborar criativo', description: null, status: 'todo', priority: 'normal', category: 'criativo',
  source: 'manual', dueDate: null, assigneeId: null, position: 0, createdBy: null, createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z', completedAt: null, actionSummary: null, actionStatus: null, actionResult: null, proposedAction: null, effect: null, undoOf: null, ...over,
})

describe('tarefas', () => {
  it('ordena alta primeiro, depois prazo, sem prazo no fim', () => {
    const list = [
      task({ id: 'a', priority: 'normal', dueDate: '2026-11-05' }),
      task({ id: 'b', priority: 'high', dueDate: null }),
      task({ id: 'c', priority: 'normal', dueDate: null }),
      task({ id: 'd', priority: 'normal', dueDate: '2026-11-04' }),
    ]
    expect(sortColumn(list).map((t) => t.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('esconde concluídas antigas e filtra por cliente, prioridade e busca', () => {
    const list = [
      task({ id: 'a' }),
      task({ id: 'b', status: 'done', completedAt: '2026-10-01T10:00:00Z' }),
      task({ id: 'c', status: 'done', completedAt: '2026-11-02T10:00:00Z', clientId: 'c2', priority: 'high', title: 'Campanha de Natal' }),
    ]
    expect(filterTasks(list, EMPTY_TASK_FILTERS, NOW).map((t) => t.id)).toEqual(['a', 'c'])
    expect(filterTasks(list, { ...EMPTY_TASK_FILTERS, clientId: 'c2' }, NOW).map((t) => t.id)).toEqual(['c'])
    expect(filterTasks(list, { ...EMPTY_TASK_FILTERS, priority: 'high' }, NOW).map((t) => t.id)).toEqual(['c'])
    expect(filterTasks(list, { ...EMPTY_TASK_FILTERS, search: 'natal' }, NOW).map((t) => t.id)).toEqual(['c'])
  })

  it('só quem aprova conclui o que espera aprovação', () => {
    expect(canMove('review', 'done', false)).toBe(false)
    expect(canMove('review', 'done', true)).toBe(true)
    expect(canMove('review', 'doing', false)).toBe(true)
    expect(canMove('todo', 'todo', true)).toBe(false)
  })

  it('mostra atraso e prazo em palavras', () => {
    expect(isOverdue(task({ dueDate: '2026-11-01' }), TODAY)).toBe(true)
    expect(isOverdue(task({ dueDate: '2026-11-01', status: 'done' }), TODAY)).toBe(false)
    expect(dueLabel('2026-11-01', TODAY)).toBe('Atrasada 2 dias')
    expect(dueLabel('2026-11-03', TODAY)).toBe('Vence hoje')
    expect(dueLabel('2026-11-04', TODAY)).toBe('Vence amanhã')
    expect(dueLabel(null, TODAY)).toBeNull()
  })

  it('valida o título', () => {
    expect(validateTaskTitle(' ab ')).toMatch(/3 letras/)
    expect(validateTaskTitle('Ajustar orçamento')).toBeNull()
  })
})

describe('reunião mensal', () => {
  it('calcula meses e nomes', () => {
    expect(monthStart(TODAY, 0)).toBe('2026-11-01')
    expect(monthStart(TODAY, 2)).toBe('2027-01-01')
    expect(monthStart(TODAY, -11)).toBe('2025-12-01')
    expect(monthLabel('2026-12-01')).toBe('dezembro de 2026')
  })

  it('mostra o avanço do roteiro e das respostas', () => {
    expect(planProgress([{ doneAt: 'x' }, { doneAt: null }, { doneAt: null }, { doneAt: 'y' }])).toEqual({ done: 2, total: 4, percent: 50 })
    expect(planProgress([])).toEqual({ done: 0, total: 0, percent: 0 })
    const fields = { meetingDate: '', objectives: 'Vender', priorityProducts: ' ', servicesToPromote: '', plannedActions: '', importantDates: 'Natal', businessChanges: '', newOffers: '', expectations: '', budget: '', constraints: '', notes: '' } satisfies PlanFields
    expect(answeredCount(fields)).toBe(2)
  })

  it('confere arquivos antes de enviar', () => {
    expect(validateFile({ size: 10, type: 'application/pdf' }, 'produtos', false)).toBeNull()
    expect(validateFile({ size: 10, type: 'text/csv' }, 'clientes', false)).toMatch(/administrador/)
    expect(validateFile({ size: 10, type: 'text/csv' }, 'clientes', true)).toBeNull()
    expect(validateFile({ size: 30 * 1024 * 1024, type: 'application/pdf' }, 'produtos', true)).toMatch(/20 MB/)
    expect(validateFile({ size: 10, type: 'application/zip' }, 'outro', true)).toMatch(/PDF/)
  })

  it('limpa o nome do arquivo', () => {
    expect(safeFileName('Lista de Preços 2026 (nova).XLSX')).toBe('Lista-de-Precos-2026-nova.xlsx')
    expect(safeFileName('###.pdf')).toBe('arquivo.pdf')
    expect(safeFileName('semextensao')).toBe('semextensao')
  })
})
