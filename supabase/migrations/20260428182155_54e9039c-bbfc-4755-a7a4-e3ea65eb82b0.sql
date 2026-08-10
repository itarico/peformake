CREATE TABLE public.client_satisfaction_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  week INTEGER NOT NULL,
  public_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  score INTEGER CHECK (score >= 0 AND score <= 10),
  category TEXT CHECK (category IN ('promoter','passive','detractor')),
  comment TEXT,
  source TEXT NOT NULL DEFAULT 'public_link' CHECK (source IN ('public_link','manual')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, year, week)
);

CREATE INDEX idx_css_client ON public.client_satisfaction_surveys(client_id);
CREATE INDEX idx_css_week ON public.client_satisfaction_surveys(year, week);
CREATE INDEX idx_css_token ON public.client_satisfaction_surveys(public_token);

ALTER TABLE public.client_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage satisfaction surveys"
ON public.client_satisfaction_surveys
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view by token"
ON public.client_satisfaction_surveys
FOR SELECT
USING (true);

CREATE POLICY "Public can submit response by token"
ON public.client_satisfaction_surveys
FOR UPDATE
USING (responded_at IS NULL)
WITH CHECK (responded_at IS NOT NULL);

CREATE TRIGGER update_css_updated_at
BEFORE UPDATE ON public.client_satisfaction_surveys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();