import { describe, expect, it } from 'vitest'
import { changeLabel, currentPeriods, dailySpend, inRange, lastMonthRange, projectMonth, sumMetrics, type DailyMetric } from './metricsRules'

const row = (over: Partial<DailyMetric> = {}): DailyMetric => ({
  accountId: '1', day: '2026-11-01', spendCents: 1000, impressions: 1000, clicks: 10, leads: 0, purchases: 0,
  purchaseValueCents: 0, results: null, resultType: null, readAt: '2026-11-02T10:00:00Z', ...over,
})

describe('períodos', () => {
  it('compara com os mesmos dias do mês anterior', () => {
    expect(currentPeriods('2026-11-02')).toMatchObject({
      current: { from: '2026-11-01', to: '2026-11-02' },
      previous: { from: '2026-10-01', to: '2026-10-02' },
      daysInMonth: 30,
      dayOfMonth: 2,
    })
  })

  it('ajusta quando o mês anterior é mais curto e na virada de ano', () => {
    expect(currentPeriods('2026-03-31').previous.to).toBe('2026-02-28')
    expect(currentPeriods('2027-01-15').previous).toEqual({ from: '2026-12-01', to: '2026-12-15' })
  })

  it('devolve o mês anterior inteiro', () => {
    expect(lastMonthRange('2026-11-02')).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(lastMonthRange('2027-01-10')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })
})

describe('sumMetrics', () => {
  it('soma sem misturar tipos de resultado', () => {
    const totals = sumMetrics([
      row({ leads: 2, results: 2, resultType: 'actions:lead' }),
      row({ results: 5, resultType: 'actions:onsite_conversion.messaging_conversation_started_7d', purchases: 1, purchaseValueCents: 5000 }),
    ])
    expect(totals).toMatchObject({ spendCents: 2000, leads: 2, conversations: 5, purchases: 1, purchaseValueCents: 5000 })
    expect(totals.ctr).toBe(1)
    expect(totals.cpmCents).toBe(1000)
    expect(totals.roas).toBe(2.5)
  })

  it('não inventa taxa sem base', () => {
    expect(sumMetrics([])).toMatchObject({ spendCents: 0, ctr: null, cpmCents: null, roas: null })
    expect(sumMetrics([row()]).roas).toBeNull()
  })
})

describe('apoio', () => {
  it('filtra por período incluindo as pontas', () => {
    const rows = [row({ day: '2026-10-31' }), row({ day: '2026-11-01' }), row({ day: '2026-11-02' }), row({ day: '2026-11-03' })]
    expect(inRange(rows, '2026-11-01', '2026-11-02').map((r) => r.day)).toEqual(['2026-11-01', '2026-11-02'])
  })

  it('descreve a variação', () => {
    expect(changeLabel(110, 100)).toMatch(/^\+10%/)
    expect(changeLabel(90, 100)).toMatch(/^-10%/)
    expect(changeLabel(100, 100)).toMatch(/^Igual/)
    expect(changeLabel(100, 0)).toMatch(/Sem base/)
    expect(changeLabel(0, 0)).toBe('Sem movimento')
  })

  it('projeta o mês e preenche dias vazios', () => {
    expect(projectMonth(1000, 2, 30)).toBe(15000)
    expect(projectMonth(1000, 0, 30)).toBe(0)
    const days = dailySpend([row({ day: '2026-11-02', spendCents: 50 }), row({ day: '2026-11-02', spendCents: 25 })], '2026-11-01', 3)
    expect(days).toEqual([
      { day: '2026-11-01', spendCents: 0 },
      { day: '2026-11-02', spendCents: 75 },
      { day: '2026-11-03', spendCents: 0 },
    ])
  })
})
