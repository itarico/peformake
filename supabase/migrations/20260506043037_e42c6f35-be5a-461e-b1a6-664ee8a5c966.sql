-- Adicionar hierarquia e liderança aos squads
ALTER TABLE public.staff_squads 
ADD COLUMN IF NOT EXISTS parent_squad_id UUID REFERENCES public.staff_squads(id),
ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES public.staff_members(id),
ADD COLUMN IF NOT EXISTS productivity_target NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS kpis_config JSONB DEFAULT '{}'::jsonb;

-- Adicionar papéis específicos dentro do squad
ALTER TABLE public.staff_squad_members
ADD COLUMN IF NOT EXISTS role_in_squad TEXT DEFAULT 'member' CHECK (role_in_squad IN ('leader', 'member', 'support'));

-- Criar tabela para logs de produtividade de squad (opcional, mas útil para histórico)
CREATE TABLE IF NOT EXISTS public.staff_squad_productivity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID REFERENCES public.staff_squads(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    productivity_score NUMERIC DEFAULT 0,
    kpi_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na nova tabela
ALTER TABLE public.staff_squad_productivity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to squad productivity logs"
ON public.staff_squad_productivity_logs
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM staff_members WHERE id = auth.uid() AND role = 'admin'));
