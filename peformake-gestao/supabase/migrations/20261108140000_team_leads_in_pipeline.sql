-- Leads da equipe no Funil do Comercial: todos abrem o Funil, cada um vê os seus; admin e head veem todos.
-- Lead pode nascer à mão (sem conversa de WhatsApp): nome, empresa e telefone no próprio negócio.

alter table public.crm_deals alter column contact_id drop not null;
alter table public.crm_deals add column if not exists lead_name text;
alter table public.crm_deals add column if not exists lead_company text;
alter table public.crm_deals add column if not exists lead_phone text;
alter table public.crm_deals drop constraint if exists crm_deals_who;
alter table public.crm_deals add constraint crm_deals_who check (contact_id is not null or length(trim(coalesce(lead_name, ''))) >= 2);

create or replace function public.deal_sees_all()
returns boolean language sql stable security definer set search_path to '' as $$
  select public.has_role('admin') or public.has_role('head_marketing');
$$;

create or replace function public.deal_my_staff()
returns uuid language sql stable security definer set search_path to '' as $$
  select id from public.staff_members where profile_id = (select auth.uid()) and is_active limit 1;
$$;

-- Pode ver/mexer: admin e head tudo; o dono; sem dono, a equipe comercial (para alguém assumir).
create or replace function public.deal_visible(_owner uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select public.deal_sees_all() or (_owner is not null and _owner = public.deal_my_staff()) or (_owner is null and public.can_access_commercial());
$$;

drop policy if exists crm_deals_select_team on public.crm_deals;
drop policy if exists crm_deals_select on public.crm_deals;
create policy crm_deals_select on public.crm_deals for select to authenticated using (public.deal_visible(owner_id));

create or replace function public.deal_save(_deal_id uuid, _expected_updated_at timestamp with time zone, _data jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  _id uuid := _deal_id;
  _current timestamptz;
  _cur_owner uuid;
  _title text := trim(coalesce(_data ->> 'title', ''));
  _contact uuid := nullif(_data ->> 'contact_id', '')::uuid;
  _service uuid := nullif(_data ->> 'service_id', '')::uuid;
  _owner uuid := nullif(_data ->> 'owner_id', '')::uuid;
  _value bigint := nullif(_data ->> 'value_cents', '')::bigint;
  _lead text := nullif(trim(coalesce(_data ->> 'lead_name', '')), '');
  _uid uuid := (select auth.uid());
  _me uuid := public.deal_my_staff();
begin
  if _uid is null or not (public.can_access_commercial() or _me is not null) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  -- Quem não vê tudo só cria e edita lead no próprio nome.
  if not public.deal_sees_all() and not public.can_access_commercial() then _owner := _me; end if;
  if length(_title) not between 3 and 200
    or length(coalesce(_data ->> 'next_step', '')) > 500
    or (_value is not null and _value < 0)
    or (_service is not null and not exists (select 1 from public.services where id = _service))
    or (_owner is not null and not exists (select 1 from public.staff_members where id = _owner and is_active)) then
    raise exception 'Formato invalido' using errcode = 'PF006';
  end if;

  if _id is null then
    if (_contact is null and _lead is null) or (_contact is not null and not exists (select 1 from public.wa_contacts where id = _contact)) then
      raise exception 'Formato invalido' using errcode = 'PF006';
    end if;
    insert into public.crm_deals (contact_id, title, lead_name, created_by, updated_by, owner_id, position)
      values (_contact, _title, _lead, _uid, _uid, coalesce(_owner, case when not public.can_access_commercial() then _me end),
        coalesce((select min(position) from public.crm_deals where stage = 'novo'), 0) - 1)
      returning id into _id;
  else
    select updated_at, owner_id into _current, _cur_owner from public.crm_deals where id = _id for update;
    if not found or not public.deal_visible(_cur_owner) then raise exception 'Oportunidade nao encontrada' using errcode = 'PF004'; end if;
    if _expected_updated_at is null or _current <> _expected_updated_at then raise exception 'Alterada por outra pessoa' using errcode = 'PF001'; end if;
  end if;

  update public.crm_deals set
    title = _title,
    service_id = _service,
    value_cents = _value,
    owner_id = _owner,
    lead_name = coalesce(_lead, lead_name),
    lead_company = case when _data ? 'lead_company' then nullif(trim(_data ->> 'lead_company'), '') else lead_company end,
    lead_phone = case when _data ? 'lead_phone' then nullif(regexp_replace(coalesce(_data ->> 'lead_phone', ''), '[^0-9]', '', 'g'), '') else lead_phone end,
    next_step = nullif(trim(coalesce(_data ->> 'next_step', '')), ''),
    next_step_at = nullif(_data ->> 'next_step_at', '')::date,
    updated_at = now(),
    updated_by = _uid
  where id = _id;
  return _id;
end $$;

create or replace function public.deal_move(_deal_id uuid, _stage text, _lost_reason text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not exists (select 1 from public.crm_deals where id = _deal_id and public.deal_visible(owner_id)) then
    raise exception 'Oportunidade nao encontrada' using errcode = 'PF004';
  end if;
  if _stage not in ('novo', 'qualificacao', 'negociacao', 'aguardando', 'ganho', 'perdido', 'pos_venda')
    or (_stage = 'perdido' and length(trim(coalesce(_lost_reason, ''))) < 3)
    or length(coalesce(_lost_reason, '')) > 500 then
    raise exception 'Formato invalido' using errcode = 'PF006';
  end if;
  update public.crm_deals set
    stage = _stage,
    lost_reason = case when _stage = 'perdido' then trim(_lost_reason) else null end,
    closed_at = case when _stage in ('ganho', 'perdido') then coalesce(closed_at, now()) when _stage = 'pos_venda' then closed_at else null end,
    updated_at = now(),
    updated_by = (select auth.uid())
  where id = _deal_id;
end $$;

create or replace function public.deal_delete(_deal_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  delete from public.crm_deals
  where id = _deal_id and public.deal_visible(owner_id) and (created_by = (select auth.uid()) or public.can_manage_clients());
  if not found then raise exception 'Sem permissao' using errcode = '42501'; end if;
end $$;

revoke execute on function public.deal_sees_all() from public, anon;
revoke execute on function public.deal_my_staff() from public, anon;
revoke execute on function public.deal_visible(uuid) from public, anon;
grant execute on function public.deal_sees_all() to authenticated;
grant execute on function public.deal_my_staff() to authenticated;
grant execute on function public.deal_visible(uuid) to authenticated;
