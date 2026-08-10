
-- Add whatsapp_lid column to crm_leads for LID-based deduplication
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS whatsapp_lid text;

-- Create unique constraint to prevent duplicate leads per client by LID
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_leads_client_lid 
ON public.crm_leads (client_id, whatsapp_lid) 
WHERE whatsapp_lid IS NOT NULL;

-- Index for fast LID lookups
CREATE INDEX IF NOT EXISTS idx_crm_leads_whatsapp_lid 
ON public.crm_leads (whatsapp_lid) 
WHERE whatsapp_lid IS NOT NULL;
