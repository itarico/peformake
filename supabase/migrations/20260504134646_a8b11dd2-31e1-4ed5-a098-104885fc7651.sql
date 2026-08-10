-- Add CRM integration columns to sdr_leads
ALTER TABLE public.sdr_leads 
ADD COLUMN IF NOT EXISTS crm_id TEXT,
ADD COLUMN IF NOT EXISTS crm_source TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Create table for CRM settings
CREATE TABLE IF NOT EXISTS public.crm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, 
  api_key TEXT,
  webhook_secret TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

-- Simple policies for now since staff uses custom auth
CREATE POLICY "Public select for authenticated" ON public.crm_settings FOR SELECT USING (true);
CREATE POLICY "Public insert/update for authenticated" ON public.crm_settings FOR ALL USING (true);