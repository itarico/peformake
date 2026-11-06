import { describe, expect, it } from 'vitest'
import { deadlineText, decisionCounts, directionDeadline, monthOptions, routedLink, stageOf } from './strategyRules'

const now = new Date('2026-11-15T12:00:00Z')

describe('stageOf', () => {
  it('mostra preparando quando o pedido é mais novo que a estratégia', () => {
    expect(stageOf({ strategy: { status: 'draft', updatedAt: '2026-11-15T10:00:00Z' }, request: { status: 'queued', requestedAt: '2026-11-15T11:50:00Z' } }, now)).toBe('preparing')
  })
  it('ignora pedido antigo ou já concluído', () => {
    expect(stageOf({ strategy: null, request: { status: 'queued', requestedAt: '2026-11-15T10:00:00Z' } }, now)).toBe('none')
    expect(stageOf({ strategy: { status: 'draft', updatedAt: '2026-11-15T11:55:00Z' }, request: { status: 'done', requestedAt: '2026-11-15T11:50:00Z' } }, now)).toBe('review')
  })
  it('segue o status da estratégia', () => {
    expect(stageOf({ strategy: { status: 'approved', updatedAt: '2026-11-15T10:00:00Z' }, request: null }, now)).toBe('approved')
    expect(stageOf({ strategy: { status: 'sent', updatedAt: '2026-11-15T10:00:00Z' }, request: null }, now)).toBe('sent')
  })
})

describe('prazo do direcionamento', () => {
  it('é o dia 14 do mês anterior, inclusive na virada do ano', () => {
    expect(directionDeadline('2026-12-01')).toBe('2026-11-14')
    expect(directionDeadline('2027-01-01')).toBe('2026-12-14')
  })
  it('avisa quando passou do prazo', () => {
    expect(deadlineText('2026-11-20', '2026-12-01').late).toBe(true)
    expect(deadlineText('2026-11-10', '2026-12-01')).toEqual({ text: 'Preencha até 14/11 (faltam 4 dias). O agente gera no dia 15 às 8h.', late: false })
  })
})

describe('outros', () => {
  it('leva cada item aprovado para a tela certa', () => {
    expect(routedLink('content_items', 'a')).toBe('/conteudo/peca/a')
    expect(routedLink('av_projects', 'b')).toBe('/audiovisual/projeto/b')
    expect(routedLink('traffic_tasks', 'c')).toBe('/trafego/tarefas')
    expect(routedLink(null, null)).toBeNull()
  })
  it('conta as decisões', () => {
    expect(decisionCounts([{ status: 'proposed' }, { status: 'approved' }, { status: 'approved' }])).toEqual({ total: 3, proposed: 1, approved: 2, rejected: 0 })
  })
  it('lista cinco meses a partir de hoje', () => {
    expect(monthOptions('2026-11-03')).toEqual(['2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01'])
  })
})
