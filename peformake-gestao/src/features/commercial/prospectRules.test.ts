import { describe, expect, it } from 'vitest'
import { heatOf, opportunityReasons, opportunityScore, siteSignals, toCsv } from './prospectRules'

describe('opportunityScore', () => {
  it('empresa sem site, poucas avaliações e com telefone é ótima', () => expect(opportunityScore({ websiteUri: null, userRatingCount: 5, rating: 4.8, phone: '5581999999999' })).toBe(85))
  it('empresa grande e bem resolvida é baixa', () => expect(opportunityScore({ websiteUri: 'https://loja.com.br', userRatingCount: 900, rating: 4.9, phone: '558133334444' })).toBe(40))
  it('sem telefone perde muito', () => expect(opportunityScore({ websiteUri: 'https://x.com', userRatingCount: 900, rating: 4.9 })).toBe(10))
})

describe('opportunityReasons', () => {
  it('explica', () => expect(opportunityReasons({ website: 'https://instagram.com/x', reviews: 3, rating: 3.9 })).toEqual(['Só tem rede social como site', 'Poucas avaliações no Google', 'Nota 3.9 no Google']))
})

describe('toCsv', () => {
  it('escapa ponto e vírgula e aspas', () => expect(toCsv([{ a: 'x;y', b: ['t1', 't2'] }], [['a', 'A'], ['b', 'B']])).toBe('A;B\n"x;y";t1, t2'))
})

describe('heatOf', () => {
  it('quente: tem WhatsApp e falta pixel', () => expect(heatOf({ has_whatsapp: true, has_site: true, meta_pixel: false, reviews: 200, rating: 4.8 }).heat).toBe('quente'))
  it('morno: sem WhatsApp mas com 2 falhas', () => expect(heatOf({ has_whatsapp: false, has_site: false, reviews: 3 }).heat).toBe('morno'))
  it('frio: bem resolvido e sem WhatsApp', () => expect(heatOf({ has_whatsapp: false, has_site: true, meta_pixel: true, reviews: 500, rating: 4.9 }).heat).toBe('frio'))
})

describe('siteSignals', () => {
  it('acha pixel, tag, botão e instagram', () => {
    const html = '<script>fbq("init","1")</script><script src="https://www.googletagmanager.com/gtag/js"></script><a href="https://wa.me/5581">Zap</a><a href="https://instagram.com/otica.visao">IG</a>'
    expect(siteSignals(html)).toEqual({ meta_pixel: true, google_tag: true, whatsapp_button: true, instagram: 'otica.visao' })
  })
  it('ignora link de post', () => expect(siteSignals('<a href="https://instagram.com/p/abc">').instagram).toBeNull())
})
