// Regras da lista do Caixa: só o que é dinheiro de verdade (pago/recebido) e as contas a pagar.
// Faturas de cliente em aberto ficam na Cobrança (quem deve), não aqui.

export type CashFilter = 'todos' | 'entrada' | 'saida' | 'a_pagar' | 'sem_categoria'
interface Row { kind: string; status: string; category_id: string | null; due_date: string; paid_at: string | null }

/** Lançamentos que aparecem no Caixa, já filtrados e na ordem da data que aparece na linha (mais recente primeiro). */
export function cashRows<T extends Row>(rows: T[], filter: CashFilter): T[] {
  return rows
    .filter((e) => e.status === 'pago' || (e.status === 'pendente' && e.kind === 'saida'))
    .filter((e) => filter === 'todos' ? true : filter === 'a_pagar' ? e.status === 'pendente' : filter === 'sem_categoria' ? !e.category_id : e.kind === filter)
    .sort((a, b) => (b.paid_at ?? b.due_date).localeCompare(a.paid_at ?? a.due_date))
}
