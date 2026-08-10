
-- Tabela de resumos da IA
CREATE TABLE public.crm_lead_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  summary text NOT NULL,
  detected_stage text,
  detected_sale_value numeric,
  analyzed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_lead_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage crm summaries" ON public.crm_lead_summaries
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can view crm summaries" ON public.crm_lead_summaries
  FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_lead_summaries;
