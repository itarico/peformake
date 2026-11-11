import { describe, expect, it } from 'vitest'
import type { Service } from '@/features/catalog/ServiceCatalog'
import type { Sale } from './commercialRules'
import { addDays, centsToInput, confirmedWithoutBilling, defaultKind, filterSales, needsCompletion, suggestKind, suggestService, firstBillingMonth, itemTotals, newItem, parseMoney, unitOf, validateNewClient } from './saleRules'

const svc = (over: Partial<Service> = {}): Service => ({
  id: 's1', name: 'Vídeo', area: 'audiovisual', description: null, deliverables: null, unit: 'unidade', isActive: true, price: 150, clients: 0, deliveryUnit: null,
  options: [{ id: 'v1', kind: 'variacao', name: 'Com drone', price: 400 }, { id: 'x1', kind: 'extra', name: 'Legenda', price: 50 }], ...over,
})

describe('itemTotals', () => {
  it('soma variação, quantidade, extra e desconto como o banco', () => {
    const it0 = { ...newItem(svc(), 'a'), variantId: 'v1', quantity: 2, extras: { x1: 1 }, discountType: 'percent' as const, discount: '10' }
    expect(itemTotals(it0, svc())).toMatchObject({ line: 800, extras: 50, discount: 85, total: 765, needsVariant: false })
  })
  it('pede a variação quando o serviço tem variações', () => {
    expect(itemTotals(newItem(svc(), 'a'), svc()).needsVariant).toBe(true)
  })
  it('desconto em R$ não passa do total', () => {
    const s = svc({ options: [] })
    expect(itemTotals({ ...newItem(s, 'a'), discountType: 'fixed', discount: '999' }, s).total).toBe(0)
  })
  it('preço manual (admin) substitui o catálogo', () => {
    const s = svc({ options: [] })
    expect(itemTotals({ ...newItem(s, 'a'), price: '1.000,50' }, s).total).toBe(1000.5)
  })
})

describe('regras da venda', () => {
  it('mensal nasce recorrente; audiovisual é Ellcazo', () => {
    expect(defaultKind({ unit: 'mês' })).toBe('recorrente')
    expect(defaultKind({ unit: 'projeto' })).toBe('avulso')
    expect(unitOf({ area: 'audiovisual' })).toBe('ellcazo')
    expect(unitOf({ area: 'trafego' })).toBe('peformake')
  })
  it('1ª mensalidade no mês seguinte ao início', () => {
    expect(firstBillingMonth('2026-11-15')).toBe('dez/2026')
    expect(firstBillingMonth('2026-12-01')).toBe('jan/2027')
    expect(addDays('2026-11-29', 3)).toBe('2026-12-02')
  })
  it('valores em reais', () => {
    expect(parseMoney('1.500,00')).toBe(1500)
    expect(parseMoney('99.9')).toBe(99.9)
    expect(parseMoney('')).toBe(0)
  })
  it('cliente novo: responsável e WhatsApp obrigatórios, empresa opcional', () => {
    expect(validateNewClient({ company: '', person: 'Ana Lima', phone: '(81) 98888-7777', email: '' })).toEqual({})
    const e = validateNewClient({ company: 'A', person: '', phone: '123', email: 'x@' })
    expect(Object.keys(e).sort()).toEqual(['company', 'email', 'person', 'phone'])
  })
})

describe('filterSales', () => {
  const sale = (over: Partial<Sale>): Sale => ({ id: '1', dealId: null, contactId: null, clientId: 'c', description: 'Tráfego', valueCents: 100, saleDate: '2026-11-01', status: 'confirmada', source: 'manual', excerpt: null, createdAt: '', ...over })
  const list = [sale({ id: '1' }), sale({ id: '2', status: 'pendente', kind: 'recorrente', unit: 'ellcazo', description: 'Edição' })]
  it('busca sem acento e filtra', () => {
    expect(filterSales(list, { q: 'edicao', status: '', kind: '', unit: '' }, () => 'Cliente').map((s) => s.id)).toEqual(['2'])
    expect(filterSales(list, { q: '', status: 'confirmada', kind: '', unit: '' }, () => '').map((s) => s.id)).toEqual(['1'])
    expect(filterSales(list, { q: '', status: '', kind: 'avulso', unit: '' }, () => '').map((s) => s.id)).toEqual(['1'])
    expect(filterSales(list, { q: 'joão', status: '', kind: '', unit: '' }, (s) => (s.id === '1' ? 'Joao Silva' : 'X')).map((s) => s.id)).toEqual(['1'])
  })
})

describe('completar venda do agente', () => {
  const foto = svc({ id: 'f', name: 'Fotografia de evento', area: 'audiovisual', options: [] })
  const trafego = svc({ id: 't', name: 'Gestão de tráfego', area: 'trafego', unit: 'mês', options: [] })
  it('sugere o serviço de foto da Ellcazo pelo texto', () => {
    expect(suggestService('Cobertura fotográfica TRANSPETRO, 10/11, 8h às 16h', [trafego, foto])?.id).toBe('f')
    expect(suggestService('Gestão de tráfego pago', [foto, trafego])?.id).toBe('t')
    expect(suggestService('Consultoria', [foto, trafego])).toBeNull()
  })
  it('venda sem itens precisa completar; confirmada sem cobrança ganha selo', () => {
    expect(needsCompletion({ status: 'pendente', hasItems: false, billed: false })).toBe(true)
    expect(needsCompletion({ status: 'pendente', hasItems: true, billed: false })).toBe(false)
    expect(needsCompletion({ status: 'recusada', hasItems: false, billed: false })).toBe(false)
    expect(confirmedWithoutBilling({ status: 'confirmada', hasItems: false, billed: false })).toBe(true)
    expect(confirmedWithoutBilling({ status: 'confirmada', hasItems: true, billed: true })).toBe(false)
    expect(centsToInput(60000)).toBe('600,00')
    expect(suggestKind('Cobertura fotográfica 10/11')).toBe('avulso')
    expect(suggestKind('Plano mensal de fotos')).toBe('recorrente')
  })
})
