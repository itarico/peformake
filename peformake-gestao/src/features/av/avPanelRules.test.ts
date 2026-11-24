import { describe, expect, it } from 'vitest'
import { countToSchedule, sortPanel, statusLine, urgency, type PanelClient } from './avPanelRules'

const c = (over: Partial<PanelClient>): PanelClient => ({ id: 'x', name: 'Cliente', fixed: true, lastShoot: null, nextShoot: null, nextProject: null, shootsMonth: 0, shootsTotal: 0, daysSince: null, ...over })
const ago = (d: number) => ({ lastShoot: '2026-10-01T12:00:00Z', daysSince: d, shootsTotal: 1 })

describe('painel de clientes do audiovisual', () => {
  it('fixo que passou de 30 dias sem gravar fica urgente', () => {
    expect(urgency(c(ago(34)), '2026-11-24')).toBe('urgente')
    expect(statusLine(c(ago(34)), '2026-11-24')).toBe('Gravou há 34 dias: marcar com urgência')
  })

  it('fixo sem nenhuma gravação fica urgente', () => {
    expect(urgency(c({}), '2026-11-05')).toBe('urgente')
    expect(statusLine(c({}), '2026-11-05')).toBe('Nenhuma gravação marcada ainda')
  })

  it('com gravação marcada fica tranquilo, mesmo atrasado', () => {
    const x = c({ ...ago(40), nextShoot: '2026-11-28T17:00:00Z', nextProject: 'p1' })
    expect(urgency(x, '2026-11-24')).toBe('agendado')
    expect(statusLine(x, '2026-11-24')).toBe('Gravação dia 28/11')
  })

  it('a partir do dia 15, quem não gravou no mês entra em "marcar"', () => {
    expect(urgency(c(ago(20)), '2026-11-16')).toBe('marcar')
    expect(urgency(c(ago(20)), '2026-11-10')).toBe('ok')
    expect(urgency(c({ ...ago(5), shootsMonth: 1 }), '2026-11-20')).toBe('ok')
  })

  it('avulso nunca cobra', () => {
    expect(urgency(c({ fixed: false, ...ago(90) }), '2026-11-24')).toBe('ok')
    expect(urgency(c({ fixed: false }), '2026-11-24')).toBe('ok')
  })

  it('ordena: urgente, marcar, em dia, já agendado', () => {
    const list = [
      c({ id: 'agendado', nextShoot: '2026-11-28T17:00:00Z' }),
      c({ id: 'emdia', ...ago(5), shootsMonth: 1 }),
      c({ id: 'marcar', ...ago(20) }),
      c({ id: 'urgente40', ...ago(40) }),
      c({ id: 'urgente60', ...ago(60) }),
    ]
    expect(sortPanel(list, '2026-11-24').map((x) => x.id)).toEqual(['urgente60', 'urgente40', 'marcar', 'emdia', 'agendado'])
    expect(countToSchedule(list, '2026-11-24')).toBe(3)
  })
})
