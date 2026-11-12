import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  canFollowUp, chatInvite, chatLink, cleanOptions, defaultToSend, isGeneric, isSimilar, nextMonthFocus, nextQuestion, npsCategory, packLabel, parseNps, pickNew, weekStart,
} from './questionRules'

describe('weekStart', () => {
  it('devolve a segunda-feira no horário de Recife', () => {
    expect(weekStart(new Date('2026-11-12T15:00:00Z'))).toBe('2026-11-09') // quinta
    expect(weekStart(new Date('2026-11-09T11:17:00Z'))).toBe('2026-11-09') // segunda de manhã
    expect(weekStart(new Date('2026-11-16T01:00:00Z'))).toBe('2026-11-09') // domingo 22h em Recife
    expect(weekStart(new Date('2026-11-16T03:30:00Z'))).toBe('2026-11-16')
  })
})

describe('nextMonthFocus', () => {
  it('só a última semana do mês fala do mês que vem (uma por mês)', () => {
    expect(nextMonthFocus('2026-11-23')).toBe('2026-12')
    expect(nextMonthFocus('2026-11-30')).toBeNull() // a quinta já é dezembro: é a 1ª semana de dezembro
    expect(nextMonthFocus('2026-11-16')).toBeNull()
    expect(nextMonthFocus('2026-12-28')).toBe('2027-01')
    const mondays = ['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23']
    expect(mondays.filter((m) => nextMonthFocus(m)).length).toBe(2) // outubro e novembro
  })
})

describe('perguntas novas', () => {
  it('descarta genéricas', () => {
    expect(isGeneric('Qual é o seu cliente ideal?')).toBe(true)
    expect(isGeneric('Qual o seu público-alvo hoje?')).toBe(true)
    expect(isGeneric('Quantas motos 0 km saíram financiadas em outubro?')).toBe(false)
  })
  it('acha repetidas com outras palavras', () => {
    expect(isSimilar('Quantas motos você vende por semana?', 'Quantas motos vende por semana hoje?')).toBe(true)
    expect(isSimilar('Quantas motos você vende por semana?', 'Qual banco aprova o financiamento sem entrada?')).toBe(false)
  })
  it('pega no máximo 4, sem repetir o que já foi perguntado', () => {
    const c = [
      { pergunta: 'Qual seu público-alvo?' },
      { pergunta: 'Quantas motos você vende por semana?' },
      { pergunta: 'Qual banco aprova o financiamento sem entrada hoje?' },
      { pergunta: 'Qual banco aprova o financiamento sem entrada atualmente?' },
      { pergunta: 'A Black Friday do ano passado trouxe mais visitas na loja?' },
      { pergunta: 'Vai ter alguma moto nova chegando em dezembro para anunciar?' },
      { pergunta: 'O feriado de 8 de dezembro a loja abre normalmente?' },
      { pergunta: 'Você topa gravar um vídeo curto respondendo a dúvida mais comum?' },
    ]
    const out = pickNew(c, ['Quantas motos vende por semana hoje?'])
    expect(out.map((o) => o.pergunta)).toEqual([
      'Qual banco aprova o financiamento sem entrada hoje?',
      'A Black Friday do ano passado trouxe mais visitas na loja?',
      'Vai ter alguma moto nova chegando em dezembro para anunciar?',
      'O feriado de 8 de dezembro a loja abre normalmente?',
    ])
  })
  it('limpa botões', () => {
    expect(cleanOptions(['Sim', 'sim', '  Não  ', 'Responder depois', 'Às vezes', 'Uma opção comprida demais que passa de quarenta letras com folga', 'Outra'])).toEqual([
      'Sim', 'Não', 'Às vezes', 'Uma opção comprida demais que passa de q',
    ])
    expect(cleanOptions(null)).toEqual([])
  })
})

describe('envio e conversa', () => {
  const q = (id: string, status: string, pack: string | null, created_at: string) => ({ id, status, pack, created_at })
  it('marca o pacote mais novo para enviar', () => {
    const qs = [q('a', 'pendente', null, '2026-11-01'), q('b', 'pendente', '2026-11-02', '2026-11-02'), q('c', 'pendente', '2026-11-09', '2026-11-09T02'), q('d', 'enviada', '2026-11-09', '2026-11-09T01'), q('e', 'respondida', '2026-11-09', '2026-11-09')]
    expect(defaultToSend(qs)).toEqual(['d', 'c'])
    expect(defaultToSend([q('a', 'pendente', null, '2026-11-01'), q('b', 'pendente', null, '2026-10-01')])).toEqual(['b', 'a'])
    expect(defaultToSend([])).toEqual([])
  })
  it('segue a ordem e pula o que foi deixado para depois', () => {
    expect(nextQuestion(['a', 'b', 'c'], new Set(['a']), new Set(['b']))).toBe('c')
    expect(nextQuestion(['a'], new Set(['a']), new Set())).toBeNull()
  })
  it('no máximo 1 pergunta de volta por pergunta', () => {
    expect(canFollowUp({}, 'a')).toBe(true)
    expect(canFollowUp({ a: 1 }, 'a')).toBe(false)
  })
  it('lê a nota do NPS', () => {
    expect(parseNps('10')).toBe(10)
    expect(parseNps('Nota 8')).toBe(8)
    expect(parseNps('8!')).toBe(8)
    expect(parseNps('11')).toBeNull()
    expect(parseNps('acho que 8')).toBeNull()
    expect(npsCategory(9)).toBe('promotor')
    expect(npsCategory(7)).toBe('neutro')
    expect(npsCategory(6)).toBe('detrator')
  })
  it('monta o convite com o link', () => {
    const link = chatLink('https://peformake-gestao.vercel.app/', 'abc')
    expect(link).toBe('https://peformake-gestao.vercel.app/conversa/abc')
    const tarde = new Date('2026-11-12T17:00:00Z') // 14h em Recife
    expect(chatInvite('Will motos ', 3, link, null, 'william souza', tarde)).toContain('Boa tarde, William! Tudo bem?')
    expect(chatInvite('Will motos ', 3, link, null, null, tarde)).toContain('responda estas 3 perguntas rápidas para ajudar a gente nas estratégias de marketing da Will motos.')
    expect(chatInvite('Will motos', 1, link, '2026-12', null, new Date('2026-11-12T11:00:00Z'))).toMatch(/^Bom dia, Will motos!.*esta pergunta rápida.*planejar dezembro/s)
    expect(packLabel(null)).toBe('Do diagnóstico')
    expect(packLabel('2026-11-23', 'proximo_mes')).toBe('Semana de 23/11 · mês que vem')
  })
})

describe('cópias nas funções do Supabase', () => {
  it('são iguais a este arquivo', () => {
    const src = readFileSync(resolve(__dirname, 'questionRules.ts'), 'utf8')
    for (const fn of ['client-questions', 'client-chat']) {
      expect(readFileSync(resolve(__dirname, `../../../supabase/functions/${fn}/questionRules.ts`), 'utf8')).toBe(src)
    }
  })
})
