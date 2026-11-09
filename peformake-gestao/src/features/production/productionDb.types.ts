import type { AppRole } from '@/lib/roles'
// Tipos das tabelas e funções de Conteúdo, Audiovisual e Notificações (migração 20261103960000).

type ReadOnly<Row> = { Row: Row; Insert: never; Update: never; Relationships: [] }

export type ProductionTables = {
niches: ReadOnly<{ slug: string; name: string; status: string; headline: string | null; subheadline: string | null; pains: unknown; solution: unknown; process: unknown; kpis: unknown; offer: unknown; playbook: string | null; version: number; updated_at: string; updated_by: string | null }>
niche_studies: ReadOnly<{ id: string; niche: string; quarter: string; status: string; summary: string | null; sections: unknown; sources: unknown; requested_by: string | null; requested_at: string; reviewed_by: string | null; reviewed_at: string | null }>
client_meetings: ReadOnly<{ id: string; client_id: string; kind: string; scheduled_at: string | null; status: string; agenda: string | null; notes: string | null; created_by: string | null; created_at: string }>
strategy_frameworks: ReadOnly<{ slug: string; name: string; category: string; area: string; cadence: string; objective: string; when_to_use: string; questions: unknown; position: number; source: string; is_active: boolean }>
client_frameworks: ReadOnly<{ id: string; client_id: string; slug: string; period: string; answers: unknown; summary: string | null; filled_by: string; status: string; updated_at: string; updated_by: string | null }>
client_briefs: ReadOnly<{ client_id: string; data: unknown; updated_at: string; updated_by: string | null }>
framework_requests: ReadOnly<{ id: string; client_id: string; period: string; slugs: string[]; status: string; error: string | null; requested_by: string | null; requested_at: string; done_at: string | null }>
wa_outbound_log: ReadOnly<{ id: string; contact_id: string; body: string; sent_by: string | null; status: string; error: string | null; created_at: string }>
social_tasks: ReadOnly<{ id: string; client_id: string | null; title: string; description: string | null; status: string; source: string; network: string; priority: boolean; due_date: string | null; assignee_id: string | null; ref_table: string | null; ref_id: string | null; position: number; created_by: string | null; created_at: string; updated_at: string; completed_at: string | null }>
social_news: ReadOnly<{ id: string; network: string; title: string; summary: string; what_to_do: string | null; impact: string; source_url: string | null; published_at: string | null; status: string; created_at: string }>
social_suggestions: ReadOnly<{ id: string; client_id: string | null; network: string; title: string; body: string; reason: string | null; status: string; task_id: string | null; created_at: string }>
social_accounts: ReadOnly<{ id: string; client_id: string; network: string; handle: string; external_id: string | null; status: string; last_sync_at: string | null; last_error: string | null; created_at: string }>
social_docs: ReadOnly<{ id: string; client_id: string; kind: string; network: string; month: string; status: string; summary: string | null; body: string | null; requested_by: string | null; requested_at: string; reviewed_by: string | null; reviewed_at: string | null }>
traffic_goals: ReadOnly<{ id: string; client_id: string; metric: string; target: number; is_active: boolean; updated_at: string; updated_by: string | null }>
team_highlights: ReadOnly<{ month: string; profile_id: string; reason: string | null; chosen_by: string | null; chosen_at: string }>
fin_whatsapp_senders: ReadOnly<{ phone: string; profile_id: string | null; label: string; units: string[]; created_at: string }>
site_leads: ReadOnly<{ id: string; name: string; phone: string; company: string | null; segment: string | null; interest: string | null; revenue: string | null; message: string | null; utm: unknown; status: string; created_at: string }>
prospect_searches: ReadOnly<{ id: string; client_id: string | null; name: string; query: string; tags: string[]; interest: string | null; daily: boolean; max_results: number; is_active: boolean; last_run_at: string | null; last_found: number | null; last_error: string | null; created_by: string | null; created_at: string; auto_lead: boolean; assignee_id: string | null }>
prospects: ReadOnly<{ id: string; search_id: string | null; client_id: string | null; place_id: string; name: string; category: string | null; phone: string | null; website: string | null; address: string | null; maps_url: string | null; rating: number | null; reviews: number | null; score: number; tags: string[]; interest: string | null; status: string; notes: string | null; lead_id: string | null; found_at: string; updated_at: string; signals: unknown; instagram: string | null; has_whatsapp: boolean | null; heat: string | null; enriched_at: string | null }>
contract_settings: ReadOnly<{ id: boolean; enabled: boolean; sandbox: boolean; company_signer_name: string | null; company_signer_email: string | null; signature_method: string; updated_at: string }>
contract_templates: ReadOnly<{ id: string; name: string; area: string | null; body: string; is_active: boolean; updated_at: string; updated_by: string | null }>
client_contract_docs: ReadOnly<{ id: string; client_id: string; template_id: string | null; title: string; body: string; status: string; signer_name: string | null; signer_email: string | null; signer_document: string | null; signer_address: string | null; provider_document_id: string | null; provider_error: string | null; sent_at: string | null; signed_at: string | null; created_by: string | null; created_at: string; updated_at: string }>
service_ratings: ReadOnly<{ id: string; client_id: string; area: string; week: string; score: number; improve: string | null; created_at: string }>
team_settings: ReadOnly<{ id: boolean; sourcing_enabled: boolean; sourcing_pct: number; sourcing_months: number; partnership_enabled: boolean; partnership_min_revenue: number; partnership_min_months: number; head_commission_enabled: boolean; head_commission_pct: number; goals_enabled: boolean; job_company_pct: number; updated_at: string; updated_by: string | null }>
member_leads: ReadOnly<{ id: string; profile_id: string; name: string; company: string | null; phone: string | null; interest: string | null; notes: string | null; stage: string; client_id: string | null; created_at: string; updated_at: string }>
member_goals: ReadOnly<{ id: string; role: AppRole | null; profile_id: string | null; metric: string; target: number; created_at: string }>
billing_settings: ReadOnly<{ id: boolean; gateway: string; gateway_env: string; auto_charge: boolean; reminders_enabled: boolean; monthly_generate: boolean; sweep_enabled: boolean; sweep_pix_key: string | null; sweep_pix_key_type: string | null; sweep_share_pct: number; fine_enabled: boolean; fine_pct: number; interest_pct: number; updated_at: string; updated_by: string | null }>
invoices: ReadOnly<{ id: string; client_id: string; unit: string; description: string; amount: number; due_date: string; status: string; source: string; ref: string | null; gateway: string | null; gateway_id: string | null; payment_url: string | null; gateway_error: string | null; paid_at: string | null; paid_amount: number | null; swept_at: string | null; fin_entry_id: string | null; created_by: string | null; created_at: string; updated_at: string; pay_token: string }>
billing_events: ReadOnly<{ id: number; invoice_id: string | null; kind: string; detail: string | null; created_at: string }>
fin_sweeps: ReadOnly<{ id: string; day: string; amount: number; invoice_ids: string[]; status: string; gateway_id: string | null; error: string | null; created_at: string }>
fin_categories: ReadOnly<{ id: string; unit: string; kind: string; name: string; is_active: boolean }>
fin_entries: ReadOnly<{ id: string; unit: string; kind: string; category_id: string | null; description: string; amount: number; due_date: string; paid_at: string | null; status: string; client_id: string | null; source: string; external_id: string | null; notes: string | null; created_by: string | null; created_at: string; updated_at: string }>
fin_rules: ReadOnly<{ id: string; unit: string; match: string; category_id: string; hits: number; created_at: string }>
access_invites: ReadOnly<{ email: string; roles: AppRole[]; area_admin: string[]; invited_by: string | null; created_at: string; accepted_at: string | null }>
  whatsapp_settings: ReadOnly<{ id: boolean; client_sessions_enabled: boolean; session_limit: number; updated_at: string }>
  client_scripts: ReadOnly<{ id: string; client_id: string; title: string; body: string; source: string; source_id: string | null; status: string; created_by: string | null; created_at: string; updated_at: string; av_project_id: string | null }>
  av_pricing: ReadOnly<{ id: boolean; values: unknown; updated_at: string; updated_by: string | null }>
  av_quotes: ReadOnly<{ id: string; code: string; client_id: string | null; lead_name: string | null; lead_phone: string | null; lead_email: string | null; title: string; kind: string; months: number | null; items: unknown; inputs: unknown; subtotal: number; discount: number; total: number; notes: string | null; status: string; valid_until: string | null; public_token: string; accepted_at: string | null; accepted_name: string | null; refused_reason: string | null; created_by: string | null; created_at: string; updated_at: string }>
  email_settings: ReadOnly<{ id: boolean; enabled: boolean; from_name: string; from_address: string | null; reply_to: string | null; updated_at: string; updated_by: string | null }>
  email_outbox: ReadOnly<{ id: number; to_email: string; subject: string; html: string; kind: string; ref_table: string | null; ref_id: string | null; status: string; attempts: number; error: string | null; provider_id: string | null; created_at: string; sent_at: string | null }>
  google_accounts: ReadOnly<{ id: string; label: string; email: string; scopes: string[] | null; connected_by: string | null; connected_at: string; last_error: string | null }>
  client_messages: ReadOnly<{ id: string; client_id: string; source_table: string | null; source_id: string | null; message: string; outbox_id: string | null; sent_by: string | null; created_at: string }>
  whatsapp_accounts: ReadOnly<{ id: string; name: string; phone: string | null; provider: string; secret_name: string; enabled: boolean; is_default: boolean; created_at: string; updated_by: string | null; client_id: string | null; session_id: number | null; status: string; status_at: string | null; last_error: string | null }>
  client_playbook: ReadOnly<{ client_id: string; reply_style: string | null; reply_examples: unknown; recurring: unknown; notes: string | null; updated_at: string }>
  client_assets: ReadOnly<{
    id: string
    client_id: string
    folder: string
    name: string
    bucket: string
    path: string
    mime: string
    size_bytes: number
    source: string
    source_id: string | null
    created_by: string | null
    created_at: string
  }>
  design_settings: ReadOnly<{ id: boolean; auto_enabled: boolean; auto_to_portal: boolean; drive_root_id: string; ai_takeover: boolean; ai_takeover_minutes: number; hub_auto_reply: boolean; hub_reply_groups: boolean; drive_account_id: string | null; updated_at: string; updated_by: string | null }>
  creative_requests: ReadOnly<{
    item_id: string | null
    mode: string
    step: string | null
    agent_notes: unknown
    agent_token: string
    started_at: string | null
    photo_path: string | null
    id: string
    client_id: string
    source: string
    brief: string
    copy: unknown
    formats: string[]
    photo_ids: string[]
    status: string
    error: string | null
    item_ids: string[] | null
    requested_by: string | null
    created_at: string
    finished_at: string | null
  }>
  notification_rules: ReadOnly<{
    kind: string
    category: string
    name: string
    description: string
    audience: string
    in_app: boolean
    whatsapp_client: boolean
    email: boolean
    position: number
    updated_at: string
    updated_by: string | null
  }>
  notification_mutes: ReadOnly<{ profile_id: string; kind: string }>
  content_plans: ReadOnly<{
    id: string
    client_id: string
    month: string
    notes: string | null
    planned_at: string | null
    sent_to_client_at: string | null
    created_at: string
    updated_at: string
  }>
  content_items: ReadOnly<{
    id: string
    ai_deadline_at: string | null
    plan_id: string
    client_id: string
    number: number
    kind: string
    status: string
    title: string | null
    headline: string | null
    subtitle: string | null
    cta: string | null
    briefing: string | null
    caption: string | null
    observations: string | null
    carousel_slides: unknown
    reference_links: string[]
    publish_date: string | null
    deadline: string | null
    designer_id: string | null
    is_extra: boolean
    revision_note: string | null
    revision_count: number
    legacy_id: string | null
    legacy_final_urls: string[]
    approved_at: string | null
    created_at: string
    updated_at: string
    updated_by: string | null
  }>
  content_files: ReadOnly<{
    id: string
    item_id: string
    role: string
    path: string
    name: string
    mime: string
    size_bytes: number
    uploaded_by: string | null
    created_at: string
  }>
  content_events: ReadOnly<{
    id: string
    item_id: string
    actor_id: string | null
    actor_kind: string
    actor_name: string | null
    from_status: string | null
    to_status: string | null
    message: string | null
    created_at: string
  }>
  av_projects: ReadOnly<{
    id: string
    client_id: string
    kind: string
    month: string | null
    title: string
    status: string
    briefing: string | null
    script: string | null
    video_count: number
    format: string | null
    reference_links: string[]
    shoot_at: string | null
    shoot_end_at: string | null
    location: string | null
    shoot_notes: string | null
    videomaker_id: string | null
    editor_id: string | null
    raw_link: string | null
    final_link: string | null
    due_date: string | null
    revision_note: string | null
    revision_count: number
    legacy_id: string | null
    delivered_at: string | null
    created_at: string
    updated_at: string
    updated_by: string | null
    shoot_duration_min: number | null
    location_lat: number | null
    location_lng: number | null
    google_event_id: string | null
    google_account_id: string | null
    scriptwriter_id: string | null
    owner_id: string | null
    script_status: string
    script_note: string | null
    script_sent_at: string | null
    script_approved_at: string | null
    shoot_confirmed_at: string | null
    checkin_at: string | null
    checkin_lat: number | null
    checkin_lng: number | null
    checkin_distance_m: number | null
    checkout_at: string | null
    raw_sent_at: string | null
    raw_links: { kind: string; url: string; note?: string }[]
    edit_due_at: string | null
    internal_approved_at: string | null
    staff_token: string | null
  }>
  av_settings: ReadOnly<{ id: boolean; edit_hours: number; raw_until_hour: number; default_duration_min: number; checkin_radius_m: number; calendar_account_ids: string[]; site_url: string; notify_client: boolean; notify_team: boolean; updated_at: string }>
  av_events: ReadOnly<{
    id: string
    project_id: string
    actor_id: string | null
    actor_kind: string
    actor_name: string | null
    from_status: string | null
    to_status: string | null
    message: string | null
    created_at: string
  }>
  notifications: ReadOnly<{
    id: string
    profile_id: string
    kind: string
    title: string
    body: string | null
    link: string | null
    client_id: string | null
    read_at: string | null
    created_at: string
  }>
  notification_settings: ReadOnly<{
    id: boolean
    whatsapp_enabled: boolean
    notify_client_review: boolean
    notify_staff_whatsapp: boolean
    quiet_start: number
    quiet_end: number
    client_daily_limit: number
    updated_at: string
    updated_by: string | null
  }>
  notification_outbox: ReadOnly<{
    id: string
    kind: string
    client_id: string | null
    to_phone: string
    message: string
    dedupe_key: string | null
    status: string
    attempts: number
    error: string | null
    created_at: string
    sent_at: string | null
  }>
}

