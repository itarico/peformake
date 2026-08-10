-- Adiciona a coluna lead_tier à tabela sdr_leads
ALTER TABLE public.sdr_leads 
ADD COLUMN IF NOT EXISTS lead_tier TEXT DEFAULT 'Outro' CHECK (lead_tier IN ('A', 'B', 'C', 'Outro'));

-- Cria um índice para facilitar a filtragem por tier
CREATE INDEX IF NOT EXISTS idx_sdr_leads_tier ON public.sdr_leads(lead_tier);