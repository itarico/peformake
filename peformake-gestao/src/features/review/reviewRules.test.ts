import { describe, expect, it } from 'vitest'
import { buildSlides, type DeckInput, type Slide } from '@/features/strategy/consultDeck'
import { ADDED_KICKER, applyEdit, applyFills, insertAdded, clientSlides, fillsBySlide, findFills, planPhaseOf, progress, progressLabel, removeRefusedSteps, reviewedInput, slideKeys, stripMarks, textSegments } from './reviewRules'

const doc = {
  resumo: { titulo: 'A loja vende bem, mas some no Google', primeiro_passo: 'Arrumar o Google' },
  inteligencia: {
    tese: 'A loja vende bem, mas some no Google',
    descobertas: [{ tipo: 'gargalo', numero: '4%', titulo: 'Só 12 motos no site', explicacao: 'Dono confirma o número [CONFIRMAR 2083 ou 2368].' }],
    decisoes_peformake: [{ decisao: 'Qual verba primeiro', opcoes: [{ opcao: 'Compra', pros: 'estoque', contras: 'menos venda' }], recomendacao: 'Compra', porque: 'Falta moto' }],
  },
  plano: {
    fases: [
      { periodo: '30 dias', objetivo: 'Parar os riscos', passos: [
        { acao: 'Tirar o 48x', como: 'Trocar os anúncios', quem: 'peformake', esforco: 'baixo', area: 'Oferta' },
        { acao: 'Fixar a campanha de compra', como: 'Testar 14 dias [CONFIRMAR com o dono].', quem: 'peformake', esforco: 'baixo', area: 'Tráfego pago' },
      ] },
      { periodo: '60 dias', objetivo: 'Crescer', passos: [{ acao: 'Postar 3 reels', como: 'Roteiro pronto', quem: 'peformake', esforco: 'medio', area: 'Instagram' }] },
    ],
  },
  comunicacao: { expressao: { paleta: 'Vermelho. Tom exato do logo a confirmar.' } },
  confirmar: [{ item: 'Endereço', encontrado: 'Av. Caxangá, 2083 ou 2368' }],
}
const input: DeckInput = { name: 'Will motos', doc }

describe('chave dos slides', () => {
  it('não depende do texto e numera os repetidos', () => {
    const k = slideKeys([{ kind: 'cover', section: 'resumo' }, { section: 'plano', kicker: 'Plano de ação' }, { section: 'plano', kicker: 'Plano de ação' }, { kind: 'cover', section: 'resumo' }])
    expect(k).toEqual(['resumo|capa|0', 'plano|Plano de ação|0', 'plano|Plano de ação|1', 'resumo|capa|1'])
  })
  it('é a mesma na tela da equipe e na versão do cliente (os internos têm chamada própria)', () => {
    const all = buildSlides(input, 'paisagem', { internal: true })
    const pub = buildSlides(input, 'paisagem')
    const ka = slideKeys(all), kp = slideKeys(pub)
    const pubFromAll = all.map((s, i) => (s.internal ? null : ka[i])).filter(Boolean)
    expect(pubFromAll).toEqual(kp)
  })
})

describe('dados para preencher', () => {
  const f = findFills(doc)
  it('acha [CONFIRMAR], "a confirmar" e a lista confirmar', () => {
    expect(f.map((x) => x.path).sort()).toEqual(['comunicacao.expressao.paleta', 'confirmar.0.encontrado', 'inteligencia.descobertas.0.explicacao', 'plano.fases.0.passos.1.como'].sort())
    expect(f.find((x) => x.path === 'inteligencia.descobertas.0.explicacao')?.hint).toBe('2083 ou 2368')
    expect(f.find((x) => x.path === 'plano.fases.0.passos.1.como')?.text).toBe('Testar 14 dias.')
    expect(f.find((x) => x.path === 'confirmar.0.encontrado')?.internal).toBe(true)
  })
  it('preencher troca só o texto que existe', () => {
    const d = applyFills(doc, { 'plano.fases.0.passos.1.como': 'Testar 14 dias com pagamento na hora.', 'plano.nao.existe': 'x' })
    expect(d.plano.fases[0].passos[1].como).toBe('Testar 14 dias com pagamento na hora.')
    expect(d.plano.nao).toBeUndefined()
    expect(doc.plano.fases[0]!.passos[1]!.como).toContain('[CONFIRMAR')
  })
  it('cada campo aparece no slide onde está', () => {
    const map = fillsBySlide(input, 'paisagem', f, { internal: true })
    const slides = buildSlides(input, 'paisagem', { internal: true })
    const i = slides.findIndex((s) => s.kicker?.startsWith('Plano de ação · fase 1'))
    expect(map[i]).toContain('plano.fases.0.passos.1.como')
  })
  it('tira a marcação e a pontuação solta', () => { expect(stripMarks('Pagar na hora [CONFIRMAR].')).toBe('Pagar na hora.') })
})

