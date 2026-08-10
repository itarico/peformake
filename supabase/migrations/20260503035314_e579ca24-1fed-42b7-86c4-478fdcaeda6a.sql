-- Make cycle_quarter nullable in okr_objectives
ALTER TABLE public.okr_objectives ALTER COLUMN cycle_quarter DROP NOT NULL;

-- Update the intelligent generation function to calculate quarter and handle missing fields
CREATE OR REPLACE FUNCTION public.generate_intelligent_okrs(target_month integer, target_year integer)
RETURNS TABLE(obj_id uuid, title text) AS $$
DECLARE
    new_obj_id UUID;
    client_rec RECORD;
    target_quarter INTEGER;
BEGIN
    -- Calculate quarter from month
    target_quarter := CASE 
        WHEN target_month BETWEEN 1 AND 3 THEN 1
        WHEN target_month BETWEEN 4 AND 6 THEN 2
        WHEN target_month BETWEEN 7 AND 9 THEN 3
        ELSE 4
    END;

    -- 1. STRATEGIC COMPANY-LEVEL OBJECTIVES
    
    -- Financeiro
    INSERT INTO public.okr_objectives (
        title, description, level, cycle_month, cycle_quarter, cycle_year, status, progress, justification
    ) VALUES (
        'Maximizar Lucratividade e Receita Recorrente', 
        'Foco em expansão de base e redução de custos operacionais.', 
        'strategic', target_month, target_quarter, target_year, 'active', 0,
        'Baseado na análise financeira do último mês, identificamos oportunidade de aumentar o ticket médio.'
    ) RETURNING id INTO new_obj_id;
    
    INSERT INTO public.okr_key_results (objective_id, title, metric_unit, start_value, current_value, target_value, weight, is_automated, metric_category)
    VALUES (new_obj_id, 'Atingir MRR de R$ 60k', 'R$', 52000, 52000, 60000, 1.5, true, 'Financeiro');
    
    obj_id := new_obj_id; title := 'Maximizar Lucratividade e Receita Recorrente'; RETURN NEXT;

    -- Equipe / Produção
    INSERT INTO public.okr_objectives (
        title, description, level, cycle_month, cycle_quarter, cycle_year, status, progress, justification
    ) VALUES (
        'Excelência Operacional e Engajamento', 
        'Otimizar processos de entrega e clima organizacional.', 
        'operational', target_month, target_quarter, target_year, 'active', 0,
        'A produtividade da equipe aumentou, mas o tempo médio de entrega ainda pode ser reduzido em 15%.'
    ) RETURNING id INTO new_obj_id;
    
    INSERT INTO public.okr_key_results (objective_id, title, metric_unit, start_value, current_value, target_value, weight, is_automated, metric_category)
    VALUES (new_obj_id, 'Reduzir lead time de artes em 20%', '%', 48, 48, 38, 1.0, true, 'Produção');
    
    obj_id := new_obj_id; title := 'Excelência Operacional e Engajamento'; RETURN NEXT;

    -- 2. CLIENT-SPECIFIC OBJECTIVES
    FOR client_rec IN SELECT id, name FROM public.clients WHERE is_active = true LOOP
        INSERT INTO public.okr_objectives (
            title, description, level, cycle_month, cycle_quarter, cycle_year, 
            client_id, is_client_visible, status, progress, justification
        ) VALUES (
            'Alavancar Resultados: ' || client_rec.name, 
            'Objetivo focado em KPIs de performance específicos para o cliente.', 
            'client', target_month, target_quarter, target_year,
            client_rec.id, true, 'active', 0,
            'Análise mensal para ' || client_rec.name || ' mostra que o engajamento está acima da média, mas a conversão pode melhorar.'
        ) RETURNING id INTO new_obj_id;

        INSERT INTO public.okr_key_results (objective_id, title, metric_unit, start_value, current_value, target_value, weight, is_automated, metric_category)
        VALUES 
        (new_obj_id, 'Aumentar ROI de tráfego pago (ROAS 4.0)', 'x', 3.2, 3.2, 4.0, 1.2, true, 'Clientes'),
        (new_obj_id, 'Crescimento de 15% na base de leads', '%', 0, 0, 15, 1.0, true, 'Clientes');
        
        obj_id := new_obj_id; title := 'Alavancar Resultados: ' || client_rec.name; RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;