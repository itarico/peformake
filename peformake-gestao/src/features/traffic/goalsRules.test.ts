import { describe, expect, it } from 'vitest'
import { formatGoalValue, goalDetail, goalSentence, goalsSummary, type GoalProgress } from './goalsRules'

describe('goalSentence', () => {
  // O real formatado usa espaço sem quebra depois do "R$": normaliza para comparar.
  const plain = (s: string) => s.replace(/\s/g, ' ')
  it('custo é abaixo de', () => expect(plain(goalSentence('cpl', 15))).toBe('abaixo de R$ 15,00'))
  it('volume é pelo menos', () => expect(goalSentence('leads', 200)).toBe('pelo menos 200'))
  it('verba é até', () => expect(plain(goalSentence('investimento', 2500))).toBe('até R$ 2.500,00'))
  it('roas com x', () => expect(formatGoalValue('roas', 5.5)).toBe('5,5x'))
})

describe('goalDetail', () => {
  it('volume mostra projeção', () => expect(goalDetail({ metric: 'leads', current: 32, projected: 240, target: 200 })).toBe('32 até agora · no ritmo atual fecha o mês com 240'))
  it('sem dados', () => expect(goalDetail({ metric: 'cpl', current: null, projected: null, target: 15 })).toContain('sem dados'))
})

describe('goalsSummary', () => {
  const g = (status: GoalProgress['status']) => ({ status }) as GoalProgress
  it('conta as batidas e acha a pior', () => expect(goalsSummary([g('batendo'), g('perto'), g('batendo')])).toEqual({ hit: 2, total: 3, worst: 'perto' }))
  it('vazio', () => expect(goalsSummary([])).toEqual({ hit: 0, total: 0, worst: null }))
})
