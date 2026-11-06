import { describe, expect, it } from 'vitest'
import {
  conversationStatus,
  conversionRate,
  filterContacts,
  formatPhone,
  parseBRL,
  parseKeywords,
  saleTotals,
  sortContacts,
  suggestionText,
  EMPTY_CONTACT_FILTERS,
  type Contact,
  type Deal,
  type Sale,
  avatarOf, dayLabel, groupByDay, listTime,
} from './commercialRules'

const settings = { replySlaMinutes: 120, staleDays: 3 }
const NOW = Date.parse('2026-11-03T15:00:00Z')
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString()

function contact(over: Partial<Contact>): Contact {
  return {
    id: 'c1', chatJid: '1@lid', isGroup: false, phone: null, waName: null, displayName: null, kind: 'novo',
    clientId: null, ownerId: null, notes: null, hidden: false, firstMessageAt: null, lastMessageAt: ago(10),
    lastInboundAt: null, lastFromMe: false, lastPreview: null, unansweredCount: 1, updatedAt: ago(0), tags: [],
    aiSummary: null, aiIntent: null, aiSentiment: null, aiAnalyzedAt: null, avatarPath: null, verifiedName: null, about: null, enrichedAt: null,
    ...over,
  }
}

describe('conversationStatus', () => {
  it('fica em dia dentro do prazo de resposta', () => {
    expect(conversationStatus(contact({ lastMessageAt: ago(30), lastFromMe: false }), settings, NOW)).toBe('em_dia')
  })
  it('vira sem resposta depois do prazo quando a última mensagem é do contato', () => {
    expect(conversationStatus(contact({ lastMessageAt: ago(121), lastFromMe: false }), settings, NOW)).toBe('sem_resposta')
  })
  it('fica aguardando quando respondemos por último', () => {
    expect(conversationStatus(contact({ lastMessageAt: ago(500), lastFromMe: true }), settings, NOW)).toBe('aguardando_cliente')
  })
  it('vira parada depois dos dias sem mensagem, de qualquer lado', () => {
    expect(conversationStatus(contact({ lastMessageAt: ago(3 * 1440 + 1), lastFromMe: false }), settings, NOW)).toBe('parada')
    expect(conversationStatus(contact({ lastMessageAt: ago(3 * 1440 + 1), lastFromMe: true }), settings, NOW)).toBe('parada')
  })
})

describe('sortContacts', () => {
  it('põe sem resposta no topo, a mais antiga primeiro', () => {
    const list = [
      contact({ id: 'recente', lastMessageAt: ago(5), lastFromMe: true }),
      contact({ id: 'sem-nova', lastMessageAt: ago(200), lastFromMe: false }),
      contact({ id: 'sem-velha', lastMessageAt: ago(900), lastFromMe: false }),
    ]
    expect(sortContacts(list, settings, NOW).map((c) => c.id)).toEqual(['sem-velha', 'sem-nova', 'recente'])
  })
})

describe('filterContacts', () => {
  const list = [
    contact({ id: 'a', displayName: 'João Pizzaria', tags: [{ tagId: 't1', source: 'auto' }] }),
    contact({ id: 'g', isGroup: true, waName: 'Equipe de marketing F5' }),
    contact({ id: 'p', kind: 'pessoal', displayName: 'Mãe' }),
  ]
  it('mostra só conversas privadas e esconde pessoais por padrão', () => {
    expect(filterContacts(list, EMPTY_CONTACT_FILTERS, settings, NOW, () => undefined).map((c) => c.id)).toEqual(['a'])
  })
  it('filtra por etiqueta e busca sem acento', () => {
    const filters = { ...EMPTY_CONTACT_FILTERS, audience: 'todos' as const, tagId: 't1', search: 'joao' }
    expect(filterContacts(list, filters, settings, NOW, () => undefined).map((c) => c.id)).toEqual(['a'])
  })
})

