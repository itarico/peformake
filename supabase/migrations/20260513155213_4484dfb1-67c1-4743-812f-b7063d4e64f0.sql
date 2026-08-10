CREATE OR REPLACE FUNCTION get_total_unique_revenue(p_entity TEXT DEFAULT 'all')
RETURNS NUMERIC AS $$
DECLARE
    total_rev NUMERIC;
BEGIN
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
    )
    SELECT 
        COALESCE(SUM(se.price * se.quantity), 0) INTO total_rev
    FROM service_entities se
    WHERE (p_entity = 'all' OR se.service_entity = p_entity);

    RETURN total_rev;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;