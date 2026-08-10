-- Corrige a visão staff_managed_revenue removendo o erro de sintaxe e tratando duplicidade
CREATE OR REPLACE VIEW public.staff_managed_revenue AS
WITH client_revenue AS (
    -- Calcula receita total por cliente baseada em serviços
    SELECT 
        client_id,
        SUM(COALESCE(price, 0) * COALESCE(quantity, 1)) as total_rev
    FROM public.client_services
    GROUP BY client_id
),
staff_client_links AS (
    -- Consolida todos os clientes únicos vinculados a cada membro (direto ou squad)
    -- O UNION garante a remoção de duplicatas automáticas
    SELECT staff_member_id as staff_id, client_id
    FROM public.client_team_assignments
    
    UNION
    
    SELECT ssm.staff_id, c.id as client_id
    FROM public.staff_squad_members ssm
    JOIN public.clients c ON c.squad_id = ssm.squad_id
)
SELECT 
    scl.staff_id,
    COALESCE(SUM(cr.total_rev), 0) as total_managed_revenue
FROM staff_client_links scl
JOIN client_revenue cr ON cr.client_id = scl.client_id
GROUP BY scl.staff_id;
