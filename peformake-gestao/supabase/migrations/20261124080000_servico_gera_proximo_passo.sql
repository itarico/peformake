-- Pedido do Italo (24/11/2026): atribuiu serviço de audiovisual ou cadastrou cliente pelo audiovisual, o sistema já
-- cobra o próximo passo. Sem data não dá para pôr no calendário, então nasce a tarefa "Marcar a gravação" no quadro do
-- audiovisual (prazo de 3 dias). Marcou a gravação, a tarefa fecha sozinha. Cancelou a gravação marcada, ela reabre.
create or replace function public.av_first_shoot_task(_client uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare _name text;
begin
  select trim(name) into _name from public.clients where id = _client and is_active and not is_lost;
  if _name is null then return; end if;
  if exists (select 1 from public.av_projects p where p.client_id = _client and p.status <> 'cancelled' and p.shoot_at >= now()) then return; end if;
  insert into public.team_tasks as t (area, client_id, title, source, due_date, ref_table, ref_id, ref_kind)
  values ('audiovisual', _client, left('Marcar a gravação de ' || _name, 200), 'sistema',
    ((now() at time zone 'America/Sao_Paulo')::date + 3), 'clients', _client, 'marcar_gravacao')
  on conflict (ref_table, ref_id, ref_kind) where ref_id is not null do update set
    status = 'a_fazer', completed_at = null, due_date = excluded.due_date, title = excluded.title, updated_at = now()
    where t.status = 'feito';
end $$;
revoke execute on function public.av_first_shoot_task(uuid) from public, anon, authenticated;

create or replace function public.client_service_next_step()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  begin
    if new.is_active and (tg_op = 'INSERT' or not coalesce(old.is_active, false))
       and exists (select 1 from public.services s where s.id = new.service_id and s.area = 'audiovisual') then
      perform public.av_first_shoot_task(new.client_id);
    end if;
  exception when others then
    raise warning 'client_service_next_step falhou para %: %', new.client_id, sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public.client_service_next_step() from public, anon, authenticated;
create or replace trigger client_service_next_step after insert or update of is_active on public.client_services
for each row execute function public.client_service_next_step();

create or replace function public.client_av_registered_next_step()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  begin
    if new.registered_area = 'audiovisual' and (tg_op = 'INSERT' or old.registered_area is distinct from new.registered_area) then
      perform public.av_first_shoot_task(new.id);
    end if;
  exception when others then
    raise warning 'client_av_registered_next_step falhou para %: %', new.id, sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public.client_av_registered_next_step() from public, anon, authenticated;
create or replace trigger client_av_registered_next_step after insert or update of registered_area on public.clients
for each row execute function public.client_av_registered_next_step();

create or replace function public.av_shoot_closes_task()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  begin
    if new.shoot_at is not null and new.status <> 'cancelled' then
      update public.team_tasks set status = 'feito', completed_at = coalesce(completed_at, now()), updated_at = now()
       where ref_table = 'clients' and ref_id = new.client_id and ref_kind = 'marcar_gravacao' and status <> 'feito';
    elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status is distinct from 'cancelled' and new.shoot_at >= now() then
      -- Cancelou a gravação que estava marcada: volta a cobrar uma nova data (se não houver outra marcada).
      perform public.av_first_shoot_task(new.client_id);
    end if;
  exception when others then
    raise warning 'av_shoot_closes_task falhou para %: %', new.id, sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public.av_shoot_closes_task() from public, anon, authenticated;
create or replace trigger av_shoot_closes_task after insert or update of shoot_at, status on public.av_projects
for each row execute function public.av_shoot_closes_task();
