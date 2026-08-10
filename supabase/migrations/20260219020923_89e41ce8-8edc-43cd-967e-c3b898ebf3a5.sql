
-- =============================================
-- CRM AGENT PROFESSIONAL TRAINING SYSTEM
-- =============================================

-- Expand crm_agent_configs with personality & advanced settings
ALTER TABLE public.crm_agent_configs
  ADD COLUMN IF NOT EXISTS agent_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS formality_level integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS authority_level integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS curiosity_level integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS insistence_level integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS sales_model text DEFAULT 'consultiva',
  ADD COLUMN IF NOT EXISTS pressure_level integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_discount_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS use_anchoring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS use_urgency boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_score_qualified integer DEFAULT 70,
  ADD COLUMN IF NOT EXISTS max_score_unqualified integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS min_confidence_sale numeric DEFAULT 80,
  ADD COLUMN IF NOT EXISTS ideal_client_profile text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_budget numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_problem text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ideal_company_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_region text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_ticket numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS focus_products text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS response_structure text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reactivation_days integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS reactivation_strategy text DEFAULT 'pergunta_aberta',
  ADD COLUMN IF NOT EXISTS crisis_keywords text DEFAULT 'cancelamento,reclamação,procon,processar',
  ADD COLUMN IF NOT EXISTS escalate_on_crisis boolean DEFAULT true;

-- Strategic questions per agent
CREATE TABLE IF NOT EXISTS public.crm_agent_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_type text NOT NULL,
  question_text text NOT NULL,
  question_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  is_conditional boolean NOT NULL DEFAULT false,
  condition_field text DEFAULT NULL,
  condition_value text DEFAULT NULL,
  score_weight integer DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_agent_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage agent questions"
  ON public.crm_agent_questions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can view agent questions"
  ON public.crm_agent_questions FOR SELECT
  USING (true);

-- Knowledge base (FAQ) for support agent
CREATE TABLE IF NOT EXISTS public.crm_agent_knowledge (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_type text NOT NULL DEFAULT 'support',
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'geral',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_agent_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage agent knowledge"
  ON public.crm_agent_knowledge FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can view agent knowledge"
  ON public.crm_agent_knowledge FOR SELECT
  USING (true);

-- Triple score system per lead
CREATE TABLE IF NOT EXISTS public.crm_lead_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  interest_score integer NOT NULL DEFAULT 0,
  urgency_score integer NOT NULL DEFAULT 0,
  risk_score integer NOT NULL DEFAULT 0,
  qualification_score integer NOT NULL DEFAULT 0,
  last_product_mentioned text DEFAULT NULL,
  last_price_mentioned numeric DEFAULT NULL,
  last_objection text DEFAULT NULL,
  last_stage text DEFAULT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_lead_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage lead scores"
  ON public.crm_lead_scores FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can view lead scores"
  ON public.crm_lead_scores FOR SELECT
  USING (true);

CREATE POLICY "Service can upsert lead scores"
  ON public.crm_lead_scores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update lead scores"
  ON public.crm_lead_scores FOR UPDATE
  USING (true);

-- Decision logs
CREATE TABLE IF NOT EXISTS public.crm_decision_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  agent_type text NOT NULL,
  decision_type text NOT NULL,
  reason text NOT NULL,
  from_stage text DEFAULT NULL,
  to_stage text DEFAULT NULL,
  score_at_decision integer DEFAULT NULL,
  confidence_at_decision numeric DEFAULT NULL,
  metadata jsonb DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_decision_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view decision logs"
  ON public.crm_decision_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert decision logs"
  ON public.crm_decision_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon can view decision logs"
  ON public.crm_decision_logs FOR SELECT
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_agent_questions_client_agent ON public.crm_agent_questions(client_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_crm_agent_knowledge_client_agent ON public.crm_agent_knowledge(client_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_lead ON public.crm_lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_decision_logs_lead ON public.crm_decision_logs(lead_id);
