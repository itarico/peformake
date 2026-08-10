
-- Tabela de configuração OTE por cargo
CREATE TABLE public.ote_role_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  ote_target NUMERIC(12,2) NOT NULL DEFAULT 0,
  split_fixed INTEGER NOT NULL DEFAULT 60 CHECK (split_fixed BETWEEN 0 AND 100),
  split_variable INTEGER GENERATED ALWAYS AS (100 - split_fixed) STORED,
  accelerator_type TEXT NOT NULL DEFAULT 'linear' CHECK (accelerator_type IN ('linear', 'accelerated', 'none')),
  accelerator_multiplier NUMERIC(4,2) DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ote_role_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage ote_role_configs"
  ON public.ote_role_configs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read ote_role_configs"
  ON public.ote_role_configs FOR SELECT TO anon
  USING (true);

CREATE TRIGGER update_ote_role_configs_updated_at
  BEFORE UPDATE ON public.ote_role_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de critérios OTE por cargo
CREATE TABLE public.ote_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_config_id UUID NOT NULL REFERENCES public.ote_role_configs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weight_percent NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (weight_percent BETWEEN 0 AND 100),
  measurement_type TEXT NOT NULL DEFAULT 'percentage' CHECK (measurement_type IN ('percentage', 'count', 'boolean', 'currency')),
  target_value NUMERIC(12,2) DEFAULT 100,
  criteria_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ote_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage ote_criteria"
  ON public.ote_criteria FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read ote_criteria"
  ON public.ote_criteria FOR SELECT TO anon
  USING (true);

CREATE TRIGGER update_ote_criteria_updated_at
  BEFORE UPDATE ON public.ote_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vincular staff ao cargo OTE
ALTER TABLE public.staff_members
  ADD COLUMN ote_role_config_id UUID REFERENCES public.ote_role_configs(id) ON DELETE SET NULL;

-- Inserir cargos padrão
INSERT INTO public.ote_role_configs (role_name, base_salary, ote_target, split_fixed) VALUES
  ('Designer', 0, 0, 60),
  ('Social Media', 0, 0, 60),
  ('Gestor de Contas', 0, 0, 60),
  ('Gestor de Tráfego', 0, 0, 60),
  ('Videomaker', 0, 0, 60);
