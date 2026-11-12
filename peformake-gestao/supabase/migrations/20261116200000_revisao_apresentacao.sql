-- Revisão da apresentação em guia própria (pedido do Italo, 12/11/2026): slide a slide, OK / Recusar / Editar / Preencher.
-- O estado fica salvo por apresentação (diagnóstico agora; plano do mês e outras estratégias depois, pelo mesmo formato).
-- A versão do cliente (consult_public_payload) esconde o recusado e usa o texto editado e os dados preenchidos.
-- "Aprovar e finalizar": aprova, grava os dados preenchidos no documento e transforma o plano de ação aprovado em tarefas das áreas.

create table if not exists public.strategy_reviews (
  kind text not null constraint strategy_reviews_kind_ok check (kind in ('diagnostico', 'plano', 'trafego', 'social', 'audiovisual', 'trimestral')),
  client_id uuid not null,                          -- id do cliente (sem chave estrangeira, como os registros de revisão)
  ref text not null default '',                     -- '' no diagnóstico; 'AAAA-MM-01' no plano do mês
  state jsonb not null default '{}'::jsonb,         -- {slides:{chave:{s,reason,edit}}, fills:{caminho:texto}, steps:{'fase.passo':'ok'|'recusado'}}
  finished_at timestamptz,
  finished_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (kind, client_id, ref)
);
alter table public.strategy_reviews enable row level security;
revoke all on public.strategy_reviews from anon;

