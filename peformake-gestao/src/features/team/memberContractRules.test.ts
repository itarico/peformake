import { describe, expect, it } from 'vitest'
import { CONTRACT_STATUS, needsLawyer } from './memberContractRules'
import { serviceGroup } from '@/features/contracts/ContractClauses'
import { isHeading } from '@/features/contracts/ContractPreview'

describe('contrato do membro', () => {
  it('CLT e Sócio pedem revisão de contador/advogado', () => {
    expect(needsLawyer('clt')).toBe(true)
    expect(needsLawyer('socio')).toBe(true)
    expect(needsLawyer('pj')).toBe(false)
    expect(needsLawyer(null)).toBe(false)
  })
  it('todo status tem rótulo', () => {
    expect(CONTRACT_STATUS.assinado.label).toBe('Assinado')
    expect(CONTRACT_STATUS.recusado.label).toBe('Recusado')
  })
})

describe('contrato por blocos', () => {
  it('escolhe o texto padrão do serviço (mesma regra do banco)', () => {
    expect(serviceGroup('audiovisual', 'visita de captação')).toBe('area:captacao')
    expect(serviceGroup('audiovisual', 'produção')).toBe('area:audiovisual')
    expect(serviceGroup('trafego', 'relatório')).toBe('area:trafego')
    expect(serviceGroup(null, null)).toBe('area:outro')
  })
  it('título de cláusula sai em negrito na prévia e no PDF', () => {
    expect(isHeading('CLÁUSULA 2ª — DA GESTÃO DE TRÁFEGO PAGO')).toBe(true)
    expect(isHeading('2.1. A CONTRATADA será responsável')).toBe(false)
  })
})
