// Regras de tela do agente na nuvem: recomendações, estratégias e passadas das rotinas.

export type RecommendationKind = 'risco' | 'oportunidade' | 'criativo' | 'orcamento' | 'rastreamento' | 'outro'
export type StrategyModule = 'diagnostico' | 'ofertas' | 'campanhas' | 'publicos' | 'criativos' | 'roteiros' | 'conteudo' | 'copies' | 'whatsapp' | 'testes' | 'pedidos' | 'reuniao'
export type Routine = 'daily' | 'inbox' | 'weekly' | 'monthly' | 'manual'

export interface Recommendation {
  id: string
  day: string
  clientId: string | null
  kind: RecommendationKind
  priority: 'high' | 'normal' | 'low'
  title: string
  body: string
  taskId: string | null
  status: 'open' | 'done' | 'dismissed'
}

export interface StrategyItem {
  id: string
  strategyId: string
  module: StrategyModule
  title: string
  body: string
  position: number
  status: 'proposed' | 'approved' | 'rejected'
  taskId: string | null
}

export interface Strategy {
  id: string
  clientId: string
  kind: 'weekly' | 'monthly'
  periodStart: string
  periodEnd: string
  summary: string
  updatedAt: string
  items: StrategyItem[]
}

export interface AgentRun {
  id: string
  routine: Routine
  startedAt: string
  finishedAt: string | null
  ok: boolean | null
  summary: string | null
}

export const KIND_LABEL: Record<RecommendationKind, string> = {
  risco: 'Risco',
  oportunidade: 'Oportunidade',
  criativo: 'Criativo',
  orcamento: 'Orçamento',
  rastreamento: 'Rastreamento',
  outro: 'Outro',
}

export const MODULE_LABEL: Record<StrategyModule, string> = {
  diagnostico: 'Diagnóstico',
  ofertas: 'Ofertas e ações',
  campanhas: 'Campanhas',
  publicos: 'Públicos',
  criativos: 'Artes',
  roteiros: 'Roteiros de vídeo',
  conteudo: 'Conteúdo das redes',
  copies: 'Textos dos anúncios',
  whatsapp: 'WhatsApp',
  testes: 'Testes',
  pedidos: 'Pedidos ao cliente',
  reuniao: 'Reunião',
}
const MODULE_ORDER = Object.keys(MODULE_LABEL) as StrategyModule[]

export const ROUTINE_LABEL: Record<Routine, string> = {
  daily: 'Análise diária',
  inbox: 'Caixa de mensagens',
  weekly: 'Estrategista semanal',
  monthly: 'Estrategista mensal',
  manual: 'Rodada manual',
}

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 } as const

// Abertas primeiro, depois por prioridade.
export function sortRecommendations(list: readonly Recommendation[]): Recommendation[] {
  return [...list].sort((a, b) =>
    Number(a.status !== 'open') - Number(b.status !== 'open')
    || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    || b.day.localeCompare(a.day))
}

export function groupByModule<T extends { module: StrategyModule; position: number }>(items: readonly T[]): { module: StrategyModule; items: T[] }[] {
  return MODULE_ORDER
    .map((module) => ({ module, items: items.filter((i) => i.module === module).sort((a, b) => a.position - b.position) }))
    .filter((g) => g.items.length > 0)
}

export function pendingItems(strategy: Strategy): number {
  return strategy.items.filter((i) => i.status === 'proposed').length
}

// Última passada de cada rotina, para mostrar se o agente está rodando.
export function lastRunByRoutine(runs: readonly AgentRun[]): Partial<Record<Routine, AgentRun>> {
  const result: Partial<Record<Routine, AgentRun>> = {}
  for (const run of runs) {
    const current = result[run.routine]
    if (!current || run.startedAt > current.startedAt) result[run.routine] = run
  }
  return result
}

export function runStatus(run: AgentRun | undefined, now: Date): 'never' | 'running' | 'failed' | 'ok' | 'stuck' {
  if (!run) return 'never'
  if (run.finishedAt === null) {
    return now.getTime() - new Date(run.startedAt).getTime() > 60 * 60 * 1000 ? 'stuck' : 'running'
  }
  return run.ok ? 'ok' : 'failed'
}

export function whenText(iso: string, now: Date): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  const day = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  if (day(date) === day(now)) return `hoje às ${time}`
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  if (day(date) === day(yesterday)) return `ontem às ${time}`
  return `${day(date).slice(0, 5)} às ${time}`
}
