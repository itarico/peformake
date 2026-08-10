
-- Allow anonymous users (Staff Login designers) to view work_months via client lookup
CREATE POLICY "Anon can view work months"
  ON public.work_months
  FOR SELECT
  USING (true);

-- Ensure anonymous INSERT on arts works (policy already exists but let's make sure)
-- The existing "Anyone can insert arts to valid work months" should work
-- But we also need anonymous SELECT on clients to populate the dropdown
CREATE POLICY "Anon can view clients for staff"
  ON public.clients
  FOR SELECT
  USING (true);

-- Allow anonymous SELECT on arts (for designers viewing their work)
CREATE POLICY "Anon can view arts"
  ON public.arts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_months wm
      WHERE wm.id = arts.work_month_id
    )
  );

-- Allow anonymous UPDATE on arts (for designers uploading final art)
CREATE POLICY "Anon can update arts"
  ON public.arts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM work_months wm
      WHERE wm.id = arts.work_month_id
    )
  );
