CREATE OR REPLACE FUNCTION public.update_staff_goal_progress()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    tpl_threshold NUMERIC;
    tpl_direction TEXT;
    is_achieved BOOLEAN := false;
BEGIN
    SELECT min_threshold, improvement_direction 
    INTO tpl_threshold, tpl_direction
    FROM staff_goal_templates 
    WHERE id = NEW.template_id;

    -- Default threshold if not set
    IF tpl_threshold IS NULL THEN
        tpl_threshold := NEW.custom_target_value;
    END IF;

    -- Determine achievement based on direction
    IF tpl_direction = 'down' THEN
        is_achieved := (NEW.current_value <= tpl_threshold);
    ELSE
        is_achieved := (NEW.current_value >= tpl_threshold);
    END IF;

    -- Update status
    IF is_achieved THEN
        NEW.status := 'achieved';
    ELSE
        NEW.status := 'pending';
    END IF;

    RETURN NEW;
END;
$function$;

-- Update existing goals for the current month to reflect the fix
UPDATE staff_assigned_goals sag
SET status = CASE 
    WHEN (sgt.improvement_direction = 'down' AND sag.current_value <= COALESCE(sgt.min_threshold, sag.custom_target_value)) THEN 'achieved'
    WHEN (sgt.improvement_direction != 'down' AND sag.current_value >= COALESCE(sgt.min_threshold, sag.custom_target_value)) THEN 'achieved'
    ELSE 'pending'
END
FROM staff_goal_templates sgt
WHERE sag.template_id = sgt.id
AND sag.year = EXTRACT(YEAR FROM now())
AND sag.month = EXTRACT(MONTH FROM now());
