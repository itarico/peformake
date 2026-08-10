
-- Agent configurations per client (SDR, Sales, Recovery, Support)
CREATE TABLE public.crm_agent_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('sdr', 'sales', 'recovery', 'support')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  max_chars INTEGER NOT NULL DEFAULT 500,
  allow_media BOOLEAN NOT NULL DEFAULT false,
  allow_links BOOLEAN NOT NULL DEFAULT false,
  allow_discount BOOLEAN NOT NULL DEFAULT false,
  sales_intensity TEXT NOT NULL DEFAULT 'moderate' CHECK (sales_intensity IN ('light', 'moderate', 'aggressive')),
  reactivation_minutes INTEGER NOT NULL DEFAULT 120,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  tone TEXT NOT NULL DEFAULT 'professional',
  use_emojis BOOLEAN NOT NULL DEFAULT true,
  allow_ai_identification BOOLEAN NOT NULL DEFAULT false,
  custom_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, agent_type)
);

ALTER TABLE public.crm_agent_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage agent configs" ON public.crm_agent_configs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can view agent configs" ON public.crm_agent_configs FOR SELECT USING (true);

-- Intelligence events log
CREATE TABLE public.crm_intelligence_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  message_id UUID REFERENCES crm_messages(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  intent TEXT,
  confidence NUMERIC,
  trigger_text TEXT,
  agent_type TEXT,
  sale_value NUMERIC,
  product_name TEXT,
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_intelligence_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage intelligence events" ON public.crm_intelligence_events FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can view intelligence events" ON public.crm_intelligence_events FOR SELECT USING (true);
CREATE POLICY "Service can insert intelligence events" ON public.crm_intelligence_events FOR INSERT WITH CHECK (true);

-- Message classifications
CREATE TABLE public.crm_message_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES crm_messages(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  classifications TEXT[] DEFAULT '{}',
  primary_intent TEXT,
  sentiment TEXT DEFAULT 'neutral',
  urgency TEXT DEFAULT 'low',
  confidence NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_message_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage classifications" ON public.crm_message_classifications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can view classifications" ON public.crm_message_classifications FOR SELECT USING (true);
CREATE POLICY "Service can insert classifications" ON public.crm_message_classifications FOR INSERT WITH CHECK (true);

-- Add human_active tracking to crm_leads
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS human_active_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS recovery_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS bot_paused BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE TRIGGER update_crm_agent_configs_updated_at
  BEFORE UPDATE ON public.crm_agent_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
