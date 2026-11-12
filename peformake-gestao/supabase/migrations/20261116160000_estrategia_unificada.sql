-- Estratégia unificada (decisão do Italo, 13/11): UM motor (monthly-strategy) para todo cliente ativo, não perdido, com algum serviço
-- de operação (Consultoria, Tráfego, Social/Design, Audiovisual). Cada cliente recebe só as partes do que contratou.
-- Cada área vê e aprova a sua parte: Estratégia → Tráfego / Social media, e Audiovisual → Plano do mês (Ellcazo).
-- Usa o client_in_area (cliente na área só com o serviço ativo e não perdido).

-- Quem entra no plano do mês: qualquer serviço de operação.
create or replace function public.monthly_eligible(_client uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select public.client_in_area(_client, 'consultoria') or public.client_in_area(_client, 'trafego')
      or public.client_in_area(_client, 'conteudo') or public.client_in_area(_client, 'audiovisual')
$$;

-- Pode ver/decidir a parte desta área do plano deste cliente? Admin/head: tudo. Cada área: só a sua, e só se o cliente tem o serviço.
create or replace function public.monthly_area_ok(_client uuid, _area text)
returns boolean language sql stable security definer set search_path to '' as $$
  select public.consult_can() or case
    when _area = 'trafego' then public.has_role('traffic_manager'::public.app_role) and public.client_in_area(_client, 'trafego')
    when _area in ('social', 'design') then (public.has_role('social_media'::public.app_role) or public.has_role('designer'::public.app_role)) and public.client_in_area(_client, 'conteudo')
    when _area = 'audiovisual' then (public.has_role('videomaker'::public.app_role) or public.has_role('editor'::public.app_role) or public.has_role('ellcazo'::public.app_role))
      and public.client_in_area(_client, 'audiovisual')
    else false end
$$;

create or replace function public.monthly_can(_client uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select public.consult_can() or public.monthly_area_ok(_client, 'trafego') or public.monthly_area_ok(_client, 'social') or public.monthly_area_ok(_client, 'audiovisual')
$$;

create or replace function public.monthly_queue(_client uuid, _month date, _ideas text, _by uuid)
returns text language plpgsql security definer set search_path to '' as $$
declare _m date := date_trunc('month', _month)::date; _out text;
begin
  if not public.monthly_eligible(_client) then return null; end if;
  insert into public.monthly_strategies (client_id, month, status, stage, ideas, created_by, queued_at)
  values (_client, _m, 'na_fila', 'base', nullif(trim(coalesce(_ideas, '')), ''), _by, now())
  on conflict (client_id, month) do update set
    status = 'na_fila', stage = 'base', attempts = 0, auto_retries = 0, busy_until = null, error = null, partial = '{}'::jsonb,
    ideas = coalesce(nullif(trim(coalesce(_ideas, '')), ''), public.monthly_strategies.ideas), queued_at = now()
  where public.monthly_strategies.status <> 'gerando'
  returning status into _out;
  return coalesce(_out, (select status from public.monthly_strategies where client_id = _client and month = _m));
end $$;

-- Dia 26: entra todo cliente com serviço de operação (não só Consultoria).
create or replace function public.monthly_queue_next()
returns integer language plpgsql security definer set search_path to '' as $$
declare _m date := (date_trunc('month', (now() at time zone 'America/Sao_Paulo')) + interval '1 month')::date; _n integer := 0; _c uuid;
begin
  for _c in select c.id from public.clients c where public.monthly_eligible(c.id)
    and not exists (select 1 from public.monthly_strategies s where s.client_id = c.id and s.month = _m) loop
    perform public.monthly_queue(_c, _m, null, null); _n := _n + 1;
  end loop;
  return _n;
end $$;

create or replace function public.monthly_request(_client uuid, _month date, _ideas text default null)
returns text language plpgsql security definer set search_path to '' as $$
declare _s text;
begin
  if not public.monthly_can(_client) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if not public.monthly_eligible(_client) then raise exception 'Cliente sem serviço de operação ativo' using errcode = 'PF006'; end if;
  if _month < date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date - interval '1 month' then
    raise exception 'Mês já passou' using errcode = 'PF006';
  end if;
  _s := public.monthly_queue(_client, _month, _ideas, (select auth.uid()));
  if _s = 'gerando' then raise exception 'Já está gerando' using errcode = 'PF012'; end if;
  return _s;
end $$;

create or replace function public.monthly_get(_client uuid, _month date)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _s public.monthly_strategies;
begin
  if not public.monthly_can(_client) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select * into _s from public.monthly_strategies where client_id = _client and month = date_trunc('month', _month)::date;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', _s.id, 'client_id', _s.client_id, 'month', _s.month, 'status', _s.status, 'stage', _s.stage, 'error', _s.error,
    'doc', _s.doc, 'ideas', _s.ideas, 'cost_usd', case when public.consult_can() then _s.cost_usd end, 'adjust', _s.adjust, 'adjusted_at', _s.adjusted_at,
    'finished_at', _s.finished_at, 'approved_at', _s.approved_at, 'updated_at', _s.updated_at,
    'can', jsonb_build_object('all', public.consult_can(), 'trafego', public.monthly_area_ok(_client, 'trafego'),
      'social', public.monthly_area_ok(_client, 'social'), 'audiovisual', public.monthly_area_ok(_client, 'audiovisual')),
    'actions', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'week', a.week, 'area', a.area, 'title', a.title, 'what', a.what, 'place', a.place, 'owner_role', a.owner_role,
      'due_date', a.due_date, 'proof', a.proof, 'why', a.why, 'format', a.format, 'status', a.status,
      'routed_table', a.routed_table, 'routed_id', a.routed_id, 'routed_link', a.routed_link, 'suggestion', a.suggestion,
      'done', case a.routed_table
        when 'content_items' then (select ci.status in ('approved', 'published') from public.content_items ci where ci.id = a.routed_id)
        when 'av_projects' then (select p.status in ('approved', 'delivered') from public.av_projects p where p.id = a.routed_id)
        when 'traffic_tasks' then (select t.status = 'done' from public.traffic_tasks t where t.id = a.routed_id)
        when 'social_tasks' then (select t.status = 'feito' from public.social_tasks t where t.id = a.routed_id)
        else null end
    ) order by a.week, a.position, a.created_at) from public.monthly_strategy_actions a where a.strategy_id = _s.id), '[]'::jsonb)
  );
