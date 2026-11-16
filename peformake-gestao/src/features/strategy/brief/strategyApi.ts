import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { StrategyBoardData, StrategyCard } from './cardRules'

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc
const db = supabase as unknown as { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

function fail(e: { message: string; code?: string }): never {
  if (e.code === 'PF012') throw new Error('Já está gerando. Acompanhe por aqui.')
  if (e.code === 'PF013') throw new Error('O limite do mês com IA foi atingido. Ajuste em Configurações → Automações.')
  if (e.code === 'PF005') throw new Error('Ainda não está pronta.')
  if (e.code === 'PF004') throw new Error('Este card não existe mais. Atualize a tela.')
  if (e.code === '42501') throw new Error('Só administrador ou head de marketing.')
  throw new Error('Não foi possível agora. Tente de novo.')
}

export const boardKey = (clientId: string, month: string) => ['strategy-board', clientId, month] as const

/** O quadro do mês com os cards. Atualiza sozinho enquanto gera. */
export function useBoard(clientId: string, month: string) {
  return useQuery({
    queryKey: boardKey(clientId, month),
    queryFn: async () => {
      const { data, error } = await rpc('strategy_board_get', { _client: clientId, _month: month })
      if (error) fail(error)
      return (data ?? null) as StrategyBoardData | null
    },
    refetchInterval: (q) => (['na_fila', 'gerando'].includes((q.state.data as StrategyBoardData | null | undefined)?.status ?? '') ? 8_000 : false),
  })
}

export async function requestStrategy(clientId: string, month: string, missing: string[]): Promise<void> {
  const { error } = await rpc('strategy_request', { _client: clientId, _month: month, _missing: missing })
  if (error) fail(error)
}

/** Salva uma parte do card (texto editado, incluir no PDF, aprovar). */
export async function patchCard(id: string, patch: Partial<Pick<StrategyCard, 'title' | 'data' | 'funnel' | 'serves' | 'goal' | 'in_pdf' | 'status' | 'assumed'>>): Promise<void> {
  const { error } = await db.from('strategy_cards').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) fail(error)
}

export async function rejectCard(id: string, reason: string): Promise<void> {
  const { error } = await rpc('strategy_card_reject', { _id: id, _reason: reason })
  if (error) fail(error)
}

/** Refazer com o agente: o card vai para a fila (com o pedido opcional). */
export async function requestRedo(id: string, pedido: string): Promise<void> {
  const { error } = await rpc('strategy_card_redo_request', { _id: id, _pedido: pedido })
  if (error) fail(error)
}

/** Refaz SÓ este card na hora pela API (reserva; só quando o motor é 'api'). */
export async function redoCard(id: string, pedido: string): Promise<StrategyCard> {
  const { data, error } = await supabase.functions.invoke('strategy-cards', { body: { mode: 'refazer', card_id: id, pedido } })
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? 'Não foi possível refazer agora. Tente de novo.')
  }
  return (data as { card: StrategyCard }).card
}

export async function approveBoard(boardId: string): Promise<void> {
  const { error } = await rpc('strategy_approve', { _board: boardId })
  if (error) fail(error)
}
