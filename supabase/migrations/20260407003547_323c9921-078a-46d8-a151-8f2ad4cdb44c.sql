-- Add birthday to crm_leads
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS birthday DATE;

-- Add gastronomy page support to crm_quotes
ALTER TABLE public.crm_quotes ADD COLUMN IF NOT EXISTS page_type TEXT NOT NULL DEFAULT 'quote';

-- Add gastronomy config fields to crm_quote_configs
ALTER TABLE public.crm_quote_configs ADD COLUMN IF NOT EXISTS reward_text TEXT;
ALTER TABLE public.crm_quote_configs ADD COLUMN IF NOT EXISTS whatsapp_redirect_number TEXT;
ALTER TABLE public.crm_quote_configs ADD COLUMN IF NOT EXISTS page_type TEXT NOT NULL DEFAULT 'quote';