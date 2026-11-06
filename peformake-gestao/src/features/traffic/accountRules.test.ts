import { describe, expect, it } from 'vitest'
import { filterAccounts, isTrafficService, suggestClient, summarize, validateLink, type AdAccount, type TrafficClient } from './accountRules'

const client = (id: string, name: string, isActive = true): TrafficClient => ({ id, name, segment: null, isActive, hasTraffic: true })
const account = (over: Partial<AdAccount> = {}): AdAccount => ({
  id: '1', name: 'Conta', businessName: null, metaStatus: 'ACTIVE', hasPaymentMethod: true, isQueryable: true,
  mcpEnabled: true, clientId: null, enabled: false, readSource: 'api', updatedAt: '2026-01-01', ...over,
})

const clients = [client('w', 'Moto Sul'), client('o', 'ÓTICA Centro PRIME'), client('p', 'Padaria Sol'), client('q', 'Padaria Sol Norte')]

describe('suggestClient', () => {
  it('ignora número, acento e palavras genéricas', () => {
    expect(suggestClient('CA RESERVA MOTO SUL 02', clients)?.id).toBe('w')
    expect(suggestClient('Otica Centro', clients)?.id).toBe('o')
  })

  it('não sugere quando há dúvida ou o nome é só número', () => {
    expect(suggestClient('Padaria', clients)).toBeNull()
    expect(suggestClient('Sol', clients)).toBeNull()
    expect(suggestClient('4427080487576510', clients)).toBeNull()
    expect(suggestClient('Sem relação', clients)).toBeNull()
  })
})

describe('validateLink', () => {
  const list = [client('a', 'A'), client('b', 'B', false)]

  it('exige cliente ativo para habilitar', () => {
    expect(validateLink(null, true, list)).toMatch(/Escolha/)
    expect(validateLink('b', true, list)).toMatch(/inativo/)
    expect(validateLink('x', true, list)).toMatch(/não encontrado/)
    expect(validateLink('a', true, list)).toBeNull()
  })

  it('permite guardar vínculo sem habilitar', () => {
    expect(validateLink('b', false, list)).toBeNull()
    expect(validateLink(null, false, list)).toBeNull()
  })
})

describe('filterAccounts', () => {
  const list = [
    account({ id: '1', name: 'Alfa', clientId: 'w', enabled: true }),
    account({ id: '2', name: 'Beta', hasPaymentMethod: false }),
    account({ id: '3', name: 'Gama', businessName: 'Empresa X', clientId: 'p' }),
  ]

  it('aplica filtros', () => {
    expect(filterAccounts(list, 'unlinked', '', clients).map((a) => a.id)).toEqual(['2'])
    expect(filterAccounts(list, 'enabled', '', clients).map((a) => a.id)).toEqual(['1'])
    expect(filterAccounts(list, 'alerts', '', clients).map((a) => a.id)).toEqual(['2'])
  })

  it('busca por conta, empresa e cliente', () => {
    expect(filterAccounts(list, 'all', 'empresa x', clients).map((a) => a.id)).toEqual(['3'])
    // Em uso: só vinculada, habilitada ou com gasto; a busca procura em todas.
    expect(filterAccounts(list, 'in_use', '', clients, new Set()).map((a) => a.id)).toEqual(['1', '3'])
    expect(filterAccounts(list, 'in_use', '', clients, new Set(['2'])).map((a) => a.id)).toEqual(['1', '2', '3'])
    expect(filterAccounts(list, 'in_use', 'beta', clients, new Set()).map((a) => a.id)).toEqual(['2'])
    expect(filterAccounts(list, 'all', 'moto sul', clients).map((a) => a.id)).toEqual(['1'])
  })
})

describe('summarize', () => {
  it('conta clientes ativos sem conta habilitada', () => {
    const summary = summarize(
      [client('a', 'A'), client('b', 'B'), client('c', 'C', false)],
      [account({ id: '1', clientId: 'a', enabled: true }), account({ id: '2', clientId: 'b' }), account({ id: '3' })],
    )
    expect(summary).toEqual({ activeClients: 2, accounts: 3, enabledAccounts: 1, unlinkedAccounts: 1, activeClientsWithoutEnabled: 1 })
  })
})

describe('isTrafficService', () => {
  it('aceita tráfego com e sem acento e recusa outros serviços', () => {
    expect(isTrafficService('Tráfego pago')).toBe(true)
    expect(isTrafficService('trafego')).toBe(true)
    expect(isTrafficService('Social media')).toBe(false)
  })
})
