
-- Table for AI-generated action items per client
CREATE TABLE public.traffic_ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- 'budget_low', 'high_cpa', 'low_ctr', 'scale_opportunity', 'creative_fatigue', 'custom'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_ai_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage traffic actions" ON public.traffic_ai_actions
  FOR ALL USING (is_staff(auth.uid()));

CREATE POLICY "Anon can view traffic actions" ON public.traffic_ai_actions
  FOR SELECT USING (true);

CREATE INDEX idx_traffic_ai_actions_client ON public.traffic_ai_actions(client_id, is_resolved);
