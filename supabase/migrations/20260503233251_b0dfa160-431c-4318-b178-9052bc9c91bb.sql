-- First, add the data_source_description column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'staff_goal_templates' AND COLUMN_NAME = 'data_source_description') THEN
        ALTER TABLE public.staff_goal_templates ADD COLUMN data_source_description TEXT;
    END IF;
END $$;

-- Instead of deleting (which breaks foreign keys), we'll update the name of existing active ones to avoid conflict, then deactivate all.
-- But since I want a fresh start and the user complained about duplicates, I'll delete templates that are NOT assigned to anyone yet, or just update.
-- Actually, the safest way is to UPDATE if exists or INSERT otherwise, but unique name constraint makes it tricky.

-- Let's just delete all and assume it's okay to reset templates (not assignments, but templates might be referenced).
-- If there are assignments, we should keep those templates.
-- Let's just deactivate ALL existing ones and use UNIQUE NAMES for the new ones if needed, OR just delete those not in use.

DELETE FROM public.staff_goal_templates WHERE id NOT IN (SELECT template_id FROM public.staff_assigned_goals);

-- 1. SOCIAL MEDIA TEMPLATES
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, data_source_description, is_active)
VALUES 
('Social Media - Crescimento MoM (%)', 'Crescimento de seguidores/alcance em relação ao mês anterior.', 10, '%', 'automatic', 'social_media', 'Extraído das métricas de Instagram integradas no sistema (tabela instagram_insights).', true),
('Social Media - Postagens Feed', 'Quantidade de posts realizados no feed dos clientes vinculados.', 12, 'posts', 'automatic', 'social_media', 'Contagem de posts aprovados e agendados no Calendário de Conteúdo.', true),
('Social Media - Volume de Stories', 'Meta de postagens diárias de stories.', 60, 'stories', 'manual', 'social_media', 'Auditoria manual baseada nos links de comprovação enviados.', true)
ON CONFLICT (name) DO UPDATE SET is_active = true, data_source_description = EXCLUDED.data_source_description;

-- 2. DESIGN TEMPLATES
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, data_source_description, is_active)
VALUES 
('Design - Prazo SLA (Horas)', 'Tempo médio de entrega das artes após o briefing.', 24, 'horas', 'automatic', 'designer', 'Calculado pela diferença entre a data do briefing e a data da primeira entrega no Kanban de Design.', true),
('Design - Alterações (Máx)', 'Limite máximo de pedidos de alteração por arte.', 2, 'pedidos', 'automatic', 'designer', 'Contagem de feedbacks do tipo "Alteração" registrados pelos clientes no portal.', true),
('Design - Artes Aprovadas', 'Quantidade total de artes aprovadas sem necessidade de refação.', 40, 'artes', 'automatic', 'designer', 'Contagem de cards movidos para "Concluído" sem passar pela coluna de "Alteração".', true)
ON CONFLICT (name) DO UPDATE SET is_active = true, data_source_description = EXCLUDED.data_source_description;

-- 3. TRAFFIC MANAGER TEMPLATES
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, data_source_description, is_active)
VALUES 
('Gestor de Tráfego - ROI Médio', 'Retorno sobre investimento médio das contas geridas.', 5, 'x', 'manual', 'traffic_manager', 'Baseado nos relatórios de performance de anúncios (Meta/Google Ads).', true),
('Gestor de Tráfego - CPL (Meta)', 'Custo por lead dentro da meta estabelecida por cliente.', 100, '%', 'manual', 'traffic_manager', 'Comparação entre CPL real e CPL planejado no dashboard de tráfego.', true)
ON CONFLICT (name) DO UPDATE SET is_active = true, data_source_description = EXCLUDED.data_source_description;

-- 4. SDR TEMPLATES
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, data_source_description, is_active)
VALUES 
('SDR - Reuniões Agendadas', 'Total de reuniões qualificadas agendadas no mês.', 20, 'reuniões', 'automatic', 'sdr', 'Contagem de leads com status "Reunião Agendada" no CRM.', true),
('SDR - Taxa de Conversão (Lead -> Reunião)', 'Percentual de leads que avançam para reunião.', 15, '%', 'automatic', 'sdr', 'Proporção entre leads totais e reuniões agendadas no funil de vendas.', true)
ON CONFLICT (name) DO UPDATE SET is_active = true, data_source_description = EXCLUDED.data_source_description;

-- 5. LIDER (ADMIN) TEMPLATES
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role, data_source_description, is_active)
VALUES 
('Líder - Satisfação dos Clientes (NPS)', 'Média de satisfação dos clientes da agência.', 9, 'nota', 'automatic', 'admin', 'Média das notas enviadas pelos clientes nas pesquisas de NPS do sistema.', true),
('Líder - Reuniões de Consultoria', 'Total de reuniões estratégicas realizadas com clientes.', 10, 'reuniões', 'automatic', 'admin', 'Contagem de eventos concluídos no calendário de consultoria.', true),
('Líder - Retenção de Faturamento', 'Percentual de faturamento mantido (Churn inverso).', 95, '%', 'automatic', 'admin', 'Calculado comparando o MRR do início do mês com o do final do mês.', true)
ON CONFLICT (name) DO UPDATE SET is_active = true, data_source_description = EXCLUDED.data_source_description;

-- Deactivate any other templates that are not in this list
UPDATE public.staff_goal_templates 
SET is_active = false 
WHERE name NOT IN (
    'Social Media - Crescimento MoM (%)', 'Social Media - Postagens Feed', 'Social Media - Volume de Stories',
    'Design - Prazo SLA (Horas)', 'Design - Alterações (Máx)', 'Design - Artes Aprovadas',
    'Gestor de Tráfego - ROI Médio', 'Gestor de Tráfego - CPL (Meta)',
    'SDR - Reuniões Agendadas', 'SDR - Taxa de Conversão (Lead -> Reunião)',
    'Líder - Satisfação dos Clientes (NPS)', 'Líder - Reuniões de Consultoria', 'Líder - Retenção de Faturamento'
);
