
-- AI Daily Insights (cron-generated research)
CREATE TABLE public.ai_daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL DEFAULT 'client', -- 'client' or 'company'
  target_id UUID, -- client_id for client insights, null for company
  category TEXT NOT NULL DEFAULT 'general', -- 'trend', 'strategy', 'marketing', 'content_idea', 'news'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  media_type TEXT, -- 'video', 'article', 'image', 'tool'
  media_url TEXT,
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_daily_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage ai_daily_insights" ON public.ai_daily_insights
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_ai_insights_target ON public.ai_daily_insights (target_type, target_id, created_at DESC);

-- AI Chat Sessions
CREATE TABLE public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_type TEXT NOT NULL DEFAULT 'clients', -- 'clients' or 'company'
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage ai_chat_sessions" ON public.ai_chat_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- AI Chat Messages
CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage ai_chat_messages" ON public.ai_chat_messages
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_ai_chat_messages_session ON public.ai_chat_messages (session_id, created_at);

-- Bot control: human takeover timer and rules
ALTER TABLE public.crm_bot_configs ADD COLUMN IF NOT EXISTS human_takeover_minutes INTEGER DEFAULT 30;
ALTER TABLE public.crm_bot_configs ADD COLUMN IF NOT EXISTS bot_rules JSONB DEFAULT '[]'::jsonb;

-- Trigger for updated_at on new tables
CREATE TRIGGER update_ai_daily_insights_updated_at BEFORE UPDATE ON public.ai_daily_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_chat_sessions_updated_at BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
