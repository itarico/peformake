-- Audiovisual com autonomia para cadastrar cliente (decisão do Italo, 24/11/2026): quem é da Ellcazo cadastra o cliente
-- pela agenda do audiovisual. O cliente entra na base da Peformake (mesma tabela) marcado como vindo do audiovisual,
-- aparece para a Ellcazo mesmo antes de ter serviço lançado e já pode receber gravação.

alter table public.clients add column if not exists registered_area text;

-- Quem é da Ellcazo enxerga o cliente que nasceu no audiovisual.
create or replace function public.is_ellcazo_client(_client uuid)
returns boolean language sql stable security definer set search_path to '' as $function$
  select _client is not null and (
    exists (select 1 from public.invoices i where i.client_id = _client and i.unit = 'ellcazo')
    or exists (select 1 from public.fin_entries f where f.client_id = _client and f.unit = 'ellcazo')
    or exists (select 1 from public.av_projects p where p.client_id = _client)
    or exists (select 1 from public.av_quotes q where q.client_id = _client)
    or exists (select 1 from public.photo_galleries g where g.client_id = _client)
    or exists (select 1 from public.clients c where c.id = _client and c.registered_area = 'audiovisual')
    or exists (select 1 from public.client_services cs join public.services s on s.id = cs.service_id
               where cs.client_id = _client and cs.is_active and s.area = 'audiovisual'));
$function$;

-- A regra de quem mexe em cliente continua (admin e head). A única exceção é o cadastro feito por av_client_create,
-- que liga uma chave só durante aquela chamada.
create or replace function public.clients_require_manager()
returns void language plpgsql stable security definer set search_path to '' as $function$
begin
  if public.can_manage_clients() then return; end if;
  if public.has_role('ellcazo') and coalesce(current_setting('app.av_client_create', true), '') = '1' then return; end if;
  raise exception 'Sem permissao' using errcode = '42501';
end;
$function$;

create or replace function public.av_client_create(_data jsonb, _contact jsonb default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _id uuid;
begin
  if not (public.has_role('ellcazo') or public.can_manage_clients()) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  perform set_config('app.av_client_create', '1', true);
  _id := public.client_create(_data, _contact);
  perform set_config('app.av_client_create', '0', true);
  update public.clients set registered_area = 'audiovisual' where id = _id;
  return _id;
exception when others then
  perform set_config('app.av_client_create', '0', true);
  raise;
end $$;
revoke execute on function public.av_client_create(jsonb, jsonb) from public, anon;
grant execute on function public.av_client_create(jsonb, jsonb) to authenticated;

-- Listas da operação: cliente cadastrado pelo audiovisual conta como cliente do audiovisual.
create or replace function public.production_clients()
returns table(id uuid, name text, is_active boolean, areas text[], recurring boolean, logo_path text)
language sql stable security definer set search_path to '' as $function$
  select c.id, c.name, c.is_active and not c.is_lost,
    case when public.is_ellcazo_only() then array(select a from unnest(x.areas) a where a = 'audiovisual') else x.areas end,
    coalesce(c.client_type, 'recurring') <> 'one-off',
    c.logo_path
  from public.clients c
  cross join lateral (
    select case when c.registered_area = 'audiovisual' and not ('audiovisual' = any(public.client_areas(c.id)))
                then public.client_areas(c.id) || array['audiovisual'] else public.client_areas(c.id) end as areas
  ) x
  where (public.can_access_content() or public.can_access_av() or public.can_access_traffic())
    and (not public.is_ellcazo_only() or public.is_ellcazo_client(c.id))
  order by c.name;
$function$;

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
             (select p2.id from public.av_projects p2 where p2.client_id = c.id and p2.shoot_at > now() and p2.status <> 'cancelled' order by p2.shoot_at limit 1) next_project,
             count(*) filter (where (p.shoot_at at time zone 'America/Sao_Paulo')::date >= _month and (p.shoot_at at time zone 'America/Sao_Paulo')::date < (_month + interval '1 month')::date) shoots_month,
             count(p.shoot_at) shoots_total
      from public.av_projects p where p.client_id = c.id and p.status <> 'cancelled'
    ) x
    where c.is_active and not c.is_lost
      and ('audiovisual' = any(public.client_areas(c.id)) or c.registered_area = 'audiovisual')
      and (not public.is_ellcazo_only() or public.is_ellcazo_client(c.id))
  ), '[]'::jsonb);
end $$;
