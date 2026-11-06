import { describe, expect, it } from 'vitest'
import { noticesFrom, pendingFrom } from './chatNotices'

const now = Date.parse('2026-11-06T20:00:00Z')
const n = (id: string, kind: string, title: string, min: number, readAt: string | null = null) => ({ id, kind, title, body: null, link: '/x/y', readAt, createdAt: new Date(now - min * 60_000).toISOString() })

describe('noticesFrom', () => {
  it('agrupa avisos do mesmo tipo e ignora lidos e antigos', () => {
    const out = noticesFrom([n('1', 'crm_new_contact', 'Novo número: Ana', 5), n('2', 'crm_new_contact', 'Novo número: Bia', 9), n('3', 'av_review', 'Vídeo pronto: 3LM', 30), n('4', 'av_review', 'x', 10, 'lido'), n('5', 'crm_new_lead', 'velho', 60 * 24 * 9)], now)
    expect(out.map((x) => x.title)).toEqual(['2 números novos no WhatsApp', 'Vídeo pronto: 3LM'])
    expect(out[0]!.lines).toEqual(['Ana', 'Bia'])
    expect(out[1]!.action?.label).toBe('Revisar vídeo')
  })
})

describe('pendingFrom', () => {
  it('lista só o atrasado, mais atrasado primeiro', () => {
    const m = new Map([['a', [{ key: 'r', label: 'Reunião', done: false, late_days: 2, due: null }, { key: 's', label: 'Estratégia', done: true, late_days: 9, due: null }]], ['b', [{ key: 'r', label: 'Relatório', done: false, late_days: 6, due: null }]]])
    expect(pendingFrom(m, (id) => id.toUpperCase(), '2026-11-06').map((x) => `${x.client}:${x.late}`)).toEqual(['B:6', 'A:2'])
  })
})
