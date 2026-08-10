-- Delete duplicate names from staff_goal_templates keeping the newest one
DELETE FROM public.staff_goal_templates
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
        ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC) as row_num
        FROM public.staff_goal_templates
    ) t
    WHERE t.row_num > 1
);

-- Add unique constraint to name
ALTER TABLE public.staff_goal_templates ADD CONSTRAINT staff_goal_templates_name_key UNIQUE (name);

-- Add squad_id to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS squad_id UUID REFERENCES public.staff_squads(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_clients_squad_id ON public.clients(squad_id);

-- Ensure staff_members has necessary fields for 60/40 calculation
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS base_salary_percent NUMERIC DEFAULT 60;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS performance_salary_percent NUMERIC DEFAULT 40;

-- Seed or update templates
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, is_active)
VALUES 
('Social Media - Stories Mensais', 'Mínimo de 150 stories por mês para cada cliente da carteira', 150, 'stories', 'manual', 'social_media', true),
('Design - Prazo 24h', 'Artes devem ser enviadas em no máximo 24h após o briefing', 100, '%', 'manual', 'designer', true),
('SDR - Reuniões Agendadas', 'Número de reuniões qualificadas agendadas no mês', 20, 'reuniões', 'manual', 'sdr', true),
('Gestor de Tráfego - ROI', 'ROI médio das contas sob gestão', 3, 'x', 'manual', 'traffic_manager', true),
('Líder - Retenção', 'Taxa de retenção dos clientes da agência', 95, '%', 'manual', 'admin', true)
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description,
    target_value = EXCLUDED.target_value,
    measurement_unit = EXCLUDED.measurement_unit,
    target_role = EXCLUDED.target_role;
