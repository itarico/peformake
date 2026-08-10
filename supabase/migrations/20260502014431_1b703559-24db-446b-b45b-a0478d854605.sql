ALTER TABLE public.agency_expenses ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT false;
ALTER TABLE public.other_revenues ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT false;