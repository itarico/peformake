import { describe, expect, it } from 'vitest'
import { ago } from './AutomationsCenter'

describe('ago (última execução)', () => {
  const now = Date.parse('2026-11-07T15:00:00Z')
  it('minutos e horas', () => {
    expect(ago('2026-11-07T14:55:00Z', now)).toBe('há 5 min')
    expect(ago('2026-11-07T12:00:00Z', now)).toBe('há 3 h')
    expect(ago('2026-11-07T15:00:20Z', now)).toBe('agora')
  })
  it('mais de um dia mostra data e hora de Brasília', () => {
    expect(ago('2026-11-05T09:40:00Z', now)).toBe('05/11, 06:40')
  })
  it('sem data', () => { expect(ago(null, now)).toBeNull() })
})
