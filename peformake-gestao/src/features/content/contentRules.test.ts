import { describe, expect, it } from 'vitest'
import { actionsFor, boardColumn, deliveryTarget, designQueue, fileCheck, filterItems, formOf, isLate, monthGrid, shortBriefing, specSummary, summarize, waitingOn, type ContentItem } from './contentRules'

const item = (over: Partial<ContentItem>): ContentItem => ({
  id: 'i', planId: 'p', clientId: 'c', month: '2026-11-01', number: 1, kind: 'post', status: 'briefing', title: 'Promo', headline: null,
  subtitle: null, cta: null, briefing: null, caption: null, observations: null, referenceLinks: [], publishDate: null, deadline: null,
  designerId: null, isExtra: false, revisionNote: null, revisionCount: 0, legacyFinalUrls: [], updatedAt: '', carouselSlides: [], spec: {}, ...over,
})

describe('actionsFor', () => {
  it('designer produz e entrega direto ao cliente (decisão de 12/11)', () => {
    const designer = { planner: false, designer: true }
    expect(actionsFor(item({ status: 'briefing' }), designer, false)).toEqual([])
    expect(actionsFor(item({ status: 'ready' }), designer, false).map((a) => a.to)).toEqual(['in_production'])
    expect(actionsFor(item({ status: 'in_production' }), designer, true).map((a) => a.to)).toEqual(['client_review'])
    expect(actionsFor(item({ status: 'review' }), designer, true)).toEqual([])
  })
  it('social também pode revisar antes do cliente', () => {
    expect(actionsFor(item({ status: 'in_production' }), { planner: true, designer: false }, true).map((a) => a.to)).toEqual(['client_review', 'review'])
  })
  it('quem planeja aprova, manda ao cliente e pede ajuste com nota', () => {
    const review = actionsFor(item({ status: 'review' }), { planner: true, designer: false }, true)
    expect(review.map((a) => a.to)).toEqual(['client_review', 'approved', 'changes_requested'])
    expect(review.find((a) => a.to === 'changes_requested')?.needsNote).toBe(true)
  })
  it('sem arte final a entrega fica sem destaque', () => {
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

describe('fila do design', () => {
  it('as minhas primeiro, depois ajuste, depois o prazo mais perto', () => {
    const list = [
      item({ id: 'a', status: 'ready', deadline: '2026-11-20' }),
      item({ id: 'b', status: 'ready', deadline: '2026-11-14' }),
      item({ id: 'c', status: 'changes_requested', deadline: '2026-11-30' }),
      item({ id: 'd', status: 'in_production', designerId: 'eu', deadline: '2026-12-01' }),
      item({ id: 'e', status: 'client_review' }),
    ]
    expect(designQueue(list, 'eu').map((i) => i.id)).toEqual(['d', 'c', 'b', 'a'])
  })
  it('alvo da entrega: prazo às 18h, senão publicação às 9h', () => {
    expect(deliveryTarget({ deadline: '2026-11-14', publishDate: '2026-11-16' })).toBe('2026-11-14T18:00:00-03:00')
    expect(deliveryTarget({ deadline: null, publishDate: '2026-11-16' })).toBe('2026-11-16T09:00:00-03:00')
    expect(deliveryTarget({ deadline: null, publishDate: null })).toBeNull()
    expect(deliveryTarget({ deadline: '2026-11-14', publishDate: null, designDueAt: '2026-11-13T15:00:00Z' })).toBe('2026-11-13T15:00:00Z')
  })
  it('briefing curto', () => {
    expect(shortBriefing({ briefing: 'a'.repeat(200), headline: null }, 20)).toHaveLength(20)
    expect(shortBriefing({ briefing: null, headline: 'Chamada' })).toBe('Chamada')
  })
})

describe('peça por tipo', () => {
  it('cada tipo tem o seu formulário', () => {
    expect(formOf('carrossel')).toBe('carrossel')
    expect(formOf('banner')).toBe('print')
    expect(formOf('vetor')).toBe('vetor')
    expect(formOf('story')).toBe('social')
  })
  it('resume o que é do tipo', () => {
    expect(specSummary(item({ kind: 'banner', spec: { width: 0.8, height: 1.2, unit: 'm', material: 'Lona', quantity: 2 } }))).toBe('0,8×1,2 m · Lona · 2 un.')
    expect(specSummary(item({ kind: 'carrossel', carouselSlides: [{ text: '' }, { text: '' }], spec: { purpose: 'criativo' } }))).toBe('2 telas · para anúncio')
    expect(specSummary(item({ kind: 'post' }))).toBeNull()
  })
})

describe('quadro em 4 colunas', () => {
  const now = new Date('2026-11-12T12:00:00Z').getTime()
  it('separa por etapa e esconde o que não precisa de atenção', () => {
    expect(boardColumn(item({ status: 'briefing', briefing: 'x' }), now)).toBe('briefings')
    expect(boardColumn(item({ status: 'briefing', briefing: null }), now)).toBeNull()
    expect(boardColumn(item({ status: 'changes_requested' }), now)).toBe('producao')
    expect(boardColumn(item({ status: 'client_review' }), now)).toBe('aprovado')
    expect(boardColumn(item({ status: 'published', updatedAt: '2026-11-11T12:00:00Z' }), now)).toBe('aprovado')
    expect(boardColumn(item({ status: 'published', updatedAt: '2026-11-01T12:00:00Z' }), now)).toBeNull()
  })
})
