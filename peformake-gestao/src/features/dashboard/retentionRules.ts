// Contas de relacionamento com o cliente: retenção, cancelamento por mês e NPS. Sem valores em dinheiro.

export interface FlowMonth {
  month: string
  at_start: number
  joined: number
  left: number
}

/**
 * Retenção nos últimos N meses: de quem já era cliente no começo do período, quantos continuam.
 * (ativos no fim - novos no período) / ativos no começo. Sem base no começo, não há como medir.
 */
export function retentionRate(flow: readonly FlowMonth[], months: number): number | null {
  const window = flow.slice(-months)
  const first = window[0]
  if (!first || first.at_start === 0) return null
  const last = window[window.length - 1]!
  const endActive = last.at_start + last.joined - last.left
  const joined = window.reduce((s, m) => s + m.joined, 0)
  return Math.max(0, Math.min(100, ((endActive - joined) / first.at_start) * 100))
}

/** Média de cancelamento por mês: saídas sobre quem era cliente no começo de cada mês. */
export function monthlyChurn(flow: readonly FlowMonth[]): number | null {
  const base = flow.filter((m) => m.at_start > 0)
  const start = base.reduce((s, m) => s + m.at_start, 0)
  if (start === 0) return null
  return (base.reduce((s, m) => s + m.left, 0) / start) * 100
}

/** NPS = % promotores - % detratores, de -100 a 100. */
export function npsScore(n: { answers: number; promoters: number; detractors: number }): number | null {
  if (n.answers === 0) return null
  return Math.round(((n.promoters - n.detractors) / n.answers) * 100)
}

export function npsLabel(score: number | null): string {
  if (score === null) return 'Sem respostas'
  if (score >= 75) return 'Excelente'
  if (score >= 50) return 'Muito bom'
  if (score >= 0) return 'Razoável'
  return 'Crítico'
}

export function monthsText(n: number | null): string {
  if (n === null || Number.isNaN(n)) return 'Sem dado'
  if (n < 1) return 'Menos de 1 mês'
  const rounded = Math.round(n * 10) / 10
  return `${String(rounded).replace('.', ',')} ${rounded === 1 ? 'mês' : 'meses'}`
}
