-- Add tracking columns to staff_assigned_goals
ALTER TABLE public.staff_assigned_goals 
ADD COLUMN IF NOT EXISTS last_tracking_error TEXT,
ADD COLUMN IF NOT EXISTS last_tracking_at TIMESTAMP WITH TIME ZONE;

-- Update the metrics function to catch and store errors
CREATE OR REPLACE FUNCTION public.update_staff_goal_metrics(p_year integer, p_month integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    r RECORD;
    v_count INTEGER = 0;
    v_current_val NUMERIC;
    v_error_msg TEXT;
BEGIN
    FOR r IN 
        SELECT 
            sag.id, 
            sag.staff_id, 
            sgt.tracking_query,
            sgt.name as template_name
        FROM 
            staff_assigned_goals sag
        JOIN 
            staff_goal_templates sgt ON sag.template_id = sgt.id
        WHERE 
            sag.year = p_year 
            AND sag.month = p_month 
            AND sgt.tracking_method = 'automatic'
            AND sgt.tracking_query IS NOT NULL
            AND sgt.tracking_query != ''
    LOOP
        BEGIN
            -- Execute the dynamic query
            -- We expect the query to return a single numeric value
            -- We replace :staff_id, :year, :month with actual values
            EXECUTE REPLACE(
                REPLACE(
                    REPLACE(r.tracking_query, ':staff_id', quote_literal(r.staff_id)),
                    ':year', p_year::TEXT
                ),
                ':month', p_month::TEXT
            ) INTO v_current_val;

            -- Update the assigned goal on success
            UPDATE staff_assigned_goals 
            SET 
                current_value = COALESCE(v_current_val, 0),
                status = CASE 
                    WHEN COALESCE(v_current_val, 0) >= COALESCE(custom_target_value, (SELECT target_value FROM staff_goal_templates WHERE id = template_id)) THEN 'achieved'
                    ELSE 'pending'
                END,
                last_tracking_error = NULL,
                last_tracking_at = NOW(),
                updated_at = NOW()
            WHERE id = r.id;

            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
            
            -- Update the assigned goal with error info
            UPDATE staff_assigned_goals 
            SET 
                last_tracking_error = v_error_msg,
                last_tracking_at = NOW(),
                updated_at = NOW()
            WHERE id = r.id;
        END;
    END LOOP;

    RETURN jsonb_build_object('updated_count', v_count);
END;
$function$;