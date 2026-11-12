import { describe, expect, it } from 'vitest'
import { actionState, addMonths, currentWeek, defaultMonth, monthName, monthOptions, parseMonthParam, textPages, weekRange, weekSummary, weeksOf, type MonthlyAction } from './monthlyRules'

const d = (s: string) => new Date(`${s}T12:00:00`)

describe('estratégia do mês: meses e semanas', () => {
  it('abre o mês atual até o dia 19 e o seguinte a partir do dia 20', () => {
    expect(defaultMonth(d('2026-11-12'))).toBe('2026-11-01')
    expect(defaultMonth(d('2026-11-20'))).toBe('2026-12-01')
    expect(defaultMonth(d('2026-12-28'))).toBe('2027-01-01')
  })
  it('só deixa escolher o mês atual e o seguinte', () => {
    expect(monthOptions(d('2026-12-05'))).toEqual(['2026-12-01', '2027-01-01'])
    expect(parseMonthParam('2026-12', d('2026-11-12'))).toBe('2026-12-01')
    expect(parseMonthParam('2025-01', d('2026-11-12'))).toBe('2026-11-01')
    expect(parseMonthParam(null, d('2026-11-25'))).toBe('2026-12-01')
  })
  it('soma meses virando o ano', () => {
    expect(addMonths('2026-12-01', 1)).toBe('2027-01-01')
    expect(addMonths('2026-01-01', -1)).toBe('2025-12-01')
  })
  it('as 4 semanas cobrem o mês todo (a 4ª vai até o fim)', () => {
    const w = weeksOf('2026-02-01')
    expect(w.map((x) => [x.from, x.to])).toEqual([['2026-02-01', '2026-02-07'], ['2026-02-08', '2026-02-14'], ['2026-02-15', '2026-02-21'], ['2026-02-22', '2026-02-28']])
    expect(weekRange('2026-12-01', 4)).toBe('22/12 a 31/12')
  })
  it('semana de hoje só no próprio mês', () => {
    expect(currentWeek('2026-11-01', d('2026-11-12'))).toBe(2)
    expect(currentWeek('2026-11-01', d('2026-11-30'))).toBe(4)
    expect(currentWeek('2026-12-01', d('2026-11-30'))).toBeNull()
  })
  it('nome do mês com maiúscula', () => { expect(monthName('2026-12-01')).toBe('Dezembro') })
})

const a = (o: Partial<MonthlyAction>): MonthlyAction => ({ id: '1', week: 1, area: 'social', title: 'Post', what: '', place: null, owner_role: null, due_date: null, proof: null, why: null, format: null, status: 'proposta', routed_table: null, routed_id: null, routed_link: null, suggestion: null, done: null, ...o })

describe('estratégia do mês: ações', () => {
  it('situação diz o que fazer', () => {
    expect(actionState(a({})).label).toBe('Para aprovar')
    expect(actionState(a({ status: 'aprovada', routed_table: 'content_items' })).label).toBe('Na fila · Social')
    expect(actionState(a({ status: 'aprovada', done: true })).label).toBe('Feito')
  })
  it('resumo da semana ignora as recusadas', () => {
    expect(weekSummary([a({}), a({ status: 'recusada' }), a({ status: 'aprovada', done: true }), a({ status: 'aprovada' })])).toEqual({ total: 3, pending: 1, routed: 2, done: 1 })
  })
  it('texto longo vira páginas sem cortar frase', () => {
    const long = Array.from({ length: 30 }, (_, i) => `Cena ${i + 1}: o vendedor mostra a moto e fala do financiamento.`).join(' ')
    const pages = textPages(long, 300)
    expect(pages.length).toBeGreaterThan(3)
    expect(pages.every((p) => p.length <= 300)).toBe(true)
    expect(pages.join(' ').replace(/\s+/g, ' ')).toBe(long)
    expect(textPages('curto')).toEqual(['curto'])
    const nums = 'Investimento de R$ 420 com 3.996 cliques. '.repeat(30).trim()
    const np = textPages(nums, 300)
    expect(np.every((p) => p.length <= 300)).toBe(true)
    expect(np.join(' ')).toBe(nums)
  })
})
