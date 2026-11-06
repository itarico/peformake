import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: () => null } }))
import { actions, names, pickWith, seeded, steps, suggestion, type Coach } from './coach'
import type { GoalRow } from './goals'

const c: Coach = {
  cut: 1500, avg_ticket: 1162, avulsos: 6, stuck: 12, leads_new: 0, arts_due_week: 6, videos_due: 0, open_quotes: 0,
  low_ticket: [{ id: 'a', name: 'Jogada Criativa', ticket: 350 }, { id: 'b', name: 'Dra. Acácia', ticket: 450 }],
  idle_avulsos: [{ id: 'n', name: 'Dra. Nayane Francis', months: 8 }], happy: [{ id: 'h', name: '3LM' }], unhappy: [{ id: 'u', name: 'Cajá Limão' }],
  hot_leads: [{ name: 'Padaria Sol', source: 'Pedido pelo site', to_: '/comercial/prospeccao' }], frequent_avulsos: [{ id: 'f', name: 'Partem', months: 3, avg: 500 }],
  overdue: [], no_meeting: [{ id: 'm', name: 'APM' }], lost_month: [{ id: 'l', name: 'Lord Barber', reason: 'Cancelou por preço' }],
}
const row = (p: Partial<GoalRow>): GoalRow => ({ role: 'comercial', key: 'mrr_total', target: 26800, actual: 24400, info: { base: 24400 }, source: 'auto', position: 1, ...p })

describe('coach', () => {
  it('passo a passo do MRR usa os dados reais', () => {
    const s = steps(row({}), c, 6, 30)
    expect(s[0]).toMatch(/R\$\s2\.400/)
    expect(s.join(' ')).toContain('Jogada Criativa')
    expect(s.join(' ')).toContain('Cajá Limão')
  })
  it('ações levam ao cliente certo', () => {
    expect(actions(row({ key: 'novos', target: 5, actual: 1 }), c).map((a) => a.label)).toEqual(['Chamar Padaria Sol', 'Oferecer plano a Partem', 'Ver todos os leads'])
    expect(steps(row({ key: 'novos', target: 5, actual: 1 }), c, 6, 30).join(' ')).toContain('Partem (3 meses seguidos')
    expect(actions(row({ key: 'avulsos', target: 3, actual: 2 }), c)[0]!.to).toBe('/clientes/n')
  })
  it('sorteio do dia é estável e sugestões citam alguém', () => {
    const a = pickWith(seeded('2026-11-06'))(['x', 'y', 'z']), b = pickWith(seeded('2026-11-06'))(['x', 'y', 'z'])
    expect(a).toBe(b)
    expect(suggestion(pickWith(seeded('s')), row({ key: 'avulsos' }), c)).toContain('Dra. Nayane')
    expect(names(['A', 'B', 'C'])).toBe('A, B e C')
  })
})
