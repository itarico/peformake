-- Update okr_objectives to support levels and AI metadata
ALTER TABLE public.okr_objectives 
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('strategic', 'operational', 'client')) DEFAULT 'strategic',
ADD COLUMN IF NOT EXISTS ai_status TEXT,
ADD COLUMN IF NOT EXISTS last_ai_analysis_at TIMESTAMP WITH TIME ZONE;

-- Update okr_key_results for automated tracking and AI insights
ALTER TABLE public.okr_key_results 
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS metric_category TEXT, -- finance, production, client, team
ADD COLUMN IF NOT EXISTS ai_diagnostic TEXT,
ADD COLUMN IF NOT EXISTS ai_recommendations TEXT[],
ADD COLUMN IF NOT EXISTS trend_indicator TEXT; -- up, down, stable

-- Create a table for deeper AI insights and "What to do now" suggestions
CREATE TABLE IF NOT EXISTS public.okr_ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID REFERENCES public.okr_objectives(id) ON DELETE CASCADE,
    key_result_id UUID REFERENCES public.okr_key_results(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- diagnostic, cause, action, alert
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'medium', -- low, medium, high, critical
    is_resolved BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS for the new table
ALTER TABLE public.okr_ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read OKR insights" ON public.okr_ai_insights FOR SELECT USING (true);

-- Ensure we have a trigger to clean up alerts if a KR is back on track
CREATE OR REPLACE FUNCTION public.check_kr_health()
RETURNS TRIGGER AS $$
BEGIN
    -- If KR is above 90% and there was an alert, we could resolve it
    -- This is a placeholder for logic that can be expanded
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
