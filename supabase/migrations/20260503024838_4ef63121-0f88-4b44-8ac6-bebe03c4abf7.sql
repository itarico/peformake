-- Add monthly support to OKR objectives
ALTER TABLE public.okr_objectives ADD COLUMN IF NOT EXISTS cycle_month INTEGER;
ALTER TABLE public.okr_objectives ADD COLUMN IF NOT EXISTS is_client_visible BOOLEAN DEFAULT false;
ALTER TABLE public.okr_objectives ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE public.okr_objectives ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- Add template flag to Key Results
ALTER TABLE public.okr_key_results ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

-- Enable RLS on OKR tables if not already enabled
ALTER TABLE public.okr_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_initiatives ENABLE ROW LEVEL SECURITY;

-- Create policies for client access
-- Clients can see OKRs that are marked as visible and belong to them
CREATE POLICY "Clients can view their own OKRs"
ON public.okr_objectives
FOR SELECT
TO authenticated
USING (
  (client_id IS NOT NULL AND client_id IN (SELECT id FROM public.clients)) OR
  (is_client_visible = true)
);

CREATE POLICY "Clients can view their OKR Key Results"
ON public.okr_key_results
FOR SELECT
TO authenticated
USING (
  objective_id IN (SELECT id FROM public.okr_objectives)
);

CREATE POLICY "Clients can view their OKR Initiatives"
ON public.okr_initiatives
FOR SELECT
TO authenticated
USING (
  key_result_id IN (SELECT id FROM public.okr_key_results)
);

-- Internal users (staff) can do everything
CREATE POLICY "Staff can manage all OKRs"
ON public.okr_objectives
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Staff can manage all Key Results"
ON public.okr_key_results
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Staff can manage all Initiatives"
ON public.okr_initiatives
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
