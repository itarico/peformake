-- Add columns for better initiative management
ALTER TABLE public.okr_initiatives 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium', -- low, medium, high, critical
ADD COLUMN IF NOT EXISTS responsible_staff_id UUID REFERENCES public.staff_members(id);

-- Add justification to objectives
ALTER TABLE public.okr_objectives
ADD COLUMN IF NOT EXISTS justification TEXT;

-- Create a table for metric source definitions if not exists
CREATE TABLE IF NOT EXISTS public.okr_metric_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- Financeiro, Produção, Clientes, Equipe
    metric_name TEXT NOT NULL,
    source_query TEXT, -- SQL or identifier for edge function
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default mappings
INSERT INTO public.okr_metric_sources (category, metric_name, source_query)
VALUES 
('Financeiro', 'MRR', 'SELECT SUM(price_per_month) FROM subscriptions WHERE status = ''active'''),
('Produção', 'Arts Delivered', 'SELECT COUNT(*) FROM tasks WHERE status = ''completed'' AND type = ''art'''),
('Clientes', 'NPS', 'SELECT AVG(score) FROM feedback'),
('Equipe', 'Overdue Tasks', 'SELECT COUNT(*) FROM tasks WHERE due_date < now() AND status != ''completed''')
ON CONFLICT DO NOTHING;

-- Enhanced Function to generate OKRs with logic
CREATE OR REPLACE FUNCTION public.generate_intelligent_okrs(target_month integer, target_year integer)
RETURNS TABLE (obj_id UUID, obj_title TEXT) AS $$
DECLARE
    new_obj_id UUID;
BEGIN
    -- Objective 1: Financeiro (Aumentar Receita Recorrente)
    INSERT INTO public.okr_objectives (
        title, description, level, cycle_month, cycle_year, status, progress, justification
    ) VALUES (
        'Acelerar Crescimento de Receita (MRR)', 
        'Foco em expansão de base e redução de cancelamentos.', 
        'strategic', target_month, target_year, 'active', 0,
        'Baseado na tendência de crescimento de 5% no mês anterior, podemos chegar a 8% com estas ações.'
    ) RETURNING id INTO new_obj_id;
    
    INSERT INTO public.okr_key_results (objective_id, title, metric_unit, start_value, current_value, target_value, weight, is_automated, metric_category)
    VALUES (new_obj_id, 'Atingir MRR de R$ 50k', 'R$', 42000, 42000, 50000, 1.5, true, 'Financeiro');
    
    obj_id := new_obj_id;
    obj_title := 'Receita';
    RETURN NEXT;

    -- Objective 2: Produção (Eficiência Operacional)
    INSERT INTO public.okr_objectives (
        title, description, level, cycle_month, cycle_year, status, progress, justification
    ) VALUES (
        'Otimizar Entrega e Qualidade Criativa', 
        'Reduzir tempo de refação e aumentar volume de entregas.', 
        'operational', target_month, target_year, 'active', 0,
        'O volume de artes subiu 20%, precisamos garantir que o gargalo de revisão não atrase os prazos.'
    ) RETURNING id INTO new_obj_id;
    
    INSERT INTO public.okr_key_results (objective_id, title, metric_unit, start_value, current_value, target_value, weight, is_automated, metric_category)
    VALUES (new_obj_id, 'Reduzir taxa de refação para < 10%', '%', 15, 15, 10, 1.0, true, 'Produção');
    
    obj_id := new_obj_id;
    obj_title := 'Produção';
    RETURN NEXT;

    -- Objective 3: Clientes (Sucesso do Cliente)
    INSERT INTO public.okr_objectives (
        title, description, level, cycle_month, cycle_year, status, progress, justification
    ) VALUES (
        'Elevar a Satisfação e Retenção de Clientes', 
        'Focar em CS e NPS para diminuir o Churn.', 
        'client', target_month, target_year, 'active', 0,
        'Clientes satisfeitos indicam mais. Nossa meta é transformar 20% da base em promotores.'
    ) RETURNING id INTO new_obj_id;
    
    INSERT INTO public.okr_key_results (objective_id, title, metric_unit, start_value, current_value, target_value, weight, is_automated, metric_category)
    VALUES (new_obj_id, 'Aumentar NPS médio para 85', 'pontos', 72, 72, 85, 1.2, true, 'Clientes');
    
    obj_id := new_obj_id;
    obj_title := 'Clientes';
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
