import { describe, expect, it } from 'vitest'
import { actionChange, canUndo, effectVerdict, type Window } from './taskEffectRules'

const w = (days: number, spend_cents: number, results: number): Window => ({ days, spend_cents, results, clicks: 0, impressions: 0 })

describe('mudança proposta', () => {
  it('mostra de quanto para quanto', () => {
    expect(actionChange({ type: 'set_daily_budget', entity_id: '1', daily_budget: 2400, previous: 2000 })?.to).toContain('24,00')
    expect(actionChange({ type: 'set_status', entity_id: '1', status: 'PAUSED' })).toEqual({ from: 'Ativo', to: 'Pausado' })
    expect(actionChange(null)).toBeNull()
  })
})

describe('efeito da ação', () => {
  it('custo por resultado manda', () => {
    // Antes R$ 10 por resultado, depois R$ 8: caiu 20%.
    const v = effectVerdict({ before: w(7, 14000, 14), after: w(3, 4800, 6), final: false })
    expect(v?.tone).toBe('good')
    expect(v?.text).toBe('Custo por resultado caiu 20% (3 dias depois)')
  })
  it('subida vira alerta e variação pequena é estável', () => {
    expect(effectVerdict({ before: w(7, 7000, 14), after: w(7, 10500, 14), final: true })?.tone).toBe('bad')
    expect(effectVerdict({ before: w(7, 7000, 14), after: w(7, 7100, 14), final: true })?.tone).toBe('neutral')
  })
  it('sem resultado antes, compara por dia', () => {
    expect(effectVerdict({ before: w(7, 7000, 0), after: w(2, 2000, 3), final: false })?.text).toBe('Passou a gerar resultado (2 dias depois)')
  })
  it('sem janela depois, sem veredito', () => {
    expect(effectVerdict(null)).toBeNull()
  })
})

describe('desfazer', () => {
  it('só ação feita e com valor anterior', () => {
    expect(canUndo({ type: 'set_daily_budget', entity_id: '1', daily_budget: 2400, previous: 2000 }, 'done')).toBe(true)
    expect(canUndo({ type: 'set_daily_budget', entity_id: '1', daily_budget: 2400 }, 'done')).toBe(false)
    expect(canUndo({ type: 'set_status', entity_id: '1', status: 'PAUSED' }, 'queued')).toBe(false)
  })
})
