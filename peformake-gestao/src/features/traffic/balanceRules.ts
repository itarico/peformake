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

/** check = leitura velha com estimativa folgada: não dá para dizer "em dia", só "Confira o saldo". */
export type BalanceState = 'problem' | 'low' | 'ending' | 'check' | 'ok' | 'postpaid' | 'unknown'

export interface BalanceView {
  state: BalanceState
  /** Texto da situação (muda quando o número é estimativa). */
  stateLabel: string
  /** Saldo pré-pago ou o que falta até o limite de gasto. Na leitura velha, é a estimativa. */
  remainingCents: number | null
  remainingLabel: string
  /** O número é estimativa (leitura com mais de 24 h). */
  estimated: boolean
  /** "lido hoje 14:05", "lido ontem 09:10", "lido há 7 dias". */
  readLabel: string | null
  averageCents: number
  yesterdayCents: number
  todayCents: number
  daysLeft: number | null
}

/** Saldo que dura até 3 dias pede recarga já. */
export const ENDING_DAYS = 3
/** Leitura com até 24 h vale como está. Depois disso o saldo é estimado. */
export const FRESH_HOURS = 24
/** Estimativa com leitura mais velha que isso não é confiável (o gasto acumulado erra demais). */
export const ESTIMATE_MAX_DAYS = 14
/** Quantos dias de gasto a tela precisa carregar para estimar. */
export const METRICS_DAYS = ESTIMATE_MAX_DAYS + 1

const TZ = 'America/Recife'
const dayOf = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso))
const timeOf = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short', timeZone: TZ }).format(new Date(iso))
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)

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

/** Quando o saldo foi lido, do jeito que a equipe fala. */
export function readAgeLabel(readAt: string, today: string): string {
  const days = daysBetween(dayOf(readAt), today)
  if (days <= 0) return `lido hoje ${timeOf(readAt)}`
  if (days === 1) return `lido ontem ${timeOf(readAt)}`
  return `lido há ${days} dias`
}

/**
 * Gasto desde a leitura: dias depois do dia da leitura contam inteiros; o dia da leitura conta pela metade,
 * porque parte do gasto daquele dia já estava descontada no saldo lido. Mesma regra de public.traffic_balance_now.
 */
export function spentSinceRead(rows: readonly DailyMetric[], readAt: string): number {
  const readDay = dayOf(readAt)
  return Math.round(rows.reduce((sum, row) => (row.day > readDay ? sum + row.spendCents : row.day === readDay ? sum + row.spendCents / 2 : sum), 0))
}

export function describeBalance(
  status: AccountStatus | null,
  rows: readonly DailyMetric[],
  today: string,
  alertCents: number,
  now: Date = new Date(),
): BalanceView {
  const spendOn = (day: string) => rows.filter((row) => row.day === day).reduce((sum, row) => sum + row.spendCents, 0)
  const averageCents = averageDailySpend(rows, today)
  const base = { averageCents, yesterdayCents: spendOn(minus(today, 1)), todayCents: spendOn(today) }

  if (!status) {
    return { ...base, state: 'unknown', stateLabel: STATE_LABEL.unknown, remainingCents: null, remainingLabel: 'Ainda não lido', estimated: false, readLabel: null, daysLeft: null }
  }

  let readCents: number | null = null
  let remainingLabel = 'Pós-pago, sem saldo'
  if (status.isPrepaid && status.availableCents !== null) {
    readCents = status.availableCents
    remainingLabel = 'Saldo disponível'
  } else if (status.isPrepaid) {
    remainingLabel = 'Pré-pago, saldo não informado'
  } else if (status.spendCapCents && status.amountSpentCents !== null) {
    readCents = Math.max(status.spendCapCents - status.amountSpentCents, 0)
    remainingLabel = 'Até o limite de gasto'
  }

  const ageHours = (now.getTime() - Date.parse(status.readAt)) / 3_600_000
  const stale = ageHours > FRESH_HOURS
  const reliable = ageHours <= ESTIMATE_MAX_DAYS * 24
  const readLabel = readAgeLabel(status.readAt, today)

  let remainingCents = readCents
  let estimated = false
  if (readCents !== null && stale) {
    if (reliable) {
      remainingCents = Math.max(readCents - spentSinceRead(rows, status.readAt), 0)
      estimated = true
      remainingLabel = 'Estimativa: confira na Meta'
    } else {
      remainingCents = null
      remainingLabel = 'Leitura velha demais'
    }
  }

  const daysLeft = remainingCents !== null && averageCents > 0 ? Math.floor(remainingCents / averageCents) : null
  let state: BalanceState
  if (status.accountStatus !== null && status.accountStatus !== 1) state = 'problem'
  else if (remainingCents === null) state = readCents !== null || status.isPrepaid ? 'unknown' : 'postpaid'
  else if (remainingCents < alertCents) state = 'low'
  else if (daysLeft !== null && daysLeft <= ENDING_DAYS) state = 'ending'
  else state = estimated ? 'check' : 'ok'

  const stateLabel = estimated && (state === 'low' || state === 'ending') ? 'Pode estar acabando'
    : state === 'unknown' && readCents !== null ? 'Confira o saldo'
    : STATE_LABEL[state]
  return { ...base, state, stateLabel, remainingCents, remainingLabel, estimated, readLabel, daysLeft }
}

export const STATE_LABEL: Record<BalanceState, string> = {
  problem: 'Conta com restrição',
  low: 'Saldo baixo',
  ending: 'Acaba em poucos dias',
  check: 'Confira o saldo',
  ok: 'Saldo em dia',
  postpaid: 'Pós-pago',
  unknown: 'Sem leitura de saldo',
}

const ORDER: Record<BalanceState, number> = { problem: 0, low: 1, ending: 2, unknown: 3, check: 4, ok: 5, postpaid: 6 }

/** Mais urgente primeiro; empate pelo que acaba antes. */
export function byUrgency(a: BalanceView, b: BalanceView): number {
  return ORDER[a.state] - ORDER[b.state] || (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity)
}

/** "137,23" / "R$ 1.234,56" / "137.23" / "137" -> centavos. Nulo se não for um valor válido. */
export function parseReais(raw: string): number | null {
  let s = raw.trim().replace(/R\$\s?/i, '').replace(/\s/g, '')
  if (!s || !/^[\d.,]+$/.test(s)) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
  // Ponto como milhar ("1.234") quando há 3 dígitos depois do último ponto e nenhuma vírgula.
  else if (lastComma === -1 && lastDot !== -1 && s.length - lastDot - 1 === 3) s = s.replace(/\./g, '')
  else s = s.replace(/,/g, '')
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return null
  return Math.round(n * 100)
}
