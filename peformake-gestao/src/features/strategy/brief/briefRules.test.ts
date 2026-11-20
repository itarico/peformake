import { briefChecks, briefMissing, briefPercent, mergeCompetitors, mergeReferences, prefill, thumbOf } from './briefRules'

describe('briefing', () => {
  it('medidor vai de 0 a 100', () => {
    expect(briefPercent(briefChecks({}, {}, 0, 8), 0, 8)).toBe(0)
    const full = { produtos: [{ nome: 'Pizza', preco: 'R$ 49' }], links: { site: 'https://a.com', instagram: 'https://ig.com/a' }, publico: 'Famílias', diferenciais: 'Forno a lenha', concorrentes: [{ nome: 'Xis' }], referencias: [{ link: 'https://y.com' }], voz: 'Leve', proibidos: 'Preço', quem_aparece: 'Dono', capacidade: '80 mesas', momento: 'Crescendo', proposito: 'Juntar a família', percepcao: 'Confiável', posicionamento: 'A pizza da família' }
    expect(briefPercent(briefChecks(full, { ofertas: 'Combo', meta: '300 pedidos', datas_travam: 'Nenhuma' }, 8, 8), 8, 8)).toBe(100)
    const half = briefPercent(briefChecks(full, { ofertas: 'Combo', meta: '300 pedidos', datas_travam: 'Nenhuma' }, 4, 8), 4, 8)
    expect(half).toBeGreaterThan(80); expect(half).toBeLessThan(100)
  })
  it('o que falta vem pelo peso', () => {
    const m = briefMissing(briefChecks({ publico: 'a b' }, {}, 0, 8))
    expect(m[0]).toMatch(/Perguntas/)
    expect(m).toContain('Produtos com preço')
    expect(m).not.toContain('Público')
  })
  it('lista acumulativa não duplica e marca novo', () => {
    const c = mergeCompetitors([{ nome: 'Pizzaria Cá' }], [{ nome: 'pizzaria ca' }, { nome: 'Forno Bom', link: 'https://instagram.com/fornobom/' }])
    expect(c).toHaveLength(2); expect(c[1]!.novo).toBe(true)
    const r = mergeReferences([{ link: 'https://www.instagram.com/reel/abc/' }], [{ link: 'instagram.com/reel/abc' }, { link: 'https://tiktok.com/@x/video/1' }])
    expect(r).toHaveLength(2)
  })
  it('preenche só o vazio', () => {
    const f = prefill({ publico: 'Meu texto' }, { target_audience: 'Outro', value_proposition: 'Forno', instagram: '@forn', phone: '(81) 98888-7777', links: [{ name: 'Cardápio', url: 'https://c' }], competitors: 'Alfa, Beta' })
    expect(f.publico).toBe('Meu texto'); expect(f.diferenciais).toBe('Forno')
    expect(f.links?.instagram).toBe('https://instagram.com/forn'); expect(f.links?.whatsapp).toBe('https://wa.me/5581988887777'); expect(f.links?.catalogo).toBe('https://c')
    expect(f.concorrentes).toHaveLength(2)
  })
  it('miniatura do YouTube', () => {
    expect(thumbOf({ link: 'https://youtube.com/shorts/abcdefghijk' })).toContain('abcdefghijk')
    expect(thumbOf({ link: 'https://instagram.com/p/x' })).toBeNull()
  })
})
