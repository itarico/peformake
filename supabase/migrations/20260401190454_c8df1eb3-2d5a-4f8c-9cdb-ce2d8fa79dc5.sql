
CREATE OR REPLACE FUNCTION public.authenticate_staff_by_email(p_email text, p_password text)
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
  WHERE lower(trim(email)) = lower(trim(p_email))
    AND is_active = true
  LIMIT 1;

  IF v_staff IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'E-mail não encontrado.');
  END IF;

  IF v_staff.login_password IS NULL OR v_staff.login_password = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este membro não possui senha cadastrada. Solicite ao administrador.');
  END IF;

  IF v_staff.login_password IS DISTINCT FROM p_password THEN
    RETURN jsonb_build_object('success', false, 'error', 'Senha incorreta.');
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
