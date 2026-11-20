import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { durationOf, editPart, extrasOf, montage, narrationPart, orientationOf, productionExtras, screenTextOf, sentenceCase, shootPart, shotSvg, shotTypeOf, twoRowCols, videoFacts, videoHead } from './avParts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fx = createRequire(import.meta.url)('../../../../e2e/fixtures/av-montagem.cjs') as { title: string; data: any }
const full = { title: fx.title, inspired: null, data: fx.data }

describe('montagem (storyboard)', () => {
  it('vem de data.montagem, na ordem, com tempo, tipo, visual e texto na tela', () => {
    const m = montage(full)
    expect(m).toHaveLength(12)
    expect(m.map((x) => x.tipo)).toEqual(['fala', 'detalhe', 'insert', 'fala', 'apoio', 'detalhe', 'apoio', 'grafico', 'fala', 'apoio', 'texto', 'fala'])
    expect(m[0]).toMatchObject({ n: 1, t: '0–3s', texto: '38 itens. Quanto tempo?' })
    expect(m[11]!.t).toBe('54–60s')
  })
  it('cada tipo tem o seu desenho; vertical ou horizontal', () => {
    for (const s of montage(full)) {
      const svg = shotSvg(s, 'vertical')
      expect(svg).toMatch(/^<svg[^>]+viewBox="0 0 90 160"/); expect(svg).toContain(`data-quadro="${s.tipo}"`); expect(svg).toContain(s.t)
    }
    expect(shotSvg({ n: 1, t: '', tipo: 'grafico', texto: '' }, 'horizontal')).toContain('viewBox="0 0 160 90"')
    expect(shotSvg({ n: 1, t: '0–3s', tipo: 'texto', texto: 'x' }, 'vertical')).toContain('Aa')
  })
  it('tipo: campo do card, sinônimos ou deduzido da descrição', () => {
    expect(shotTypeOf('B-roll')).toBe('apoio'); expect(shotTypeOf('print')).toBe('insert'); expect(shotTypeOf('lettering')).toBe('texto')
    expect(shotTypeOf('', 'Close das mãos na peça')).toBe('detalhe'); expect(shotTypeOf('', 'Contador de 0 a 38')).toBe('grafico')
    expect(shotTypeOf('', 'Fachada da loja')).toBe('apoio'); expect(shotTypeOf('', '', true)).toBe('fala')
  })
  it('sem montagem: um quadro por bloco do roteiro, tempos pela duração', () => {
    const c = { inspired: null, data: { duracao_s: 30, roteiro: [
      { cena: 'PLANO ABERTO DA LOJA. TRILHA ENTRA', fala: '' },
      { cena: 'CLOSE NA PEÇA', fala: '' },
      { cena: 'Texto na tela: “Manda a lista”', fala: 'SANDRA: Manda a lista no WhatsApp.' },
    ] } }
    const m = montage(c)
    expect(m.map((x) => x.tipo)).toEqual(['apoio', 'detalhe', 'fala'])
    expect(m.map((x) => x.t)).toEqual(['0–10s', '10–20s', '20–30s'])
    expect(m[2]!.texto).toBe('Manda a lista'); expect(m[2]!.audio).toBe('Sandra: Manda a lista no WhatsApp.')
    expect(m[2]!.visual).toBe('Sandra falando')
    expect(montage({ data: { roteiro: [{ cena: 'Texto na tela: “Só texto”', fala: '' }] } })[0]).toMatchObject({ tipo: 'texto', texto: 'Só texto' })
    expect(montage({ data: { roteiro: [{ cena: '', fala: 'SANDRA: Oi.' }] } })[0]).toMatchObject({ tipo: 'fala', t: '' })
  })
  it('duração: duracao_s ou o fim da montagem', () => {
    expect(durationOf(fx.data)).toBe(60); expect(durationOf({ montagem: [{ t: '0-3s' }, { t: '40–45s' }] })).toBe(45); expect(durationOf({})).toBeNull()
  })
})

