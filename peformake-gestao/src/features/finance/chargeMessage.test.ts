import { describe, expect, it } from 'vitest'
import { chargeMessage, chargeRef, firstName, waLink, waPhone } from './chargeMessage'

describe('mensagem de cobrança', () => {
  it('uma fatura com link', () => {
    const m = chargeMessage({ name: 'Dra. Andrea Diniz', items: [{ description: 'Mensalidade 11/2026 · Tráfego', amount: 900, due_date: '2026-11-10', link: 'https://x/pagar/1' }], pix: null, usePix: false, now: '2026-11-05' })
    expect(m).toContain('Oi, Andrea, tudo bem?')
    expect(m).toContain('mensalidade de novembro/2026')
    expect(m).toContain('vencimento 10/11')
    expect(m).toContain('Pague pelo link: https://x/pagar/1')
    expect(m).toContain('comprovante')
  })
  it('sem link usa o Pix da empresa; sem Pix não inventa', () => {
    const item = { description: 'OS 12', amount: 100, due_date: '2026-11-10', link: null }
    expect(chargeMessage({ name: 'Will', items: [item], pix: { key: '123', type: 'CNPJ' }, usePix: false })).toContain('Pix (CNPJ): 123')
    const none = chargeMessage({ name: 'Will', items: [item], pix: null, usePix: false })
    expect(none).not.toContain('Pix')
    expect(none).not.toContain('link')
  })
  it('várias faturas: lista por mês e total', () => {
    const m = chargeMessage({ name: 'Fuctura Soluções', items: [
      { description: 'Mensalidade 11/2026 · Design', amount: 900, due_date: '2026-11-10', link: null },
      { description: 'Mensalidade 10/2026 · Design', amount: 900, due_date: '2026-10-10', link: null },
    ], pix: { key: 'pix@x.com' }, usePix: true, now: '2026-11-11' })
    expect(m.indexOf('outubro')).toBeLessThan(m.indexOf('novembro'))
    expect(m).toContain('venceu 10/10')
    expect(m).toMatch(/Total: R\$\s1\.800,00/)
    expect(m).toContain('Pix: pix@x.com')
  })
  it('referência, nome e número do WhatsApp', () => {
    expect(chargeRef('Avulso: vídeo')).toBe('Avulso: vídeo')
    expect(firstName('Sr. João Silva')).toBe('João')
    expect(waPhone('(81) 99707-3668')).toBe('5581997073668')
    expect(waPhone('123')).toBeNull()
    expect(waLink('81997073668', 'a b')).toBe('https://wa.me/5581997073668?text=a%20b')
  })
})
