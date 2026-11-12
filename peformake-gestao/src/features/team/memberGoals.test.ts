import { describe, expect, it } from 'vitest'
import { byFunction, countOn, earnedByHits, fillTitle, goalsPayload, initDrafts, MAX_GOALS, oteFromFixed, progressText, splitOte, suggestionText, toggleDraft, type CatalogGoal } from './memberGoals'

const g = (key: string, func: string, extra: Partial<CatalogGoal> = {}): CatalogGoal => ({
  key, func, title: key, how: '', unit: 'pct', better: 'mais', target: 90, param_label: null, param: null, is_default: false, value: null, ...extra,
})
const CAT = [
  g('ed_prazo', 'editor', { title: 'Edição entregue em até {n} h', param_label: 'horas', param: 24, is_default: true }),
  g('ed_sem_ajuste', 'editor', { is_default: true, target: 80 }),
  g('ed_entregas', 'editor', { unit: 'qtd', target: 8 }),
  g('cap_na_data', 'videomaker', { is_default: true }),
  g('cap_bruto', 'videomaker', { is_default: true, param_label: 'horas', param: 3 }),
  g('cap_gravacoes', 'videomaker', { unit: 'qtd' }),
]

describe('metas por função', () => {
  it('troca {n} pelo prazo', () => {
    expect(fillTitle('Edição entregue em até {n} h', 24)).toBe('Edição entregue em até 24 h')
    expect(fillTitle('Edição entregue em até {n} h', '')).toBe('Edição entregue em até N h')
  })
  it('mostra o realizado em uma linha', () => {
    expect(progressText({ unit: 'pct', better: 'mais' }, { done: 18, total: 20, actual: 90 })).toBe('18 de 20 · 90%')
    expect(progressText({ unit: 'pct', better: 'mais' }, { done: 0, total: 0, actual: null })).toBe('Sem dados no mês')
    expect(progressText({ unit: 'qtd', better: 'mais' }, { done: 6, total: 0, actual: 6 })).toBe('6 no mês')
    expect(progressText({ unit: 'qtd', better: 'menos' }, { done: 0, total: 0, actual: 0 })).toBe('Nenhuma agora')
    expect(progressText({ unit: 'qtd', better: 'menos' }, { done: 2, total: 0, actual: 2 })).toBe('2 agora')
  })
  it('sem nada salvo, liga as sugeridas que o banco escolheu', () => {
    const d = initDrafts(CAT, [{ key: 'ed_prazo', target: 90, param: 24, origem: 'funcao' }, { key: 'cap_na_data', target: 90, origem: 'funcao' }], false)
    expect(d.ed_prazo).toEqual({ on: true, target: '90', param: '24' })
    expect(d.cap_na_data!.on).toBe(true)
    expect(d.ed_entregas!.on).toBe(false)
  })
  it('com metas salvas, usa alvo e prazo salvos', () => {
    const d = initDrafts(CAT, [{ key: 'ed_prazo', target: 95, param: 12, origem: 'pessoal' }], true)
    expect(d.ed_prazo).toEqual({ on: true, target: '95', param: '12' })
    expect(countOn(d)).toBe(1)
  })
  it('no máximo 2 ligadas', () => {
    let d = initDrafts(CAT, [], true)
    for (const c of CAT) d = toggleDraft(d, c.key)
    expect(MAX_GOALS).toBe(2)
    expect(countOn(d)).toBe(2)
    expect(d.ed_entregas!.on).toBe(false)
    d = toggleDraft(d, 'ed_prazo')
    expect(countOn(d)).toBe(1)
  })
  it('OTE: 60% fixo + 40% variável, 20% por meta', () => {
    expect(splitOte(5000)).toEqual({ fixed: 3000, variable: 2000, perGoal: 1000 })
    expect(oteFromFixed(3000)).toBe(5000)
    expect(earnedByHits(2000, 0)).toBe(0)
    expect(earnedByHits(2000, 1)).toBe(1000)
    expect(earnedByHits(2000, 2)).toBe(2000)
    expect(earnedByHits(2000, 3)).toBe(2000)
  })
  it('diz de onde vem o alvo sugerido', () => {
    expect(suggestionText({ unit: 'pct', has_history: true, history: 72.4, historic: true })).toBe('média 72%')
    expect(suggestionText({ unit: 'qtd', has_history: false, history: null, historic: true })).toBe('sem histórico')
    expect(suggestionText({ unit: 'qtd', historic: false })).toBeNull()
  })
  it('monta o que vai para o banco: só ligadas, prazo só onde existe, alvo vazio volta ao padrão', () => {
    const d = initDrafts(CAT, [], true)
    d.ed_prazo = { on: true, target: '', param: '12' }
    d.ed_entregas = { on: true, target: '10', param: '5' }
    expect(goalsPayload(CAT, d, [{ key: 'videos', target: 4, origem: 'pessoal' }])).toEqual([
      { key: 'ed_prazo', target: 90, param: 12 },
      { key: 'ed_entregas', target: 10, param: null },
    ])
  })
  it('agrupa por função na ordem do banco', () => {
    expect(byFunction(CAT).map(([f, l]) => [f, l.length])).toEqual([['editor', 3], ['videomaker', 3]])
  })
})
