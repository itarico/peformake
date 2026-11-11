import { describe, expect, it } from 'vitest'
import { balance, dueFor, itemsTotal, num, orderState, overLimit, parseItems, type Bid, type BidOrder } from './bidRules'

const PEDIDO = `1 (E.T - item 4.2) UN 3 2.650,00 7.950,00
2 (E.T - item 4.3) UN 5 2.200,00 11.000,00
3 Edição de vídeo (E.T - item 4.4) UN 4 650,00 2.600,00
4 Produção de áudio (E.T - item 4.5) UN 2 300,00 600,00
5 (E.T - item 4.6) UN 5 600,00 3.000,00
6 (E.T - item 4.7) UN 10 700,00 7.000,00
7 Banner (E.T - item 4.8) UN 10 150,00 1.500,00
8 (E.T - item 4.9) UN 2 500,00 1.000,00`

describe('licitação: colar itens', () => {
  it('lê a tabela do pedido de compras e confere o total', () => {
    const { items, skipped } = parseItems(PEDIDO)
    expect(skipped).toEqual([])
    expect(items).toHaveLength(8)
    expect(items[0]).toEqual({ description: '(E.T - item 4.2)', unit_label: 'UN', max_qty: 3, unit_price: 2650 })
    expect(items[2]!.description).toBe('Edição de vídeo (E.T - item 4.4)')
    expect(itemsTotal(items)).toBe(34650)
  })
  it('aceita planilha (tab/;) e linhas sem unidade ou total', () => {
    const { items, skipped } = parseItems('Banner\tUN\t10\t150\nVídeo curto;4;R$ 650,00\nsem número aqui')
    expect(items.map((i) => [i.description, i.unit_label, i.max_qty, i.unit_price])).toEqual([['Banner', 'UN', 10, 150], ['Vídeo curto', 'UN', 4, 650]])
    expect(skipped).toEqual(['sem número aqui'])
  })
  it('números no jeito brasileiro', () => {
    expect(num('2.650,00')).toBe(2650)
    expect(num('2.650')).toBe(2650)
    expect(num('650,5')).toBe(650.5)
    expect(num('abc')).toBeNull()
  })
})

const order = (o: Partial<BidOrder>): BidOrder => ({ id: 'o', bid_id: 'b', seq: 1, planned_on: null, done_on: null, status: 'aberta', notes: null, over_ok: false, nf_number: null, nf_on: null, nf_files: [], invoice_id: null, amount: 0, lines: [], invoice: null, ...o })

describe('licitação: saldo e OS', () => {
  const items = parseItems(PEDIDO).items.map((i, n) => ({ ...i, id: `i${n}`, used_qty: n === 0 ? 3 : 0 }))
  const bid = { items, ends_on: '2026-08-25', orders: [order({ amount: 7950, status: 'realizada' }), order({ amount: 999, status: 'cancelada' })] } as Pick<Bid, 'items' | 'orders' | 'ends_on'>
  it('usado ignora OS cancelada e conta os dias que faltam', () => {
    expect(balance(bid, '2026-08-15')).toEqual({ total: 34650, used: 7950, left: 26700, pct: 23, daysLeft: 10 })
  })
  it('avisa quando a quantidade passa do que resta', () => {
    expect(overLimit(items, { i0: 1, i1: 5 })).toEqual([{ description: '(E.T - item 4.2)', asked: 1, left: 0 }])
  })
  it('vencimento 30 dias depois da realização ou da NF', () => {
    expect(dueFor({ due_from: 'realizacao', payment_days: 30 }, '2026-11-05')).toBe('2026-12-05')
    expect(dueFor({ due_from: 'nf', payment_days: 30 }, '2026-11-05')).toBeNull()
    expect(dueFor({ due_from: 'nf', payment_days: 30 }, '2026-11-05', '2026-11-10')).toBe('2026-12-10')
  })
  it('situação da OS', () => {
    expect(orderState(order({ status: 'realizada' }), '2026-11-11').label).toBe('Aguardando NF')
    expect(orderState(order({ status: 'realizada', invoice: { id: 'f', status: 'pendente', due_date: '2026-11-01', paid_at: null } }), '2026-11-11')).toEqual({ label: 'Vencida 01/11', tone: 'warn' })
    expect(orderState(order({ status: 'realizada', nf_on: '2026-11-02', invoice: { id: 'f', status: 'pendente', due_date: '2026-12-05', paid_at: null } }), '2026-11-11').label).toBe('Vence 05/12')
  })
})
