-- Tráfego pronto antes do expediente (8h em Brasília) e WhatsApp lido 24 horas.
-- Horários do pg_cron em UTC (Brasília = UTC-3).

-- O despertador do Comercial chama a leitura a qualquer hora (antes: só das 7h às 21h).
create or replace function public.hub_wakeup()
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  _last timestamptz;
  _log uuid;
begin
  -- Qualquer tentativa conta: sem token, não fica tentando a cada 5 minutos.
  select max(requested_at) into _last from public.agent_fire_log where routine = 'commercial';
  if not exists (
    select 1 from public.whatsapp_messages m join public.wa_contacts c on c.chat_jid = m.chat_jid and c.client_id is not null
    where not m.from_me and m.received_at > coalesce(_last, now() - interval '1 hour') and m.received_at < now() - interval '2 minutes'
  ) then
    return false;
  end if;
  if _last > now() - interval '10 minutes' then
    return false;
  end if;
  insert into public.agent_fire_log (routine, note) values ('commercial', 'hub') returning id into _log;
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/agent-fire',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'traffic_cron_secret')),
    body := jsonb_build_object('routine', 'commercial', 'log_id', _log, 'text', 'Mensagem nova de cliente: leia agora as conversas e roteie os pedidos pelo hub.'),
    timeout_milliseconds := 30000);
  return true;
end;
$function$;

-- Varredura do Tráfego às 06:40 (antes: 08:10), depois da leitura das 05:30.
select cron.alter_job((select jobid from cron.job where jobname = 'traffic-scan-daily'), schedule := '40 9 * * *');
-- Lembrete de aprovação e efeito das ações às 07:30 (antes: 10:00).
select cron.alter_job((select jobid from cron.job where jobname = 'task-daily-check'), schedule := '30 10 * * *');
-- PDF dos relatórios às 07:15, depois do texto escrito pela IA às 06:00 (antes: 09:00).
select cron.alter_job((select jobid from cron.job where jobname = 'traffic-report-weekly'), schedule := '15 10 * * 1');
select cron.alter_job((select jobid from cron.job where jobname = 'traffic-report-monthly'), schedule := '15 10 28-31 * *');

-- Textos do painel de automações do Tráfego com os horários novos.
update public.traffic_automations set schedule = case key
  when 'lembrete_aprovacao' then 'Todo dia, 7h30'
  when 'varredura' then 'Depois de cada leitura e todo dia às 6h40'
  when 'relatorio_semanal' then 'Segunda, 7h15'
  when 'relatorio_mensal' then 'Últimos dias do mês, 7h15'
  else schedule end
where key in ('lembrete_aprovacao','varredura','relatorio_semanal','relatorio_mensal');
