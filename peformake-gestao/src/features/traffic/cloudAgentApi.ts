import { supabase } from '@/lib/supabase'
import type { AgentRun, Recommendation, Strategy, StrategyItem } from './cloudAgentRules'

export async function listRecommendations(fromDay: string): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from('traffic_recommendations')
    .select('id, day, client_id, kind, priority, title, body, task_id, status')
    .gte('day', fromDay)
    .order('day', { ascending: false })
    .limit(300)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id, day: r.day, clientId: r.client_id, kind: r.kind as Recommendation['kind'], priority: r.priority as Recommendation['priority'],
    title: r.title, body: r.body, taskId: r.task_id, status: r.status as Recommendation['status'],
  }))
}

export async function decideRecommendation(id: string, status: Recommendation['status']): Promise<void> {
  const { error } = await supabase.rpc('recommendation_decide', { _id: id, _status: status })
  if (error) throw error
}

export async function recommendationToTask(id: string): Promise<void> {
  const { error } = await supabase.rpc('recommendation_to_task', { _id: id })
  if (error) throw error
}

export async function listStrategies(clientId: string | null): Promise<Strategy[]> {
  let query = supabase
    .from('traffic_strategies')
    .select('id, client_id, kind, period_start, period_end, summary, updated_at')
    .order('period_start', { ascending: false })
    .limit(clientId ? 12 : 40)
  if (clientId) query = query.eq('client_id', clientId)
  const { data, error } = await query
  if (error) throw error
  const ids = (data ?? []).map((s) => s.id)
  const items: StrategyItem[] = []
  if (ids.length > 0) {
    const res = await supabase
      .from('traffic_strategy_items')
      .select('id, strategy_id, module, title, body, position, status, task_id')
      .in('strategy_id', ids)
    if (res.error) throw res.error
    for (const i of res.data ?? []) {
      items.push({
        id: i.id, strategyId: i.strategy_id, module: i.module as StrategyItem['module'], title: i.title, body: i.body,
        position: i.position, status: i.status as StrategyItem['status'], taskId: i.task_id,
      })
    }
  }
  return (data ?? []).map((s) => ({
    id: s.id, clientId: s.client_id, kind: s.kind as Strategy['kind'], periodStart: s.period_start, periodEnd: s.period_end,
    summary: s.summary, updatedAt: s.updated_at, items: items.filter((i) => i.strategyId === s.id),
  }))
}

export async function decideStrategyItem(id: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc('strategy_item_decide', { _id: id, _approve: approve })
  if (error) throw error
}

export async function listRuns(): Promise<AgentRun[]> {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, routine, started_at, finished_at, ok, summary')
    .order('started_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id, routine: r.routine as AgentRun['routine'], startedAt: r.started_at, finishedAt: r.finished_at, ok: r.ok, summary: r.summary,
  }))
}

export type FireStatus = 'requested' | 'fired' | 'no_token' | 'failed' | 'skipped'
export interface FireRequest {
  routine: string
  requestedAt: string
  status: FireStatus
}

// Pede para a rotina rodar agora. Pedido repetido em menos de 2 minutos vira um só.
export async function requestRun(routine: 'daily' | 'inbox' | 'weekly' | 'commercial'): Promise<void> {
  const { error } = await supabase.rpc('agent_request_run', { _routine: routine })
  if (error) throw error
}

export async function listFires(): Promise<FireRequest[]> {
  const { data, error } = await supabase.from('agent_fire_log').select('routine, requested_at, status').order('requested_at', { ascending: false }).limit(40)
  if (error) throw error
  return (data ?? []).map((f) => ({ routine: f.routine, requestedAt: f.requested_at, status: f.status as FireStatus }))
}

export async function postChat(message: string): Promise<void> {
  const { error } = await supabase.rpc('traffic_chat_post', { _content: message })
  if (error) throw error
}

export function agentErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  if (code === '42501') return 'Só administrador ou head de marketing pode decidir isto.'
  if (code === 'PF001') return 'Já foi decidido ou há mensagens demais aguardando. Atualize a página.'
  if (code === 'PF004') return 'Item não encontrado. Atualize a página.'
  return 'Não foi possível concluir. Nada foi alterado.'
}
