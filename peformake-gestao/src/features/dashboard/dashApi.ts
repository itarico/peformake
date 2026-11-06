import { supabase } from '@/lib/supabase'
import type { BusinessDash } from './businessRules'

export interface TrafficDash {
  period: [string, string]
  daily: { day: string; spend_cents: number; results: number }[]
  totals: { spend_cents: number; results: number; clicks: number; impressions: number }
  previous: { spend_cents: number; results: number; clicks: number; impressions: number }
  accounts_linked: number
  accounts_spending: number
  open_alerts: number
  low_balance: number
  tasks: { todo: number; doing: number; review: number; done_period: number }
  recommendations_open: number
  top_clients: { client_id: string; name: string; spend_cents: number; results: number }[]
}

export interface ContentDash {
  total: number
  by_status: Record<string, number>
  late: number
  publish_next7: number
  revisions: number
  clients: number
  plans_ready: number
  plans_total: number
  designers: { id: string; name: string; open: number; late: number }[]
}

export interface AvDash {
  total: number
  by_status: Record<string, number>
  shoots_next7: number
  late: number
  delivered_month: number
  videos_planned: number
}

export interface CommercialDash {
  period: [string, string]
  new_contacts_daily: { day: string; n: number }[]
  new_contacts: number
  new_contacts_prev: number
  unanswered: number
  deals_by_stage: Record<string, number>
  pipeline_cents: number
  sales_cents: number
  sales_cents_prev: number
  sales_pending: number
  won: number
  lost: number
  nps: { responses: number; promoters: number; detractors: number }
}

export interface ClientsDash {
  active: number
  lost_90d: number
  health: Record<string, number>
  unassessed: number
  services: { name: string; n: number }[]
  flow: { month: string; at_start: number; joined: number; left: number }[]
  tenure: { avg_months: number | null; lost_avg_months: number | null; buckets: { lt3: number; '3to6': number; '6to12': number; gt12: number; unknown: number } }
  renewals_60d: number
  nps: { answers: number; promoters: number; neutral: number; detractors: number }
  lost_reasons: { reason: string; n: number }[]
}

// Os resumos vêm prontos do banco: cada função confere o cargo e devolve só números.
function unwrap<T>({ data, error }: { data: unknown; error: unknown }): T {
  if (error) throw error
  return data as T
}

export const dashTraffic = async (days: number) => unwrap<TrafficDash>(await supabase.rpc('dash_traffic', { _days: days }))
export const dashContent = async (month: string) => unwrap<ContentDash>(await supabase.rpc('dash_content', { _month: month }))
export const dashAv = async (month: string) => unwrap<AvDash>(await supabase.rpc('dash_av', { _month: month }))
export const dashCommercial = async (days: number) => unwrap<CommercialDash>(await supabase.rpc('dash_commercial', { _days: days }))
export const dashClients = async () => unwrap<ClientsDash>(await supabase.rpc('dash_clients', {} as Record<string, never>))
export const dashHomeBusiness = async (months: number) => unwrap<BusinessDash>(await supabase.rpc('dash_home_business', { _months: months }))
