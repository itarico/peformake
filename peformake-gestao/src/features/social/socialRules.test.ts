import { describe, expect, it } from 'vitest'
import { briefingProgress, nextPosition } from './socialRules'

describe('briefingProgress', () => {
  it('sem nada', () => expect(briefingProgress({ hasNotes: false, planned: false, items: 0, briefed: 0 })).toEqual({ pct: 0, label: 'Falta a pauta do mês', step: 0 }))
  it('peças sem briefing', () => expect(briefingProgress({ hasNotes: true, planned: false, items: 8, briefed: 5 }).label).toBe('3 peças sem briefing'))
  it('pronto', () => expect(briefingProgress({ hasNotes: true, planned: true, items: 8, briefed: 8 })).toEqual({ pct: 100, label: 'Pronto para o design', step: 4 }))
})

describe('nextPosition', () => {
  it('coluna vazia', () => expect(nextPosition([])).toBe(1))
  it('vai para o fim', () => expect(nextPosition([1, 4, 2])).toBe(5))
})
