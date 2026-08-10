-- Add new values to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'traffic';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'leader';

-- Ensure RLS on staff_assigned_goals is robust
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'staff_assigned_goals' AND policyname = 'Admins have full access to goals'
    ) THEN
        CREATE POLICY "Admins have full access to goals" 
        ON public.staff_assigned_goals 
        FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM user_roles 
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END $$;
