-- Add slug to services if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'services' AND COLUMN_NAME = 'slug') THEN
        ALTER TABLE public.services ADD COLUMN slug TEXT;
    END IF;
END $$;

-- Populate services slugs
UPDATE public.services 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Make it unique and not null
ALTER TABLE public.services ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_slug ON public.services(slug);

-- Add slug to service_packages if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'service_packages' AND COLUMN_NAME = 'slug') THEN
        ALTER TABLE public.service_packages ADD COLUMN slug TEXT;
    END IF;
END $$;

-- Populate service_packages slugs
UPDATE public.service_packages 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Make it unique and not null
ALTER TABLE public.service_packages ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_packages_slug ON public.service_packages(slug);
