-- Dois pedidos do Italo (24/11/2026):
-- 1. Link do portal FIXO: cada cliente tem um link só, criado no cadastro. Não se gera link novo; todo lugar que pedia
--    um link (equipe, briefing, aviso de vídeo) passa a devolver o mesmo.
-- 2. O admin da Ellcazo faz tudo o que é da Ellcazo: cadastra e edita os clientes do audiovisual, contatos e serviços de
--    audiovisual. Continua sem alcançar cliente e serviço que não são do audiovisual.

-- 1. Link fixo -------------------------------------------------------------------------------------------------------
create or replace function public.client_portal_fixed_token(_client uuid)
returns text language plpgsql security definer set search_path to '' as $$
declare _token text;
begin
  if not exists (select 1 from public.clients where id = _client and is_active and not is_lost) then return null; end if;
  select a.token into _token from public.client_portal_auto a
   where a.client_id = _client
     and exists (select 1 from public.client_portal_links l where l.client_id = _client and l.revoked_at is null
                 and l.token_hash = extensions.digest(a.token, 'sha256'));
  if _token is not null then return _token; end if;
  -- Primeiro uso: os links antigos (equipe, briefing) saem e fica só o fixo.
  update public.client_portal_links set revoked_at = now() where client_id = _client and revoked_at is null and user_id is null;
  _token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.client_portal_links (client_id, token_hash, created_by, origin) values (_client, extensions.digest(_token, 'sha256'), null, 'auto');
  insert into public.client_portal_auto (client_id, token) values (_client, _token)
    on conflict (client_id) do update set token = excluded.token, created_at = now();
  return _token;
end $$;
revoke execute on function public.client_portal_fixed_token(uuid) from public, anon, authenticated;

create or replace function public.client_portal_auto_url(_client uuid)
returns text language plpgsql security definer set search_path to '' as $function$
declare _token text; _site text;
begin
  _token := public.client_portal_fixed_token(_client);
  if _token is null then return null; end if;
  select coalesce(site_url, '' || public.app_base_url() || '') into _site from public.av_settings where id;
  return coalesce(_site, '' || public.app_base_url() || '') || '/portal#' || _token;
end;
$function$;

create or replace function public.portal_create_link(_client_id uuid)
returns text language plpgsql security definer set search_path to '' as $function$
begin
  if not public.can_manage_portal() then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clients where id = _client_id and is_active and not is_lost) then
    if exists (select 1 from public.clients where id = _client_id) then
      raise exception 'Cliente inativo' using errcode = 'PF003';
    end if;
    raise exception 'Cliente nao encontrado' using errcode = 'PF004';
  end if;
  return public.client_portal_fixed_token(_client_id);
end;
$function$;

create or replace function public.brief_link_make(_client uuid, _by uuid)
returns text language plpgsql security definer set search_path to '' as $function$
declare _token text := public.client_portal_fixed_token(_client);
begin
  if _token is null then raise exception 'Cliente inativo' using errcode = 'PF003'; end if;
  return _token;
end $function$;

-- Cadastrou o cliente, o link já existe.
create or replace function public.client_portal_link_on_create()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  begin
    perform public.client_portal_fixed_token(new.id);
  exception when others then
    raise warning 'link do portal não criado para %: %', new.id, sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public.client_portal_link_on_create() from public, anon, authenticated;
create or replace trigger client_portal_link_on_create after insert on public.clients
for each row execute function public.client_portal_link_on_create();

-- 2. Admin da Ellcazo ------------------------------------------------------------------------------------------------
create or replace function public.clients_require_manager()
returns void language plpgsql stable security definer set search_path to '' as $function$
begin
  -- A Ellcazo passa aqui; o que ela pode tocar é limitado pelo gatilho ellcazo_scope_guard (só o que é do audiovisual).
  if public.can_manage_clients() or public.has_role('ellcazo') then return; end if;
  raise exception 'Sem permissao' using errcode = '42501';
end;
$function$;

create or replace function public.ellcazo_scope_guard()
returns trigger language plpgsql security definer set search_path to '' as $$
declare _client uuid; _service uuid;
begin
  if not public.is_ellcazo_only() then return new; end if;
  if tg_table_name = 'clients' then
    if tg_op = 'INSERT' then new.registered_area := 'audiovisual'; return new; end if;
    _client := new.id;
  else
    _client := new.client_id;
  end if;
  if tg_table_name = 'client_services' then
    -- to_jsonb: o mesmo gatilho serve três tabelas e só esta tem service_id.
    _service := nullif(to_jsonb(new) ->> 'service_id', '')::uuid;
    if not exists (select 1 from public.services s where s.id = _service and s.area = 'audiovisual') then
      raise exception 'A Ellcazo só lança serviço de audiovisual' using errcode = '42501';
    end if;
  end if;
  if not public.is_ellcazo_client(_client) then
    raise exception 'Este cliente não é do audiovisual' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.ellcazo_scope_guard() from public, anon, authenticated;
create or replace trigger ellcazo_scope_guard before insert or update on public.clients for each row execute function public.ellcazo_scope_guard();
create or replace trigger ellcazo_scope_guard before insert or update on public.client_contacts for each row execute function public.ellcazo_scope_guard();
create or replace trigger ellcazo_scope_guard before insert or update on public.client_services for each row execute function public.ellcazo_scope_guard();

-- Aplicado em 24/11: link fixo criado para os 34 clientes ativos que não tinham.
select count(public.client_portal_fixed_token(c.id)) from public.clients c where c.is_active and not c.is_lost;

-- A Ellcazo edita o básico dos clientes dela (nome, telefone, e-mail, Instagram, CPF/CNPJ) pela ficha do cliente.
-- A ficha (ellcazo_client_sheet) passou a devolver também email e document; a definição completa está no banco.
create or replace function public.ellcazo_client_update(_client uuid, _data jsonb)
returns void language plpgsql security definer set search_path to '' as $$
declare _name text := nullif(trim(coalesce(_data ->> 'name', '')), '');
        _phone text := nullif(regexp_replace(coalesce(_data ->> 'phone', ''), '[^0-9]', '', 'g'), '');
        _contact uuid;
begin
  if not (public.can_manage_clients() or (public.has_role('ellcazo') and public.is_ellcazo_client(_client))) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  if _name is null or length(_name) < 2 then raise exception 'Informe o nome do cliente' using errcode = 'PF001'; end if;
  update public.clients set
    name = _name,
    phone = _phone,
    email = nullif(trim(coalesce(_data ->> 'email', '')), ''),
    instagram = nullif(trim(coalesce(_data ->> 'instagram', '')), ''),
    document = nullif(regexp_replace(coalesce(_data ->> 'document', ''), '[^0-9]', '', 'g'), ''),
    updated_at = now(), updated_by = auth.uid()
  where id = _client;
  if not found then raise exception 'Cliente nao encontrado' using errcode = 'PF004'; end if;
  select id into _contact from public.client_contacts where client_id = _client and phone is not null and phone <> ''
   order by gets_billing desc, created_at limit 1;
  if _contact is not null and _phone is not null then
    update public.client_contacts set phone = _phone, updated_at = now() where id = _contact;
  end if;
end $$;
revoke execute on function public.ellcazo_client_update(uuid, jsonb) from public, anon;
grant execute on function public.ellcazo_client_update(uuid, jsonb) to authenticated;