describe('as três partes', () => {
  it('topo: título, formato · duração e a ideia em 1 frase', () => {
    expect(videoHead(full)).toEqual({ title: 'A lista da obra em 60 segundos', meta: 'Reel (ensinar) · 60 s', idea: 'A Sandra mostra, com a lista de um cliente real, como a SN separa tudo da obra e entrega no prazo.' })
  })
  it('narração: só a fala, sem direção; quem fala só com mais de uma pessoa', () => {
    const n = narrationPart(full)
    expect(n.paras).toHaveLength(4); expect(n.paras.every((p) => !p.speaker)).toBe(true)
    expect(JSON.stringify(n)).not.toMatch(/balc[aã]o, olhando|Corredor|Caminhão saindo/)
    const two = narrationPart({ title: '', data: { roteiro: [{ cena: 'x', fala: 'VOZ: Tem caixa?' }, { cena: 'y', fala: 'SANDRA: Tem!' }, { cena: '', fala: 'SANDRA: De 100 litros.' }] } })
    expect(two.paras.map((p) => p.speaker)).toEqual(['Voz (fora do quadro)', 'Sandra', ''])
  })
  it('gravação: montagem, o que captar, aproveite a gravação e referência só se existir', () => {
    const s = shootPart(full)
    expect(s.shots).toHaveLength(12); expect(s.captar).toHaveLength(7); expect(s.ref?.porque).toMatch(/processo/)
    expect(s.extras?.stories).toHaveLength(2); expect(s.extras?.reels).toHaveLength(1)
    expect(s.extras?.fotos[0]!.ref?.link).toMatch(/youtube/); expect(s.extras?.fotos[1]!.ref).toBeNull()
    expect(shootPart({ inspired: null, data: {} })).toEqual({ orient: 'vertical', shots: [], captar: [], extras: null, ref: null, estrutura: { nome: '', passos: [] }, roteiro: [], como: [] })
    expect(s.roteiro.length).toBeGreaterThan(0); expect(twoRowCols(17)).toBe(9); expect(sentenceCase('ITALO NA PORTA. FALA PRA CÂMERA.')).toBe('Italo na porta. Fala pra câmera.')
    expect(extrasOf({ extras: { stories: [], fotos: [] } })).toBeNull()
  })
  it('edição: guia curto e os tempos; derivados ficam em Ver detalhes', () => {
    const e = editPart(full)
    expect(e.guide[0]).toMatch(/^Ritmo rápido/); expect(e.times).toHaveLength(12)
    expect(editPart({ data: {} })).toEqual({ guide: [], times: [] })
    expect(productionExtras({ data: { producao: { derivados: [{ formato: 'Anúncio', duracao_s: 15, gancho: 'Tem!' }], publicacao: { capa: 'Sandra' } } } }))
      .toEqual([{ label: 'Derivados', value: 'Anúncio · 15 s · abre com “Tem!”' }, { label: 'Capa', value: 'Sandra' }])
  })
  it('texto na tela e orientação', () => {
    expect(screenTextOf('Texto na tela: “Quando o cliente não sabe o nome da peça…”. Alguém da equipe faz o cliente')).toBe('Quando o cliente não sabe o nome da peça…')
    expect(orientationOf('Reel (humor)')).toBe('vertical'); expect(orientationOf('Vídeo horizontal para o YouTube')).toBe('horizontal')
  })
})

describe('resumo do motor acima de "Ver detalhes"', () => {
  it('mostra estrutura, intenção, notas e derivados quando existem', () => {
    const f = videoFacts({ data: { estrutura: 'S61', intencao: 'confiança → chamar no WhatsApp', notas: 'Criativa 8,9 · Fidelidade 9,5', producao: { derivados: [{ formato: 'anúncio 15 s' }, { estrutura: 'S81' }] } } })
    expect(f.map((x) => x.key)).toEqual(['estrutura', 'intencao', 'notas', 'derivados'])
    expect(f[3]!.value).toBe('2 · anúncio 15 s · S81')
  })
  it('estrutura em objeto e nada inventado quando falta', () => {
    expect(videoFacts({ data: { estrutura: { nome: 'Vazamento', passos: ['a'] } } })).toEqual([{ key: 'estrutura', label: 'Estrutura', value: 'Vazamento' }])
    expect(videoFacts({ data: {} })).toEqual([])
  })
})

describe('lista de roteiros: objetivo, estrutura e estrelas', () => {
  it('objetivo do motor ou deduzido do funil', async () => {
    const { objetivoTag, estruturaTag, starsOf } = await import('./avParts')
    expect(objetivoTag({ data: { objetivo_tag: 'Escalar' }, funnel: 'atrair' })).toBe('escalar')
    expect(objetivoTag({ data: {}, funnel: 'provar' })).toBe('autoridade')
    expect(objetivoTag({ data: {}, funnel: null })).toBeNull()
    expect(estruturaTag({ data: { estrutura: 'S61' } }, { S61: 'Depoimento' })).toBe('S61 · Depoimento')
    expect(estruturaTag({ data: { estrutura: { nome: 'Vazamento' } } }, {})).toBe('Vazamento')
    expect(starsOf({ data: { estrelas: 2 } })).toBe(2)
    expect(starsOf({ data: { estrelas: 7 } })).toBe(0)
  })
})
