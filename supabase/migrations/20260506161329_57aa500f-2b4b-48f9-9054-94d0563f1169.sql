-- Add versioning and last update tracking to audiovisual_projects
ALTER TABLE public.audiovisual_projects 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_assets_update TIMESTAMP WITH TIME ZONE;

-- Update existing records to have a last_assets_update if they have assets
UPDATE public.audiovisual_projects 
SET last_assets_update = updated_at 
WHERE last_assets_update IS NULL AND (finished_assets_url IS NOT NULL OR photos_url IS NOT NULL);