export type ProductionFunctions = {
  dash_traffic: { Args: { _days: number }; Returns: unknown }
  dash_content: { Args: { _month: string }; Returns: unknown }
  dash_av: { Args: { _month: string }; Returns: unknown }
  dash_home_business: { Args: { _months?: number }; Returns: unknown }
  team_board: { Args: { _month: string }; Returns: unknown }
  my_day: { Args: { _staff_id?: string | null }; Returns: unknown }
  team_people: { Args: Record<string, never>; Returns: unknown }
  dash_commercial: { Args: { _days: number }; Returns: unknown }
  dash_clients: { Args: Record<string, never>; Returns: unknown }
  my_staff_id: { Args: Record<string, never>; Returns: string | null }
  production_clients: { Args: Record<string, never>; Returns: { id: string; name: string; is_active: boolean; areas: string[] }[] }
  production_staff: { Args: Record<string, never>; Returns: { id: string; full_name: string; main_role: string | null }[] }
  staff_link_profile: { Args: { _staff_id: string; _profile_id: string }; Returns: undefined }
  creative_request: { Args: { _client_id: string; _brief: string; _copy: Record<string, string>; _formats: string[] }; Returns: string }
  creative_ask: { Args: { _client_id: string; _text: string; _formats: string[]; _photo_path: string | null; _item_id: string | null }; Returns: string }
  creative_redo: { Args: { _request_id: string; _note: string }; Returns: string }
  creative_set_season: { Args: { _request_id: string; _season_key: string }; Returns: undefined }
  seasonal_board: { Args: { _days?: number; _client_id?: string | null }; Returns: unknown }
  client_date_save: { Args: { _client_id: string; _name: string; _month: number; _day: number; _idea: string | null }; Returns: string }
  client_date_delete: { Args: { _id: string }; Returns: undefined }
  seasonal_skip: { Args: { _client_id: string; _key: string; _skip: boolean }; Returns: undefined }
  design_settings_save: { Args: { _auto_enabled: boolean; _auto_to_portal: boolean; _drive_root_id: string }; Returns: undefined }
  client_asset_register: { Args: { _client_id: string; _folder: string; _name: string; _path: string; _mime: string; _size: number }; Returns: string }
  client_asset_delete: { Args: { _id: string }; Returns: string | null }
  content_item_claim: { Args: { _item_id: string }; Returns: undefined }
  client_requests_history: { Args: { _client_id: string }; Returns: unknown }
  google_connect_start: { Args: { _label: string; _return_url: string }; Returns: string }
  google_account_remove: { Args: { _id: string }; Returns: undefined }
  design_drive_account_set: { Args: { _account_id: string | null }; Returns: undefined }
  hub_settings_save: { Args: { _ai_takeover: boolean; _minutes: number; _auto_reply: boolean; _reply_groups: boolean }; Returns: undefined }
  client_whatsapp_target: { Args: { _client_id: string }; Returns: unknown }
  client_message_send: { Args: { _client_id: string; _message: string; _source_table: string; _source_id: string }; Returns: string }
  whatsapp_account_save: { Args: { _id: string | null; _name: string; _phone: string; _secret_name: string; _enabled: boolean }; Returns: string }
  client_requests_feed: { Args: { _days: number }; Returns: unknown }
  notification_rule_save: { Args: { _kind: string; _in_app: boolean; _whatsapp_client: boolean; _email?: boolean }; Returns: undefined }
  email_settings_save: { Args: { _enabled: boolean; _from_name: string; _from_address: string; _reply_to: string }; Returns: undefined }
  email_test: { Args: Record<string, never>; Returns: number }
  catalog_list: { Args: { _area: string | null }; Returns: unknown }
  service_save: { Args: { _id: string | null; _name: string; _area: string; _price: number; _description: string; _deliverables: string; _unit: string; _is_active: boolean }; Returns: string }
  package_save: { Args: { _id: string | null; _name: string; _description: string; _items: unknown; _is_active: boolean; _promo_price: number | null; _promo_starts: string | null; _promo_ends: string | null }; Returns: string }
  service_set_area: { Args: { _service_id: string; _area: string }; Returns: undefined }
  client_areas: { Args: { _client_id: string }; Returns: string[] }
  av_pricing_save: { Args: { _values: unknown }; Returns: undefined }
  av_quote_save: { Args: { _id: string | null; _data: unknown }; Returns: string }
  av_quote_mark_sent: { Args: { _id: string }; Returns: string }
  av_quote_public: { Args: { _token: string }; Returns: unknown }
  invoice_pay_info: { Args: { _token: string }; Returns: unknown }
  invoice_pay_set_document: { Args: { _token: string; _doc: string }; Returns: boolean }
  av_quote_accept: { Args: { _token: string; _name: string }; Returns: unknown }
  client_script_save: { Args: { _id: string | null; _client_id: string; _title: string; _body: string; _status: string }; Returns: string }
  portal_whatsapp_status: { Args: { _token: string }; Returns: unknown }
  whatsapp_settings_save: { Args: { _enabled: boolean; _limit: number }; Returns: undefined }
  operation_progress: { Args: { _month: string }; Returns: unknown }
  access_invite_save: { Args: { _email: string; _roles: AppRole[]; _area_admin: string[] }; Returns: string }
  access_invite_cancel: { Args: { _email: string }; Returns: undefined }
  fin_entry_save: { Args: { _id: string | null; _data: unknown }; Returns: string }
  fin_entry_set_status: { Args: { _id: string; _status: string; _paid_at?: string | null }; Returns: undefined }
  fin_categorize: { Args: { _id: string; _category: string; _learn?: string | null }; Returns: undefined }
  fin_category_save: { Args: { _unit: string; _kind: string; _name: string }; Returns: string }
  fin_import: { Args: { _unit: string; _rows: unknown }; Returns: unknown }
  fin_month_summary: { Args: { _unit: string; _month: string }; Returns: unknown }
  invoice_generate_month: { Args: { _month: string }; Returns: number }
  invoice_save: { Args: { _id: string | null; _data: unknown }; Returns: string }
  invoice_set_status: { Args: { _id: string; _status: string }; Returns: undefined }
  billing_settings_save: { Args: { _data: unknown }; Returns: undefined }
  client_billing_save: { Args: { _client: string; _document: string; _email: string }; Returns: undefined }
  team_settings_save: { Args: { _data: unknown }; Returns: undefined }
  member_goal_save: { Args: { _id: string | null; _role: string; _profile: string | null; _metric: string; _target: number | null }; Returns: string }
  client_set_sourced_by: { Args: { _client: string; _profile: string | null }; Returns: undefined }
  member_lead_save: { Args: { _id: string | null; _data: unknown }; Returns: string }
  member_lead_convert: { Args: { _id: string; _service: string }; Returns: string }
  member_dashboard: { Args: { _month: string; _profile?: string | null }; Returns: unknown }
  contract_template_save: { Args: { _id: string | null; _name: string; _area: string; _body: string }; Returns: string }
  contract_settings_save: { Args: { _data: unknown }; Returns: undefined }
  contract_create: { Args: { _client: string; _template: string }; Returns: string }
  contract_cancel: { Args: { _id: string }; Returns: undefined }
  ratings_summary: { Args: { _weeks?: number }; Returns: unknown }
  portal_contract: { Args: { _token: string }; Returns: unknown }
  portal_contract_data: { Args: { _token: string; _name: string; _document: string; _email: string; _address: string }; Returns: undefined }
  portal_overview: { Args: { _token: string }; Returns: unknown }
  portal_rate: { Args: { _token: string; _area: string; _score: number; _improve: string }; Returns: undefined }
  portal_nps: { Args: { _token: string; _score: number; _comment: string }; Returns: undefined }
  prospect_search_save: { Args: { _id: string | null; _data: unknown }; Returns: string }
  prospect_update: { Args: { _id: string; _status: string | null; _notes: string | null; _tags: string[] | null }; Returns: undefined }
  prospect_to_lead: { Args: { _id: string }; Returns: string }
  site_lead_create: { Args: { _data: unknown }; Returns: boolean }
  site_lead_update: { Args: { _id: string; _status: string }; Returns: undefined }
  site_showcase: { Args: Record<string, never>; Returns: unknown }
  fin_whatsapp_sender_save: { Args: { _phone: string; _label: string; _units: string[]; _remove?: boolean }; Returns: undefined }
  traffic_goal_save: { Args: { _client: string; _metric: string; _target: number }; Returns: undefined }
  traffic_goals_progress: { Args: { _month: string; _client?: string | null }; Returns: unknown }
  team_overview: { Args: { _month: string }; Returns: unknown }
  team_highlight_set: { Args: { _month: string; _profile: string | null; _reason: string }; Returns: undefined }
  social_task_save: { Args: { _id: string | null; _data: unknown }; Returns: string }
  social_news_set: { Args: { _id: string; _status: string }; Returns: string }
  social_suggestion_set: { Args: { _id: string; _accept: boolean }; Returns: string }
  social_account_save: { Args: { _client: string; _network: string; _handle: string; _remove?: boolean }; Returns: undefined }
  social_doc_request: { Args: { _client: string; _kind: string; _month: string; _network?: string }; Returns: string }
  social_doc_review: { Args: { _id: string; _approve: boolean; _body: string }; Returns: undefined }
  prospect_search_auto: { Args: { _id: string; _auto: boolean; _assignee: string | null }; Returns: undefined }
  client_framework_save: { Args: { _client: string; _slug: string; _date: string; _answers: unknown; _summary: string | null; _reviewed: boolean }; Returns: string }
  client_brief_save: { Args: { _client: string; _data: unknown }; Returns: undefined }
  framework_request: { Args: { _client: string; _date: string; _slugs: string[] }; Returns: string }
  niche_save: { Args: { _slug: string; _data: unknown }; Returns: undefined }
  niche_study_request: { Args: { _niche: string }; Returns: string }
  niche_study_review: { Args: { _id: string; _approve: boolean }; Returns: undefined }
  client_set_niche: { Args: { _client: string; _niche: string }; Returns: undefined }
  client_meeting_save: { Args: { _id: string | null; _data: unknown }; Returns: string }
  retention_overview: { Args: { _month: string }; Returns: unknown }
  site_niche: { Args: { _slug: string }; Returns: unknown }
  av_set_final_link: { Args: { _project_id: string; _link: string }; Returns: undefined }
  av_schedule: { Args: { _project_id: string | null; _data: unknown }; Returns: string }
  av_script_action: { Args: { _project_id: string; _script: string | null; _action: string }; Returns: undefined }
  av_auto_assign: { Args: { _project_id: string }; Returns: undefined }
  av_settings_save: { Args: { _data: unknown }; Returns: undefined }
  av_staff_view: { Args: { _token: string }; Returns: unknown }
  av_staff_checkin: { Args: { _token: string; _lat: number | null; _lng: number | null }; Returns: unknown }
  av_staff_checkout: { Args: { _token: string }; Returns: undefined }
  av_staff_raw: { Args: { _token: string; _links: unknown }; Returns: undefined }
  portal_av_overview: { Args: { _token: string }; Returns: unknown }
  portal_av_confirm: { Args: { _token: string; _project_id: string }; Returns: undefined }
  portal_av_script_decide: { Args: { _token: string; _project_id: string; _approve: boolean; _note: string }; Returns: undefined }
  portal_script_add: { Args: { _token: string; _title: string; _body: string }; Returns: string }
  admin_set_area_admin: { Args: { _user_id: string; _areas: string[] }; Returns: undefined }
  av_quote_set_status: { Args: { _id: string; _status: string; _reason: string | null }; Returns: undefined }
  notification_mute: { Args: { _kind: string; _muted: boolean }; Returns: undefined }
  notifications_mark_read: { Args: { _ids: string[] | null }; Returns: undefined }
  notification_save_settings: { Args: { _data: Record<string, unknown> }; Returns: undefined }
  content_plan_ensure: { Args: { _client_id: string; _month: string }; Returns: string }
  content_plan_save: { Args: { _plan_id: string; _notes: string; _planned: boolean }; Returns: undefined }
  content_item_save: { Args: { _item_id: string | null; _expected_updated_at: string | null; _data: Record<string, unknown> }; Returns: string }
  content_item_delete: { Args: { _item_id: string }; Returns: undefined }
  content_item_set_status: { Args: { _item_id: string; _status: string; _note: string | null }; Returns: undefined }
  content_send_to_client: { Args: { _plan_id: string }; Returns: number }
  content_item_comment: { Args: { _item_id: string; _message: string }; Returns: undefined }
  content_file_register: { Args: { _item_id: string; _role: string; _path: string; _name: string; _mime: string; _size: number }; Returns: string }
  content_file_delete: { Args: { _file_id: string }; Returns: string }
  av_project_save: { Args: { _project_id: string | null; _expected_updated_at: string | null; _data: Record<string, unknown> }; Returns: string }
  av_set_status: { Args: { _project_id: string; _status: string; _note: string | null }; Returns: undefined }
  av_comment: { Args: { _project_id: string; _message: string }; Returns: undefined }
  av_ensure_month: { Args: { _month: string }; Returns: number }
  portal_content: { Args: { _token: string }; Returns: unknown }
  portal_content_decide: { Args: { _token: string; _item_id: string; _approve: boolean; _note: string | null; _name: string | null }; Returns: undefined }
  portal_av_decide: { Args: { _token: string; _project_id: string; _approve: boolean; _note: string | null; _name: string | null }; Returns: undefined }
}
