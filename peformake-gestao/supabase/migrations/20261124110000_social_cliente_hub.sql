-- Social Media por cliente (pedido do Italo, 24/11/2026): a lista de clientes mostra logo, quantos criativos o mês pede,
-- quantos já estão no planejamento, quantos voltaram do design para revisar e quantas sugestões da estratégia esperam.
create or replace function public.social_clients_board(_month date)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _m date := date_trunc('month', _month)::date;
begin
  if not public.can_plan_content() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', trim(c.name), 'logo_path', c.logo_path, 'legacy_logo_url', c.legacy_logo_url,
      'owed', x.owed, 'planned', y.planned, 'approved', y.approved, 'review', y.review, 'no_brief', y.no_brief,
      'suggestions', z.sugg, 'tasks', t.open
    ) order by (y.review > 0) desc, trim(c.name))
    from public.clients c
    cross join lateral (
      select coalesce(sum(d.qty), 0)::int owed
      from public.client_services cs join public.services s on s.id = cs.service_id
      cross join lateral public.client_service_deliverable(cs.id) d
      where cs.client_id = c.id and cs.is_active and s.area in ('social', 'design')
        and coalesce(d.unit, 'arte') not in ('mes', 'mês', 'hora', 'horas')
    ) x
    cross join lateral (
      select count(i.id)::int planned,
             count(i.id) filter (where i.status in ('approved', 'published'))::int approved,
             count(i.id) filter (where i.status in ('review', 'client_review'))::int review,
             count(i.id) filter (where i.status = 'briefing')::int no_brief
      from public.content_plans p join public.content_items i on i.plan_id = p.id
      where p.client_id = c.id and p.month = _m
    ) y
    cross join lateral (
      select ((select count(*) from public.monthly_strategy_actions a where a.client_id = c.id and a.status = 'proposta' and a.area in ('social', 'design'))
            + (select count(*) from public.strategy_cards k where k.client_id = c.id and k.status = 'proposta' and k.tab = 'social'))::int sugg
    ) z
    cross join lateral (
      select count(*)::int open from public.social_tasks st where st.client_id = c.id and st.status <> 'feito'
    ) t
    where c.is_active and not c.is_lost and public.client_areas(c.id) && array['social', 'design']
  ), '[]'::jsonb);
end $$;
revoke execute on function public.social_clients_board(date) from public, anon;
grant execute on function public.social_clients_board(date) to authenticated;

-- Sugestões da estratégia para um cliente (plano do mês e cartões do social), para aprovar e virar arte ou tarefa.
create or replace function public.social_client_suggestions(_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.can_plan_content() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return jsonb_build_object(
    'actions', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'area', a.area, 'title', a.title, 'what', left(a.what, 600),
        'format', a.format, 'due_date', a.due_date, 'week', a.week) order by a.due_date nulls last, a.position)
      from public.monthly_strategy_actions a where a.client_id = _client and a.status = 'proposta' and a.area in ('social', 'design')), '[]'::jsonb),
    'cards', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'title', k.title, 'kind', k.kind, 'goal', k.goal, 'month', k.month) order by k.position)
      from public.strategy_cards k where k.client_id = _client and k.status = 'proposta' and k.tab = 'social'), '[]'::jsonb));
end $$;
revoke execute on function public.social_client_suggestions(uuid) from public, anon;
grant execute on function public.social_client_suggestions(uuid) to authenticated;
