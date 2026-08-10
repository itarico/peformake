
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read site_settings"
ON public.site_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert site_settings"
ON public.site_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update site_settings"
ON public.site_settings FOR UPDATE TO authenticated USING (true);

-- Public read for pixel/analytics injection on public site
CREATE POLICY "Public can read site_settings"
ON public.site_settings FOR SELECT TO anon USING (true);

-- Seed default keys
INSERT INTO public.site_settings (key, value) VALUES
  ('meta_pixel_id', ''),
  ('google_analytics_id', '')
ON CONFLICT (key) DO NOTHING;
