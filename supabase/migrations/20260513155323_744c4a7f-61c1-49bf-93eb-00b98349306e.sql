CREATE OR REPLACE FUNCTION get_total_unique_revenue(p_entity TEXT DEFAULT 'all', p_month INTEGER DEFAULT NULL, p_year INTEGER DEFAULT NULL)
RETURNS NUMERIC AS $$
DECLARE
    total_rev NUMERIC;
    v_month INTEGER;
    v_year INTEGER;
BEGIN
    v_month := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

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
    mrr_rev AS (
        SELECT 
            COALESCE(SUM(se.price * se.quantity), 0) as total
        FROM service_entities se
        WHERE (p_entity = 'all' OR se.service_entity = p_entity)
    ),
    one_off_rev AS (
        SELECT 
            COALESCE(SUM(amount), 0) as total
        FROM other_revenues
        WHERE EXTRACT(MONTH FROM date) = v_month 
          AND EXTRACT(YEAR FROM date) = v_year
          AND (p_entity = 'all' OR entity = p_entity)
          AND is_fixed = false
    )
    SELECT (mrr.total + off.total) INTO total_rev
    FROM mrr_rev mrr, one_off_rev off;

    RETURN total_rev;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;