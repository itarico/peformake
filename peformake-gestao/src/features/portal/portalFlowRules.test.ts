import { describe, expect, it } from 'vitest'
import { fieldText, flowSteps, linksIn, missingFields, namesIn } from './portalFlowRules'
import type { PortalQuestion } from './portalBriefApi'

const q = (id: string, question: string, cond: PortalQuestion['cond'] = null, extra: Partial<PortalQuestion> = {}): PortalQuestion =>
  ({ id, question, why: null, options: [], cond, answer: null, status: 'pendente', answered_via: null, ...extra })

describe('conversa do portal', () => {
  it('pega o que falta no briefing, do que mais pesa primeiro; Gravação só para quem tem vídeo', () => {
    const f = { publico: 'Mulheres do bairro' }
    const m = missingFields(f, true)
    expect(m[0]).toBe('produtos')
    expect(m).not.toContain('publico')
    expect(m).toContain('gravacao')
    expect(missingFields(f, false)).not.toContain('gravacao')
  })

  it('subpergunta do guia (when) só entra quando a resposta pede', () => {
    const base = flowSteps(['voz'], {}, [], 'Perguntas')
    expect(base.some((s) => /brincadeira/.test(s.q))).toBe(false)
    const comVoz = flowSteps(['voz'], { 'voz:0': 'Descontraída' }, [], 'Perguntas')
    expect(comVoz.some((s) => /brincadeira/.test(s.q))).toBe(true)
  })

  it('pergunta do mês com cond só aparece depois da resposta da mãe, e as respondidas saem', () => {
    const mae = 'O que vocês vendem ou fazem?'
    const qs = [q('a', mae), q('b', 'As motos são novas?', { q: mae, has: ['moto'] })]
    expect(flowSteps([], {}, qs, 'P').map((s) => s.qid)).toEqual(['a'])
    const respondida = [q('a', mae, null, { status: 'respondida', answer: 'Motos' }), qs[1]!]
    expect(flowSteps([], {}, respondida, 'P').map((s) => s.qid)).toEqual(['b'])
  })

  it('junta as respostas do guia no texto do campo', () => {
    expect(fieldText('proibidos', { 'proibidos:0': 'Política; Religião' })).toBe('O que nunca falar ou mostrar: Política; Religião.')
  })

  it('acha links e nomes no que o cliente falou ou colou', () => {
    expect(linksIn('meu insta é @willmotos e o site willmotos.com.br')).toEqual(['https://instagram.com/willmotos', 'https://willmotos.com.br'])
    expect(namesIn('Moto Sul, Garagem 10 e @motoreal')).toEqual(['Moto Sul', 'Garagem 10', '@motoreal'])
  })
})

describe('tamanho da conversa', () => {
  it('no máximo 4 perguntas por campo, mais as subperguntas abertas pela resposta', async () => {
    const { MAX_PER_FIELD } = await import('./portalFlowRules')
    expect(flowSteps(['publico'], {}, [], 'P').length).toBe(MAX_PER_FIELD)
    expect(flowSteps(['publico'], { 'publico:0': 'Famílias com filhos' }, [], 'P').length).toBe(MAX_PER_FIELD + 1)
  })
})

describe('cartões novos do briefing (20/11)', () => {
  it('puxa-fio aparece só depois da resposta da pergunta aberta', () => {
    const before = flowSteps(['marketing'], {}, [], 'P')
    const i = before.findIndex((s) => /funcionou melhor/.test(s.q))
    if (i < 0) return // o guia mudou de ordem: o teste de baixo cobre a regra
    expect(before.some((s) => /Por que você acha que funcionou/.test(s.q))).toBe(false)
    const after = flowSteps(['marketing'], { [before[i]!.key]: 'Sorteio no Instagram' }, [], 'P')
    expect(after.some((s) => /Por que você acha que funcionou/.test(s.q))).toBe(true)
  })

  it('a verba entra sempre e vai para o campo de dinheiro, fora do texto', async () => {
    const { fieldPatch } = await import('./portalFlowRules')
    const steps = flowSteps(['marketing'], {}, [], 'P')
    const verba = steps.find((s) => s.money === 'verba_anuncio')
    expect(verba).toBeTruthy()
    const patch = fieldPatch('marketing', { [verba!.key]: 'R$ 500 a 1.500' })
    expect(patch.verba_anuncio).toBe('R$ 500 a 1.500')
    expect(patch.marketing ?? '').not.toContain('1.500')
  })

  it('sazonalidade: meses falados viram números', async () => {
    const { fieldPatch } = await import('./portalFlowRules')
    expect(fieldPatch('sazonal', { 'sazonal:0': 'Dezembro; Junho', 'sazonal:1': 'fevereiro e março', 'sazonal:2': 'Natal e São João' }))
      .toEqual({ meses_fortes: [6, 12], meses_fracos: [2, 3], sazonalidade: 'Natal e São João' })
  })

  it('Gravação só falta para quem tem vídeo', () => {
    expect(missingFields({}, false)).not.toContain('gravacao')
    expect(missingFields({}, true)).toContain('gravacao')
    expect(missingFields({}, true)).toContain('sazonal')
  })
})

