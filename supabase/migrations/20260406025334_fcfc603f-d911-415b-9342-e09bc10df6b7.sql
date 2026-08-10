ALTER TABLE public.ai_daily_insights 
ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS insight_format TEXT DEFAULT 'article',
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_ai_daily_insights_service_type ON public.ai_daily_insights (service_type);
CREATE INDEX IF NOT EXISTS idx_ai_daily_insights_target ON public.ai_daily_insights (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ai_daily_insights_created ON public.ai_daily_insights (created_at DESC);