ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'closer';
ALTER TYPE public.audiovisual_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TABLE public.staff_assigned_goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();