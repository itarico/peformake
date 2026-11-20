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
    expect(missingFields(f, false)).toContain('quem_aparece')
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
