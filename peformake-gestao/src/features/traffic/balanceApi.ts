import { supabase } from '@/lib/supabase'
import type { AccountStatus } from './balanceRules'

export interface TrafficAlert {
  id: string
  accountId: string
  kind: 'low_balance' | 'daily_spend' | 'spend_spike' | 'account_problem'
  day: string
  message: string
  createdAt: string
  clientNotifiedAt: string | null
  groupNotifiedAt: string | null
  notifyError: string | null
}

export interface TrafficRun {
  trigger: 'auto' | 'manual'
  startedAt: string
  finishedAt: string | null
  ok: boolean | null
  accounts: number | null
  alerts: number | null
  error: string | null
}

export async function listAccountStatus(): Promise<AccountStatus[]> {
  const { data, error } = await supabase
    .from('traffic_account_status')
    .select('account_id, account_status, is_prepaid, available_cents, spend_cap_cents, amount_spent_cents, balance_due_cents, funding_text, read_at')
  if (error) throw error
  const n = (value: number | null) => (value === null ? null : Number(value))
  return (data ?? []).map((row) => ({
    accountId: row.account_id,
    accountStatus: row.account_status,
    isPrepaid: row.is_prepaid,
    availableCents: n(row.available_cents),
    spendCapCents: n(row.spend_cap_cents),
    amountSpentCents: n(row.amount_spent_cents),
    balanceDueCents: n(row.balance_due_cents),
    fundingText: row.funding_text,
    readAt: row.read_at,
  }))
}

export async function listOpenAlerts(): Promise<TrafficAlert[]> {
  const { data, error } = await supabase
    .from('traffic_alerts')
    .select('id, account_id, kind, day, message, created_at, client_notified_at, group_notified_at, notify_error')
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    accountId: row.account_id,
    kind: row.kind as TrafficAlert['kind'],
    day: row.day,
    message: row.message,
    createdAt: row.created_at,
    clientNotifiedAt: row.client_notified_at,
    groupNotifiedAt: row.group_notified_at,
    notifyError: row.notify_error,
  }))
}

export async function getLastRun(): Promise<TrafficRun | null> {
  const { data, error } = await supabase
    .from('traffic_runs')
    .select('trigger, started_at, finished_at, ok, accounts, alerts, error')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    trigger: data.trigger as TrafficRun['trigger'],
    startedAt: data.started_at,
    finishedAt: data.finished_at,
    ok: data.ok,
    accounts: data.accounts,
    alerts: data.alerts,
    error: data.error,
  }
}

export async function resolveAlert(alertId: string): Promise<void> {
  const { error } = await supabase.rpc('traffic_resolve_alert', { _alert_id: alertId })
  if (error) throw error
}

/** Pede a leitura agora. A função confere o login e o cargo no servidor. */
export async function readNow(): Promise<{ accounts?: number; alerts?: number; failures?: string[]; error?: string; skipped?: string }> {
  const { data, error } = await supabase.functions.invoke('traffic-read', { body: { trigger: 'manual' } })
  if (error) {
    const context = (error as { context?: Response }).context
    const body = context ? await context.json().catch(() => null) : null
    return { error: body?.error ?? body?.skipped ?? 'Não foi possível ler agora.' }
  }
  return data
}