end $$;

-- Quadro da área: os clientes da área no mês, com a situação do plano e quantas ações da área esperam aprovação.
create or replace function public.monthly_area_board(_month date, _area text)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _m date := date_trunc('month', _month)::date; _ia text := case _area when 'social' then 'conteudo' else _area end;
  _areas text[] := case _area when 'social' then array['social', 'design'] else array[_area] end;
begin
  if _area not in ('trafego', 'social', 'audiovisual') then raise exception 'Área inválida' using errcode = 'PF006'; end if;
  if not public.is_team() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x order by x->>'name') from (
    select jsonb_build_object('client_id', c.id, 'name', trim(c.name), 'logo_path', c.logo_path,
      'strategy_id', s.id, 'status', s.status, 'finished_at', s.finished_at,
      'pending', (select count(*) from public.monthly_strategy_actions a where a.strategy_id = s.id and a.area = any (_areas) and a.status = 'proposta'),
      'approved', (select count(*) from public.monthly_strategy_actions a where a.strategy_id = s.id and a.area = any (_areas) and a.status = 'aprovada'),
      'total', (select count(*) from public.monthly_strategy_actions a where a.strategy_id = s.id and a.area = any (_areas) and a.status <> 'recusada')) x
    from public.clients c
    left join public.monthly_strategies s on s.client_id = c.id and s.month = _m
    where public.client_in_area(c.id, _ia) and public.monthly_area_ok(c.id, _area)) t), '[]'::jsonb);
end $$;

