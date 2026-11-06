// Metas do tráfego: nomes, formato e leitura da situação (o cálculo do mês vem do servidor).

export type GoalMetric = 'cpl' | 'cpa' | 'custo_resultado' | 'roas' | 'leads' | 'vendas' | 'resultados' | 'investimento'
export type GoalStatus = 'batendo' | 'perto' | 'longe' | 'sem_dados'

export interface GoalProgress {
  client_id: string
  client_name: string
  metric: GoalMetric
  target: number
  current: number | null
  projected: number | null
  spend: number
  status: GoalStatus
  pct: number
}

export const GOAL_METRICS: { id: GoalMetric; label: string; short: string; kind: 'custo' | 'razao' | 'volume' | 'verba'; hint: string }[] = [
  { id: 'cpl', label: 'Custo por lead', short: 'CPL', kind: 'custo', hint: 'Abaixo de quanto cada contato deve custar.' },
  { id: 'cpa', label: 'Custo por venda', short: 'CPA', kind: 'custo', hint: 'Abaixo de quanto cada venda deve custar.' },
  { id: 'custo_resultado', label: 'Custo por resultado', short: 'Custo/resultado', kind: 'custo', hint: 'Para campanhas de mensagem, visita ou cadastro.' },
  { id: 'roas', label: 'Retorno sobre o investimento', short: 'ROAS', kind: 'razao', hint: 'Quantas vezes o investimento deve voltar em venda.' },
  { id: 'leads', label: 'Leads no mês', short: 'Leads', kind: 'volume', hint: 'Quantos contatos no mês.' },
  { id: 'vendas', label: 'Vendas no mês', short: 'Vendas', kind: 'volume', hint: 'Quantas vendas rastreadas no mês.' },
  { id: 'resultados', label: 'Resultados no mês', short: 'Resultados', kind: 'volume', hint: 'Mensagens, cadastros ou o resultado da campanha.' },
  { id: 'investimento', label: 'Verba do mês', short: 'Verba', kind: 'verba', hint: 'Não passar deste valor no mês.' },
]
export const GOAL_BY_ID = Object.fromEntries(GOAL_METRICS.map((m) => [m.id, m])) as Record<GoalMetric, (typeof GOAL_METRICS)[number]>

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatGoalValue(metric: GoalMetric, v: number | null): string {
  if (v == null) return '—'
  const kind = GOAL_BY_ID[metric].kind
  if (kind === 'custo' || kind === 'verba') return brl(v)
  if (kind === 'razao') return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}x`
  return Math.round(v).toLocaleString('pt-BR')
}

/** Frase curta da meta: "abaixo de R$ 15,00", "pelo menos 200", "até R$ 2.500,00". */
export function goalSentence(metric: GoalMetric, target: number): string {
  const kind = GOAL_BY_ID[metric].kind
  const v = formatGoalValue(metric, target)
  if (kind === 'custo') return `abaixo de ${v}`
  if (kind === 'verba') return `até ${v}`
  return `pelo menos ${v}`
}

export const STATUS_LABEL: Record<GoalStatus, string> = { batendo: 'Batendo a meta', perto: 'Quase lá', longe: 'Longe da meta', sem_dados: 'Sem dados ainda' }
export const STATUS_TONE: Record<GoalStatus, { chip: string; bar: string }> = {
  batendo: { chip: 'bg-ok-soft text-ok-ink', bar: 'bg-ok' },
  perto: { chip: 'bg-accent-soft text-accent-ink', bar: 'bg-accent' },
  longe: { chip: 'bg-warn-soft text-warn-ink', bar: 'bg-warn' },
  sem_dados: { chip: 'bg-raised text-muted', bar: 'bg-line-strong' },
}

/** Explica o número ao lado da barra: atual e, nas de volume, a projeção para o fim do mês. */
export function goalDetail(g: Pick<GoalProgress, 'metric' | 'current' | 'projected' | 'target'>): string {
  const kind = GOAL_BY_ID[g.metric].kind
  if (g.current == null) return 'Ainda sem dados suficientes neste mês.'
  if (kind === 'volume') return `${formatGoalValue(g.metric, g.current)} até agora · no ritmo atual fecha o mês com ${formatGoalValue(g.metric, g.projected)}`
  if (kind === 'verba') return `${formatGoalValue(g.metric, g.current)} gastos · no ritmo atual vai a ${formatGoalValue(g.metric, g.projected)}`
  return `Agora: ${formatGoalValue(g.metric, g.current)}`
}

/** Resumo de um cliente: quantas metas estão batendo. */
export function goalsSummary(goals: readonly GoalProgress[]): { hit: number; total: number; worst: GoalStatus | null } {
  const order: GoalStatus[] = ['longe', 'perto', 'sem_dados', 'batendo']
  const worst = goals.length ? order.find((s) => goals.some((g) => g.status === s)) ?? null : null
  return { hit: goals.filter((g) => g.status === 'batendo').length, total: goals.length, worst }
}
