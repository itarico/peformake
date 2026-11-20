-- Portal do cliente: Briefing e Perguntas do mês (Italo, 20/11: "enviamos o link do portal e obrigatoriamente ele tem
-- que preencher o briefing com o que estiver faltando ou revisar o que já tem; as perguntas mensais todo dia 10").
-- Funções que o portal chama recebem _token; as outras nascem fechadas para visitante.

-- 1) Link do portal próprio para o briefing: não derruba o link que a equipe já mandou (origem 'equipe').
create or replace function public.portal_create_link(_client_id uuid)
returns text language plpgsql security definer set search_path to '' as $function$
declare
  _token text;
begin
  if not public.can_manage_portal() then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  perform 1 from public.clients where id = _client_id and is_active and not is_lost for update;
  if not found then
    if exists (select 1 from public.clients where id = _client_id) then
      raise exception 'Cliente inativo' using errcode = 'PF003';
    end if;
    raise exception 'Cliente nao encontrado' using errcode = 'PF004';
  end if;
  -- Só troca o link da equipe; o acesso de quem entra com e-mail e senha e o link do briefing continuam.
  update public.client_portal_links
    set revoked_at = now(), revoked_by = (select auth.uid())
    where client_id = _client_id and revoked_at is null and user_id is null and coalesce(origin, 'equipe') = 'equipe';
  _token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.client_portal_links (client_id, token_hash, created_by)
    values (_client_id, extensions.digest(_token, 'sha256'), (select auth.uid()));
  return _token;
end;
$function$;

-- Uso interno (equipe e rotina): um link novo de origem 'briefing'; o anterior do briefing deixa de valer.
create or replace function public.brief_link_make(_client uuid, _by uuid)
returns text language plpgsql security definer set search_path to '' as $function$
declare _token text;
begin
  perform 1 from public.clients where id = _client and is_active and not is_lost;
  if not found then raise exception 'Cliente inativo' using errcode = 'PF003'; end if;
  update public.client_portal_links set revoked_at = now(), revoked_by = _by
   where client_id = _client and revoked_at is null and user_id is null and origin = 'briefing';
  _token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.client_portal_links (client_id, token_hash, created_by, origin)
    values (_client, extensions.digest(_token, 'sha256'), _by, 'briefing');
  return _token;
end $function$;
revoke execute on function public.brief_link_make(uuid, uuid) from public, anon, authenticated;

-- Botão "Enviar" do passo Briefing: a equipe recebe o link para mandar pelo WhatsApp dela.
create or replace function public.brief_portal_link(_client uuid)
returns text language plpgsql security definer set search_path to '' as $function$
begin
  if not (public.consult_can() or public.can_manage_portal()) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return public.brief_link_make(_client, (select auth.uid()));
end $function$;
revoke execute on function public.brief_portal_link(uuid) from public, anon;
grant execute on function public.brief_portal_link(uuid) to authenticated;

-- 2) O que o portal mostra no Briefing e nas Perguntas. Sem nenhum valor da Peformake.
create or replace function public.portal_brief(_token text, _month date)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare _client uuid := public.portal_resolve(_token); m text := to_char(_month, 'YYYY-MM');
begin
  return jsonb_build_object(
    'data', coalesce((select b.data - 'cnpj' from public.client_briefs b where b.client_id = _client), '{}'::jsonb),
    'known', (select jsonb_build_object('segment', c.segment, 'description', c.description, 'target_audience', c.target_audience,
        'value_proposition', c.value_proposition, 'competitors', c.competitors, 'instagram', c.instagram, 'website', c.website, 'phone', c.phone)
      from public.clients c where c.id = _client),
    'links', coalesce((select jsonb_agg(jsonb_build_object('name', l.name, 'url', l.url)) from (select name, url from public.client_links where client_id = _client limit 30) l), '[]'::jsonb),
    'voz', (select jsonb_build_object('essencia', v.essencia, 'tom', v.tom, 'evitar', v.evitar) from public.client_brand_voice v where v.client_id = _client),
    'rivals', (select d.doc->'diagnostico'->'mercado'->'concorrentes' from public.consult_docs d where d.client_id = _client),
    'has_video', exists (select 1 from public.client_services cs join public.services s on s.id = cs.service_id
      where cs.client_id = _client and cs.is_active and s.is_audiovisual),
    'docs', coalesce((select jsonb_agg(jsonb_build_object('name', a.name, 'at', a.created_at) order by a.created_at desc)
      from (select name, created_at from public.client_assets where client_id = _client and folder = 'briefing' order by created_at desc limit 20) a), '[]'::jsonb),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'why', case when q.why ilike 'Do diagn%' then null else q.why end, 'options', q.options, 'cond', q.cond,
        'answer', q.answer, 'status', q.status, 'answered_via', q.answered_via) order by q.created_at)
      from public.client_questions q where q.client_id = _client and q.pack = 'briefing_mes' and q.focus = m and q.status <> 'descartada'), '[]'::jsonb));
