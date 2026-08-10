-- No changes to schema needed for now as we have sdr_leads. 
-- We might want a table to cache search results.
CREATE TABLE IF NOT EXISTS public.sdr_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_params JSONB NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sdr_search_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SDRs can view search cache" ON public.sdr_search_cache FOR SELECT USING (true);
CREATE POLICY "SDRs can insert search cache" ON public.sdr_search_cache FOR INSERT WITH CHECK (true);
