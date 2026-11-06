import { describe, expect, it } from 'vitest'
import { deltaText, deltaTone, fillDays, niceMax, pctChange } from './chartRules'

describe('chartRules', () => {
  it('calcula a variação sem dividir por zero', () => {
    expect(pctChange(150, 100)).toBe(50)
    expect(pctChange(10, 0)).toBeNull()
    expect(pctChange(4514, 283)).toBeNull()
    expect(pctChange(100, 40)).toBe(150)
  })
  it('arredonda o teto do eixo', () => {
    expect(niceMax(87)).toBe(100)
    expect(niceMax(130)).toBe(200)
    expect(niceMax(0)).toBe(1)
  })
  it('pinta o delta pelo sentido do bom', () => {
    expect(deltaTone(20, true)).toBe('good')
    expect(deltaTone(20, false)).toBe('bad')
    expect(deltaTone(0.4, true)).toBe('neutral')
    expect(deltaText(-12.4)).toBe('-12% contra o período anterior')
  })
  it('preenche os dias vazios', () => {
    expect(fillDays('2026-11-01', '2026-11-03', [{ day: '2026-11-02', value: 5 }]).map((d) => d.value)).toEqual([0, 5, 0])
  })
})
