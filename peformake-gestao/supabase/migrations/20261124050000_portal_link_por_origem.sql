-- Portal: um link ativo por cliente E por origem (equipe, briefing, auto), em vez de um só por cliente.
-- Erro achado em 24/11/2026 no teste do audiovisual: mandar o vídeo para o cliente aprovar (av_client_review_notify →
-- client_portal_auto_url) falhava com "duplicate key ... client_portal_links_one_team_link" quando o cliente já tinha
-- um link ativo do briefing ou criado pela equipe. O link automático agora tem origem própria ('auto').
create unique index if not exists client_portal_links_one_per_origin on public.client_portal_links (client_id, coalesce(origin, 'equipe')) where revoked_at is null and user_id is null;

create or replace function public.client_portal_auto_url(_client uuid)
returns text language plpgsql security definer set search_path to '' as $function$
declare _token text; _site text;
begin
  if not exists (select 1 from public.clients where id = _client and is_active and not is_lost) then return null; end if;
  select coalesce(site_url, '' || public.app_base_url() || '') into _site from public.av_settings where id;
  select a.token into _token from public.client_portal_auto a
    where a.client_id = _client
      and exists (select 1 from public.client_portal_links l where l.client_id = _client and l.revoked_at is null
                  and l.token_hash = extensions.digest(a.token, 'sha256'));
  if _token is null then
    update public.client_portal_links set revoked_at = now() where client_id = _client and revoked_at is null and user_id is null and origin = 'auto';
    _token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
    insert into public.client_portal_links (client_id, token_hash, created_by, origin) values (_client, extensions.digest(_token, 'sha256'), null, 'auto');
    insert into public.client_portal_auto (client_id, token) values (_client, _token)
      on conflict (client_id) do update set token = excluded.token, created_at = now();
  end if;
  return coalesce(_site, '' || public.app_base_url() || '') || '/portal#' || _token;
end;
$function$;

-- FALTA APLICAR (o conector recusa "drop"): sem esta linha o índice antigo continua barrando o segundo link.
drop index if exists public.client_portal_links_one_team_link;