describe('versão do cliente', () => {
  const slides = buildSlides(input, 'paisagem', { internal: true })
  const keys = slideKeys(slides)
  it('esconde recusados e internos e usa o texto editado', () => {
    const k = keys[1]!
    const out = clientSlides(slides, { slides: { [k]: { s: 'recusado', reason: 'fraco' }, [keys[0]!]: { edit: { title: 'Capa nova' } } } })
    expect(out.length).toBe(slides.filter((s) => !s.internal).length - 1)
    expect(out.some((s) => s.internal)).toBe(false)
    expect(out[0]!.title).toBe('Capa nova')
  })
  it('passo recusado some do plano do cliente', () => {
    const d = removeRefusedSteps(doc, { '0.0': 'recusado', '1.0': 'ok' })
    expect(d.plano.fases[0].passos.map((p: { acao: string }) => p.acao)).toEqual(['Fixar a campanha de compra'])
    expect(d.plano.fases[1].passos.length).toBe(1)
  })
  it('reviewedInput monta tudo junto', () => {
    const k = keys.find((x) => x.startsWith('plano|Plano de ação · fase 2'))!
    const r = reviewedInput(input, { slides: { [k]: { s: 'recusado' } }, fills: { 'plano.fases.0.passos.1.como': 'Testar 14 dias.' } })
    const out = buildSlides(r, 'paisagem')
    expect(out.some((s) => s.kicker?.startsWith('Plano de ação · fase 2'))).toBe(false)
    expect(out.length).toBe(buildSlides(input, 'paisagem').length - 1)
  })
})

describe('edição do texto do slide', () => {
  const s: Slide = { title: 'Título', body: '<ul class="bul"><li>Primeiro &amp; único</li><li>Outro</li></ul><svg><text>eixo</text></svg>' }
  it('lista os textos sem os do gráfico', () => { expect(textSegments(s.body)).toEqual(['Primeiro & único', 'Outro']) })
  it('troca o trecho e escapa', () => {
    const e = applyEdit(s, { title: 'Novo', texts: [{ from: 'Primeiro & único', to: 'Só <um>' }] })
    expect(e.title).toBe('Novo')
    expect(e.body).toContain('<li>Só &lt;um&gt;</li>')
  })
})

describe('progresso', () => {
  it('conta revisados, recusados, editados e dados', () => {
    const p = progress(['a', 'b', 'c', 'd'], { slides: { a: { s: 'ok' }, b: { s: 'recusado' }, c: { edit: { title: 'x' } } } }, 3)
    expect(p).toEqual({ total: 4, reviewed: 3, ok: 1, refused: 1, edited: 1, toFill: 3 })
    expect(progressLabel(p)).toBe('3 de 4 revisados · 3 dados para preencher')
    expect(progressLabel({ ...p, toFill: 0 })).toBe('3 de 4 revisados')
  })
  it('acha a fase do slide do plano', () => {
    expect(planPhaseOf({ section: 'plano', kicker: 'Plano de ação · fase 2 de 3' })).toBe(1)
    expect(planPhaseOf({ section: 'plano', kicker: 'Plano de ação' })).toBeNull()
  })
})

describe('ideias novas da equipe', () => {
  const state = { adds: { abc123: { titulo: 'Promoção com emplacamento grátis', area: 'trafego' as const, fase: '0' }, zzz999: { titulo: 'Recusada', area: 'social' as const } }, steps: { 'a:zzz999': 'recusado' as const } }
  it('entra depois da última fase do plano e some para o cliente se recusada', () => {
    const slides = buildSlides(input, 'paisagem', { internal: true })
    const out = insertAdded(slides, doc, state)
    const at = out.findIndex((s) => s.kicker === ADDED_KICKER)
    expect(out[at - 1]!.kicker).toMatch(/fase 2 de 2/)
    expect(out[at]!.body).toContain('Recusada')
    const pub = buildSlides(reviewedInput(input, state), 'paisagem')
    const added = pub.find((s) => s.kicker === ADDED_KICKER)!
    expect(added.body).toContain('emplacamento')
    expect(added.body).not.toContain('Recusada')
  })
})
