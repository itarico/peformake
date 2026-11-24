-- Vídeo acima de 50 MB (limite de arquivo do plano gratuito do Supabase): o navegador sobe o vídeo em partes de 45 MB
-- (<media_path>.part0, .part1, ...) e a função ig-publish manda as partes em sequência para a Meta (upload retomável,
-- rupload.facebook.com). Pedido do Italo, 24/11/2026.
alter table public.ig_posts add column if not exists media_parts integer not null default 0;
alter table public.ig_posts add column if not exists media_size bigint;

create or replace function public.ig_post_media_parts(_id uuid, _parts integer, _size bigint)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.can_plan_content() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _parts < 1 or _parts > 40 or _size < 1 then raise exception 'Formato inválido' using errcode = 'PF006'; end if;
  update public.ig_posts set media_parts = _parts, media_size = _size where id = _id and status in ('agendado', 'erro') and media_mime like 'video/%';
  if not found then raise exception 'Publicação não encontrada' using errcode = 'PF004'; end if;
end $$;
revoke execute on function public.ig_post_media_parts(uuid, integer, bigint) from public, anon;
grant execute on function public.ig_post_media_parts(uuid, integer, bigint) to authenticated;

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
    returning p.id, p.account_id, p.kind, p.media_path, p.media_mime, p.caption, p.container_id, p.tries, p.media_parts, p.media_size
  )
  select jsonb_build_object('id', m.id, 'kind', m.kind, 'media_path', m.media_path, 'media_mime', m.media_mime, 'caption', m.caption,
    'container_id', m.container_id, 'tries', m.tries, 'ig_id', a.ig_id, 'media_parts', m.media_parts, 'media_size', m.media_size,
    'token', (select d.decrypted_secret from vault.decrypted_secrets d where d.id = a.token_secret_id))
  from marked m join public.ig_accounts a on a.id = m.account_id;
end $$;
revoke execute on function public.ig_publish_queue(integer) from public, anon, authenticated;
grant execute on function public.ig_publish_queue(integer) to service_role;
