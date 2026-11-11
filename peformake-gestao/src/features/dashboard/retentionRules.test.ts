import { describe, expect, it } from 'vitest'
import { daysSince, funnelSteps, healthBand, healthScore, monthlyChurn, monthsText, npsLabel, npsScore, retentionRate, type FlowMonth } from './retentionRules'

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

describe('saúde da carteira, funil e dias', () => {
  it('média ponderada das avaliações', () => {
    expect(healthScore({})).toBeNull()
    expect(healthScore({ muito_bom: 1, ruim: 1 })).toBe(63)
    expect(healthScore({ bom: 2, neutro: 1, ruim: 1, outro: 9 })).toBe(56)
  })
  it('faixas do velocímetro', () => {
    expect(healthBand(39)).toBe('ruim')
    expect(healthBand(40)).toBe('atencao')
    expect(healthBand(57)).toBe('atencao')
    expect(healthBand(70)).toBe('boa')
  })
  it('funil fica decrescente e mostra a passagem entre etapas', () => {
    const s = funnelSteps([{ label: 'A', value: 5 }, { label: 'B', value: 3 }, { label: 'C', value: 2 }])
    expect(s.map((x) => x.value)).toEqual([10, 5, 2])
    expect(s.map((x) => x.conversion)).toEqual([null, 50, 40])
    expect(funnelSteps([{ label: 'A', value: 0 }, { label: 'B', value: 0 }])[1]!.conversion).toBe(0)
  })
  it('dias desde a data', () => {
    expect(daysSince('2026-11-01', '2026-11-11')).toBe(10)
  })
})
