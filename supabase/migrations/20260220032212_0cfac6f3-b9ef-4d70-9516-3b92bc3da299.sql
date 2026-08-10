ALTER TABLE public.notification_email_settings 
ADD COLUMN IF NOT EXISTS agency_whatsapp_session_id text,
ADD COLUMN IF NOT EXISTS agency_whatsapp_api_key text;