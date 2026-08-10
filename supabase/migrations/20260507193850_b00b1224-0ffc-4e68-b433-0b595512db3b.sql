-- Create table for AI-prospected leads
CREATE TABLE IF NOT EXISTS public.sdr_ai_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    niche TEXT,
    segmentation TEXT,
    location TEXT,
    address TEXT,
    ceo_name TEXT,
    company_instagram TEXT,
    personal_instagram TEXT,
    phone TEXT,
    email TEXT,
    qualification_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new', -- new, imported, discarded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sdr_ai_leads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for authenticated users" ON public.sdr_ai_leads
    FOR ALL USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sdr_ai_leads_updated_at
    BEFORE UPDATE ON public.sdr_ai_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();