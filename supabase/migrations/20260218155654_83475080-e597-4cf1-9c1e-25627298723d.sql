-- Table to audit all Meta CAPI events sent from CRM
CREATE TABLE IF NOT EXISTS public.crm_conversion_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  client_id UUID NOT NULL,
  status TEXT NOT NULL,
  event_name TEXT NOT NULL,
  custom_event TEXT NOT NULL,
  sale_value NUMERIC NULL,
  meta_response JSONB NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.crm_conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view conversion events"
  ON public.crm_conversion_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert conversion events"
  ON public.crm_conversion_events FOR INSERT
  WITH CHECK (true);

-- Index for fast lookup by lead/client
CREATE INDEX IF NOT EXISTS idx_crm_conversion_events_lead_id ON public.crm_conversion_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_conversion_events_client_id ON public.crm_conversion_events(client_id);
