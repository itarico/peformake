
-- Table to track Custom Audiences created from CRM leads
CREATE TABLE public.traffic_custom_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  audience_id_external text NOT NULL,
  name text NOT NULL,
  description text,
  audience_type text NOT NULL DEFAULT 'custom', -- 'custom' or 'lookalike'
  source_audience_id uuid REFERENCES public.traffic_custom_audiences(id),
  lead_count integer DEFAULT 0,
  lookalike_country text,
  lookalike_ratio numeric,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.traffic_custom_audiences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin can manage custom audiences"
  ON public.traffic_custom_audiences FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view custom audiences"
  ON public.traffic_custom_audiences FOR SELECT
  USING (is_staff(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_traffic_custom_audiences_updated_at
  BEFORE UPDATE ON public.traffic_custom_audiences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
