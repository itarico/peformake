// Relatórios do mês por cliente (Italo, 17/11): Semana 1, 2, 3, 4 (às vezes 5) + Mensal, como cartões.
// Cada semanal entra na semana pela segunda-feira em que começa (não importa se o fim é domingo ou segunda).

export interface MonthReport {
  id: string; kind: 'weekly' | 'monthly'; period_start: string; period_end: string
  path: string | null; sent_at: string | null; send_error: string | null; by_agent: boolean; created_at: string
  spend_cents: number | null; results: number | null
}
export interface MonthRow { client_id: string; name: string; has_phone: boolean; whatsapp_enabled: boolean; has_traffic_service: boolean; reports: MonthReport[] }
export interface MonthBoard { month: string; today: string; send_enabled: boolean; rows: MonthRow[] }

export type SlotState = 'sent' | 'failed' | 'ready' | 'missing' | 'future'
export interface Slot { key: string; label: string; short: string; kind: 'weekly' | 'monthly'; from: string; to: string; state: SlotState; report: MonthReport | null; latest: boolean }

const d = (s: string) => new Date(`${s}T12:00:00Z`)
const iso = (x: Date) => x.toISOString().slice(0, 10)
const add = (s: string, n: number) => iso(new Date(d(s).getTime() + n * 86_400_000))
/** Segunda-feira da semana de uma data. */
export const mondayOf = (s: string) => add(s, -((d(s).getUTCDay() + 6) % 7))

/** As segundas-feiras do mês (4 ou 5): cada uma é uma semana. */
export function mondaysOf(month: string): string[] {
  const first = `${month.slice(0, 7)}-01`
  let m = mondayOf(first); if (m < first) m = add(m, 7)
  const out: string[] = []
  while (m.slice(0, 7) === month.slice(0, 7)) { out.push(m); m = add(m, 7) }
  return out
}

const stateOf = (r: MonthReport | null, done: boolean): SlotState =>
  r ? (r.sent_at ? 'sent' : r.send_error ? 'failed' : 'ready') : done ? 'missing' : 'future'

/** Os cartões de um cliente no mês: as semanas e o mensal. "latest" = o período mais recente já fechado (dá para pedir ao agente). */
export function slotsOf(row: Pick<MonthRow, 'reports'>, month: string, today: string): Slot[] {
  const weeks = mondaysOf(month)
  const lastClosedWeek = add(mondayOf(today), -7)
  const slots: Slot[] = weeks.map((mon, i) => {
    const r = row.reports.find((x) => x.kind === 'weekly' && mondayOf(x.period_start) === mon) ?? null
    const end = add(mon, 6)
    return { key: `w${mon}`, label: `Semana ${i + 1}`, short: `S${i + 1}`, kind: 'weekly', from: mon, to: end, report: r, state: stateOf(r, end < today), latest: mon === lastClosedWeek }
  })
  const first = `${month.slice(0, 7)}-01`
  const last = add(iso(new Date(Date.UTC(d(first).getUTCFullYear(), d(first).getUTCMonth() + 1, 1))), -1)
  const mr = row.reports.find((x) => x.kind === 'monthly' && x.period_start.slice(0, 7) === month.slice(0, 7)) ?? null
  // O mensal sai nos últimos dias do mês (dia 28 em diante): conta como "faltando" a partir daí.
  const due = today >= add(last, -3)
  slots.push({ key: 'm', label: 'Mensal', short: 'Mês', kind: 'monthly', from: first, to: last, report: mr, state: stateOf(mr, due), latest: due && today.slice(0, 7) === month.slice(0, 7) || (today > last && add(last, 31) > today) })
  return slots
}

/** Pendências primeiro (falhou, faltando, pronto), depois em dia. */
export function sortMonthRows(rows: MonthRow[], month: string, today: string): MonthRow[] {
  const rank = (r: MonthRow) => { const s = slotsOf(r, month, today).map((x) => x.state); return s.includes('failed') ? 0 : s.includes('missing') ? 1 : s.includes('ready') ? 2 : 3 }
  return [...rows].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR'))
}

export const SLOT_LABEL: Record<SlotState, string> = { sent: 'Enviado', failed: 'Envio falhou', ready: 'Pronto, não enviado', missing: 'Não foi gerado', future: 'Ainda não chegou' }
