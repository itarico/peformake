-- Add webhook_secret column
ALTER TABLE public.crm_whatsapp_connections ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Update existing connections with a random secret if they don't have one
UPDATE public.crm_whatsapp_connections 
SET webhook_secret = md5(random()::text) 
WHERE webhook_secret IS NULL;

-- Comment on column for clarity
COMMENT ON COLUMN public.crm_whatsapp_connections.webhook_secret IS 'Secret key provided to Wasender for webhook authentication verification.';
