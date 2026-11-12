-- Consultoria: decisão interna vira tarefa com um toque (pedido do Italo, 12/11/2026).
-- A equipe escolhe a opção e a área; a tarefa cai no quadro da área (tráfego ou redes sociais).
create table if not exists public.consult_decision_tasks (
  client_id uuid not null references public.clients(id) on delete cascade,
  decision_index integer not null check (decision_index between 0 and 50),
  decision text not null,
  option_chosen text,
  area text not null check (area in ('trafego', 'social', 'atendimento')),
  task_table text not null,
  task_id uuid not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  primary key (client_id, decision_index)
);
alter table public.consult_decision_tasks enable row level security;
revoke all on public.consult_decision_tasks from anon;

create or replace function public.consult_decision_tasks_list(_client uuid)
returns table(decision_index integer, area text, option_chosen text, link text, created_at timestamptz)
language sql stable security definer set search_path to '' as $$
  select t.decision_index, t.area, t.option_chosen,
    case when t.task_table = 'social_tasks' then '/conteudo/redes' else '/trafego/tarefas' end, t.created_at
  from public.consult_decision_tasks t
  where t.client_id = _client and public.consult_can()
$$;
revoke all on function public.consult_decision_tasks_list(uuid) from public, anon;
grant execute on function public.consult_decision_tasks_list(uuid) to authenticated;

create or replace function public.consult_decision_to_task(_client uuid, _index integer, _decision text, _option text, _why text, _area text, _assignee uuid)
returns text language plpgsql security definer set search_path to '' as $$
declare _id uuid; _table text; _desc text; _link text;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _area not in ('trafego', 'social', 'atendimento') then raise exception 'Área inválida' using errcode = 'PF006'; end if;
  if length(trim(coalesce(_decision, ''))) < 3 then raise exception 'Decisão vazia' using errcode = 'PF006'; end if;
  if exists (select 1 from public.consult_decision_tasks where client_id = _client and decision_index = _index) then
    raise exception 'Essa decisão já virou tarefa' using errcode = 'PF001';
  end if;
  _desc := left(concat_ws(E'\n\n', 'Decisão da Consultoria: ' || trim(_decision),
    case when nullif(trim(coalesce(_option, '')), '') is not null then 'Caminho escolhido: ' || trim(_option) end,
    case when nullif(trim(coalesce(_why, '')), '') is not null then 'Por quê: ' || trim(_why) end), 4000);
  if _area = 'social' then
    insert into public.social_tasks (client_id, title, description, source, network, assignee_id, created_by)
    values (_client, left(coalesce(nullif(trim(_option), ''), trim(_decision)), 200), _desc, 'estrategia', 'geral', (select m.profile_id from public.staff_members m where m.id = _assignee), (select auth.uid()))
    returning id into _id;
    _table := 'social_tasks'; _link := '/conteudo/redes';
  else
    insert into public.traffic_tasks (title, description, priority, category, source, client_id, status, position, assignee_id, created_by, updated_by, dedupe_key)
    values (left(coalesce(nullif(trim(_option), ''), trim(_decision)), 200), _desc, 'normal',
      case when _area = 'atendimento' then 'atendimento' else 'campanha' end, 'strategist', _client, 'todo', 0, _assignee,
      (select auth.uid()), (select auth.uid()), 'consult:' || _client || ':' || _index)
    returning id into _id;
    _table := 'traffic_tasks'; _link := '/trafego/tarefas';
  end if;
  insert into public.consult_decision_tasks (client_id, decision_index, decision, option_chosen, area, task_table, task_id, created_by)
  values (_client, _index, left(trim(_decision), 500), left(nullif(trim(coalesce(_option, '')), ''), 500), _area, _table, _id, (select auth.uid()));
  if _assignee is not null then
    perform public.notify(array(select m.profile_id from public.staff_members m where m.id = _assignee and m.profile_id is not null),
      'consult_task', 'Tarefa da Consultoria: ' || left(coalesce(nullif(trim(_option), ''), trim(_decision)), 120),
      (select name from public.clients where id = _client), _link, _client);
  end if;
  return _link;
end $$;
revoke all on function public.consult_decision_to_task(uuid, integer, text, text, text, text, uuid) from public, anon;
grant execute on function public.consult_decision_to_task(uuid, integer, text, text, text, text, uuid) to authenticated;
