ALTER TABLE public.designers ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(3,2) DEFAULT 0.40;
ALTER TABLE public.designers ADD COLUMN IF NOT EXISTS is_fixed_model BOOLEAN DEFAULT true;
UPDATE public.designers SET commission_rate = 0.40 WHERE commission_rate IS NULL;
UPDATE public.designers SET is_fixed_model = true WHERE is_fixed_model IS NULL;