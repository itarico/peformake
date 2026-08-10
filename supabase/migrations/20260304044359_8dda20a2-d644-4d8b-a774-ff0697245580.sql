-- Instagram connection columns on existing Meta connections table
ALTER TABLE public.traffic_meta_connections
ADD COLUMN IF NOT EXISTS instagram_business_id text,
ADD COLUMN IF NOT EXISTS instagram_username text,
ADD COLUMN IF NOT EXISTS instagram_connected_at timestamp with time zone;

-- Monthly Instagram KPI table
CREATE TABLE IF NOT EXISTS public.instagram_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  followers_count integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  profile_views integer NOT NULL DEFAULT 0,
  website_clicks integer NOT NULL DEFAULT 0,
  posts_count integer NOT NULL DEFAULT 0,
  synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT instagram_metrics_client_period_unique UNIQUE (client_id, year, month),
  CONSTRAINT instagram_metrics_month_valid CHECK (month BETWEEN 1 AND 12)
);

-- Top Instagram media by month
CREATE TABLE IF NOT EXISTS public.instagram_top_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  media_id_external text NOT NULL,
  media_type text,
  media_url text,
  permalink text,
  thumbnail_url text,
  caption text,
  "timestamp" timestamp with time zone,
  like_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  plays integer NOT NULL DEFAULT 0,
  engagement_total integer NOT NULL DEFAULT 0,
  synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT instagram_top_media_unique UNIQUE (client_id, media_id_external, year, month),
  CONSTRAINT instagram_top_media_month_valid CHECK (month BETWEEN 1 AND 12)
);

CREATE INDEX IF NOT EXISTS idx_instagram_metrics_client_period
  ON public.instagram_metrics (client_id, year DESC, month DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_top_media_client_period
  ON public.instagram_top_media (client_id, year DESC, month DESC, engagement_total DESC);

ALTER TABLE public.instagram_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_top_media ENABLE ROW LEVEL SECURITY;

-- Read for authenticated staff/admin and portal flows that already use anon token routing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='instagram_metrics' AND policyname='Anon can view instagram metrics'
  ) THEN
    CREATE POLICY "Anon can view instagram metrics"
      ON public.instagram_metrics FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='instagram_metrics' AND policyname='Staff can manage instagram metrics'
  ) THEN
    CREATE POLICY "Staff can manage instagram metrics"
      ON public.instagram_metrics FOR ALL USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='instagram_top_media' AND policyname='Anon can view instagram top media'
  ) THEN
    CREATE POLICY "Anon can view instagram top media"
      ON public.instagram_top_media FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='instagram_top_media' AND policyname='Staff can manage instagram top media'
  ) THEN
    CREATE POLICY "Staff can manage instagram top media"
      ON public.instagram_top_media FOR ALL USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
  END IF;
END $$;