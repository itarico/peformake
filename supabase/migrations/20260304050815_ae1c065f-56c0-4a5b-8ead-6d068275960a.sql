-- Add reference_image_urls array to arts table for multiple reference images
ALTER TABLE public.arts ADD COLUMN IF NOT EXISTS reference_image_urls text[] DEFAULT '{}'::text[];

-- Create instagram_scheduled_posts table
CREATE TABLE IF NOT EXISTS public.instagram_scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'IMAGE',
  media_url text,
  media_urls text[] DEFAULT '{}'::text[],
  caption text,
  scheduled_at timestamp with time zone NOT NULL,
  published_at timestamp with time zone,
  status text NOT NULL DEFAULT 'scheduled',
  ig_media_id text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage scheduled posts" ON public.instagram_scheduled_posts
  FOR ALL TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Anon can view scheduled posts" ON public.instagram_scheduled_posts
  FOR SELECT TO anon USING (true);