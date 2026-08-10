-- Add show_on_site column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS show_on_site BOOLEAN DEFAULT false;

-- Update the existing policies (usually they cover all columns, but let's be sure)
-- Assuming common policies exist for the clients table.
