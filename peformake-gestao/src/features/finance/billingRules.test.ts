import { describe, expect, it } from 'vitest'
import { reminderStage, validDocument } from './billingRules'

describe('reminderStage', () => {
  const t = '2026-11-10'
  it('D-1', () => expect(reminderStage('2026-11-11', t, 'pendente').label).toBe('Vence amanhã'))
  it('D0', () => expect(reminderStage('2026-11-10', t, 'pendente').label).toBe('Vence hoje'))
  it('D+1', () => expect(reminderStage('2026-11-09', t, 'pendente').label).toBe('Atrasado 1 dia'))
  it('D+3 avisa gestor', () => expect(reminderStage('2026-11-07', t, 'pendente').label).toContain('gestor'))
  it('D+7 para', () => expect(reminderStage('2026-11-03', t, 'pendente').tone).toBe('warn'))
  it('pago', () => expect(reminderStage('2026-11-03', t, 'pago').label).toBe('Pago'))
})

describe('validDocument', () => {
  it('CPF válido', () => expect(validDocument('529.982.247-25')).toBe(true))
  it('CPF inválido', () => expect(validDocument('529.982.247-24')).toBe(false))
  it('CNPJ válido', () => expect(validDocument('11.222.333/0001-81')).toBe(true))
  it('CNPJ inválido', () => expect(validDocument('11.222.333/0001-82')).toBe(false))
  it('repetido', () => expect(validDocument('111.111.111-11')).toBe(false))
})
