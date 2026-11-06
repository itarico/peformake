import { describe, expect, it } from 'vitest'
import { monthlyChurn, monthsText, npsLabel, npsScore, retentionRate, type FlowMonth } from './retentionRules'

const m = (at_start: number, joined: number, left: number): FlowMonth => ({ month: '2026-01-01', at_start, joined, left })

describe('retenção', () => {
  it('conta só quem já era cliente no começo', () => {
    // 20 no começo, entram 10, saem 5: 25 no fim, 15 dos antigos ficaram = 75%.
    expect(retentionRate([m(20, 4, 2), m(22, 6, 3)], 2)).toBe(75)
  })
  it('sem base no começo não mede', () => {
    expect(retentionRate([m(0, 5, 0), m(5, 0, 0)], 2)).toBeNull()
  })
  it('cancelamento médio por mês ignora meses sem base', () => {
    expect(monthlyChurn([m(0, 5, 0), m(10, 0, 1), m(10, 0, 1)])).toBe(10)
    expect(monthlyChurn([m(0, 1, 0)])).toBeNull()
  })
})

describe('NPS', () => {
  it('promotores menos detratores', () => {
    expect(npsScore({ answers: 10, promoters: 6, detractors: 2 })).toBe(40)
    expect(npsScore({ answers: 0, promoters: 0, detractors: 0 })).toBeNull()
    expect(npsLabel(40)).toBe('Razoável')
    expect(npsLabel(-10)).toBe('Crítico')
  })
  it('escreve meses por extenso', () => {
    expect(monthsText(3.6)).toBe('3,6 meses')
    expect(monthsText(1)).toBe('1 mês')
    expect(monthsText(null)).toBe('Sem dado')
  })
})
