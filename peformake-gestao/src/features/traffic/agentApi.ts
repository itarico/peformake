import { supabase } from '@/lib/supabase'
import type { Entity, EntityDay, EntityLevel } from './campaignRules'

export interface Dataset {
  id: string
  accountId: string
  name: string | null
  lastFiredTime: string | null
  isUnavailable: boolean | null
}

export interface Report {
  id: string
  clientId: string
  kind: 'weekly' | 'monthly' | 'custom'
  periodStart: string
  periodEnd: string
  path: string
  summary: string | null
  createdAt: string
  sentAt: string | null
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  tasksCreated: number
  createdAt: string
  pending: boolean
}

const PAGE = 1000

export async function listEntities(accountIds: readonly string[]): Promise<Entity[]> {
  if (accountIds.length === 0) return []
  const { data, error } = await supabase
    .from('traffic_entities')
    .select('id, account_id, level, parent_id, campaign_id, name, effective_status, daily_budget_cents, thumbnail_url')
    .in('account_id', [...accountIds])
    .limit(5000)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id, accountId: r.account_id, level: r.level as EntityLevel, parentId: r.parent_id, campaignId: r.campaign_id, name: r.name,
    effectiveStatus: r.effective_status, dailyBudgetCents: r.daily_budget_cents === null ? null : Number(r.daily_budget_cents), thumbnailUrl: r.thumbnail_url,
  }))
}

export async function listEntityDays(entityIds: readonly string[], from: string, to?: string): Promise<EntityDay[]> {
  const rows: EntityDay[] = []
  // Lotes de ids para a URL não ficar grande demais.
  for (let i = 0; i < entityIds.length; i += 150) {
    const ids = entityIds.slice(i, i + 150)
    for (let start = 0; ; start += PAGE) {
      const { data, error } = await supabase
        .from('traffic_entity_daily')
        .select('entity_id, day, spend_cents, impressions, reach, clicks, results')
        .in('entity_id', ids)
        .gte('day', from)
        .lte('day', to ?? '9999-12-31')
        .order('day')
        .range(start, start + PAGE - 1)
      if (error) throw error
      for (const r of data ?? []) {
        rows.push({ entityId: r.entity_id, day: r.day, spendCents: Number(r.spend_cents), impressions: Number(r.impressions), reach: Number(r.reach), clicks: Number(r.clicks), results: Number(r.results) })
      }
      if ((data ?? []).length < PAGE) break
    }
  }
  return rows
}

export async function listDatasets(accountIds: readonly string[]): Promise<Dataset[]> {
  if (accountIds.length === 0) return []
  const { data, error } = await supabase.from('traffic_datasets').select('id, account_id, name, last_fired_time, is_unavailable').in('account_id', [...accountIds])
  if (error) throw error
  return (data ?? []).map((r) => ({ id: r.id, accountId: r.account_id, name: r.name, lastFiredTime: r.last_fired_time, isUnavailable: r.is_unavailable }))
}

export async function requestAction(entityId: string, type: 'set_status' | 'set_daily_budget', value: string): Promise<void> {
  const { error } = await supabase.rpc('traffic_request_action', { _entity_id: entityId, _type: type, _value: value })
  if (error) throw error
}

export async function listReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('traffic_reports')
    .select('id, client_id, kind, period_start, period_end, path, summary, created_at, sent_at')
    .order('period_end', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id, clientId: r.client_id, kind: r.kind as Report['kind'], periodStart: r.period_start, periodEnd: r.period_end,
    path: r.path, summary: r.summary, createdAt: r.created_at, sentAt: r.sent_at,
  }))
}

export async function reportUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('traffic-reports').createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    const context = (error as { context?: Response }).context
    const payload = context ? await context.json().catch(() => null) : null
    throw new Error(payload?.error ?? 'Não foi possível concluir agora. Tente de novo.')
  }
  return data as T
}

export function generateReport(clientId: string, from: string, to: string, kind: 'weekly' | 'monthly' | 'custom' = 'custom') {
  return invoke<{ results: { client: string; skipped?: string; error?: string; path?: string }[] }>('traffic-report', { client_id: clientId, from, to, kind })
}

export async function listChat(): Promise<ChatMessage[]> {
  const { data, error } = await supabase.from('traffic_chat_messages').select('id, role, content, tasks_created, created_at, status').order('created_at').limit(200)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id, role: r.role as ChatMessage['role'], content: r.content, tasksCreated: r.tasks_created, createdAt: r.created_at, pending: r.status === 'pending',
  }))
}

export async function clearChat(): Promise<void> {
  const { error } = await supabase.rpc('traffic_chat_clear', {} as Record<string, never>)
  if (error) throw error
}

export function actionErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  if (code === '42501') return 'Você não tem permissão para esta ação.'
  if (code === 'PF004') return 'Item não encontrado. Leia a conta de novo em Saldo > Ler agora.'
  if (code === 'PF006') return 'Valor fora do limite permitido.'
  return 'Não foi possível enviar a ação. Nada foi alterado.'
}
