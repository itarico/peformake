import { describe, expect, it } from 'vitest'
import { clientsToCall, concentration, greeting, pendingActions } from './homeRules'

const v = (name: string, flags: Parameters<typeof clientsToCall>[0][number]['flags'], isActive = true) => ({ client: { name, isActive }, flags })

describe('homeRules', () => {
  it('ordena quem ligar pelo peso dos pontos de atenção', () => {
    const list = [v('A', ['stale']), v('B', ['expired']), v('C', ['risk', 'stale']), v('D', []), v('E', ['risk'], false)]
    expect(clientsToCall(list).map((x) => x.client.name)).toEqual(['B', 'C', 'A'])
  })
  it('mede a dependência dos maiores clientes', () => {
    expect(concentration([50, 30, 10, 10])).toEqual({ top1: 50, top3: 90, total: 100 })
    expect(concentration([]).total).toBe(0)
  })
  it('cumprimenta pela hora', () => {
    expect(greeting(9)).toBe('Bom dia')
    expect(greeting(20)).toBe('Boa noite')
  })
  it('mostra só o que tem ação, urgentes primeiro', () => {
    const out = pendingActions([
      { key: 'a', label: 'a', count: 3, to: '/' },
      { key: 'b', label: 'b', count: 0, to: '/' },
      { key: 'c', label: 'c', count: 1, to: '/', urgent: true },
    ])
    expect(out.map((x) => x.key)).toEqual(['c', 'a'])
  })
})
