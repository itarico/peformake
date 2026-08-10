
-- Tabela de cases de sucesso / portfólio
CREATE TABLE public.portfolio_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  logo_url TEXT,
  niche TEXT,
  service_tags TEXT[] DEFAULT '{}',
  title TEXT NOT NULL,
  description TEXT,
  metrics JSONB DEFAULT '{}',
  image_urls TEXT[] DEFAULT '{}',
  video_urls TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolio_cases ENABLE ROW LEVEL SECURITY;

-- Public read for website display
CREATE POLICY "Portfolio cases are publicly readable"
  ON public.portfolio_cases FOR SELECT
  USING (is_active = true);

-- Staff can manage (using service role via edge functions or anon for public read)
CREATE POLICY "Authenticated users can manage portfolio cases"
  ON public.portfolio_cases FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Timestamp trigger
CREATE TRIGGER update_portfolio_cases_updated_at
  BEFORE UPDATE ON public.portfolio_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for niche filtering
CREATE INDEX idx_portfolio_cases_niche ON public.portfolio_cases(niche);
CREATE INDEX idx_portfolio_cases_service_tags ON public.portfolio_cases USING GIN(service_tags);

-- Storage bucket for portfolio media
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-media', 'portfolio-media', true);

CREATE POLICY "Portfolio media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-media');

CREATE POLICY "Anyone can upload portfolio media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'portfolio-media');

CREATE POLICY "Anyone can update portfolio media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'portfolio-media');

CREATE POLICY "Anyone can delete portfolio media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'portfolio-media');
