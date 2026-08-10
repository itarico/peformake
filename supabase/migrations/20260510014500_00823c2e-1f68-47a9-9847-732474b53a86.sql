INSERT INTO public.staff_goal_templates (name, description, target_role, target_value, measurement_unit, tracking_method, category, goal_type)
VALUES 
('Clientes Ativos (Editor)', 'Número de clientes ativos sob responsabilidade do editor.', 'editor', 5, 'clientes', 'automatic', 'operational', 'quantity'),
('Stories por Cliente', 'Média de stories produzidos por cliente mensalmente.', 'social_media', 20, 'stories/cliente', 'automatic', 'operational', 'quantity')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    target_role = EXCLUDED.target_role,
    target_value = EXCLUDED.target_value,
    measurement_unit = EXCLUDED.measurement_unit,
    tracking_method = EXCLUDED.tracking_method,
    category = EXCLUDED.category,
    goal_type = EXCLUDED.goal_type;