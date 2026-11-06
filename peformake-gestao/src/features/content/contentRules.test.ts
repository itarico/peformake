import { describe, expect, it } from 'vitest'
import { actionsFor, fileCheck, filterItems, isLate, monthGrid, summarize, waitingOn, type ContentItem } from './contentRules'

const item = (over: Partial<ContentItem>): ContentItem => ({
  id: 'i', planId: 'p', clientId: 'c', month: '2026-11-01', number: 1, kind: 'post', status: 'briefing', title: 'Promo', headline: null,
  subtitle: null, cta: null, briefing: null, caption: null, observations: null, referenceLinks: [], publishDate: null, deadline: null,
  designerId: null, isExtra: false, revisionNote: null, revisionCount: 0, legacyFinalUrls: [], updatedAt: '', ...over,
})

describe('actionsFor', () => {
  it('designer só produz e envia para revisão', () => {
    const designer = { planner: false, designer: true }
    expect(actionsFor(item({ status: 'briefing' }), designer, false)).toEqual([])
    expect(actionsFor(item({ status: 'ready' }), designer, false).map((a) => a.to)).toEqual(['in_production'])
    expect(actionsFor(item({ status: 'review' }), designer, true)).toEqual([])
  })
  it('quem planeja aprova, manda ao cliente e pede ajuste com nota', () => {
    const review = actionsFor(item({ status: 'review' }), { planner: true, designer: false }, true)
    expect(review.map((a) => a.to)).toEqual(['client_review', 'approved', 'changes_requested'])
    expect(review.find((a) => a.to === 'changes_requested')?.needsNote).toBe(true)
  })
  it('sem arte final o envio para revisão fica sem destaque', () => {
    expect(actionsFor(item({ status: 'in_production' }), { planner: false, designer: true }, false)[0]?.primary).toBe(false)
  })
})

describe('regras de leitura', () => {
  it('diz de quem é a vez', () => {
    expect(waitingOn('briefing')).toBe('social')
    expect(waitingOn('changes_requested')).toBe('design')
    expect(waitingOn('client_review')).toBe('client')
    expect(waitingOn('approved')).toBeNull()
  })
  it('atraso não conta para o que está com o cliente', () => {
    expect(isLate(item({ deadline: '2026-11-01', status: 'in_production' }), '2026-11-03')).toBe(true)
    expect(isLate(item({ deadline: '2026-11-01', status: 'client_review' }), '2026-11-03')).toBe(false)
  })
  it('filtra sem designer e pela busca', () => {
    const list = [item({ id: 'a', designerId: 'd1' }), item({ id: 'b', title: 'Natal' })]
    expect(filterItems(list, { clientId: '', designerId: 'none', status: '', query: '' }, () => 'X').map((i) => i.id)).toEqual(['b'])
    expect(filterItems(list, { clientId: '', designerId: '', status: '', query: 'nat' }, () => 'X').map((i) => i.id)).toEqual(['b'])
  })
  it('resume o mês', () => {
    const s = summarize([item({ status: 'briefing' }), item({ status: 'approved' }), item({ status: 'client_review' })], '2026-11-03')
    expect(s).toMatchObject({ total: 3, noBriefing: 1, approved: 1, waitingClient: 1 })
  })
})

describe('monthGrid', () => {
  it('começa na segunda e completa as semanas', () => {
    const weeks = monthGrid('2026-11-01')
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01'])
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks.flat().filter(Boolean)).toHaveLength(30)
  })
})

describe('fileCheck', () => {
  it('aceita imagem e recusa executável e arquivo grande', () => {
    expect(fileCheck('arte.PNG', 1000)).toEqual({ ext: 'png', mime: 'image/png' })
    expect(typeof fileCheck('programa.exe', 10)).toBe('string')
    expect(typeof fileCheck('video.mp4', 60 * 1024 * 1024)).toBe('string')
  })
})
