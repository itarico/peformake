import { describe, expect, it } from 'vitest'
import { budgetError, buildTree, statsOf, type Entity, type EntityDay } from './campaignRules'

const entity = (over: Partial<Entity>): Entity => ({
  id: '1', accountId: 'a', level: 'campaign', parentId: null, campaignId: null, name: 'X', effectiveStatus: 'ACTIVE', dailyBudgetCents: null, thumbnailUrl: null, ...over,
})
const day = (entityId: string, spendCents: number, results = 0): EntityDay => ({ entityId, day: '2026-11-01', spendCents, impressions: 1000, reach: 400, clicks: 20, results })

describe('números', () => {
  it('calcula custo por resultado, CTR e frequência', () => {
    expect(statsOf([day('ad', 3000, 3), day('ad', 1000, 1)])).toMatchObject({ spendCents: 4000, results: 4, costPerResult: 1000, ctr: 2, frequency: 2.5 })
    expect(statsOf([])).toMatchObject({ costPerResult: null, ctr: null, frequency: null })
  })
})

describe('árvore', () => {
  const entities = [
    entity({ id: 'c1', name: 'Vendas', campaignId: 'c1' }),
    entity({ id: 'c2', name: 'Antiga', campaignId: 'c2', effectiveStatus: 'PAUSED' }),
    entity({ id: 's1', level: 'adset', parentId: 'c1', campaignId: 'c1' }),
    entity({ id: 'ad1', level: 'ad', parentId: 's1', campaignId: 'c1', name: 'Vídeo' }),
    entity({ id: 'ad2', level: 'ad', parentId: 's1', campaignId: 'c1', name: 'Foto', effectiveStatus: 'PAUSED' }),
  ]

  it('soma do anúncio para cima e esconde pausado sem gasto', () => {
    const tree = buildTree(entities, [day('ad1', 5000, 5)], false)
    expect(tree.map((n) => n.entity.id)).toEqual(['c1'])
    expect(tree[0]?.stats.spendCents).toBe(5000)
    expect(tree[0]?.children[0]?.stats.results).toBe(5)
    expect(tree[0]?.children[0]?.children.map((n) => n.entity.id)).toEqual(['ad1'])
  })

  it('mostra pausado quando pedido ou quando gastou no período', () => {
    expect(buildTree(entities, [], true).map((n) => n.entity.id)).toEqual(['c1', 'c2'])
    expect(buildTree(entities, [day('ad2', 100)], false)[0]?.children[0]?.children.map((n) => n.entity.id)).toEqual(['ad1', 'ad2'])
  })
})

describe('orçamento', () => {
  it('aceita só valores dentro dos limites', () => {
    expect(budgetError('50,00', 3000)).toEqual({ cents: 5000, error: null })
    expect(budgetError('4', 3000).error).toMatch(/mínimo/)
    expect(budgetError('100', 3000).error).toMatch(/3 vezes/)
    expect(budgetError('30', 3000).error).toMatch(/mesmo valor/)
    expect(budgetError('abc', 3000).error).toMatch(/reais/)
  })
})
