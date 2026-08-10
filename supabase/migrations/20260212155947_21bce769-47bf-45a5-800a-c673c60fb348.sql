
ALTER TABLE public.traffic_campaigns
  ADD COLUMN IF NOT EXISTS leads integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_started integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS landing_page_views integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS link_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_lead numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_rate numeric DEFAULT 0;
