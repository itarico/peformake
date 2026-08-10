CREATE OR REPLACE FUNCTION get_staff_managed_revenue_by_entity(p_entity text DEFAULT 'all')
RETURNS TABLE (
    staff_id uuid,
    total_managed_revenue numeric
) AS $$
BEGIN
    RETURN QUERY
    WITH service_entities AS (
        SELECT 
            cs.id as client_service_id,
            cs.client_id,
            cs.price,
            cs.quantity,
            CASE 
                WHEN s.slug ILIKE ANY (ARRAY['%audiovisual%', '%video%', '%reels%', '%filmagem%', '%producao-video%', '%producao_audiovisual%', '%edicao%', '%edição%', '%drone%', '%captacao%', '%captação%', '%fotografia%', '%fotográfia%']) 
                  OR s.name ILIKE ANY (ARRAY['%audiovisual%', '%video%', '%reels%', '%filmagem%', '%producao-video%', '%producao_audiovisual%', '%edicao%', '%edição%', '%drone%', '%captacao%', '%captação%', '%fotografia%', '%fotográfia%'])
                THEN 'ellcazo'
                ELSE 'peformake'
            END as service_entity
        FROM client_services cs
        JOIN services s ON s.id = cs.service_id
        WHERE cs.is_active = true
    ),
    client_revenue AS (
        SELECT 
            se.client_id,
            sum(COALESCE(se.price, 0) * COALESCE(se.quantity, 1)) AS total_rev
        FROM service_entities se
        WHERE (p_entity = 'all' OR se.service_entity = p_entity)
        GROUP BY se.client_id
    ),
    staff_client_links AS (
        SELECT client_team_assignments.staff_member_id AS staff_id,
            client_team_assignments.client_id
        FROM client_team_assignments
        UNION
        SELECT ssm.staff_id,
            c.id AS client_id
        FROM staff_squad_members ssm
        JOIN clients c ON c.squad_id = ssm.squad_id
    )
    SELECT 
        scl.staff_id,
        COALESCE(sum(cr.total_rev), 0) AS total_managed_revenue
    FROM staff_client_links scl
    JOIN client_revenue cr ON cr.client_id = scl.client_id
    GROUP BY scl.staff_id;
END;
$$ LANGUAGE plpgsql STABLE;
