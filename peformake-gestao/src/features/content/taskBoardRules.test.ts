import { describe, expect, it } from 'vitest'
import { groupTasks, taskOrigin } from './taskBoardRules'

const now = new Date('2026-11-24T12:00:00Z').getTime()
const t = (id: string, over: object) => ({ id, status: 'a_fazer' as const, priority: false, due_date: null as string | null, created_at: '2026-11-23T10:00:00Z', ...over })

describe('tarefas do social media', () => {
  it('junta as origens em cliente, sistema e minha', () => {
    expect(taskOrigin('pedido_cliente')).toBe('cliente')
    expect(taskOrigin('manual')).toBe('minha')
    expect(['estrategia', 'agente', 'novidade'].map((s) => taskOrigin(s as never))).toEqual(['sistema', 'sistema', 'sistema'])
  })

  it('separa em A fazer, Fazendo e Feito; revisão conta como Fazendo', () => {
    const g = groupTasks([t('a', {}), t('b', { status: 'fazendo' }), t('c', { status: 'revisao' }), t('d', { status: 'feito' })], now)
    expect(g.a_fazer.map((x) => x.id)).toEqual(['a'])
    expect(g.fazendo.map((x) => x.id).sort()).toEqual(['b', 'c'])
    expect(g.feito.map((x) => x.id)).toEqual(['d'])
  })

  it('feito some depois de 7 dias', () => {
    expect(groupTasks([t('velha', { status: 'feito', created_at: '2026-11-01T10:00:00Z' })], now).feito).toEqual([])
  })

  it('ordena por prioridade, depois prazo mais perto, depois a mais nova', () => {
    const g = groupTasks([
      t('sem-prazo', {}), t('prazo-longe', { due_date: '2026-12-10' }), t('prazo-perto', { due_date: '2026-11-25' }),
      t('prioridade', { priority: true, due_date: '2026-12-30' }), t('nova', { created_at: '2026-11-24T09:00:00Z' }),
    ], now)
    expect(g.a_fazer.map((x) => x.id)).toEqual(['prioridade', 'prazo-perto', 'prazo-longe', 'nova', 'sem-prazo'])
  })
})
