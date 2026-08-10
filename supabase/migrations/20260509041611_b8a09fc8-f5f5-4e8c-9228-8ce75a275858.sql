-- Adicionar colunas para suporte a metas de prazo e média se não existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'staff_goal_templates' AND column_name = 'goal_type') THEN
        ALTER TABLE public.staff_goal_templates ADD COLUMN goal_type TEXT DEFAULT 'quantity';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'staff_goal_templates' AND column_name = 'improvement_direction') THEN
        ALTER TABLE public.staff_goal_templates ADD COLUMN improvement_direction TEXT DEFAULT 'up';
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN public.staff_goal_templates.goal_type IS 'Tipo da meta: quantity (quantidade), sla (prazo/SLA), average (média/taxa)';
COMMENT ON COLUMN public.staff_goal_templates.improvement_direction IS 'Direção da melhoria: up (maior é melhor), down (menor é melhor)';

-- Criar função para calcular comissão automática se não existir
CREATE OR REPLACE FUNCTION public.calculate_member_commission(p_staff_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    v_total_managed_revenue DECIMAL;
    v_staff_record RECORD;
    v_performance_percent DECIMAL;
    v_base_salary DECIMAL;
    v_variable_salary DECIMAL;
    v_commission_indication DECIMAL := 0;
    v_commission_double_goal DECIMAL := 0;
    v_commission_early_delivery DECIMAL := 0;
    v_total_pay DECIMAL;
BEGIN
    -- Obter receita gerenciada
    SELECT total_managed_revenue INTO v_total_managed_revenue
    FROM public.staff_managed_revenue
    WHERE staff_id = p_staff_id;

    IF v_total_managed_revenue IS NULL THEN
        v_total_managed_revenue := 0;
    END IF;

    -- Obter configuração do membro
    SELECT * INTO v_staff_record
    FROM public.staff_members
    WHERE id = p_staff_id;

    IF v_staff_record IS NULL THEN
        RETURN 0;
    END IF;

    -- Calcular performance (simplificado para o exemplo, idealmente baseado em staff_assigned_goals)
    -- Para fins de demonstração, assumimos que as metas são sincronizadas na UI
    -- Aqui poderíamos implementar uma lógica complexa de agregação de metas
    
    RETURN v_total_managed_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
