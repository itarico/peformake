import { describe, expect, it } from 'vitest'
import { groupByModule, lastRunByRoutine, runStatus, sortRecommendations, whenText, type AgentRun, type Recommendation, type StrategyItem } from './cloudAgentRules'

const rec = (over: Partial<Recommendation>): Recommendation => ({
  id: 'r', day: '2026-11-03', clientId: null, kind: 'risco', priority: 'normal', title: 't', body: 'b', taskId: null, status: 'open', ...over,
})
const item = (over: Partial<StrategyItem>): StrategyItem => ({
  id: 'i', strategyId: 's', module: 'criativos', title: 't', body: 'b', position: 0, status: 'proposed', taskId: null, ...over,
})
const run = (over: Partial<AgentRun>): AgentRun => ({
  id: 'x', routine: 'daily', startedAt: '2026-11-03T10:00:00Z', finishedAt: '2026-11-03T10:05:00Z', ok: true, summary: null, ...over,
})

describe('sortRecommendations', () => {
  it('põe abertas e urgentes primeiro', () => {
    const list = [rec({ id: 'a', status: 'done', priority: 'high' }), rec({ id: 'b', priority: 'low' }), rec({ id: 'c', priority: 'high' })]
    expect(sortRecommendations(list).map((r) => r.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('groupByModule', () => {
  it('agrupa na ordem fixa dos módulos e ordena por posição', () => {
    const groups = groupByModule([item({ id: '1', module: 'testes' }), item({ id: '2', module: 'diagnostico', position: 1 }), item({ id: '3', module: 'diagnostico', position: 0 })])
    expect(groups.map((g) => g.module)).toEqual(['diagnostico', 'testes'])
    expect(groups[0]?.items.map((i) => i.id)).toEqual(['3', '2'])
  })
})

describe('runs', () => {
  const now = new Date('2026-11-03T12:00:00Z')
  it('pega a passada mais recente de cada rotina', () => {
    const last = lastRunByRoutine([run({ id: 'old', startedAt: '2026-11-02T10:00:00Z' }), run({ id: 'new' }), run({ id: 'in', routine: 'inbox' })])
    expect(last.daily?.id).toBe('new')
    expect(last.inbox?.id).toBe('in')
  })
  it('classifica a situação', () => {
    expect(runStatus(undefined, now)).toBe('never')
    expect(runStatus(run({ finishedAt: null, startedAt: '2026-11-03T11:30:00Z' }), now)).toBe('running')
    expect(runStatus(run({ finishedAt: null, startedAt: '2026-11-03T09:00:00Z' }), now)).toBe('stuck')
    expect(runStatus(run({ ok: false }), now)).toBe('failed')
    expect(runStatus(run({}), now)).toBe('ok')
  })
  it('escreve quando foi', () => {
    expect(whenText('2026-11-03T10:00:00Z', now)).toBe('hoje às 07:00')
    expect(whenText('2026-11-02T10:00:00Z', now)).toBe('ontem às 07:00')
  })
})
