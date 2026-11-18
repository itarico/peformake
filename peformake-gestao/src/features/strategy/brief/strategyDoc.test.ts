import { docName, pdfCards, strategyHtml } from './strategyDoc'
import type { StrategyCard } from './cardRules'

const card = (p: Partial<StrategyCard>): StrategyCard => ({ id: Math.random().toString(), board_id: 'b', tab: 'resumo', kind: 'tese', position: 0, title: 'T', data: {}, funnel: null, serves: null, goal: null, inspired: null, assumed: null, status: 'aprovado', reject_reason: null, in_pdf: true, regen_count: 0, is_new: false, updated_at: '', ...p })

describe('PDF da estratégia', () => {
  it('só aprovados e marcados', () => {
    const cs = [card({ title: 'A' }), card({ title: 'B', in_pdf: false }), card({ title: 'C', status: 'proposta' }), card({ title: 'D', status: 'recusado' })]
    expect(pdfCards(cs).map((c) => c.title)).toEqual(['A'])
  })
  it('nome no padrão da pasta', () => { expect(docName('2026-12-01')).toBe('Estratégia · 01-12 a 31-12-2026'); expect(docName('2027-02-01')).toBe('Estratégia · 01-02 a 28-02-2027') })
  it('audiovisual na Ellcazo, uma página por vídeo, sem fundo preto; escapa texto', () => {
    const html = strategyHtml({ name: 'Fornario <x>', month: '2026-12-01', cards: [
      card({ title: 'Tese forte', data: { texto: 'porque sim' } }),
      card({ tab: 'audiovisual', kind: 'video', title: 'S1 · V1', funnel: 'atrair', data: { formato: 'Reel (ensinar)', ganchos: ['a', 'b', 'c'], outras_ideias: ['x', 'y', 'z'], roteiro: [{ cena: 'Mostra a peça', fala: 'SANDRA: Primeira fala.' }, { cena: 'Fecho', fala: 'SANDRA: Segunda fala.' }], referencia: { link: 'https://youtu.be/abcdefghijk', porque: 'p' } } }),
      card({ tab: 'audiovisual', kind: 'video', title: 'V2', data: {} }),
      card({ tab: 'social', kind: 'peca', title: 'S1', data: { formato: 'carrossel', slides: ['s1'] } }),
      card({ tab: 'social', kind: 'peca', title: 'Fora', in_pdf: false }),
    ] })
    expect(html).toContain('Fornario &lt;x&gt;')
    expect((html.match(/class="page ez"/g) ?? []).length).toBe(2)
    // Formato do PDF da Rosanne: número/tipo, título sem o "S1 ·", quem fala, a fala em parágrafos, direção entre colchetes; sem selo de funil.
    expect(html).toContain('01 / Reel (ensinar)'); expect(html).toContain('<h2>V1</h2>')
    expect(html).toContain('<p class="spk">Sandra</p>'); expect(html).toContain('<p class="fala">Primeira fala.</p>'); expect(html).toContain('[Mostra a peça.]')
    expect(html).not.toContain('Fecho'); expect(html).not.toContain('Atrair')
    expect(html).toContain('i.ytimg.com/vi/abcdefghijk'); expect(html).toContain('Assistir a referência')
    expect(html).not.toContain('Fora')
    expect(html).not.toMatch(/\.ez[^{]*\{[^}]*background:#000/)
  })
})
