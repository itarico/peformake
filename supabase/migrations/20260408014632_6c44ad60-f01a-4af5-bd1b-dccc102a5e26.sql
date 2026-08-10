ALTER TABLE public.crm_quote_configs 
ADD COLUMN IF NOT EXISTS enable_lead_form boolean NOT NULL DEFAULT false;