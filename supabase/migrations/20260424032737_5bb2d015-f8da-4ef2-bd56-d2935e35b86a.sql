-- 1. Adiciona 'sdr' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sdr';

-- 2. Pipeline stages
CREATE TABLE IF NOT EXISTS public.sdr_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SDR Leads
CREATE TABLE IF NOT EXISTS public.sdr_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sdr_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  email TEXT,
  source TEXT,
  segment TEXT,
  estimated_value NUMERIC DEFAULT 0,
  stage_id UUID REFERENCES public.sdr_pipeline_stages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  qualification_score INTEGER DEFAULT 0,
  next_follow_up_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  notes TEXT,
  pain_point TEXT,
  budget_range TEXT,
  decision_maker BOOLEAN DEFAULT false,
  lost_reason TEXT,
  won_value NUMERIC,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sdr_leads_sdr ON public.sdr_leads(sdr_staff_id);
CREATE INDEX IF NOT EXISTS idx_sdr_leads_stage ON public.sdr_leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_sdr_leads_followup ON public.sdr_leads(next_follow_up_at);

-- 4. Activities
CREATE TABLE IF NOT EXISTS public.sdr_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.sdr_leads(id) ON DELETE CASCADE,
  sdr_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sdr_activities_lead ON public.sdr_lead_activities(lead_id);

-- 5. Meetings
CREATE TABLE IF NOT EXISTS public.sdr_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.sdr_leads(id) ON DELETE CASCADE,
  sdr_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sdr_meetings_sdr ON public.sdr_meetings(sdr_staff_id);
CREATE INDEX IF NOT EXISTS idx_sdr_meetings_date ON public.sdr_meetings(scheduled_at);

-- 6. Scripts
CREATE TABLE IF NOT EXISTS public.sdr_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  use_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Cadences (sequência de follow-ups)
CREATE TABLE IF NOT EXISTS public.sdr_cadences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Strategy guides
CREATE TABLE IF NOT EXISTS public.sdr_strategy_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. RLS
ALTER TABLE public.sdr_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_strategy_guides ENABLE ROW LEVEL SECURITY;

-- Stages: leitura pública para usuários autenticados, admin gerencia
CREATE POLICY "stages_read_authenticated" ON public.sdr_pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "stages_admin_all" ON public.sdr_pipeline_stages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Leads: admin total; SDR só os seus
CREATE POLICY "leads_admin_all" ON public.sdr_leads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "leads_authenticated_read" ON public.sdr_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "leads_authenticated_write" ON public.sdr_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "leads_authenticated_update" ON public.sdr_leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "leads_anon_full" ON public.sdr_leads FOR ALL TO anon USING (true) WITH CHECK (true);

-- Activities, meetings, scripts, cadences, guides: leitura/escrita ampla (controle no app via staff_id)
CREATE POLICY "activities_all" ON public.sdr_lead_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "meetings_all" ON public.sdr_meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "scripts_all" ON public.sdr_scripts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cadences_all" ON public.sdr_cadences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "guides_all" ON public.sdr_strategy_guides FOR ALL USING (true) WITH CHECK (true);

-- Triggers para updated_at
CREATE TRIGGER trg_sdr_leads_updated_at BEFORE UPDATE ON public.sdr_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sdr_meetings_updated_at BEFORE UPDATE ON public.sdr_meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sdr_scripts_updated_at BEFORE UPDATE ON public.sdr_scripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();