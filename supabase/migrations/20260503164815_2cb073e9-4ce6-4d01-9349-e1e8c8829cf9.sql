-- Seed/Update Leader automatic templates
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, tracking_query, is_active)
VALUES 
(
  'Líder - Satisfação dos Clientes', 
  'Média de satisfação (NPS) dos clientes da agência.', 
  9, 
  'nota', 
  'automatic', 
  'admin',
  'SELECT COALESCE(avg(score), 0) FROM client_satisfaction_responses WHERE created_at >= date_trunc(''month'', now())',
  true
),
(
  'Líder - Reuniões Estratégicas', 
  'Número de reuniões de consultoria/sucesso realizadas no mês.', 
  10, 
  'reuniões', 
  'automatic', 
  'admin',
  'SELECT count(*) FROM consulting_months WHERE is_complete = true AND updated_at >= date_trunc(''month'', now())',
  true
)
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description,
    target_value = EXCLUDED.target_value,
    measurement_unit = EXCLUDED.measurement_unit,
    tracking_method = EXCLUDED.tracking_method,
    target_role = EXCLUDED.target_role,
    tracking_query = EXCLUDED.tracking_query;