describe('formatos', () => {
  it('formata telefone com e sem 55', () => {
    expect(formatPhone('5581985672212')).toBe('(81) 98567-2212')
    expect(formatPhone('8132221111')).toBe('(81) 3222-1111')
  })
  it('lê valores em reais', () => {
    expect(parseBRL('R$ 1.500,50')).toBe(150050)
    expect(parseBRL('1500')).toBe(150000)
    expect(parseBRL('1.500')).toBe(150000)
    expect(parseBRL('')).toBeNull()
  })
  it('limpa palavras-chave e mantém o * só no fim', () => {
    expect(parseKeywords('Orçamento*, quanto CUSTA\npi*x, a')).toEqual(['orcamento*', 'quanto custa', 'pix'])
  })
})

describe('suggestionText', () => {
  it('descreve o que muda ao aceitar', () => {
    const base = { id: 's', contactId: 'c', evidence: null, createdAt: '' }
    expect(suggestionText({ ...base, kind: 'tipo', payload: { kind: 'lead' } })).toBe('Marcar como Lead')
    expect(suggestionText({ ...base, kind: 'etapa', payload: { stage: 'negociacao', reason: 'pediu proposta' } })).toBe('Mover a oportunidade para Negociação: pediu proposta')
    expect(suggestionText({ ...base, kind: 'pedido', payload: { title: 'Criar arte da promoção' } })).toBe('Criar tarefa: Criar arte da promoção')
  })
})

describe('totais', () => {
  const sale = (over: Partial<Sale>): Sale => ({
    id: 's', dealId: null, contactId: null, clientId: null, description: 'x', valueCents: 1000,
    saleDate: '2026-11-02', status: 'confirmada', source: 'manual', excerpt: null, createdAt: '', ...over,
  })
  it('faturamento soma só confirmadas do mês', () => {
    const totals = saleTotals([sale({}), sale({ status: 'pendente', valueCents: 500 }), sale({ status: 'recusada' }), sale({ saleDate: '2026-10-30' })], '2026-11')
    expect(totals).toEqual({ confirmedCents: 1000, confirmedCount: 1, pendingCents: 500, pendingCount: 1 })
  })
  it('conversão conta ganhos e pós-venda sobre os fechados no mês', () => {
    const deal = (stage: Deal['stage'], closedAt: string | null): Deal => ({
      id: stage, contactId: 'c', title: 't', stage, serviceId: null, valueCents: null, ownerId: null, nextStep: null,
      nextStepAt: null, lostReason: null, position: 0, createdBy: null, createdAt: '', updatedAt: '', closedAt,
    })
    expect(conversionRate([deal('ganho', '2026-11-01T10:00:00Z'), deal('perdido', '2026-11-02T10:00:00Z'), deal('negociacao', null)], '2026-11')).toBe(0.5)
    expect(conversionRate([deal('negociacao', null)], '2026-11')).toBeNull()
  })
})

describe('conversa estilo WhatsApp', () => {
  const now = Date.parse('2026-11-05T15:00:00Z')
  it('dayLabel', () => {
    expect(dayLabel('2026-11-05T13:00:00Z', now)).toBe('Hoje')
    expect(dayLabel('2026-11-04T13:00:00Z', now)).toBe('Ontem')
    expect(dayLabel('2026-10-01T13:00:00Z', now)).toBe('01/10/2026')
  })
  it('groupByDay junta e mantém ordem', () => {
    const g = groupByDay([{ sentAt: '2026-11-04T13:00:00Z' }, { sentAt: '2026-11-04T14:00:00Z' }, { sentAt: '2026-11-05T10:00:00Z' }], now)
    expect(g.map((x) => [x.label, x.items.length])).toEqual([['Ontem', 2], ['Hoje', 1]])
  })
  it('avatarOf', () => {
    expect(avatarOf('Maria da Silva').initials).toBe('MS')
    expect(avatarOf('Brio').initials).toBe('BR')
    expect(avatarOf('Maria da Silva').hue).toBe(avatarOf('Maria da Silva').hue)
  })
  it('listTime', () => {
    expect(listTime('2026-11-04T13:00:00Z', now)).toBe('Ontem')
    expect(listTime(null, now)).toBe('')
  })
})
