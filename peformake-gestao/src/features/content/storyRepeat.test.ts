import { describe, expect, it } from 'vitest'
import { addDays, repeatDates, repeatSummary, type RepeatRule } from './storyRepeat'

const NOW = new Date('2026-11-24T12:00:00-03:00').getTime()
const at = (d: string, h: string) => new Date(`${d}T${h}:00-03:00`).toISOString()
const rule = (r: Partial<RepeatRule>): RepeatRule => ({ freq: 'semana', weekdays: [], hours: ['09:00'], span: '2s', until: '2026-12-31', ...r })

describe('repetição do story', () => {
  it('soma dias', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-11-24', 14)).toBe('2026-12-08')
  })

  it('sem repetir sai só uma vez', () => {
    expect(repeatDates(rule({ freq: 'nao' }), '2026-11-25', at('2026-11-25', '09:00'), NOW)).toEqual([at('2026-11-25', '09:00')])
  })

  it('segunda e quarta, 09:00 e 18:00, por 2 semanas a partir de quarta 25/11', () => {
    const dates = repeatDates(rule({ weekdays: [1, 3], hours: ['09:00', '18:00'] }), '2026-11-25', at('2026-11-25', '09:00'), NOW)
    expect(dates).toEqual([
      at('2026-11-25', '09:00'), at('2026-11-25', '18:00'),
      at('2026-11-30', '09:00'), at('2026-11-30', '18:00'),
      at('2026-12-02', '09:00'), at('2026-12-02', '18:00'),
      at('2026-12-07', '09:00'), at('2026-12-07', '18:00'),
    ])
    expect(repeatSummary(rule({ weekdays: [1, 3], hours: ['18:00', '09:00'] }), dates)).toBe('Sai 8 vezes · seg, qua às 09:00 e 18:00 · até 07/12')
  })

  it('todo dia até uma data, sem duplicar o horário de início', () => {
    const dates = repeatDates(rule({ freq: 'dia', span: 'ate', until: '2026-11-27' }), '2026-11-25', at('2026-11-25', '09:00'), NOW)
    expect(dates).toEqual([at('2026-11-25', '09:00'), at('2026-11-26', '09:00'), at('2026-11-27', '09:00')])
  })

  it('ignora horário no passado e limita a 60', () => {
    const past = repeatDates(rule({ freq: 'dia', hours: ['08:00'], span: '1s' }), '2026-11-24', at('2026-11-24', '12:00'), NOW)
    expect(past[0]).toBe(at('2026-11-24', '12:00'))
    expect(past).not.toContain(at('2026-11-24', '08:00'))
    const many = repeatDates(rule({ freq: 'dia', hours: ['08:00', '12:00', '18:00'], span: '2m' }), '2026-11-25', at('2026-11-25', '08:00'), NOW)
    expect(many).toHaveLength(60)
  })
})
