import { describe, expect, it } from 'vitest'
import { goalValue, partnershipProgress, type MemberDashboard } from './teamRules'

const base: MemberDashboard = {
  settings: { sourcing_enabled: true, sourcing_pct: 10, sourcing_months: 3, partnership_enabled: true, partnership_min_revenue: 10000, partnership_min_months: 6, goals_enabled: true },
  leads: { month: 4, open: 2, won: 1 },
  clients: [{ id: '1', name: 'A', since: null, active: true }],
  commission: 150, revenue_brought: 5000, months_with_revenue: 2, deliveries: 9, goals: [],
}

describe('goalValue', () => {
  it('lê cada métrica', () => {
    expect(goalValue(base, 'leads')).toBe(4)
    expect(goalValue(base, 'clientes_trazidos')).toBe(1)
    expect(goalValue(base, 'receita_trazida')).toBe(5000)
    expect(goalValue(base, 'entregas')).toBe(9)
  })
})

describe('partnershipProgress', () => {
  it('meio caminho', () => expect(partnershipProgress(base)).toEqual({ pctRevenue: 50, months: 2, needed: 6, ready: false }))
  it('pronto quando bate receita e meses', () =>
    expect(partnershipProgress({ ...base, revenue_brought: 12000, months_with_revenue: 6 }).ready).toBe(true))
})
