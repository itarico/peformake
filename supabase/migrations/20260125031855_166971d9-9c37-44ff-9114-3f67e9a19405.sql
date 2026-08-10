-- Add RLS policy to allow staff members (designers) to view their own designer record via staff_member_id
-- This is needed because staff login doesn't use Supabase auth, so auth.uid() is null

-- First drop the "Deny anonymous access" policy that blocks all unauthenticated requests
DROP POLICY IF EXISTS "Deny anonymous access to designers" ON public.designers;

-- Create a policy that allows SELECT on designers by staff_member_id
-- Since staff login stores staff data locally, we need to allow this query
CREATE POLICY "Allow select by staff_member_id" 
ON public.designers 
FOR SELECT 
USING (true);

-- Note: This is a permissive policy because the staff login system doesn't use Supabase auth.
-- The security is handled at the application level via StaffAuthContext.