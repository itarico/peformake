-- Perguntas ao cliente (fase 2): pacote semanal gerado pela IA, chat público com o cliente, NPS e retroalimentação.
-- Só create or replace e if not exists (nada é apagado).

-- 1) Perguntas: botões de resposta rápida, anexos e áudio sem transcrição.
alter table public.client_questions add column if not exists options jsonb not null default '[]'::jsonb;
alter table public.client_questions add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.client_questions add column if not exists audio_pending boolean not null default false;
alter table public.client_questions add column if not exists focus text;          -- 'semana' | 'proximo_mes' | null (diagnóstico)
alter table public.client_questions add column if not exists updated_at timestamptz not null default now();
create index if not exists client_questions_client_idx on public.client_questions (client_id, status, created_at desc);

-- Chave de liga/desliga da geração semanal (só gera; nunca envia).
alter table public.consult_settings add column if not exists questions_enabled boolean not null default true;

-- 2) Conversa (chat) com o cliente: link próprio, sem login.
create table if not exists public.client_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token text not null unique,
  area text not null default 'consultoria',
  question_ids uuid[] not null default '{}',
  status text not null default 'aberta' check (status in ('aberta', 'concluida', 'encerrada')),
  stage text not null default 'perguntas' check (stage in ('perguntas', 'nps', 'avaliacao', 'fim')),
  current_question uuid,
  followups jsonb not null default '{}'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  nps_score smallint check (nps_score between 0 and 10),
  evaluation text check (length(evaluation) <= 2000),
  uploads integer not null default 0,
  cost_usd numeric not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '21 days',
  last_seen_at timestamptz,
  finished_at timestamptz
);
create index if not exists client_chat_sessions_client_idx on public.client_chat_sessions (client_id, created_at desc);
alter table public.client_chat_sessions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'client_chat_sessions' and policyname = 'client_chat_sessions_read') then
    create policy client_chat_sessions_read on public.client_chat_sessions for select to authenticated using (public.consult_can());
  end if;
end $$;
revoke all on public.client_chat_sessions from anon;

-- 3) Arquivos do chat (fotos, documentos, áudios): balde privado; a equipe abre por link assinado.
insert into storage.buckets (id, name, public, file_size_limit)
values ('client-chat', 'client-chat', false, 20000000)
on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'client_chat_team_read') then
    create policy client_chat_team_read on storage.objects for select to authenticated using (bucket_id = 'client-chat' and public.consult_can());
  end if;
end $$;

-- 4) Equipe: editar o texto de uma pergunta ainda não respondida.
create or replace function public.client_question_edit(_id uuid, _question text, _why text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if nullif(trim(coalesce(_question, '')), '') is null then raise exception 'Escreva a pergunta' using errcode = 'PF006'; end if;
  update public.client_questions set question = left(trim(_question), 500), why = nullif(left(trim(coalesce(_why, '')), 500), ''), updated_at = now()
   where id = _id and status in ('pendente', 'enviada');
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
end $$;
revoke all on function public.client_question_edit(uuid, text, text) from public, anon;
grant execute on function public.client_question_edit(uuid, text, text) to authenticated;

-- 5) Equipe: "Enviar ao cliente" = marca as escolhidas como enviadas e devolve o link da conversa.
--    Não manda nada: a pessoa abre o WhatsApp dela e envia (regra: envio ao cliente sempre por humano).
create or replace function public.client_chat_open(_client uuid, _ids uuid[])
returns text language plpgsql security definer set search_path to '' as $$
declare _token text; _ids_ok uuid[];
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select coalesce(array_agg(q.id order by q.created_at), '{}') into _ids_ok
    from public.client_questions q where q.client_id = _client and q.id = any(_ids) and q.status in ('pendente', 'enviada');
  if cardinality(_ids_ok) = 0 then raise exception 'Escolha ao menos uma pergunta' using errcode = 'PF006'; end if;
  update public.client_questions set status = 'enviada', sent_to_portal_at = coalesce(sent_to_portal_at, now()), updated_at = now()
   where id = any(_ids_ok);
  -- Conversa aberta e ainda válida: aproveita o mesmo link (junta as perguntas novas no fim).
  select s.token into _token from public.client_chat_sessions s
   where s.client_id = _client and s.status = 'aberta' and s.expires_at > now() order by s.created_at desc limit 1;
  if _token is not null then
    update public.client_chat_sessions s set
      question_ids = s.question_ids || array(select x from unnest(_ids_ok) x where not x = any(s.question_ids)),
      stage = case when s.stage in ('nps', 'avaliacao', 'fim') and exists (select 1 from unnest(_ids_ok) x where not x = any(s.question_ids)) then 'perguntas' else s.stage end,
      expires_at = greatest(s.expires_at, now() + interval '21 days')
     where s.token = _token;
    return _token;
  end if;
  _token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.client_chat_sessions (client_id, token, question_ids, created_by) values (_client, _token, _ids_ok, auth.uid());
  return _token;
