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
    generated_count INTEGER := 0;
BEGIN
    -- Get configured day (default to 1 if not set)
    SELECT (setting_value->>'day')::INTEGER INTO gen_day 
    FROM public.okr_automation_settings 
    WHERE setting_key = 'monthly_gen_day';
    
    IF gen_day IS NULL THEN gen_day := 1; END IF;
    
    -- If it's not the day, do nothing
    IF current_day != gen_day THEN
        RETURN jsonb_build_object('status', 'skipped', 'reason', 'not_the_configured_day', 'config_day', gen_day, 'today', current_day);
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
    
    -- Trigger the Intelligent RPC
    BEGIN
        SELECT count(*) INTO generated_count FROM public.generate_intelligent_okrs(target_month, target_year);
        
        INSERT INTO public.okr_auto_generation_logs (cycle_month, cycle_year, status)
        VALUES (target_month, target_year, 'success');
        
        RETURN jsonb_build_object('status', 'success', 'target', target_month || '/' || target_year, 'objectives_count', generated_count);
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.okr_auto_generation_logs (cycle_month, cycle_year, status, error_message)
        VALUES (target_month, target_year, 'error', SQLERRM);
        
        RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
    END;
END;
$$;