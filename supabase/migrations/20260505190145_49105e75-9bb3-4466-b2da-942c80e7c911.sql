ALTER TABLE public.team_production_logs ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

COMMENT ON COLUMN public.team_production_logs.duration_minutes IS 'Time spent in minutes for manual/external production logs.';