create or replace function public.monthly_brief(_a public.monthly_strategy_actions)
returns text language sql immutable set search_path to '' as $$
  select left(concat_ws(E'\n\n',
    nullif(trim(_a.what), ''),
    case when nullif(trim(coalesce(_a.place, '')), '') is not null then 'Onde: ' || trim(_a.place) end,
    case when _a.due_date is not null then 'Até: ' || to_char(_a.due_date, 'DD/MM') end,
    case when nullif(trim(coalesce(_a.proof, '')), '') is not null then 'O número que prova: ' || trim(_a.proof) end,
    case when nullif(trim(coalesce(_a.why, '')), '') is not null then 'Por quê: ' || trim(_a.why) end,
    'Veio do plano do mês (Estratégia), semana ' || _a.week || '.'), 8000)
$$;

create or replace function public.monthly_action_decide(_id uuid, _approve boolean)
returns text language plpgsql security definer set search_path to '' as $$
declare _a public.monthly_strategy_actions; _s public.monthly_strategies; _plan uuid; _ref uuid; _table text; _link text; _kind text; _brief text; _cname text; _p jsonb;
begin
  select * into _a from public.monthly_strategy_actions where id = _id for update;
  if not found then raise exception 'Não encontrado' using errcode = 'PF004'; end if;
  if not public.monthly_area_ok(_a.client_id, _a.area) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _a.status <> 'proposta' then raise exception 'Já decidido' using errcode = 'PF001'; end if;
  if not _approve then
    update public.monthly_strategy_actions set status = 'recusada', decided_by = (select auth.uid()), decided_at = now() where id = _id;
    return null;
  end if;
  select * into _s from public.monthly_strategies where id = _a.strategy_id;
  _brief := public.monthly_brief(_a);
  _cname := (select name from public.clients where id = _a.client_id);
  _p := coalesce(_a.payload, '{}'::jsonb);

  if _a.area = 'social' and _a.format = 'tarefa' then
    -- Tarefa só do social (stories, comunidade, perfil): vai para as tarefas do Social, não vira peça.
    insert into public.social_tasks (client_id, title, description, status, source, network, priority, due_date, created_by)
    values (_a.client_id, left(_a.title, 200), left(_brief, 4000), 'a_fazer', 'estrategia', 'instagram', false, _a.due_date, (select auth.uid()))
    returning id into _ref;
    _table := 'social_tasks'; _link := '/conteudo/quadro?cliente=' || _a.client_id;
    perform public.notify(public.client_staff_profiles(_a.client_id, array['social_media']), 'strategy_social',
      'Tarefa do plano do mês: ' || left(_a.title, 120), _cname, _link, _a.client_id);
  elsif _a.area in ('social', 'design') then
    insert into public.content_plans (client_id, month) values (_a.client_id, _s.month)
    on conflict (client_id, month) do update set updated_at = public.content_plans.updated_at
    returning id into _plan;
    _kind := case when _a.format in ('post', 'carrossel', 'story', 'reels', 'anuncio') then _a.format else 'post' end;
    insert into public.content_items (plan_id, client_id, number, kind, status, title, briefing, publish_date, deadline, updated_by,
      headline, subtitle, caption, cta, carousel_slides, reference_links)
    values (_plan, _a.client_id, coalesce((select max(number) from public.content_items where plan_id = _plan), 0) + 1, _kind,
      case when _a.area = 'design' then 'ready' else 'briefing' end, left(_a.title, 200), _brief,
      case when _a.area = 'social' then _a.due_date end, _a.due_date, (select auth.uid()),
      nullif(left(_p->>'headline', 500), ''), nullif(left(_p->>'subtitle', 500), ''), nullif(left(_p->>'caption', 4000), ''), nullif(left(_p->>'cta', 200), ''),
      case when jsonb_typeof(_p->'carousel_slides') = 'array' and jsonb_array_length(_p->'carousel_slides') > 0 then _p->'carousel_slides' else '[]'::jsonb end,
      coalesce((select array_agg(x) from jsonb_array_elements_text(case when jsonb_typeof(_p->'reference_links') = 'array' then _p->'reference_links' else '[]'::jsonb end) x where x ~ '^https?://'), '{}'))
    returning id into _ref;
    _table := 'content_items'; _link := '/conteudo/peca/' || _ref;
    perform public.notify(public.client_staff_profiles(_a.client_id, array[case when _a.area = 'design' then 'designer' else 'social_media' end]),
      'strategy_' || _a.area, case when _a.area = 'design' then 'Arte do plano do mês para produzir: ' else 'Pauta do plano do mês: ' end || left(_a.title, 120),
      _cname, _link, _a.client_id);
  elsif _a.area = 'audiovisual' then
    insert into public.av_projects (client_id, kind, month, title, briefing, script, status, due_date, updated_by, format, reference_links)
    values (_a.client_id, 'project', _s.month, left(_a.title, 200),
      left(concat_ws(E'\n\n', nullif(trim(coalesce(_p->>'briefing', '')), ''),
        case when nullif(trim(coalesce(_a.proof, '')), '') is not null then 'O número que prova: ' || trim(_a.proof) end,
        case when nullif(trim(coalesce(_a.why, '')), '') is not null then 'Por quê: ' || trim(_a.why) end, 'Veio do plano do mês, semana ' || _a.week || '.'), 8000),
      left(_a.what, 20000), 'script', _a.due_date, (select auth.uid()), nullif(left(_p->>'format', 200), ''),
      coalesce((select array_agg(x) from jsonb_array_elements_text(case when jsonb_typeof(_p->'reference_links') = 'array' then _p->'reference_links' else '[]'::jsonb end) x where x ~ '^https?://'), '{}'))
    returning id into _ref;
    _table := 'av_projects'; _link := '/audiovisual/projeto/' || _ref;
    perform public.notify(public.client_staff_profiles(_a.client_id, array['videomaker']), 'strategy_audiovisual',
      'Roteiro do plano do mês: ' || left(_a.title, 120), _cname || ' · agende a gravação para entrar no quadro', _link, _a.client_id);
  else
    insert into public.traffic_tasks (title, description, priority, category, source, client_id, status, position, due_date, created_by, updated_by, dedupe_key)
    values (left(_a.title, 200), left(_brief, 4000), 'normal',
      case when _a.area = 'trafego' then (case when _a.format = 'anuncio' then 'criativo' else 'campanha' end) else 'atendimento' end,
      'strategist', _a.client_id, 'todo', 0, _a.due_date, (select auth.uid()), (select auth.uid()), 'monthly:' || _a.id)
    returning id into _ref;
    _table := 'traffic_tasks'; _link := '/trafego/tarefas?tarefa=' || _ref;
    perform public.notify(public.client_staff_profiles(_a.client_id, array[case when _a.area = 'trafego' then 'traffic_manager' else 'head_marketing' end]),
      'strategy_traffic', 'Ação do plano do mês: ' || left(_a.title, 120), _cname, _link, _a.client_id);
  end if;

  update public.monthly_strategy_actions set status = 'aprovada', routed_table = _table, routed_id = _ref, routed_link = _link,
    decided_by = (select auth.uid()), decided_at = now() where id = _id;
  if _s.status = 'pronto' then update public.monthly_strategies set status = 'aprovado', approved_at = now(), approved_by = (select auth.uid()) where id = _s.id; end if;
  return _link;
