import { describe, expect, it } from 'vitest'
import { operationOverview, operationTone, servicesProgress, type OperationRow } from './operationApi'

const row = (pct: number | null): OperationRow => ({ client_id: String(pct), name: 'x', areas: [], design: null, audiovisual: null, trafego: null, pct })

describe('operationTone', () => {
  it('80% ou mais está em dia', () => expect(operationTone(80).label).toBe('Em dia'))
  it('menos de 40% está atrasado', () => expect(operationTone(39).label).toBe('Atrasado'))
  it('sem dado mostra sem entregas', () => expect(operationTone(null).label).toBe('Sem entregas no mês'))
})

describe('operationOverview', () => {
  it('ignora clientes sem dado na média', () => {
    const o = operationOverview([row(100), row(20), row(null)])
    expect(o).toMatchObject({ avg: 60, onTrack: 1, total: 3 })
    expect(o.late.map((r) => r.pct)).toEqual([20])
  })
  it('lista vazia não quebra', () => expect(operationOverview([]).avg).toBeNull())
})

describe('servicesProgress', () => {
  it('soma por serviço e no geral', () => {
    const r = (o: Partial<OperationRow>): OperationRow => ({ client_id: Math.random().toString(), name: 'x', areas: [], design: null, audiovisual: null, trafego: null, pct: null, ...o })
    const out = servicesProgress([
      r({ design: { total: 10, done: 5, waiting: 2 }, trafego: { weekly_sent: 1, weekly_due: 2, strategy: true } }),
      r({ design: { total: 10, done: 10, waiting: 0 }, audiovisual: { total: 0, done: 0, waiting: 0 } }),
    ])
    expect(out.services.map((s) => [s.key, s.done, s.total])).toEqual([['design', 15, 20], ['audiovisual', 0, 1], ['trafego', 2, 3]])
    expect(out.overall).toEqual({ done: 17, total: 24, pct: 71 })
  })
})
