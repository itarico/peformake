import { describe, expect, it } from 'vitest'
import { mondaysOf, slotsOf, type MonthReport } from './reportMonthRules'

const rep = (o: Partial<MonthReport>): MonthReport => ({ id: 'x', kind: 'weekly', period_start: '2026-11-09', period_end: '2026-11-16', path: 'a.pdf', sent_at: null, send_error: null, by_agent: true, created_at: '', spend_cents: null, results: null, ...o })

describe('relatórios do mês', () => {
  it('segundas de novembro de 2026', () => {
    expect(mondaysOf('2026-11-01')).toEqual(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'])
  })
  it('o relatório de 09 a 16/11 (fim na segunda) cai na Semana 2; semana atual ainda não chegou', () => {
    const s = slotsOf({ reports: [rep({ sent_at: '2026-11-16T15:00:00Z' }), rep({ id: 'y', period_start: '2026-11-02', period_end: '2026-11-08' })] }, '2026-11-01', '2026-11-17')
    expect(s.map((x) => `${x.short}:${x.state}`)).toEqual(['S1:ready', 'S2:sent', 'S3:future', 'S4:future', 'S5:future', 'Mês:future'])
    expect(s.find((x) => x.latest)?.short).toBe('S2')
  })
  it('semana passada sem relatório = não foi gerado; mensal no fim do mês', () => {
    const s = slotsOf({ reports: [] }, '2026-11-01', '2026-11-28')
    expect(s[2]!.state).toBe('missing')
    expect(s.at(-1)!.state).toBe('missing')
  })
})
