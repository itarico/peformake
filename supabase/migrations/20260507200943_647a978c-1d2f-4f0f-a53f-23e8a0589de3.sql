-- Create SDR activity logs table
CREATE TABLE IF NOT EXISTS public.sdr_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sdr_staff_id UUID REFERENCES public.profiles(id),
    lead_id UUID REFERENCES public.sdr_leads(id),
    activity_type TEXT NOT NULL, -- 'call_scheduled', 'call_made', 'message_sent', 'qualification_update'
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Playbook Audit table
CREATE TABLE IF NOT EXISTS public.sdr_playbook_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.sdr_leads(id),
    sdr_staff_id UUID REFERENCES public.profiles(id),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    adherence_rate NUMERIC(5,2),
    feedback TEXT,
    items_checked JSONB DEFAULT '[]'::jsonb, -- [{label: 'Usou script correto', ok: true}, ...]
    ai_analysis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sdr_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_playbook_audits ENABLE ROW LEVEL SECURITY;

-- Simple policies (assuming admin/staff roles or user_id check)
CREATE POLICY "Enable read for authenticated users" ON public.sdr_activity_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.sdr_activity_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read for sdr_playbook_audits" ON public.sdr_playbook_audits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for sdr_playbook_audits" ON public.sdr_playbook_audits FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function to update updated_at if needed (standard)
-- (Already exists usually, but good practice)