end $$;

create or replace function public.monthly_action_edit(_id uuid, _title text, _what text, _due date, _proof text)
returns void language plpgsql security definer set search_path to '' as $$
declare _a public.monthly_strategy_actions;
begin
  select * into _a from public.monthly_strategy_actions where id = _id;
  if not found then raise exception 'Não encontrado' using errcode = 'PF004'; end if;
  if not public.monthly_area_ok(_a.client_id, _a.area) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if length(trim(coalesce(_title, ''))) < 3 then raise exception 'Título curto' using errcode = 'PF006'; end if;
  update public.monthly_strategy_actions set title = left(trim(_title), 200), what = left(coalesce(_what, ''), 12000), due_date = _due,
    proof = nullif(trim(coalesce(_proof, '')), '') where id = _id returning * into _a;
  if _a.routed_table = 'content_items' then
    update public.content_items set title = left(_a.title, 200), briefing = public.monthly_brief(_a), deadline = coalesce(_a.due_date, deadline) where id = _a.routed_id;
  elsif _a.routed_table = 'av_projects' then
    update public.av_projects set title = left(_a.title, 200), script = left(_a.what, 20000), due_date = coalesce(_a.due_date, due_date) where id = _a.routed_id;
  elsif _a.routed_table = 'traffic_tasks' then
    update public.traffic_tasks set title = left(_a.title, 200), description = left(public.monthly_brief(_a), 4000), due_date = coalesce(_a.due_date, due_date) where id = _a.routed_id;
  elsif _a.routed_table = 'social_tasks' then
    update public.social_tasks set title = left(_a.title, 200), description = left(public.monthly_brief(_a), 4000), due_date = coalesce(_a.due_date, due_date) where id = _a.routed_id;
  end if;
