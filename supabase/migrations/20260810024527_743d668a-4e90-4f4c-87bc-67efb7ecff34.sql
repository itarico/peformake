CREATE TABLE public.operation_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  service_type text NOT NULL,
  project_id uuid REFERENCES public.audiovisual_projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  opens_at date,
  due_date date,
  completed_at timestamptz,
  completed_by uuid,
  asset_url text,
  notes text,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX operation_deliverables_unique_idx
  ON public.operation_deliverables (client_id, year, month, service_type, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX operation_deliverables_period_idx ON public.operation_deliverables (year, month);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_deliverables TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.operation_deliverables TO anon;
GRANT ALL ON public.operation_deliverables TO service_role;

ALTER TABLE public.operation_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view deliverables"
  ON public.operation_deliverables FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert deliverables"
  ON public.operation_deliverables FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can update deliverables"
  ON public.operation_deliverables FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can delete deliverables"
  ON public.operation_deliverables FOR DELETE
  TO service_role
  USING (true);

CREATE TRIGGER update_operation_deliverables_updated_at
  BEFORE UPDATE ON public.operation_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.audiovisual_projects
  ADD COLUMN IF NOT EXISTS client_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS google_event_id text;