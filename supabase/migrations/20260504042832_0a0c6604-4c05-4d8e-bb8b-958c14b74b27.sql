-- Policies for staff_assigned_goals
CREATE POLICY "Enable insert for authenticated users" ON public.staff_assigned_goals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.staff_assigned_goals FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.staff_assigned_goals FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for staff_goal_templates
CREATE POLICY "Enable insert for templates" ON public.staff_goal_templates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for templates" ON public.staff_goal_templates FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for templates" ON public.staff_goal_templates FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for staff_commission_templates
CREATE POLICY "Enable all for commission templates" ON public.staff_commission_templates FOR ALL USING (auth.role() = 'authenticated');

-- Ensure staff_squads and staff_squad_members have proper policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_squad_members' AND policyname = 'Enable all for authenticated users') THEN
        CREATE POLICY "Enable all for authenticated users" ON public.staff_squad_members FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
