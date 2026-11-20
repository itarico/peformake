-- Briefing reorganizado (20/11): o portal grava também Marketing, Marca, Sazonalidade e a verba/faturamento/ticket
-- (o próprio cliente responde; na tela da equipe só administrador vê os valores).
create or replace function public.portal_brief_save(_token text, _patch jsonb)
returns void language plpgsql security definer set search_path to '' as $function$
declare
  _client uuid := public.portal_resolve(_token);
  _keys text[] := array['produtos', 'links', 'links_extra', 'links_off', 'publico', 'diferenciais', 'concorrentes', 'sem_concorrentes',
    'concorrentes_off', 'referencias', 'voz', 'proibidos', 'quem_aparece', 'quem_grava', 'capacidade', 'momento', 'proposito', 'percepcao',
    'arquetipo', 'posicionamento', 'historia', 'jornada', 'objecoes', 'visao',
    'marketing', 'marca', 'meses_fortes', 'meses_fracos', 'sazonalidade', 'verba_anuncio', 'ticket_medio', 'faturamento_mes'];
  _clean jsonb; _last timestamptz;
begin
  if jsonb_typeof(_patch) <> 'object' or length(_patch::text) > 60000 then raise exception 'Dados inválidos' using errcode = 'PF006'; end if;
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into _clean from jsonb_each(_patch) e(k, v) where k = any(_keys);
  if _clean = '{}'::jsonb then return; end if;
  select (data->>'cliente_em')::timestamptz into _last from public.client_briefs where client_id = _client;
  insert into public.client_briefs (client_id, data, updated_at)
    values (_client, _clean || jsonb_build_object('cliente_em', now()), now())
    on conflict (client_id) do update set data = public.client_briefs.data || excluded.data, updated_at = now();
  if _last is null or _last < now() - interval '2 hours' then
    perform public.notify(
      array(select r.user_id from public.user_roles r join public.profiles p on p.id = r.user_id where r.role in ('admin', 'head_marketing') and p.is_active),
      'client_answer', (select trim(name) from public.clients where id = _client) || ' está preenchendo o briefing', 'Pelo portal.',
      '/estrategia/consultoria?cliente=' || _client::text, _client);
  end if;
end $function$;
revoke execute on function public.portal_brief_save(text, jsonb) from public;
grant execute on function public.portal_brief_save(text, jsonb) to anon, authenticated;
