
-- Table for per-client quote page configuration
CREATE TABLE public.crm_quote_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL DEFAULT 'Peformake',
  tagline TEXT DEFAULT 'Agência de Marketing Digital',
  logo_url TEXT,
  brand_color TEXT DEFAULT '#6366f1',
  accent_color TEXT DEFAULT '#8b5cf6',
  footer_text TEXT DEFAULT 'Documento gerado automaticamente',
  cover_image_url TEXT,
  show_catalog_images BOOLEAN DEFAULT true,
  persuasion_texts JSONB DEFAULT '[]'::jsonb,
  social_proof_text TEXT,
  niche_icon TEXT,
  custom_css TEXT,
  pdf_header_text TEXT,
  pdf_footer_text TEXT,
  cta_text TEXT DEFAULT 'Aceitar Proposta',
  whatsapp_auto_send BOOLEAN DEFAULT true,
  valid_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.crm_quote_configs ENABLE ROW LEVEL SECURITY;

-- Public read for quote pages
CREATE POLICY "Anyone can view quote configs" ON public.crm_quote_configs FOR SELECT USING (true);

-- Staff can manage via service role (edge functions)
CREATE POLICY "Authenticated users can manage quote configs" ON public.crm_quote_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add lead_segment to crm_quotes if not exists
ALTER TABLE public.crm_quotes ADD COLUMN IF NOT EXISTS lead_segment TEXT;
ALTER TABLE public.crm_quotes ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

-- Trigger for updated_at
CREATE TRIGGER update_crm_quote_configs_updated_at
  BEFORE UPDATE ON public.crm_quote_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
