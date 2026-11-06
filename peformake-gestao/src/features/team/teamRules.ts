// Regras da área da equipe (o cálculo de valor fica no servidor; aqui só a leitura do progresso).

export const LEAD_STAGES = [
  ['novo', 'Novo'],
  ['contato', 'Em contato'],
  ['reuniao', 'Reunião marcada'],
  ['proposta', 'Proposta enviada'],
  ['ganho', 'Virou cliente'],
  ['perdido', 'Não fechou'],
] as const
export type LeadStage = (typeof LEAD_STAGES)[number][0]
export const LEAD_STAGE_LABEL = Object.fromEntries(LEAD_STAGES) as Record<LeadStage, string>

export const METRIC_LABEL: Record<string, string> = {
  leads: 'Leads trazidos no mês',
  clientes_trazidos: 'Clientes trazidos (total)',
  receita_trazida: 'Receita trazida no mês (R$)',
  entregas: 'Entregas aprovadas no mês',
}

export interface MemberDashboard {
  settings: { sourcing_enabled: boolean; sourcing_pct: number; sourcing_months: number; partnership_enabled: boolean; partnership_min_revenue: number; partnership_min_months: number; goals_enabled: boolean }
  leads: { month: number; open: number; won: number }
  clients: { id: string; name: string; since: string | null; active: boolean }[]
  commission: number
  revenue_brought: number
  months_with_revenue: number
  deliveries: number
  goals: { metric: string; target: number }[]
}

/** Valor atual de uma meta a partir do painel. */
export function goalValue(d: MemberDashboard, metric: string): number {
  if (metric === 'leads') return d.leads.month
  if (metric === 'clientes_trazidos') return d.clients.length
  if (metric === 'receita_trazida') return Number(d.revenue_brought)
  if (metric === 'entregas') return d.deliveries
  return 0
}

/** Trilha de sociedade: precisa gerar a receita mínima por mês, em N meses seguidos. */
export function partnershipProgress(d: MemberDashboard): { pctRevenue: number; months: number; needed: number; ready: boolean } {
  const min = Number(d.settings.partnership_min_revenue)
  const pctRevenue = min > 0 ? Math.min(100, Math.round((Number(d.revenue_brought) / min) * 100)) : 100
  const needed = d.settings.partnership_min_months
  return { pctRevenue, months: d.months_with_revenue, needed, ready: pctRevenue >= 100 && d.months_with_revenue >= needed }
}
