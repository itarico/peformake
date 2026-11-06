import { describe, expect, it } from 'vitest'
import { parseReais, reaisText, readsPerDay } from './settingsRules'

describe('parseReais', () => {
  it('aceita formatos comuns em reais', () => {
    expect(parseReais('40')).toBe(4000)
    expect(parseReais('40,50')).toBe(4050)
    expect(parseReais('R$ 1.250,00')).toBe(125000)
  })

  it('recusa texto inválido, negativo ou alto demais', () => {
    expect(parseReais('')).toBeNull()
    expect(parseReais('abc')).toBeNull()
    expect(parseReais('-5')).toBeNull()
    expect(parseReais('10,555')).toBeNull()
    expect(parseReais('2000000')).toBeNull()
  })
})

describe('apoio', () => {
  it('mostra centavos como texto e conta leituras por dia', () => {
    expect(reaisText(4000)).toBe('40,00')
    expect(readsPerDay(6)).toBe(4)
    expect(readsPerDay(24)).toBe(1)
  })
})
