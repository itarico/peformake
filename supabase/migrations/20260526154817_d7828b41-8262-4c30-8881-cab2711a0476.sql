-- Enable RLS on okr_metric_sources
ALTER TABLE public.okr_metric_sources ENABLE ROW LEVEL SECURITY;

-- Grant access to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.okr_metric_sources TO authenticated;
GRANT ALL ON public.okr_metric_sources TO service_role;

-- Create policy for staff access
CREATE POLICY "Staff can manage okr metric sources" 
ON public.okr_metric_sources 
FOR ALL 
TO authenticated 
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));
