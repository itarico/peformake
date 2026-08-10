
-- Add max hours per art to staff_members for deadline tracking
ALTER TABLE public.staff_members
ADD COLUMN max_hours_per_art integer DEFAULT 48;

-- Add art unit label to client_services for design package customization
ALTER TABLE public.client_services
ADD COLUMN art_unit_label text DEFAULT NULL;
