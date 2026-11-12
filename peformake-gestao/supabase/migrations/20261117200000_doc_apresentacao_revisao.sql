-- Apresentação dos documentos da Peformake (PDF + HTML do agente): revisão página a página.
-- Cada página: OK, Recusar ou "Virar tarefa" (cai na fila que já existe da área e avisa o responsável).

create table if not exists public.agent_doc_reviews (
  asset_id uuid not null references public.client_assets(id) on delete cascade,
  page_index int not null check (page_index between 0 and 500),
  state text not null check (state in ('ok', 'recusado', 'tarefa')),
  task_table text,
  task_id uuid,
  task_link text,
  reviewed_by uuid default auth.uid(),
  reviewed_at timestamptz not null default now(),
  primary key (asset_id, page_index)
);
alter table public.agent_doc_reviews enable row level security;

create policy agent_doc_reviews_select on public.agent_doc_reviews for select to authenticated using ((select public.is_team()));
create policy agent_doc_reviews_insert on public.agent_doc_reviews for insert to authenticated
  with check ((select public.is_team()) and state in ('ok', 'recusado'));
create policy agent_doc_reviews_update on public.agent_doc_reviews for update to authenticated
  using ((select public.is_team()) and state <> 'tarefa') with check ((select public.is_team()) and state in ('ok', 'recusado'));

grant select, insert, update on public.agent_doc_reviews to authenticated;

-- Página que vira tarefa: mesma fila de monthly_action_decide / consult_decision_to_task.
create or replace function public.agent_doc_page_task(_asset uuid, _page int, _area text, _title text, _assignee uuid, _brief text)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare _a public.client_assets; _r public.agent_doc_reviews; _cname text; _month date := date_trunc('month', now() at time zone 'America/Recife')::date;
  _plan uuid; _ref uuid; _table text; _link text; _desc text; _t text; _role text; _profile uuid;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select * into _a from public.client_assets where id = _asset and source = 'agente';
  if _a.id is null then raise exception 'Documento não encontrado' using errcode = 'PF004'; end if;
  if _area not in ('social', 'design', 'audiovisual', 'trafego', 'atendimento') then raise exception 'Área inválida' using errcode = 'PF006'; end if;
  _t := left(trim(coalesce(_title, '')), 200);
  if length(_t) < 3 then raise exception 'Título vazio' using errcode = 'PF006'; end if;
  select * into _r from public.agent_doc_reviews where asset_id = _asset and page_index = _page;
  if _r.state = 'tarefa' then raise exception 'Essa página já virou tarefa' using errcode = 'PF001'; end if;
  _cname := (select trim(name) from public.clients where id = _a.client_id);
  _desc := left(concat_ws(E'\n\n', nullif(trim(coalesce(_brief, '')), ''),
    'Veio da página ' || (_page + 1) || ' do documento "' || regexp_replace(_a.name, '\.(pdf|html)$', '', 'i') || '".'), 4000);
  _profile := (select m.profile_id from public.staff_members m where m.id = _assignee);

  if _area = 'social' then
    insert into public.social_tasks (client_id, title, description, status, source, network, assignee_id, created_by)
    values (_a.client_id, _t, _desc, 'a_fazer', 'estrategia', 'geral', _profile, (select auth.uid()))
    returning id into _ref;
    _table := 'social_tasks'; _link := '/conteudo/quadro?cliente=' || _a.client_id; _role := 'social_media';
  elsif _area = 'design' then
    insert into public.content_plans (client_id, month) values (_a.client_id, _month)
    on conflict (client_id, month) do update set updated_at = public.content_plans.updated_at
    returning id into _plan;
    insert into public.content_items (plan_id, client_id, number, kind, status, title, briefing, designer_id, updated_by)
    values (_plan, _a.client_id, coalesce((select max(number) from public.content_items where plan_id = _plan), 0) + 1, 'post', 'ready', _t, _desc, _assignee, (select auth.uid()))
    returning id into _ref;
    _table := 'content_items'; _link := '/conteudo/peca/' || _ref; _role := 'designer';
  elsif _area = 'audiovisual' then
    insert into public.av_projects (client_id, kind, month, title, briefing, status, videomaker_id, updated_by)
    values (_a.client_id, 'project', _month, _t, left(_desc, 8000), 'script', _assignee, (select auth.uid()))
    returning id into _ref;
    _table := 'av_projects'; _link := '/audiovisual/projeto/' || _ref; _role := 'videomaker';
  else
    insert into public.traffic_tasks (title, description, priority, category, source, client_id, status, position, assignee_id, created_by, updated_by, dedupe_key)
    values (_t, _desc, 'normal', case when _area = 'atendimento' then 'atendimento' else 'campanha' end, 'strategist', _a.client_id, 'todo', 0, _assignee,
      (select auth.uid()), (select auth.uid()), 'agentdoc:' || _asset || ':' || _page)
    returning id into _ref;
    _table := 'traffic_tasks'; _link := '/trafego/tarefas?tarefa=' || _ref; _role := case when _area = 'trafego' then 'traffic_manager' else 'head_marketing' end;
  end if;

  perform public.notify(
    case when _profile is not null then array[_profile] else public.client_staff_profiles(_a.client_id, array[_role]) end,
    'agent_doc_task', 'Tarefa do documento: ' || left(_t, 120), _cname, _link, _a.client_id);

  insert into public.agent_doc_reviews (asset_id, page_index, state, task_table, task_id, task_link, reviewed_by, reviewed_at)
  values (_asset, _page, 'tarefa', _table, _ref, _link, (select auth.uid()), now())
  on conflict (asset_id, page_index) do update set state = 'tarefa', task_table = excluded.task_table, task_id = excluded.task_id,
    task_link = excluded.task_link, reviewed_by = excluded.reviewed_by, reviewed_at = excluded.reviewed_at;
  return _link;
end $function$;

grant execute on function public.agent_doc_page_task(uuid, int, text, text, uuid, text) to authenticated;
