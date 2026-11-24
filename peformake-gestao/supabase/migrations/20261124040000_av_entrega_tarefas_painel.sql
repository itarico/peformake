-- Audiovisual (pedido do Italo, 24/11/2026):
-- 1. Prazo de entrega automático: marcou a gravação, o vídeo vence N dias depois (N em av_settings.delivery_days, padrão 3).
-- 2. Tarefas da equipe por área (team_tasks), começando pelo audiovisual. A entrega de cada gravação vira uma tarefa sozinha.
-- 3. Painel de clientes do audiovisual: fixos e avulsos, última gravação, próxima, e quem precisa ser agendado.

alter table public.av_settings add column if not exists delivery_days integer not null default 3 check (delivery_days between 0 and 60);

-- 2. Tarefas por área ------------------------------------------------------------------------------------------------
create table if not exists public.team_tasks (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('audiovisual', 'design', 'trafego', 'comercial', 'social')),
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'a_fazer' check (status in ('a_fazer', 'fazendo', 'feito')),
  source text not null default 'manual' check (source in ('manual', 'pedido_cliente', 'sistema')),
  priority boolean not null default false,
  due_date date,
  assignee_id uuid,
  ref_table text,
  ref_id uuid,
  ref_kind text,                 -- o que a tarefa representa dentro do registro (ex.: 'entrega')
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists team_tasks_area_status on public.team_tasks (area, status);
create unique index if not exists team_tasks_ref on public.team_tasks (ref_table, ref_id, ref_kind) where ref_id is not null;
alter table public.team_tasks enable row level security;

create or replace function public.can_team_tasks(_area text)
returns boolean language sql stable security definer set search_path to '' as $$
  select case _area
    when 'audiovisual' then public.can_access_av()
    when 'design' then public.can_access_content()
    when 'social' then public.can_social()
    when 'trafego' then public.can_access_traffic()
    when 'comercial' then public.can_access_commercial()
    else false end;
$$;
revoke execute on function public.can_team_tasks(text) from public, anon;
grant execute on function public.can_team_tasks(text) to authenticated;

create policy team_tasks_select on public.team_tasks for select to authenticated using ((select public.can_team_tasks(area)));

