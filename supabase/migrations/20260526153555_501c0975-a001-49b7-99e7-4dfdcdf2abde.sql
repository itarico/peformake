-- SDR Leads
DROP POLICY IF EXISTS "leads_authenticated_write" ON public.sdr_leads;
DROP POLICY IF EXISTS "leads_authenticated_update" ON public.sdr_leads;
CREATE POLICY "Staff can manage sdr leads" ON public.sdr_leads FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Audiovisual Comments
DROP POLICY IF EXISTS "Public can add audiovisual comments" ON public.audiovisual_comments;
CREATE POLICY "Staff can add audiovisual comments" ON public.audiovisual_comments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- SDR Search Cache
DROP POLICY IF EXISTS "SDRs can insert search cache" ON public.sdr_search_cache;
CREATE POLICY "Staff can insert search cache" ON public.sdr_search_cache FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- Ensure RLS is enabled
ALTER TABLE public.sdr_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audiovisual_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_search_cache ENABLE ROW LEVEL SECURITY;
