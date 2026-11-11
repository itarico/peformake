import { describe, expect, it } from 'vitest'
import { averageDailySpend, byUrgency, describeBalance, parseReais, readAgeLabel, spentSinceRead, type AccountStatus } from './balanceRules'
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
// "Agora" do teste: 03/11 às 11:00 em Recife, uma hora depois da leitura padrão.
const NOW = new Date('2026-11-03T14:00:00Z')

describe('média diária', () => {
  it('usa só os 7 dias antes de hoje com gasto', () => {
    expect(averageDailySpend(rows, TODAY)).toBe(3000)
  })
})

describe('saldo', () => {
  it('calcula quantos dias o saldo dura', () => {
    expect(describeBalance(status(), rows, TODAY, 4000, NOW)).toMatchObject({ state: 'ok', remainingCents: 30000, daysLeft: 10, yesterdayCents: 2000, todayCents: 900 })
  })

  it('marca saldo baixo e saldo que acaba em poucos dias', () => {
    expect(describeBalance(status({ availableCents: 3000 }), rows, TODAY, 4000, NOW).state).toBe('low')
    expect(describeBalance(status({ availableCents: 8000 }), rows, TODAY, 4000, NOW)).toMatchObject({ state: 'ending', daysLeft: 2 })
  })

  it('usa o limite de gasto no pós-pago e trata conta sem limite', () => {
    expect(describeBalance(status({ isPrepaid: false, availableCents: null, spendCapCents: 50000, amountSpentCents: 44000 }), rows, TODAY, 4000, NOW))
      .toMatchObject({ remainingCents: 6000, remainingLabel: 'Até o limite de gasto', state: 'ending' })
    expect(describeBalance(status({ isPrepaid: false, availableCents: null }), rows, TODAY, 4000, NOW).state).toBe('postpaid')
  })

  it('restrição da Meta vem antes de tudo; sem leitura fica desconhecido', () => {
    expect(describeBalance(status({ accountStatus: 2 }), rows, TODAY, 4000, NOW).state).toBe('problem')
    expect(describeBalance(null, rows, TODAY, 4000, NOW).state).toBe('unknown')
    expect(describeBalance(status({ availableCents: null }), rows, TODAY, 4000, NOW).state).toBe('unknown')
  })

  it('ordena pelo mais urgente', () => {
    const list = [
      describeBalance(status(), rows, TODAY, 4000, NOW),
      describeBalance(status({ availableCents: 8000 }), rows, TODAY, 4000, NOW),
      describeBalance(status({ accountStatus: 3 }), rows, TODAY, 4000, NOW),
    ]
    expect([...list].sort(byUrgency).map((item) => item.state)).toEqual(['problem', 'ending', 'ok'])
  })
})

describe('leitura velha', () => {
  // Saldo lido em 01/11 às 09:00 (Recife). Hoje é 03/11.
  const old = (over: Partial<AccountStatus> = {}) => status({ readAt: '2026-11-01T12:00:00Z', ...over })

  it('diz quando o saldo foi lido', () => {
    expect(readAgeLabel('2026-11-03T13:05:00Z', TODAY)).toBe('lido hoje 10:05')
    expect(readAgeLabel('2026-11-02T13:05:00Z', TODAY)).toBe('lido ontem 10:05')
    expect(readAgeLabel('2026-10-27T13:05:00Z', TODAY)).toBe('lido há 7 dias')
  })

  it('gasto desde a leitura: dia da leitura pela metade, dias seguintes inteiros', () => {
    expect(spentSinceRead(rows, '2026-11-01T12:00:00Z')).toBe(2000 + 2000 + 900)
  })

  it('leitura de até 24 h vale como está', () => {
    expect(describeBalance(status({ readAt: '2026-11-02T16:00:00Z' }), rows, TODAY, 4000, NOW)).toMatchObject({ estimated: false, remainingCents: 30000, state: 'ok' })
  })

  it('leitura velha vira estimativa e nunca "Saldo em dia"', () => {
    const view = describeBalance(old(), rows, TODAY, 4000, NOW)
    expect(view).toMatchObject({ estimated: true, remainingCents: 30000 - 4900, state: 'check', stateLabel: 'Confira o saldo', remainingLabel: 'Estimativa: confira na Meta' })
  })

  it('estimativa abaixo do alerta: pode estar acabando', () => {
    expect(describeBalance(old({ availableCents: 8000 }), rows, TODAY, 4000, NOW)).toMatchObject({ state: 'low', stateLabel: 'Pode estar acabando', remainingCents: 3100 })
    expect(describeBalance(old({ availableCents: 3000 }), rows, TODAY, 4000, NOW)).toMatchObject({ remainingCents: 0, stateLabel: 'Pode estar acabando' })
    expect(describeBalance(old({ availableCents: 12000 }), rows, TODAY, 4000, NOW)).toMatchObject({ state: 'ending', stateLabel: 'Pode estar acabando', daysLeft: 2 })
  })

  it('leitura com mais de 14 dias não é confiável', () => {
    expect(describeBalance(status({ readAt: '2026-10-15T12:00:00Z' }), rows, TODAY, 4000, NOW))
      .toMatchObject({ state: 'unknown', stateLabel: 'Confira o saldo', remainingCents: null, estimated: false })
  })

  it('restrição continua na frente', () => {
    expect(describeBalance(old({ accountStatus: 2 }), rows, TODAY, 4000, NOW).state).toBe('problem')
  })
})

describe('valor digitado', () => {
  it('aceita vírgula, ponto e R$', () => {
    expect(parseReais('137,23')).toBe(13723)
    expect(parseReais('R$ 1.234,56')).toBe(123456)
    expect(parseReais('137.23')).toBe(13723)
    expect(parseReais('1.234')).toBe(123400)
    expect(parseReais('80')).toBe(8000)
    expect(parseReais('')).toBeNull()
    expect(parseReais('abc')).toBeNull()
    expect(parseReais('-5')).toBeNull()
  })
})
