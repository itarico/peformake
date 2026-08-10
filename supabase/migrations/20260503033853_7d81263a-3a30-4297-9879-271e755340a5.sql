-- Enhance sync logs
ALTER TABLE public.okr_sync_logs 
ADD COLUMN IF NOT EXISTS metric_category TEXT,
ADD COLUMN IF NOT EXISTS validation_errors JSONB;

-- Track automatic generation to avoid duplicates
CREATE TABLE IF NOT EXISTS public.okr_auto_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_month INTEGER NOT NULL,
    cycle_year INTEGER NOT NULL,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure RLS on logs
ALTER TABLE public.okr_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_auto_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated users on sync logs" 
ON public.okr_sync_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users on gen logs" 
ON public.okr_auto_generation_logs FOR SELECT TO authenticated USING (true);

-- Function to check and trigger generation (called by edge function)
CREATE OR REPLACE FUNCTION public.check_okr_auto_generation_trigger(current_day INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    gen_day INTEGER;
    target_month INTEGER;
    target_year INTEGER;
    already_done BOOLEAN;
    result JSONB;
BEGIN
    -- Get configured day (default to 1 if not set)
    SELECT (setting_value->>'day')::INTEGER INTO gen_day 
    FROM public.okr_automation_settings 
    WHERE setting_key = 'monthly_gen_day';
    
    IF gen_day IS NULL THEN gen_day := 1; END IF;
    
    -- If it's not the day, do nothing
    IF current_day != gen_day THEN
        RETURN jsonb_build_object('status', 'skipped', 'reason', 'not_the_configured_day');
    END IF;
    
    -- Target is next month
    target_month := EXTRACT(MONTH FROM (now() + interval '1 month'));
    target_year := EXTRACT(YEAR FROM (now() + interval '1 month'));
    
    -- Check if already done for this target
    SELECT EXISTS (
        SELECT 1 FROM public.okr_auto_generation_logs 
        WHERE cycle_month = target_month AND cycle_year = target_year AND status = 'success'
    ) INTO already_done;
    
    IF already_done THEN
        RETURN jsonb_build_object('status', 'skipped', 'reason', 'already_generated_for_target');
    END IF;
    
    -- Trigger the RPC (assuming it exists from previous steps)
    BEGIN
        PERFORM public.auto_generate_monthly_okrs_v2(target_month, target_year);
        
        INSERT INTO public.okr_auto_generation_logs (cycle_month, cycle_year, status)
        VALUES (target_month, target_year, 'success');
        
        RETURN jsonb_build_object('status', 'success', 'target', target_month || '/' || target_year);
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.okr_auto_generation_logs (cycle_month, cycle_year, status, error_message)
        VALUES (target_month, target_year, 'error', SQLERRM);
        
        RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
    END;
END;
$$;