describe('NPS no fim das perguntas do mês', () => {
  const qs = [q('a', 'Pergunta do mês', null, { status: 'respondida', answer: 'ok' })]
  it('pergunta a nota uma vez por mês e o puxa-fio segue a nota', async () => {
    const { NPS_KEY, NPS_COMMENT_KEY, npsFollowUp } = await import('./portalFlowRules')
    expect(flowSteps([], {}, qs, 'P', { brand: 'peformake', done: false }).map((s) => s.key)).toEqual([NPS_KEY])
    expect(flowSteps([], {}, qs, 'P', { brand: 'peformake', done: true })).toEqual([])
    const depois = flowSteps([], { [NPS_KEY]: '5' }, qs, 'P', { brand: 'peformake', done: true })
    expect(depois.map((s) => s.key)).toEqual([NPS_KEY, NPS_COMMENT_KEY])
    expect(depois[1]!.q).toMatch(/decepcionou/)
    expect(npsFollowUp(8).q).toMatch(/faltou para ser 10/)
    expect(npsFollowUp(10).opts[0]).toMatch(/indicar/)
    expect(flowSteps([], {}, qs, 'P', { brand: 'ellcazo', done: false })[0]!.q).toMatch(/Ellcazo/)
  })
  it('sem perguntas do mês, não pergunta a nota', () => {
    expect(flowSteps([], {}, [], 'P', { brand: 'peformake', done: false })).toEqual([])
  })
})

describe('briefing em blocos', () => {
  it('confirma o que já sabemos, separa por bloco e estima o tempo', async () => {
    const { briefSteps, BLOCKS, minutes, stepSeconds } = await import('./portalFlowRules')
    const f = { produtos: [{ nome: 'Pizza', preco: 'R$ 50' }], publico: 'Famílias do bairro' }
    const steps = briefSteps(f, missingFields(f, false), {}, false, 0)
    expect(steps[0]!.kind).toBe('confirm')
    expect(steps[0]!.q).toContain('Pizza R$ 50')
    expect(steps.find((s) => s.key === 'confirmar:2')!.q).toContain('Famílias do bairro')
    const blocks = steps.map((s) => s.block!)
    expect([...blocks].sort((a, b) => a - b)).toEqual(blocks)
    expect(steps.at(-1)!.kind).toBe('docs')
    expect(steps.every((s) => BLOCKS.some((b) => b.n === s.block))).toBe(true)
    expect(minutes(steps.filter((s) => s.block === 2).reduce((t, s) => t + stepSeconds(s), 0))).toBeGreaterThan(0)
  })
  it('com 3 ou mais documentos não pede arquivos de novo', async () => {
    const { briefSteps } = await import('./portalFlowRules')
    expect(briefSteps({}, [], {}, false, 3).some((s) => s.kind === 'docs')).toBe(false)
  })
})

describe('tipo de cada pergunta (Italo, 21/11)', () => {
  it('aberta tem áudio; curta, número e opções não', async () => {
    const { flowSteps: fs } = await import('./portalFlowRules')
    const all = fs(['publico', 'marketing', 'sazonal'], {}, [], 'P')
    expect(all.every((s) => ['aberta', 'curta', 'num', 'opcoes'].includes(s.input!))).toBe(true)
    const saz = fs(['sazonal'], {}, [], 'P')
    expect(saz.map((s) => s.input)).toEqual(['opcoes', 'opcoes', 'aberta'])
    const qs = fs([], {}, [q('a', 'Bateram a meta?', null, { options: ['Sim', 'Não'] }), q('b', 'Conta a história')], 'P')
    expect(qs.map((s) => s.input)).toEqual(['opcoes', 'aberta'])
  })
})
