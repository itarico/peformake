-- Pedido do cliente entra como TAREFA, não como arte (pedido do Italo, 24/11/2026). A social media decide: aceitar
-- (fazer), recusar (com o motivo) ou virar arte (vai para o design com o texto e os arquivos que o cliente mandou).
alter table public.social_tasks
  add column if not exists details jsonb,
  add column if not exists media_ids bigint[],
  add column if not exists refused_at timestamptz,
  add column if not exists refuse_reason text,
  add column if not exists art_id uuid;

-- Recusar: sai da fila (vai para Feito marcada como recusada) com o motivo.
create or replace function public.social_task_refuse(_id uuid, _reason text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.can_social() then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if length(trim(coalesce(_reason, ''))) < 3 then raise exception 'Diga o motivo' using errcode = 'PF006'; end if;
  update public.social_tasks set status = 'feito', refused_at = now(), refuse_reason = left(trim(_reason), 500),
    completed_at = now(), updated_at = now() where id = _id;
end $$;
revoke execute on function public.social_task_refuse(uuid, text) from public, anon;
grant execute on function public.social_task_refuse(uuid, text) to authenticated;

-- Virar arte: cria a peça pronta para o design (mês atual), com o texto, os detalhes e os arquivos do pedido.
create or replace function public.social_task_to_art(_id uuid, _kind text)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  _t public.social_tasks;
  _plan uuid;
  _item uuid;
  _month date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  _m record;
begin
  if not public.can_social() then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _t from public.social_tasks where id = _id;
  if not found then raise exception 'Nao encontrado' using errcode = 'PF004'; end if;
  if _t.client_id is null then raise exception 'Tarefa sem cliente' using errcode = 'PF006'; end if;
  if _t.art_id is not null then return _t.art_id; end if;
  insert into public.content_plans (client_id, month) values (_t.client_id, _month)
  on conflict (client_id, month) do update set updated_at = public.content_plans.updated_at
  returning id into _plan;
  insert into public.content_items (plan_id, client_id, number, kind, status, title, headline, subtitle, cta, caption, briefing, is_extra, ai_brief)
  values (_plan, _t.client_id, coalesce((select max(number) from public.content_items where plan_id = _plan), 0) + 1,
    case when _kind in ('post', 'carrossel', 'story', 'reels', 'anuncio') then _kind else 'post' end, 'ready',
    left(trim(_t.title), 200), left(_t.details ->> 'headline', 500), left(_t.details ->> 'subtitle', 500), left(_t.details ->> 'cta', 200),
    left(_t.details ->> 'caption', 4000), left(coalesce(_t.description, _t.title), 8000), true, _t.details)
  returning id into _item;
  for _m in select * from public.whatsapp_media where message_id = any (coalesce(_t.media_ids, '{}')) and path is not null and bucket = 'content-files' loop
    insert into public.content_files (item_id, role, path, name, mime, size_bytes)
    values (_item, 'reference', _m.path, 'WhatsApp #' || _m.message_id, coalesce(_m.mime, 'image/jpeg'), greatest(coalesce(_m.size_bytes, 1), 1))
    on conflict (path) do nothing;
  end loop;
  insert into public.content_events (item_id, actor_kind, actor_name, to_status, message)
  values (_item, 'system', 'Tarefa', 'ready', 'Veio da tarefa: ' || left(_t.title, 300));
  update public.social_tasks set status = 'feito', art_id = _item, completed_at = now(), updated_at = now() where id = _id;
  perform public.notify(public.client_staff_profiles(_t.client_id, array['designer']), 'content_review',
    'Nova arte: ' || (select trim(name) from public.clients where id = _t.client_id), left(_t.title, 200), '/conteudo/design', _t.client_id);
  return _item;
end $$;
revoke execute on function public.social_task_to_art(uuid, text) from public, anon;
grant execute on function public.social_task_to_art(uuid, text) to authenticated;

-- Hub do WhatsApp: pedido de arte do cliente (área design) agora vira tarefa da social media, com os detalhes e os
-- arquivos guardados na tarefa. Troca só o trecho do design dentro de agent_route_request.
do $patch$
declare
  d text := pg_get_functiondef('public.agent_route_request'::regproc);
  s int := position('  if _area = ''design'' then' in d);
  e int := position('  elsif _area = ''trafego'' then' in d);
begin
  if s = 0 or e = 0 then raise exception 'agent_route_request mudou: trecho do design nao encontrado'; end if;
  d := left(d, s - 1) || $new$  if _area = 'design' then
    insert into public.social_tasks (client_id, title, description, source, priority, network, details, media_ids)
    values (_c.client_id, left(trim(_title), 200),
      left(concat_ws(E'\n\n', 'Pedido do cliente no WhatsApp: ' || coalesce(_excerpt, ''), _details ->> 'brief', case when _media_text is not null then 'Arquivos que o cliente mandou:' || E'\n' || _media_text end), 4000),
      'pedido_cliente', true, 'instagram', _details, coalesce(_media, '{}'))
    returning id into _routed;
    _table := 'social_tasks';
    perform public.notify(public.client_staff_profiles(_c.client_id, array['social_media']), 'social_request',
      'Pedido do cliente pelo WhatsApp: ' || (select trim(name) from public.clients where id = _c.client_id), left(_title, 200), '/conteudo/tarefas', _c.client_id);
$new$ || substr(d, e);
  execute d;
end $patch$;
