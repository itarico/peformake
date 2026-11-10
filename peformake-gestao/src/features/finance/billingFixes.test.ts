import { describe, expect, it } from 'vitest'
import { dueWarning, openAmount } from './BillingPage'

describe('saldo em aberto (pagamento parcial)', () => {
  it('desconta o parcial já recebido', () => expect(openAmount({ amount: 777.77, partial_paid: 400 })).toBe(377.77))
  it('sem parcial é o valor cheio', () => expect(openAmount({ amount: 500, partial_paid: null })).toBe(500))
})

describe('aviso do pop-up de vencimento', () => {
  it('data no passado avisa que fica vencida', () => expect(dueWarning('2026-11-05', false, '2026-11-10')).toMatch(/já passou/))
  it('dia novo que já passou neste mês vale a partir do próximo', () => expect(dueWarning('2026-12-05', true, '2026-11-10')).toMatch(/a partir de dezembro/))
  it('dia que ainda vem neste mês não avisa', () => expect(dueWarning('2026-11-20', true, '2026-11-10')).toBeNull())
})
