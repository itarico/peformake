-- Create table for dashboard pending tasks/arts
CREATE TABLE public.dashboard_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.staff_members(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_tasks ENABLE ROW LEVEL SECURITY;

-- Staff can manage dashboard tasks
CREATE POLICY "Staff can manage dashboard tasks"
ON public.dashboard_tasks
FOR ALL
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));

-- Anyone can view tasks (for staff members without auth)
CREATE POLICY "Anyone can view dashboard tasks"
ON public.dashboard_tasks
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_dashboard_tasks_updated_at
BEFORE UPDATE ON public.dashboard_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();