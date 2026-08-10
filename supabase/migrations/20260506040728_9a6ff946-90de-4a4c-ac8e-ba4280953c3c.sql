-- Table for service production configuration
CREATE TABLE IF NOT EXISTS public.client_service_production_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL, -- e.g., 'video_production', 'planning_scripting', etc.
    target_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(client_id, service_type)
);

-- Enable RLS
ALTER TABLE public.client_service_production_configs ENABLE ROW LEVEL SECURITY;

-- Policies for client_service_production_configs
CREATE POLICY "Public Manage Service Configs" ON public.client_service_production_configs
    FOR ALL USING (true) WITH CHECK (true);

-- Ensure staff_squads and staff_squad_members have explicit policies
-- (Removing and recreating for clarity)
DROP POLICY IF EXISTS "Public Manage Squads" ON public.staff_squads;
CREATE POLICY "Public Manage Squads" ON public.staff_squads
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Manage Squad Members" ON public.staff_squad_members;
CREATE POLICY "Public Manage Squad Members" ON public.staff_squad_members
    FOR ALL USING (true) WITH CHECK (true);

-- Ensure staff_activity_sessions has public manage policy
DROP POLICY IF EXISTS "Public Manage Activity Sessions" ON public.staff_activity_sessions;
CREATE POLICY "Public Manage Activity Sessions" ON public.staff_activity_sessions
    FOR ALL USING (true) WITH CHECK (true);

-- Add column for better month/year tracking if missing in activity sessions
-- Actually, it uses start_time/end_time which is enough.

-- Update function for timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_service_production_configs_updated_at
    BEFORE UPDATE ON public.client_service_production_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
