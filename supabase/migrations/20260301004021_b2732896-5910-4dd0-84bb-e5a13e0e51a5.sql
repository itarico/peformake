
-- Allow anonymous users (portal) to view content_analyses
CREATE POLICY "Anon can view content analyses"
  ON public.content_analyses
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anonymous users (portal) to view firecrawl_research_data
CREATE POLICY "Anon can view firecrawl research data"
  ON public.firecrawl_research_data
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anonymous users (portal) to update consulting_months (for monthly_focus from quiz)
CREATE POLICY "Anon can update consulting months"
  ON public.consulting_months
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
