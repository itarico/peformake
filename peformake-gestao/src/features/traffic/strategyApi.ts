import { supabase } from '@/lib/supabase'
import type { StrategyModule } from './cloudAgentRules'
import type { Destination } from './strategyRules'

export interface MonthStrategyItem {
  id: string
  module: StrategyModule
  title: string
  body: string
  position: number
  status: 'proposed' | 'approved' | 'rejected'
  destination: Destination
  format: string | null
  routedTable: string | null
  routedId: string | null
}

export interface Research {
  competitors?: { name: string; what: string; source?: string }[]
  market_actions?: string[]
  calendar?: { date: string; what: string }[]
  gaps?: string[]
}

export interface MonthStrategy {
  id: string
  clientId: string
  month: string
  status: 'draft' | 'approved' | 'sent'
  summary: string
  research: Research | null
  pdfPath: string | null
  pdfAt: string | null
  sentAt: string | null
  sendError: string | null
  updatedAt: string
  items: MonthStrategyItem[]
}

export interface StrategyRequest {
  clientId: string
  status: 'queued' | 'done' | 'failed'
  requestedAt: string
  reason: string
}

export interface Direction {
  objectives: string
  priority_products: string
  new_offers: string
  important_dates: string
  budget: string
  constraints: string
  direction: string
}

export const EMPTY_DIRECTION: Direction = { objectives: '', priority_products: '', new_offers: '', important_dates: '', budget: '', constraints: '', direction: '' }

const STRATEGY_COLUMNS = 'id, client_id, month, status, summary, research, pdf_path, pdf_at, sent_at, send_error, updated_at'

type StrategyRow = {
  id: string; client_id: string; month: string | null; status: string; summary: string; research: unknown
  pdf_path: string | null; pdf_at: string | null; sent_at: string | null; send_error: string | null; updated_at: string
}

const toStrategy = (s: StrategyRow, items: MonthStrategyItem[]): MonthStrategy => ({
  id: s.id, clientId: s.client_id, month: s.month ?? '', status: s.status as MonthStrategy['status'], summary: s.summary,
  research: (s.research as Research | null) ?? null, pdfPath: s.pdf_path, pdfAt: s.pdf_at, sentAt: s.sent_at, sendError: s.send_error,
  updatedAt: s.updated_at, items,
})

/** Estratégias e pedidos de um mês, para a visão geral de todos os clientes. */
export async function loadMonth(month: string): Promise<{ strategies: MonthStrategy[]; requests: StrategyRequest[]; directions: Set<string> }> {
  const [strategies, requests, plans] = await Promise.all([
    supabase.from('traffic_strategies').select(STRATEGY_COLUMNS).eq('month', month),
    supabase.from('strategy_requests').select('client_id, status, requested_at, reason').eq('month', month).order('requested_at', { ascending: false }),
    supabase.from('client_monthly_plans').select('client_id, direction, objectives, priority_products, new_offers, important_dates, budget, constraints').eq('month', month),
  ])
  if (strategies.error) throw strategies.error
  if (requests.error) throw requests.error
  if (plans.error) throw plans.error
  const ids = (strategies.data ?? []).map((s) => s.id)
  const items = ids.length
    ? await supabase.from('traffic_strategy_items').select('strategy_id, status').in('strategy_id', ids)
    : { data: [] as { strategy_id: string; status: string }[], error: null }
  if (items.error) throw items.error
  const filled = (p: Record<string, unknown>) => Object.entries(p).some(([k, v]) => k !== 'client_id' && typeof v === 'string' && v.trim() !== '')
  return {
    strategies: (strategies.data ?? []).map((s) => toStrategy(s, (items.data ?? []).filter((i) => i.strategy_id === s.id).map((i) => ({ status: i.status }) as MonthStrategyItem))),
    requests: (requests.data ?? []).map((r) => ({ clientId: r.client_id, status: r.status as StrategyRequest['status'], requestedAt: r.requested_at, reason: r.reason })),
    directions: new Set((plans.data ?? []).filter(filled).map((p) => p.client_id)),
  }
}

