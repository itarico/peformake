
-- Add deadline tracking to arts table
ALTER TABLE public.arts ADD COLUMN IF NOT EXISTS deadline_date date;
ALTER TABLE public.arts ADD COLUMN IF NOT EXISTS briefing_completed_at timestamp with time zone;

-- Add commission rules table for global/per-role configuration
CREATE TABLE IF NOT EXISTS public.commission_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_member_id uuid REFERENCES public.staff_members(id) ON DELETE CASCADE,
  rule_name text NOT NULL DEFAULT 'Padrão',
  commission_type text NOT NULL DEFAULT 'percent', -- 'percent' or 'fixed'
  commission_value numeric NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'all', -- 'design', 'social_media', 'consulting', 'all'
  min_arts_per_month integer DEFAULT 0,
  bonus_threshold integer DEFAULT 0,
  bonus_value numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage commission rules"
  ON public.commission_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view commission rules"
  ON public.commission_rules FOR SELECT
  USING (is_staff(auth.uid()));

-- Add CRM service flag to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS has_crm_service boolean NOT NULL DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS crm_activated_at timestamp with time zone;

-- Add planning PDF storage tracking
CREATE TABLE IF NOT EXISTS public.planning_pdfs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  consulting_month_id uuid REFERENCES public.consulting_months(id) ON DELETE SET NULL,
  work_month_id uuid REFERENCES public.work_months(id) ON DELETE SET NULL,
  pdf_type text NOT NULL, -- 'design', 'social_media', 'consulting', 'traffic'
  file_url text NOT NULL,
  file_name text NOT NULL,
  generated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage planning pdfs"
  ON public.planning_pdfs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage planning pdfs"
  ON public.planning_pdfs FOR ALL
  USING (is_staff(auth.uid()));

CREATE POLICY "Anon can view planning pdfs"
  ON public.planning_pdfs FOR SELECT
  USING (true);

-- Create planning PDFs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('planning-pdfs', 'planning-pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view planning pdfs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'planning-pdfs');

CREATE POLICY "Staff can upload planning pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'planning-pdfs');

-- Trigger for updated_at on commission_rules
CREATE TRIGGER update_commission_rules_updated_at
  BEFORE UPDATE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
