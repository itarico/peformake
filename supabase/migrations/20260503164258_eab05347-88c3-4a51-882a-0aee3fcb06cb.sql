-- Add tracking query column for automatic measurement
ALTER TABLE public.staff_goal_templates ADD COLUMN IF NOT EXISTS tracking_query TEXT;

-- Update existing column for consistency
ALTER TABLE public.staff_assigned_goals ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0;

-- Seed/Update core automatic templates
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, tracking_query, is_active)
VALUES 
(
  'Social Media - Volume de Briefings', 
  'Geração automática de briefings para o time de design.', 
  20, 
  'briefings', 
  'automatic', 
  'social_media',
  'SELECT count(*) FROM arts WHERE created_at >= date_trunc(''month'', now()) AND status != ''pending_briefing''',
  true
),
(
  'Design - Rapidez de Entrega', 
  'Percentual de artes entregues em menos de 24h após o briefing.', 
  90, 
  '%', 
  'automatic', 
  'designer',
  'SELECT (count(*) FILTER (WHERE deadline_date IS NOT NULL AND updated_at <= deadline_date)::float / nullif(count(*), 0) * 100) FROM arts WHERE status = ''approved'' AND updated_at >= date_trunc(''month'', now())',
  true
),
(
  'Gestor de Tráfego - Volume Gerido', 
  'Volume total de faturamento dos clientes sob gestão de tráfego.', 
  10000, 
  'R$', 
  'automatic', 
  'traffic_manager',
  'SELECT sum(price * quantity) FROM client_services cs JOIN clients c ON c.id = cs.client_id WHERE c.is_active = true',
  true
),
(
  'SDR - Novos Contratos', 
  'Número de novos clientes ativos cadastrados no mês atual.', 
  5, 
  'clientes', 
  'automatic', 
  'sdr',
  'SELECT count(*) FROM clients WHERE created_at >= date_trunc(''month'', now()) AND is_active = true',
  true
)
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description,
    target_value = EXCLUDED.target_value,
    measurement_unit = EXCLUDED.measurement_unit,
    tracking_method = EXCLUDED.tracking_method,
    target_role = EXCLUDED.target_role,
    tracking_query = EXCLUDED.tracking_query;
