ALTER TABLE public.audiovisual_projects
  ADD COLUMN IF NOT EXISTS shoot_end_time text,
  ADD COLUMN IF NOT EXISTS google_event_link text,
  ADD COLUMN IF NOT EXISTS shoot_notes text;