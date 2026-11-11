-- Ellcazo: permissões (aprovado pelo Italo em 11/11/2026).
-- (a) quem é da Ellcazo vê o nome/logo/contato só dos clientes da Ellcazo;
-- (c) fecha vazamentos: production_clients, catálogo (services/service_options), team_settings, company_profiles;
-- (d) ficha resumida do cliente (ellcazo_client_sheet);
-- (2) Cobrar (mensagem pronta) também para faturas da Ellcazo.
-- Nada muda para admin, head, tráfego, social e os demais papéis.

-- Só Ellcazo: tem o papel ellcazo e nenhum papel da Peformake (parceiro não conta).
create or replace function public.is_ellcazo_only()
returns boolean language sql stable security definer set search_path to '' as $$
  select public.has_role('ellcazo') and not exists (
    select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role not in ('ellcazo', 'parceiro'));
$$;

-- Cliente da Ellcazo: tem fatura/lançamento da Ellcazo, projeto, orçamento, galeria ou serviço de audiovisual ativo.
-- security definer para não cair em recursão nas políticas de clients.
create or replace function public.is_ellcazo_client(_client uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select _client is not null and (
    exists (select 1 from public.invoices i where i.client_id = _client and i.unit = 'ellcazo')
    or exists (select 1 from public.fin_entries f where f.client_id = _client and f.unit = 'ellcazo')
    or exists (select 1 from public.av_projects p where p.client_id = _client)
    or exists (select 1 from public.av_quotes q where q.client_id = _client)
    or exists (select 1 from public.photo_galleries g where g.client_id = _client)
    or exists (select 1 from public.client_services cs join public.services s on s.id = cs.service_id
               where cs.client_id = _client and cs.is_active and s.area = 'audiovisual'));
$$;
revoke all on function public.is_ellcazo_client(uuid) from public, anon;
grant execute on function public.is_ellcazo_client(uuid) to authenticated;

-- (a) clientes e contatos da Ellcazo
drop policy if exists clients_select_ellcazo on public.clients;
create policy clients_select_ellcazo on public.clients for select to authenticated
  using (public.has_role('ellcazo') and public.is_ellcazo_client(id));

drop policy if exists client_contacts_read_ellcazo on public.client_contacts;
create policy client_contacts_read_ellcazo on public.client_contacts for select to authenticated
  using (public.has_role('ellcazo') and public.is_ellcazo_client(client_id));

-- (c) production_clients: quem é só da Ellcazo vê só os clientes da Ellcazo e só a área audiovisual.
create or replace function public.production_clients()
returns table(id uuid, name text, is_active boolean, areas text[], recurring boolean)
language sql stable security definer set search_path to '' as $$
  select c.id, c.name, c.is_active and not c.is_lost,
    case when public.is_ellcazo_only() then array(select a from unnest(public.client_areas(c.id)) a where a = 'audiovisual')
         else public.client_areas(c.id) end,
    coalesce(c.client_type, 'recurring') <> 'one-off'
  from public.clients c
  where (public.can_access_content() or public.can_access_av() or public.can_access_traffic())
    and (not public.is_ellcazo_only() or public.is_ellcazo_client(c.id))
  order by c.name;
$$;

-- (c) catálogo: quem é só da Ellcazo lê só os serviços de audiovisual (e as opções/preços deles).
drop policy if exists services_select_all on public.services;
create policy services_select_all on public.services for select to authenticated
  using (not public.is_ellcazo_only() or area = 'audiovisual');

drop policy if exists service_options_read on public.service_options;
create policy service_options_read on public.service_options for select to authenticated
  using (not public.is_ellcazo_only()
    or exists (select 1 from public.services s where s.id = service_id and s.area = 'audiovisual'));

-- (c) regras de comissão: só admin e head. A parte da empresa nos avulsos sai por RPC (só o número).
drop policy if exists team_settings_read on public.team_settings;
create policy team_settings_read on public.team_settings for select to authenticated
  using (public.has_role('admin') or public.has_role('head_marketing'));

create or replace function public.team_job_company_pct()
returns numeric language sql stable security definer set search_path to '' as $$
  select case when public.is_team() then coalesce((select t.job_company_pct from public.team_settings t where t.id), 25) end;
$$;
revoke all on function public.team_job_company_pct() from public, anon;
grant execute on function public.team_job_company_pct() to authenticated;

-- (c) dados das empresas: quem é só da Ellcazo vê só a linha da Ellcazo.
drop policy if exists company_profiles_read on public.company_profiles;
create policy company_profiles_read on public.company_profiles for select to authenticated
  using (case when public.is_ellcazo_only() then unit = 'ellcazo' else public.is_team() end);

-- (2) Cobrar: Ellcazo monta a mensagem das faturas dela (Pix só da Ellcazo; envio pelo sistema segue só admin).
create or replace function public.invoice_charge_info(_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _c public.clients; _ct public.client_contacts; _admin boolean := public.has_role('admin');
begin
  if not (_admin or (public.has_role('ellcazo') and public.is_ellcazo_client(_client))) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  select * into _c from public.clients where id = _client;
  select * into _ct from public.client_contacts where client_id = _client and phone is not null and phone <> ''
    order by gets_billing desc, created_at limit 1;
  return jsonb_build_object(
    'client', trim(_c.name),
    'contact', coalesce(nullif(trim(_ct.name), ''), trim(_c.name)),
    'phone', coalesce(nullif(regexp_replace(coalesce(_ct.phone, ''), '[^0-9]', '', 'g'), ''), nullif(regexp_replace(coalesce(_c.phone, ''), '[^0-9]', '', 'g'), '')),
    'pix', coalesce((select jsonb_object_agg(p.unit, jsonb_build_object('key', p.pix_key, 'type', p.pix_key_type,
        'name', coalesce(p.trade_name, p.legal_name))) from public.company_profiles p
        where p.pix_key is not null and (_admin or p.unit = 'ellcazo')), '{}'::jsonb),
    'system', _admin and public.charge_system_ready());
end $$;

create or replace function public.invoice_charge_mark(_ids uuid[], _how text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not exists (select 1 from public.invoices where id = any(_ids))
     or exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  if _how not in ('whatsapp', 'copiado', 'sistema') then raise exception 'Forma invalida' using errcode = 'PF006'; end if;
  if _how = 'sistema' and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.invoices set charge_sent_at = now(), charge_sent_how = _how, charge_sent_by = (select auth.uid())
  where id = any(_ids);
end $$;

-- (d) Ficha resumida para a Ellcazo: nome, logo, contato, projetos e faturas da Ellcazo. Nada da Peformake.
create or replace function public.ellcazo_client_sheet(_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _c public.clients; _ct public.client_contacts;
begin
  if not (public.has_role('admin') or (public.has_role('ellcazo') and public.is_ellcazo_client(_client))) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  select * into _c from public.clients where id = _client;
  if _c.id is null then return null; end if;
  select * into _ct from public.client_contacts where client_id = _client and phone is not null and phone <> ''
    order by gets_billing desc, created_at limit 1;
  return jsonb_build_object(
    'id', _c.id, 'name', trim(_c.name), 'logo_path', _c.logo_path, 'legacy_logo_url', _c.legacy_logo_url,
    'is_active', _c.is_active and not _c.is_lost, 'instagram', _c.instagram,
    'contact', coalesce(nullif(trim(_ct.name), ''), trim(_c.name)),
    'phone', coalesce(nullif(regexp_replace(coalesce(_ct.phone, ''), '[^0-9]', '', 'g'), ''), nullif(regexp_replace(coalesce(_c.phone, ''), '[^0-9]', '', 'g'), '')),
    'projects', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'status', p.status, 'shoot_at', p.shoot_at,
        'due_date', p.due_date, 'delivered_at', p.delivered_at) order by coalesce(p.shoot_at, p.created_at) desc)
      from (select * from public.av_projects x where x.client_id = _client order by coalesce(x.shoot_at, x.created_at) desc limit 8) p), '[]'::jsonb),
    'invoices', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'description', i.description, 'amount', i.amount, 'due_date', i.due_date,
        'status', i.status, 'paid_at', i.paid_at) order by i.due_date desc)
      from (select * from public.invoices x where x.client_id = _client and x.unit = 'ellcazo' and x.status <> 'cancelado' order by x.due_date desc limit 8) i), '[]'::jsonb));
end $$;
revoke all on function public.ellcazo_client_sheet(uuid) from public, anon;
grant execute on function public.ellcazo_client_sheet(uuid) to authenticated;
