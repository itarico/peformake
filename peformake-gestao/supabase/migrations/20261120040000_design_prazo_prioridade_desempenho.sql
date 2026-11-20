-- Social/Design (pedido do Italo, 19/11; aplicada em 20/11): prazo de entrega por tipo de arte, botão Prioridade e desempenho do designer.

-- 1. Prioridade: a social media marca e a peça passa na frente na fila do design.
alter table public.content_items add column if not exists priority boolean not null default false;

-- 2. Prazo máximo por tipo (horas). Carrossel e reels demoram mais. Chave = piece_type (impressão/banner/vetor) ou kind.
alter table public.design_settings add column if not exists sla_hours jsonb not null
  default '{"post":24,"story":24,"anuncio":24,"carrossel":48,"reels":48,"impressao":48,"banner":48,"vetor":48}'::jsonb;

create or replace function public.design_sla_hours(_kind text, _piece_type text)
returns integer language sql stable security definer set search_path to '' as $$
  select coalesce(
    (select nullif(d.sla_hours ->> coalesce(_piece_type, _kind), '')::int from public.design_settings d where d.id),
    (select i.art_sla_hours from public.intel_settings i where i.id),
    48)
$$;

-- Relógio do design: agora usa o prazo do tipo e também liga quando a peça já nasce pronta (pedido do WhatsApp).
create or replace function public.content_item_design_clock()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  _due timestamptz;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  if new.status in ('ready', 'changes_requested')
     and (tg_op = 'INSERT' or old.status not in ('ready', 'changes_requested', 'in_production')) then
    _due := now() + make_interval(hours => public.design_sla_hours(new.kind, new.piece_type));
    if new.deadline is not null and new.deadline >= (now() at time zone 'America/Recife')::date then
      _due := least(_due, (new.deadline::timestamp + interval '18 hours') at time zone 'America/Recife');
    end if;
    new.design_due_at := _due;
    new.design_started_at := null;
  elsif tg_op = 'UPDATE' and new.status = 'in_production' then
    new.design_started_at := coalesce(new.design_started_at, now());
  elsif tg_op = 'UPDATE' and new.status in ('client_review', 'review') and old.status in ('ready', 'changes_requested', 'in_production') then
    new.delivered_at := now();
    new.delivered_on_time := new.design_due_at is null or now() <= new.design_due_at;
  end if;
  -- Saiu do design: a prioridade cumpriu o papel.
  if new.status in ('client_review', 'review', 'approved', 'published') then
    new.priority := false;
  end if;
  return new;
end $$;

create or replace trigger content_item_design_clock before insert or update of status on public.content_items
  for each row execute function public.content_item_design_clock();

-- Salvar os prazos (admin ou head).
create or replace function public.design_sla_save(_hours jsonb)
returns void language plpgsql security definer set search_path to '' as $$
declare _k text; _v text;
begin
  if not (public.has_role('admin') or public.has_role('head_marketing')) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  if jsonb_typeof(_hours) <> 'object' then raise exception 'Formato invalido' using errcode = 'PF006'; end if;
  for _k, _v in select key, value from jsonb_each_text(_hours) loop
    if _k not in ('post', 'story', 'anuncio', 'carrossel', 'reels', 'impressao', 'banner', 'vetor') or _v !~ '^[0-9]{1,3}$' or _v::int not between 1 and 720 then
      raise exception 'Formato invalido' using errcode = 'PF006';
    end if;
  end loop;
  update public.design_settings set sla_hours = sla_hours || _hours, updated_at = now(), updated_by = (select auth.uid()) where id;
end $$;

-- Marcar ou tirar a prioridade (quem planeja). Avisa o designer da peça e o do cliente.
create or replace function public.content_item_priority(_item_id uuid, _on boolean)
returns void language plpgsql security definer set search_path to '' as $$
declare _i public.content_items;
begin
  perform public.content_require_access();
  if not public.can_plan_content() then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _i from public.content_items where id = _item_id for update;
  if not found then raise exception 'Nao encontrado' using errcode = 'PF004'; end if;
  if _i.priority = _on then return; end if;
  update public.content_items set priority = _on, updated_at = now(), updated_by = (select auth.uid()) where id = _i.id;
  insert into public.content_events (item_id, actor_id, actor_kind, from_status, to_status, message)
  values (_i.id, (select auth.uid()), 'staff', _i.status, _i.status, case when _on then 'Marcada como prioridade' else 'Prioridade retirada' end);
  if _on and _i.status in ('ready', 'in_production', 'changes_requested') then
    perform public.notify(coalesce(array[(select profile_id from public.staff_members where id = _i.designer_id)], '{}')
      || public.client_staff_profiles(_i.client_id, array['designer']),
      'content_priority', 'Prioridade: ' || coalesce(_i.title, 'Peça ' || _i.number),
      (select trim(name) from public.clients where id = _i.client_id) || '. Passa na frente das outras.',
      '/conteudo/peca/' || _i.id, _i.client_id);
  end if;
end $$;

insert into public.notification_rules (kind, name, description, category, audience, in_app, email, position)
values ('content_priority', 'Arte marcada como prioridade', 'Aviso ao designer quando a social media marca uma peça como prioridade.', 'conteudo', 'equipe', true, false, 20)
on conflict (kind) do nothing;

-- 3. Desempenho do designer no mês: entregas, no prazo, tempo médio fazendo, taxa de ajuste e o que está na mão agora.
create or replace function public.design_stats(_month date)
returns table(designer_id uuid, delivered integer, on_time integer, avg_hours numeric, with_revision integer, revisions integer, pending integer, late_now integer)
language sql stable security definer set search_path to '' as $$
  with d as (
    select i.designer_id,
      count(*) filter (where i.delivered_at >= _month and i.delivered_at < _month + interval '1 month') as delivered,
      count(*) filter (where i.delivered_at >= _month and i.delivered_at < _month + interval '1 month' and i.delivered_on_time) as on_time,
      avg(extract(epoch from (i.delivered_at - i.design_started_at)) / 3600.0)
        filter (where i.delivered_at >= _month and i.delivered_at < _month + interval '1 month' and i.design_started_at is not null and i.delivered_at > i.design_started_at) as avg_hours,
      count(*) filter (where i.delivered_at >= _month and i.delivered_at < _month + interval '1 month' and i.revision_count > 0) as with_revision,
      coalesce(sum(i.revision_count) filter (where i.delivered_at >= _month and i.delivered_at < _month + interval '1 month'), 0) as revisions,
      count(*) filter (where i.status in ('ready', 'in_production', 'changes_requested')) as pending,
      count(*) filter (where i.status in ('ready', 'in_production', 'changes_requested') and i.design_due_at < now()) as late_now
    from public.content_items i
    where public.can_access_content() and i.designer_id is not null
    group by i.designer_id
  )
  select designer_id, delivered::int, on_time::int, round(avg_hours::numeric, 1), with_revision::int, revisions::int, pending::int, late_now::int
  from d where delivered > 0 or pending > 0
$$;

grant execute on function public.design_sla_save(jsonb), public.content_item_priority(uuid, boolean), public.design_stats(date) to authenticated;
revoke execute on function public.design_sla_save(jsonb), public.content_item_priority(uuid, boolean), public.design_stats(date) from anon;
