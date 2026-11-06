export interface TrafficSettings {
  autoReadEnabled: boolean
  readEveryHours: 1 | 3 | 6 | 12 | 24
  daysBack: 1 | 3 | 7 | 14
  balanceAlertCents: number
}

export const HOUR_OPTIONS = [1, 3, 6, 12, 24] as const
export const DAYS_OPTIONS = [1, 3, 7, 14] as const

/** Converte o texto digitado em reais para centavos. Devolve null se não for um valor válido. */
export function parseReais(text: string): number | null {
  const clean = text.trim().replace(/^R\$\s*/i, '').replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  const cents = Math.round(Number(clean) * 100)
  return cents <= 100_000_000 ? cents : null
}

export function reaisText(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function readsPerDay(hours: TrafficSettings['readEveryHours']): number {
  return 24 / hours
}
