import { supabase } from '@/lib/supabase'
import type { AvPricing, CatalogPick, QuoteInputs, QuoteLine } from './avPricing'

export type QuoteStatus = 'rascunho' | 'enviado' | 'aceito' | 'recusado' | 'expirado'
export type QuoteKind = 'avulso' | 'plano' | 'evento' | 'projeto'

export interface AvQuote {
  id: string
  code: string
  clientId: string | null
  leadName: string | null
  leadPhone: string | null
  leadEmail: string | null
  title: string
  kind: QuoteKind
  months: number | null
  items: { lines: QuoteLine[]; picks: CatalogPick[] }
  inputs: QuoteInputs | null
  subtotal: number
  discount: number
  total: number
  notes: string | null
  status: QuoteStatus
  validUntil: string | null
  publicToken: string
  createdAt: string
}

export const STATUS_LABEL: Record<QuoteStatus, string> = { rascunho: 'Rascunho', enviado: 'Enviado', aceito: 'Aceito', recusado: 'Recusado', expirado: 'Expirado' }

type Row = {
  id: string; code: string; client_id: string | null; lead_name: string | null; lead_phone: string | null; lead_email: string | null; title: string; kind: string
  months: number | null; items: unknown; inputs: unknown; subtotal: number; discount: number; total: number; notes: string | null; status: string; valid_until: string | null
  public_token: string; created_at: string
}
const COLS = 'id, code, client_id, lead_name, lead_phone, lead_email, title, kind, months, items, inputs, subtotal, discount, total, notes, status, valid_until, public_token, created_at'

function toQuote(r: Row): AvQuote {
  const items = (r.items && typeof r.items === 'object' && !Array.isArray(r.items) ? r.items : { lines: [], picks: [] }) as AvQuote['items']
  return {
    id: r.id, code: r.code, clientId: r.client_id, leadName: r.lead_name, leadPhone: r.lead_phone, leadEmail: r.lead_email, title: r.title,
    kind: r.kind as QuoteKind, months: r.months, items: { lines: items.lines ?? [], picks: items.picks ?? [] },
    inputs: (r.inputs && Object.keys(r.inputs as object).length ? r.inputs : null) as QuoteInputs | null,
    subtotal: Number(r.subtotal), discount: Number(r.discount), total: Number(r.total), notes: r.notes, status: r.status as QuoteStatus,
    validUntil: r.valid_until, publicToken: r.public_token, createdAt: r.created_at,
  }
}

export async function getPricing(): Promise<AvPricing> {
  const { data, error } = await supabase.from('av_pricing').select('values').eq('id', true).single()
  if (error) throw error
  return data.values as AvPricing
}

export async function savePricing(values: AvPricing): Promise<void> {
  const { error } = await supabase.rpc('av_pricing_save', { _values: values })
  if (error) throw error
}

export async function listQuotes(): Promise<AvQuote[]> {
  const { data, error } = await supabase.from('av_quotes').select(COLS).order('created_at', { ascending: false }).limit(200)
  if (error) throw error
  return (data ?? []).map((r) => toQuote(r as Row))
}

export async function getQuote(id: string): Promise<AvQuote> {
  const { data, error } = await supabase.from('av_quotes').select(COLS).eq('id', id).single()
  if (error) throw error
  return toQuote(data as Row)
}

export async function saveQuote(id: string | null, data: Record<string, unknown>): Promise<string> {
  const { data: qid, error } = await supabase.rpc('av_quote_save', { _id: id, _data: data })
  if (error) throw error
  return qid as string
}

export async function setQuoteStatus(id: string, status: QuoteStatus, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('av_quote_set_status', { _id: id, _status: status, _reason: reason ?? null })
  if (error) throw error
}

/** Marca como enviado e devolve o link público da proposta. */
export async function quoteLink(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('av_quote_mark_sent', { _id: id })
  if (error) throw error
  return `${window.location.origin}/orcamento/${data as string}`
}
