
-- Add meta_ad_account_id to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS meta_ad_account_id text;

-- Create traffic_campaigns table
CREATE TABLE public.traffic_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  platform text NOT NULL DEFAULT 'meta_ads',
  campaign_id_external text,
  campaign_name text,
  objective text,
  status text DEFAULT 'active',
  investment numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  revenue_generated numeric DEFAULT 0,
  reach integer DEFAULT 0,
  frequency numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  cpm numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cost_per_conversion numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  synced_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, campaign_id_external, year, month)
);

-- Enable RLS
ALTER TABLE public.traffic_campaigns ENABLE ROW LEVEL SECURITY;

-- Staff can manage all traffic campaigns
CREATE POLICY "Staff can manage traffic campaigns"
  ON public.traffic_campaigns
  FOR ALL
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

-- Admin can manage traffic campaigns
CREATE POLICY "Admin can manage traffic campaigns"
  ON public.traffic_campaigns
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Portal (anon) can view traffic campaigns for their client
CREATE POLICY "Anon can view traffic campaigns"
  ON public.traffic_campaigns
  FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_traffic_campaigns_updated_at
  BEFORE UPDATE ON public.traffic_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
