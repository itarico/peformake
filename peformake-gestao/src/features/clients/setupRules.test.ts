import { describe, expect, it } from 'vitest'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import type { ClientRecord } from './clientRules'
import { pendingSetupFrom, setupStepLink } from './setupRules'
import { setupNotice } from '@/features/goals/chatNotices'

const daysAgo = (n: number) => new Date(Date.parse(`${todayInBrazil()}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10)
const client = (over: Partial<ClientRecord> = {}): ClientRecord => ({
  id: 'c1', name: 'Ótica Sul', segment: 'Varejo', clientType: 'recurring', isActive: true, isLost: false, email: 'a@b.co', phone: null,
  logoPath: null, logoUrl: null, description: null, targetAudience: null, competitors: null, valueProposition: null, acquisitionChannel: null,
  lostReason: null, lostAt: null, since: daysAgo(5), nps: null, updatedAt: '2026-11-01T00:00:00Z', showOnSite: false, squadId: null,
  document: '12345678000195', legalName: null, address: 'Rua A, 1', billingEmail: null, instagram: '@otica',
  contract: { model: 'MRR', startDate: '2026-11-20', endDate: null, months: 12, billingDay: 10 },
  services: [{ id: 's', serviceId: 'x', name: 'Tráfego', isActive: true, isAudiovisual: false, quantity: 1, notes: null, packageId: null, price: 600 }],
  team: [], assessments: [],
  ...over,
})

describe('pendingSetupFrom', () => {
  it('mostra o próximo passo do cliente novo e o link que abre o pop-up do passo', () => {
    const list = pendingSetupFrom([client({ contract: { model: 'MRR', startDate: null, endDate: null, months: null, billingDay: null } })], new Map([['c1', 'assinado']]), true)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ client: 'Ótica Sul', step: { id: 'cobranca', label: 'Cobrança' }, to: '/clientes/c1?passo=cobranca' })
  })

  it('some quando todos os passos obrigatórios estão feitos', () => {
    expect(pendingSetupFrom([client()], new Map([['c1', 'assinado']]), true)).toEqual([])
  })

  it('contrato só conta para o admin; para o head o cliente fica em dia', () => {
    expect(pendingSetupFrom([client()], new Map(), true)[0]?.step.id).toBe('contrato')
    expect(pendingSetupFrom([client()], new Map(), false)).toEqual([])
  })

  it('ignora cliente antigo, perdido ou inativo', () => {
    const empty = { document: null }
    expect(pendingSetupFrom([client({ ...empty, since: daysAgo(90) }), client({ ...empty, id: 'c2', isLost: true }), client({ ...empty, id: 'c3', isActive: false })], new Map(), true)).toEqual([])
  })

  it('serviços abre a aba do dia a dia', () => {
    expect(setupStepLink('c1', 'servicos')).toBe('/clientes/c1?aba=operacao')
    const list = pendingSetupFrom([client({ services: [] })], new Map([['c1', 'assinado']]), true)
    expect(list[0]?.to).toBe('/clientes/c1?aba=operacao')
  })
})

describe('setupNotice (Bete)', () => {
  it('vira uma linha só, com o link do passo', () => {
    expect(setupNotice([])).toBeNull()
    const one = setupNotice([{ clientId: 'c1', client: 'Ótica Sul', step: { id: 'cobranca', label: 'Cobrança' }, to: '/clientes/c1?passo=cobranca' }])
    expect(one).toMatchObject({ title: '🧩 Ótica Sul: falta Cobrança', to: '/clientes/c1?passo=cobranca' })
    const two = setupNotice([
      { clientId: 'c1', client: 'Ótica Sul', step: { id: 'cobranca', label: 'Cobrança' }, to: '/clientes/c1?passo=cobranca' },
      { clientId: 'c2', client: 'Pet Mania', step: { id: 'empresa', label: 'Empresa' }, to: '/clientes/c2?passo=empresa' },
    ])
    expect(two?.title).toBe('🧩 2 clientes novos com o cadastro pela metade')
    expect(two?.sub).toBe('Ótica Sul: falta Cobrança · Pet Mania: falta Empresa')
  })
})
