
-- 1) Add period and month columns to surveys
ALTER TABLE public.client_satisfaction_surveys
  ADD COLUMN IF NOT EXISTS period text NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS month integer;

ALTER TABLE public.client_satisfaction_surveys
  DROP CONSTRAINT IF EXISTS client_satisfaction_surveys_period_check;
ALTER TABLE public.client_satisfaction_surveys
  ADD CONSTRAINT client_satisfaction_surveys_period_check
  CHECK (period IN ('weekly','monthly'));

-- Replace source check to allow whatsapp_auto
ALTER TABLE public.client_satisfaction_surveys
  DROP CONSTRAINT IF EXISTS client_satisfaction_surveys_source_check;
ALTER TABLE public.client_satisfaction_surveys
  ADD CONSTRAINT client_satisfaction_surveys_source_check
  CHECK (source IN ('public_link','manual','whatsapp_auto'));

-- Drop old unique to allow weekly+monthly per client
ALTER TABLE public.client_satisfaction_surveys
  DROP CONSTRAINT IF EXISTS client_satisfaction_surveys_client_id_year_week_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_css_client_period_weekly
  ON public.client_satisfaction_surveys (client_id, year, week)
  WHERE period = 'weekly';

CREATE UNIQUE INDEX IF NOT EXISTS uq_css_client_period_monthly
  ON public.client_satisfaction_surveys (client_id, year, month)
  WHERE period = 'monthly';

-- 2) Referrals table
CREATE TABLE IF NOT EXISTS public.client_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES public.client_satisfaction_surveys(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  would_recommend boolean,
  referred_name text,
  referred_phone text,
  referred_company text,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage referrals" ON public.client_referrals;
CREATE POLICY "Admins manage referrals" ON public.client_referrals
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Public can submit referral via token" ON public.client_referrals;
CREATE POLICY "Public can submit referral via token" ON public.client_referrals
  FOR INSERT
  WITH CHECK (
    survey_id IN (SELECT id FROM public.client_satisfaction_surveys WHERE responded_at IS NULL OR responded_at IS NOT NULL)
  );

CREATE TRIGGER update_client_referrals_updated_at
  BEFORE UPDATE ON public.client_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
