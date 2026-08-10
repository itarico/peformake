-- Add reference_id constraint to prevent duplicate commissions for the same goal in the same month
ALTER TABLE public.staff_commissions 
ADD CONSTRAINT staff_commissions_reference_unique UNIQUE (staff_member_id, year, month, reference_id);

-- Create trigger function for automatic commissions
CREATE OR REPLACE FUNCTION public.fn_auto_create_commission_on_goal_achievement()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_template_id UUID;
    v_commission_value NUMERIC;
    v_commission_name TEXT;
    v_commission_type TEXT;
    v_amount NUMERIC;
    v_managed_revenue NUMERIC;
BEGIN
    -- Check if status changed to 'achieved'
    IF (NEW.status = 'achieved' AND (OLD.status IS NULL OR OLD.status != 'achieved')) THEN
        
        -- Get commission template linked to this goal's template
        SELECT commission_template_id INTO v_commission_template_id
        FROM public.staff_goal_templates
        WHERE id = NEW.template_id;

        IF v_commission_template_id IS NOT NULL THEN
            -- Get commission template details
            SELECT name, value, commission_type INTO v_commission_name, v_commission_value, v_commission_type
            FROM public.staff_commission_templates
            WHERE id = v_commission_template_id AND is_active = true;

            IF v_commission_value IS NOT NULL THEN
                -- Calculate amount based on type
                IF v_commission_type = 'percentage_of_revenue' THEN
                    -- Try to get managed revenue for this staff member
                    SELECT total_managed_revenue INTO v_managed_revenue
                    FROM public.staff_managed_revenue
                    WHERE staff_id = NEW.staff_id;
                    
                    v_amount := (v_managed_revenue * v_commission_value) / 100;
                ELSE
                    -- Default to fixed value for most cases
                    v_amount := v_commission_value;
                END IF;

                -- Insert commission if not already exists (unique constraint handles this, but we use ON CONFLICT to be safe)
                INSERT INTO public.staff_commissions (
                    staff_member_id,
                    template_id,
                    amount,
                    description,
                    reference_id,
                    month,
                    year,
                    status
                ) VALUES (
                    NEW.staff_id,
                    v_commission_template_id,
                    COALESCE(v_amount, 0),
                    'Comissão automática: meta "' || (SELECT name FROM staff_goal_templates WHERE id = NEW.template_id) || '" atingida.',
                    NEW.id,
                    NEW.month,
                    NEW.year,
                    'pending'
                )
                ON CONFLICT (staff_member_id, year, month, reference_id) DO UPDATE 
                SET amount = EXCLUDED.amount,
                    updated_at = NOW();
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS tr_goal_achievement_commission ON public.staff_assigned_goals;
CREATE TRIGGER tr_goal_achievement_commission
AFTER UPDATE ON public.staff_assigned_goals
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_create_commission_on_goal_achievement();