end $$;
revoke all on function public.client_chat_open(uuid, uuid[]) from public, anon;
grant execute on function public.client_chat_open(uuid, uuid[]) to authenticated;

-- 6) Resposta do cliente vinda do chat (só a função client-chat, com a chave de serviço).
--    Avisa a equipe uma vez por conversa: o aviso não lido é atualizado em vez de repetir.
create or replace function public.client_chat_save_answer(_session uuid, _qid uuid, _answer text, _attachments jsonb, _audio_pending boolean)
returns void language plpgsql security definer set search_path to '' as $$
declare _s public.client_chat_sessions; _name text; _done int; _total int; _body text; _link text; _ntf uuid;
begin
  select * into _s from public.client_chat_sessions where id = _session;
  if not found or not (_qid = any(_s.question_ids)) then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  update public.client_questions set
    answer = nullif(left(trim(coalesce(_answer, '')), 4000), ''),
    attachments = coalesce(attachments, '[]'::jsonb) || coalesce(_attachments, '[]'::jsonb),
    audio_pending = coalesce(_audio_pending, false),
    status = 'respondida', answered_at = now(), answered_by = null, answered_via = 'cliente', updated_at = now()
   where id = _qid and client_id = _s.client_id and status in ('enviada', 'pendente');
  if not found then return; end if;
  select trim(name) into _name from public.clients where id = _s.client_id;
  select count(*) filter (where q.status = 'respondida'), count(*) into _done, _total
    from public.client_questions q where q.id = any(_s.question_ids);
  _body := _done || ' de ' || _total || ' respondidas' || case when _audio_pending then ' · tem áudio para ouvir' else '' end;
  _link := '/estrategia/consultoria?cliente=' || _s.client_id::text || '&aba=perguntas';
  select n.id into _ntf from public.notifications n
   where n.kind = 'client_answer' and n.client_id = _s.client_id and n.read_at is null and n.created_at > now() - interval '2 days'
   order by n.created_at desc limit 1;
  if _ntf is not null then
    update public.notifications set body = _body, title = left(_name || ' respondeu as perguntas', 200), link = _link, created_at = now()
     where kind = 'client_answer' and client_id = _s.client_id and read_at is null and created_at > now() - interval '2 days';
  else
    perform public.notify(
      array(select r.user_id from public.user_roles r join public.profiles p on p.id = r.user_id where r.role in ('admin', 'head_marketing') and p.is_active),
      'client_answer', _name || ' respondeu as perguntas', _body, _link, _s.client_id);
  end if;
