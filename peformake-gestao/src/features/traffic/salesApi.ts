import { supabase } from '@/lib/supabase'
import type { Lead, MetaStatus, Sale, SalesClient, WaStatus } from './salesRules'

interface BoardRow {
  id: string; name: string
  wa: { status: WaStatus; phone: string | null; error: string | null } | null
  pixel_id: string | null; waba_id: string | null; test_event_code: string | null
  send_enabled: boolean; has_token: boolean
  leads: number; from_ads: number; hints: number; sales: number; value_cents: number; send_errors: number
}

export interface SalesBoard { clients: SalesClient[]; sessionsUsed: number; sessionsLimit: number }

// As tabelas e funções desta tela nasceram em 24/11/2026 (migração trafego_vendas_whatsapp) e ainda não estão nos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function getSalesBoard(): Promise<SalesBoard> {
  const { data, error } = await db.rpc('traffic_sales_board')
  if (error) throw error
  const raw = data as { clients: BoardRow[]; sessions_used: number; sessions_limit: number }
  return {
    sessionsUsed: raw.sessions_used, sessionsLimit: raw.sessions_limit,
    clients: (raw.clients ?? []).map((r) => ({
      id: r.id, name: r.name, wa: r.wa, pixelId: r.pixel_id, wabaId: r.waba_id, testEventCode: r.test_event_code,
      sendEnabled: r.send_enabled, hasToken: r.has_token, leads: r.leads, fromAds: r.from_ads, hints: r.hints,
      sales: r.sales, valueCents: Number(r.value_cents), sendErrors: r.send_errors,
    })),
  }
}

export async function listLeads(clientId: string): Promise<Lead[]> {
  const { data, error } = await db.from('wa_leads')
    .select('id, name, phone, last_at, last_preview, source, ad_title, sale_hint')
    .eq('client_id', clientId).order('last_at', { ascending: false }).limit(60)
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string, name: r.name as string | null, phone: r.phone as string | null, lastAt: r.last_at as string,
    lastPreview: r.last_preview as string | null, source: r.source === 'anuncio' ? 'anuncio' : 'organico',
    adTitle: r.ad_title as string | null, saleHint: r.sale_hint === true,
  }))
}

export async function listSales(clientId: string): Promise<Sale[]> {
  const { data, error } = await db.from('client_sales')
    .select('id, lead_id, value_cents, sold_at, note, meta_status, meta_error')
    .eq('client_id', clientId).order('sold_at', { ascending: false }).limit(60)
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string, leadId: r.lead_id as string | null, valueCents: Number(r.value_cents), soldAt: r.sold_at as string,
    note: r.note as string | null, metaStatus: r.meta_status as MetaStatus, metaError: r.meta_error as string | null,
  }))
}

export async function saveTracking(input: { clientId: string; pixelId: string; wabaId: string; testEventCode: string; sendEnabled: boolean; token: string }): Promise<void> {
  const { error } = await db.rpc('traffic_tracking_save', {
    _client: input.clientId, _pixel_id: input.pixelId, _waba_id: input.wabaId || null, _test_event_code: input.testEventCode || null,
    _send_enabled: input.sendEnabled, _token: input.token || null,
  })
  if (error) throw error
}

/** Manda a venda para a Meta. Nunca lança: o resultado (ou o motivo da recusa) fica gravado na venda. */
export async function sendSaleToMeta(saleId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('meta-conversion', { body: { sale_id: saleId } })
  if (error) return { ok: false, error: 'Não foi possível falar com a Meta agora. A venda ficou salva: toque em Reenviar.' }
  return data as { ok: boolean; error?: string }
}

export async function saveSale(input: { clientId: string; leadId: string | null; valueCents: number; soldAt: string; note: string }): Promise<{ id: string; sent: boolean | null; error?: string }> {
  const { data, error } = await db.rpc('traffic_sale_save', {
    _client: input.clientId, _lead: input.leadId, _value_cents: input.valueCents, _sold_at: input.soldAt, _note: input.note || null,
  })
  if (error) throw error
  const saved = data as { id: string; meta_status: MetaStatus }
  if (saved.meta_status !== 'pendente') return { id: saved.id, sent: null }
  const meta = await sendSaleToMeta(saved.id)
  return { id: saved.id, sent: meta.ok, error: meta.error }
}

export async function deleteSale(id: string): Promise<void> {
  const { error } = await db.rpc('traffic_sale_delete', { _id: id })
  if (error) throw error
}

/** Conexão do WhatsApp do cliente feita pela equipe (função wa-client no modo equipe). */
export async function waClient(clientId: string, action: 'start' | 'qr' | 'status' | 'disconnect', phone?: string): Promise<{ status?: WaStatus; qr?: string | null }> {
  const { data: session } = await supabase.auth.getSession()
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wa-client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.session?.access_token ?? ''}` },
    body: JSON.stringify({ client_id: clientId, action, phone }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Não foi possível falar com o WhatsApp agora.')
  return data
}
