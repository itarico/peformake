
-- Tabela de Objetivos
CREATE TABLE public.okr_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cycle_quarter INTEGER NOT NULL CHECK (cycle_quarter BETWEEN 1 AND 4),
  cycle_year INTEGER NOT NULL,
  owner_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  progress NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.okr_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage okr_objectives"
  ON public.okr_objectives FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read okr_objectives"
  ON public.okr_objectives FOR SELECT TO anon
  USING (true);

CREATE TRIGGER update_okr_objectives_updated_at
  BEFORE UPDATE ON public.okr_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de Key Results
CREATE TABLE public.okr_key_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.okr_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  metric_unit TEXT DEFAULT '%',
  start_value NUMERIC(12,2) DEFAULT 0,
  current_value NUMERIC(12,2) DEFAULT 0,
  target_value NUMERIC(12,2) NOT NULL,
  owner_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  confidence_level INTEGER DEFAULT 5 CHECK (confidence_level BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.okr_key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage okr_key_results"
  ON public.okr_key_results FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read okr_key_results"
  ON public.okr_key_results FOR SELECT TO anon
  USING (true);

CREATE TRIGGER update_okr_key_results_updated_at
  BEFORE UPDATE ON public.okr_key_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de Iniciativas
CREATE TABLE public.okr_initiatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_result_id UUID NOT NULL REFERENCES public.okr_key_results(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  owner_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.okr_initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage okr_initiatives"
  ON public.okr_initiatives FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read okr_initiatives"
  ON public.okr_initiatives FOR SELECT TO anon
  USING (true);

CREATE TRIGGER update_okr_initiatives_updated_at
  BEFORE UPDATE ON public.okr_initiatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para recalcular progresso do objetivo
CREATE OR REPLACE FUNCTION public.recalculate_okr_objective_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_objective_id UUID;
  v_avg_progress NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_objective_id := OLD.objective_id;
  ELSE
    v_objective_id := NEW.objective_id;
  END IF;

  SELECT COALESCE(AVG(
    CASE 
      WHEN target_value - start_value = 0 THEN 0
      ELSE LEAST(((current_value - start_value) / NULLIF(target_value - start_value, 0)) * 100, 100)
    END
  ), 0) INTO v_avg_progress
  FROM public.okr_key_results
  WHERE objective_id = v_objective_id;

  UPDATE public.okr_objectives
  SET progress = ROUND(v_avg_progress, 2)
  WHERE id = v_objective_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recalc_okr_progress_on_kr_change
  AFTER INSERT OR UPDATE OF current_value, start_value, target_value OR DELETE
  ON public.okr_key_results
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_okr_objective_progress();
