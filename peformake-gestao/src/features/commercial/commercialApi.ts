import { supabase } from '@/lib/supabase'
import type {
  CommercialSettings,
  Contact,
  ContactKind,
  CrmEvent,
  Intent,
  Sentiment,
  Suggestion,
  SuggestionKind,
  Deal,
  DealStage,
  Message,
  Sale,
  SaleStatus,
  Tag,
  TagColor,
  TagScope,
} from './commercialRules'

export async function listContacts(): Promise<Contact[]> {
  const [contacts, tags] = await Promise.all([
    supabase
      .from('wa_contacts')
      .select('id, chat_jid, is_group, phone, wa_name, display_name, kind, client_id, owner_id, notes, hidden, first_message_at, last_message_at, last_inbound_at, last_from_me, last_preview, unanswered_count, updated_at, ai_summary, ai_intent, ai_sentiment, ai_analyzed_at, avatar_path, verified_name, about, enriched_at')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(2000),
    supabase.from('wa_contact_tags').select('contact_id, tag_id, source').limit(10000),
  ])
  if (contacts.error) throw contacts.error
  if (tags.error) throw tags.error
  const byContact = new Map<string, Contact['tags']>()
  for (const row of tags.data ?? []) {
    const list = byContact.get(row.contact_id) ?? []
    list.push({ tagId: row.tag_id, source: row.source as 'manual' | 'auto' })
    byContact.set(row.contact_id, list)
  }
  return (contacts.data ?? []).map((row) => ({
    id: row.id,
    chatJid: row.chat_jid,
    isGroup: row.is_group,
    phone: row.phone,
    waName: row.wa_name,
    displayName: row.display_name,
    kind: row.kind as ContactKind,
    clientId: row.client_id,
    ownerId: row.owner_id,
    notes: row.notes,
    hidden: row.hidden,
    firstMessageAt: row.first_message_at,
    lastMessageAt: row.last_message_at,
    lastInboundAt: row.last_inbound_at,
    lastFromMe: row.last_from_me,
    lastPreview: row.last_preview,
    unansweredCount: row.unanswered_count,
    updatedAt: row.updated_at,
    tags: byContact.get(row.id) ?? [],
    aiSummary: row.ai_summary,
    aiIntent: row.ai_intent as Intent | null,
    aiSentiment: row.ai_sentiment as Sentiment | null,
    aiAnalyzedAt: row.ai_analyzed_at,
    avatarPath: row.avatar_path,
    verifiedName: row.verified_name,
    about: row.about,
    enrichedAt: row.enriched_at,
  }))
}

export async function listSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from('crm_suggestions')
    .select('id, contact_id, kind, payload, evidence, created_at')
    .eq('status', 'pendente')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    kind: row.kind as SuggestionKind,
    payload: row.payload as Suggestion['payload'],
    evidence: row.evidence,
    createdAt: row.created_at,
  }))
}

export async function listEvents(contactId: string): Promise<CrmEvent[]> {
  const { data, error } = await supabase
    .from('crm_events')
    .select('id, contact_id, kind, detail, actor_id, created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, contactId: row.contact_id, kind: row.kind, detail: row.detail, actorId: row.actor_id, createdAt: row.created_at }))
}

export async function reviewSuggestion(id: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('suggestion_review', { _suggestion_id: id, _accept: accept })
  if (error) throw error
}

/** Pede a leitura da IA agora para uma conversa. Devolve a mensagem de erro do servidor, se houver. */
export async function analyzeNow(contactId: string): Promise<{ created: number }> {
  const reset = await supabase.rpc('commercial_request_analysis', { _contact_id: contactId })
  if (reset.error) throw reset.error
  const { data, error } = await supabase.functions.invoke('commercial-ai', { body: { contact_id: contactId } })
  if (error) {
    const context = (error as { context?: Response }).context
    const payload = context ? await context.json().catch(() => null) : null
    throw new Error(payload?.error ?? 'Não foi possível analisar agora. Tente de novo.')
  }
  return { created: Number(data?.created ?? 0) }
}

export async function listMessages(contactId: string): Promise<Message[]> {
  const { data, error } = await supabase.rpc('commercial_messages', { _contact_id: contactId, _limit: 200 })
  if (error) throw error
  return (data ?? [])
    .map((row) => ({ id: row.id, fromMe: row.from_me, senderName: row.sender_name, body: row.body, messageType: row.message_type, sentAt: row.sent_at }))
    .reverse()
}

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from('crm_tags').select('id, name, color, keywords, applies_to, is_active').order('name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color as TagColor,
    keywords: row.keywords,
    appliesTo: row.applies_to as TagScope,
    isActive: row.is_active,
  }))
}

