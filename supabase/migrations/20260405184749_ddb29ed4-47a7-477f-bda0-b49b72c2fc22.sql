
CREATE TABLE public.planning_task_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  task_date DATE NOT NULL,
  task_key TEXT NOT NULL,
  task_description TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_member_id, client_id, task_date, task_key)
);

ALTER TABLE public.planning_task_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to planning_task_checks"
  ON public.planning_task_checks FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_planning_task_checks_updated_at
  BEFORE UPDATE ON public.planning_task_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
