-- Link de perguntas do cliente (/conversa/<token>) vale para QUALQUER cliente ativo com algum serviço ativo
-- (antes só quem tinha Consultoria: a 3LM, só audiovisual, abria "link não vale mais"). Italo, 17/11.
-- consult_has_service continua igual (fila do diagnóstico e lista da Consultoria).
create or replace function public.client_chat_alive(_client uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.clients c where c.id = _client and c.is_active and not coalesce(c.is_lost, false))
     and exists (select 1 from public.client_services cs where cs.client_id = _client and cs.is_active)
$$;
revoke execute on function public.client_chat_alive(uuid) from public, anon, authenticated;