end $function$;
revoke execute on function public.portal_brief(text, date) from public;
grant execute on function public.portal_brief(text, date) to anon, authenticated;

-- 3) O cliente salva um pedaço do briefing fixo. Só os campos do briefing; nada de cadastro, tipo ou CNPJ.
create or replace function public.portal_brief_save(_token text, _patch jsonb)
returns void language plpgsql security definer set search_path to '' as $function$
declare
  _client uuid := public.portal_resolve(_token);
  _keys text[] := array['produtos', 'links', 'links_extra', 'links_off', 'publico', 'diferenciais', 'concorrentes', 'sem_concorrentes',
    'concorrentes_off', 'referencias', 'voz', 'proibidos', 'quem_aparece', 'quem_grava', 'capacidade', 'momento', 'proposito', 'percepcao',
    'arquetipo', 'posicionamento', 'historia', 'jornada', 'objecoes', 'visao'];
  _clean jsonb; _last timestamptz;
begin
  if jsonb_typeof(_patch) <> 'object' or length(_patch::text) > 60000 then raise exception 'Dados inválidos' using errcode = 'PF006'; end if;
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into _clean from jsonb_each(_patch) e(k, v) where k = any(_keys);
  if _clean = '{}'::jsonb then return; end if;
  select (data->>'cliente_em')::timestamptz into _last from public.client_briefs where client_id = _client;
  insert into public.client_briefs (client_id, data, updated_at)
    values (_client, _clean || jsonb_build_object('cliente_em', now()), now())
    on conflict (client_id) do update set data = public.client_briefs.data || excluded.data, updated_at = now();
  -- Avisa a equipe uma vez por sessão de preenchimento (não a cada campo).
  if _last is null or _last < now() - interval '2 hours' then
    perform public.notify(
      array(select r.user_id from public.user_roles r join public.profiles p on p.id = r.user_id where r.role in ('admin', 'head_marketing') and p.is_active),
      'client_answer', (select trim(name) from public.clients where id = _client) || ' está preenchendo o briefing', 'Pelo portal.',
      '/estrategia/consultoria?cliente=' || _client::text, _client);
  end if;
end $function$;
revoke execute on function public.portal_brief_save(text, jsonb) from public;
grant execute on function public.portal_brief_save(text, jsonb) to anon, authenticated;

-- 4) Resposta do cliente a uma pergunta do mês (toque, texto, áudio ou arquivo; o anexo sobe pela função portal-brief).
create or replace function public.portal_brief_answer(_token text, _id uuid, _answer text, _attachments jsonb default null)
returns void language plpgsql security definer set search_path to '' as $function$
declare _client uuid := public.portal_resolve(_token); _prev timestamptz;
begin
  if nullif(trim(coalesce(_answer, '')), '') is null and coalesce(jsonb_array_length(case when jsonb_typeof(_attachments) = 'array' then _attachments end), 0) = 0 then
    raise exception 'Escreva a resposta' using errcode = 'PF006';
  end if;
  select max(answered_at) into _prev from public.client_questions where client_id = _client and pack = 'briefing_mes' and answered_via = 'cliente';
  update public.client_questions set
    answer = coalesce(nullif(left(trim(coalesce(_answer, '')), 4000), ''), '(resposta em anexo)'),
    attachments = case when jsonb_typeof(_attachments) = 'array' then coalesce(attachments, '[]'::jsonb) || _attachments else attachments end,
    status = 'respondida', answered_at = now(), answered_via = 'cliente', audio_pending = false, updated_at = now()
   where id = _id and client_id = _client and pack = 'briefing_mes' and status <> 'descartada';
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  if _prev is null or _prev < now() - interval '2 hours' then
    perform public.notify(
      array(select r.user_id from public.user_roles r join public.profiles p on p.id = r.user_id where r.role in ('admin', 'head_marketing') and p.is_active),
      'client_answer', (select trim(name) from public.clients where id = _client) || ' respondeu as perguntas do mês', 'Pelo portal.',
      '/estrategia/consultoria?cliente=' || _client::text || '&ver=perguntas', _client);
  end if;
