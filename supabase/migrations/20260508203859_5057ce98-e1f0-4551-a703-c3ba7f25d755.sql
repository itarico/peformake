-- First, let's ensure we have a good structure for squad roles if we want to store them explicitly
-- For now, we will use the existing staff_squad_members table and add a role column if it doesn't exist, 
-- but looking at common patterns, we can just use the job_title from staff_members or assign them specifically in the squad.

-- Let's check if we need to add columns to staff_squads for the new metrics
ALTER TABLE public.staff_squads ADD COLUMN IF NOT EXISTS delivery_progress NUMERIC DEFAULT 0;
ALTER TABLE public.staff_squads ADD COLUMN IF NOT EXISTS avg_client_tax NUMERIC DEFAULT 0;

-- Function to calculate squad metrics
CREATE OR REPLACE FUNCTION public.update_squad_metrics()
RETURNS void AS $$
DECLARE
    s_record RECORD;
    total_clients INTEGER;
    completed_services INTEGER;
    progress_val NUMERIC;
BEGIN
    FOR s_record IN SELECT id FROM public.staff_squads LOOP
        -- Count clients in this squad
        SELECT count(*) INTO total_clients FROM public.clients WHERE squad_id = s_record.id AND is_active = true;
        
        -- Calculate completion rate of arts/tasks for the current month for these clients
        -- This is a simplified proxy for "delivery progress"
        WITH current_month_arts AS (
            SELECT a.status 
            FROM public.arts a
            JOIN public.work_months wm ON a.work_month_id = wm.id
            JOIN public.clients c ON wm.client_id = c.id
            WHERE c.squad_id = s_record.id
            AND wm.month = extract(month from now())
            AND wm.year = extract(year from now())
        )
        SELECT 
            CASE 
                WHEN count(*) = 0 THEN 0 
                ELSE (count(*) FILTER (WHERE status = 'approved' OR status = 'completed')::numeric / count(*)::numeric) * 100 
            END INTO progress_val
        FROM current_month_arts;

        -- Update the squad
        UPDATE public.staff_squads 
        SET 
            delivery_progress = COALESCE(progress_val, 0),
            avg_client_tax = CASE WHEN total_clients = 0 THEN 0 ELSE COALESCE(progress_val, 0) / total_clients END
        WHERE id = s_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
