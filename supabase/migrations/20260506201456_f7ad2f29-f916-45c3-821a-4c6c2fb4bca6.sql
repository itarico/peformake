-- Add columns for real-time tracking and performance metrics
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.arts ADD COLUMN IF NOT EXISTS designer_id UUID REFERENCES public.staff_members(id);
ALTER TABLE public.arts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create automated goal templates
INSERT INTO public.staff_goal_templates 
(name, description, target_role, tracking_method, target_value, measurement_unit, tracking_query, data_source_description)
VALUES 
-- Designer Templates
('Designer: Tempo de Entrega (Média)', 'Média de horas entre o briefing completo e a entrega da arte aprovada.', 'designer', 'automatic', 24, 'horas', 
 'SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - briefing_completed_at))/3600), 0) FROM arts WHERE (designer_id = :staff_id OR client_id IN (SELECT client_id FROM client_team_assignments WHERE staff_member_id = :staff_id AND role_in_client = ''designer'')) AND status = ''approved'' AND briefing_completed_at IS NOT NULL AND EXTRACT(MONTH FROM updated_at) = :month AND EXTRACT(YEAR FROM updated_at) = :year', 
 'Tempo médio de entrega (Briefing -> Aprovação)'),

('Designer: Taxa de Aprovação', 'Percentual de artes aprovadas sem necessidade de refação total.', 'designer', 'automatic', 90, '%', 
 'SELECT COALESCE((COUNT(*) FILTER (WHERE status = ''approved'')::numeric / NULLIF(COUNT(*), 0) * 100), 0) FROM arts WHERE (designer_id = :staff_id OR client_id IN (SELECT client_id FROM client_team_assignments WHERE staff_member_id = :staff_id AND role_in_client = ''designer'')) AND EXTRACT(MONTH FROM created_at) = :month AND EXTRACT(YEAR FROM created_at) = :year', 
 'Taxa de aprovação direta'),

('Designer: Taxa de Ajuste', 'Percentual de artes que receberam solicitações de revisão.', 'designer', 'automatic', 20, '%', 
 'SELECT COALESCE((COUNT(*) FILTER (WHERE revision_comment IS NOT NULL)::numeric / NULLIF(COUNT(*), 0) * 100), 0) FROM arts WHERE (designer_id = :staff_id OR client_id IN (SELECT client_id FROM client_team_assignments WHERE staff_member_id = :staff_id AND role_in_client = ''designer'')) AND EXTRACT(MONTH FROM created_at) = :month AND EXTRACT(YEAR FROM created_at) = :year', 
 'Percentual de artes com revisão'),

-- Social Media Templates
('Social Media: Conclusão de Briefings', 'Percentual de briefings enviados em relação ao total de artes planejadas.', 'social_media', 'automatic', 90, '%', 
 'SELECT COALESCE((COUNT(*) FILTER (WHERE briefing_completed_at IS NOT NULL)::numeric / NULLIF(COUNT(*), 0) * 100), 0) FROM arts a JOIN client_team_assignments cta ON a.client_id = cta.client_id WHERE cta.staff_member_id = :staff_id AND cta.role_in_client = ''social_media'' AND EXTRACT(MONTH FROM a.created_at) = :month AND EXTRACT(YEAR FROM a.created_at) = :year', 
 'Aproveitamento de briefings enviados'),

-- SDR Templates
('SDR: Taxa de Conversão', 'Leads que chegaram versus reuniões agendadas.', 'sdr', 'automatic', 15, '%', 
 'SELECT COALESCE((COUNT(*) FILTER (WHERE status = ''Reunião Agendada'')::numeric / NULLIF(COUNT(*), 0) * 100), 0) FROM sdr_leads WHERE sdr_staff_id = :staff_id AND EXTRACT(MONTH FROM created_at) = :month AND EXTRACT(YEAR FROM created_at) = :year', 
 'Conversão Lead -> Reunião'),

('SDR: Reuniões Agendadas', 'Total de reuniões qualificadas agendadas no mês.', 'sdr', 'automatic', 10, 'reuniões', 
 'SELECT COUNT(*) FROM sdr_leads WHERE sdr_staff_id = :staff_id AND status = ''Reunião Agendada'' AND EXTRACT(MONTH FROM created_at) = :month AND EXTRACT(YEAR FROM created_at) = :year', 
 'Total de reuniões agendadas'),

-- Editor Templates
('Edição: Clientes Editados', 'Quantidade de clientes únicos com vídeos finais entregues.', 'editor', 'automatic', 5, 'clientes', 
 'SELECT COUNT(DISTINCT client_id) FROM audiovisual_projects WHERE editor_id = :staff_id AND status = ''completed'' AND EXTRACT(MONTH FROM completed_at) = :month AND EXTRACT(YEAR FROM completed_at) = :year', 
 'Total de clientes finalizados'),

('Edição: Tempo de Entrega', 'Tempo médio entre o recebimento do bruto e a entrega do final.', 'editor', 'automatic', 48, 'horas', 
 'SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (editing_completed_at - raw_video_added_at))/3600), 0) FROM audiovisual_projects WHERE editor_id = :staff_id AND status = ''completed'' AND raw_video_added_at IS NOT NULL AND EXTRACT(MONTH FROM completed_at) = :month AND EXTRACT(YEAR FROM completed_at) = :year', 
 'Tempo médio de edição'),

-- Leader Templates
('Líder: Satisfação NPS (Média)', 'Média do NPS dos clientes gerenciados.', 'admin', 'automatic', 9, 'nota', 
 'SELECT COALESCE(AVG(score), 0) FROM client_satisfaction_surveys s JOIN client_team_assignments cta ON s.client_id = cta.client_id WHERE cta.staff_member_id = :staff_id AND s.month = :month AND s.year = :year', 
 'Média NPS Geral');
