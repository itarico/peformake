
-- Add more columns to instagram_metrics for richer data
ALTER TABLE public.instagram_metrics 
ADD COLUMN IF NOT EXISTS engagement_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_likes numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_comments numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_saves numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_shares numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_reach_per_post numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_likes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_comments integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_saves integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_shares integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_plays integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reels_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS carousel_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS stories_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_followers integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS accounts_engaged integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_posting_hours jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS audience_demographics jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS daily_follower_data jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS media_count integer DEFAULT 0;

-- Create instagram_conversations table for DM integration
CREATE TABLE IF NOT EXISTS public.instagram_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ig_conversation_id text NOT NULL,
  ig_user_id text NOT NULL,
  ig_username text,
  ig_name text,
  ig_profile_pic text,
  last_message_at timestamptz DEFAULT now(),
  last_message_preview text,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, ig_user_id)
);

CREATE TABLE IF NOT EXISTS public.instagram_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.instagram_conversations(id) ON DELETE CASCADE,
  ig_message_id text,
  ig_sender_id text NOT NULL,
  direction text NOT NULL DEFAULT 'inbound',
  content text,
  media_url text,
  message_type text DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ig_message_id)
);

ALTER TABLE public.instagram_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage ig conversations" ON public.instagram_conversations FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Anon can view ig conversations" ON public.instagram_conversations FOR SELECT USING (true);
CREATE POLICY "Service can insert ig conversations" ON public.instagram_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update ig conversations" ON public.instagram_conversations FOR UPDATE USING (true);

CREATE POLICY "Staff can manage ig messages" ON public.instagram_messages FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Anon can view ig messages" ON public.instagram_messages FOR SELECT USING (true);
CREATE POLICY "Service can insert ig messages" ON public.instagram_messages FOR INSERT WITH CHECK (true);

-- Enable realtime for instagram messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.instagram_messages;
