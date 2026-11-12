import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MonthlyStrategy } from './monthlyRules'

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc
// Tabela nova ainda fora de database.types.
const db = supabase as unknown as { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

function fail(e: { message: string; code?: string }): never {
  if (e.code === 'PF012') throw new Error('Já está gerando. Volte em alguns minutos.')
  if (e.code === 'PF001') throw new Error('Essa ação já foi decidida.')
  if (e.code === 'PF006') throw new Error(e.message.includes('Consultoria') ? 'Este cliente não tem Consultoria ativa.' : 'Confira os dados.')
  if (e.code === '42501') throw new Error('Só administrador ou head de marketing.')
  throw new Error('Não foi possível agora. Tente de novo.')
}

export const monthlyKey = (clientId: string, month: string) => ['monthly', clientId, month] as const

/** A estratégia do mês (com as ações e a situação de cada uma na produção). Atualiza sozinha enquanto gera. */
export function useMonthly(clientId: string, month: string) {
  return useQuery({
    queryKey: monthlyKey(clientId, month),
    queryFn: async () => {
      const { data, error } = await rpc('monthly_get', { _client: clientId, _month: month })
      if (error) fail(error)
      return (data ?? null) as MonthlyStrategy | null
    },
    refetchInterval: (q) => (['gerando', 'na_fila'].includes((q.state.data as MonthlyStrategy | null | undefined)?.status ?? '') ? 15_000 : false),
  })
}

/** Dispara a função na hora (o cron também pega a cada 2 min). */
export async function kickMonthly(): Promise<void> {
  await supabase.functions.invoke('monthly-strategy', { body: {} }).catch(() => undefined)
}

export async function requestMonthly(clientId: string, month: string, ideas?: string | null): Promise<void> {
  const { error } = await rpc('monthly_request', { _client: clientId, _month: month, _ideas: ideas ?? null })
  if (error) fail(error)
  await kickMonthly()
}

/** Aprovar manda para a produção da área; devolve o link do item criado. */
export async function decideAction(id: string, approve: boolean): Promise<string | null> {
  const { data, error } = await rpc('monthly_action_decide', { _id: id, _approve: approve })
  if (error) fail(error)
  return (data as string | null) ?? null
}

export async function approveWeek(strategyId: string, week: number): Promise<number> {
  const { data, error } = await rpc('monthly_approve_week', { _strategy: strategyId, _week: week })
  if (error) fail(error)
  return Number(data ?? 0)
}

export async function editAction(id: string, v: { title: string; what: string; due: string | null; proof: string | null }): Promise<void> {
  const { error } = await rpc('monthly_action_edit', { _id: id, _title: v.title, _what: v.what, _due: v.due, _proof: v.proof })
  if (error) fail(error)
}

export async function decideAdjust(id: string, accept: boolean): Promise<void> {
  const { error } = await rpc('monthly_adjust_decide', { _id: id, _accept: accept })
  if (error) fail(error)
}

/** Ajuste da semana na hora (o mesmo de segunda, no modelo pequeno). */
export async function adjustNow(strategyId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('monthly-strategy', { body: { mode: 'ajuste', strategy_id: strategyId } })
  if (error) throw new Error('Não foi possível rever a semana agora.')
}

export interface ClientReport { id: string; kind: 'weekly' | 'monthly'; period_start: string; period_end: string; summary: string | null; path: string | null; sent_at: string | null; created_at: string }

/** Relatórios de tráfego do cliente (Tráfego → Relatórios), para ver dentro da Consultoria. */
export function useClientReports(clientId: string, enabled = true) {
  return useQuery({
    queryKey: ['client-reports', clientId], enabled,
    queryFn: async () => {
      const { data, error } = await db.from('traffic_reports').select('id, kind, period_start, period_end, summary, path, sent_at, created_at')
        .eq('client_id', clientId).order('period_end', { ascending: false }).limit(24)
      if (error) throw new Error('Não foi possível abrir os relatórios.')
      return (data ?? []) as ClientReport[]
    },
  })
}
