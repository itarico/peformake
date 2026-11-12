import { describe, expect, it } from 'vitest'
import { inArea, type ClientOption } from './useProduction'

const c = (areas: string[], isActive = true): ClientOption => ({ id: 'x', name: 'X', isActive, areas, recurring: true })

describe('cliente por área da operação', () => {
  it('só aparece com o serviço ativo da área', () => {
    expect(inArea(c(['audiovisual']), 'conteudo')).toBe(false)
    expect(inArea(c(['audiovisual']), 'audiovisual')).toBe(true)
    expect(inArea(c(['trafego']), 'consultoria')).toBe(false)
  })
  it('Conteúdo aceita Social Media ou só Design', () => {
    expect(inArea(c(['social']), 'conteudo')).toBe(true)
    expect(inArea(c(['design']), 'conteudo')).toBe(true)
  })
  it('perdido ou desativado nunca aparece', () => {
    expect(inArea(c(['social', 'audiovisual'], false), 'conteudo')).toBe(false)
    expect(inArea(c(['audiovisual'], false), 'audiovisual')).toBe(false)
  })
})
