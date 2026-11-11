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

// ===== Saúde da carteira em um número só (0 a 100) =====
// Média da última avaliação de cada cliente ativo: muito bom 100, bom 75, neutro 50, ruim 25, muito ruim 0.
const HEALTH_POINTS: Record<string, number> = { muito_bom: 100, bom: 75, neutro: 50, ruim: 25, muito_ruim: 0 }

export function healthScore(health: Readonly<Record<string, number>>): number | null {
  let n = 0
  let sum = 0
  for (const [level, count] of Object.entries(health)) {
    const p = HEALTH_POINTS[level]
    if (p === undefined || !count) continue
    n += count
    sum += p * count
  }
  return n ? Math.round(sum / n) : null
}

export type HealthBand = 'ruim' | 'atencao' | 'boa'
export const HEALTH_BAND_LABEL: Record<HealthBand, string> = { ruim: 'Ruim', atencao: 'Atenção', boa: 'Boa' }
/** Faixas do velocímetro: até 39 ruim, 40 a 69 atenção, 70 ou mais boa. */
export const HEALTH_BANDS = { atencao: 40, boa: 70 } as const
export function healthBand(score: number): HealthBand {
  if (score >= HEALTH_BANDS.boa) return 'boa'
  if (score >= HEALTH_BANDS.atencao) return 'atencao'
  return 'ruim'
}

// ===== Funil: quantos chegaram até cada etapa e quanto passou de uma para a outra =====
export interface FunnelStep { label: string; value: number; conversion: number | null }

/**
 * Recebe quantos estão parados em cada etapa (na ordem do funil) e devolve quantos chegaram
 * pelo menos até ela (a etapa e todas as seguintes). Fica sempre decrescente.
 * conversion = % que passou da etapa anterior para esta (a primeira não tem).
 */
export function funnelSteps(stages: readonly { label: string; value: number }[]): FunnelStep[] {
  const reached = stages.map((_, i) => stages.slice(i).reduce((s, x) => s + Math.max(0, x.value), 0))
  return stages.map((s, i) => {
    const prev = i > 0 ? reached[i - 1]! : null
    return { label: s.label, value: reached[i]!, conversion: prev === null ? null : prev > 0 ? Math.round((reached[i]! / prev) * 100) : 0 }
  })
}

/** Dias desde uma data (AAAA-MM-DD) até hoje. */
export function daysSince(date: string, today: string): number {
  return Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000)
}
