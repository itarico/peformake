import { createRequire } from 'node:module'
import { avClientDocName, docName, pdfCards, strategyHtml } from './strategyDoc'
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
    // Por vídeo, 3 páginas seguidas: Narração · Gravação · Edição (sem capítulos por parte).
    expect((html.match(/class="page ez( lime)?"/g) ?? []).length).toBe(6)
    expect(html).not.toContain('class="page ez cap"')
    expect([...html.matchAll(/data-parte="(\w+)" data-video="(\d+)"/g)].map((m) => `${m[2]}${m[1]![0]}`)).toEqual(['01n', '01g', '01e', '02n', '02g', '02e'])
    expect(html).toContain('Vídeo 01 · Narração'); expect(html).toContain('<svg')
    // Formato do PDF da Rosanne: número/tipo, título sem o "S1 ·", quem fala, a fala em parágrafos, direção entre colchetes; sem selo de funil.
    expect(html).toContain('Reel (ensinar)'); expect(html).toContain('<h2>V1</h2>')
    expect(html).toContain('<p class="fala">Primeira fala.</p>'); expect(html).not.toContain('[Mostra a peça.]')
    expect(html).not.toContain('Fecho'); expect(html).not.toContain('Atrair')
    expect(html).toContain('i.ytimg.com/vi/abcdefghijk'); expect(html).toContain('Assistir a referência')
    expect(html).not.toContain('Fora')
    expect(html).not.toMatch(/\.ez[^{]*\{[^}]*background:#(000|1d1f1a)\b/)
  })
  it('só a narração (Enviar ao cliente): uma página por vídeo, nada técnico', () => {
    const cards = [card({ tab: 'audiovisual', kind: 'video', title: 'V1', data: { roteiro: [{ cena: 'CLOSE NA PEÇA', fala: 'SANDRA: Olha.' }] } }), card({ title: 'Tese' })]
    const cli = strategyHtml({ name: 'X', month: '2026-12-01', cards }, { only: 'narracao' })
    expect((cli.match(/class="page ez"/g) ?? []).length).toBe(1); expect(cli).not.toContain('data-quadro'); expect(cli).not.toContain('Tese'); expect(cli).not.toMatch(/close na/i)
    const all = strategyHtml({ name: 'X', month: '2026-12-01', cards })
    expect(all).toContain('data-quadro="detalhe"')
    expect(avClientDocName('2026-12-01')).toBe('Audiovisual · Para o cliente · 01-12 a 31-12-2026')
  })
  it('vídeo completo: montagem, captar, aproveite, referência e tempos; sem referência não mostra nada', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fx = createRequire(import.meta.url)('../../../../e2e/fixtures/av-montagem.cjs') as { title: string; data: any }
    const html = strategyHtml({ name: 'SN', month: '2026-12-01', cards: [card({ tab: 'audiovisual', kind: 'video', title: fx.title, data: fx.data })] })
    expect((html.match(/data-quadro=/g) ?? []).length).toBe(12)
    for (const t of ['O que captar', 'Aproveite a gravação', 'Reels no celular', 'Assistir a referência', 'Tempos', '54–60s', 'Ritmo rápido']) expect(html).toContain(t)
    const semRef = strategyHtml({ name: 'SN', month: '2026-12-01', cards: [card({ tab: 'audiovisual', kind: 'video', title: 'V', data: { ...fx.data, referencia: undefined, extras: undefined } })] })
    expect(semRef).not.toContain('Assistir a referência'); expect(semRef).not.toContain('Aproveite a gravação')
  })
})
