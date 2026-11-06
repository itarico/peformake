export type EntityLevel = 'campaign' | 'adset' | 'ad'

export interface Entity {
  id: string
  accountId: string
  level: EntityLevel
  parentId: string | null
  campaignId: string | null
  name: string
  effectiveStatus: string | null
  dailyBudgetCents: number | null
  thumbnailUrl: string | null
}

export interface EntityDay {
  entityId: string
  day: string
  spendCents: number
  impressions: number
  reach: number
  clicks: number
  results: number
}

export interface Stats {
  spendCents: number
  results: number
  impressions: number
  clicks: number
  reach: number
  costPerResult: number | null
  ctr: number | null
  frequency: number | null
}

export interface EntityNode {
  entity: Entity
  stats: Stats
  children: EntityNode[]
}

export const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  CAMPAIGN_PAUSED: 'Campanha pausada',
  ADSET_PAUSED: 'Conjunto pausado',
  WITH_ISSUES: 'Com problema',
  IN_PROCESS: 'Em processamento',
  PENDING_REVIEW: 'Em análise',
  DISAPPROVED: 'Reprovado',
}

export const isActive = (entity: Pick<Entity, 'effectiveStatus'>) => entity.effectiveStatus === 'ACTIVE'

export function statsOf(rows: readonly EntityDay[]): Stats {
  const sum = rows.reduce(
    (t, r) => ({ spendCents: t.spendCents + r.spendCents, results: t.results + r.results, impressions: t.impressions + r.impressions, clicks: t.clicks + r.clicks, reach: t.reach + r.reach }),
    { spendCents: 0, results: 0, impressions: 0, clicks: 0, reach: 0 },
  )
  return {
    ...sum,
    costPerResult: sum.results > 0 ? Math.round(sum.spendCents / sum.results) : null,
    ctr: sum.impressions > 0 ? (sum.clicks / sum.impressions) * 100 : null,
    // Alcance somado por dia superestima pessoas únicas; serve como indicador, não valor exato.
    frequency: sum.reach > 0 ? Math.round((sum.impressions / sum.reach) * 10) / 10 : null,
  }
}

/** Monta campanha > conjunto > anúncio com números do período. Os números sobem do anúncio para o pai. */
export function buildTree(entities: readonly Entity[], days: readonly EntityDay[], showPaused: boolean): EntityNode[] {
  const byAd = new Map<string, EntityDay[]>()
  for (const day of days) byAd.set(day.entityId, [...(byAd.get(day.entityId) ?? []), day])
  const ads = entities.filter((e) => e.level === 'ad')
  const adsets = entities.filter((e) => e.level === 'adset')
  const keep = (node: EntityNode) => showPaused || isActive(node.entity) || node.stats.spendCents > 0
  const order = (a: EntityNode, b: EntityNode) => Number(isActive(b.entity)) - Number(isActive(a.entity)) || b.stats.spendCents - a.stats.spendCents || a.entity.name.localeCompare(b.entity.name, 'pt-BR')

  return entities
    .filter((e) => e.level === 'campaign')
    .map((campaign) => {
      const children = adsets
        .filter((s) => s.parentId === campaign.id)
        .map((adset) => {
          const adNodes = ads.filter((a) => a.parentId === adset.id).map((ad) => ({ entity: ad, stats: statsOf(byAd.get(ad.id) ?? []), children: [] }))
          return { entity: adset, stats: statsOf(adNodes.flatMap((n) => byAd.get(n.entity.id) ?? [])), children: adNodes.filter(keep).sort(order) }
        })
      const campaignDays = ads.filter((a) => a.campaignId === campaign.id).flatMap((a) => byAd.get(a.id) ?? [])
      return { entity: campaign, stats: statsOf(campaignDays), children: children.filter(keep).sort(order) }
    })
    .filter(keep)
    .sort(order)
}

/** Orçamento digitado em reais para centavos, com os limites que o servidor aceita. */
export function budgetError(text: string, currentCents: number): { cents: number | null; error: string | null } {
  const clean = text.trim().replace(/^R\$\s*/i, '').replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return { cents: null, error: 'Digite o valor em reais. Exemplo: 50,00.' }
  const cents = Math.round(Number(clean) * 100)
  if (cents < 500) return { cents, error: 'O mínimo é R$ 5,00 por dia.' }
  if (cents > 200000) return { cents, error: 'O máximo pelo sistema é R$ 2.000,00 por dia.' }
  if (cents > currentCents * 3) return { cents, error: 'Pelo sistema, no máximo 3 vezes o orçamento atual de uma vez.' }
  if (cents === currentCents) return { cents, error: 'É o mesmo valor de hoje.' }
  return { cents, error: null }
}
