
-- Client logos for the landing page
CREATE TABLE public.landing_client_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.landing_client_logos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active logos" ON public.landing_client_logos FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated can manage logos" ON public.landing_client_logos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Landing testimonials
CREATE TABLE public.landing_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  text text NOT NULL,
  photo_url text,
  rating integer DEFAULT 5,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.landing_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active testimonials" ON public.landing_testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated can manage testimonials" ON public.landing_testimonials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Landing portfolio cases
CREATE TABLE public.landing_portfolio_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  before_text text NOT NULL,
  process_text text NOT NULL,
  after_text text NOT NULL,
  metric_value text NOT NULL,
  metric_label text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.landing_portfolio_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active cases" ON public.landing_portfolio_cases FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated can manage cases" ON public.landing_portfolio_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Landing stats
CREATE TABLE public.landing_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL,
  label text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.landing_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active stats" ON public.landing_stats FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated can manage stats" ON public.landing_stats FOR ALL TO authenticated USING (true) WITH CHECK (true);