create or replace function public.team_task_save(_id uuid, _area text, _data jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _new uuid; _a text := _area;
begin
  if _id is not null then select area into _a from public.team_tasks where id = _id; end if;
  if _a is null or not public.can_team_tasks(_a) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _id is null then
    if length(trim(coalesce(_data ->> 'title', ''))) < 2 then raise exception 'Escreva o que fazer' using errcode = 'PF031'; end if;
    insert into public.team_tasks (area, client_id, title, description, priority, due_date, assignee_id, created_by)
    values (_a, nullif(_data ->> 'client_id', '')::uuid, left(trim(_data ->> 'title'), 200), nullif(trim(_data ->> 'description'), ''),
      coalesce((_data ->> 'priority')::boolean, false), nullif(_data ->> 'due_date', '')::date, nullif(_data ->> 'assignee_id', '')::uuid, auth.uid())
    returning id into _new;
    return _new;
  end if;
  if _data ->> 'status' is not null and _data ->> 'status' not in ('a_fazer', 'fazendo', 'feito') then
    raise exception 'Etapa inválida' using errcode = 'PF032';
  end if;
  update public.team_tasks set
    title = coalesce(nullif(left(trim(_data ->> 'title'), 200), ''), title),
    description = case when _data ? 'description' then nullif(trim(_data ->> 'description'), '') else description end,
    status = coalesce(nullif(_data ->> 'status', ''), status),
    priority = coalesce((_data ->> 'priority')::boolean, priority),
    due_date = case when _data ? 'due_date' then nullif(_data ->> 'due_date', '')::date else due_date end,
    assignee_id = case when _data ? 'assignee_id' then nullif(_data ->> 'assignee_id', '')::uuid else assignee_id end,
    completed_at = case when _data ->> 'status' = 'feito' then coalesce(completed_at, now()) when _data ? 'status' then null else completed_at end,
    updated_at = now()
  where id = _id;
  return _id;
end $$;
revoke execute on function public.team_task_save(uuid, text, jsonb) from public, anon;
grant execute on function public.team_task_save(uuid, text, jsonb) to authenticated;

-- 1. Prazo de entrega e tarefa de entrega automáticos ---------------------------------------------------------------
create or replace function public.av_delivery_auto()
returns trigger language plpgsql security definer set search_path to '' as $$
declare _days integer; _shoot date; _old date;
begin
  if new.shoot_at is null then return new; end if;
  select coalesce(delivery_days, 3) into _days from public.av_settings where id;
  _days := coalesce(_days, 3);
  _shoot := (new.shoot_at at time zone 'America/Sao_Paulo')::date;
  if tg_op = 'INSERT' then
    if new.due_date is null then new.due_date := _shoot + _days; end if;
  elsif new.shoot_at is distinct from old.shoot_at then
    _old := (old.shoot_at at time zone 'America/Sao_Paulo')::date;
    -- Só mexe no prazo se ele estava vazio ou era o automático da data antiga (prazo combinado à mão fica como está).
    if new.due_date is null or (old.shoot_at is not null and new.due_date is not distinct from old.due_date and old.due_date = _old + _days) then
      new.due_date := _shoot + _days;
    end if;
  elsif new.status = 'captured' and old.status is distinct from 'captured' and old.due_date is not null then
    -- av_set_status troca o prazo para "hoje + 2" ao marcar como captado: vale o prazo combinado no agendamento.
    new.due_date := old.due_date;
  elsif new.due_date is null then
    new.due_date := _shoot + _days;
  end if;
  return new;
end $$;
revoke execute on function public.av_delivery_auto() from public, anon, authenticated;
create or replace trigger av_delivery_auto before insert or update on public.av_projects
for each row execute function public.av_delivery_auto();

create or replace function public.av_delivery_task()
returns trigger language plpgsql security definer set search_path to '' as $$
declare _name text; _done boolean := new.delivered_at is not null or new.status in ('delivered', 'cancelled');  -- entregue ou cancelado: a tarefa sai da fila
begin
  begin
    if new.shoot_at is null or new.due_date is null then return new; end if;
    select trim(name) into _name from public.clients where id = new.client_id;
    insert into public.team_tasks as t (area, client_id, title, source, due_date, assignee_id, ref_table, ref_id, ref_kind, status, completed_at)
    values ('audiovisual', new.client_id, left('Entregar vídeos de ' || coalesce(_name, 'cliente'), 200), 'sistema', new.due_date, null, 'av_projects', new.id, 'entrega',
      case when _done then 'feito' else 'a_fazer' end, case when _done then now() end)
    on conflict (ref_table, ref_id, ref_kind) where ref_id is not null do update set
      due_date = excluded.due_date,
      status = case when excluded.status = 'feito' then 'feito' else t.status end,
      completed_at = case when excluded.status = 'feito' then coalesce(t.completed_at, now()) else t.completed_at end,
      updated_at = now();
  exception when others then
    raise warning 'av_delivery_task falhou para %: %', new.id, sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public.av_delivery_task() from public, anon, authenticated;
create or replace trigger av_delivery_task after insert or update on public.av_projects
for each row execute function public.av_delivery_task();

-- 3. Painel de clientes do audiovisual ------------------------------------------------------------------------------
create or replace function public.av_clients_panel()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _today date := (now() at time zone 'America/Sao_Paulo')::date; _month date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
begin
  if not public.can_access_av() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', trim(c.name), 'logo_path', c.logo_path,
      'fixed', coalesce(c.client_type, 'recurring') <> 'one-off',
      'last_shoot', x.last_shoot, 'next_shoot', x.next_shoot, 'next_project', x.next_project,
      'shoots_month', x.shoots_month, 'shoots_total', x.shoots_total,
      'days_since', case when x.last_shoot is null then null else _today - (x.last_shoot at time zone 'America/Sao_Paulo')::date end
    ) order by trim(c.name))
    from public.clients c
    cross join lateral (
      select max(p.shoot_at) filter (where p.shoot_at <= now()) last_shoot,
             min(p.shoot_at) filter (where p.shoot_at > now()) next_shoot,
             (select p2.id from public.av_projects p2 where p2.client_id = c.id and p2.shoot_at > now() order by p2.shoot_at limit 1) next_project,
             count(*) filter (where (p.shoot_at at time zone 'America/Sao_Paulo')::date >= _month and (p.shoot_at at time zone 'America/Sao_Paulo')::date < (_month + interval '1 month')::date) shoots_month,
             count(p.shoot_at) shoots_total
      from public.av_projects p where p.client_id = c.id and p.status <> 'cancelled'
    ) x
    where c.is_active and not c.is_lost and 'audiovisual' = any(public.client_areas(c.id))
      and (not public.is_ellcazo_only() or public.is_ellcazo_client(c.id))
  ), '[]'::jsonb);
end $$;
revoke execute on function public.av_clients_panel() from public, anon;
grant execute on function public.av_clients_panel() to authenticated;

-- A tela de Configurações do audiovisual salva o prazo de entrega (delivery_days) junto das outras opções.
create or replace function public.av_settings_save(_data jsonb)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if not public.can_manage_av() then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.av_settings set
    edit_hours = coalesce((_data->>'edit_hours')::int, edit_hours),
    delivery_days = coalesce((_data->>'delivery_days')::int, delivery_days),
    raw_until_hour = coalesce((_data->>'raw_until_hour')::int, raw_until_hour),
    default_duration_min = coalesce((_data->>'default_duration_min')::int, default_duration_min),
    checkin_radius_m = coalesce((_data->>'checkin_radius_m')::int, checkin_radius_m),
    calendar_account_ids = case when _data ? 'calendar_account_ids'
      then coalesce((select array_agg(v::uuid) from jsonb_array_elements_text(_data->'calendar_account_ids') v), '{}') else calendar_account_ids end,
    notify_client = coalesce((_data->>'notify_client')::boolean, notify_client),
    notify_team = coalesce((_data->>'notify_team')::boolean, notify_team),
    auto_client_whatsapp = coalesce((_data->>'auto_client_whatsapp')::boolean, auto_client_whatsapp),
    updated_at = now()
  where id;
end;
$function$;
