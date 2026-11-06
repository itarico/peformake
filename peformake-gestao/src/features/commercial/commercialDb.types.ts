// Tipos das tabelas e funções do Comercial (migrações 20261103910000 a 20261103930000).
// Ficam aqui para não disputar o database.types.ts com as outras áreas.

type ReadOnly<Row> = { Row: Row; Insert: never; Update: never; Relationships: [] }

// type, não interface: o supabase-js exige assinatura de índice, que interface não tem.
export type CommercialTables = {
  wa_contacts: ReadOnly<{
    id: string
    avatar_path: string | null
    verified_name: string | null
    about: string | null
    enriched_at: string | null
    enrich_error: string | null
    chat_jid: string
    is_group: boolean
    phone: string | null
    wa_name: string | null
    display_name: string | null
    kind: string
    client_id: string | null
    owner_id: string | null
    notes: string | null
    hidden: boolean
    first_message_at: string | null
    last_message_at: string | null
    last_inbound_at: string | null
    last_outbound_at: string | null
    last_from_me: boolean | null
    last_preview: string | null
    unanswered_count: number
    created_at: string
    updated_at: string
    updated_by: string | null
    ai_summary: string | null
    ai_intent: string | null
    ai_sentiment: string | null
    ai_analyzed_at: string | null
    ai_until: string | null
  }>
  crm_suggestions: ReadOnly<{
    id: string
    contact_id: string
    kind: string
    payload: Record<string, unknown>
    evidence: string | null
    status: string
    created_at: string
    reviewed_by: string | null
    reviewed_at: string | null
  }>
  crm_events: ReadOnly<{ id: number; contact_id: string | null; deal_id: string | null; kind: string; detail: string; actor_id: string | null; created_at: string }>
  crm_tags: ReadOnly<{ id: string; name: string; color: string; keywords: string[]; applies_to: string; is_active: boolean; created_at: string; updated_at: string }>
  wa_contact_tags: ReadOnly<{ contact_id: string; tag_id: string; source: string; created_at: string }>
  crm_deals: ReadOnly<{
    id: string
    contact_id: string
    title: string
    stage: string
    service_id: string | null
    value_cents: number | null
    owner_id: string | null
    next_step: string | null
    next_step_at: string | null
    lost_reason: string | null
    position: number
    created_by: string | null
    created_at: string
    updated_at: string
    updated_by: string | null
    closed_at: string | null
  }>
  crm_nps: ReadOnly<{
    id: string
    client_id: string
    phone: string
    phone_key: string
    status: string
    score: number | null
    category: string | null
    comment: string | null
    requested_by: string | null
    requested_at: string
    answered_at: string | null
    commented_at: string | null
  }>
  crm_sales: ReadOnly<{
    id: string
    deal_id: string | null
    contact_id: string | null
    client_id: string | null
    description: string
    value_cents: number
    sale_date: string
    status: string
    source: string
    excerpt: string | null
    created_by: string | null
    created_at: string
    reviewed_by: string | null
    reviewed_at: string | null
  }>
  commercial_settings: ReadOnly<{ id: number; reply_sla_minutes: number; stale_days: number; updated_at: string; updated_by: string | null }>
  wa_groups: ReadOnly<{ chat_jid: string; name: string; synced_at: string }>
}

export type CommercialFunctions = {
  nps_request: { Args: { _client_ids: string[] }; Returns: number }
  commercial_messages: {
    Args: { _contact_id: string; _limit: number }
    Returns: { id: number; from_me: boolean; sender_name: string | null; body: string | null; message_type: string | null; sent_at: string }[]
  }
  contact_save: { Args: { _contact_id: string; _data: Record<string, unknown> }; Returns: undefined }
  contact_set_tag: { Args: { _contact_id: string; _tag_id: string; _on: boolean }; Returns: undefined }
  tag_save: { Args: { _tag_id: string | null; _data: Record<string, unknown> }; Returns: string }
  tag_delete: { Args: { _tag_id: string }; Returns: undefined }
  deal_save: { Args: { _deal_id: string | null; _expected_updated_at: string | null; _data: Record<string, unknown> }; Returns: string }
  deal_move: { Args: { _deal_id: string; _stage: string; _lost_reason: string | null }; Returns: undefined }
  deal_delete: { Args: { _deal_id: string }; Returns: undefined }
  sale_save: { Args: { _data: Record<string, unknown> }; Returns: string }
  sale_review: { Args: { _sale_id: string; _confirm: boolean }; Returns: undefined }
  commercial_save_settings: { Args: { _reply_sla_minutes: number; _stale_days: number }; Returns: undefined }
  suggestion_review: { Args: { _suggestion_id: string; _accept: boolean }; Returns: undefined }
  commercial_request_analysis: { Args: { _contact_id: string }; Returns: undefined }
}
