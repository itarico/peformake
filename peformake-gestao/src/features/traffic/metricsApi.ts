import { supabase } from '@/lib/supabase'
import type { DailyMetric } from './metricsRules'

const PAGE = 1000

export async function listDailyMetrics(from: string, to: string): Promise<DailyMetric[]> {
  const rows: DailyMetric[] = []
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await supabase
      .from('traffic_daily_metrics')
      .select('account_id, day, spend_cents, impressions, clicks, leads, purchases, purchase_value_cents, results, result_type, read_at')
      .gte('day', from)
      .lte('day', to)
      .order('day')
      .order('account_id')
      .range(start, start + PAGE - 1)
    if (error) throw error
    for (const row of data ?? []) {
      rows.push({
        accountId: row.account_id,
        day: row.day,
        spendCents: Number(row.spend_cents),
        impressions: Number(row.impressions),
        clicks: Number(row.clicks),
        leads: Number(row.leads),
        purchases: Number(row.purchases),
        purchaseValueCents: Number(row.purchase_value_cents),
        results: row.results === null ? null : Number(row.results),
        resultType: row.result_type,
        readAt: row.read_at,
      })
    }
    if ((data ?? []).length < PAGE) return rows
  }
}
