
-- Add goal/advancement fields to agent configs
ALTER TABLE public.crm_agent_configs
  ADD COLUMN IF NOT EXISTS success_criteria text,
  ADD COLUMN IF NOT EXISTS auto_advance_to text,
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS useful_links text,
  ADD COLUMN IF NOT EXISTS send_product_images boolean DEFAULT false;

-- Add context summary to leads for accumulated context
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS context_summary text;
