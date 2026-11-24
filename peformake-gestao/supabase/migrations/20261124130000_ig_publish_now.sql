-- "Postar agora" (pedido do Italo, 24/11/2026): em vez de esperar a rotina de 5 minutos, chama a publicação na hora.
-- Mesma chamada da rotina ig-publish (segredo no cofre); quem chama só precisa poder planejar conteúdo.
create or replace function public.ig_publish_now()
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.can_plan_content() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/ig-publish',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'traffic_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 120000);
end $$;
revoke execute on function public.ig_publish_now() from public, anon;
grant execute on function public.ig_publish_now() to authenticated;