export async function loadStrategy(clientId: string, month: string): Promise<{ strategy: MonthStrategy | null; request: StrategyRequest | null }> {
  const [strategy, request] = await Promise.all([
    supabase.from('traffic_strategies').select(STRATEGY_COLUMNS).eq('client_id', clientId).eq('month', month).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('strategy_requests').select('client_id, status, requested_at, reason').eq('client_id', clientId).eq('month', month)
      .order('requested_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (strategy.error) throw strategy.error
  if (request.error) throw request.error
  let items: MonthStrategyItem[] = []
  if (strategy.data) {
    const res = await supabase.from('traffic_strategy_items')
      .select('id, module, title, body, position, status, destination, format, routed_table, routed_id')
      .eq('strategy_id', strategy.data.id).order('position')
    if (res.error) throw res.error
    items = (res.data ?? []).map((i) => ({
      id: i.id, module: i.module as StrategyModule, title: i.title, body: i.body, position: i.position,
      status: i.status as MonthStrategyItem['status'], destination: i.destination as Destination, format: i.format,
      routedTable: i.routed_table, routedId: i.routed_id,
    }))
  }
  const r = request.data
  return {
    strategy: strategy.data ? toStrategy(strategy.data, items) : null,
    request: r ? { clientId: r.client_id, status: r.status as StrategyRequest['status'], requestedAt: r.requested_at, reason: r.reason } : null,
  }
}

export async function loadDirection(clientId: string, month: string): Promise<Direction> {
  const { data, error } = await supabase.from('client_monthly_plans')
    .select('direction, objectives, priority_products, new_offers, important_dates, budget, constraints')
    .eq('client_id', clientId).eq('month', month).maybeSingle()
  if (error) throw error
  if (!data) return EMPTY_DIRECTION
  return {
    objectives: data.objectives ?? '', priority_products: data.priority_products ?? '', new_offers: data.new_offers ?? '',
    important_dates: data.important_dates ?? '', budget: data.budget ?? '', constraints: data.constraints ?? '', direction: data.direction ?? '',
  }
}

export async function saveDirection(clientId: string, month: string, data: Direction): Promise<void> {
  const { error } = await supabase.rpc('plan_save_direction', { _client_id: clientId, _month: month, _data: { ...data } })
  if (error) throw error
}

export async function requestStrategy(clientId: string, month: string): Promise<void> {
  const { error } = await supabase.rpc('strategy_request', { _client_id: clientId, _month: month })
  if (error) throw error
}

export async function decideItem(id: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc('strategy_item_decide', { _id: id, _approve: approve })
  if (error) throw error
}

export async function publishStrategy(id: string, send: boolean): Promise<void> {
  const { error } = await supabase.rpc('strategy_publish', { _strategy_id: id, _send: send })
  if (error) throw error
}

/** Pede o PDF com o que está decidido agora e espera o servidor terminar (até 40 s). */
export async function freshPdfUrl(id: string): Promise<string> {
  // Espera o carimbo do PDF mudar: não depende do relógio do computador.
  const before = await supabase.from('traffic_strategies').select('pdf_at').eq('id', id).single()
  if (before.error) throw before.error
  const { error } = await supabase.rpc('strategy_pdf', { _strategy_id: id })
  if (error) throw error
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const { data } = await supabase.from('traffic_strategies').select('pdf_path, pdf_at').eq('id', id).single()
    if (data?.pdf_path && data.pdf_at && data.pdf_at !== before.data.pdf_at) {
      const signed = await supabase.storage.from('traffic-reports').createSignedUrl(data.pdf_path, 600)
      if (signed.error) throw signed.error
      return signed.data.signedUrl
    }
  }
  throw new Error('O PDF demorou. Tente de novo em instantes.')
}

export function strategyErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  if (code === '42501') return 'Só administrador ou head de marketing pode fazer isto.'
  if (code === 'PF001') return 'Este item já foi decidido. Atualize a página.'
  if (code === 'PF004') return 'Não encontrado. Atualize a página.'
  if (code === 'PF006') return 'Algum campo está fora do formato.'
  return (error as Error)?.message?.startsWith('O PDF') ? (error as Error).message : 'Não foi possível concluir. Tente de novo.'
}
