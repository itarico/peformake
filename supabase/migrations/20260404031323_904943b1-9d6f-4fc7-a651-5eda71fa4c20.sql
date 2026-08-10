
-- Add roles array column
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{}';

-- Backfill existing data from the role column
UPDATE public.staff_members SET roles = ARRAY[role::text] WHERE roles = '{}' OR roles IS NULL;

-- Update authenticate_staff_by_email to return roles array
CREATE OR REPLACE FUNCTION public.authenticate_staff_by_email(p_email text, p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff record;
BEGIN
  SELECT id, full_name, email, phone, role, roles, cost_per_art, is_active, has_password_login, login_password
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
      'roles', to_jsonb(v_staff.roles),
      'cost_per_art', v_staff.cost_per_art,
      'is_active', v_staff.is_active,
      'has_password_login', v_staff.has_password_login
    )
  );
END;
$function$;

-- Update verify_staff_session to return roles array
CREATE OR REPLACE FUNCTION public.verify_staff_session(p_staff_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff record;
BEGIN
  SELECT id, full_name, email, phone, role, roles, cost_per_art, is_active, has_password_login
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
      'roles', to_jsonb(v_staff.roles),
      'cost_per_art', v_staff.cost_per_art,
      'is_active', v_staff.is_active,
      'has_password_login', v_staff.has_password_login
    )
  );
END;
$function$;
