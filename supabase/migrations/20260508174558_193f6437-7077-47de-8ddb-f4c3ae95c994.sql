-- Add new columns to staff_goal_templates
ALTER TABLE public.staff_goal_templates 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('finance', 'commercial', 'operational', 'general')) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_standard BOOLEAN DEFAULT false;

-- Create an index for better performance when filtering by category
CREATE INDEX IF NOT EXISTS idx_staff_goal_templates_category ON public.staff_goal_templates(category);

-- Insert standard goals (templates)
-- We use DO $$ BEGIN ... END $$ to avoid errors if the specific names already exist, 
-- or we can just insert them if they don't exist by name.

-- 1. Finance Goals
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, category, is_global, is_standard)
VALUES 
('Faturamento Mensal (MRR)', 'Meta de faturamento recorrente mensal da empresa.', 100000, 'R$', 'manual', 'admin', 'finance', true, true),
('Novos Contratos', 'Meta de novos contratos fechados no mês.', 10, 'contratos', 'manual', 'admin', 'finance', true, true)
ON CONFLICT (name) DO NOTHING;

-- 2. Commercial Goals
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, category, is_global, is_standard)
VALUES 
('Leads Mensais', 'Quantidade de novos leads gerados no mês.', 500, 'leads', 'automatic', 'sdr', 'commercial', true, true),
('Agendamentos', 'Quantidade de reuniões agendadas.', 50, 'reuniões', 'automatic', 'sdr', 'commercial', true, true),
('Taxa de Conversão SDR', 'Percentual de conversão de leads em agendamentos.', 10, '%', 'automatic', 'sdr', 'commercial', false, true)
ON CONFLICT (name) DO NOTHING;

-- 3. Operational Goals - Design
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, category, is_global, is_standard)
VALUES 
('Volume de Artes (Design)', 'Total de artes entregues e aprovadas.', 200, 'artes', 'automatic', 'designer', 'operational', false, true),
('Taxa de Aprovação (Design)', 'Percentual de artes aprovadas sem necessidade de refação pesada.', 90, '%', 'automatic', 'designer', 'operational', false, true)
ON CONFLICT (name) DO NOTHING;

-- 4. Operational Goals - Social Media
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, category, is_global, is_standard)
VALUES 
('Postagens Realizadas', 'Total de postagens agendadas/publicadas.', 100, 'posts', 'automatic', 'social_media', 'operational', false, true),
('Taxa de Engajamento', 'Média de engajamento nos perfis atendidos.', 3, '%', 'manual', 'social_media', 'operational', false, true)
ON CONFLICT (name) DO NOTHING;

-- 5. Operational Goals - Traffic
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, category, is_global, is_standard)
VALUES 
('ROAS Médio', 'Retorno sobre investimento publicitário médio dos clientes.', 5, 'x', 'manual', 'traffic_manager', 'operational', false, true),
('CPL Médio', 'Custo por lead médio das campanhas.', 5, 'R$', 'manual', 'traffic_manager', 'operational', false, true)
ON CONFLICT (name) DO NOTHING;

-- 6. Operational Goals - Audiovisual
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, category, is_global, is_standard)
VALUES 
('Captações Realizadas', 'Total de sessões de vídeo realizadas no mês.', 20, 'captações', 'manual', 'videomaker', 'operational', false, true),
('Vídeos Editados', 'Total de vídeos editados e entregues.', 40, 'vídeos', 'manual', 'editor', 'operational', false, true)
ON CONFLICT (name) DO NOTHING;
