import { describe, expect, it } from 'vitest'
import { canAsk, category, npsScore, type NpsAnswer } from './npsRules'

const a = (over: Partial<NpsAnswer>): NpsAnswer => ({
  id: 'x', clientId: 'c1', status: 'answered', score: 9, comment: null, requestedAt: '2026-10-01T12:00:00Z', answeredAt: '2026-10-01T13:00:00Z', ...over,
})

describe('npsScore', () => {
  it('usa só a última nota de cada cliente', () => {
    const r = npsScore([
      a({ clientId: 'c1', score: 3, answeredAt: '2026-09-01T00:00:00Z' }),
      a({ clientId: 'c1', score: 10, answeredAt: '2026-10-01T00:00:00Z' }),
      a({ clientId: 'c2', score: 5 }),
      a({ clientId: 'c3', score: 8 }),
      a({ clientId: 'c4', score: null, status: 'sent' }),
    ])
    expect(r).toEqual({ nps: 0, promoters: 1, neutrals: 1, detractors: 1, total: 3 })
  })
  it('sem resposta não tem NPS', () => {
    expect(npsScore([]).nps).toBeNull()
  })
})

describe('regras', () => {
  it('classifica a nota', () => {
    expect(category(6)).toBe('detrator')
    expect(category(7)).toBe('neutro')
    expect(category(9)).toBe('promotor')
  })
  it('espera 25 dias para pedir de novo', () => {
    const list = [a({ requestedAt: '2026-10-20T00:00:00Z' })]
    expect(canAsk('c1', list, new Date('2026-11-03T00:00:00Z'))).toBe(false)
    expect(canAsk('c1', list, new Date('2026-11-20T00:00:00Z'))).toBe(true)
    expect(canAsk('c2', list, new Date('2026-11-03T00:00:00Z'))).toBe(true)
  })
})
