
-- Enums
CREATE TYPE public.weekly_plan_status AS ENUM ('draft', 'pending_approval', 'approved', 'changes_requested');
CREATE TYPE public.weekly_plan_item_status AS ENUM ('pending', 'approved', 'changes_requested');
CREATE TYPE public.weekly_plan_post_type AS ENUM ('feed', 'reels', 'carousel');

-- 1) weekly_plans
CREATE TABLE public.weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  status public.weekly_plan_status NOT NULL DEFAULT 'draft',
  title TEXT,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, week_start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_plans TO authenticated;
GRANT ALL ON public.weekly_plans TO service_role;

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage weekly plans of assigned clients"
  ON public.weekly_plans FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = weekly_plans.client_id
        AND (
          c.social_media_staff_id = auth.uid()
          OR c.admin_staff_id = auth.uid()
          OR c.head_marketing_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = weekly_plans.client_id
        AND (
          c.social_media_staff_id = auth.uid()
          OR c.admin_staff_id = auth.uid()
          OR c.head_marketing_id = auth.uid()
        )
    )
  );

-- 2) weekly_plan_posts
CREATE TABLE public.weekly_plan_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  post_type public.weekly_plan_post_type NOT NULL DEFAULT 'feed',
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  caption TEXT,
  hashtags TEXT,
  scheduled_at TIMESTAMPTZ,
  position INTEGER NOT NULL DEFAULT 0,
  status public.weekly_plan_item_status NOT NULL DEFAULT 'pending',
  client_comment TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekly_plan_posts_plan ON public.weekly_plan_posts(plan_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_plan_posts TO authenticated;
GRANT ALL ON public.weekly_plan_posts TO service_role;

ALTER TABLE public.weekly_plan_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage posts of assigned client plans"
  ON public.weekly_plan_posts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.weekly_plans wp
      JOIN public.clients c ON c.id = wp.client_id
      WHERE wp.id = weekly_plan_posts.plan_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR c.social_media_staff_id = auth.uid()
          OR c.admin_staff_id = auth.uid()
          OR c.head_marketing_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.weekly_plans wp
      JOIN public.clients c ON c.id = wp.client_id
      WHERE wp.id = weekly_plan_posts.plan_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR c.social_media_staff_id = auth.uid()
          OR c.admin_staff_id = auth.uid()
          OR c.head_marketing_id = auth.uid()
        )
    )
  );

-- 3) weekly_plan_stories
CREATE TABLE public.weekly_plan_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  title TEXT,
  description TEXT,
  image_url TEXT,
  story_type TEXT DEFAULT 'foto',
  position INTEGER NOT NULL DEFAULT 0,
  status public.weekly_plan_item_status NOT NULL DEFAULT 'pending',
  client_comment TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekly_plan_stories_plan ON public.weekly_plan_stories(plan_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_plan_stories TO authenticated;
GRANT ALL ON public.weekly_plan_stories TO service_role;

ALTER TABLE public.weekly_plan_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage stories of assigned client plans"
  ON public.weekly_plan_stories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.weekly_plans wp
      JOIN public.clients c ON c.id = wp.client_id
      WHERE wp.id = weekly_plan_stories.plan_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR c.social_media_staff_id = auth.uid()
          OR c.admin_staff_id = auth.uid()
          OR c.head_marketing_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.weekly_plans wp
      JOIN public.clients c ON c.id = wp.client_id
      WHERE wp.id = weekly_plan_stories.plan_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR c.social_media_staff_id = auth.uid()
          OR c.admin_staff_id = auth.uid()
          OR c.head_marketing_id = auth.uid()
        )
    )
  );

-- 4) weekly_plan_comments
CREATE TABLE public.weekly_plan_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.weekly_plan_posts(id) ON DELETE CASCADE,
  story_id UUID REFERENCES public.weekly_plan_stories(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('staff', 'client')),
  author_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('comment', 'approve', 'request_changes', 'approve_all')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekly_plan_comments_plan ON public.weekly_plan_comments(plan_id);
CREATE INDEX idx_weekly_plan_comments_post ON public.weekly_plan_comments(post_id);
CREATE INDEX idx_weekly_plan_comments_story ON public.weekly_plan_comments(story_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_plan_comments TO authenticated;
GRANT ALL ON public.weekly_plan_comments TO service_role;

ALTER TABLE public.weekly_plan_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view/insert comments of assigned client plans"
  ON public.weekly_plan_comments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.weekly_plans wp
      JOIN public.clients c ON c.id = wp.client_id
      WHERE wp.id = weekly_plan_comments.plan_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR c.social_media_staff_id = auth.uid()
          OR c.admin_staff_id = auth.uid()
          OR c.head_marketing_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.weekly_plans wp
      JOIN public.clients c ON c.id = wp.client_id
      WHERE wp.id = weekly_plan_comments.plan_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR c.social_media_staff_id = auth.uid()
          OR c.admin_staff_id = auth.uid()
          OR c.head_marketing_id = auth.uid()
        )
    )
  );

-- Triggers para updated_at
CREATE TRIGGER trg_weekly_plans_updated
  BEFORE UPDATE ON public.weekly_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_weekly_plan_posts_updated
  BEFORE UPDATE ON public.weekly_plan_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_weekly_plan_stories_updated
  BEFORE UPDATE ON public.weekly_plan_stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
