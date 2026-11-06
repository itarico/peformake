// NPS: nota de 0 a 10. Detrator 0 a 6, neutro 7 a 8, promotor 9 a 10.

export interface NpsAnswer {
  id: string
  clientId: string
  status: 'sent' | 'answered' | 'expired'
  score: number | null
  comment: string | null
  requestedAt: string
  answeredAt: string | null
}

export type NpsCategory = 'detrator' | 'neutro' | 'promotor'

export function category(score: number): NpsCategory {
  return score <= 6 ? 'detrator' : score <= 8 ? 'neutro' : 'promotor'
}

// NPS = % promotores menos % detratores, com a última nota de cada cliente.
export function npsScore(answers: readonly NpsAnswer[]): { nps: number | null; promoters: number; neutrals: number; detractors: number; total: number } {
  const latest = new Map<string, NpsAnswer>()
  for (const a of answers) {
    if (a.score === null) continue
    const cur = latest.get(a.clientId)
    if (!cur || (a.answeredAt ?? '') > (cur.answeredAt ?? '')) latest.set(a.clientId, a)
  }
  const scores = [...latest.values()].map((a) => a.score as number)
  const promoters = scores.filter((s) => s >= 9).length
  const detractors = scores.filter((s) => s <= 6).length
  const total = scores.length
  return {
    nps: total ? Math.round(((promoters - detractors) / total) * 100) : null,
    promoters,
    neutrals: total - promoters - detractors,
    detractors,
    total,
  }
}

// Pode pedir de novo só depois de 25 dias do último pedido.
export function canAsk(clientId: string, answers: readonly NpsAnswer[], now: Date): boolean {
  const last = answers.filter((a) => a.clientId === clientId).map((a) => a.requestedAt).sort().pop()
  return !last || now.getTime() - new Date(last).getTime() > 25 * 86_400_000
}
