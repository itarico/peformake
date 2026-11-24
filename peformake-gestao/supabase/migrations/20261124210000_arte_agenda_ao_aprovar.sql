-- Agendar no briefing (pedido do Italo, 24/11/2026): a social media marca dia e hora de publicar já no briefing
-- (spec.scheduleAt, com spec.autoSchedule = true). Quando a arte é aprovada, o sistema agenda sozinho no Instagram do
-- cliente. Se não dá (data já passou, Instagram desconectado, arquivo que o Instagram não aceita), não publica nada:
-- grava o motivo em spec.scheduleIssue e a arte fica em "Aprovada, falta agendar" com o aviso.
create or replace function public.content_item_auto_schedule()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  _at timestamptz;
  _account uuid;
  _files jsonb;
  _n int;
  _video boolean;
  _kind text;
  _issue text;
begin
  if new.status <> 'approved' or old.status = 'approved' then return new; end if;
  if coalesce(new.spec->>'autoSchedule', '') <> 'true' or coalesce(new.spec->>'scheduleAt', '') = '' then return new; end if;
  if exists (select 1 from public.ig_posts where content_item_id = new.id and status in ('agendado', 'publicando', 'publicado')) then return new; end if;

  _at := (new.spec->>'scheduleAt')::timestamptz;
  select id into _account from public.ig_accounts where client_id = new.client_id and status = 'conectado' order by connected_at desc limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('path', path, 'mime', mime) order by created_at), '[]'::jsonb), count(*),
         bool_or(mime like 'video/%')
    into _files, _n, _video
    from public.content_files where item_id = new.id and role = 'final';
  _kind := case when new.kind = 'story' then 'story' when new.kind = 'reels' or (_video and _n = 1) then 'reels' else 'post' end;

  if _at < now() + interval '2 minutes' then _issue := 'A data marcada para publicar já passou. Escolha outra em Agendar.';
  elsif _at > now() + interval '75 days' then _issue := 'A data marcada passa de 75 dias. Agende mais perto.';
  elsif _account is null then _issue := 'O Instagram do cliente não está conectado. Conecte em Agendar.';
  elsif _n = 0 then _issue := 'A arte aprovada não tem arquivo final.';
  elsif exists (select 1 from jsonb_array_elements(_files) f where f->>'mime' not like 'video/%' and f->>'mime' not in ('image/jpeg', 'image/jpg'))
    then _issue := 'O Instagram só aceita foto em JPG. Agende em Agendar (lá a foto é ajustada).';
  elsif _kind = 'story' and _n > 1 then _issue := 'Story com mais de um arquivo: agende em Agendar.';
  end if;

  if _issue is not null then
    new.spec := jsonb_set(coalesce(new.spec, '{}'::jsonb), '{scheduleIssue}', to_jsonb(_issue));
    return new;
  end if;

  insert into public.ig_posts (account_id, content_item_id, kind, media_path, media_mime, caption, scheduled_at, created_by, media)
  values (_account, new.id, _kind, _files->0->>'path', _files->0->>'mime', case when _kind = 'story' then null else nullif(trim(coalesce(new.caption, '')), '') end,
          _at, auth.uid(), case when _n > 1 then _files else '[]'::jsonb end);
  new.spec := (coalesce(new.spec, '{}'::jsonb) - 'scheduleIssue') || jsonb_build_object('scheduledAuto', true);
  return new;
end $$;
revoke execute on function public.content_item_auto_schedule() from public, anon, authenticated;

create or replace trigger content_item_auto_schedule before update of status on public.content_items
  for each row execute function public.content_item_auto_schedule();
