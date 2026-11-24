import { describe, expect, it } from 'vitest'
import { fillBrief, fillTask, spokenDate } from './voiceFill'

const TODAY = new Date(2026, 10, 24) // terça, 24/11/2026

describe('spokenDate', () => {
  it('entende hoje, amanhã e dia da semana', () => {
    expect(spokenDate('para hoje', TODAY)).toBe('2026-11-24')
    expect(spokenDate('até amanhã', TODAY)).toBe('2026-11-25')
    expect(spokenDate('depois de amanhã', TODAY)).toBe('2026-11-26')
    expect(spokenDate('entrega na sexta-feira', TODAY)).toBe('2026-11-27')
    expect(spokenDate('na terça', TODAY)).toBe('2026-12-01')
  })
  it('entende dia, dia de mês e barra; data passada vai para o próximo mês ou ano', () => {
    expect(spokenDate('até o dia 28', TODAY)).toBe('2026-11-28')
    expect(spokenDate('dia 5', TODAY)).toBe('2026-12-05')
    expect(spokenDate('10 de janeiro', TODAY)).toBe('2027-01-10')
    expect(spokenDate('para 30/11', TODAY)).toBe('2026-11-30')
    expect(spokenDate('sem data nenhuma', TODAY)).toBeNull()
  })
})

describe('fillTask', () => {
  it('divide a fala nos campos da tarefa', () => {
    const f = fillTask('Responder os comentários do post da promoção. É urgente, até amanhã, no Instagram.', TODAY)
    expect(f.title).toBe('Responder os comentários do post da promoção')
    expect(f.description).toContain('urgente')
    expect(f.due_date).toBe('2026-11-25')
    expect(f.priority).toBe(true)
    expect(f.network).toBe('instagram')
  })
  it('sem prazo, prioridade nem rede: só título e detalhes', () => {
    const f = fillTask('ligar para o cliente sobre as fotos', TODAY)
    expect(f).toMatchObject({ title: 'Ligar para o cliente sobre as fotos', due_date: null, priority: false, network: null })
  })
})

describe('fillBrief', () => {
  it('acha título e subtítulo ditos e guarda a fala no briefing', () => {
    const f = fillBrief('O título é 2 smash por 39 reais, subtítulo só às terças no balcão. Usar a foto do burger, para sexta.', TODAY)
    expect(f.headline).toBe('2 smash por 39 reais')
    expect(f.subtitle).toBe('Só às terças no balcão')
    expect(f.briefing).toContain('foto do burger')
    expect(f.publishDate).toBe('2026-11-27')
  })
  it('sem marcação, tudo vai para o briefing', () => {
    const f = fillBrief('Quero uma arte da Black Friday com desconto de 20 por cento', TODAY)
    expect(f).toMatchObject({ headline: '', subtitle: '', publishDate: null })
    expect(f.briefing).toContain('Black Friday')
  })
})