export async function listDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from('crm_deals')
    .select('id, contact_id, lead_name, lead_company, lead_phone, title, stage, service_id, value_cents, owner_id, next_step, next_step_at, lost_reason, position, created_by, created_at, updated_at, closed_at')
    .order('position')
    .limit(2000)
  if (error) throw error
  type DealRow = { id: string; contact_id: string | null; lead_name: string | null; lead_company: string | null; lead_phone: string | null; title: string; stage: string; service_id: string | null; value_cents: number | null; owner_id: string | null; next_step: string | null; next_step_at: string | null; lost_reason: string | null; position: number; created_by: string | null; created_at: string; updated_at: string; closed_at: string | null }
  return ((data ?? []) as unknown as DealRow[]).map((row) => ({
    id: row.id,
    contactId: row.contact_id ?? '',
    leadName: row.lead_name,
    leadCompany: row.lead_company,
    leadPhone: row.lead_phone,
    title: row.title,
    stage: row.stage as DealStage,
    serviceId: row.service_id,
    valueCents: row.value_cents === null ? null : Number(row.value_cents),
    ownerId: row.owner_id,
    nextStep: row.next_step,
    nextStepAt: row.next_step_at,
    lostReason: row.lost_reason,
    position: Number(row.position),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  }))
}

export async function listSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('crm_sales')
    .select('id, deal_id, contact_id, client_id, description, value_cents, sale_date, status, source, excerpt, created_at, kind, unit, seller_id, items, result' as 'id, deal_id, contact_id, client_id, description, value_cents, sale_date, status, source, excerpt, created_at')
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  type Extra = { kind?: 'avulso' | 'recorrente' | null; unit?: 'peformake' | 'ellcazo' | null; seller_id?: string | null; items?: unknown; result?: { invoice_id?: string | null; client_services?: unknown } | null }
  return (data ?? []).map((row) => ({
    hasItems: (row as Extra).items != null,
    billed: !!((row as Extra).result?.invoice_id || (row as Extra).result?.client_services),
    kind: (row as Extra).kind ?? null,
    unit: (row as Extra).unit ?? null,
    sellerId: (row as Extra).seller_id ?? null,
    id: row.id,
    dealId: row.deal_id,
    contactId: row.contact_id,
    clientId: row.client_id,
    description: row.description,
    valueCents: Number(row.value_cents),
    saleDate: row.sale_date,
    status: row.status as SaleStatus,
    source: row.source as 'manual' | 'agente',
    excerpt: row.excerpt,
    createdAt: row.created_at,
  }))
}

export async function getSettings(): Promise<CommercialSettings> {
  const { data, error } = await supabase.from('commercial_settings').select('reply_sla_minutes, stale_days').eq('id', 1).single()
  if (error) throw error
  return { replySlaMinutes: data.reply_sla_minutes, staleDays: data.stale_days }
}

export async function listServices(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase.from('services').select('id, name').order('name')
  if (error) throw error
  return (data ?? []) as { id: string; name: string }[]
}

export interface ContactDraft {
  displayName: string
  kind: ContactKind
  clientId: string
  ownerId: string
  notes: string
  hidden: boolean
}

export async function saveContact(id: string, draft: ContactDraft): Promise<void> {
  const { error } = await supabase.rpc('contact_save', {
    _contact_id: id,
    _data: {
      display_name: draft.displayName,
      kind: draft.kind,
      client_id: draft.clientId,
      owner_id: draft.ownerId,
      notes: draft.notes,
      hidden: draft.hidden,
    },
  })
  if (error) throw error
}

