-- 1. Add weight to Key Results
ALTER TABLE public.okr_key_results ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1.0;

-- 2. Create History Table
CREATE TABLE IF NOT EXISTS public.okr_key_result_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_result_id UUID REFERENCES public.okr_key_results(id) ON DELETE CASCADE,
    value NUMERIC NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create Sync Logs Table
CREATE TABLE IF NOT EXISTS public.okr_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_result_id UUID REFERENCES public.okr_key_results(id) ON DELETE CASCADE,
    old_value NUMERIC,
    new_value NUMERIC,
    source TEXT NOT NULL, -- 'manual', 'auto'
    rule_name TEXT,       -- e.g. 'mrr_sync', 'churn_sync'
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create Monthly Reports Table
CREATE TABLE IF NOT EXISTS public.okr_monthly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_month INTEGER,
    cycle_year INTEGER NOT NULL,
    cycle_quarter INTEGER,
    summary TEXT,
    goals_met JSONB DEFAULT '[]',
    deviations JSONB DEFAULT '[]',
    recommendations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create Alerts Table
CREATE TABLE IF NOT EXISTS public.okr_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_result_id UUID REFERENCES public.okr_key_results(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'at_risk', 'behind_schedule', 'stalled'
    message TEXT,
    is_resolved BOOLEAN DEFAULT false,
    severity TEXT DEFAULT 'warning',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Function to calculate Objective Progress with Weights
CREATE OR REPLACE FUNCTION public.calculate_objective_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_objective_id UUID;
    v_total_weight NUMERIC;
    v_weighted_progress NUMERIC;
BEGIN
    -- Determine the objective_id
    IF TG_OP = 'DELETE' THEN
        v_objective_id := OLD.objective_id;
    ELSE
        v_objective_id := NEW.objective_id;
    END IF;

    -- Calculate total weight and weighted progress
    -- KR Progress = (current - start) / (target - start)
    SELECT 
        COALESCE(SUM(weight), 0),
        COALESCE(SUM(
            CASE 
                WHEN (target_value - start_value) = 0 THEN 0
                ELSE ((current_value - start_value) / (target_value - start_value)) * weight
            END
        ), 0)
    INTO v_total_weight, v_weighted_progress
    FROM public.okr_key_results
    WHERE objective_id = v_objective_id;

    -- Update objective
    UPDATE public.okr_objectives
    SET progress = CASE 
        WHEN v_total_weight = 0 THEN 0 
        ELSE LEAST(GREATEST((v_weighted_progress / v_total_weight) * 100, 0), 100)
    END,
    updated_at = now()
    WHERE id = v_objective_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger for Objective Progress
DROP TRIGGER IF EXISTS tr_update_objective_progress ON public.okr_key_results;
CREATE TRIGGER tr_update_objective_progress
AFTER INSERT OR UPDATE OR DELETE ON public.okr_key_results
FOR EACH ROW EXECUTE FUNCTION public.calculate_objective_progress();

-- 8. Function to Log KR History and Check Alerts
CREATE OR REPLACE FUNCTION public.on_kr_value_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if value actually changed
    IF (OLD.current_value IS DISTINCT FROM NEW.current_value) THEN
        -- Add to history
        INSERT INTO public.okr_key_result_history (key_result_id, value)
        VALUES (NEW.id, NEW.current_value);

        -- Automated Alert Logic (Simple example: if confidence is low)
        IF NEW.confidence_level <= 3 THEN
            INSERT INTO public.okr_alerts (key_result_id, type, message, severity)
            VALUES (NEW.id, 'at_risk', 'Baixa confiança reportada para este KR.', 'danger');
        END IF;

        -- Alert if progress is behind (optional, can be expanded)
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger for KR History
DROP TRIGGER IF EXISTS tr_on_kr_value_change ON public.okr_key_results;
CREATE TRIGGER tr_on_kr_value_change
AFTER UPDATE ON public.okr_key_results
FOR EACH ROW EXECUTE FUNCTION public.on_kr_value_change();

-- 10. Enable RLS and set policies
ALTER TABLE public.okr_key_result_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to history for staff" ON public.okr_key_result_history FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all access to sync logs for staff" ON public.okr_sync_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all access to monthly reports for staff" ON public.okr_monthly_reports FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all access to alerts for staff" ON public.okr_alerts FOR ALL TO authenticated USING (true);
