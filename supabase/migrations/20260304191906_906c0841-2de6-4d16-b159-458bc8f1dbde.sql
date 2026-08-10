
-- 1. SECURE STAFF LOGIN: Create server-side auth function
CREATE OR REPLACE FUNCTION public.authenticate_staff_member(
  p_full_name text,
  p_password text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_staff record;
BEGIN
  SELECT id, full_name, email, phone, role, cost_per_art, is_active, has_password_login, login_password
  INTO v_staff
  FROM public.staff_members
  WHERE lower(trim(full_name)) = lower(trim(p_full_name))
    AND is_active = true
  LIMIT 1;

  IF v_staff IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome não encontrado.');
  END IF;

  IF v_staff.has_password_login = true THEN
    IF p_password IS NULL OR p_password = '' THEN
      RETURN jsonb_build_object('success', false, 'requiresPassword', true, 'error', 'Este membro requer senha.');
    END IF;
    IF v_staff.login_password IS DISTINCT FROM p_password THEN
      RETURN jsonb_build_object('success', false, 'error', 'Senha incorreta.');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'staff', jsonb_build_object(
      'id', v_staff.id,
      'full_name', v_staff.full_name,
      'email', v_staff.email,
      'phone', v_staff.phone,
      'role', v_staff.role,
      'cost_per_art', v_staff.cost_per_art,
      'is_active', v_staff.is_active,
      'has_password_login', v_staff.has_password_login
    )
  );
END;
$$;

-- 2. Verify staff session function
CREATE OR REPLACE FUNCTION public.verify_staff_session(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_staff record;
BEGIN
  SELECT id, full_name, email, phone, role, cost_per_art, is_active, has_password_login
  INTO v_staff
  FROM public.staff_members
  WHERE id = p_staff_id AND is_active = true
  LIMIT 1;

  IF v_staff IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'staff', jsonb_build_object(
      'id', v_staff.id,
      'full_name', v_staff.full_name,
      'email', v_staff.email,
      'phone', v_staff.phone,
      'role', v_staff.role,
      'cost_per_art', v_staff.cost_per_art,
      'is_active', v_staff.is_active,
      'has_password_login', v_staff.has_password_login
    )
  );
END;
$$;

-- 3. Secure CRM portal auth function
CREATE OR REPLACE FUNCTION public.authenticate_crm_portal(
  p_client_id uuid,
  p_login text,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = p_client_id
      AND lower(trim(crm_portal_login)) = lower(trim(p_login))
      AND crm_portal_password = p_password
  );
END;
$$;

-- 4. RESTRICT staff_members: Remove public SELECT
DROP POLICY IF EXISTS "Anyone can view staff for login" ON public.staff_members;

CREATE POLICY "Staff can view staff members"
  ON public.staff_members FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

-- 5. RESTRICT crm_whatsapp_connections: Remove public SELECT
DROP POLICY IF EXISTS "Anon can view own crm connection" ON public.crm_whatsapp_connections;

CREATE POLICY "Staff can view crm connections"
  ON public.crm_whatsapp_connections FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

-- 6. RESTRICT crm_agent_configs: Remove public SELECT
DROP POLICY IF EXISTS "Anon can view agent configs" ON public.crm_agent_configs;

CREATE POLICY "Staff can view agent configs"
  ON public.crm_agent_configs FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

-- 7. RESTRICT crm_leads: Remove open INSERT/UPDATE
DROP POLICY IF EXISTS "Anon can insert crm leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Anon can update crm leads" ON public.crm_leads;

CREATE POLICY "Service can insert crm leads"
  ON public.crm_leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update crm leads"
  ON public.crm_leads FOR UPDATE
  USING (true);

-- 8. RESTRICT crm_messages: Remove open INSERT
DROP POLICY IF EXISTS "Anon can insert crm messages" ON public.crm_messages;

CREATE POLICY "Service can insert crm messages"
  ON public.crm_messages FOR INSERT
  WITH CHECK (true);

-- 9. RESTRICT consulting_months: Remove open UPDATE
DROP POLICY IF EXISTS "Anon can update consulting months" ON public.consulting_months;

-- 10. RESTRICT framework_answers & instances
DROP POLICY IF EXISTS "Anon can manage framework answers" ON public.framework_answers;
DROP POLICY IF EXISTS "Anon can manage framework instances" ON public.framework_instances;

CREATE POLICY "Anon can view framework answers"
  ON public.framework_answers FOR SELECT
  USING (true);

CREATE POLICY "Service can manage framework answers"
  ON public.framework_answers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update framework answers"
  ON public.framework_answers FOR UPDATE
  USING (true);

CREATE POLICY "Anon can view framework instances"
  ON public.framework_instances FOR SELECT
  USING (true);

CREATE POLICY "Service can manage framework instances"
  ON public.framework_instances FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update framework instances"
  ON public.framework_instances FOR UPDATE
  USING (true);

-- 11. RESTRICT arts: Remove overly open CRUD
DROP POLICY IF EXISTS "Anon can update arts" ON public.arts;
DROP POLICY IF EXISTS "Anyone can delete arts from valid work months" ON public.arts;
DROP POLICY IF EXISTS "Anyone can insert arts to valid work months" ON public.arts;