create or replace function public.review_can(_kind text, _client uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select case when _kind = 'diagnostico' then public.consult_can() when _kind in ('plano', 'trafego', 'social', 'audiovisual', 'trimestral') then public.monthly_can(_client) else false end
$$;
revoke all on function public.review_can(text, uuid) from public, anon;
grant execute on function public.review_can(text, uuid) to authenticated;

create or replace function public.review_get(_kind text, _client uuid, _ref text default '') returns jsonb
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.review_can(_kind, _client) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return coalesce((select jsonb_build_object('state', r.state, 'finished_at', r.finished_at, 'updated_at', r.updated_at)
    from public.strategy_reviews r where r.kind = _kind and r.client_id = _client and r.ref = coalesce(_ref, '')),
    jsonb_build_object('state', '{}'::jsonb, 'finished_at', null, 'updated_at', null));
end $$;
revoke all on function public.review_get(text, uuid, text) from public, anon;
grant execute on function public.review_get(text, uuid, text) to authenticated;

/** Grava uma decisão da revisão (um slide, um dado ou um passo do plano). Valor nulo desfaz. */
create or replace function public.review_save(_kind text, _client uuid, _ref text, _section text, _key text, _value jsonb) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare _s jsonb;
begin
  if not public.review_can(_kind, _client) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _section not in ('slides', 'fills', 'steps', 'adds') or _key is null or length(_key) not between 1 and 200 or _key ~ '[[:cntrl:]]'
     or length(coalesce(_value::text, '')) > 20000 then
    raise exception 'Formato invalido' using errcode = 'PF006';
  end if;
  insert into public.strategy_reviews (kind, client_id, ref, updated_by) values (_kind, _client, coalesce(_ref, ''), auth.uid())
  on conflict (kind, client_id, ref) do nothing;
  update public.strategy_reviews r set
    state = case when _value is null or _value = 'null'::jsonb then r.state #- array[_section, _key]
      else jsonb_set(case when jsonb_typeof(r.state -> _section) = 'object' then r.state else jsonb_set(r.state, array[_section], '{}'::jsonb) end, array[_section, _key], _value) end,
    updated_at = now(), updated_by = auth.uid()
  where r.kind = _kind and r.client_id = _client and r.ref = coalesce(_ref, '')
  returning r.state into _s;
  return _s;
end $$;
revoke all on function public.review_save(text, uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.review_save(text, uuid, text, text, text, jsonb) to authenticated;

-- ───────── Plano de ação do diagnóstico → tarefa da área certa ─────────
create table if not exists public.consult_plan_tasks (
  client_id uuid not null,                          -- id do cliente (sem chave estrangeira, como os registros de revisão)
  step_key text not null,                           -- 'fase.passo' (índices em plano.fases[].passos[])
  action text not null,
  area text not null check (area in ('trafego', 'social', 'atendimento')),
  task_table text not null,
  task_id uuid not null,
  link text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  primary key (client_id, step_key)
);
alter table public.consult_plan_tasks enable row level security;
revoke all on public.consult_plan_tasks from anon;

create or replace function public.consult_plan_tasks_list(_client uuid)
returns table(step_key text, area text, link text, created_at timestamptz)
language sql stable security definer set search_path to '' as $$
  select t.step_key, t.area, t.link, t.created_at from public.consult_plan_tasks t where t.client_id = _client and public.consult_can()
$$;
revoke all on function public.consult_plan_tasks_list(uuid) from public, anon;
grant execute on function public.consult_plan_tasks_list(uuid) to authenticated;

/** Área de um passo do plano pelo texto (Instagram/conteúdo → social; anúncios/tráfego → tráfego; o resto → atendimento). */
create or replace function public.consult_step_area(_step jsonb) returns text
language sql immutable set search_path to '' as $$
  select case
    when lower(coalesce(_step->>'area', '') || ' ' || coalesce(_step->>'acao', '')) ~ '(instagram|conte[uú]do|redes|social|stories|reels|\mpost|destaque|\mbio\M)' then 'social'
    when lower(coalesce(_step->>'area', '') || ' ' || coalesce(_step->>'acao', '')) ~ '(tr[aá]fego|an[uú]ncio|campanha|meta ads|google ads|verba)' then 'trafego'
    else 'atendimento' end
$$;

create or replace function public.consult_plan_step_to_task(_client uuid, _key text) returns text
language plpgsql security definer set search_path to '' as $$
declare _doc jsonb; _f jsonb; _st jsonb; _fi int; _si int; _area text; _id uuid; _table text; _link text; _desc text; _title text; _cname text;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _key !~ '^\d{1,2}\.\d{1,2}$' then raise exception 'Formato invalido' using errcode = 'PF006'; end if;
  select link into _link from public.consult_plan_tasks where client_id = _client and step_key = _key;
  if found then return _link; end if;
  _fi := split_part(_key, '.', 1)::int; _si := split_part(_key, '.', 2)::int;
  select doc into _doc from public.consult_docs where client_id = _client;
  _f := _doc #> array['plano', 'fases', _fi::text];
  _st := _f #> array['passos', _si::text];
  if _st is null or nullif(trim(coalesce(_st->>'acao', '')), '') is null then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  _area := public.consult_step_area(_st);
  _title := left(trim(_st->>'acao'), 200);
  _cname := (select name from public.clients where id = _client);
  _desc := left(concat_ws(E'\n\n', 'Plano de ação da Consultoria' || coalesce(' (' || nullif(trim(_f->>'periodo'), '') || ')', '') || ': ' || trim(_st->>'acao'),
    case when nullif(trim(coalesce(_st->>'como', '')), '') is not null then 'Como: ' || trim(_st->>'como') end,
    case when nullif(trim(coalesce(_st->>'quem', '')), '') is not null then 'Quem faz: ' || trim(_st->>'quem') end,
    'Veio do diagnóstico aprovado.'), 4000);
  if _area = 'social' then
    insert into public.social_tasks (client_id, title, description, status, source, network, priority, created_by)
    values (_client, _title, _desc, 'a_fazer', 'estrategia', 'instagram', false, auth.uid()) returning id into _id;
    _table := 'social_tasks'; _link := '/conteudo/quadro?cliente=' || _client;
    perform public.notify(public.client_staff_profiles(_client, array['social_media']), 'consult_task', 'Tarefa do diagnóstico: ' || left(_title, 120), _cname, _link, _client);
  else
    insert into public.traffic_tasks (title, description, priority, category, source, client_id, status, position, created_by, updated_by, dedupe_key)
    values (_title, _desc, 'normal', case when _area = 'trafego' then 'campanha' else 'atendimento' end, 'strategist', _client, 'todo', 0, auth.uid(), auth.uid(), 'consult-plan:' || _client || ':' || _key)
    returning id into _id;
    _table := 'traffic_tasks'; _link := '/trafego/tarefas?tarefa=' || _id;
    perform public.notify(public.client_staff_profiles(_client, array[case when _area = 'trafego' then 'traffic_manager' else 'head_marketing' end]),
      'consult_task', 'Tarefa do diagnóstico: ' || left(_title, 120), _cname, _link, _client);
  end if;
  insert into public.consult_plan_tasks (client_id, step_key, action, area, task_table, task_id, link, created_by)
  values (_client, _key, _title, _area, _table, _id, _link, auth.uid());
  return _link;
end $$;
revoke all on function public.consult_plan_step_to_task(uuid, text) from public, anon;
grant execute on function public.consult_plan_step_to_task(uuid, text) to authenticated;

/**
 * "Aprovar e finalizar" do diagnóstico, num passo só: grava os dados preenchidos no documento (marcados como edição humana,
 * o "Refazer" não apaga), aprova (mesmo status de hoje) e transforma os passos aprovados do plano em tarefas. Não envia nada ao cliente.
 */
create or replace function public.consult_review_finalize(_client uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare _r public.strategy_reviews; _doc jsonb; _edits jsonb; _k text; _v jsonb; _p text[]; _n int := 0; _filled int := 0;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select doc, human_edits into _doc, _edits from public.consult_docs where client_id = _client and status in ('pronto', 'aprovado', 'enviado') for update;
  if not found then raise exception 'O diagnóstico ainda não está pronto' using errcode = 'PF005'; end if;
  select * into _r from public.strategy_reviews where kind = 'diagnostico' and client_id = _client and ref = '';
  if found and jsonb_typeof(_r.state -> 'fills') = 'object' then
    for _k, _v in select * from jsonb_each(_r.state -> 'fills') loop
      _p := string_to_array(_k, '.');
      continue when jsonb_typeof(_v) <> 'string' or cardinality(_p) not between 2 and 8
        or _p[1] not in ('resumo', 'diagnostico', 'comunicacao', 'experiencia', 'plano', 'riscos', 'inteligencia', 'confirmar')
        or exists (select 1 from unnest(_p) x where x !~ '^[a-z_0-9]{1,40}$') or jsonb_typeof(_doc #> _p) is distinct from 'string';
      _doc := jsonb_set(_doc, _p, to_jsonb(left(_v #>> '{}', 4000)), false);
      _edits := _edits || jsonb_build_object(_k, jsonb_build_object('at', now(), 'by', auth.uid(), 'via', 'revisao'));
      _filled := _filled + 1;
    end loop;
  end if;
  update public.consult_docs set doc = _doc, human_edits = _edits,
    status = case when status = 'pronto' then 'aprovado' else status end,
    approved_at = coalesce(approved_at, now()), approved_by = coalesce(approved_by, auth.uid())
  where client_id = _client;
  if _r.state is not null and jsonb_typeof(_r.state -> 'steps') = 'object' then
    for _k in select e.key from jsonb_each_text(_r.state -> 'steps') e where e.value = 'ok' order by e.key loop
      begin
        perform public.consult_plan_step_to_task(_client, _k);
        _n := _n + 1;
      exception when sqlstate 'PF004' then null;
      end;
    end loop;
  end if;
  insert into public.strategy_reviews (kind, client_id, ref, finished_at, finished_by, updated_by) values ('diagnostico', _client, '', now(), auth.uid(), auth.uid())
  on conflict (kind, client_id, ref) do update set finished_at = now(), finished_by = auth.uid(), updated_at = now(), updated_by = auth.uid();
  return jsonb_build_object('tasks', _n, 'filled', _filled);
end $$;
revoke all on function public.consult_review_finalize(uuid) from public, anon;
grant execute on function public.consult_review_finalize(uuid) to authenticated;

insert into public.notification_rules (kind, category, name, description, audience, in_app, email, position)
values ('consult_task', 'clientes', 'Tarefa da Consultoria', 'Passo aprovado do plano de ação ou decisão do diagnóstico virou tarefa da sua área.', 'equipe', true, false, 91)
on conflict (kind) do nothing;

/** O que o cliente pode ver: documento sem as partes internas + a revisão (slides recusados, textos editados, dados preenchidos), sem motivos. */
create or replace function public.consult_public_payload(_client uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'name', trim(c.name), 'logo_path', c.logo_path, 'segment', c.segment,
    'doc', (d.doc - 'fontes' - 'frameworks' - 'do_cliente' - 'confirmar')
      #- '{inteligencia,decisoes_peformake}' #- '{inteligencia,red_flags}' #- '{inteligencia,problemas_internos}' #- '{inteligencia,confirmar}' #- '{inteligencia,perguntas}',
    'questions', coalesce((select jsonb_agg(jsonb_build_object('question', q.question, 'why', q.why, 'answer', q.answer) order by q.created_at)
      from public.client_questions q where q.client_id = c.id and q.area = 'consultoria' and q.status <> 'descartada'), '[]'::jsonb),
    'review', (select jsonb_build_object(
        'slides', coalesce((select jsonb_object_agg(s.key, s.value - 'reason') from jsonb_each(case when jsonb_typeof(r.state -> 'slides') = 'object' then r.state -> 'slides' else '{}'::jsonb end) s), '{}'::jsonb),
        'fills', coalesce((select jsonb_object_agg(f.key, f.value) from jsonb_each(case when jsonb_typeof(r.state -> 'fills') = 'object' then r.state -> 'fills' else '{}'::jsonb end) f
          where split_part(f.key, '.', 1) in ('resumo', 'diagnostico', 'comunicacao', 'experiencia', 'plano', 'riscos', 'inteligencia')
            and f.key !~ '^inteligencia\.(decisoes_peformake|red_flags|problemas_internos|confirmar|perguntas)'), '{}'::jsonb),
        'steps', coalesce(case when jsonb_typeof(r.state -> 'steps') = 'object' then r.state -> 'steps' end, '{}'::jsonb))
      from public.strategy_reviews r where r.kind = 'diagnostico' and r.client_id = c.id and r.ref = ''),
    'approved_at', d.approved_at,
    'updated_at', greatest(d.updated_at, (select max(q.answered_at) from public.client_questions q where q.client_id = c.id and q.area = 'consultoria'))
  )
  from public.consult_docs d join public.clients c on c.id = d.client_id where d.client_id = _client
$$;
revoke all on function public.consult_public_payload(uuid) from public, anon, authenticated;

-- ───────── "+ Adicionar": ideia nova da equipe (não veio da IA) ─────────
-- Diagnóstico: fica em state.adds {id:{titulo, o_que, area, fase}}; vira slide "Ideias novas" no plano e, aprovada, tarefa da área.
-- Plano do mês: vira ação nova (proposta) do mês; aprovar manda para a produção como as outras.
create or replace function public.consult_step_area(_step jsonb) returns text
language sql immutable set search_path to '' as $$
  select case
    when _step->>'area_key' in ('social', 'design') then 'social'
    when _step->>'area_key' = 'trafego' then 'trafego'
    when _step->>'area_key' = 'audiovisual' then 'audiovisual'
    when _step->>'area_key' in ('vendas', 'atendimento') then 'atendimento'
    when lower(coalesce(_step->>'area', '') || ' ' || coalesce(_step->>'acao', '')) ~ '(instagram|conte[uú]do|redes|social|stories|reels|\mpost|destaque|\mbio\M)' then 'social'
    when lower(coalesce(_step->>'area', '') || ' ' || coalesce(_step->>'acao', '')) ~ '(tr[aá]fego|an[uú]ncio|campanha|meta ads|google ads|verba)' then 'trafego'
    else 'atendimento' end
$$;

alter table public.consult_plan_tasks drop constraint if exists consult_plan_tasks_area_check;
alter table public.consult_plan_tasks add constraint consult_plan_tasks_area_ok check (area in ('trafego', 'social', 'atendimento', 'audiovisual'));

create or replace function public.consult_plan_step_to_task(_client uuid, _key text) returns text
language plpgsql security definer set search_path to '' as $$
declare _doc jsonb; _f jsonb; _st jsonb; _fi int; _si int; _area text; _id uuid; _table text; _link text; _desc text; _title text; _cname text; _a jsonb;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _key !~ '^(\d{1,2}\.\d{1,2}|a:[a-z0-9]{4,24})$' then raise exception 'Formato invalido' using errcode = 'PF006'; end if;
  select link into _link from public.consult_plan_tasks where client_id = _client and step_key = _key;
  if found then return _link; end if;
  if _key like 'a:%' then
    -- Ideia que a equipe adicionou na revisão.
    select r.state #> array['adds', substr(_key, 3)] into _a from public.strategy_reviews r where r.kind = 'diagnostico' and r.client_id = _client and r.ref = '';
    if _a is null or nullif(trim(coalesce(_a->>'titulo', '')), '') is null then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
    select doc into _doc from public.consult_docs where client_id = _client;
    _f := _doc #> array['plano', 'fases', coalesce(nullif(_a->>'fase', ''), '0')];
    _st := jsonb_build_object('acao', _a->>'titulo', 'como', _a->>'o_que', 'quem', 'peformake', 'area_key', _a->>'area');
  else
    _fi := split_part(_key, '.', 1)::int; _si := split_part(_key, '.', 2)::int;
    select doc into _doc from public.consult_docs where client_id = _client;
    _f := _doc #> array['plano', 'fases', _fi::text];
    _st := _f #> array['passos', _si::text];
  end if;
  if _st is null or nullif(trim(coalesce(_st->>'acao', '')), '') is null then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  _area := public.consult_step_area(_st);
  _title := left(trim(_st->>'acao'), 200);
  _cname := (select name from public.clients where id = _client);
  _desc := left(concat_ws(E'\n\n', 'Plano de ação da Consultoria' || coalesce(' (' || nullif(trim(_f->>'periodo'), '') || ')', '') || ': ' || trim(_st->>'acao'),
    case when nullif(trim(coalesce(_st->>'como', '')), '') is not null then 'Como: ' || trim(_st->>'como') end,
    case when nullif(trim(coalesce(_st->>'quem', '')), '') is not null then 'Quem faz: ' || trim(_st->>'quem') end,
    'Veio do diagnóstico aprovado.'), 4000);
  if _area = 'social' then
    insert into public.social_tasks (client_id, title, description, status, source, network, priority, created_by)
    values (_client, _title, _desc, 'a_fazer', 'estrategia', 'instagram', false, auth.uid()) returning id into _id;
    _table := 'social_tasks'; _link := '/conteudo/quadro?cliente=' || _client;
    perform public.notify(public.client_staff_profiles(_client, array['social_media']), 'consult_task', 'Tarefa do diagnóstico: ' || left(_title, 120), _cname, _link, _client);
  elsif _area = 'audiovisual' then
    insert into public.av_projects (client_id, kind, month, title, briefing, script, status, updated_by)
    values (_client, 'project', date_trunc('month', now())::date, _title, _desc, '', 'script', auth.uid()) returning id into _id;
    _table := 'av_projects'; _link := '/audiovisual/projeto/' || _id;
    perform public.notify(public.client_staff_profiles(_client, array['videomaker']), 'consult_task', 'Roteiro do diagnóstico: ' || left(_title, 120), _cname, _link, _client);
  else
    insert into public.traffic_tasks (title, description, priority, category, source, client_id, status, position, created_by, updated_by, dedupe_key)
    values (_title, _desc, 'normal', case when _area = 'trafego' then 'campanha' else 'atendimento' end, 'strategist', _client, 'todo', 0, auth.uid(), auth.uid(), 'consult-plan:' || _client || ':' || _key)
    returning id into _id;
    _table := 'traffic_tasks'; _link := '/trafego/tarefas?tarefa=' || _id;
    perform public.notify(public.client_staff_profiles(_client, array[case when _area = 'trafego' then 'traffic_manager' else 'head_marketing' end]),
      'consult_task', 'Tarefa do diagnóstico: ' || left(_title, 120), _cname, _link, _client);
  end if;
  insert into public.consult_plan_tasks (client_id, step_key, action, area, task_table, task_id, link, created_by)
  values (_client, _key, _title, _area, _table, _id, _link, auth.uid());
  return _link;
end $$;
revoke all on function public.consult_plan_step_to_task(uuid, text) from public, anon;
grant execute on function public.consult_plan_step_to_task(uuid, text) to authenticated;

/** Plano do mês: ação nova que a equipe adicionou na revisão (entra como proposta; aprovar manda para a produção). */
create or replace function public.monthly_action_add(_strategy uuid, _area text, _title text, _what text, _week integer default null, _due date default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _s public.monthly_strategies; _id uuid;
begin
  select * into _s from public.monthly_strategies where id = _strategy;
  if not found then raise exception 'Não encontrado' using errcode = 'PF004'; end if;
  if _area not in ('trafego', 'social', 'design', 'audiovisual', 'vendas', 'atendimento') or length(trim(coalesce(_title, ''))) < 3 then raise exception 'Confira os dados' using errcode = 'PF006'; end if;
  if not public.monthly_area_ok(_s.client_id, _area) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  insert into public.monthly_strategy_actions (strategy_id, client_id, week, area, title, what, due_date, why, format, position, status, payload)
  values (_strategy, _s.client_id, greatest(1, least(4, coalesce(_week, case when _due is not null then least(4, (extract(day from _due)::int - 1) / 7 + 1) else 1 end))),
    _area, left(trim(_title), 200), left(trim(coalesce(_what, '')), 4000), _due, 'Ideia adicionada pela equipe na revisão.',
    case when _area = 'social' then 'tarefa' end, 999, 'proposta', jsonb_build_object('added_by', auth.uid(), 'source', 'revisao'))
  returning id into _id;
  return _id;
end $$;
revoke all on function public.monthly_action_add(uuid, text, text, text, integer, date) from public, anon;
grant execute on function public.monthly_action_add(uuid, text, text, text, integer, date) to authenticated;

create or replace function public.consult_public_payload(_client uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'name', trim(c.name), 'logo_path', c.logo_path, 'segment', c.segment,
    'doc', (d.doc - 'fontes' - 'frameworks' - 'do_cliente' - 'confirmar')
      #- '{inteligencia,decisoes_peformake}' #- '{inteligencia,red_flags}' #- '{inteligencia,problemas_internos}' #- '{inteligencia,confirmar}' #- '{inteligencia,perguntas}',
    'questions', coalesce((select jsonb_agg(jsonb_build_object('question', q.question, 'why', q.why, 'answer', q.answer) order by q.created_at)
      from public.client_questions q where q.client_id = c.id and q.area = 'consultoria' and q.status <> 'descartada'), '[]'::jsonb),
    'review', (select jsonb_build_object(
        'slides', coalesce((select jsonb_object_agg(s.key, s.value - 'reason') from jsonb_each(case when jsonb_typeof(r.state -> 'slides') = 'object' then r.state -> 'slides' else '{}'::jsonb end) s), '{}'::jsonb),
        'fills', coalesce((select jsonb_object_agg(f.key, f.value) from jsonb_each(case when jsonb_typeof(r.state -> 'fills') = 'object' then r.state -> 'fills' else '{}'::jsonb end) f
          where split_part(f.key, '.', 1) in ('resumo', 'diagnostico', 'comunicacao', 'experiencia', 'plano', 'riscos', 'inteligencia')
            and f.key !~ '^inteligencia\.(decisoes_peformake|red_flags|problemas_internos|confirmar|perguntas)'), '{}'::jsonb),
        'steps', coalesce(case when jsonb_typeof(r.state -> 'steps') = 'object' then r.state -> 'steps' end, '{}'::jsonb),
        'adds', coalesce((select jsonb_object_agg(a.key, a.value) from jsonb_each(case when jsonb_typeof(r.state -> 'adds') = 'object' then r.state -> 'adds' else '{}'::jsonb end) a
          where coalesce(r.state #>> array['steps', 'a:' || a.key], '') <> 'recusado'), '{}'::jsonb))
      from public.strategy_reviews r where r.kind = 'diagnostico' and r.client_id = c.id and r.ref = ''),
    'approved_at', d.approved_at,
    'updated_at', greatest(d.updated_at, (select max(q.answered_at) from public.client_questions q where q.client_id = c.id and q.area = 'consultoria'))
  )
  from public.consult_docs d join public.clients c on c.id = d.client_id where d.client_id = _client
$$;
revoke all on function public.consult_public_payload(uuid) from public, anon, authenticated;

/** Link do plano do mês: leva também a revisão dos slides (recusados somem, textos editados), sem os motivos. */
create or replace function public.monthly_public(_token text) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare _s public.monthly_strategies;
begin
  if _token is null or length(_token) < 40 then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  select * into _s from public.monthly_strategies where share_token = _token;
  if not found then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  if _s.status not in ('pronto', 'aprovado') then return jsonb_build_object('updating', true); end if;
  return public.monthly_public_payload(_s.id) || jsonb_build_object('review', (
    select jsonb_build_object('slides', coalesce((select jsonb_object_agg(x.key, x.value - 'reason') from jsonb_each(case when jsonb_typeof(r.state -> 'slides') = 'object' then r.state -> 'slides' else '{}'::jsonb end) x), '{}'::jsonb))
    from public.strategy_reviews r where r.kind = 'plano' and r.client_id = _s.client_id and r.ref = to_char(_s.month, 'YYYY-MM-DD')));
end $$;
