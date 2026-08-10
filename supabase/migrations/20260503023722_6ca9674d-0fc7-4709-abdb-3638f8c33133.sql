-- Add sync source to key results
ALTER TABLE public.okr_key_results 
ADD COLUMN IF NOT EXISTS auto_sync_source TEXT,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Comment for documentation
COMMENT ON COLUMN public.okr_key_results.auto_sync_source IS 'Source for automatic metric sync: mrr, churn, nps, sla_48h, ote_attainment, new_contracts';

-- Create or update function to calculate objective progress based on KRs
CREATE OR REPLACE FUNCTION public.calculate_objective_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_progress NUMERIC := 0;
    kr_count INTEGER := 0;
    obj_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        obj_id := OLD.objective_id;
    ELSE
        obj_id := NEW.objective_id;
    END IF;

    -- Calculate average progress of all KRs for this objective
    SELECT 
        COALESCE(AVG(
            CASE 
                WHEN (target_value - start_value) = 0 THEN 0
                ELSE LEAST(GREATEST((current_value - start_value) / (target_value - start_value) * 100, 0), 100)
            END
        ), 0),
        COUNT(*)
    INTO total_progress, kr_count
    FROM public.okr_key_results
    WHERE objective_id = obj_id;

    -- Update objective
    UPDATE public.okr_objectives
    SET 
        progress = total_progress,
        updated_at = now(),
        status = CASE WHEN total_progress >= 100 THEN 'completed' ELSE status END
    WHERE id = obj_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for KR updates
DROP TRIGGER IF EXISTS update_objective_progress_trigger ON public.okr_key_results;
CREATE TRIGGER update_objective_progress_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.okr_key_results
FOR EACH ROW EXECUTE FUNCTION public.calculate_objective_progress();
