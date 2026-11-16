import { extractJson, fullPrompt, parseCard, parseResult, shortPrompt } from './chatPrompt'
import type { StrategyCard } from './cardRules'

describe('pedido pelo chat', () => {
  it('pedido curto aponta as regras e o briefing do mês', () => {
    const t = shortPrompt('Fornario', 'c1', '2026-12-01')
    expect(t).toContain("agent_instructions('estrategia-interativa')"); expect(t).toContain("strategy_brief_context('c1', '2026-12-01')"); expect(t).toContain('dezembro de 2026')
  })
  it('pedido completo leva regras e briefing', () => {
    const t = fullPrompt('Fornario', '2026-12-01', 'REGRAS', { a: 1 })
    expect(t).toContain('<regras>\nREGRAS'); expect(t).toContain('"a": 1')
  })
  it('lê o JSON colado com texto em volta', () => {
    expect(extractJson('Aqui está:\n```json\n{"cards":[]}\n```\nfim')).toEqual({ cards: [] })
    expect(() => extractJson('nada')).toThrow()
  })
  it('valida os cards', () => {
    const ok = parseResult('{"cards":[{"aba":"social","tipo":"peca","titulo":"A"}],"novos":{"concorrentes":[]}}')
    expect(ok.errors).toEqual([]); expect(ok.cards).toHaveLength(1)
    const bad = parseResult('[{"aba":"blog","tipo":"x","titulo":"A"},{"aba":"resumo","tipo":"tese","titulo":""}]')
    expect(bad.errors).toHaveLength(2)
    expect(parseResult('{"x":1}').errors[0]).toMatch(/cards/)
  })
  it('card refeito herda aba e tipo', () => {
    const r = parseCard('{"titulo":"Novo"}', { tab: 'audiovisual', kind: 'video' } as StrategyCard)
    expect(r.error).toBeNull(); expect(r.card.aba).toBe('audiovisual')
  })
})
