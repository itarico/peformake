import type { DailyMetric } from './metricsRules'

export interface AccountStatus {
  accountId: string
  accountStatus: number | null
  isPrepaid: boolean | null
  availableCents: number | null
  spendCapCents: number | null
  amountSpentCents: number | null
  balanceDueCents: number | null
  fundingText: string | null
  readAt: string
}

export type BalanceState = 'problem' | 'low' | 'ending' | 'ok' | 'postpaid' | 'unknown'

export interface BalanceView {
  state: BalanceState
  /** Saldo pré-pago ou o que falta até o limite de gasto. */
  remainingCents: number | null
  remainingLabel: string
  averageCents: number
  yesterdayCents: number
  todayCents: number
  daysLeft: number | null
}

/** Saldo que dura até 3 dias pede recarga já. */
export const ENDING_DAYS = 3

const minus = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Média dos 7 dias completos antes de hoje, contando só dias com gasto. */
export function averageDailySpend(rows: readonly DailyMetric[], today: string): number {
  const from = minus(today, 7)
  const spent = rows.filter((row) => row.day >= from && row.day < today && row.spendCents > 0).map((row) => row.spendCents)
  return spent.length ? Math.round(spent.reduce((a, b) => a + b, 0) / spent.length) : 0
}

export function describeBalance(status: AccountStatus | null, rows: readonly DailyMetric[], today: string, alertCents: number): BalanceView {
  const spendOn = (day: string) => rows.filter((row) => row.day === day).reduce((sum, row) => sum + row.spendCents, 0)
  const averageCents = averageDailySpend(rows, today)
  const base = { averageCents, yesterdayCents: spendOn(minus(today, 1)), todayCents: spendOn(today) }

  if (!status) return { ...base, state: 'unknown', remainingCents: null, remainingLabel: 'Ainda não lido', daysLeft: null }

  let remainingCents: number | null = null
  let remainingLabel = 'Pós-pago, sem saldo'
  if (status.isPrepaid && status.availableCents !== null) {
    remainingCents = status.availableCents
    remainingLabel = 'Saldo disponível'
  } else if (status.isPrepaid) {
    remainingLabel = 'Pré-pago, saldo não informado pela Meta'
  } else if (status.spendCapCents && status.amountSpentCents !== null) {
    remainingCents = Math.max(status.spendCapCents - status.amountSpentCents, 0)
    remainingLabel = 'Até o limite de gasto'
  }

  const daysLeft = remainingCents !== null && averageCents > 0 ? Math.floor(remainingCents / averageCents) : null
  let state: BalanceState
  if (status.accountStatus !== null && status.accountStatus !== 1) state = 'problem'
  else if (remainingCents === null) state = status.isPrepaid ? 'unknown' : 'postpaid'
  else if (remainingCents < alertCents) state = 'low'
  else if (daysLeft !== null && daysLeft <= ENDING_DAYS) state = 'ending'
  else state = 'ok'

  return { ...base, state, remainingCents, remainingLabel, daysLeft }
}

export const STATE_LABEL: Record<BalanceState, string> = {
  problem: 'Conta com restrição',
  low: 'Saldo baixo',
  ending: 'Acaba em poucos dias',
  ok: 'Saldo em dia',
  postpaid: 'Pós-pago',
  unknown: 'Sem leitura de saldo',
}

const ORDER: Record<BalanceState, number> = { problem: 0, low: 1, ending: 2, unknown: 3, ok: 4, postpaid: 5 }

/** Mais urgente primeiro; empate pelo que acaba antes. */
export function byUrgency(a: BalanceView, b: BalanceView): number {
  return ORDER[a.state] - ORDER[b.state] || (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity)
}
