import { describe, expect, it } from 'vitest'
import {
  activeServiceNames,
  clientStatusLabel,
  DEFAULT_FILTERS,
  describeClient,
  filterClients,
  groupTeam,
  initials,
  sortClients,
  summarizePortfolio,
  whatsappLink,
  type ClientRecord,
} from './clientRules'

const TODAY = '2026-11-03'

const client = (over: Partial<ClientRecord> = {}): ClientRecord => ({
  id: '1', name: 'Ótica Sul', segment: 'Varejo', clientType: 'recurring', isActive: true, isLost: false, email: 'a@b.co', phone: '(81) 98888-7777',
  logoPath: null, logoUrl: null, description: null, targetAudience: null, competitors: null, valueProposition: null, acquisitionChannel: null,
  lostReason: null, lostAt: null, since: null, nps: null, updatedAt: '2026-11-01T00:00:00Z', showOnSite: false, squadId: null,
  contract: { model: 'MRR', startDate: '2026-05-20', endDate: '2027-05-20', months: 12, billingDay: 10 },
  services: [{ id: 's', serviceId: 'x', name: 'Tráfego', isActive: true, isAudiovisual: false, quantity: 1, notes: null, packageId: null, price: 600 }],
  team: [{ staffId: 'p1', name: 'Ingrid', role: 'social_media', photoUrl: null }],
  assessments: [{ id: 'a', level: 'bom', observation: null, assessedAt: '2026-10-30T10:00:00Z' }],
  ...over,
})

describe('describeClient', () => {
  it('junta tipo, valor, contrato, saúde e alertas', () => {
    const view = describeClient(client(), TODAY)
    expect(view).toMatchObject({ kind: 'fixo', entity: 'peformake', value: 600, missingPrices: 0, people: 1, flags: [] })
    expect(view.contract.state).toBe('ok')
    expect(view.health.latest).toBe('bom')
  })

  it('conta a mesma pessoa uma vez, mesmo com duas funções', () => {
    const view = describeClient(client({ team: [
      { staffId: 'p1', name: 'Higor', role: 'designer', photoUrl: null },
      { staffId: 'p1', name: 'Higor', role: 'social_media', photoUrl: null },
    ] }), TODAY)
    expect(view.people).toBe(1)
  })
})

describe('filtros e ordem', () => {
  const list = [
    describeClient(client(), TODAY),
    describeClient(client({ id: '2', name: 'Padaria', isActive: false, isLost: true }), TODAY),
    describeClient(client({
      id: '3', name: 'Moda Leve', clientType: 'one-off', team: [], assessments: [{ id: 'b', level: 'muito_ruim', observation: null, assessedAt: '2026-11-01T10:00:00Z' }],
      services: [{ id: 'y', serviceId: 'z', name: 'Edição', isActive: true, isAudiovisual: true, quantity: 1, notes: null, packageId: null, price: 300 }],
    }), TODAY),
  ]

  it('separa ativos e perdidos', () => {
    expect(filterClients(list, DEFAULT_FILTERS).map((v) => v.client.id)).toEqual(['1', '3'])
    expect(filterClients(list, { ...DEFAULT_FILTERS, status: 'lost' }).map((v) => v.client.id)).toEqual(['2'])
  })

  it('filtra por tipo, empresa e alerta', () => {
    expect(filterClients(list, { ...DEFAULT_FILTERS, kind: 'avulso' }).map((v) => v.client.id)).toEqual(['3'])
    expect(filterClients(list, { ...DEFAULT_FILTERS, entity: 'ellcazo' }).map((v) => v.client.id)).toEqual(['3'])
    expect(filterClients(list, { ...DEFAULT_FILTERS, flag: 'any' }).map((v) => v.client.id)).toEqual(['3'])
    expect(filterClients(list, { ...DEFAULT_FILTERS, flag: 'no_team' }).map((v) => v.client.id)).toEqual(['3'])
  })

  it('busca sem acento, por telefone e por pessoa da equipe', () => {
    expect(filterClients(list, { ...DEFAULT_FILTERS, search: 'otica' }).map((v) => v.client.id)).toEqual(['1'])
    expect(filterClients(list, { ...DEFAULT_FILTERS, search: '98888' }).map((v) => v.client.id)).toEqual(['1', '3'])
    expect(filterClients(list, { ...DEFAULT_FILTERS, search: 'ingrid' }).map((v) => v.client.id)).toEqual(['1'])
  })

  it('ordena por valor e pela pior saúde', () => {
    expect(sortClients(list, 'value').map((v) => v.client.id)).toEqual(['1', '2', '3'])
    expect(sortClients(list, 'health')[0]?.client.id).toBe('3')
  })

  it('resume a carteira só com ativos', () => {
    expect(summarizePortfolio(list)).toEqual({ active: 2, recurringValue: 600, projectValue: 300, needAttention: 1, atRisk: 1, contractsEnding: 0 })
  })
})

describe('equipe', () => {
  it('agrupa funções por pessoa e põe squad por último', () => {
    expect(groupTeam([
      { staffId: 'a', name: 'Aleffer', role: 'squad', photoUrl: null },
      { staffId: 'h', name: 'Higor', role: 'social_media', photoUrl: null },
      { staffId: 'h', name: 'Higor', role: 'designer', photoUrl: null },
    ])).toEqual([
      { staffId: 'h', name: 'Higor', photoUrl: null, roles: ['social_media', 'designer'] },
      { staffId: 'a', name: 'Aleffer', photoUrl: null, roles: ['squad'] },
    ])
  })
})

describe('auxiliares', () => {
  it('lista serviços ativos sem repetir', () => {
    expect(activeServiceNames(client())).toEqual(['Tráfego'])
  })

  it('monta link de WhatsApp só com número válido', () => {
    expect(whatsappLink('(81) 98888-7777')).toBe('https://wa.me/5581988887777')
    expect(whatsappLink('+55 81 98888-7777')).toBe('https://wa.me/5581988887777')
    expect(whatsappLink('123')).toBeNull()
    expect(whatsappLink(null)).toBeNull()
  })

  it('gera iniciais e situação', () => {
    expect(initials('Ótica Sul Prime')).toBe('ÓP')
    expect(initials('  ')).toBe('?')
    expect(clientStatusLabel({ isActive: true, isLost: false })).toBe('Ativo')
    expect(clientStatusLabel({ isActive: false, isLost: true })).toBe('Perdido')
    expect(clientStatusLabel({ isActive: false, isLost: false })).toBe('Inativo')
  })
})
