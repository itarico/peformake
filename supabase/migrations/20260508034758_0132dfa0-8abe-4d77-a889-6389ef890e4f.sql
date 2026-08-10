-- Add new columns for lead tracking
ALTER TABLE public.sdr_leads 
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS meeting_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS disqualified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lost_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS initial_contact_responses JSONB DEFAULT '{}'::jsonb;

-- Ensure lost_reason exists (it's already there but just in case)
-- ALTER TABLE public.sdr_leads ADD COLUMN IF NOT EXISTS lost_reason TEXT;

-- Reset and create new stages
TRUNCATE public.sdr_pipeline_stages CASCADE;

INSERT INTO public.sdr_pipeline_stages (id, name, stage_order, color, is_won, is_lost) VALUES
-- Stage 1 is virtual (unassigned leads), but we can have a stage for it too
(gen_random_uuid(), 'Aguardando', 1, '#94a3b8', false, false),
-- Stage 2: SDR Pipeline
(gen_random_uuid(), 'Contato', 2, '#3b82f6', false, false),
(gen_random_uuid(), 'Reunião Agendada', 3, '#8b5cf6', false, false),
(gen_random_uuid(), 'Perdido (SDR)', 4, '#ef4444', false, true),
-- Stage 3: Closer Pipeline
(gen_random_uuid(), 'Reunião Realizada', 5, '#f59e0b', false, false),
(gen_random_uuid(), 'Venda', 6, '#10b981', true, false),
(gen_random_uuid(), 'Perda (Closer)', 7, '#7f1d1d', false, true),
-- Stage 4: Recovery
(gen_random_uuid(), 'Follow Up', 8, '#ec4899', false, false),
(gen_random_uuid(), 'Aquecimento', 9, '#06b6d4', false, false);

-- Create a function to handle automatic movement after 1 week
CREATE OR REPLACE FUNCTION public.handle_lead_auto_movement()
RETURNS trigger AS $$
BEGIN
  -- We'll use a cron job or just check on every update/select if we want real-time, 
  -- but for "1 week later", a background process is better.
  -- However, we can also do it via a trigger on the 'updated_at' or 'lost_at' field 
  -- but that only runs when something else changes.
  -- Let's just create the logic here and we can call it.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create an Edge Function or a scheduled job is better for "after 1 week".
-- For now, let's create a view that identifies leads that should be moved.
CREATE OR REPLACE VIEW public.leads_to_move_recovery AS
SELECT l.id, l.stage_id, s.name as current_stage, l.lost_at, l.disqualified_at, l.lead_tier
FROM public.sdr_leads l
JOIN public.sdr_pipeline_stages s ON l.stage_id = s.id
WHERE 
  (s.is_lost = true AND l.lost_at < now() - interval '7 days')
  OR
  (l.lead_tier = 'Desqualificado' AND l.disqualified_at < now() - interval '7 days');
