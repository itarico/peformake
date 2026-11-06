const shift = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Períodos prontos: semana passada (segunda a domingo), mês atual até hoje e mês passado. */
export function presetRange(preset: 'last_week' | 'this_month' | 'last_month', today: string): { from: string; to: string } {
  if (preset === 'this_month') return { from: `${today.slice(0, 8)}01`, to: today }
  if (preset === 'last_month') {
    const firstThis = `${today.slice(0, 8)}01`
    const lastPrev = shift(firstThis, -1)
    return { from: `${lastPrev.slice(0, 8)}01`, to: lastPrev }
  }
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay() || 7
  const sunday = shift(today, -weekday)
  return { from: shift(sunday, -6), to: sunday }
}
