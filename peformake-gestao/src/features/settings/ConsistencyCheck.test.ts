import { describe, expect, it } from 'vitest'
import { groupIssues, type Issue } from './ConsistencyCheck'

const row = (tipo: string, client_id = 'c1'): Issue => ({ client_id, cliente: 'X', tipo, problema: 'p', link: `/clientes/${client_id}?aba=operacao` })

describe('groupIssues', () => {
  it('conta por tipo na ordem fixa e ignora tipo desconhecido', () => {
    const g = groupIssues([row('social_sem_plano'), row('servico_sem_preco'), row('servico_sem_preco', 'c2'), row('novo_tipo')])
    expect(g).toEqual([
      { tipo: 'servico_sem_preco', label: 'Serviço sem preço', count: 2 },
      { tipo: 'social_sem_plano', label: 'Sem plano do mês', count: 1 },
    ])
  })
})
