// Chamadas da aba Financeiro → WhatsApp. Tudo passa por funções do banco que conferem se é administrador.
import { supabase } from '@/lib/supabase'
import type { ReviewItem } from './waRules'

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

export async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export interface WaSettings { enabled: boolean; reply_enabled: boolean; reimburse_enabled: boolean; pix_enabled: boolean; high_value: number }
export interface WaChannel {
  id: string; kind: 'grupo' | 'privado'; name: string; chat_jid: string | null; invite_code: string | null; phone_key: string | null; enabled: boolean
  default_unit: 'peformake' | 'ellcazo' | null; accept_saida: boolean; accept_entrada: boolean; reply: boolean; default_payer: 'empresa' | 'quem_lancou'
  group_name: string | null; last_at: string | null
}
export interface WaStaff { id: string; name: string; avatar_path: string | null; phone: string | null; allowed: boolean; high_value: number | null; has_pix: boolean; pix_key_type: string | null; pix_hint: string | null }
export interface WaUnknown { phone_key: string; phone: string | null; name: string | null; last_text: string | null; attempts: number; last_at: string }
export interface WaOverview {
  settings: WaSettings; channels: WaChannel[]; staff: WaStaff[]; unknown: WaUnknown[]; groups: { chat_jid: string; name: string }[]
  health: { wasender_missing: boolean; transcribe_missing: boolean; whatsapp_sending: boolean; audio_waiting: number }
}
export interface Reimbursement { id: string; unit: string; amount: number; description: string; due_date: string; staff_id: string; staff: string; avatar_path: string | null; has_pix: boolean; reimburse_status: string | null; reimburse_error: string | null }
export interface ReviewData { items: ReviewItem[]; reimbursements: Reimbursement[]; pix_enabled: boolean }

export const getOverview = () => call<WaOverview>('fin_wa_overview')
export const getReview = () => call<ReviewData>('fin_wa_review_list')

export const teamPhoto = (p: string | null) => (p ? supabase.storage.from('team-photos').getPublicUrl(p).data.publicUrl : null)

/** Endereço temporário do comprovante ou do áudio (pasta privada, só admin). */
export async function mediaUrl(bucket: string, path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 1800)
  return data?.signedUrl ?? null
}
