
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_password text;

CREATE OR REPLACE FUNCTION public.authenticate_client_portal(p_email text, p_password text)
RETURNS TABLE(portal_token uuid, client_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.portal_token, c.name
  FROM public.clients c
  WHERE lower(c.email) = lower(p_email)
    AND c.is_active = true
    AND c.portal_password = p_password;
END;
$$;
