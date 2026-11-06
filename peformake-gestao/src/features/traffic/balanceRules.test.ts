import { describe, expect, it } from 'vitest'
import { averageDailySpend, byUrgency, describeBalance, type AccountStatus } from './balanceRules'
import type { DailyMetric } from './metricsRules'

const TODAY = '2026-11-03'
const day = (d: string, spendCents: number): DailyMetric => ({
  accountId: '1', day: d, spendCents, impressions: 0, clicks: 0, leads: 0, purchases: 0, purchaseValueCents: 0, results: null, resultType: null, readAt: '',
})
const rows = [day('2026-11-03', 900), day('2026-11-02', 2000), day('2026-11-01', 4000), day('2026-10-31', 0), day('2026-10-20', 99999)]
const status = (over: Partial<AccountStatus> = {}): AccountStatus => ({
  accountId: '1', accountStatus: 1, isPrepaid: true, availableCents: 30000, spendCapCents: null, amountSpentCents: null,
  balanceDueCents: null, fundingText: null, readAt: '2026-11-03T10:00:00Z', ...over,
})

describe('média diária', () => {
  it('usa só os 7 dias antes de hoje com gasto', () => {
    expect(averageDailySpend(rows, TODAY)).toBe(3000)
  })
})

describe('saldo', () => {
  it('calcula quantos dias o saldo dura', () => {
    expect(describeBalance(status(), rows, TODAY, 4000)).toMatchObject({ state: 'ok', remainingCents: 30000, daysLeft: 10, yesterdayCents: 2000, todayCents: 900 })
  })

  it('marca saldo baixo e saldo que acaba em poucos dias', () => {
    expect(describeBalance(status({ availableCents: 3000 }), rows, TODAY, 4000).state).toBe('low')
    expect(describeBalance(status({ availableCents: 8000 }), rows, TODAY, 4000)).toMatchObject({ state: 'ending', daysLeft: 2 })
  })

  it('usa o limite de gasto no pós-pago e trata conta sem limite', () => {
    expect(describeBalance(status({ isPrepaid: false, availableCents: null, spendCapCents: 50000, amountSpentCents: 44000 }), rows, TODAY, 4000))
      .toMatchObject({ remainingCents: 6000, remainingLabel: 'Até o limite de gasto', state: 'ending' })
    expect(describeBalance(status({ isPrepaid: false, availableCents: null }), rows, TODAY, 4000).state).toBe('postpaid')
  })

  it('restrição da Meta vem antes de tudo; sem leitura fica desconhecido', () => {
    expect(describeBalance(status({ accountStatus: 2 }), rows, TODAY, 4000).state).toBe('problem')
    expect(describeBalance(null, rows, TODAY, 4000).state).toBe('unknown')
    expect(describeBalance(status({ availableCents: null }), rows, TODAY, 4000).state).toBe('unknown')
  })

  it('ordena pelo mais urgente', () => {
    const list = [
      describeBalance(status(), rows, TODAY, 4000),
      describeBalance(status({ availableCents: 8000 }), rows, TODAY, 4000),
      describeBalance(status({ accountStatus: 3 }), rows, TODAY, 4000),
    ]
    expect([...list].sort(byUrgency).map((item) => item.state)).toEqual(['problem', 'ending', 'ok'])
  })
})
