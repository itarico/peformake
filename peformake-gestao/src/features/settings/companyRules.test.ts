import { describe, expect, it } from 'vitest'
import { companyLink, companyMissing } from './companyRules'

describe('dados das empresas', () => {
  it('lista o que falta para o contrato', () => {
    expect(companyMissing(null)).toEqual(['razão social', 'CNPJ', 'endereço', 'representante', 'CPF do representante'])
    expect(companyMissing({ legal_name: 'X LTDA', document: '12345678000190', address: 'Rua A, 1', representative_name: 'Ana', representative_document: ' ' }))
      .toEqual(['CPF do representante'])
    expect(companyMissing({ legal_name: 'X', document: '1', address: 'R', representative_name: 'A', representative_document: '1' })).toEqual([])
  })
  it('link abre o pop-up na empresa certa', () => {
    expect(companyLink('ellcazo')).toBe('/configuracoes/empresas?empresa=ellcazo&editar=1')
  })
})
