-- Adicionar campos de contexto do negócio na tabela clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_segment TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS target_audience TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.clients.business_description IS 'Descrição detalhada do negócio do cliente para contexto da IA';
COMMENT ON COLUMN public.clients.business_segment IS 'Segmento/nicho de mercado do cliente';
COMMENT ON COLUMN public.clients.target_audience IS 'Público-alvo do cliente';