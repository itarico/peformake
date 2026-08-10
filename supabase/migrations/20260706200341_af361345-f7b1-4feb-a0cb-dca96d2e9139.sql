
-- Fix weekly planning access: project uses custom staff auth (no auth.uid()), so relax RLS to allow anon CRUD like other tables in this project.
DROP POLICY IF EXISTS "Staff manage weekly plans of assigned clients" ON public.weekly_plans;
DROP POLICY IF EXISTS "Staff manage posts of assigned client plans" ON public.weekly_plan_posts;
DROP POLICY IF EXISTS "Staff manage stories of assigned client plans" ON public.weekly_plan_stories;
DROP POLICY IF EXISTS "Staff view/insert comments of assigned client plans" ON public.weekly_plan_comments;

CREATE POLICY "Anon manage weekly plans" ON public.weekly_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon manage weekly plan posts" ON public.weekly_plan_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon manage weekly plan stories" ON public.weekly_plan_stories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon manage weekly plan comments" ON public.weekly_plan_comments FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_plans TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_plan_posts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_plan_stories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_plan_comments TO anon, authenticated;
GRANT ALL ON public.weekly_plans, public.weekly_plan_posts, public.weekly_plan_stories, public.weekly_plan_comments TO service_role;