end $$;

create or replace function public.monthly_adjust_decide(_id uuid, _accept boolean)
returns void language plpgsql security definer set search_path to '' as $$
declare _a public.monthly_strategy_actions; _g jsonb;
begin
  select * into _a from public.monthly_strategy_actions where id = _id for update;
  if not found or _a.suggestion is null then raise exception 'Sem sugestão' using errcode = 'PF004'; end if;
  if not public.monthly_area_ok(_a.client_id, _a.area) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  _g := _a.suggestion;
  update public.monthly_strategy_actions set suggestion = null where id = _id;
  if _accept then
    perform public.monthly_action_edit(_id, coalesce(nullif(_g->>'titulo', ''), _a.title),
      coalesce(nullif(_g->>'o_que', ''), _a.what) || case when nullif(_g->>'porque', '') is not null then E'\n\nAjuste de segunda: ' || (_g->>'porque') else '' end,
      _a.due_date, _a.proof);
  end if;
end $$;

-- Aprovar a semana: só o que a pessoa pode decidir (cada área aprova a sua).
create or replace function public.monthly_approve_week(_strategy uuid, _week integer)
returns integer language plpgsql security definer set search_path to '' as $$
declare _id uuid; _n integer := 0; _c uuid := (select client_id from public.monthly_strategies where id = _strategy);
begin
  if _c is null or not public.monthly_can(_c) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  for _id in select id from public.monthly_strategy_actions a where a.strategy_id = _strategy and a.week = _week and a.status = 'proposta'
      and public.monthly_area_ok(a.client_id, a.area) order by a.position loop
    perform public.monthly_action_decide(_id, true); _n := _n + 1;
  end loop;
  return _n;
end $$;

-- Aprovar a semana só de uma área (tela da área).
create or replace function public.monthly_approve_area_week(_strategy uuid, _week integer, _areas text[])
returns integer language plpgsql security definer set search_path to '' as $$
declare _id uuid; _n integer := 0; _c uuid := (select client_id from public.monthly_strategies where id = _strategy);
begin
  if _c is null or not public.monthly_can(_c) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  for _id in select id from public.monthly_strategy_actions a where a.strategy_id = _strategy and a.week = _week and a.status = 'proposta'
      and a.area = any (_areas) and public.monthly_area_ok(a.client_id, a.area) order by a.position loop
    perform public.monthly_action_decide(_id, true); _n := _n + 1;
  end loop;
  return _n;
end $$;

-- Plano pronto: cada responsável recebe a SUA parte (link da tela da área e da seção dele no Plano de execução).
-- Sem ninguém marcado na área (client_team), o aviso vai uma vez só ao head (sem repetir por área).
create or replace function public.monthly_notify_ready(_strategy uuid)
returns integer language plpgsql security definer set search_path to '' as $$
declare _s public.monthly_strategies; _cname text; _mes text; _m text; _n integer := 0; _who uuid[]; _r record; _heads uuid[];
  _got uuid[] := '{}';
