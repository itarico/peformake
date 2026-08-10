ALTER TABLE public.audiovisual_projects ADD COLUMN IF NOT EXISTS photos_url TEXT;

-- Index for performance on monthly queries
CREATE INDEX IF NOT EXISTS idx_av_projects_month_year ON public.audiovisual_projects(month, year);
