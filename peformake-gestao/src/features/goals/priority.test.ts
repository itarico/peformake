import { describe, expect, it } from 'vitest'
import { byPriority, firstPages, moreLabel, nextBatch, noticePrio, prioOf, type Prio } from './priority'

type L = 'urgente' | 'hoje' | 'info'
const it_ = (id: string, level: L, prio?: Prio) => ({ id, level, prio })

describe('prioridade da Bete', () => {
  it('dinheiro > cliente > atrasado > hoje > novidade', () => {
    const list = [it_('nov', 'info', 4), it_('hoje', 'hoje', 3), it_('cli', 'info', 1), it_('atraso', 'urgente', 2), it_('fatura', 'urgente', 0)]
    expect(byPriority(list).map((x) => x.id)).toEqual(['fatura', 'cli', 'atraso', 'hoje', 'nov'])
  })
  it('sem prioridade explícita usa o nível, e o empate mantém a ordem', () => {
    expect(prioOf({ level: 'urgente' })).toBe(2)
    expect(prioOf({ level: 'hoje' })).toBe(3)
    expect(prioOf({ level: 'info' })).toBe(4)
    expect(byPriority([it_('a', 'info'), it_('b', 'hoje'), it_('c', 'info'), it_('d', 'urgente')]).map((x) => x.id)).toEqual(['d', 'b', 'a', 'c'])
  })
  it('avisos: fatura atrasada é dinheiro, reclamação é cliente, novidade comum fica por último', () => {
    expect(noticePrio('billing_late')).toBe(0)
    expect(noticePrio('crm_complaint')).toBe(1)
    expect(noticePrio('task_waiting')).toBe(2)
    expect(noticePrio('team_highlight')).toBe(4)
    expect(noticePrio(undefined)).toBe(4)
  })
})

describe('4 por vez', () => {
  const twenty = Array.from({ length: 20 }, (_, i) => it_(`n${i}`, 'info', 4)).concat([it_('money', 'urgente', 0), it_('client', 'info', 1)])
  it('primeiro lote traz as 4 mais importantes', () => {
    const { batch, rest } = nextBatch(twenty, new Set())
    expect(batch.map((x) => x.id)).toEqual(['money', 'client', 'n0', 'n1'])
    expect(rest).toBe(18)
  })
  it('próximo lote pula o que já foi mostrado', () => {
    const { batch, rest } = nextBatch(twenty, new Set(['money', 'client', 'n0', 'n1']))
    expect(batch.map((x) => x.id)).toEqual(['n2', 'n3', 'n4', 'n5'])
    expect(rest).toBe(14)
  })
  it('algo urgente que chega depois passa na frente no lote seguinte', () => {
    const shown = new Set(['n0', 'n1', 'n2', 'n3'])
    expect(nextBatch([...twenty.slice(0, 8), it_('late', 'urgente', 0)], shown).batch[0]!.id).toBe('late')
  })
  it('último lote não tem resto', () => {
    expect(nextBatch([it_('a', 'info'), it_('b', 'info')], new Set())).toEqual({ batch: [it_('a', 'info'), it_('b', 'info')], rest: 0 })
  })
  it('listas paginadas e texto do botão', () => {
    expect(firstPages([1, 2, 3, 4, 5, 6, 7, 8, 9], 1)).toEqual({ shown: [1, 2, 3, 4], more: 5 })
    expect(firstPages([1, 2, 3, 4, 5, 6, 7, 8, 9], 2).more).toBe(1)
    expect(moreLabel(18)).toBe('Manda as próximas 4')
    expect(moreLabel(3)).toBe('Manda as próximas 3')
    expect(moreLabel(1)).toBe('Manda a última')
    expect(moreLabel(0)).toBe('')
  })
})
