-- Templates de Metas para Videomaker
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, target_role, tracking_method, data_source_description)
VALUES 
('Captações Mensais', 'Quantidade de clientes captados no mês vigente.', 12, 'un', 'videomaker', 'automatic', 'Tabela audiovisual_projects filtrando por videographer_id e status captado.'),
('Volume de Vídeos (Brutos)', 'Quantidade total de vídeos gerados a partir das captações.', 20, 'vídeos', 'videomaker', 'automatic', 'Contagem de projetos com brutos enviados.');

-- Templates de Metas para Editor
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, target_role, tracking_method, data_source_description)
VALUES 
('Vídeos Finalizados', 'Quantidade de vídeos com edição aprovada e publicada.', 15, 'vídeos', 'editor', 'automatic', 'Tabela audiovisual_projects filtrando por editor_id e status published.'),
('Agilidade na Entrega', 'Média de horas para entrega da primeira versão após o recebimento dos brutos.', 24, 'horas', 'editor', 'automatic', 'Diferença entre editing_started_at e editing_completed_at.'),
('Qualidade (Baixa Revisão)', 'Manter a taxa de pedidos de ajuste abaixo do limite aceitável.', 20, '%', 'editor', 'automatic', 'Proporção de projetos com status revision_requested.');