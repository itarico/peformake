// Regras do Início: quem olhar hoje e o que pede ação.

import type { AttentionFlag } from '@/features/clients/portfolioRules'

// Peso de cada ponto de atenção. Contrato vencido e relacionamento ruim vêm antes.
const WEIGHT: Record<AttentionFlag, number> = { expired: 5, risk: 4, ending: 3, no_team: 2, no_service: 2, stale: 1, upsell: 1 }

export function attentionScore(flags: readonly AttentionFlag[]): number {
  return flags.reduce((s, f) => s + WEIGHT[f], 0)
}

export function clientsToCall<T extends { flags: readonly AttentionFlag[]; client: { isActive: boolean; name: string } }>(views: readonly T[], limit = 6): T[] {
  return views
    .filter((v) => v.client.isActive && v.flags.length > 0)
    .sort((a, b) => attentionScore(b.flags) - attentionScore(a.flags) || a.client.name.localeCompare(b.client.name, 'pt-BR'))
    .slice(0, limit)
}

// Quanto da receita depende dos maiores clientes.
export function concentration(values: readonly number[]): { top1: number; top3: number; total: number } {
  const sorted = values.filter((v) => v > 0).sort((a, b) => b - a)
  const total = sorted.reduce((s, v) => s + v, 0)
  if (!total) return { top1: 0, top3: 0, total: 0 }
  const share = (n: number) => (sorted.slice(0, n).reduce((s, v) => s + v, 0) / total) * 100
  return { top1: share(1), top3: share(3), total }
}

export function greeting(hour: number): string {
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export interface ActionItem {
  key: string
  label: string
  count: number
  to: string
  urgent?: boolean
}

// Só o que tem algo para fazer, urgentes primeiro.
export function pendingActions(items: readonly ActionItem[]): ActionItem[] {
  return items.filter((i) => i.count > 0).sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || b.count - a.count)
}
