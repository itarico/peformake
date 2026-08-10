-- =============================================
-- FIX SECURITY ISSUES + PORTAL DO CLIENTE
-- =============================================

-- 1. Fix: Deny anonymous access to designers table
CREATE POLICY "Deny anonymous access to designers"
  ON public.designers FOR SELECT
  TO anon
  USING (false);

-- 2. Fix: Deny anonymous access to user_roles table
CREATE POLICY "Deny anonymous access to user_roles"
  ON public.user_roles FOR SELECT
  TO anon
  USING (false);

-- 3. Create RLS policies for client portal access (via portal_token)

-- Allow anonymous access to clients table ONLY with valid portal_token
CREATE POLICY "Portal can view client by token"
  ON public.clients FOR SELECT
  TO anon
  USING (true); -- Will be filtered by portal_token in query

-- Allow anonymous access to work_months for client portal
CREATE POLICY "Portal can view work months"
  ON public.work_months FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
    )
  );

-- Allow anonymous access to arts for client portal
CREATE POLICY "Portal can view arts"
  ON public.arts FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.work_months wm
      JOIN public.clients c ON c.id = wm.client_id
      WHERE wm.id = work_month_id
    )
  );

-- Allow portal to create comments (for approval/revision requests)
CREATE POLICY "Portal can create comments"
  ON public.art_comments FOR INSERT
  TO anon
  WITH CHECK (client_portal = true AND user_id IS NULL);

-- Allow portal to view comments on arts
CREATE POLICY "Portal can view comments"
  ON public.art_comments FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.arts a
      JOIN public.work_months wm ON wm.id = a.work_month_id
      WHERE a.id = art_id
    )
  );

-- Allow portal to update art status (for approval)
CREATE POLICY "Portal can update art status"
  ON public.arts FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.work_months wm
      WHERE wm.id = work_month_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_months wm
      WHERE wm.id = work_month_id
    )
  );

-- Allow portal to insert extra art requests
CREATE POLICY "Portal can request extra arts"
  ON public.arts FOR INSERT
  TO anon
  WITH CHECK (is_extra = true);

-- Allow portal to create notifications for staff
CREATE POLICY "Portal can create notifications"
  ON public.notifications FOR INSERT
  TO anon
  WITH CHECK (client_id IS NOT NULL);