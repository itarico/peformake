-- Function to calculate Objective progress based on weighted Key Results
CREATE OR REPLACE FUNCTION calculate_objective_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_weight NUMERIC;
    weighted_sum NUMERIC;
BEGIN
    -- Calculate total weight and weighted progress for the objective
    SELECT 
        SUM(weight),
        SUM(
            CASE 
                WHEN (target_value - start_value) = 0 THEN 0
                ELSE LEAST(GREATEST(((current_value - start_value) / (target_value - start_value)) * 100, 0), 100) * weight
            END
        )
    INTO total_weight, weighted_sum
    FROM public.okr_key_results
    WHERE objective_id = COALESCE(NEW.objective_id, OLD.objective_id);

    -- Update objective progress
    IF total_weight > 0 THEN
        UPDATE public.okr_objectives
        SET progress = weighted_sum / total_weight,
            updated_at = now()
        WHERE id = COALESCE(NEW.objective_id, OLD.objective_id);
    ELSE
        UPDATE public.okr_objectives
        SET progress = 0,
            updated_at = now()
        WHERE id = COALESCE(NEW.objective_id, OLD.objective_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update progress when a Key Result changes
DROP TRIGGER IF EXISTS update_okr_progress_on_kr_change ON public.okr_key_results;
CREATE TRIGGER update_okr_progress_on_kr_change
AFTER INSERT OR UPDATE OR DELETE ON public.okr_key_results
FOR EACH ROW EXECUTE FUNCTION calculate_objective_progress();

-- Function to auto-generate monthly OKRs for all active clients from templates
CREATE OR REPLACE FUNCTION auto_generate_monthly_okrs(target_month INTEGER, target_year INTEGER)
RETURNS VOID AS $$
DECLARE
    template_record RECORD;
    new_obj_id UUID;
    client_record RECORD;
BEGIN
    -- For each active client
    FOR client_record IN SELECT id FROM public.clients WHERE status = 'active' LOOP
        -- Find templates
        FOR template_record IN 
            SELECT * FROM public.okr_objectives 
            WHERE is_template = true AND status = 'active'
        LOOP
            -- Check if already exists for this client, month, and year
            IF NOT EXISTS (
                SELECT 1 FROM public.okr_objectives 
                WHERE client_id = client_record.id 
                AND cycle_month = target_month 
                AND cycle_year = target_year
                AND title = template_record.title
            ) THEN
                -- Insert new objective
                INSERT INTO public.okr_objectives (
                    title, description, cycle_month, cycle_year, status, progress, client_id, is_client_visible
                ) VALUES (
                    template_record.title, template_record.description, target_month, target_year, 'active', 0, client_record.id, true
                ) RETURNING id INTO new_obj_id;

                -- Clone Key Results from template
                INSERT INTO public.okr_key_results (
                    objective_id, title, metric_unit, start_value, current_value, target_value, weight, auto_sync_source
                )
                SELECT 
                    new_obj_id, title, metric_unit, start_value, start_value, target_value, weight, auto_sync_source
                FROM public.okr_key_results
                WHERE objective_id = template_record.id;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Table for AI suggestions cache
CREATE TABLE IF NOT EXISTS public.okr_suggestions_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_type TEXT NOT NULL, -- 'objective' or 'key_result'
    context_id UUID NOT NULL,
    suggestions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.okr_suggestions_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read suggestions" ON public.okr_suggestions_cache FOR SELECT USING (true);

-- Ensure sync logs are comprehensive
ALTER TABLE public.okr_sync_logs ADD COLUMN IF NOT EXISTS details JSONB;
