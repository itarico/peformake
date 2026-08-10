
-- Add avatar and job title to staff_members for landing page
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS show_on_landing boolean NOT NULL DEFAULT false;

-- Create service_requests table
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  whatsapp text NOT NULL,
  service_id uuid REFERENCES public.services(id),
  service_name text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a request
CREATE POLICY "Public can submit service requests" ON public.service_requests
  FOR INSERT TO public WITH CHECK (true);

-- Staff can view and manage
CREATE POLICY "Staff can manage service requests" ON public.service_requests
  FOR ALL TO public USING (is_staff(auth.uid()));