end $$;
revoke all on function public.client_chat_save_answer(uuid, uuid, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.client_chat_save_answer(uuid, uuid, text, jsonb, boolean) to service_role;

-- 7) NPS e avaliação vindos do chat: vão para crm_nps (mesma tabela do NPS por WhatsApp) e para a ficha (clients.nps).
create or replace function public.client_chat_save_nps(_session uuid, _score integer, _comment text)
returns void language plpgsql security definer set search_path to '' as $$
declare _s public.client_chat_sessions; _phone text; _name text;
begin
  select * into _s from public.client_chat_sessions where id = _session;
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  if _score is not null then
    if _score < 0 or _score > 10 then raise exception 'Nota de 0 a 10' using errcode = 'PF006'; end if;
    update public.client_chat_sessions set nps_score = _score where id = _session;
    update public.clients set nps = _score where id = _s.client_id;
    if _score <= 6 then
      select trim(name) into _name from public.clients where id = _s.client_id;
      perform public.notify(public.commercial_team_profiles() || public.client_staff_profiles(_s.client_id, array['head_marketing']),
        'crm_nps_detractor', 'Nota baixa no NPS: ' || _score || ' de ' || _name, 'Respondeu na conversa de perguntas. Ligue para entender o motivo.',
        '/estrategia/consultoria?cliente=' || _s.client_id::text || '&aba=perguntas', _s.client_id);
    end if;
  end if;
  if _comment is not null then
    update public.client_chat_sessions set evaluation = left(trim(_comment), 2000) where id = _session;
  end if;
  select coalesce(nullif(phone, ''), 'conversa') into _phone from public.clients where id = _s.client_id;
  -- Uma linha por conversa (comentário nunca nulo, para a leitura do WhatsApp não confundir a próxima mensagem com o comentário).
  if exists (select 1 from public.crm_nps where client_id = _s.client_id and phone_key = 'chat:' || _session::text) then
    update public.crm_nps set
      score = coalesce(_score, score),
      comment = coalesce(left(trim(_comment), 2000), comment),
      commented_at = case when _comment is not null then now() else commented_at end
     where client_id = _s.client_id and phone_key = 'chat:' || _session::text;
  elsif _score is not null then
    insert into public.crm_nps (client_id, phone, phone_key, status, score, comment, requested_at, answered_at, commented_at)
    values (_s.client_id, _phone, 'chat:' || _session::text, 'answered', _score, coalesce(left(trim(_comment), 2000), ''), _s.created_at, now(),
            case when _comment is not null then now() end);
  end if;
end $$;
revoke all on function public.client_chat_save_nps(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.client_chat_save_nps(uuid, integer, text) to service_role;

-- 8) Retroalimentação geral: respostas do cliente por área (null = todas). As de Consultoria valem para todas as áreas.
create or replace function public.client_answers_context(_client uuid, _area text)
returns jsonb language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'area', q.area, 'pergunta', q.question, 'resposta', coalesce(q.answer, case when q.audio_pending then '(respondeu por áudio; a equipe ainda vai ouvir)' end),
      'quando', q.answered_at::date, 'por', coalesce(q.answered_via, 'equipe'),
      'anexos', jsonb_array_length(coalesce(q.attachments, '[]'::jsonb))) order by q.answered_at), '[]'::jsonb)
  from public.client_questions q
  where q.client_id = _client and q.status = 'respondida'
    and (_area is null or q.area = _area or q.area = 'consultoria')
$$;
revoke all on function public.client_answers_context(uuid, text) from public, anon, authenticated;
grant execute on function public.client_answers_context(uuid, text) to service_role;

-- 9) Resposta pelo portal: o aviso abre a aba Perguntas do cliente.
create or replace function public.portal_question_answer(_token text, _id uuid, _answer text)
returns void language plpgsql security definer set search_path to '' as $$
declare _client uuid := public.portal_resolve(_token);
begin
  if nullif(trim(coalesce(_answer, '')), '') is null then raise exception 'Escreva a resposta' using errcode = 'PF006'; end if;
  update public.client_questions set answer = left(trim(_answer), 4000), status = 'respondida', answered_at = now(), answered_via = 'cliente', updated_at = now()
   where id = _id and client_id = _client and status = 'enviada';
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  perform public.notify(
    array(select r.user_id from public.user_roles r join public.profiles p on p.id = r.user_id where r.role in ('admin', 'head_marketing') and p.is_active),
    'client_answer', (select trim(name) from public.clients where id = _client) || ' respondeu as perguntas', 'Respondeu no portal.',
    '/estrategia/consultoria?cliente=' || _client::text || '&aba=perguntas', _client);
end $$;

-- Links antigos gravados nos avisos (aba=do_cliente) passam a abrir a aba Perguntas.
update public.notifications set link = replace(link, '&aba=do_cliente', '&aba=perguntas')
 where kind = 'client_answer' and link like '%&aba=do_cliente%';
update public.notification_rules set name = 'Cliente respondeu as perguntas', description = 'Resposta do cliente às perguntas da Consultoria (conversa ou portal).'
 where kind = 'client_answer';

-- 10) Disparo da geração (cron de segunda e o botão quando chamado pelo banco).
create or replace function public.client_questions_kick()
returns void language plpgsql security definer set search_path to '' as $$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/client-questions',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'traffic_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 5000);
end $$;
revoke all on function public.client_questions_kick() from public, anon, authenticated;

