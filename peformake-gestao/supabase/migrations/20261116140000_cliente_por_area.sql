-- Regra da operação (Italo, 12/11/2026): o cliente só aparece numa área da operação se tiver serviço ATIVO dela,
-- e nunca se estiver perdido (is_lost) ou desativado (is_active = false). Financeiro e cadastro continuam mostrando todos.
-- Uma função central, usada em todo lugar: public.client_in_area(cliente, área).
-- Áreas: 'conteudo' (Social Media OU Design), 'audiovisual', 'trafego', 'consultoria' (ou qualquer services.area).
-- As funções existentes são ajustadas por troca de trecho na definição que está no ar (sem reescrever o resto),
-- e a migração falha se o trecho não for encontrado.

create or replace function public.client_in_area(_client uuid, _area text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (select 1 from public.clients c where c.id = _client and c.is_active and not coalesce(c.is_lost, false))
     and exists (
       select 1 from public.client_services cs join public.services s on s.id = cs.service_id
       where cs.client_id = _client and cs.is_active
         and case _area
               when 'conteudo' then s.area in ('social', 'design')
               when 'design' then s.area in ('social', 'design')
               when 'trafego' then s.area = 'trafego' or s.name ilike 'tr%fego%'
               when 'consultoria' then s.area = 'consultoria' or lower(s.name) = 'consultoria'
               else s.area = _area
             end
     );
$$;
revoke all on function public.client_in_area(uuid, text) from public, anon;
grant execute on function public.client_in_area(uuid, text) to authenticated, service_role;

create or replace function pg_temp.patch(_fn regprocedure, _old text, _new text)
returns void language plpgsql as $$
declare _def text := pg_get_functiondef(_fn);
begin
  if position(_new in _def) > 0 then return; end if; -- já aplicado
  if position(_old in _def) = 0 then raise exception 'Trecho não encontrado em %: %', _fn, left(_old, 80); end if;
  execute replace(_def, _old, _new);
end $$;

-- Conteúdo: datas sazonais só de quem tem Social Media/Design.
select pg_temp.patch('public.seasonal_board(integer, uuid)',
  'where c.is_active and not c.is_lost and (_client_id is null or c.id = _client_id)',
  'where public.client_in_area(c.id, ''conteudo'') and (_client_id is null or c.id = _client_id)');

-- Início → resumo de Conteúdo.
select pg_temp.patch('public.dash_content(date)',
  'where p.month = _month
    )',
  'where p.month = _month and public.client_in_area(i.client_id, ''conteudo'')
    )');
select pg_temp.patch('public.dash_content(date)',
  'from public.content_plans where month = _month and planned_at is not null',
  'from public.content_plans where month = _month and public.client_in_area(client_id, ''conteudo'') and planned_at is not null');
select pg_temp.patch('public.dash_content(date)',
  '(select count(*) from public.content_plans where month = _month)',
  '(select count(*) from public.content_plans where month = _month and public.client_in_area(client_id, ''conteudo''))');

-- Início → resumo do Audiovisual.
select pg_temp.patch('public.dash_av(date)',
  'select * from public.av_projects where month = _month or (month is distinct from _month and status not in (''delivered'', ''cancelled''))',
  'select * from public.av_projects where (month = _month or (month is distinct from _month and status not in (''delivered'', ''cancelled''))) and public.client_in_area(client_id, ''audiovisual'')');

-- Tráfego: relatórios e metas só de quem tem Tráfego.
select pg_temp.patch('public.report_board(text, integer)',
  'where c.is_active and not c.is_lost and exists (select 1 from public.ad_accounts a where a.client_id = c.id and a.enabled)',
  'where public.client_in_area(c.id, ''trafego'') and exists (select 1 from public.ad_accounts a where a.client_id = c.id and a.enabled)');
select pg_temp.patch('public.traffic_goals_progress(date, uuid)',
  'where tg.is_active and c.is_active and not c.is_lost and',
  'where tg.is_active and public.client_in_area(c.id, ''trafego'') and');

