-- Add columns to crm_leads for meeting tracking
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS meeting_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS meeting_status TEXT DEFAULT 'none';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_meeting_status ON public.crm_leads(meeting_status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_meeting_date ON public.crm_leads(meeting_date);

-- Update status options in comment for reference (not strictly required by DB but good for docs)
COMMENT ON COLUMN public.crm_leads.status IS 'Stages: new, interested, negotiating, qualified, meeting_scheduled, show_up, no_show, sale_completed, sale_lost, unqualified';

-- Ensure we have some default roles if not exists
-- (Assuming role_label is used for this)
UPDATE public.crm_team_members SET role_label = 'Closer' WHERE role_label = 'vendedor' AND id IN (SELECT id FROM public.crm_team_members LIMIT 1);
