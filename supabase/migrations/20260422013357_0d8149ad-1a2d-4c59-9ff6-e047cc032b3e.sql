
-- Score consolidado mensal por membro
CREATE TABLE public.ote_monthly_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  role_config_id UUID NOT NULL REFERENCES public.ote_role_configs(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  achievement_percent NUMERIC(7,2) NOT NULL DEFAULT 0,
  fixed_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  variable_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  accelerator_bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'approved', 'paid')),
  calculated_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_member_id, year, month)
);

ALTER TABLE public.ote_monthly_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage ote_monthly_scores"
  ON public.ote_monthly_scores FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read ote_monthly_scores"
  ON public.ote_monthly_scores FOR SELECT TO anon
  USING (true);

CREATE TRIGGER update_ote_monthly_scores_updated_at
  BEFORE UPDATE ON public.ote_monthly_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Score individual por critério
CREATE TABLE public.ote_criteria_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monthly_score_id UUID NOT NULL REFERENCES public.ote_monthly_scores(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.ote_criteria(id) ON DELETE CASCADE,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  target_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  achievement_percent NUMERIC(7,2) NOT NULL DEFAULT 0,
  is_met BOOLEAN NOT NULL DEFAULT false,
  weight_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  weighted_score NUMERIC(7,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (monthly_score_id, criteria_id)
);

ALTER TABLE public.ote_criteria_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage ote_criteria_scores"
  ON public.ote_criteria_scores FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read ote_criteria_scores"
  ON public.ote_criteria_scores FOR SELECT TO anon
  USING (true);

CREATE TRIGGER update_ote_criteria_scores_updated_at
  BEFORE UPDATE ON public.ote_criteria_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
