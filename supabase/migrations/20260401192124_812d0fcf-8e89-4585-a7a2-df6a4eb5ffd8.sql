
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS notification_email text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notification_email text;
