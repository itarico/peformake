import { describe, expect, it } from 'vitest'
import { money, parseProducts } from './productImport'

describe('parseProducts', () => {
  it('lê planilha com cabeçalho em qualquer ordem', () => {
    const p = parseProducts([['Categoria', 'Valor', 'Produto'], ['Pizzas', '59,9', 'Pizza grande'], ['Bebidas', '8', 'Refrigerante lata'], ['', 'Total', '']])
    expect(p).toEqual([{ nome: 'Pizza grande', preco: 'R$ 59,90', condicoes: 'Pizzas' }, { nome: 'Refrigerante lata', preco: 'R$ 8,00', condicoes: 'Bebidas' }])
  })
  it('lê tabela sem cabeçalho pelo conteúdo', () => {
    const p = parseProducts([['Corte masculino', 'R$ 45,00'], ['Barba', 'R$ 30,00'], ['Combo corte + barba', 'R$ 65,00']])
    expect(p.map((x) => x.preco)).toEqual(['R$ 45,00', 'R$ 30,00', 'R$ 65,00'])
    expect(p[2]!.nome).toBe('Combo corte + barba')
  })
  it('lê cardápio em texto com pontilhado e preço na linha de baixo', () => {
    const p = parseProducts([['CARDÁPIO'], ['Margherita ........ R$ 49,90'], ['Calabresa'], ['R$ 52,00'], ['Brotinho 25,00 / Grande 59,90']])
    expect(p[0]).toEqual({ nome: 'Margherita', preco: 'R$ 49,90' })
    expect(p[1]).toEqual({ nome: 'Calabresa', preco: 'R$ 52,00' })
    expect(p[2]!.nome).toBe('Brotinho')
    expect(p[2]!.condicoes).toContain('59,90')
  })
  it('lista sem preços vira lista de nomes, sem repetir', () => {
    expect(parseProducts([['Limpeza de pele'], ['Peeling'], ['peeling']]).map((x) => x.nome)).toEqual(['Limpeza de pele', 'Peeling'])
  })
  it('formata dinheiro', () => {
    expect(money('1.250,5')).toBe('R$ 1.250,5'.replace('1.250,5', '1250,50'))
    expect(money(12)).toBe('R$ 12,00')
    expect(money('R$59.90')).toBe('R$ 59,90')
  })
})
