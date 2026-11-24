-- Social Media → Agendar (pedido do Italo, 24/11/2026): conectar o Instagram (da Peformake e dos clientes) pelo login oficial
-- da Meta ("login unificado" do app PEFORMAKE-SERVIDOR) e programar posts, reels e stories. A API não agenda: o sistema guarda
-- a data e a função ig-publish publica na hora (rotina a cada 5 minutos). O token de cada conta fica no cofre (vault).

create table if not exists public.ig_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,   -- vazio = Instagram da própria Peformake
  ig_id text not null unique,
  username text not null,
  token_secret_id uuid,
  status text not null default 'conectado' check (status in ('conectado', 'erro')),
  last_error text,
  connected_at timestamptz not null default now(),
  connected_by uuid
);
alter table public.ig_accounts enable row level security;
create policy ig_accounts_select on public.ig_accounts for select to authenticated using ((select public.can_plan_content()));

-- Pedido de conexão em andamento (a pessoa saiu para a tela da Meta e volta com este código).
create table if not exists public.ig_connect_states (
  state text primary key,
  client_id uuid references public.clients(id) on delete cascade,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table public.ig_connect_states enable row level security;

create table if not exists public.ig_posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.ig_accounts(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete set null,
  kind text not null check (kind in ('post', 'reels', 'story')),
  media_path text not null,            -- arquivo no balde público content-files
  media_mime text not null,
  caption text,
  scheduled_at timestamptz not null,
  status text not null default 'agendado' check (status in ('agendado', 'publicando', 'publicado', 'erro', 'cancelado')),
  container_id text,
  ig_media_id text,
  permalink text,
  error text,
  tries integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists ig_posts_due on public.ig_posts (status, scheduled_at);
alter table public.ig_posts enable row level security;
create policy ig_posts_select on public.ig_posts for select to authenticated using ((select public.can_plan_content()));

-- Começa a conexão: devolve o código que vai na tela de login da Meta.
create or replace function public.ig_connect_start(_client uuid default null)
returns text language plpgsql security definer set search_path to '' as $$
declare _state text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not public.can_plan_content() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _client is not null and not exists (select 1 from public.clients where id = _client) then
    raise exception 'Cliente não encontrado' using errcode = 'PF004';
  end if;
  insert into public.ig_connect_states (state, client_id, created_by) values (_state, _client, auth.uid());
  return _state;
end $$;
revoke execute on function public.ig_connect_start(uuid) from public, anon;
grant execute on function public.ig_connect_start(uuid) to authenticated;

-- Só a função ig-connect (service_role): confere o código (vale 20 minutos, um uso) e devolve o cliente.
create or replace function public.ig_connect_take(_state text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare _row record;
begin
  update public.ig_connect_states set used_at = now()
   where state = _state and used_at is null and created_at > now() - interval '20 minutes'
   returning client_id, created_by into _row;
  if not found then return null; end if;
  return jsonb_build_object('client_id', _row.client_id, 'by', _row.created_by);
end $$;
revoke execute on function public.ig_connect_take(text) from public, anon, authenticated;
grant execute on function public.ig_connect_take(text) to service_role;

-- Só a função ig-connect: grava a conta e guarda o token no cofre.
create or replace function public.ig_account_store(_client uuid, _by uuid, _ig_id text, _username text, _token text)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _id uuid; _secret uuid;
begin
  select id, token_secret_id into _id, _secret from public.ig_accounts where ig_id = _ig_id;
  if _secret is null then
    _secret := vault.create_secret(_token, 'ig_token_' || _ig_id, 'Token do Instagram (login unificado)');
  else
    perform vault.update_secret(_secret, _token);
  end if;
  if _id is null then
    insert into public.ig_accounts (client_id, ig_id, username, token_secret_id, connected_by)
    values (_client, _ig_id, _username, _secret, _by) returning id into _id;
  else
    update public.ig_accounts set client_id = coalesce(_client, client_id), username = _username, token_secret_id = _secret,
      status = 'conectado', last_error = null, connected_at = now(), connected_by = _by where id = _id;
  end if;
  return _id;
end $$;
revoke execute on function public.ig_account_store(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.ig_account_store(uuid, uuid, text, text, text) to service_role;

-- Agenda (ou altera, enquanto não saiu) uma publicação.
create or replace function public.ig_post_save(_id uuid, _account uuid, _item uuid, _kind text, _media_path text, _media_mime text, _caption text, _at timestamptz)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _out uuid; _video boolean := coalesce(_media_mime, '') like 'video/%';
begin
  if not public.can_plan_content() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _kind not in ('post', 'reels', 'story') then raise exception 'Tipo inválido' using errcode = 'PF021'; end if;
  if _at is null or _at < now() - interval '2 minutes' then raise exception 'Escolha uma data no futuro' using errcode = 'PF022'; end if;
  if _at > now() + interval '75 days' then raise exception 'Agende para no máximo 75 dias' using errcode = 'PF022'; end if;
  if coalesce(_media_path, '') = '' then raise exception 'Falta o arquivo' using errcode = 'PF023'; end if;
  if _kind = 'reels' and not _video then raise exception 'Reels precisa de um vídeo' using errcode = 'PF024'; end if;
  if _kind = 'post' and _video then raise exception 'Vídeo no feed é publicado como Reels' using errcode = 'PF024'; end if;
  if _kind in ('post', 'story') and not _video and _media_mime not in ('image/jpeg', 'image/jpg') then
    raise exception 'O Instagram só aceita imagem JPG pela API' using errcode = 'PF025';
  end if;
  if not exists (select 1 from public.ig_accounts where id = _account and status = 'conectado') then
    raise exception 'Instagram não conectado' using errcode = 'PF026';
  end if;
  if (select count(*) from public.ig_posts where account_id = _account and status in ('agendado', 'publicando', 'publicado')
        and scheduled_at between _at - interval '24 hours' and _at + interval '24 hours' and id is distinct from _id) >= 40 then
    raise exception 'Limite de publicações por dia desta conta' using errcode = 'PF027';
  end if;
  if _id is null then
    insert into public.ig_posts (account_id, content_item_id, kind, media_path, media_mime, caption, scheduled_at, created_by)
    values (_account, _item, _kind, _media_path, _media_mime, nullif(trim(coalesce(_caption, '')), ''), _at, auth.uid()) returning id into _out;
  else
    update public.ig_posts set account_id = _account, kind = _kind, media_path = _media_path, media_mime = _media_mime,
      caption = nullif(trim(coalesce(_caption, '')), ''), scheduled_at = _at, status = 'agendado', error = null, tries = 0
     where id = _id and status in ('agendado', 'erro') returning id into _out;
    if _out is null then raise exception 'Esta publicação já saiu ou foi cancelada' using errcode = 'PF028'; end if;
  end if;
  return _out;
end $$;
revoke execute on function public.ig_post_save(uuid, uuid, uuid, text, text, text, text, timestamptz) from public, anon;
grant execute on function public.ig_post_save(uuid, uuid, uuid, text, text, text, text, timestamptz) to authenticated;

create or replace function public.ig_post_cancel(_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.can_plan_content() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.ig_posts set status = 'cancelado' where id = _id and status in ('agendado', 'erro');
  if not found then raise exception 'Esta publicação já saiu ou foi cancelada' using errcode = 'PF028'; end if;
end $$;
revoke execute on function public.ig_post_cancel(uuid) from public, anon;
grant execute on function public.ig_post_cancel(uuid) to authenticated;

-- Só a função ig-publish: pega o que venceu (e o que ficou esperando o vídeo processar), marca "publicando" e devolve com o token.
create or replace function public.ig_publish_queue(_limit integer default 5)
returns setof jsonb language plpgsql security definer set search_path to '' as $$
begin
  return query
  with due as (
    select p.id from public.ig_posts p
     where (p.status = 'agendado' and p.scheduled_at <= now())
        or (p.status = 'publicando' and p.scheduled_at <= now() - interval '4 minutes')
     order by p.scheduled_at limit _limit for update skip locked
  ), marked as (
    update public.ig_posts p set status = 'publicando', tries = p.tries + 1 from due where p.id = due.id
    returning p.id, p.account_id, p.kind, p.media_path, p.media_mime, p.caption, p.container_id, p.tries
  )
  select jsonb_build_object('id', m.id, 'kind', m.kind, 'media_path', m.media_path, 'media_mime', m.media_mime, 'caption', m.caption,
    'container_id', m.container_id, 'tries', m.tries, 'ig_id', a.ig_id,
    'token', (select d.decrypted_secret from vault.decrypted_secrets d where d.id = a.token_secret_id))
  from marked m join public.ig_accounts a on a.id = m.account_id;
end $$;
revoke execute on function public.ig_publish_queue(integer) from public, anon, authenticated;
grant execute on function public.ig_publish_queue(integer) to service_role;

-- Só a função ig-publish: resultado. _state: 'publicado', 'erro' ou 'aguardando' (vídeo ainda processando, tenta de novo).
create or replace function public.ig_publish_done(_id uuid, _state text, _container text, _media_id text, _permalink text, _error text)
returns void language plpgsql security definer set search_path to '' as $$
declare _item uuid; _by uuid; _client uuid;
begin
  update public.ig_posts set
    status = case _state when 'publicado' then 'publicado' when 'aguardando' then 'publicando' else 'erro' end,
    container_id = coalesce(_container, container_id), ig_media_id = coalesce(_media_id, ig_media_id),
    permalink = coalesce(_permalink, permalink), error = case when _state = 'erro' then left(_error, 300) else null end,
    published_at = case when _state = 'publicado' then now() else published_at end
  where id = _id returning content_item_id, created_by into _item, _by;
  if _state = 'publicado' and _item is not null then
    update public.content_items set status = 'published' where id = _item and status = 'approved';
  end if;
  if _state = 'erro' and _by is not null then
    select a.client_id into _client from public.ig_posts p join public.ig_accounts a on a.id = p.account_id where p.id = _id;
    perform public.notify(array[_by], 'content_review', 'Publicação no Instagram falhou', left(coalesce(_error, ''), 200), '/conteudo/agendar', _client);
  end if;
end $$;
revoke execute on function public.ig_publish_done(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.ig_publish_done(uuid, text, text, text, text, text) to service_role;

-- Rotina: a cada 5 minutos chama a função que publica o que venceu (só faz a chamada se houver algo na fila).
select cron.schedule('ig-publish', '*/5 * * * *', $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/ig-publish',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'traffic_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 120000)
  where exists (select 1 from public.ig_posts where (status = 'agendado' and scheduled_at <= now()) or (status = 'publicando' and scheduled_at <= now() - interval '4 minutes'));
$cron$);

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job)
values ('ig_agendar', 'conteudo', 9, 'Publicar no Instagram na hora agendada',
  'Publica posts, reels e stories que a social media agendou em Social Media → Agendar, nas contas de Instagram conectadas.',
  'Função ig-publish, pela API oficial da Meta. Só publica o que alguém agendou; se falhar, avisa quem agendou.',
  'A cada 5 minutos, só quando há algo na hora', false, 'medio', 'ig-publish')
on conflict (key) do nothing;
