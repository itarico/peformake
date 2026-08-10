-- CRM/Sales Integration
CREATE TABLE IF NOT EXISTS public.sales_leads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'new', -- new, contact, qualified, proposal, closed, lost
    estimated_value DECIMAL,
    source TEXT, -- indication, google, instagram, etc
    last_contact_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Automation Tracking
CREATE TABLE IF NOT EXISTS public.automated_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, running, completed, failed
    last_run_at TIMESTAMP WITH TIME ZONE,
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users on sales_leads" ON public.sales_leads FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users on automated_tasks" ON public.automated_tasks FOR ALL TO authenticated USING (true);