end $function$;
revoke execute on function public.portal_brief_answer(text, uuid, text, jsonb) from public;
grant execute on function public.portal_brief_answer(text, uuid, text, jsonb) to anon, authenticated;

-- 5) O motor das perguntas também roda pela rotina do dia 10 (função portal-brief com a chave do servidor).
create or replace function public.brief_questions_put(_client uuid, _month date, _qs jsonb)
returns integer language plpgsql security definer set search_path to '' as $function$
declare m text := to_char(_month, 'YYYY-MM'); n integer := 0; r record; untouched boolean;
begin
  if not (public.consult_can() or (select auth.role()) = 'service_role') then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if jsonb_typeof(_qs) <> 'array' or jsonb_array_length(_qs) = 0 then return 0; end if;
  select not exists (select 1 from public.client_questions where client_id = _client and pack = 'briefing_mes' and focus = m and (status not in ('pendente', 'descartada') or answer is not null))
    into untouched;
  if not untouched then return 0; end if;
  update public.client_questions set status = 'descartada'
   where client_id = _client and pack = 'briefing_mes' and focus = m and status = 'pendente'
     and lower(question) not in (select lower(e->>'question') from jsonb_array_elements(_qs) e);
  for r in select e->>'area' area, e->>'question' question, e->>'why' why, coalesce(e->'options', '[]'::jsonb) options, e->'cond' cond, ord
             from jsonb_array_elements(_qs) with ordinality t(e, ord)
            where coalesce(e->>'question', '') <> '' and e->>'area' in ('consultoria', 'vendas', 'social', 'audiovisual', 'trafego') loop
    insert into public.client_questions (client_id, area, pack, focus, question, why, required, status, source, options, cond)
    values (_client, r.area, 'briefing_mes', m, left(r.question, 300), left(r.why, 300), r.ord <= 2, 'pendente', 'briefing', r.options, nullif(r.cond, 'null'::jsonb))
    on conflict (client_id, area, lower(question)) do update set status = 'pendente', pack = 'briefing_mes', focus = m, why = excluded.why, options = excluded.options, cond = excluded.cond
      where (public.client_questions.status = 'descartada')
         or (public.client_questions.status = 'pendente' and public.client_questions.answer is null and (public.client_questions.pack is null or public.client_questions.focus = m));
    if found then n := n + 1; end if;
  end loop;
  return n;
end $function$;
revoke execute on function public.brief_questions_put(uuid, date, jsonb) from public, anon;
grant execute on function public.brief_questions_put(uuid, date, jsonb) to authenticated, service_role;

-- 6) Aviso do dia 10. Desligado (padrão): avisa a equipe, que envia pelo WhatsApp dela no passo Briefing.
--    Ligado (Configurações → Automações): manda sozinho para os contatos de aprovação, com o link do portal.
alter table public.consult_settings add column if not exists brief_portal_whatsapp boolean not null default false;

create or replace function public.brief_monthly_notify(_client uuid, _month date)
returns text language plpgsql security definer set search_path to '' as $function$
declare
  _name text; _token text; _url text; _c record; _phone text; _n integer := 0;
  _mes text := (array['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'])[extract(month from _month)::int];
  _open integer;
