
-- Table for per-client operational expenses
CREATE TABLE public.client_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  category text NOT NULL DEFAULT 'operacional',
  description text,
  amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage client expenses"
ON public.client_expenses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view client expenses"
ON public.client_expenses FOR SELECT
USING (is_staff(auth.uid()));
