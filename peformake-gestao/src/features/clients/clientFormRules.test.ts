import { describe, expect, it } from 'vitest'
import { addMonths, emptyDraft, kindToDraft, moneyText, parseMoney, validateDraft } from './clientFormRules'
import { instagramHandle, isValidPhone } from './clientFormRules'

const valid = { ...emptyDraft('2026-11-03'), name: 'Ótica Sul', phone: '(81) 98888-7777', email: 'contato@oticasul.com' }

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
  it('aceita o mínimo: nome, WhatsApp e e-mail', () => {
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

describe('telefone e instagram', () => {
  it('confere se o telefone é de verdade', () => {
    expect(isValidPhone('(81) 98888-7777')).toBe(true)
    expect(isValidPhone('+55 81 3333-4444')).toBe(true)
    expect(isValidPhone('(81) 88888-7777')).toBe(false)
    expect(isValidPhone('(10) 98888-7777')).toBe(false)
    expect(isValidPhone('(81) 99999-9999')).toBe(false)
  })
  it('extrai o perfil do instagram', () => {
    expect(instagramHandle('https://www.instagram.com/oticasul/?hl=pt')).toBe('oticasul')
    expect(instagramHandle('@oticasul')).toBe('oticasul')
  })
})

describe('e-mail opcional', () => {
  it('cliente sem e-mail pode ser salvo; e-mail errado continua barrado', () => {
    expect(validateDraft({ ...valid, email: '' }).email).toBeUndefined()
    expect(validateDraft({ ...valid, email: 'nome@' }).email).toBeDefined()
  })
})