-- Segunda, 08:17 (Recife) = 11:17 UTC. Só gera; nada vai para o cliente.
do $$ begin
  if exists (select 1 from cron.job where jobname = 'client-questions-weekly') then
    perform cron.alter_job((select jobid from cron.job where jobname = 'client-questions-weekly'), schedule := '17 11 * * 1');
  else
    perform cron.schedule('client-questions-weekly', '17 11 * * 1',
      $c$ select public.client_questions_kick() where coalesce((select questions_enabled from public.consult_settings where id), true)
            and public.ai_month_spend() < (select monthly_cap_usd from public.ai_settings where id) $c$);
  end if;
end $$;

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job, flag_table, flag_column)
values ('est_perguntas', 'estrategia', 3, 'Perguntas da semana ao cliente',
  'Toda segunda a IA lê o que o sistema sabe de cada cliente com Consultoria e prepara até 4 perguntas que mudam a estratégia. Na última semana do mês, as perguntas são sobre o mês seguinte (datas, ideias, sugestões).',
  'Só prepara: a equipe revisa em Estratégia → Consultoria → Perguntas e toca em "Enviar ao cliente", que abre o WhatsApp da pessoa com o link da conversa. Nada é enviado sozinho. Para quando o gasto do mês com IA chega ao limite.',
  'Segunda, 08:17', true, 'baixo', 'client-questions-weekly', 'consult_settings', 'questions_enabled')
on conflict (key) do update set what = excluded.what, how = excluded.how, schedule = excluded.schedule, cron_job = excluded.cron_job,
  flag_table = excluded.flag_table, flag_column = excluded.flag_column, title = excluded.title;

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk)
values ('est_conversa', 'estrategia', 4, 'Conversa de perguntas com o cliente',
  'Quando o cliente abre o link, uma IA barata conduz a conversa: uma pergunta por vez, com botões, texto, áudio, foto ou documento, e no fim pede a nota (NPS) e uma avaliação curta.',
  'Só responde dentro do link que a equipe enviou. Cada resposta é salva na hora e avisa a equipe. A IA só vê os dados daquele cliente.',
  'Quando o cliente responde', true, 'baixo')
on conflict (key) do update set what = excluded.what, how = excluded.how, schedule = excluded.schedule, title = excluded.title;

-- 11) Lista da Consultoria: respostas novas do cliente (últimos 7 dias), para a Bete e o Início avisarem sem alarde.
create or replace function public.consult_list() returns jsonb
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'client_id', c.id, 'name', c.name, 'logo_path', c.logo_path, 'segment', c.segment,
      'document', c.document, 'instagram', c.instagram, 'website', c.website,
      'status', coalesce(d.status, case when cardinality(public.consult_missing(c.id)) > 0 then 'falta_dados' else 'na_fila' end),
      'stage', d.stage, 'redo_section', d.redo_section, 'error', d.error,
      'updated_at', coalesce(d.updated_at, c.updated_at), 'finished_at', d.finished_at,
      'suggestions', (select count(*) from public.client_ai_suggestions s where s.client_id = c.id and s.status = 'pendente'),
      'can_generate', public.ai_generation_allowed(c.id, 'consultoria'),
      'direction', (select d2.body from public.client_directions d2 where d2.client_id = c.id and d2.area = 'consultoria' and d2.month is null),
      'questions_open', (select count(*) from public.client_questions q where q.client_id = c.id and q.area = 'consultoria' and q.status in ('pendente', 'enviada')),
      'questions_answered', (select count(*) from public.client_questions q where q.client_id = c.id and q.area = 'consultoria' and q.status = 'respondida'),
      'answers_new', (select count(*) from public.client_questions q where q.client_id = c.id and q.status = 'respondida' and q.answered_via = 'cliente' and q.answered_at > now() - interval '7 days'),
      'answers_last', (select max(q.answered_at) from public.client_questions q where q.client_id = c.id and q.status = 'respondida' and q.answered_via = 'cliente'),
      'share_token', d.share_token
    ) order by c.name)
    from public.clients c left join public.consult_docs d on d.client_id = c.id
    where public.consult_has_service(c.id)
  ), '[]'::jsonb);
end $$;
