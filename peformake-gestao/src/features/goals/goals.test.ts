import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: () => null } }))
import { paceOf, type GoalRow } from './goals'

const row = (p: Partial<GoalRow>): GoalRow => ({ role: 'comercial', key: 'novos', target: 4, actual: 0, info: {}, source: 'auto', position: 1, ...p })

describe('paceOf', () => {
  it('meta de alcançar: esperado pelo dia do mês, falta e por dia', () => {
    const p = paceOf(row({ actual: 1 }), 15, 30) // esperado 50%, tem 25%
    expect(p.state).toBe('atras')
    expect(p.remaining).toBe(3)
    expect(p.perDay).toBeCloseTo(3 / 16)
    expect(paceOf(row({ actual: 2 }), 15, 30).state).toBe('ritmo')
    expect(paceOf(row({ actual: 4 }), 15, 30).state).toBe('batida')
  })
  it('MRR mede o caminho da base até a meta, não o total', () => {
    const p = paceOf(row({ key: 'mrr_total', target: 25600, actual: 24400, info: { base: 24400 } }), 6, 30)
    expect(p.pct).toBe(0)
    expect(p.remaining).toBe(1200)
  })
  it('meta de no máximo: dentro ou estourou', () => {
    expect(paceOf(row({ key: 'saidas', target: 0, actual: 0 }), 10, 30).state).toBe('ok')
    expect(paceOf(row({ key: 'saidas', target: 0, actual: 2 }), 10, 30).state).toBe('estourou')
  })
})
