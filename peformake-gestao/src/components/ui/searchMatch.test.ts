import { describe, expect, it } from 'vitest'
import { bestMatches, foldText, matchScore, sameOption, tidyLabel } from './searchMatch'

const SEG = ['Estética e beleza', 'Educação', 'E-commerce', 'Gastronomia', 'Indústria', 'Ótica', 'Odontologia', 'Saúde', 'Serviços', 'Serviços gerais', 'Tecnologia', 'Varejo', 'Pet', 'Moda', 'Fitness', 'Imobiliário', 'Automotivo']

describe('busca do SearchSelect', () => {
  it('ignora acento e maiúscula', () => {
    expect(foldText('ÓTICA')).toBe('otica')
    expect(bestMatches('otica', SEG)[0]).toBe('Ótica')
    expect(bestMatches('INDUSTRIA', SEG)[0]).toBe('Indústria')
  })
  it('aceita erro de digitação', () => {
    expect(bestMatches('estetca', SEG)[0]).toBe('Estética e beleza')
    expect(bestMatches('gastronomai', SEG)[0]).toBe('Gastronomia')
  })
  it('acha pelo começo de qualquer palavra', () => {
    expect(bestMatches('beleza', SEG)).toContain('Estética e beleza')
  })
  it('mostra no máximo 6 e sem repetidas', () => {
    expect(bestMatches('', SEG).length).toBe(6)
    expect(bestMatches('', ['Ótica', 'ÓTICA', 'otica'])).toEqual(['Ótica'])
  })
  it('não mostra o que não tem nada a ver', () => {
    expect(matchScore('xyz', 'Varejo')).toBe(0)
  })
  it('reconhece opção igual e padroniza o novo', () => {
    expect(sameOption('estética e BELEZA', SEG)).toBe('Estética e beleza')
    expect(sameOption('Contabilidade', SEG)).toBeNull()
    expect(tidyLabel('  contabilidade  ')).toBe('Contabilidade')
    expect(tidyLabel('ADVOCACIA')).toBe('Advocacia')
  })
})