-- Meu dia: peças, vídeos e tarefas só de clientes que a área atende.
select pg_temp.patch('public.my_day(uuid)',
  'where i.designer_id = _s.id and i.status not in (''approved'', ''published'')',
  'where i.designer_id = _s.id and i.status not in (''approved'', ''published'') and public.client_in_area(i.client_id, ''conteudo'')');
select pg_temp.patch('public.my_day(uuid)',
  'and a.status not in (''delivered'', ''cancelled'')), ''[]''::jsonb),',
  'and a.status not in (''delivered'', ''cancelled'') and public.client_in_area(a.client_id, ''audiovisual'')), ''[]''::jsonb),');
select pg_temp.patch('public.my_day(uuid)',
  'where t.assignee_id = _s.id and t.status <> ''done''), ''[]''::jsonb),',
  'where t.assignee_id = _s.id and t.status <> ''done'' and (t.client_id is null or (c.is_active and not c.is_lost))), ''[]''::jsonb),');

-- IA de design não produz arte de cliente sem o serviço.
select pg_temp.patch('public.design_ai_takeover()',
  'where ci.ai_deadline_at < now() and ci.status = ''ready'' and ci.headline is not null',
  'where ci.ai_deadline_at < now() and ci.status = ''ready'' and ci.headline is not null and public.client_in_area(ci.client_id, ''conteudo'')');

-- Lembretes de gravação/edição: só de quem tem Audiovisual.
select pg_temp.patch('public.av_reminders_run()',
  'where p.shoot_at is not null and p.status not in (''delivered'', ''cancelled'')',
  'where public.client_in_area(p.client_id, ''audiovisual'') and p.shoot_at is not null and p.status not in (''delivered'', ''cancelled'')');
select pg_temp.patch('public.av_reminders_run()',
  'where p.status in (''editing'', ''changes_requested'') and p.edit_due_at < now()',
  'where p.status in (''editing'', ''changes_requested'') and public.client_in_area(p.client_id, ''audiovisual'') and p.edit_due_at < now()');

-- Bete: o que está parado/pendente conta só clientes que a área atende.
select pg_temp.patch('public.goals_coach()',
  'from public.content_items where status = ''client_review'' and updated_at < now() - interval ''3 days'')',
  'from public.content_items where status = ''client_review'' and updated_at < now() - interval ''3 days'' and public.client_in_area(client_id, ''conteudo''))');
select pg_temp.patch('public.goals_coach()',
  'where deadline between _today and _today + 7 and approved_at is null and status <> ''approved'')',
  'where deadline between _today and _today + 7 and approved_at is null and status <> ''approved'' and public.client_in_area(client_id, ''conteudo''))');
select pg_temp.patch('public.goals_coach()',
  'where due_date >= _today and due_date < _m + interval ''1 month'' and delivered_at is null)',
  'where due_date >= _today and due_date < _m + interval ''1 month'' and delivered_at is null and public.client_in_area(client_id, ''audiovisual''))');
select pg_temp.patch('public.goals_insights()',
  'where status = ''client_review'' and updated_at < now() - interval ''3 days'';',
  'where status = ''client_review'' and updated_at < now() - interval ''3 days'' and public.client_in_area(client_id, ''conteudo'');');

-- Painel da equipe: o que está aberto/atrasado não conta cliente que saiu (o histórico de entregues fica igual).
select pg_temp.patch('public.team_board(date)',
  'where c.designer_id = s.id and c.status not in (''approved'', ''published'')) as arts_open',
  'where c.designer_id = s.id and c.status not in (''approved'', ''published'') and public.client_in_area(c.client_id, ''conteudo'')) as arts_open');
select pg_temp.patch('public.team_board(date)',
  'c.status not in (''approved'', ''client_review'', ''published'')) as arts_late',
  'c.status not in (''approved'', ''client_review'', ''published'') and public.client_in_area(c.client_id, ''conteudo'')) as arts_late');
select pg_temp.patch('public.team_board(date)',
  'p.internal_approved_at is null) as edits_late',
  'p.internal_approved_at is null and public.client_in_area(p.client_id, ''audiovisual'')) as edits_late');
