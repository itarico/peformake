
CREATE TABLE public.staff_client_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  payment_value NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (staff_member_id, client_id)
);

ALTER TABLE public.staff_client_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated read" ON public.staff_client_payments FOR SELECT USING (true);
CREATE POLICY "Allow all authenticated insert" ON public.staff_client_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all authenticated update" ON public.staff_client_payments FOR UPDATE USING (true);
CREATE POLICY "Allow all authenticated delete" ON public.staff_client_payments FOR DELETE USING (true);

CREATE TRIGGER update_staff_client_payments_updated_at
  BEFORE UPDATE ON public.staff_client_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
