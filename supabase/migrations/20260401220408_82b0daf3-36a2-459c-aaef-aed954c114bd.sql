
CREATE TABLE public.crm_quick_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'geral',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read quick replies" ON public.crm_quick_replies FOR SELECT TO public USING (true);
CREATE POLICY "Public insert quick replies" ON public.crm_quick_replies FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update quick replies" ON public.crm_quick_replies FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete quick replies" ON public.crm_quick_replies FOR DELETE TO public USING (true);

CREATE TRIGGER update_crm_quick_replies_updated_at
BEFORE UPDATE ON public.crm_quick_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
