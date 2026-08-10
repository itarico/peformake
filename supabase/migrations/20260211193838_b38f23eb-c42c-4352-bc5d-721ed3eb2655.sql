
-- =============================================
-- MÓDULO DE GESTÃO EMPRESARIAL - MIGRAÇÃO
-- =============================================

-- 1. Tabela: agency_expenses
CREATE TABLE public.agency_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_recurring BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage expenses"
  ON public.agency_expenses FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_agency_expenses_updated_at
  BEFORE UPDATE ON public.agency_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela: client_events
CREATE TABLE public.client_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage client events"
  ON public.client_events FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- 3. Tabela: team_production_logs
CREATE TABLE public.team_production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  production_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  revenue_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage production logs"
  ON public.team_production_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- 4. Tabela: client_team_assignments
CREATE TABLE public.client_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  responsibility_percent NUMERIC NOT NULL DEFAULT 100,
  role_in_client TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, staff_member_id)
);

ALTER TABLE public.client_team_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage team assignments"
  ON public.client_team_assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_client_team_assignments_updated_at
  BEFORE UPDATE ON public.client_team_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Campos adicionais em clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'recurring',
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS acquisition_channel TEXT;

-- 6. Campos adicionais em staff_members
ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_capacity INTEGER NOT NULL DEFAULT 20;

-- 7. Trigger: auto-criar client_event 'joined' ao criar cliente
CREATE OR REPLACE FUNCTION public.auto_create_client_joined_event()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_events (client_id, event_type, event_date)
  VALUES (NEW.id, 'joined', CURRENT_DATE);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_client_created_add_joined_event
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_client_joined_event();
