-- Function to update automatic goal metrics
CREATE OR REPLACE FUNCTION public.update_staff_goal_metrics(p_year INTEGER, p_month INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_count INTEGER = 0;
    v_current_val NUMERIC;
BEGIN
    FOR r IN 
        SELECT 
            sag.id, 
            sag.staff_id, 
            sgt.tracking_query
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

            -- Update the assigned goal
            UPDATE staff_assigned_goals 
            SET 
                current_value = COALESCE(v_current_val, 0),
                status = CASE 
                    WHEN COALESCE(v_current_val, 0) >= COALESCE(custom_target_value, (SELECT target_value FROM staff_goal_templates WHERE id = template_id)) THEN 'achieved'
                    ELSE 'pending'
                END,
                updated_at = NOW()
            WHERE id = r.id;

            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Log error or skip
            CONTINUE;
        END;
    END LOOP;

    RETURN jsonb_build_object('updated_count', v_count);
END;
$$;

-- Ensure current_value defaults to 0
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_assigned_goals' AND column_name = 'current_value') THEN
        ALTER TABLE public.staff_assigned_goals ALTER COLUMN current_value SET DEFAULT 0;
    END IF;
END $$;
