-- Add new roles to app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'videomaker';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';

-- Add new statuses to audiovisual_status
ALTER TYPE public.audiovisual_status ADD VALUE IF NOT EXISTS 'awaiting_capture';
ALTER TYPE public.audiovisual_status ADD VALUE IF NOT EXISTS 'captured';
ALTER TYPE public.audiovisual_status ADD VALUE IF NOT EXISTS 'in_editing';

-- Update audiovisual_projects table
ALTER TABLE public.audiovisual_projects 
ADD COLUMN IF NOT EXISTS editing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS editing_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS shoot_date DATE,
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS internal_revision_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS leader_revision_count INTEGER DEFAULT 0;

-- Ensure clients has address (common for capturing)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;

-- Create a helper function to calculate time difference in hours/minutes if needed later
CREATE OR REPLACE FUNCTION public.get_editing_duration(project_id UUID)
RETURNS INTERVAL AS $$
DECLARE
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT editing_started_at, editing_completed_at 
    INTO start_time, end_time 
    FROM public.audiovisual_projects 
    WHERE id = project_id;
    
    IF start_time IS NOT NULL AND end_time IS NOT NULL THEN
        RETURN end_time - start_time;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
