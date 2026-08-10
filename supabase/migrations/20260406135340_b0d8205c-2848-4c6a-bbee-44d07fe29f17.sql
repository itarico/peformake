
ALTER TABLE public.crm_agent_configs
  ADD COLUMN IF NOT EXISTS activation_mode text NOT NULL DEFAULT 'always_on',
  ADD COLUMN IF NOT EXISTS activation_keywords text,
  ADD COLUMN IF NOT EXISTS human_takeover_minutes integer NOT NULL DEFAULT 30;
