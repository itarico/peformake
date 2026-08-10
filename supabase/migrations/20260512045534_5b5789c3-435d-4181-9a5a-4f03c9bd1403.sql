-- Add visibility control to service_packages if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_packages' AND column_name='show_in_catalog') THEN
        ALTER TABLE public.service_packages ADD COLUMN show_in_catalog BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add visibility control to services if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='show_in_catalog') THEN
        ALTER TABLE public.services ADD COLUMN show_in_catalog BOOLEAN DEFAULT true;
    END IF;
END $$;
