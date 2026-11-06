import { describe, expect, it } from 'vitest'
import { answeredPct, briefPct, dueThisMonth, periodOf } from './frameworkRules'

describe('periodOf', () => {
  it('mensal é o mês', () => expect(periodOf('mensal', '2026-11-01')).toBe('2026-11-01'))
  it('trimestral é o início do trimestre', () => {
    expect(periodOf('trimestral', '2026-11-01')).toBe('2026-10-01')
    expect(periodOf('trimestral', '2026-03-01')).toBe('2026-01-01')
  })
})

describe('answeredPct', () => {
  it('conta só respostas com texto', () => expect(answeredPct({ questions: ['a', 'b', 'c', 'd'] }, { '0': 'x', '2': ' ', '3': 'y' })).toBe(50))
})

describe('dueThisMonth', () => {
  it('trimestral só no 1º mês do trimestre ou se vazio', () => {
    expect(dueThisMonth({ cadence: 'trimestral' }, '2026-10-01', true)).toBe(true)
    expect(dueThisMonth({ cadence: 'trimestral' }, '2026-11-01', true)).toBe(false)
    expect(dueThisMonth({ cadence: 'trimestral' }, '2026-11-01', false)).toBe(true)
  })
  it('quando precisar nunca é obrigatório', () => expect(dueThisMonth({ cadence: 'quando_precisar' }, '2026-11-01', false)).toBe(false))
})

describe('briefPct', () => {
  it('vazio', () => expect(briefPct({})).toBe(0))
})
