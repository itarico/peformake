CREATE INDEX IF NOT EXISTS idx_crm_leads_client_last_message
ON public.crm_leads (client_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_crm_messages_lead_created_desc
ON public.crm_messages (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_messages_client_created
ON public.crm_messages (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_sales_client_confirmed_date
ON public.crm_sales (client_id, is_confirmed, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_crm_sales_lead_confirmed_date
ON public.crm_sales (lead_id, is_confirmed, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_crm_flow_sessions_active_lead
ON public.crm_flow_sessions (lead_id, client_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_flows_client_trigger_active
ON public.crm_flows (client_id, trigger_type, is_active);

CREATE INDEX IF NOT EXISTS idx_crm_campaigns_client_status_created
ON public.crm_campaigns (client_id, status, created_at DESC);