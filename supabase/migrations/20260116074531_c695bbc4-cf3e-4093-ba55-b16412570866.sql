-- Fix: Create INSERT trigger for consulting months generation
-- The current trigger only fires on UPDATE, not INSERT

-- Drop existing update-only trigger
DROP TRIGGER IF EXISTS generate_consulting_months_on_client_update ON public.clients;

-- Create new function that handles both INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.generate_client_consulting_months()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_date_val DATE := CURRENT_DATE;
  start_year INTEGER := EXTRACT(YEAR FROM current_date_val);
  start_month INTEGER := EXTRACT(MONTH FROM current_date_val);
  i INTEGER;
  calc_year INTEGER;
  calc_month INTEGER;
BEGIN
  -- Handle INSERT: Generate if consulting service is enabled
  IF TG_OP = 'INSERT' THEN
    IF NEW.has_consulting_service = true AND NEW.consulting_months_contracted > 0 THEN
      FOR i IN 0..(NEW.consulting_months_contracted - 1) LOOP
        calc_month := start_month + i;
        calc_year := start_year;
        
        WHILE calc_month > 12 LOOP
          calc_month := calc_month - 12;
          calc_year := calc_year + 1;
        END LOOP;
        
        INSERT INTO public.consulting_months (client_id, year, month)
        VALUES (NEW.id, calc_year, calc_month)
        ON CONFLICT (client_id, year, month) DO NOTHING;
      END LOOP;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE: Generate only if consulting service is being enabled
  IF TG_OP = 'UPDATE' THEN
    IF NEW.has_consulting_service = true AND 
       (OLD.has_consulting_service = false OR OLD.has_consulting_service IS NULL) AND
       NEW.consulting_months_contracted > 0 THEN
      
      FOR i IN 0..(NEW.consulting_months_contracted - 1) LOOP
        calc_month := start_month + i;
        calc_year := start_year;
        
        WHILE calc_month > 12 LOOP
          calc_month := calc_month - 12;
          calc_year := calc_year + 1;
        END LOOP;
        
        INSERT INTO public.consulting_months (client_id, year, month)
        VALUES (NEW.id, calc_year, calc_month)
        ON CONFLICT (client_id, year, month) DO NOTHING;
      END LOOP;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for INSERT
CREATE TRIGGER generate_consulting_months_on_client_insert
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_client_consulting_months();

-- Create trigger for UPDATE
CREATE TRIGGER generate_consulting_months_on_client_update
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_client_consulting_months();