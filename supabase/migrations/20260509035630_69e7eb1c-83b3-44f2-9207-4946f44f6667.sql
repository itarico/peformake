-- Add improvement_direction and goal_type to staff_goal_templates
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_goal_templates' AND column_name = 'improvement_direction') THEN
        ALTER TABLE public.staff_goal_templates ADD COLUMN improvement_direction TEXT DEFAULT 'up' CHECK (improvement_direction IN ('up', 'down'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_goal_templates' AND column_name = 'goal_type') THEN
        ALTER TABLE public.staff_goal_templates ADD COLUMN goal_type TEXT DEFAULT 'quantity' CHECK (goal_type IN ('quantity', 'time', 'rate'));
    END IF;
END $$;

-- Deactivate duplicate templates
UPDATE public.staff_goal_templates 
SET is_active = false 
WHERE id IN (
    '2e3c27fc-3828-400a-90a7-5635950adadb', -- Design - Prazo SLA (Horas) - Redundant with Tempo de Entrega
    '83373038-772f-43b1-a800-6969d69e4da1', -- SDR - Reuniões Agendadas - Redundant
    'be558013-9782-45ef-be06-b1bff85d6ae1', -- SDR - Taxa de Conversão - Redundant
    '19f0e1ae-c19b-4c66-a1f2-bc2abf38b46a'  -- Postagens Realizadas - Redundant
);

-- Update Designer: Tempo de Entrega (Média) query and direction
UPDATE public.staff_goal_templates
SET 
    improvement_direction = 'down',
    goal_type = 'time',
    tracking_query = 'SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (a.completed_at - a.briefing_completed_at))/3600), 0) FROM public.arts a WHERE (a.designer_id = :staff_id OR a.client_id IN (SELECT client_id FROM client_team_assignments WHERE staff_member_id = :staff_id AND role_in_client = ''designer'')) AND a.status = ''approved'' AND a.briefing_completed_at IS NOT NULL AND EXTRACT(MONTH FROM a.completed_at) = :month AND EXTRACT(YEAR FROM a.completed_at) = :year'
WHERE id = '4fea95fd-6f3c-4b51-b318-4c09df7b9cf3';

-- Update other goals type and direction
UPDATE public.staff_goal_templates SET goal_type = 'rate', improvement_direction = 'up' WHERE name LIKE '%Taxa%' OR name LIKE '%ROI%' OR name LIKE '%ROAS%';
UPDATE public.staff_goal_templates SET goal_type = 'time', improvement_direction = 'down' WHERE name LIKE '%Tempo%' OR name LIKE '%Prazo%' OR name LIKE '%SLA%';
UPDATE public.staff_goal_templates SET goal_type = 'quantity' WHERE name LIKE '%Postagens%' OR name LIKE '%Agendamentos%' OR name LIKE '%Leads%' OR name LIKE '%Contratos%';

-- Ensure staff_members has individual commission fields (already exists but ensuring default 0)
ALTER TABLE public.staff_members ALTER COLUMN indication_commission SET DEFAULT 0;
ALTER TABLE public.staff_members ALTER COLUMN double_goal_commission SET DEFAULT 0;
ALTER TABLE public.staff_members ALTER COLUMN early_delivery_commission SET DEFAULT 0;
