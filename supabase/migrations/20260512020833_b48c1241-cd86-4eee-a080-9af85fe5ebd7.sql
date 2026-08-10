-- Update services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS delivery_details TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS service_details TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'monthly';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS contract_duration INTEGER;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS setup_fee NUMERIC DEFAULT 0;

-- Update service_packages table
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'monthly';
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS contract_duration INTEGER;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS setup_fee NUMERIC DEFAULT 0;

-- Remove unique constraint on client_services to allow multiple packages
ALTER TABLE public.client_services DROP CONSTRAINT IF EXISTS client_services_client_id_service_id_key;

-- Add comments for documentation
COMMENT ON COLUMN public.services.pricing_model IS 'Type of pricing: single, monthly, tcv';
COMMENT ON COLUMN public.service_packages.pricing_model IS 'Type of pricing: single, monthly, tcv';
