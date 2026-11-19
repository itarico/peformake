import { describe, expect, it } from 'vitest'
import { nicheRank } from './nicheRules'

describe('nichos que mais atendemos', () => {
  const xs = [
    { segment: 'Gastronomia' }, { segment: 'gastronomia ' }, { segment: 'Gastronomia', isLost: true },
    { segment: 'Ótica' }, { segment: 'otica' }, { segment: 'Moda' }, { segment: '' }, { segment: null },
  ]
  it('junta nomes iguais, ordena e conta quem está sem nicho (só ativos por padrão)', () => {
    const r = nicheRank(xs)
    expect(r.rows.map((x) => [x.label, x.value])).toEqual([['Gastronomia', 2], ['Ótica', 2], ['Moda', 1]])
    expect(r.total).toBe(5)
    expect(r.withoutNiche).toBe(2)
    expect(r.rows[0]!.pct).toBe(40)
  })
  it('todos inclui perdidos; top limita e conta o resto', () => {
    const r = nicheRank(xs, { onlyActive: false, top: 1 })
    expect(r.rows).toEqual([{ label: 'Gastronomia', value: 3, pct: 50 }])
    expect(r.otherNiches).toBe(2)
  })
})
