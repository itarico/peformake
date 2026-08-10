-- Add a secret token for each project to allow external webhook updates
ALTER TABLE public.audiovisual_projects 
ADD COLUMN IF NOT EXISTS webhook_token UUID DEFAULT gen_random_uuid();

-- Create an index for fast lookups
CREATE INDEX IF NOT EXISTS idx_av_projects_webhook_token ON public.audiovisual_projects(webhook_token);
