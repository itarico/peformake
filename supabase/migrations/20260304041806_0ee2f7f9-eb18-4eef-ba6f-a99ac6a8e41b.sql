
-- Add month/year to planning_pdfs if not exists
ALTER TABLE public.planning_pdfs ADD COLUMN IF NOT EXISTS month integer;
ALTER TABLE public.planning_pdfs ADD COLUMN IF NOT EXISTS year integer;
