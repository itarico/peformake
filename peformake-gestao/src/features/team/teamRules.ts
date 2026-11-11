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

// ===== Membro: telefone e forma de pagamento =====

/** Só os dígitos locais (DDD + número), sem o 55. */
function localDigits(value: string): string {
  let d = value.replace(/\D/g, '')
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
  return d.slice(0, 11)
}

/** Máscara enquanto digita: "(81) 99999-0000". Aceita o número salvo com 55 na frente. */
export function maskPhone(value: string | null | undefined): string {
  const d = localDigits(value ?? '')
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  const n = d.slice(2)
  const cut = n.length > 8 ? 5 : 4
  return `(${d.slice(0, 2)}) ${n.length > cut ? `${n.slice(0, cut)}-${n.slice(cut)}` : n}`
}

/** Vazio vale (sem telefone). Preenchido precisa ter DDD + 8 ou 9 dígitos. */
export function phoneProblem(value: string): string | null {
  const d = localDigits(value)
  if (!d) return null
  return d.length === 10 || d.length === 11 ? null : 'Telefone com DDD (ex.: (81) 99999-0000).'
}

export type Contract = 'clt' | 'pj' | 'freela' | 'socio'
export type Schedule = 'mensal' | 'quinzenal'
export const CONTRACT_LABEL: Record<Contract, string> = { clt: 'CLT', pj: 'PJ', freela: 'Freela', socio: 'Sócio' }
export const SCHEDULE_LABEL: Record<Schedule, string> = { mensal: 'Mensal', quinzenal: 'Quinzenal' }

/** Etiqueta curta para a lista: "PJ · Quinzenal", "Freela", "Sócio". */
export function payTag(contract: Contract | null | undefined, schedule: Schedule | null | undefined): string | null {
  if (!contract) return null
  return contract === 'socio' ? 'Sócio' : `${CONTRACT_LABEL[contract]} · ${SCHEDULE_LABEL[schedule ?? 'mensal']}`
}

/** Como o fixo vira contas a pagar: mensal, tudo no dia 30; quinzenal, adiantamento no dia 15 e o saldo no dia 30. */
export function fixedInstallments(base: number, schedule: Schedule, advancePct: number): { day: 15 | 30; amount: number }[] {
  if (base <= 0) return []
  if (schedule === 'mensal') return [{ day: 30, amount: base }]
  const first = Math.round(base * advancePct) / 100
  return [{ day: 15, amount: first }, { day: 30, amount: Math.round((base - first) * 100) / 100 }]
}

/** Próximo dia de pagamento da pessoa a partir de uma data ISO (fevereiro: último dia do mês). */
export function nextPayday(fromIso: string, schedule: Schedule): string {
  const [y = 1970, m = 1, d = 1] = fromIso.split('-').map(Number)
  const last = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate()
  const iso = (yy: number, mm: number, dd: number) => `${yy}-${String(mm).padStart(2, '0')}-${String(Math.min(dd, last(yy, mm))).padStart(2, '0')}`
  const days = schedule === 'quinzenal' ? [15, 30] : [30]
  for (const day of days) if (Math.min(day, last(y, m)) >= d) return iso(y, m, day)
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  return iso(ny, nm, days[0] ?? 30)
}
