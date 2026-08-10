CREATE OR REPLACE FUNCTION get_staff_managed_revenue_split()
RETURNS TABLE (
    staff_id uuid,
    peformake_revenue numeric,
    ellcazo_revenue numeric
) AS $$
BEGIN
    RETURN QUERY
    WITH service_entities AS (
        SELECT 
            cs.client_id,
            COALESCE(cs.price, 0) * COALESCE(cs.quantity, 1) as rev,
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
    client_split AS (
        SELECT 
            se.client_id,
            sum(CASE WHEN se.service_entity = 'peformake' THEN se.rev ELSE 0 END) as p_rev,
            sum(CASE WHEN se.service_entity = 'ellcazo' THEN se.rev ELSE 0 END) as e_rev
        FROM service_entities se
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
        COALESCE(sum(cs.p_rev), 0) as peformake_revenue,
        COALESCE(sum(cs.e_rev), 0) as ellcazo_revenue
    FROM staff_client_links scl
    JOIN client_split cs ON cs.client_id = scl.client_id
    GROUP BY scl.staff_id;
END;
$$ LANGUAGE plpgsql STABLE;
