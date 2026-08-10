-- Phase 1: Reset goal catalog
-- Delete in dependency order
DELETE FROM public.staff_activity_proofs WHERE goal_id IS NOT NULL;
DELETE FROM public.staff_assigned_goals;
DELETE FROM public.staff_goal_templates;

-- Recreate clean catalog. Name is the stable key the tracker will switch on.
INSERT INTO public.staff_goal_templates
  (name, description, target_role, goal_type, measurement_unit, target_value, min_threshold, improvement_direction, tracking_method, data_source_description, category, is_active, is_standard)
VALUES
  -- ADMIN / LEADER
  ('MRR Mensal', 'Faturamento recorrente mensal da agência', 'admin', 'quantity', 'R$', 100000, 100000, 'up', 'manual', 'Lançamento manual do líder', 'finance', true, true),
  ('Reuniões com Clientes', 'Reuniões realizadas com clientes da carteira', 'admin', 'quantity', 'reuniões', 4, 4, 'up', 'automatic', 'client_management_actions tipo meeting', 'operational', true, true),
  ('Retenção de Clientes', 'Percentual de clientes ativos mantidos no mês', 'admin', 'rate', '%', 95, 90, 'up', 'automatic', 'client_events tipo churned no mês', 'operational', true, true),
  ('Novos Contratos', 'Novos contratos fechados no mês', 'admin', 'quantity', 'contratos', 5, 3, 'up', 'manual', 'Lançamento manual', 'commercial', true, true),

  -- DESIGNER
  ('Volume de Artes', 'Total de artes aprovadas no mês', 'designer', 'quantity', 'artes', 60, 50, 'up', 'automatic', 'arts.status=approved no mês', 'operational', true, true),
  ('SLA de Entrega', 'Tempo médio (em horas) entre briefing pronto e primeira entrega', 'designer', 'time', 'horas', 48, 48, 'down', 'automatic', 'arts: briefing_completed_at -> awaiting_approval', 'operational', true, true),
  ('Taxa de Aprovação', 'Percentual de artes aprovadas sem revisão', 'designer', 'rate', '%', 90, 80, 'up', 'automatic', 'art_comments tipo request_revision', 'operational', true, true),
  ('Revisões por Arte', 'Número médio de revisões por arte entregue', 'designer', 'quantity', 'revisões', 1, 2, 'down', 'automatic', 'art_comments / arts entregues', 'operational', true, true),

  -- SOCIAL MEDIA
  ('Briefings Preenchidos', 'Percentual de briefings completados no mês', 'social_media', 'rate', '%', 95, 80, 'up', 'automatic', 'arts.briefing_completed_at / total', 'operational', true, true),
  ('Posts no Feed', 'Total de posts aprovados/agendados no mês', 'social_media', 'quantity', 'posts', 12, 10, 'up', 'automatic', 'arts approved tipo post/carrossel', 'operational', true, true),
  ('Stories no Mês', 'Volume de stories produzidos', 'social_media', 'quantity', 'stories', 30, 20, 'up', 'manual', 'Lançamento manual', 'operational', true, true),
  ('Planejamento Mensal Concluído', 'Planejamento de conteúdo finalizado no prazo', 'social_media', 'rate', '%', 100, 100, 'up', 'automatic', 'work_months.is_planning_complete', 'operational', true, true),

  -- SDR
  ('Leads Captados', 'Total de leads novos captados no mês', 'sdr', 'quantity', 'leads', 30, 20, 'up', 'automatic', 'sdr_leads created_at no mês', 'commercial', true, true),
  ('Reuniões Agendadas', 'Reuniões marcadas com leads qualificados', 'sdr', 'quantity', 'reuniões', 10, 6, 'up', 'automatic', 'sdr_leads status meeting_scheduled', 'commercial', true, true),
  ('Taxa de Conversão Lead→Reunião', 'Percentual de leads que viraram reunião', 'sdr', 'rate', '%', 25, 15, 'up', 'automatic', 'sdr_leads ratio', 'commercial', true, true),

  -- CLOSER
  ('Vendas Fechadas', 'Total de vendas fechadas no mês', 'closer', 'quantity', 'vendas', 5, 3, 'up', 'automatic', 'sdr_leads status won', 'commercial', true, true),
  ('Faturamento Gerado', 'Receita total gerada por vendas no mês', 'closer', 'quantity', 'R$', 30000, 20000, 'up', 'automatic', 'sum(sdr_leads.won_value)', 'commercial', true, true),

  -- VIDEOMAKER
  ('Captações Realizadas', 'Captações concluídas no mês', 'videomaker', 'quantity', 'captações', 12, 8, 'up', 'automatic', 'audiovisual_projects raw_video_added_at', 'operational', true, true),
  ('Brutos Entregues no Prazo', 'Captações com brutos enviados em até 24h', 'videomaker', 'rate', '%', 90, 80, 'up', 'manual', 'Lançamento manual', 'operational', true, true),

  -- EDITOR
  ('Vídeos Finalizados', 'Vídeos editados e entregues no mês', 'editor', 'quantity', 'vídeos', 20, 15, 'up', 'automatic', 'audiovisual_projects completed_at', 'operational', true, true),
  ('Tempo Médio de Edição', 'Horas médias entre início e fim da edição', 'editor', 'time', 'horas', 48, 72, 'down', 'automatic', 'editing_started_at -> editing_completed_at', 'operational', true, true),
  ('Qualidade da Edição', 'Percentual de vídeos sem revisão solicitada', 'editor', 'rate', '%', 90, 80, 'up', 'automatic', '1 - (revisions / total)', 'operational', true, true),

  -- TRAFFIC MANAGER
  ('ROAS Médio', 'Retorno sobre investimento médio em anúncios', 'traffic_manager', 'rate', 'x', 5, 3, 'up', 'automatic', 'avg(traffic_campaigns.roas)', 'commercial', true, true),
  ('CPL Médio', 'Custo por lead médio nas campanhas', 'traffic_manager', 'quantity', 'R$', 10, 20, 'down', 'automatic', 'avg(cost_per_conversion)', 'commercial', true, true),
  ('Investimento Mensal', 'Total investido em mídia no mês', 'traffic_manager', 'quantity', 'R$', 50000, 30000, 'up', 'automatic', 'sum(traffic_campaigns.investment)', 'commercial', true, true);
