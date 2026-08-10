-- Adicionar campos de vinculação de comissão em templates de metas
ALTER TABLE public.staff_goal_templates 
ADD COLUMN IF NOT EXISTS min_threshold NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS commission_template_id UUID REFERENCES public.staff_commission_templates(id);

-- Garantir que a tabela de metas atribuídas tenha campos de acompanhamento
ALTER TABLE public.staff_assigned_goals
ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'paid'));

-- Criar função para atualizar progresso de metas automaticamente (exemplo básico)
CREATE OR REPLACE FUNCTION public.update_staff_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a meta atingir o threshold, podemos marcar como completa
    IF NEW.current_value >= (SELECT min_threshold FROM staff_goal_templates WHERE id = NEW.template_id) THEN
        NEW.status := 'completed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para metas
DROP TRIGGER IF EXISTS tr_update_staff_goal_progress ON public.staff_assigned_goals;
CREATE TRIGGER tr_update_staff_goal_progress
BEFORE UPDATE ON public.staff_assigned_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_staff_goal_progress();

-- Garantir estrutura correta da tabela de squads (correção de staff_id vs staff_member_id)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_squad_members' AND column_name = 'staff_member_id') THEN
    ALTER TABLE public.staff_squad_members RENAME COLUMN staff_member_id TO staff_id;
  END IF;
END $$;
