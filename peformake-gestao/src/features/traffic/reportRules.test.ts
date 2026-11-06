import { describe, expect, it } from 'vitest'
import { presetRange } from './reportRules'

describe('períodos do relatório', () => {
  it('semana passada vai de segunda a domingo', () => {
    expect(presetRange('last_week', '2026-11-03')).toEqual({ from: '2026-10-26', to: '2026-11-01' })
    expect(presetRange('last_week', '2026-11-09')).toEqual({ from: '2026-11-02', to: '2026-11-08' })
  })

  it('mês atual até hoje e mês passado inteiro, inclusive na virada de ano', () => {
    expect(presetRange('this_month', '2026-11-03')).toEqual({ from: '2026-11-01', to: '2026-11-03' })
    expect(presetRange('last_month', '2026-11-03')).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(presetRange('last_month', '2027-01-10')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })
})
