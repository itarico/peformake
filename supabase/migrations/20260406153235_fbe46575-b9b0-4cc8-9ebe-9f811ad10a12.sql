
-- Create quotes table
CREATE TABLE public.crm_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  lead_name TEXT NOT NULL,
  lead_email TEXT,
  lead_phone TEXT,
  lead_segment TEXT,
  title TEXT NOT NULL DEFAULT 'Proposta Comercial',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_value NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_value NUMERIC DEFAULT 0,
  final_value NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '10 days'),
  status TEXT NOT NULL DEFAULT 'draft',
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_quotes ENABLE ROW LEVEL SECURITY;

-- Public read by code (for the quote page)
CREATE POLICY "Anyone can view quotes by code"
  ON public.crm_quotes FOR SELECT
  USING (true);

-- Service role can do everything (edge functions / internal)
CREATE POLICY "Service role full access"
  ON public.crm_quotes FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookup by code
CREATE INDEX idx_crm_quotes_code ON public.crm_quotes (code);

-- Auto-update timestamps
CREATE TRIGGER update_crm_quotes_updated_at
  BEFORE UPDATE ON public.crm_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generate sequential code function
CREATE OR REPLACE FUNCTION public.generate_quote_code()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'PFMK-' || LPAD((COALESCE(
    (SELECT COUNT(*) + 1 FROM public.crm_quotes), 1
  ))::TEXT, 4, '0')
$$;
