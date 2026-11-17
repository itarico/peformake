import { describe, expect, it } from 'vitest'
import { detectLink, fromLinkList, linkList, prefill, quizText, QUIZ } from './briefRules'

describe('links do briefing', () => {
  it('reconhece o tipo pelo endereço', () => {
    expect(detectLink('https://maps.app.goo.gl/abc')).toEqual({ key: 'gmn', nome: 'Google Maps' })
    expect(detectLink('https://www.instagram.com/fornario.pizza/')).toEqual({ key: 'instagram', nome: 'Instagram @fornario.pizza' })
    expect(detectLink('wa.me/5581999999999').key).toBe('whatsapp')
    expect(detectLink('https://www.ifood.com.br/delivery/x').nome).toBe('iFood')
    expect(detectLink('https://tiktok.com/@loja').nome).toBe('TikTok @loja')
    expect(detectLink('https://fornario.com.br').key).toBe('site')
  })
  it('lista e volta: 1º de cada tipo é o principal, o resto é extra, removido não volta no automático', () => {
    const before = { links: { site: 'https://a.com', instagram: 'https://instagram.com/a' } }
    const out = fromLinkList([{ nome: 'Site', url: 'https://a.com', key: 'site' }, { nome: 'Google Maps', url: 'https://maps.app.goo.gl/x', key: null }, { nome: 'Site da filial', url: 'https://b.com', key: null }], before)
    expect(out.links).toEqual({ site: 'https://a.com', gmn: 'https://maps.app.goo.gl/x' })
    expect(out.links_extra).toEqual([{ nome: 'Site da filial', url: 'https://b.com' }])
    expect(out.links_off).toEqual(['https://instagram.com/a'])
    const again = prefill({ ...before, ...out }, { instagram: 'a' })
    expect(again.links?.instagram).toBeUndefined()
    expect(linkList({ ...out }).length).toBe(3)
  })
})

describe('quiz', () => {
  it('junta as respostas num texto curto', () => {
    expect(quizText(QUIZ.publico!.slice(0, 2), [['Mulheres', 'Casais'], ['31 a 40']])).toBe('Quem mais compra: Mulheres, Casais. Qual a idade: 31 a 40.')
  })
})
