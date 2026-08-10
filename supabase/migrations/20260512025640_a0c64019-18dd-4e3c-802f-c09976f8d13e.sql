ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS squad_id UUID REFERENCES public.staff_squads(id);

-- Update existing staff_members from staff_squad_members link if exists
UPDATE public.staff_members sm
SET squad_id = ssm.squad_id
FROM public.staff_squad_members ssm
WHERE ssm.staff_id = sm.id;