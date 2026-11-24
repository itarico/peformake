import { describe, expect, it } from 'vitest'
import { leadLabel, nextStep, phoneLabel, soldAtFromDay, sortClients, validPixel, type SalesClient } from './salesRules'

const client = (over: Partial<SalesClient>): SalesClient => ({
  id: 'c', name: 'Cliente', wa: null, pixelId: null, wabaId: null, testEventCode: null, sendEnabled: false, hasToken: false,
  leads: 0, fromAds: 0, hints: 0, sales: 0, valueCents: 0, sendErrors: 0, ...over,
})
const on = { status: 'conectado' as const, phone: '5581999991234', error: null }

describe('vendas do WhatsApp', () => {
  it('mostra o telefone com país, DDD e traço', () => {
    expect(phoneLabel('5581999991234')).toBe('+55 81 99999-1234')
    expect(phoneLabel('8133334444')).toBe('81 3333-4444')
    expect(phoneLabel(null)).toBe('')
  })

  it('usa o nome, depois o telefone, depois um texto padrão', () => {
    expect(leadLabel({ name: ' Ana ', phone: '5581999991234' })).toBe('Ana')
    expect(leadLabel({ name: null, phone: '5581999991234' })).toBe('+55 81 99999-1234')
    expect(leadLabel({ name: null, phone: null })).toBe('Contato sem nome')
  })

  it('aponta o próximo passo na ordem WhatsApp, Pixel, envio', () => {
    expect(nextStep(client({}))).toBe('whatsapp')
    expect(nextStep(client({ wa: { ...on, status: 'aguardando_qr' } }))).toBe('whatsapp')
    expect(nextStep(client({ wa: on }))).toBe('pixel')
    expect(nextStep(client({ wa: on, pixelId: '123456789012345' }))).toBe('envio')
    expect(nextStep(client({ wa: on, pixelId: '123456789012345', sendEnabled: true }))).toBeNull()
  })

  it('põe primeiro quem tem erro de envio, depois sinal de venda, depois quem já está conectado', () => {
    const list = [
      client({ id: 'a', name: 'Zeta' }),
      client({ id: 'b', name: 'Beta', wa: on }),
      client({ id: 'c', name: 'Alfa', wa: on, hints: 2 }),
      client({ id: 'd', name: 'Gama', wa: on, sendErrors: 1 }),
    ]
    expect(sortClients(list).map((c) => c.id)).toEqual(['d', 'c', 'b', 'a'])
  })

  it('aceita ID do Pixel só com 8 a 20 números', () => {
    expect(validPixel('1234567890123456')).toBe(true)
    expect(validPixel('1234')).toBe(false)
    expect(validPixel('abc')).toBe(false)
  })

  it('venda de hoje guarda a hora de agora; de outro dia, meio-dia de Brasília', () => {
    const now = new Date('2026-11-24T18:30:00Z')
    expect(soldAtFromDay('2026-11-24', now)).toBe('2026-11-24T18:30:00.000Z')
    expect(soldAtFromDay('2026-11-22', now)).toBe('2026-11-22T15:00:00.000Z')
  })
})
