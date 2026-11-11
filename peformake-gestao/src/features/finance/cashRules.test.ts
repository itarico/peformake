import { describe, expect, it } from 'vitest'
import { cashRows } from './cashRules'

const r = (kind: string, status: string, d: string, cat: string | null = 'x') => ({ kind, status, category_id: cat, due_date: d, paid_at: status === 'pago' ? d : null })
const rows = [r('entrada', 'pendente', '2026-11-30'), r('entrada', 'pago', '2026-11-05'), r('saida', 'pendente', '2026-11-20'), r('saida', 'pago', '2026-11-10', null)]

describe('lista do Caixa', () => {
  it('mensalidade de cliente em aberto não entra (fica na Cobrança)', () => {
    expect(cashRows(rows, 'todos')).toHaveLength(3)
    expect(cashRows(rows, 'todos').some((e) => e.kind === 'entrada' && e.status === 'pendente')).toBe(false)
  })
  it('filtros', () => {
    expect(cashRows(rows, 'a_pagar').map((e) => e.due_date)).toEqual(['2026-11-20'])
    expect(cashRows(rows, 'sem_categoria')).toHaveLength(1)
    expect(cashRows(rows, 'entrada')).toHaveLength(1)
  })
  it('mais recente primeiro', () => expect(cashRows(rows, 'todos')[0]!.due_date).toBe('2026-11-20'))
})
