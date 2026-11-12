import { describe, expect, it } from 'vitest'
import { focusLines, guideFill, inkOn, linesToList, normalizeHex, resolveGuide } from './brandGuideRules'
import { guideHtml } from './brandGuidePrint'

const client = { id: 'c', name: 'Fornario', segment: null, logo_path: null, brand_style: {
  cores: [{ hex: '#18469c', nome: 'Azul', uso: 'Principal' }, { hex: 'xx', nome: 'ruim', uso: '' }],
  fontes: { titulo: 'Fraunces', apoio: 'DM Sans' }, foto: 'Luz quente', layout: 'Muito respiro', evite: ['Promoção barata'], faca: ['Close'],
} }
const voice = { essencia: 'Massa de 48 horas', tom: [{ adjetivo: 'Caloroso', exemplo: 'A mesa espera.' }], evitar: ['Luxo frio'], regra_teste: 'Se serve para qualquer pizzaria, não é Fornario.' }

describe('guia da marca', () => {
  it('sem guia salvo, usa cadastro e diagnóstico', () => {
    const g = resolveGuide({ client, voice, guide: {} })
    expect(g.visual.cores).toEqual([{ hex: '#18469C', nome: 'Azul', uso: 'Principal' }])
    expect(g.visual.fontes.titulo).toBe('Fraunces')
    expect(g.voz.evitar).toEqual(['Luxo frio'])
    expect(g.voz.usar).toEqual(['Close'])
    expect(g.posicionamento.frase).toBe('Massa de 48 horas')
    expect(g.design.layout).toBe('Muito respiro')
  })
  it('o guia salvo (equipe ou IA) vence as fontes', () => {
    const g = resolveGuide({ client, voice, guide: { voz: { evitar: ['Gíria'], tom: [] }, visual: { cores: [{ hex: '#000000', nome: 'Preto', uso: '' }] } } })
    expect(g.voz.evitar).toEqual(['Gíria'])
    expect(g.voz.tom[0]?.adjetivo).toBe('Caloroso')
    expect(g.visual.cores[0]?.hex).toBe('#000000')
  })
  it('preenchimento, cores e listas', () => {
    expect(guideFill(resolveGuide({ client: { ...client, brand_style: null }, voice: null, guide: {} }))).toBe(0)
    expect(normalizeHex('fff')).toBeNull()
    expect(normalizeHex('#fff')).toBe('#FFFFFF')
    expect(normalizeHex('b6e61f')).toBe('#B6E61F')
    expect(inkOn('#B6E61F')).toBe('#0E0F0C')
    expect(inkOn('#18469C')).toBe('#FFFFFF')
    expect(linesToList('- a\n\n• b\n c ')).toEqual(['a', 'b', 'c'])
  })
  it('cada área vê primeiro o que usa', () => {
    const g = resolveGuide({ client, voice, guide: { audiovisual: { mostrar: ['Forno'], apresentador: 'Sorrindo', roteiro: [] } } })
    expect(focusLines(g, 'audiovisual').map((l) => l.label)).toEqual(['Mostrar', 'Apresentador', 'Foto'])
    expect(focusLines(g, 'design')[0]?.label).toBe('Layout')
  })
  it('PDF na identidade da Peformake, sem HTML do texto', () => {
    const html = guideHtml('A <b>', resolveGuide({ client, voice, guide: {} }))
    expect(html).toContain('#1FC8DB')
    expect(html).toContain('A &lt;b&gt;')
    expect(html).toContain('Visual')
  })
})
