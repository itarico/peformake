import { describe, expect, it } from 'vitest'
import { BRIEF_REQUESTS, requestDone } from './ClientAssets'

const f = (name: string, mime = 'application/pdf') => ({ name, mime })
const r = (id: string) => BRIEF_REQUESTS.find((x) => x.id === id)!

describe('pedidos de arquivo do briefing', () => {
  it('marca o pedido quando já tem arquivo com o nome, a palavra ou o tipo dele', () => {
    expect(requestDone(r('precos'), [f('Tabela de preços e condições · lista.pdf')])).toBe(true)
    expect(requestDone(r('precos'), [f('PRECOS 2026.xlsx')])).toBe(true)
    expect(requestDone(r('precos'), [f('contrato.pdf')])).toBe(false)
    expect(requestDone(r('logo'), [f('Logo-final.png', 'image/png')])).toBe(true)
    expect(requestDone(r('videos'), [f('IMG_2231.MOV', 'video/quicktime')])).toBe(true)
    expect(requestDone(r('apresentacao'), [f('Apresentação Fornario.pdf')])).toBe(true)
  })
  it('5 grupos, 18 pedidos, sem id repetido; CNPJ e contrato social são opcionais', () => {
    expect([...new Set(BRIEF_REQUESTS.map((x) => x.group))]).toEqual(['Empresa', 'O que vende', 'Marca', 'Prova', 'Marketing e vendas'])
    expect(new Set(BRIEF_REQUESTS.map((x) => x.id)).size).toBe(18)
    expect(BRIEF_REQUESTS.filter((x) => x.optional).map((x) => x.id)).toEqual(['cnpj', 'contrato'])
  })
})
