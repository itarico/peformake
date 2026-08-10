-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.staff_squads;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.staff_squad_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.staff_assigned_goals;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.staff_assigned_goals;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.staff_assigned_goals;
DROP POLICY IF EXISTS "Enable insert for templates" ON public.staff_goal_templates;
DROP POLICY IF EXISTS "Enable update for templates" ON public.staff_goal_templates;
DROP POLICY IF EXISTS "Enable delete for templates" ON public.staff_goal_templates;
DROP POLICY IF EXISTS "Enable all for commission templates" ON public.staff_commission_templates;

-- Create more permissive policies for management tables (allowing anon/public for custom staff auth)
CREATE POLICY "Public Manage Squads" ON public.staff_squads FOR ALL USING (true);
CREATE POLICY "Public Manage Squad Members" ON public.staff_squad_members FOR ALL USING (true);
CREATE POLICY "Public Manage Assigned Goals" ON public.staff_assigned_goals FOR ALL USING (true);
CREATE POLICY "Public Manage Goal Templates" ON public.staff_goal_templates FOR ALL USING (true);
CREATE POLICY "Public Manage Commission Templates" ON public.staff_commission_templates FOR ALL USING (true);
CREATE POLICY "Public Manage Activity Proofs" ON public.staff_activity_proofs FOR ALL USING (true);
CREATE POLICY "Public Manage Commissions" ON public.staff_commissions FOR ALL USING (true);

-- Ensure RLS is enabled (just in case)
ALTER TABLE public.staff_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assigned_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_commission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_activity_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_commissions ENABLE ROW LEVEL SECURITY;
