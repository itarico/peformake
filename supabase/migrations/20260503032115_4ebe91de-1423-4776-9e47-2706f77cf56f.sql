-- Add new columns to okr_initiatives for AI suggestions
ALTER TABLE public.okr_initiatives 
ADD COLUMN IF NOT EXISTS justification TEXT,
ADD COLUMN IF NOT EXISTS impact TEXT,
ADD COLUMN IF NOT EXISTS measurement_method TEXT,
ADD COLUMN IF NOT EXISTS suggestion_status TEXT DEFAULT 'approved'; -- pending, approved, discarded

-- Update existing initiatives to be 'approved'
UPDATE public.okr_initiatives SET suggestion_status = 'approved' WHERE suggestion_status IS NULL;

-- Create table for automation settings
CREATE TABLE IF NOT EXISTS public.okr_automation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.okr_automation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view and manage automation settings" 
ON public.okr_automation_settings 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.staff_members WHERE id = auth.uid()));

-- Insert default generation day (e.g., day 1 of the month)
INSERT INTO public.okr_automation_settings (setting_key, setting_value)
VALUES ('monthly_gen_day', '{"day": 1}')
ON CONFLICT (setting_key) DO NOTHING;

-- Enhanced RPC for auto-generation that respects client active status and templates
CREATE OR REPLACE FUNCTION public.auto_generate_monthly_okrs_v2(target_month integer, target_year integer)
RETURNS void AS $$
DECLARE
    client_rec RECORD;
    template_obj RECORD;
    template_kr RECORD;
    new_obj_id UUID;
BEGIN
    -- Loop through active clients with consulting service
    FOR client_rec IN 
        SELECT id, name FROM public.clients 
        WHERE is_active = true AND has_consulting_service = true
    LOOP
        -- Check if OKRs already exist for this client and period
        IF NOT EXISTS (
            SELECT 1 FROM public.okr_objectives 
            WHERE client_id = client_rec.id 
            AND cycle_month = target_month 
            AND cycle_year = target_year
        ) THEN
            -- Find templates (Objectives with is_template = true)
            FOR template_obj IN 
                SELECT * FROM public.okr_objectives WHERE is_template = true AND level = 'client'
            LOOP
                -- Create new objective for client
                INSERT INTO public.okr_objectives (
                    title, description, level, cycle_month, cycle_year, 
                    client_id, is_client_visible, status, progress
                ) VALUES (
                    template_obj.title, template_obj.description, 'client', target_month, target_year,
                    client_rec.id, true, 'active', 0
                ) RETURNING id INTO new_obj_id;

                -- Copy KRs from template
                INSERT INTO public.okr_key_results (
                    objective_id, title, metric_unit, start_value, current_value, 
                    target_value, weight, is_automated, metric_category
                )
                SELECT 
                    new_obj_id, title, metric_unit, start_value, start_value,
                    target_value, weight, is_automated, metric_category
                FROM public.okr_key_results
                WHERE objective_id = template_obj.id;
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
