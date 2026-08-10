-- Enable RLS for sdr_kpi_configs if not already enabled
ALTER TABLE public.sdr_kpi_configs ENABLE ROW LEVEL SECURITY;

-- Create policy for public read (needed for the dashboard to show goals to everyone)
CREATE POLICY "SDR KPI configs are viewable by everyone" 
ON public.sdr_kpi_configs 
FOR SELECT 
USING (true);

-- Create policy for admin write
CREATE POLICY "Admins can manage SDR KPI configs" 
ON public.sdr_kpi_configs 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);