export async function setContactTag(contactId: string, tagId: string, on: boolean): Promise<void> {
  const { error } = await supabase.rpc('contact_set_tag', { _contact_id: contactId, _tag_id: tagId, _on: on })
  if (error) throw error
}

export interface TagDraft {
  name: string
  color: TagColor
  keywords: string[]
  appliesTo: TagScope
  isActive: boolean
}

export async function saveTag(id: string | null, draft: TagDraft): Promise<string> {
  const { data, error } = await supabase.rpc('tag_save', {
    _tag_id: id,
    _data: { name: draft.name, color: draft.color, keywords: draft.keywords, applies_to: draft.appliesTo, is_active: draft.isActive },
  })
  if (error) throw error
  return data
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.rpc('tag_delete', { _tag_id: id })
  if (error) throw error
}

export interface DealDraft {
  contactId: string
  leadName?: string
  leadCompany?: string
  leadPhone?: string
  title: string
  serviceId: string
  valueCents: number | null
  ownerId: string
  nextStep: string
  nextStepAt: string
}

export async function saveDeal(id: string | null, expectedUpdatedAt: string | null, draft: DealDraft): Promise<string> {
  const { data, error } = await supabase.rpc('deal_save', {
    _deal_id: id,
    _expected_updated_at: expectedUpdatedAt,
    _data: {
      contact_id: draft.contactId,
      ...(draft.leadName !== undefined ? { lead_name: draft.leadName, lead_company: draft.leadCompany ?? '', lead_phone: draft.leadPhone ?? '' } : {}),
      title: draft.title,
      service_id: draft.serviceId,
      value_cents: draft.valueCents === null ? '' : String(draft.valueCents),
      owner_id: draft.ownerId,
      next_step: draft.nextStep,
      next_step_at: draft.nextStepAt,
    },
  })
  if (error) throw error
  return data
}

export async function moveDeal(id: string, stage: DealStage, lostReason: string | null): Promise<void> {
  const { error } = await supabase.rpc('deal_move', { _deal_id: id, _stage: stage, _lost_reason: lostReason })
  if (error) throw error
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase.rpc('deal_delete', { _deal_id: id })
  if (error) throw error
}

export interface SaleDraft {
  dealId: string
  contactId: string
  clientId: string
  description: string
  valueCents: number | null
  saleDate: string
}

export async function saveSale(draft: SaleDraft): Promise<string> {
  const { data, error } = await supabase.rpc('sale_save', {
    _data: {
      deal_id: draft.dealId,
      contact_id: draft.contactId,
      client_id: draft.clientId,
      description: draft.description,
      value_cents: draft.valueCents === null ? '' : String(draft.valueCents),
      sale_date: draft.saleDate,
    },
  })
  if (error) throw error
  return data
}

export async function reviewSale(id: string, confirm: boolean): Promise<void> {
  const { error } = await supabase.rpc('sale_review', { _sale_id: id, _confirm: confirm })
  if (error) throw error
}

export async function saveSettings(settings: CommercialSettings): Promise<void> {
  const { error } = await supabase.rpc('commercial_save_settings', {
    _reply_sla_minutes: settings.replySlaMinutes,
    _stale_days: settings.staleDays,
  })
  if (error) throw error
}

export function commercialErrorMessage(error: unknown): string {
  if (error instanceof Error && !(error as { code?: string }).code) return error.message
  const code = (error as { code?: string } | null)?.code
  if (code === '42501') return 'Você não tem permissão para esta ação. Confirmar vendas, etiquetas e configurações é só para administrador ou head.'
  if (code === 'PF001') return 'Outra pessoa alterou isto agora. Feche e abra de novo.'
  if (code === 'PF002') return 'Já existe uma etiqueta com esse nome.'
  if (code === 'PF004') return 'Isto não existe mais. Atualize a página.'
  if (code === 'PF006') return 'Confira os campos preenchidos.'
  if (code === 'PF010') return 'Complete a venda antes de confirmar: escolha o serviço, a empresa e se é avulso ou mensal.'
  return 'Não foi possível salvar. Nada foi alterado. Tente de novo.'
}
