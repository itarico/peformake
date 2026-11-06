import { describe, expect, it } from 'vitest'
import { countStates, sortRows, stateOf, type BoardRow } from './reportBoardRules'

const row = (name: string, report: Partial<NonNullable<BoardRow['report']>> | null): BoardRow => ({
  client_id: name, name, has_phone: true, whatsapp_enabled: false, has_traffic_service: true,
  report: report === null ? null : { id: 'r', path: 'p', sent_at: null, send_error: null, by_agent: true, created_at: '', spend_cents: 0, results: 0, ...report },
})

describe('quadro de relatórios', () => {
  it('diz a situação de cada cliente', () => {
    expect(stateOf(row('a', null))).toBe('missing')
    expect(stateOf(row('a', {}))).toBe('ready')
    expect(stateOf(row('a', { send_error: 'sem telefone' }))).toBe('failed')
    expect(stateOf(row('a', { sent_at: '2026-11-03' }))).toBe('sent')
  })
  it('põe as pendências primeiro e conta cada situação', () => {
    const rows = [row('Z', { sent_at: 'x' }), row('B', {}), row('A', null), row('C', { send_error: 'x' })]
    expect(sortRows(rows).map((r) => r.name)).toEqual(['C', 'A', 'B', 'Z'])
    expect(countStates(rows)).toEqual({ sent: 1, failed: 1, ready: 1, missing: 1 })
  })
})
