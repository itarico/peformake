// Situação de cada relatório no quadro: o que falta fazer com ele.

export interface BoardReport {
  id: string
  path: string | null
  sent_at: string | null
  send_error: string | null
  by_agent: boolean
  created_at: string
  spend_cents: number | null
  results: number | null
}

export interface BoardRow {
  client_id: string
  name: string
  has_phone: boolean
  whatsapp_enabled: boolean
  has_traffic_service: boolean
  report: BoardReport | null
}

export interface Board {
  period: [string, string]
  send_enabled: boolean
  rows: BoardRow[]
}

export type ReportState = 'sent' | 'failed' | 'ready' | 'missing'

export function stateOf(row: BoardRow): ReportState {
  if (!row.report) return 'missing'
  if (row.report.sent_at) return 'sent'
  if (row.report.send_error) return 'failed'
  return 'ready'
}

export const STATE_LABEL: Record<ReportState, string> = {
  sent: 'Enviado',
  failed: 'Envio falhou',
  ready: 'Pronto, não enviado',
  missing: 'Ainda não gerado',
}

export function countStates(rows: readonly BoardRow[]): Record<ReportState, number> {
  const out: Record<ReportState, number> = { sent: 0, failed: 0, ready: 0, missing: 0 }
  for (const r of rows) out[stateOf(r)]++
  return out
}

// Pendências primeiro: falhou, não gerado, pronto; enviados por último.
const ORDER: Record<ReportState, number> = { failed: 0, missing: 1, ready: 2, sent: 3 }
export function sortRows(rows: readonly BoardRow[]): BoardRow[] {
  return [...rows].sort((a, b) => ORDER[stateOf(a)] - ORDER[stateOf(b)] || a.name.localeCompare(b.name, 'pt-BR'))
}
