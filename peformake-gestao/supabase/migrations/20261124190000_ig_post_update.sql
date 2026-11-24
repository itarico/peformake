-- Editar dia, hora e legenda de uma publicação agendada (ou que falhou) pelo cartão do calendário (Italo, 24/11/2026).
CREATE OR REPLACE FUNCTION public.ig_post_update(_id uuid, _at timestamp with time zone, _caption text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.can_plan_content() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _at is null or _at < now() - interval '2 minutes' then raise exception 'Escolha uma data no futuro' using errcode = 'PF022'; end if;
  if _at > now() + interval '75 days' then raise exception 'Agende para no máximo 75 dias' using errcode = 'PF022'; end if;
  update public.ig_posts set scheduled_at = _at,
    caption = case when kind = 'story' then null else nullif(trim(coalesce(_caption, '')), '') end,
    status = 'agendado', error = null, tries = 0, container_id = null
  where id = _id and status in ('agendado', 'erro');
  if not found then raise exception 'Esta publicação já saiu ou foi cancelada' using errcode = 'PF028'; end if;
end $function$;

revoke execute on function public.ig_post_update(uuid, timestamptz, text) from public, anon;
grant execute on function public.ig_post_update(uuid, timestamptz, text) to authenticated;
