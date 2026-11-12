-- Início e telas mais rápidos (12/11/2026).
-- automation_overview: antes lia o histórico do pg_cron (30 mil linhas, sem índice por tarefa) uma vez para CADA
-- automação (35 leituras, ~2,2 s; até 7 s). Agora lê uma vez só e guarda a última execução de cada tarefa.
-- Mesmo resultado (mesmas chaves e valores).
create or replace function public.automation_overview()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  _r public.automation_catalog;
  _out jsonb := '[]'::jsonb;
  _on boolean; _job_active boolean;
  _last_at timestamptz; _last_status text; _last_msg text;
  _activity timestamptz; _problem text; _n int;
  _jobs jsonb; _runs jsonb;
begin
  if not (public.has_role('admin') or public.has_role('head_marketing')) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  -- Uma leitura só: situação de cada tarefa e a última execução dela.
  select coalesce(jsonb_object_agg(j.jobname, j.active), '{}'::jsonb) into _jobs from cron.job j where j.jobname is not null;
  select coalesce(jsonb_object_agg(x.jobname, jsonb_build_object('at', x.start_time, 'st', x.status, 'msg', x.msg)), '{}'::jsonb) into _runs
    from (
      select distinct on (j.jobname) j.jobname, d.start_time, d.status, left(d.return_message, 200) msg
        from cron.job_run_details d join cron.job j on j.jobid = d.jobid
       where j.jobname is not null
       order by j.jobname, d.start_time desc
    ) x;
  for _r in select * from public.automation_catalog order by module, position loop
    _on := null; _job_active := null; _last_at := null; _last_status := null; _last_msg := null; _activity := null; _problem := null;
    if _r.cron_job is not null then
      _job_active := (_jobs ->> _r.cron_job)::boolean;
      _last_at := (_runs -> _r.cron_job ->> 'at')::timestamptz;
      _last_status := _runs -> _r.cron_job ->> 'st';
      _last_msg := _runs -> _r.cron_job ->> 'msg';
      if _last_status = 'failed' then _problem := 'A última execução falhou: ' || coalesce(_last_msg, 'sem detalhe'); end if;
    end if;
    if _r.flag_table is not null then
      execute format('select %I from public.%I limit 1', _r.flag_column, _r.flag_table) into _on;
    elsif _r.traffic_key is not null then
      select t.enabled into _on from public.traffic_automations t where t.key = _r.traffic_key;
    elsif _r.cron_job is not null then
      _on := _job_active;
    end if;
    if _job_active is false then _on := false; end if;
    if _r.routine_id is not null and _r.routine_on is false and coalesce(_on, true) then
      _problem := coalesce(_problem, 'A tarefa da IA que faz isso está desligada.');
    end if;
    case _r.key
      when 'com_despertador' then
        select case when l.status = 'no_token' or l.detail ilike 'falta%' then l.detail end, l.requested_at into _problem, _activity
          from public.agent_fire_log l where l.routine = 'commercial' order by l.requested_at desc limit 1;
      when 'com_leitura' then select max(ai_analyzed_at) into _activity from public.wa_contacts;
      when 'wa_avisos' then
        select count(*) into _n from public.notification_outbox where status = 'pending' and created_at < now() - interval '30 minutes';
        if _n > 0 then _problem := _n || ' aviso(s) parado(s) na fila. Confira o segredo do Wasender.'; end if;
        select max(sent_at) into _activity from public.notification_outbox;
      when 'wa_email' then
        select count(*) into _n from public.email_outbox where status = 'pending' and created_at < now() - interval '30 minutes';
        if _n > 0 then _problem := _n || ' e-mail(s) parado(s) na fila.'; end if;
        select max(sent_at) into _activity from public.email_outbox;
      when 'fin_cobranca' then
        select count(*) into _n from public.invoices where status = 'pendente' and gateway_error is not null;
        if _n > 0 then _problem := _n || ' fatura(s) com erro no Asaas (geralmente cliente sem CPF/CNPJ).'; end if;
      when 'trf_leitura' then
        select last_auto_run_at into _activity from public.traffic_settings where id;
        if coalesce(_on, false) and (_activity is null or _activity < now() - interval '12 hours') then
          _problem := coalesce(_problem, 'Sem leitura dos anúncios há mais de 12 horas.');
        end if;
      when 'trf_rel_semanal' then select max(created_at) into _activity from public.traffic_reports where kind = 'weekly';
      when 'trf_rel_mensal' then select max(created_at) into _activity from public.traffic_reports where kind = 'monthly';
      else null;
    end case;
    _out := _out || jsonb_build_object(
      'key', _r.key, 'module', _r.module, 'title', _r.title, 'what', _r.what, 'how', _r.how, 'schedule', _r.schedule,
      'uses_ai', _r.uses_ai, 'risk', _r.risk, 'routine_id', _r.routine_id, 'routine_on', _r.routine_on,
      'can_toggle', (_r.flag_table is not null or _r.traffic_key is not null or _r.cron_job is not null),
      'enabled', _on, 'last_at', _last_at, 'last_status', _last_status, 'activity_at', _activity,
      'status', case
        when _on is false then 'desligada'
        when _problem is not null then 'erro'
        when _r.routine_id is not null and _r.cron_job is null and _r.traffic_key is null and _r.flag_table is null then case when _r.routine_on then 'ok' else 'desligada' end
        else 'ok' end,
      'problem', _problem);
  end loop;
  return _out;
end $function$;

-- Permissões (RLS) calculadas uma vez por consulta, e não uma vez por linha.
-- Regras como "can_access_traffic()" não dependem da linha, mas o Postgres as executava para CADA linha
-- (client_team: 26 ms -> 0,4 ms por leitura). Envolver em (select ...) faz o banco calcular uma vez só.
-- Mesmo resultado: só muda regra que não usa nenhuma coluna da tabela (as que usam ficam como estão).
do $rls$
declare p record; tok text := $r$(has_role\('[a-z_]+'::app_role\)|\m(can|is)_[a-z_]+\(('[a-z_]+'::text)?\)|\m(NOT|OR|AND)\M|[\s()])$r$;
begin
  for p in
    select tablename, policyname, qual, with_check from pg_policies where schemaname = 'public'
  loop
    if p.qual is not null and regexp_replace(p.qual, tok, '', 'g') = '' and p.qual ~ '\(' then
      execute format('alter policy %I on public.%I using ((select %s))', p.policyname, p.tablename, p.qual);
    end if;
    if p.with_check is not null and regexp_replace(p.with_check, tok, '', 'g') = '' and p.with_check ~ '\(' then
      execute format('alter policy %I on public.%I with check ((select %s))', p.policyname, p.tablename, p.with_check);
    end if;
  end loop;
end $rls$;

-- As três regras de leitura que misturam papel e coluna: o papel uma vez só, a coluna por linha (mesma lógica).
alter policy clients_select_ellcazo on public.clients using (((select public.has_role('ellcazo'::public.app_role)) and public.is_ellcazo_client(id)));
alter policy client_contacts_read_ellcazo on public.client_contacts using (((select public.has_role('ellcazo'::public.app_role)) and public.is_ellcazo_client(client_id)));
alter policy services_select_all on public.services using (((not (select public.is_ellcazo_only())) or (area = 'audiovisual'::text)));
