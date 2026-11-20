-- Revisão de erros da 20261120040000 (20/11).
-- 1. As funções novas ficaram executáveis por PUBLIC (e design_sla_hours por visitante). Padrão do projeto: só authenticated.
revoke execute on function public.design_sla_hours(text, text), public.design_sla_save(jsonb),
  public.content_item_priority(uuid, boolean), public.design_stats(date) from public, anon;
grant execute on function public.design_sla_save(jsonb), public.content_item_priority(uuid, boolean), public.design_stats(date) to authenticated;

-- 2. Prioridade só vale para peça que ainda vai ao design (antes ficava presa em peça aprovada/publicada).
create or replace function public.content_item_priority(_item_id uuid, _on boolean)
returns void language plpgsql security definer set search_path to '' as $$
declare _i public.content_items;
begin
  perform public.content_require_access();
  if not public.can_plan_content() then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _i from public.content_items where id = _item_id for update;
  if not found then raise exception 'Nao encontrado' using errcode = 'PF004'; end if;
  if _i.priority = _on then return; end if;
  if _on and _i.status not in ('briefing', 'ready', 'in_production', 'changes_requested') then
    raise exception 'Prioridade so antes da entrega' using errcode = 'PF006';
  end if;
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

-- 3. Peça marcada ainda em briefing: o aviso de prioridade sai quando ela chega ao design.
create or replace function public.content_item_priority_on_ready()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.priority and new.status = 'ready' and old.status = 'briefing' then
    perform public.notify(coalesce(array[(select profile_id from public.staff_members where id = new.designer_id)], '{}')
      || public.client_staff_profiles(new.client_id, array['designer']),
      'content_priority', 'Prioridade: ' || coalesce(new.title, 'Peça ' || new.number),
      (select trim(name) from public.clients where id = new.client_id) || '. Passa na frente das outras.',
      '/conteudo/peca/' || new.id, new.client_id);
  end if;
  return null;
end $$;
revoke execute on function public.content_item_priority_on_ready() from public, anon, authenticated;

create or replace trigger content_item_priority_on_ready after update of status on public.content_items
  for each row execute function public.content_item_priority_on_ready();