begin
  select trim(name) into _name from public.clients where id = _client and is_active and not is_lost;
  if _name is null then return 'inativo'; end if;
  select count(*) into _open from public.client_questions where client_id = _client and pack = 'briefing_mes' and focus = to_char(_month, 'YYYY-MM') and status in ('pendente', 'enviada');
  if _open = 0 then return 'sem_perguntas'; end if;
  if not coalesce((select brief_portal_whatsapp from public.consult_settings where id), false) then
    perform public.notify(
      array(select r.user_id from public.user_roles r join public.profiles p on p.id = r.user_id where r.role in ('admin', 'head_marketing') and p.is_active),
      'monthly_ready', 'Perguntas de ' || _mes || ' prontas: ' || _name, 'Toque em Enviar no passo Briefing para mandar o link do portal.',
      '/estrategia/consultoria?cliente=' || _client::text, _client);
    return 'equipe';
  end if;
  for _c in
    with contacts as (
      select regexp_replace(coalesce(cc.phone, ''), '[^0-9]', '', 'g') as phone, nullif(split_part(trim(coalesce(cc.name, '')), ' ', 1), '') as first
      from public.client_contacts cc where cc.client_id = _client and cc.gets_approvals and cc.phone is not null
    ), fallback as (
      select regexp_replace(coalesce(cl.phone, ''), '[^0-9]', '', 'g') as phone, null::text as first
      from public.clients cl where cl.id = _client and not exists (select 1 from contacts)
    )
    select distinct on (phone) phone, first from (select * from contacts union all select * from fallback) x order by phone, first nulls last
  loop
    _phone := _c.phone;
    if length(_phone) between 10 and 11 then _phone := '55' || _phone; end if;
    continue when _phone !~ '^[0-9]{12,15}$';
    if _token is null then
      _token := public.brief_link_make(_client, null);
      _url := public.app_base_url() || '/portal#' || _token || '/perguntas';
    end if;
    insert into public.notification_outbox (kind, client_id, to_phone, message, dedupe_key)
    values ('brief_monthly', _client, _phone,
      'Olá' || coalesce(', ' || _c.first, '') || '! As perguntas de ' || _mes || ' da ' || _name || ' já estão no seu painel da Peformake. '
        || 'Responde com um toque, por texto ou áudio, em poucos minutos. Aproveite e confira o briefing: ' || _url,
      'brief_monthly:' || _client || ':' || to_char(_month, 'YYYY-MM') || ':' || _phone)
    on conflict (dedupe_key) do nothing;
    _n := _n + 1;
  end loop;
  return case when _n > 0 then 'cliente' else 'sem_telefone' end;
end $function$;
revoke execute on function public.brief_monthly_notify(uuid, date) from public, anon, authenticated;
grant execute on function public.brief_monthly_notify(uuid, date) to service_role;

create or replace function public.brief_monthly_kick()
returns void language plpgsql security definer set search_path to '' as $function$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/portal-brief',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'traffic_cron_secret')),
    body := '{"action":"monthly"}'::jsonb, timeout_milliseconds := 5000);
end $function$;
revoke execute on function public.brief_monthly_kick() from public, anon, authenticated;

-- Dia 10, 09:00 de Recife (12:00 UTC).
select cron.unschedule(jobid) from cron.job where jobname = 'brief-monthly-10';
select cron.schedule('brief-monthly-10', '0 12 10 * *', $$ select public.brief_monthly_kick(); $$);

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job, flag_table, flag_column)
values ('est_briefing_dia10', 'estrategia', 7, 'Perguntas do mês no portal (dia 10)',
  'No dia 10 o motor (sem IA) refaz as perguntas do mês seguinte de cada cliente e deixa pronto o aviso com o link do portal, onde o cliente revisa o briefing e responde.',
  'Desligado: a equipe é avisada e envia pelo WhatsApp dela (passo Briefing → Enviar). Ligado: o cliente recebe sozinho no WhatsApp dos contatos de aprovação (ou o do cadastro).',
  'Dia 10, 09:00', false, 'medio', 'brief-monthly-10', 'consult_settings', 'brief_portal_whatsapp')
on conflict (key) do update set title = excluded.title, what = excluded.what, how = excluded.how, schedule = excluded.schedule,
  cron_job = excluded.cron_job, flag_table = excluded.flag_table, flag_column = excluded.flag_column;

-- 7) Arquivo que o cliente manda pelo portal entra na pasta Briefing com a origem "portal".
alter table public.client_assets drop constraint if exists client_assets_source_check;
alter table public.client_assets add constraint client_assets_source_check
  check (source = any (array['manual', 'creative', 'report', 'strategy', 'whatsapp', 'agente', 'portal']));

-- Clientes da rotina do dia 10: os mesmos da lista da Consultoria (Consultoria ou alguma área ativa).
create or replace function public.brief_monthly_clients()
returns table (id uuid, name text, segment text, description text) language sql stable security definer set search_path to '' as $function$
  select c.id, trim(c.name), c.segment, c.description from public.clients c
   where c.is_active and not c.is_lost
     and (public.consult_has_service(c.id) or public.client_in_area(c.id, 'trafego') or public.client_in_area(c.id, 'conteudo') or public.client_in_area(c.id, 'audiovisual'))
$function$;
revoke execute on function public.brief_monthly_clients() from public, anon, authenticated;
grant execute on function public.brief_monthly_clients() to service_role;
