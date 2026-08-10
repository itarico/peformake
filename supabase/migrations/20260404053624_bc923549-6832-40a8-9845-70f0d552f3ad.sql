ALTER TABLE public.notification_email_settings
ADD COLUMN IF NOT EXISTS excluded_client_ids uuid[] DEFAULT '{}';