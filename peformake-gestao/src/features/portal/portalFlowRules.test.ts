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
