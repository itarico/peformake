-- Metas por permissão (aplicado no Supabase em 06/11/2026):
-- goal_role_visible(role): admin vê todas; head_marketing → relacionamento; sdr/closer → comercial;
-- traffic_manager → tráfego; social_media/designer → conteúdo; videomaker/editor/ellcazo → audiovisual.
-- goals_board filtra por goal_role_visible e esconde metas em dinheiro (MRR, recebido, fotos extras) de quem não é admin.
-- goals_coach esconde valores (ticket, dívida, médias) de quem não é admin.
-- Políticas de leitura abertas a qualquer logado passaram a exigir ser da equipe (is_team) ou admin/head.
alter policy role_goals_read on public.role_goals using (public.goal_role_visible(role) and (public.has_role('admin') or key not in ('mrr_total', 'recebido', 'fotos_extras')));
alter policy goal_templates_read on public.goal_templates using (public.has_role('admin') or public.has_role('head_marketing'));
alter policy company_goals_read on public.company_goals using (public.has_role('admin') or public.has_role('head_marketing'));
alter policy intel_settings_read on public.intel_settings using (public.is_team());
alter policy member_goals_read on public.member_goals using (public.is_team());
alter policy team_settings_read on public.team_settings using (public.is_team());
alter policy team_highlights_read on public.team_highlights using (public.is_team());
alter policy notification_rules_select on public.notification_rules using (public.is_team());
alter policy niches_read on public.niches using (public.is_team());
alter policy strategy_frameworks_read on public.strategy_frameworks using (public.is_team());
alter policy delivery_ratings_read on public.delivery_ratings using (public.is_team());
alter policy company_profiles_read on public.company_profiles using (public.is_team());
