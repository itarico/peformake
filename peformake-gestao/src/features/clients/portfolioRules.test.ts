import { describe, expect, it } from 'vitest'
import {
  attentionFlags,
  clientKind,
  clientValue,
  contractStatus,
  daysBetween,
  entityOf,
  healthStatus,
  lineValue,
  type HealthStatus,
} from './portfolioRules'

describe('tipo e empresa', () => {
  it('classifica fixo, TCV e avulso', () => {
    expect(clientKind('recurring', 'MRR')).toBe('fixo')
    expect(clientKind('recurring', null)).toBe('fixo')
    expect(clientKind('recurring', 'TCV')).toBe('tcv')
    expect(clientKind('one-off', 'TCV')).toBe('avulso')
    expect(clientKind(null, 'One-off')).toBe('avulso')
  })

  it('é Ellcazo só quando todo serviço ativo é audiovisual', () => {
    expect(entityOf([])).toBe('none')
    expect(entityOf([{ isActive: false, isAudiovisual: false, quantity: 1 }])).toBe('none')
    expect(entityOf([{ isActive: true, isAudiovisual: true, quantity: 1 }])).toBe('ellcazo')
    expect(entityOf([{ isActive: true, isAudiovisual: true, quantity: 1 }, { isActive: true, isAudiovisual: false, quantity: 1 }])).toBe('peformake')
  })
})

describe('valor', () => {
  it('aplica quantidade e desconto sem ficar negativo', () => {
    expect(lineValue({ price: 60, quantity: 8 })).toBe(480)
    expect(lineValue({ price: 500, quantity: 1, discountType: 'percent', discountValue: 10 })).toBe(450)
    expect(lineValue({ price: 500, quantity: 1, discountType: 'percent', discountValue: 150 })).toBe(0)
    expect(lineValue({ price: 100, quantity: 1, discountType: 'fixed', discountValue: 300 })).toBe(0)
    expect(lineValue({ price: 100, quantity: null })).toBe(100)
  })

  it('soma só ativos e conta preços faltando', () => {
    expect(clientValue([
      { isActive: true, isAudiovisual: false, quantity: 1, price: 600 },
      { isActive: true, isAudiovisual: false, quantity: 1, price: null },
      { isActive: false, isAudiovisual: false, quantity: 1, price: 999 },
    ])).toEqual({ value: 600, missingPrices: 1 })
  })
})

describe('contrato', () => {
  it('conta dias pela data, sem fuso', () => {
    expect(daysBetween('2026-11-03', '2026-12-03')).toBe(30)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
  })

  it('avisa vencendo, vencido e mostra o mês do contrato', () => {
    const base = { startDate: '2026-05-20', months: 12 }
    expect(contractStatus({ ...base, endDate: '2027-05-20' }, 'fixo', '2026-11-03')).toMatchObject({ state: 'ok', elapsedMonths: 6, totalMonths: 12 })
    expect(contractStatus({ ...base, endDate: '2026-11-20' }, 'fixo', '2026-11-03')).toMatchObject({ state: 'ending', daysLeft: 17 })
    expect(contractStatus({ ...base, endDate: '2026-10-31' }, 'tcv', '2026-11-03')).toMatchObject({ state: 'expired', daysLeft: -3 })
    expect(contractStatus(null, 'fixo', '2026-11-03').state).toBe('none')
    expect(contractStatus({ ...base, endDate: '2026-10-31' }, 'avulso', '2026-11-03').state).toBe('project')
  })
})

describe('saúde', () => {
  it('sem avaliação pede avaliação', () => {
    expect(healthStatus([], '2026-11-03')).toMatchObject({ latest: null, isStale: true })
  })

  it('usa a última, a média de 30 dias e a tendência', () => {
    const health = healthStatus([
      { level: 'ruim', assessedAt: '2026-09-29T16:00:00Z' },
      { level: 'muito_ruim', assessedAt: '2026-09-25T16:00:00Z' },
      { level: 'bom', assessedAt: '2026-10-23T19:00:00Z' },
      { level: 'muito_bom', assessedAt: '2026-10-12T20:00:00Z' },
    ], '2026-11-03')
    expect(health.latest).toBe('bom')
    expect(health.daysSince).toBe(11)
    expect(health.isStale).toBe(false)
    expect(health.average).toBe(4.5)
    expect(health.trend).toBe('up')
    expect(health.months).toEqual([{ month: '2026-10', average: 4.5 }, { month: '2026-09', average: 1.5 }])
  })

  it('fica vencida depois de 30 dias', () => {
    expect(healthStatus([{ level: 'bom', assessedAt: '2026-09-01T10:00:00Z' }], '2026-11-03').isStale).toBe(true)
  })
})

describe('alertas', () => {
  const health = (over: Partial<HealthStatus> = {}): HealthStatus => ({ latest: 'bom', daysSince: 2, isStale: false, average: 4, trend: null, months: [], ...over })
  const contract = { state: 'ok' as const, daysLeft: 100, elapsedMonths: 1, totalMonths: 12 }

  it('ordena do mais grave para o mais leve', () => {
    expect(attentionFlags({
      isActive: true,
      health: health({ latest: 'ruim', isStale: true }),
      contract: { ...contract, state: 'ending', daysLeft: 10 },
      teamSize: 0,
      activeServices: 0,
    })).toEqual(['risk', 'ending', 'no_service', 'no_team', 'stale'])
  })

  it('cliente saudável não gera alerta, perdido também não', () => {
    expect(attentionFlags({ isActive: true, health: health(), contract, teamSize: 2, activeServices: 1 })).toEqual([])
    expect(attentionFlags({ isActive: false, health: health({ latest: 'muito_ruim' }), contract, teamSize: 0, activeServices: 0 })).toEqual([])
  })
})
