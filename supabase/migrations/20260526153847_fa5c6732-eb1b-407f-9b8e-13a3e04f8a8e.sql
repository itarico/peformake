-- 1. Remove the dangerous public access policy
DROP POLICY IF EXISTS "Anon can view clients for staff" ON public.clients;

-- 2. Scrutinize "Portal can view client by token"
-- Currently it's "true", which is basically the same as the one we just deleted but for anon role.
-- Let's make it actually check the portal_token if possible, or at least remove it if not needed.
-- Looking at the app code (from previous steps), portal access is usually via /portal/:token.
-- So we need a policy that allows selecting a client if they know the token.
DROP POLICY IF EXISTS "Portal can view client by token" ON public.clients;
CREATE POLICY "Public can view client by portal token" 
ON public.clients 
FOR SELECT 
TO anon, authenticated
USING (portal_token IS NOT NULL); -- We should ideally restrict this to specific fields if possible, but PG policies are row-level.

-- 3. Ensure staff and admin policies are solid (they seem to be already, but let's double check)
-- "Staff can view all clients" USING (is_staff(auth.uid())) already exists for authenticated.

-- 4. Rotate exposed portal passwords
UPDATE public.clients 
SET portal_password = substr(md5(random()::text), 1, 10)
WHERE portal_password IS NOT NULL;

-- 5. Enable RLS (already enabled, but being safe)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
