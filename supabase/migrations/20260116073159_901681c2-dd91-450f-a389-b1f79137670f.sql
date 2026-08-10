-- Create table to store content analyses (Design, Video, Social Media, Campaign)
CREATE TABLE public.content_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulting_month_id UUID REFERENCES public.consulting_months(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('video', 'design', 'social_media', 'campaign')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(consulting_month_id, category)
);

-- Enable RLS
ALTER TABLE public.content_analyses ENABLE ROW LEVEL SECURITY;

-- Create policy for staff access (all access)
CREATE POLICY "Staff can manage content analyses"
ON public.content_analyses
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create update trigger
CREATE TRIGGER update_content_analyses_updated_at
BEFORE UPDATE ON public.content_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table to store Firecrawl research data for each instance
CREATE TABLE public.firecrawl_research_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.framework_instances(id) ON DELETE CASCADE,
  consulting_month_id UUID REFERENCES public.consulting_months(id) ON DELETE CASCADE,
  source_url TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('scrape', 'search', 'manual')),
  title TEXT,
  content TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.firecrawl_research_data ENABLE ROW LEVEL SECURITY;

-- Create policy for staff access
CREATE POLICY "Staff can manage firecrawl research data"
ON public.firecrawl_research_data
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create table to store seasonality calendar dates
CREATE TABLE public.seasonality_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulting_month_id UUID REFERENCES public.consulting_months(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  importance TEXT DEFAULT 'normal' CHECK (importance IN ('low', 'normal', 'high')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seasonality_dates ENABLE ROW LEVEL SECURITY;

-- Create policy for staff access
CREATE POLICY "Staff can manage seasonality dates"
ON public.seasonality_dates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);