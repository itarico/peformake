-- Add password field to profiles for simple name-based login
-- This is a simplified auth system where users login with name only

-- Create a table for staff members (designers, social media, etc.)
-- These are managed by admin and login with just their name
CREATE TABLE public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role app_role NOT NULL DEFAULT 'designer',
  cost_per_art NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(full_name)
);

-- Enable RLS
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view staff for login"
ON public.staff_members
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage staff"
ON public.staff_members
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Update trigger for updated_at
CREATE TRIGGER update_staff_members_updated_at
BEFORE UPDATE ON public.staff_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Link designers table to staff_members instead of profiles
ALTER TABLE public.designers ADD COLUMN IF NOT EXISTS staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

-- Update clients to reference staff_members for designer assignment
-- First, let's create a function to get staff member's designer id
CREATE OR REPLACE FUNCTION public.get_staff_designer_id(_staff_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.designers WHERE staff_member_id = _staff_id LIMIT 1
$$;

-- Function to check if a staff member has a specific role
CREATE OR REPLACE FUNCTION public.staff_has_role(_staff_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_members
    WHERE id = _staff_id
      AND role = _role
  )
$$;