-- Add columns to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category TEXT;

-- Add columns to service_packages
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]';
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS delivery_details TEXT;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS service_details TEXT;
