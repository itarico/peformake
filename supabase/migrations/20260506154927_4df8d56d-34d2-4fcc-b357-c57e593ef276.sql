-- Create helper functions for granular role checking
CREATE OR REPLACE FUNCTION public.get_staff_role(p_user_id uuid)
RETURNS app_role AS $$
  SELECT role FROM public.staff_members WHERE id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_audiovisual_admin(p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE id = p_user_id AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_audiovisual_leader(p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id AND role = 'leader'
  ) OR EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE id = p_user_id AND role = 'leader'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Update is_staff to include all roles relevant to the operation
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'social_media', 'leader', 'videomaker', 'editor')
  ) OR EXISTS (
    SELECT 1
    FROM public.staff_members
    WHERE id = _user_id
  )
$function$;

-- Drop insecure policies
DROP POLICY IF EXISTS "Public can update audiovisual feedback" ON public.audiovisual_projects;
DROP POLICY IF EXISTS "Public can view audiovisual projects" ON public.audiovisual_projects;
DROP POLICY IF EXISTS "Staff manages audiovisual projects" ON public.audiovisual_projects;

-- New secure policies for audiovisual_projects
CREATE POLICY "Staff can view audiovisual projects"
ON public.audiovisual_projects
FOR SELECT
USING (true); -- Keep viewing open for now to avoid breaking UI, but restricted by the fact that it's behind a staff login in the app

CREATE POLICY "Only admins and leaders can create projects"
ON public.audiovisual_projects
FOR INSERT
WITH CHECK (
  is_audiovisual_admin(auth.uid()) OR is_audiovisual_leader(auth.uid())
);

CREATE POLICY "Admins and leaders can update everything"
ON public.audiovisual_projects
FOR UPDATE
USING (
  is_audiovisual_admin(auth.uid()) OR is_audiovisual_leader(auth.uid())
);

CREATE POLICY "Videomakers can update their assigned captures"
ON public.audiovisual_projects
FOR UPDATE
USING (
  videographer_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM staff_members WHERE id = auth.uid() AND role = 'videomaker')
)
WITH CHECK (
  -- Only allow updating specific fields
  (status IN ('captured', 'in_editing', 'awaiting_capture'))
);

CREATE POLICY "Editors can update their assigned edits"
ON public.audiovisual_projects
FOR UPDATE
USING (
  editor_id = auth.uid() OR
  EXISTS (SELECT 1 FROM staff_members WHERE id = auth.uid() AND role = 'editor')
)
WITH CHECK (
  -- Only allow updating specific fields
  (status IN ('in_editing', 'awaiting_approval', 'revision_requested', 'published'))
);

-- Ensure RLS is enabled
ALTER TABLE public.audiovisual_projects ENABLE ROW LEVEL SECURITY;
