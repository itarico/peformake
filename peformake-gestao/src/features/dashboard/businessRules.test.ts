import { describe, expect, it } from 'vitest'
import { businessKpis, clientsInsight, concentrationInsight, revenueInsight, type BusinessDash, type BusinessMonth } from './businessRules'

const m = (month: string, active: number, left: number, mrr: number, received = 0): BusinessMonth => ({ month, active, joined: 0, left, mrr_peformake: mrr, mrr_ellcazo: 0, received, costs: 0 })
const dash = (months: BusinessMonth[], top = 0): BusinessDash => ({ months, paying_clients: 10, top_clients: top ? [{ name: 'Alfa', amount: top }] : [], by_service: [], tenure_avg_months: 4, lost_tenure_avg_months: 2.5 })

describe('businessKpis', () => {
  it('perda de cliente reduz ativos e entra no churn de 3 meses', () => {
    const k = businessKpis(dash([m('2026-07', 20, 0, 10000), m('2026-08', 20, 0, 10000), m('2026-09', 19, 1, 9500), m('2026-10', 18, 1, 9000)]))
    expect(k.active).toBe(18)
    expect(k.churn3).toBe(10)
    expect(k.mrr).toBe(9000)
    expect(k.ticket).toBe(900)
  })
  it('sem recebido, realizado fica nulo e a frase manda lançar no Financeiro', () => {
    const k = businessKpis(dash([m('2026-10', 5, 0, 5000)]))
    expect(k.realized).toBeNull()
    expect(revenueInsight(k)).toContain('Financeiro')
  })
  it('recebido parcial mostra quanto falta', () => {
    const k = businessKpis(dash([m('2026-10', 5, 0, 10000, 6000)]))
    expect(k.realized).toBe(60)
    expect(revenueInsight(k)).toContain('Faltam')
  })
  it('concentração alta avisa', () => {
    const k = businessKpis(dash([m('2026-10', 5, 0, 10000)], 3000))
    expect(concentrationInsight(k, 'Alfa')).toContain('30%')
  })
  it('sem histórico de 3 meses não inventa churn', () => {
    const k = businessKpis(dash([m('2026-10', 5, 0, 1000)]))
    expect(clientsInsight(k, null)).toContain('três meses')
  })
})
