import { describe, expect, it } from 'vitest'
import { avActionsFor, coordsFromMapsLink, countdown, fromLocalInput, isAvLate, missingFor, stageOf, toLocalInput, upcomingShoots, type AvProject } from './avRules'

const p = (over: Partial<AvProject>): AvProject => ({
  id: 'p', clientId: 'c', kind: 'monthly', month: '2026-11-01', title: 'Vídeos', status: 'script', briefing: null, script: null, videoCount: 1,
  format: null, referenceLinks: [], shootAt: null, shootEndAt: null, location: null, shootNotes: null, videomakerId: null, editorId: null,
  rawLink: null, finalLink: null, dueDate: null, revisionNote: null, revisionCount: 0, updatedAt: '',
  scriptStatus: 'rascunho', scriptNote: null, shootDurationMin: null, scriptwriterId: null, ownerId: null, shootConfirmedAt: null, checkinAt: null,
  checkinDistanceM: null, checkoutAt: null, rawSentAt: null, rawLinks: [], editDueAt: null, staffToken: null, googleEventId: null, locationLat: null, locationLng: null, ...over,
})

describe('avActionsFor', () => {
  it('videomaker só confirma a captação', () => {
    const vm = { manager: false, videomaker: true, editor: false }
    expect(avActionsFor(p({ status: 'scheduled' }), vm).map((a) => a.to)).toEqual(['captured'])
    expect(avActionsFor(p({ status: 'editing' }), vm)).toEqual([])
  })
  it('editor envia para revisão, nunca direto ao cliente', () => {
    const ed = { manager: false, videomaker: false, editor: true }
    expect(avActionsFor(p({ status: 'editing' }), ed).map((a) => a.to)).toEqual(['review'])
    expect(avActionsFor(p({ status: 'review' }), ed)).toEqual([])
  })
  it('pede o campo que falta antes de mover', () => {
    const [mark] = avActionsFor(p({ status: 'script' }), { manager: true, videomaker: false, editor: false })
    expect(mark && missingFor(mark, p({}))).toMatch(/data da captação/)
    expect(mark && missingFor(mark, p({ shootAt: '2026-11-05T12:00:00Z' }))).toBeNull()
  })
})

describe('agenda e prazos', () => {
  it('lista as captações dos próximos dias em ordem', () => {
    const now = new Date('2026-11-03T12:00:00Z')
    const list = [
      p({ id: 'b', shootAt: '2026-11-06T12:00:00Z' }),
      p({ id: 'a', shootAt: '2026-11-04T12:00:00Z' }),
      p({ id: 'x', shootAt: '2026-12-30T12:00:00Z' }),
      p({ id: 'c', shootAt: '2026-11-04T13:00:00Z', status: 'cancelled' }),
    ]
    expect(upcomingShoots(list, now).map((x) => x.id)).toEqual(['a', 'b'])
  })
  it('atraso só conta na edição', () => {
    expect(isAvLate(p({ dueDate: '2026-11-01', status: 'editing' }), '2026-11-03')).toBe(true)
    expect(isAvLate(p({ dueDate: '2026-11-01', status: 'review' }), '2026-11-03')).toBe(false)
  })
  it('converte o horário de Brasília', () => {
    expect(fromLocalInput('2026-11-05T09:30')).toBe('2026-11-05T12:30:00.000Z')
    expect(toLocalInput('2026-11-05T12:30:00.000Z')).toBe('2026-11-05T09:30')
  })
})

describe('fases e pendências', () => {
  it('agrupa as etapas em 5 fases', async () => {
    const { phaseOf } = await import('./avRules')
    expect(phaseOf('script')).toBe('pre')
    expect(phaseOf('captured')).toBe('shoot')
    expect(phaseOf('changes_requested')).toBe('edit')
    expect(phaseOf('client_review')).toBe('approval')
    expect(phaseOf('delivered')).toBe('done')
    expect(phaseOf('cancelled')).toBeNull()
  })
  it('projeto aberto de mês anterior é pendência; entregue não', async () => {
    const { isBacklog } = await import('./avRules')
    expect(isBacklog(p({ month: '2026-08-01', status: 'review' }), '2026-11-01')).toBe(true)
    expect(isBacklog(p({ month: '2026-08-01', status: 'delivered' }), '2026-11-01')).toBe(false)
    expect(isBacklog(p({ month: '2026-11-01', status: 'script' }), '2026-11-01')).toBe(false)
    expect(isBacklog(p({ month: null, status: 'script' }), '2026-11-01')).toBe(false)
  })
  it('iniciais da equipe', async () => {
    const { initials } = await import('./avRules')
    expect(initials('Vinícius Lima')).toBe('VL')
    expect(initials('Italo')).toBe('IT')
  })
})

describe('Audiovisual 2.0', () => {
  it('etapa do quadro segue o roteiro, o check-in e o bruto', () => {
    expect(stageOf(p({ status: 'script' }))).toBe('roteiro')
    expect(stageOf(p({ status: 'scheduled' }))).toBe('aguardando')
    expect(stageOf(p({ status: 'scheduled', checkinAt: '2026-11-05T12:00:00Z' }))).toBe('captacao')
    expect(stageOf(p({ status: 'editing' }))).toBe('edicao')
    expect(stageOf(p({ status: 'client_review' }))).toBe('cliente')
  })
  it('cronômetro fica vermelho perto, amarelo no meio e verde longe', () => {
    const now = Date.parse('2026-11-05T12:00:00Z')
    expect(countdown('2026-11-05T15:00:00Z', now)?.tone).toBe('red')
    expect(countdown('2026-11-07T12:00:00Z', now)?.tone).toBe('yellow')
    expect(countdown('2026-11-12T12:00:00Z', now)?.tone).toBe('green')
    expect(countdown('2026-11-05T10:00:00Z', now)?.text).toContain('atrasado')
    expect(countdown('2026-11-05T14:30:00Z', now)?.text).toBe('hoje, em 2h 30min')
  })
  it('lê coordenadas do link do Google Maps', () => {
    expect(coordsFromMapsLink('https://www.google.com/maps/place/X/@-8.0476,-34.877,17z')).toEqual({ lat: -8.0476, lng: -34.877 })
    expect(coordsFromMapsLink('-8.05, -34.9')).toEqual({ lat: -8.05, lng: -34.9 })
    expect(coordsFromMapsLink('Rua A, 10')).toBeNull()
  })
})
