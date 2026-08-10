
CREATE TABLE public.service_page_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_slug TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image',
  title TEXT,
  description TEXT,
  media_url TEXT,
  metric_value TEXT,
  metric_label TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active service content"
ON public.service_page_content
FOR SELECT
USING (true);

CREATE POLICY "Admin can manage service content"
ON public.service_page_content
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_service_page_content_slug ON public.service_page_content(service_slug);
