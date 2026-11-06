// Contas e formatos dos gráficos. Sem dependência de tela, para testar.

export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null
  const pct = ((current - previous) / Math.abs(previous)) * 100
  // Base anterior pequena demais (ex.: R$ 30 contra R$ 4.500): o número assusta e não diz nada. A tela mostra "sem base para comparar".
  return Math.abs(pct) > 500 ? null : pct
}

// Teto "bonito" do eixo: 1, 2 ou 5 vezes uma potência de 10, acima do maior valor.
export function niceMax(max: number): number {
  if (!(max > 0)) return 1
  const power = 10 ** Math.floor(Math.log10(max))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= max) ?? 10
  return step * power
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brlCents = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const int = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

export const fmt = {
  money: (cents: number) => brl.format(cents / 100),
  moneyExact: (cents: number) => brlCents.format(cents / 100),
  int: (n: number) => int.format(n),
  compact: (n: number) => compact.format(n),
  pct: (n: number, digits = 0) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`,
}

export function deltaText(pct: number | null): string {
  if (pct === null) return 'sem base para comparar'
  const rounded = Math.round(pct)
  if (rounded === 0) return 'igual ao período anterior'
  return `${rounded > 0 ? '+' : ''}${rounded}% contra o período anterior`
}

// Cor do delta pelo sentido do bom: custo subir é ruim, resultado subir é bom.
export function deltaTone(pct: number | null, goodWhenUp: boolean): 'good' | 'bad' | 'neutral' {
  if (pct === null || Math.abs(pct) < 1) return 'neutral'
  return pct > 0 === goodWhenUp ? 'good' : 'bad'
}

export function dayLabel(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

// Preenche os dias sem dado com zero, para a série não pular dias.
export function fillDays(from: string, to: string, rows: readonly { day: string; value: number }[]): { day: string; value: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r.value]))
  const out: { day: string; value: number }[] = []
  for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10)
    out.push({ day, value: byDay.get(day) ?? 0 })
  }
  return out
}
