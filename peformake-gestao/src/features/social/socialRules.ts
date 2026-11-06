// Social Media: nomes e regras de tela.

export type Network = 'instagram' | 'tiktok' | 'youtube' | 'google_business' | 'geral'
export type TaskStatus = 'a_fazer' | 'fazendo' | 'revisao' | 'feito'
export type TaskSource = 'manual' | 'pedido_cliente' | 'estrategia' | 'agente' | 'novidade'

export const NETWORKS: { id: Exclude<Network, 'geral'>; label: string; ready: boolean }[] = [
  { id: 'instagram', label: 'Instagram', ready: true },
  { id: 'tiktok', label: 'TikTok', ready: false },
  { id: 'youtube', label: 'YouTube', ready: false },
  { id: 'google_business', label: 'Google Meu Negócio', ready: false },
]
export const NETWORK_LABEL: Record<Network, string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', google_business: 'Google Meu Negócio', geral: 'Geral' }

export const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'a_fazer', label: 'A fazer' },
  { id: 'fazendo', label: 'Fazendo' },
  { id: 'revisao', label: 'Em revisão' },
  { id: 'feito', label: 'Feito' },
]
export const SOURCE_LABEL: Record<TaskSource, string> = { manual: 'Manual', pedido_cliente: 'Pedido do cliente', estrategia: 'Estratégia aprovada', agente: 'Sugestão do agente', novidade: 'Novidade da rede' }
export const SOURCE_TONE: Record<TaskSource, string> = {
  manual: 'bg-raised text-muted', pedido_cliente: 'bg-warn-soft text-warn-ink', estrategia: 'bg-accent-soft text-accent-ink', agente: 'bg-ok-soft text-ok-ink', novidade: 'bg-raised text-ink',
}

export interface BriefingProgressInput { hasNotes: boolean; planned: boolean; items: number; briefed: number }

/** Briefing do mês por cliente: pauta escrita, peças criadas, peças com briefing pronto e planejamento fechado. */
export function briefingProgress(p: BriefingProgressInput): { pct: number; label: string; step: number } {
  const steps = [p.hasNotes, p.items > 0, p.items > 0 && p.briefed >= p.items, p.planned]
  const done = steps.filter(Boolean).length
  const label = p.planned ? 'Pronto para o design' : !p.hasNotes ? 'Falta a pauta do mês' : p.items === 0 ? 'Falta criar as peças' : p.briefed < p.items ? `${p.items - p.briefed} peças sem briefing` : 'Falta fechar o planejamento'
  return { pct: Math.round((done / steps.length) * 100), label, step: done }
}

/** Próxima posição ao jogar o cartão no fim da coluna. */
export function nextPosition(positions: readonly number[]): number {
  return positions.length ? Math.max(...positions) + 1 : 1
}
