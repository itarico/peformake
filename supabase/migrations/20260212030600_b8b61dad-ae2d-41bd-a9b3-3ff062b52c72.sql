-- Allow anonymous (portal) users to read client_services for their client
CREATE POLICY "Anon can view client services"
ON public.client_services
FOR SELECT
USING (true);