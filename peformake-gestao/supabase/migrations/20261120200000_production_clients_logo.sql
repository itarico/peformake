-- Design (Italo, 20/11): a logo do cliente aparece na fila do design. production_clients passa a devolver logo_path.
-- Muda o tipo de retorno, então precisa recriar a função (mesmas permissões: só quem está logado).
drop function if exists public.production_clients();
create function public.production_clients()
 returns table(id uuid, name text, is_active boolean, areas text[], recurring boolean, logo_path text)
 language sql stable security definer set search_path to ''
as $function$
  select c.id, c.name, c.is_active and not c.is_lost,
    case when public.is_ellcazo_only() then array(select a from unnest(public.client_areas(c.id)) a where a = 'audiovisual')
         else public.client_areas(c.id) end,
    coalesce(c.client_type, 'recurring') <> 'one-off',
    c.logo_path
  from public.clients c
  where (public.can_access_content() or public.can_access_av() or public.can_access_traffic())
    and (not public.is_ellcazo_only() or public.is_ellcazo_client(c.id))
  order by c.name;
$function$;
revoke execute on function public.production_clients() from public, anon;
grant execute on function public.production_clients() to authenticated, service_role;
