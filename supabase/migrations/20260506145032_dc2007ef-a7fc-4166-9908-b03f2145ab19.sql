-- Add new columns for raw and finished links
ALTER TABLE public.audiovisual_projects 
ADD COLUMN IF NOT EXISTS raw_video_url TEXT,
ADD COLUMN IF NOT EXISTS finished_assets_url TEXT;

-- Add videographer_id
ALTER TABLE public.audiovisual_projects
ADD COLUMN IF NOT EXISTS videographer_id UUID REFERENCES public.staff_members(id);

-- Update staff roles if they exist as an enum, otherwise we'll just use text.
-- Checking if staff_role enum exists (common pattern in this project)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
        ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'videographer';
        ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'editor';
    END IF;
END $$;

-- Ensure indexes for better performance
CREATE INDEX IF NOT EXISTS idx_av_projects_client_id ON public.audiovisual_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_av_projects_month_year ON public.audiovisual_projects(month, year);
