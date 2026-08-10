-- Update tracking queries for automatic templates

-- 1. SOCIAL MEDIA - Postagens Feed
UPDATE public.staff_goal_templates 
SET tracking_query = 'SELECT count(*) FROM public.instagram_scheduled_posts p JOIN public.client_team_assignments cta ON p.client_id = cta.client_id WHERE cta.staff_member_id = :staff_id AND p.status = ''published'' AND EXTRACT(MONTH FROM p.scheduled_at) = :month AND EXTRACT(YEAR FROM p.scheduled_at) = :year'
WHERE name = 'Social Media - Postagens Feed';

-- 2. SOCIAL MEDIA - Crescimento MoM (%)
UPDATE public.staff_goal_templates 
SET tracking_query = 'WITH curr AS (SELECT avg(followers_count) as val FROM public.instagram_metrics m JOIN public.client_team_assignments cta ON m.client_id = cta.client_id WHERE cta.staff_member_id = :staff_id AND EXTRACT(MONTH FROM m.recorded_at) = :month AND EXTRACT(YEAR FROM m.recorded_at) = :year), prev AS (SELECT avg(followers_count) as val FROM public.instagram_metrics m JOIN public.client_team_assignments cta ON m.client_id = cta.client_id WHERE cta.staff_member_id = :staff_id AND EXTRACT(MONTH FROM m.recorded_at) = CASE WHEN :month = 1 THEN 12 ELSE :month - 1 END AND EXTRACT(YEAR FROM m.recorded_at) = CASE WHEN :month = 1 THEN :year - 1 ELSE :year END) SELECT CASE WHEN prev.val > 0 THEN ((curr.val - prev.val) / prev.val) * 100 ELSE 0 END FROM curr, prev'
WHERE name = 'Social Media - Crescimento MoM (%)';

-- 3. DESIGN - Prazo SLA (Horas)
UPDATE public.staff_goal_templates 
SET tracking_query = 'SELECT avg(EXTRACT(EPOCH FROM (a.created_at - cta.created_at))/3600) FROM public.arts a JOIN public.client_team_assignments cta ON a.client_id = cta.client_id WHERE cta.staff_member_id = :staff_id AND EXTRACT(MONTH FROM a.created_at) = :month AND EXTRACT(YEAR FROM a.created_at) = :year'
WHERE name = 'Design - Prazo SLA (Horas)';

-- 4. DESIGN - Alterações (Máx)
UPDATE public.staff_goal_templates 
SET tracking_query = 'SELECT count(*) FROM public.art_comments ac JOIN public.arts a ON ac.art_id = a.id JOIN public.client_team_assignments cta ON a.client_id = cta.client_id WHERE cta.staff_member_id = :staff_id AND ac.is_revision = true AND EXTRACT(MONTH FROM ac.created_at) = :month AND EXTRACT(YEAR FROM ac.created_at) = :year'
WHERE name = 'Design - Alterações (Máx)';

-- 5. SDR - Reuniões Agendadas
UPDATE public.staff_goal_templates 
SET tracking_query = 'SELECT count(*) FROM public.sdr_meetings WHERE sdr_id = :staff_id AND status = ''scheduled'' AND EXTRACT(MONTH FROM meeting_date) = :month AND EXTRACT(YEAR FROM meeting_date) = :year'
WHERE name = 'SDR - Reuniões Agendadas';

-- 6. LIDER - Satisfação dos Clientes (NPS)
UPDATE public.staff_goal_templates 
SET tracking_query = 'SELECT COALESCE(avg(overall_score), 0) FROM public.client_satisfaction_surveys WHERE EXTRACT(MONTH FROM created_at) = :month AND EXTRACT(YEAR FROM created_at) = :year'
WHERE name = 'Líder - Satisfação dos Clientes (NPS)';

-- 7. LIDER - Reuniões de Consultoria
UPDATE public.staff_goal_templates 
SET tracking_query = 'SELECT count(*) FROM public.sdr_meetings WHERE EXTRACT(MONTH FROM meeting_date) = :month AND EXTRACT(YEAR FROM meeting_date) = :year AND status = ''completed'''
WHERE name = 'Líder - Reuniões de Consultoria';
