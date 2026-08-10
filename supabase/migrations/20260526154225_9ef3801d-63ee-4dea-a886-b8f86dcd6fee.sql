-- Remove insecure public policies from crm_settings
DROP POLICY IF EXISTS "Public insert/update for authenticated" ON public.crm_settings;
DROP POLICY IF EXISTS "Public select for authenticated" ON public.crm_settings;

-- Create secure policy for administrators only
CREATE POLICY "Admins can manage crm settings" 
ON public.crm_settings 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure RLS is enabled
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
