import { describe, expect, it } from 'vitest'
import { composeTimecodes, normalizeTimecode } from './portalExtrasRules'

describe('normalizeTimecode', () => {
  it('mm:ss', () => expect(normalizeTimecode('1:05')).toBe('01:05'))
  it('segundos', () => expect(normalizeTimecode('65')).toBe('01:05'))
  it('h:mm:ss', () => expect(normalizeTimecode('1:02:03')).toBe('62:03'))
  it('inválido', () => expect(normalizeTimecode('1:75')).toBeNull())
})

describe('composeTimecodes', () => {
  it('ordena por tempo e ignora vazios', () => {
    expect(composeTimecodes([{ time: '0:40', note: 'cortar a pausa' }, { time: '0:05', note: 'trocar a música' }, { time: '1:00', note: ' ' }]))
      .toBe('[00:05] trocar a música\n[00:40] cortar a pausa')
  })
  it('sem tempo vai no fim', () => expect(composeTimecodes([{ time: '', note: 'geral' }, { time: '2', note: 'início' }])).toBe('[00:02] início\ngeral'))
})
