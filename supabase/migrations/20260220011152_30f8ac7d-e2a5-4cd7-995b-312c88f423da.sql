
-- Add password login fields to staff_members
ALTER TABLE public.staff_members 
ADD COLUMN IF NOT EXISTS login_password text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_password_login boolean NOT NULL DEFAULT false;

-- Add admin_staff_id to clients (the admin who manages this client)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS admin_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL DEFAULT NULL;

-- Remove arts_per_month from being required at client creation (it comes from services now)
-- Already has a default value of 4, so no change needed

-- Create index for admin_staff_id lookups
CREATE INDEX IF NOT EXISTS idx_clients_admin_staff_id ON public.clients(admin_staff_id);
