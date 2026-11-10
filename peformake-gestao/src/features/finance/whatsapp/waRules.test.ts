import { describe, expect, it } from 'vitest'
import { bankReady, inviteCode, isoWeek, matchesFilter, needsReview, payerLabel, phoneKey, phoneLabel, stateLabel, type ReviewItem } from './waRules'

const item = (p: Partial<ReviewItem>): ReviewItem => ({
  id: 'x', state: 'lancado', received_at: '2026-11-10T12:00:00Z', body: 'paguei 89,90 canva', media: null, reason: null, confidence: 80, high_value: false,
  ref: 'abc123', staff_id: 's', sender: 'Italo', sender_avatar: null, channel: 'Grupo', media_bucket: null, media_path: null, media_mime: null, media_error: null,
  parsed: {}, entry: null, invoice: null, ...p,
})
const entry = (p: Partial<NonNullable<ReviewItem['entry']>> = {}): NonNullable<ReviewItem['entry']> => ({
  id: 'e', unit: 'peformake', kind: 'saida', amount: 89.9, description: 'Canva', date: '2026-11-10', status: 'pago', source: 'whatsapp', category_id: 'c',
  category: 'Ferramentas', client_id: null, client: null, project: null, job: null, bank: false, paid_by_staff: null, review_status: 'a_revisar', confirmations: [], attribution: null, ...p,
})

describe('phoneKey (igual ao banco)', () => {
  it('tira 55 e o 9 extra', () => {
    expect(phoneKey('+55 81 98567-2212')).toBe('8185672212')
    expect(phoneKey('558185672212')).toBe('8185672212')
    expect(phoneKey('81985672212')).toBe('8185672212')
    expect(phoneKey('(81) 8567-2212')).toBe('8185672212')
  })
  it('vazio é nulo', () => expect(phoneKey('')).toBeNull())
})

describe('phoneLabel', () => {
  it('formata celular com e sem 55', () => {
    expect(phoneLabel('5581985672212')).toBe('(81) 98567-2212')
    expect(phoneLabel('8185672212')).toBe('(81) 8567-2212')
  })
})

describe('inviteCode', () => {
  it('aceita link ou código', () => {
    expect(inviteCode('https://chat.whatsapp.com/LgTKlshaAVj71nK8Pg24FM')).toBe('LgTKlshaAVj71nK8Pg24FM')
    expect(inviteCode('chat.whatsapp.com/invite/LgTKlshaAVj71nK8Pg24FM/')).toBe('LgTKlshaAVj71nK8Pg24FM')
    expect(inviteCode('LgTKlshaAVj71nK8Pg24FM')).toBe('LgTKlshaAVj71nK8Pg24FM')
    expect(inviteCode('grupo do financeiro')).toBeNull()
  })
})

describe('revisão', () => {
  it('lançado a revisar e não entendido pedem revisão; confirmado e repetido não', () => {
    expect(needsReview(item({ entry: entry() }))).toBe(true)
    expect(needsReview(item({ state: 'nao_entendi' }))).toBe(true)
    expect(needsReview(item({ entry: entry({ review_status: 'confirmado' }) }))).toBe(false)
    expect(needsReview(item({ state: 'repetido', entry: entry() }))).toBe(false)
  })
  it('filtros', () => {
    const high = item({ entry: entry(), high_value: true })
    const general = item({ entry: entry({ category_id: null }) })
    const rep = item({ state: 'repetido', entry: entry() })
    expect(matchesFilter(high, 'valor_alto')).toBe(true)
    expect(matchesFilter(general, 'sem_atribuicao')).toBe(true)
    expect(matchesFilter(item({ entry: entry({ client_id: 'c1' }) }), 'sem_atribuicao')).toBe(false)
    expect(matchesFilter(rep, 'repetido')).toBe(true)
    expect(matchesFilter(rep, 'revisar')).toBe(false)
  })
  it('conferidos no banco', () => {
    const list = [item({ entry: entry({ bank: true }) }), item({ entry: entry() }), item({ state: 'nao_entendi' })]
    expect(bankReady(list)).toHaveLength(1)
  })
  it('rótulos', () => {
    expect(stateLabel({ state: 'nao_entendi', media: 'image' })).toBe('Comprovante: completar')
    expect(stateLabel({ state: 'aguardando_audio', media: 'audio' })).toBe('Áudio: ouvir e completar')
    expect(payerLabel(entry({ paid_by_staff: 's' }), 'Vinícius Lima')).toBe('Vinícius (reembolso)')
    expect(payerLabel(entry(), 'Italo')).toBe('Empresa')
    expect(payerLabel(entry({ kind: 'entrada' }), 'Italo')).toBeNull()
  })
})

describe('isoWeek', () => {
  it('semana ISO', () => {
    expect(isoWeek(new Date(2026, 10, 10))).toBe('2026-46')
    expect(isoWeek(new Date(2026, 0, 1))).toBe('2026-01')
  })
})
