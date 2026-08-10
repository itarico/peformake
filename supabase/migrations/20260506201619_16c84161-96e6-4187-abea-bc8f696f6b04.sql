-- Add video_count to audiovisual_projects
ALTER TABLE public.audiovisual_projects ADD COLUMN IF NOT EXISTS video_count INTEGER DEFAULT 1;

-- Add manual templates requested by the user
INSERT INTO public.staff_goal_templates 
(name, description, target_role, tracking_method, target_value, measurement_unit, data_source_description)
VALUES 
-- Social Media Manual
('Social Media: Postagens Story', 'Quantidade de postagens realizadas nos stories dos clientes.', 'social_media', 'manual', 30, 'stories', 'Manual: Contagem de stories realizados'),
('Social Media: Postagens Feed', 'Quantidade de postagens realizadas no feed dos clientes.', 'social_media', 'manual', 12, 'posts', 'Manual: Contagem de posts no feed'),
('Social Media: Taxa de Crescimento', 'Percentual de crescimento de seguidores/alcance no Instagram.', 'social_media', 'manual', 5, '%', 'Manual: Dados extraídos do Instagram Insights'),

-- Editor Manual/Count
('Edição: Quantidade de Vídeos', 'Total de vídeos individuais entregues (contabilizado por link enviado).', 'editor', 'automatic', 20, 'vídeos', 'SELECT COALESCE(SUM(video_count), 0) FROM audiovisual_projects WHERE editor_id = :staff_id AND status = ''completed'' AND EXTRACT(MONTH FROM completed_at) = :month AND EXTRACT(YEAR FROM completed_at) = :year'),

-- Leader Manual/Meetings
('Líder: Retenção de Clientes', 'Percentual de clientes mantidos na base gerenciada.', 'admin', 'manual', 95, '%', 'Manual: Puxado do módulo de Retenção'),
('Líder: Reuniões com Clientes', 'Total de reuniões estratégicas realizadas com clientes gerenciados.', 'admin', 'automatic', 4, 'reuniões', 'SELECT COUNT(*) FROM client_management_actions WHERE staff_id = :staff_id AND action_type = ''meeting'' AND EXTRACT(MONTH FROM created_at) = :month AND EXTRACT(YEAR FROM created_at) = :year'),
('Líder: Progresso Operacional', 'Percentual de execução dos serviços contratados pelos clientes.', 'admin', 'manual', 100, '%', 'Manual: Medição de progresso da execução'),
('Líder: Ações Prioritárias', 'Execução de prioridades e recomendações estratégicas.', 'admin', 'manual', 100, '%', 'Manual: Check de prioridades e recomendações');
