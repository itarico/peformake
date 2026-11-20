import { describe, expect, it } from 'vitest'
import { BRIEF_REQUESTS, requestDone } from './ClientAssets'

describe('pedidos de arquivo do briefing', () => {
  it('marca o pedido quando já tem arquivo com o nome ou a palavra dele', () => {
    const precos = BRIEF_REQUESTS.find((r) => r.id === 'precos')!
    const marca = BRIEF_REQUESTS.find((r) => r.id === 'marca')!
    expect(requestDone(precos, ['Tabela de preços · lista.pdf'])).toBe(true)
    expect(requestDone(precos, ['PRECOS 2026.xlsx'])).toBe(true)
    expect(requestDone(precos, ['contrato.pdf'])).toBe(false)
    expect(requestDone(marca, ['Logo-final.png'])).toBe(true)
    expect(BRIEF_REQUESTS.map((r) => r.id)).toEqual(['precos', 'cardapio', 'fotos', 'marca', 'depoimentos', 'antigos'])
  })
})
