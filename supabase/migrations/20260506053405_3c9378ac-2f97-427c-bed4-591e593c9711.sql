
-- Audiovisual project type
DO $$ BEGIN
  CREATE TYPE public.audiovisual_status AS ENUM (
    'pending_briefing','briefing_done','in_production','awaiting_approval','revision_requested','approved','published'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.audiovisual_kind AS ENUM ('monthly','project');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.audiovisual_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  kind public.audiovisual_kind NOT NULL DEFAULT 'monthly',
  title text NOT NULL,
  description text,
  year int,
  month int,
  due_date date,
  briefing text,
  script text,
  reference_links text,
  video_url text,
  thumbnail_url text,
  format text,
  duration_seconds int,
  editor_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
  commission_value numeric DEFAULT 0,
  status public.audiovisual_status NOT NULL DEFAULT 'pending_briefing',
  client_feedback text,
  client_approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_av_projects_client ON public.audiovisual_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_av_projects_editor ON public.audiovisual_projects(editor_id);
CREATE INDEX IF NOT EXISTS idx_av_projects_status ON public.audiovisual_projects(status);

CREATE TABLE IF NOT EXISTS public.audiovisual_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.audiovisual_projects(id) ON DELETE CASCADE,
  author_type text NOT NULL CHECK (author_type IN ('staff','client')),
  author_name text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_av_comments_project ON public.audiovisual_comments(project_id);

CREATE TRIGGER trg_av_projects_updated
BEFORE UPDATE ON public.audiovisual_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.audiovisual_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audiovisual_comments ENABLE ROW LEVEL SECURITY;

-- Staff (admin/social_media) can manage everything
CREATE POLICY "Staff manages audiovisual projects"
ON public.audiovisual_projects FOR ALL
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff manages audiovisual comments"
ON public.audiovisual_comments FOR ALL
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Public read via portal: keep open for SELECT (portal uses anon + token-based clients)
CREATE POLICY "Public can view audiovisual projects"
ON public.audiovisual_projects FOR SELECT USING (true);

CREATE POLICY "Public can view audiovisual comments"
ON public.audiovisual_comments FOR SELECT USING (true);

CREATE POLICY "Public can add audiovisual comments"
ON public.audiovisual_comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update audiovisual feedback"
ON public.audiovisual_projects FOR UPDATE USING (true) WITH CHECK (true);