begin
  select * into _s from public.monthly_strategies where id = _strategy;
  if not found then return 0; end if;
  _cname := (select trim(name) from public.clients where id = _s.client_id);
  _m := to_char(_s.month, 'YYYY-MM');
  _mes := (array['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'])[extract(month from _s.month)::int];
  for _r in
    select * from (values
      ('trafego', array['trafego'], array['traffic_manager'], '/estrategia/trafego', 'trafego', 'tráfego'),
      ('social', array['social', 'design'], array['social_media', 'designer'], '/estrategia/social', 'social', 'social media e design'),
      ('audiovisual', array['audiovisual'], array['videomaker', 'editor'], '/audiovisual/plano-do-mes', 'audiovisual', 'audiovisual')
    ) v(area, areas, roles, path, secao, label)
  loop
    if not exists (select 1 from public.monthly_strategy_actions a where a.strategy_id = _s.id and a.area = any (_r.areas) and a.status = 'proposta') then continue; end if;
    select coalesce(array_agg(distinct st.profile_id), '{}') into _who from public.client_team t join public.staff_members st on st.id = t.staff_id
      where t.client_id = _s.client_id and t.role_in_client = any (_r.roles) and st.profile_id is not null;
    _who := array(select x from unnest(_who) x where not x = any (_got));
    if cardinality(_who) = 0 then continue; end if;
    perform public.notify(_who, 'monthly_ready', 'Sua parte do plano de ' || _mes || ': ' || _cname,
      (select count(*) from public.monthly_strategy_actions a where a.strategy_id = _s.id and a.area = any (_r.areas) and a.status = 'proposta')
        || ' ações de ' || _r.label || ' para revisar e aprovar. No Plano de execução, a seção da sua área: /plano/' || _s.client_id || '/' || _m || '?secao=' || _r.secao,
      _r.path || '?cliente=' || _s.client_id || '&mes=' || _m, _s.client_id);
    _got := _got || _who; _n := _n + cardinality(_who);
  end loop;
  _heads := array(select x from unnest(public.client_staff_profiles(_s.client_id, array['head_marketing'])) x where not x = any (_got));
  if cardinality(_heads) > 0 then
    perform public.notify(_heads, 'monthly_ready', 'Plano de ' || _mes || ' pronto: ' || _cname,
      (select count(*) from public.monthly_strategy_actions a where a.strategy_id = _s.id and a.status = 'proposta') || ' ações para revisar e aprovar.',
      case when public.client_in_area(_s.client_id, 'consultoria') then '/estrategia/consultoria?cliente=' || _s.client_id || '&aba=estrategia&mes=' || _m
           when public.client_in_area(_s.client_id, 'trafego') then '/estrategia/trafego?cliente=' || _s.client_id || '&mes=' || _m
           when public.client_in_area(_s.client_id, 'conteudo') then '/estrategia/social?cliente=' || _s.client_id || '&mes=' || _m
           else '/audiovisual/plano-do-mes?cliente=' || _s.client_id || '&mes=' || _m end, _s.client_id);
    _n := _n + cardinality(_heads);
  end if;
  return _n;
end $$;

-- O plano de execução também abre para as áreas (já abria para a equipe toda).
revoke all on function public.monthly_notify_ready(uuid) from public, anon, authenticated;
grant execute on function public.monthly_eligible(uuid), public.monthly_area_ok(uuid, text), public.monthly_can(uuid),
  public.monthly_area_board(date, text), public.monthly_approve_area_week(uuid, integer, text[]) to authenticated;

update public.automation_catalog set
  title = 'Plano do mês (todas as áreas)',
  what = 'No dia 26, de madrugada, a IA escreve o plano do mês seguinte de cada cliente ativo com serviço de operação (Consultoria, Tráfego, Social/Design ou Audiovisual). Cada cliente recebe só as partes do que contratou: só tráfego ≈ US$ 1,50 a 2,50; só social/design ≈ US$ 2,50 a 3,50; Consultoria (tudo) ≈ US$ 4,50 a 6. Cada área recebe o aviso da sua parte e aprova na própria tela.',
  how = 'Estratégia → Consultoria (tudo), Estratégia → Tráfego, Estratégia → Social media e Audiovisual → Plano do mês. Lê o diagnóstico (se houver), o estudo do nicho, as respostas do cliente, o direcionamento, os anúncios, o conteúdo e as datas.'
where key = 'est_mensal';
update public.automation_catalog set
  what = 'Desligado: substituído pelo Plano do mês (dia 26), que já traz a parte de tráfego de cada cliente. As estratégias antigas ficam em Estratégia → Tráfego → Histórico.'
where key = 'trf_estrategia_mes';
