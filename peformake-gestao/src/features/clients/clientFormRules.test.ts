import { describe, expect, it } from 'vitest'
import { addMonths, emptyDraft, kindToDraft, moneyText, parseMoney, validateDraft } from './clientFormRules'

const valid = { ...emptyDraft('2026-11-03'), name: 'Ótica Sul', phone: '(81) 98888-7777' }

describe('datas do contrato', () => {
  it('soma meses e ajusta o fim do mês', () => {
    expect(addMonths('2026-11-03', 12)).toBe('2027-11-03')
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15')
  })

  it('cadastro novo começa hoje, por 12 meses', () => {
    expect(emptyDraft('2026-11-03')).toMatchObject({ startDate: '2026-11-03', endDate: '2027-11-03', months: '12', clientType: 'recurring' })
  })

  it('traduz o tipo para o banco', () => {
    expect(kindToDraft('avulso')).toEqual({ clientType: 'one-off', contractModel: 'One-off' })
    expect(kindToDraft('tcv')).toEqual({ clientType: 'recurring', contractModel: 'TCV' })
  })
})

describe('validação', () => {
  it('aceita o mínimo: nome e WhatsApp', () => {
    expect(validateDraft(valid)).toEqual({})
  })

  it('aponta cada campo com erro', () => {
    const errors = validateDraft({
      ...valid, name: ' a ', phone: '1234', email: 'nome@', startDate: '2026-11-03', endDate: '2026-10-01', months: '0', billingDay: '32', setupFee: 'abc',
    })
    expect(Object.keys(errors).sort()).toEqual(['billingDay', 'email', 'endDate', 'months', 'name', 'phone', 'setupFee'])
  })

  it('exige WhatsApp', () => {
    expect(validateDraft({ ...valid, phone: '' }).phone).toMatch(/obrigatório/)
  })
})

describe('dinheiro', () => {
  it('lê os formatos que as pessoas digitam', () => {
    expect(parseMoney('1500')).toBe(1500)
    expect(parseMoney('1.500')).toBe(1500)
    expect(parseMoney('1.500,50')).toBe(1500.5)
    expect(parseMoney('R$ 600,00')).toBe(600)
    expect(parseMoney('1500.5')).toBe(1500.5)
    expect(parseMoney('12,345')).toBeNull()
    expect(parseMoney('abc')).toBeNull()
    expect(parseMoney('')).toBeNull()
  })

  it('escreve no padrão brasileiro', () => {
    expect(moneyText(1500.5)).toBe('1.500,50')
    expect(moneyText(null)).toBe('')
  })
})
