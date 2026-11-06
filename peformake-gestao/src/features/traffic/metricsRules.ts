export interface DailyMetric {
  accountId: string
  day: string
  spendCents: number
  impressions: number
  clicks: number
  leads: number
  purchases: number
  purchaseValueCents: number
  results: number | null
  resultType: string | null
  readAt: string
}

export interface Periods {
  current: { from: string; to: string }
  previous: { from: string; to: string }
  daysInMonth: number
  dayOfMonth: number
}

const iso = (year: number, monthIndex: number, day: number) => {
  const date = new Date(Date.UTC(year, monthIndex, day))
  return date.toISOString().slice(0, 10)
}

const lastDay = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

/** Data de hoje no fuso de Recife, no formato AAAA-MM-DD. */
export function todayInBrazil(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife' }).format(new Date())
}

/** Mês atual até hoje, comparado com os mesmos dias do mês anterior. */
export function currentPeriods(today: string): Periods {
  const [year = 0, month = 1, day = 1] = today.split('-').map(Number)
  const monthIndex = month - 1
  const previousLast = lastDay(year, monthIndex - 1)
  return {
    current: { from: iso(year, monthIndex, 1), to: today },
    previous: { from: iso(year, monthIndex - 1, 1), to: iso(year, monthIndex - 1, Math.min(day, previousLast)) },
    daysInMonth: lastDay(year, monthIndex),
    dayOfMonth: day,
  }
}

/** Mês anterior inteiro. */
export function lastMonthRange(today: string): { from: string; to: string } {
  const [year = 0, month = 1] = today.split('-').map(Number)
  return { from: iso(year, month - 2, 1), to: iso(year, month - 2, lastDay(year, month - 2)) }
}

export interface Totals {
  spendCents: number
  impressions: number
  clicks: number
  leads: number
  conversations: number
  purchases: number
  purchaseValueCents: number
  ctr: number | null
  cpmCents: number | null
  roas: number | null
}

export function sumMetrics(rows: readonly DailyMetric[]): Totals {
  const totals = rows.reduce(
    (acc, row) => ({
      spendCents: acc.spendCents + row.spendCents,
      impressions: acc.impressions + row.impressions,
      clicks: acc.clicks + row.clicks,
      leads: acc.leads + row.leads,
      conversations: acc.conversations + (row.resultType?.includes('messaging_conversation_started') ? (row.results ?? 0) : 0),
      purchases: acc.purchases + row.purchases,
      purchaseValueCents: acc.purchaseValueCents + row.purchaseValueCents,
    }),
    { spendCents: 0, impressions: 0, clicks: 0, leads: 0, conversations: 0, purchases: 0, purchaseValueCents: 0 },
  )
  return {
    ...totals,
    ctr: totals.impressions ? (totals.clicks / totals.impressions) * 100 : null,
    cpmCents: totals.impressions ? (totals.spendCents / totals.impressions) * 1000 : null,
    roas: totals.spendCents && totals.purchaseValueCents ? totals.purchaseValueCents / totals.spendCents : null,
  }
}

export function inRange(rows: readonly DailyMetric[], from: string, to: string): DailyMetric[] {
  return rows.filter((row) => row.day >= from && row.day <= to)
}

export function changeLabel(current: number, previous: number): string {
  if (!previous) return current ? 'Sem base no mês anterior' : 'Sem movimento'
  const change = Math.round(((current - previous) / previous) * 100)
  if (change === 0) return 'Igual aos mesmos dias do mês anterior'
  return `${change > 0 ? '+' : ''}${change}% contra os mesmos dias do mês anterior`
}

export function projectMonth(spendCents: number, dayOfMonth: number, daysInMonth: number): number {
  return dayOfMonth > 0 ? Math.round((spendCents / dayOfMonth) * daysInMonth) : 0
}

export function dailySpend(rows: readonly DailyMetric[], from: string, totalDays: number): { day: string; spendCents: number }[] {
  const byDay = new Map<string, number>()
  for (const row of rows) byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.spendCents)
  const [year = 0, month = 1, first = 1] = from.split('-').map(Number)
  return Array.from({ length: totalDays }, (_, index) => {
    const day = iso(year, month - 1, first + index)
    return { day, spendCents: byDay.get(day) ?? 0 }
  })
}

export const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const brl0 = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
