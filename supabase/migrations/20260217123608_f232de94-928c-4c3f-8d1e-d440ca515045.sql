
-- Table for storing AI auto-analyses (every 2 days)
CREATE TABLE public.traffic_ai_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  analysis_type TEXT NOT NULL DEFAULT 'auto',
  content TEXT NOT NULL,
  client_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage traffic analyses" ON public.traffic_ai_analyses
  FOR ALL USING (is_staff(auth.uid()));

CREATE POLICY "Anon can view traffic analyses" ON public.traffic_ai_analyses
  FOR SELECT USING (true);

CREATE INDEX idx_traffic_ai_analyses_client ON public.traffic_ai_analyses(client_id, year, month);

-- Table for auto-optimization rules
CREATE TABLE public.traffic_auto_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_auto_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage traffic rules" ON public.traffic_auto_rules
  FOR ALL USING (is_staff(auth.uid()));

CREATE UNIQUE INDEX idx_traffic_auto_rules_unique ON public.traffic_auto_rules(client_id, rule_type);
