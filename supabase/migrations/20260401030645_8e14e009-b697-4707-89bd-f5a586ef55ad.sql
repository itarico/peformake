ALTER TABLE public.quiz_leads 
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS ai_diagnostic text,
  ADD COLUMN IF NOT EXISTS wants_callback boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_callback_time text;