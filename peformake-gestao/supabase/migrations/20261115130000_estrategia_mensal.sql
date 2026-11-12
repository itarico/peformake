-- Estratégia → Consultoria → Estratégia do mês (ESTUDO-ESTRATEGIA-AREAS.md, seções 17 a 19).
-- Uma estratégia por cliente com Consultoria e por mês, gerada pela IA (função monthly-strategy) a partir de tudo que o sistema sabe.
-- Já traz as 4 semanas com ações executáveis (o quê, onde, quem, até quando, o número que prova). Aprovar uma ação = mandar para a produção
-- (Social/Design → content_items com briefing; Audiovisual → av_projects com roteiro; Tráfego/Vendas → traffic_tasks).
-- Toda segunda, um ajuste barato (modelo pequeno) lê a semana anterior e sugere trocas na semana (só se mudou algo).
-- Nada é enviado ao cliente. Só create or replace / if not exists.

alter table public.consult_settings add column if not exists monthly_enabled boolean not null default true;
alter table public.consult_settings add column if not exists adjust_enabled boolean not null default true;

create table if not exists public.monthly_strategies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  status text not null default 'na_fila' check (status in ('na_fila', 'gerando', 'pronto', 'aprovado', 'erro', 'limite')),
  stage text not null default 'base' check (stage in ('base', 'acoes', 'done')),
  attempts integer not null default 0,
  auto_retries integer not null default 0,
  busy_until timestamptz,
  doc jsonb not null default '{}'::jsonb,
  partial jsonb not null default '{}'::jsonb,
  ideas text,
  error text,
  cost_usd numeric(10,4) not null default 0,
  adjust jsonb,
  adjusted_at timestamptz,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  created_by uuid,
  updated_at timestamptz not null default now(),
  unique (client_id, month)
);
alter table public.monthly_strategies enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'monthly_strategies' and policyname = 'monthly_strategies_read') then
    create policy monthly_strategies_read on public.monthly_strategies for select to authenticated using (public.consult_can());
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'monthly_strategies_touch') then
    create trigger monthly_strategies_touch before update on public.monthly_strategies for each row execute function public.consult_touch();
  end if;
end $$;

create table if not exists public.monthly_strategy_actions (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.monthly_strategies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  week integer not null check (week between 1 and 4),
  area text not null check (area in ('trafego', 'social', 'design', 'audiovisual', 'vendas', 'atendimento')),
  title text not null check (length(trim(title)) between 3 and 200),
  what text not null default '' check (length(what) <= 12000),
  place text,
  owner_role text,
  due_date date,
  proof text,
  why text,
  format text,
  position integer not null default 0,
  status text not null default 'proposta' check (status in ('proposta', 'aprovada', 'recusada')),
  routed_table text,
  routed_id uuid,
  routed_link text,
  suggestion jsonb,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists monthly_strategy_actions_strategy on public.monthly_strategy_actions (strategy_id, week, position);
alter table public.monthly_strategy_actions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'monthly_strategy_actions' and policyname = 'monthly_strategy_actions_read') then
    create policy monthly_strategy_actions_read on public.monthly_strategy_actions for select to authenticated using (public.consult_can());
  end if;
end $$;

-- Avisos novos (central de avisos em Configurações).
insert into public.notification_rules (kind, category, name, description, audience, in_app, whatsapp_client, position, email) values
  ('monthly_ready', 'clientes', 'Estratégia do mês pronta', 'A IA terminou a estratégia do mês de um cliente com Consultoria (4 semanas de ações para revisar).', 'equipe', true, false, 91, false),
  ('strategy_audiovisual', 'conteudo', 'Roteiro vindo da estratégia', 'O videomaker recebe o roteiro aprovado na estratégia do mês (entra no quadro quando a gravação for agendada).', 'equipe', true, false, 8, false),
  ('strategy_traffic', 'conteudo', 'Tarefa de tráfego vinda da estratégia', 'O gestor de tráfego recebe a ação aprovada na estratégia do mês.', 'equipe', true, false, 9, false)
on conflict (kind) do nothing;

-- ───────── Fila e trabalhador ─────────
/** Chama a função monthly-strategy (cron a cada 2 min, encadeamento entre etapas e o ajuste de segunda). */
create or replace function public.monthly_kick(_mode text default null) returns void
language plpgsql security definer set search_path to '' as $$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/monthly-strategy',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'traffic_cron_secret')),
    body := case when _mode is null then '{}'::jsonb else jsonb_build_object('mode', _mode) end, timeout_milliseconds := 5000);
end $$;
revoke all on function public.monthly_kick(text) from public, anon, authenticated;

/** Põe (ou repõe) a estratégia do mês na fila. Ações já aprovadas ficam; as propostas são refeitas. */
create or replace function public.monthly_queue(_client uuid, _month date, _ideas text, _by uuid) returns text
language plpgsql security definer set search_path to '' as $$
declare _m date := date_trunc('month', _month)::date; _out text;
begin
  if not public.consult_has_service(_client) then return null; end if;
  insert into public.monthly_strategies (client_id, month, status, stage, ideas, created_by, queued_at)
  values (_client, _m, 'na_fila', 'base', nullif(trim(coalesce(_ideas, '')), ''), _by, now())
  on conflict (client_id, month) do update set
    status = 'na_fila', stage = 'base', attempts = 0, auto_retries = 0, busy_until = null, error = null, partial = '{}'::jsonb,
    ideas = coalesce(nullif(trim(coalesce(_ideas, '')), ''), public.monthly_strategies.ideas), queued_at = now()
  where public.monthly_strategies.status <> 'gerando'
  returning status into _out;
  return coalesce(_out, (select status from public.monthly_strategies where client_id = _client and month = _m));
end $$;
revoke all on function public.monthly_queue(uuid, date, text, uuid) from public, anon, authenticated;

/** Botão "Gerar agora" / "Refazer com as ideias do cliente" (admin e head de marketing). */
create or replace function public.monthly_request(_client uuid, _month date, _ideas text default null) returns text
language plpgsql security definer set search_path to '' as $$
declare _s text;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if not public.consult_has_service(_client) then raise exception 'Cliente sem Consultoria ativa' using errcode = 'PF006'; end if;
  if _month < date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date - interval '1 month' then
    raise exception 'Mês já passou' using errcode = 'PF006';
  end if;
  _s := public.monthly_queue(_client, _month, _ideas, (select auth.uid()));
  if _s = 'gerando' then raise exception 'Já está gerando' using errcode = 'PF012'; end if;
  return _s;
end $$;
revoke all on function public.monthly_request(uuid, date, text) from public, anon;
grant execute on function public.monthly_request(uuid, date, text) to authenticated;

/** Pega UMA etapa de UMA estratégia (no máximo 2 gerando ao mesmo tempo). Erro temporário volta sozinho (até 2 vezes, 15 min depois). */
create or replace function public.monthly_claim() returns public.monthly_strategies
language plpgsql security definer set search_path to '' as $$
declare _row public.monthly_strategies; _cap numeric;
begin
  update public.monthly_strategies set status = 'gerando', attempts = 0, busy_until = null,
         auto_retries = auto_retries + 1, error = 'Tentando de novo sozinho depois de uma falha.'
   where status = 'erro' and auto_retries < 2 and coalesce(error, '') not like 'A IA recusou%'
     and updated_at < now() - interval '15 minutes';
  select * into _row from public.monthly_strategies
   where status = 'gerando' and (busy_until is null or busy_until < now())
   order by queued_at limit 1 for update skip locked;
  if not found then
    if (select count(*) from public.monthly_strategies where status = 'gerando') >= 2 then return null; end if;
    select monthly_cap_usd into _cap from public.ai_settings where id;
    if public.ai_month_spend() >= coalesce(_cap, 90) then
      update public.monthly_strategies set status = 'limite' where status = 'na_fila';
      return null;
    end if;
    select * into _row from public.monthly_strategies d
     where d.status in ('na_fila', 'limite') and public.ai_generation_allowed(d.client_id, 'estrategia_mensal')
     order by d.queued_at limit 1 for update skip locked;
    if not found then return null; end if;
    insert into public.ai_generations (client_id, area, kind, created_by) values (_row.client_id, 'estrategia_mensal', 'completa', _row.created_by);
    _row.status := 'gerando'; _row.attempts := 0; _row.auto_retries := 0;
    _row.started_at := now();
  end if;
  _row.attempts := _row.attempts + 1;
  if _row.attempts > 3 then
    update public.monthly_strategies set status = 'erro', busy_until = null,
      error = coalesce(nullif(error, 'Tentando de novo sozinho depois de uma falha.'), 'A etapa não terminou depois de 3 tentativas.') where id = _row.id;
    return null;
  end if;
  update public.monthly_strategies set status = _row.status, attempts = _row.attempts, auto_retries = _row.auto_retries,
    started_at = _row.started_at, busy_until = now() + interval '170 seconds' where id = _row.id;
  _row.busy_until := now() + interval '170 seconds';
  return _row;
end $$;
revoke all on function public.monthly_claim() from public, anon, authenticated;

/** Lote de madrugada (dia 26): põe na fila a estratégia do mês seguinte de cada cliente com Consultoria que ainda não tem. */
create or replace function public.monthly_queue_next() returns integer
language plpgsql security definer set search_path to '' as $$
declare _m date := (date_trunc('month', (now() at time zone 'America/Sao_Paulo')) + interval '1 month')::date; _n integer := 0; _c uuid;
begin
  for _c in select c.id from public.clients c where public.consult_has_service(c.id)
    and not exists (select 1 from public.monthly_strategies s where s.client_id = c.id and s.month = _m) loop
    perform public.monthly_queue(_c, _m, null, null); _n := _n + 1;
  end loop;
  return _n;
end $$;
revoke all on function public.monthly_queue_next() from public, anon, authenticated;

-- ───────── Tela ─────────
/** A estratégia do mês de um cliente com as ações e a situação de cada uma na produção. */
create or replace function public.monthly_get(_client uuid, _month date) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare _s public.monthly_strategies;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select * into _s from public.monthly_strategies where client_id = _client and month = date_trunc('month', _month)::date;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', _s.id, 'client_id', _s.client_id, 'month', _s.month, 'status', _s.status, 'stage', _s.stage, 'error', _s.error,
    'doc', _s.doc, 'ideas', _s.ideas, 'cost_usd', _s.cost_usd, 'adjust', _s.adjust, 'adjusted_at', _s.adjusted_at,
    'finished_at', _s.finished_at, 'approved_at', _s.approved_at, 'updated_at', _s.updated_at,
    'actions', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'week', a.week, 'area', a.area, 'title', a.title, 'what', a.what, 'place', a.place, 'owner_role', a.owner_role,
      'due_date', a.due_date, 'proof', a.proof, 'why', a.why, 'format', a.format, 'status', a.status,
      'routed_table', a.routed_table, 'routed_id', a.routed_id, 'routed_link', a.routed_link, 'suggestion', a.suggestion,
      'done', case a.routed_table
        when 'content_items' then (select ci.status in ('approved', 'published') from public.content_items ci where ci.id = a.routed_id)
        when 'av_projects' then (select p.status in ('approved', 'delivered') from public.av_projects p where p.id = a.routed_id)
        when 'traffic_tasks' then (select t.status = 'done' from public.traffic_tasks t where t.id = a.routed_id)
        else null end
    ) order by a.week, a.position, a.created_at) from public.monthly_strategy_actions a where a.strategy_id = _s.id), '[]'::jsonb)
  );
end $$;
revoke all on function public.monthly_get(uuid, date) from public, anon;
grant execute on function public.monthly_get(uuid, date) to authenticated;

/** Texto que vai para a produção: tudo que a pessoa precisa para executar sem perguntar. */
create or replace function public.monthly_brief(_a public.monthly_strategy_actions) returns text
language sql immutable set search_path to '' as $$
  select left(concat_ws(E'\n\n',
    nullif(trim(_a.what), ''),
    case when nullif(trim(coalesce(_a.place, '')), '') is not null then 'Onde: ' || trim(_a.place) end,
    case when _a.due_date is not null then 'Até: ' || to_char(_a.due_date, 'DD/MM') end,
    case when nullif(trim(coalesce(_a.proof, '')), '') is not null then 'O número que prova: ' || trim(_a.proof) end,
    case when nullif(trim(coalesce(_a.why, '')), '') is not null then 'Por quê: ' || trim(_a.why) end,
    'Veio da estratégia do mês (Consultoria), semana ' || _a.week || '.'), 8000)
$$;

/**
 * Aprovar = mandar para a produção (o mesmo caminho de strategy_item_decide):
 *   social → peça com briefing (status briefing) · design → peça pronta para o designer (status ready)
 *   audiovisual → projeto com roteiro (sem data: entra no quadro quando a gravação for agendada)
 *   trafego → tarefa de tráfego · vendas/atendimento → tarefa de atendimento.
 * Devolve o link do item criado.
 */
create or replace function public.monthly_action_decide(_id uuid, _approve boolean) returns text
language plpgsql security definer set search_path to '' as $$
declare _a public.monthly_strategy_actions; _s public.monthly_strategies; _plan uuid; _ref uuid; _table text; _link text; _kind text; _brief text; _cname text;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select * into _a from public.monthly_strategy_actions where id = _id for update;
  if not found then raise exception 'Não encontrado' using errcode = 'PF004'; end if;
  if _a.status <> 'proposta' then raise exception 'Já decidido' using errcode = 'PF001'; end if;
  if not _approve then
    update public.monthly_strategy_actions set status = 'recusada', decided_by = (select auth.uid()), decided_at = now() where id = _id;
    return null;
  end if;
  select * into _s from public.monthly_strategies where id = _a.strategy_id;
  _brief := public.monthly_brief(_a);
  _cname := (select name from public.clients where id = _a.client_id);

  if _a.area in ('social', 'design') then
    insert into public.content_plans (client_id, month) values (_a.client_id, _s.month)
    on conflict (client_id, month) do update set updated_at = public.content_plans.updated_at
    returning id into _plan;
    _kind := case when _a.format in ('post', 'carrossel', 'story', 'reels', 'anuncio') then _a.format else 'post' end;
    insert into public.content_items (plan_id, client_id, number, kind, status, title, briefing, publish_date, deadline, updated_by)
    values (_plan, _a.client_id, coalesce((select max(number) from public.content_items where plan_id = _plan), 0) + 1, _kind,
      case when _a.area = 'design' then 'ready' else 'briefing' end, left(_a.title, 200), _brief,
      case when _a.area = 'social' then _a.due_date end, _a.due_date, (select auth.uid()))
    returning id into _ref;
    _table := 'content_items'; _link := '/conteudo/peca/' || _ref;
    perform public.notify(public.client_staff_profiles(_a.client_id, array[case when _a.area = 'design' then 'designer' else 'social_media' end]),
      'strategy_' || _a.area, case when _a.area = 'design' then 'Arte da estratégia para produzir: ' else 'Pauta da estratégia: ' end || left(_a.title, 120),
      _cname, _link, _a.client_id);
  elsif _a.area = 'audiovisual' then
    insert into public.av_projects (client_id, kind, month, title, briefing, script, status, due_date, updated_by)
    values (_a.client_id, 'project', _s.month, left(_a.title, 200),
      left(concat_ws(E'\n\n', case when nullif(trim(coalesce(_a.proof, '')), '') is not null then 'O número que prova: ' || trim(_a.proof) end,
        case when nullif(trim(coalesce(_a.why, '')), '') is not null then 'Por quê: ' || trim(_a.why) end, 'Veio da estratégia do mês (Consultoria), semana ' || _a.week || '.'), 8000),
      left(_a.what, 20000), 'script', _a.due_date, (select auth.uid()))
    returning id into _ref;
    _table := 'av_projects'; _link := '/audiovisual/projeto/' || _ref;
    perform public.notify(public.client_staff_profiles(_a.client_id, array['videomaker']), 'strategy_audiovisual',
      'Roteiro da estratégia: ' || left(_a.title, 120), _cname || ' · agende a gravação para entrar no quadro', _link, _a.client_id);
  else
    insert into public.traffic_tasks (title, description, priority, category, source, client_id, status, position, due_date, created_by, updated_by, dedupe_key)
    values (left(_a.title, 200), left(_brief, 4000), 'normal',
      case when _a.area = 'trafego' then (case when _a.format = 'anuncio' then 'criativo' else 'campanha' end) else 'atendimento' end,
      'strategist', _a.client_id, 'todo', 0, _a.due_date, (select auth.uid()), (select auth.uid()), 'monthly:' || _a.id)
    returning id into _ref;
    _table := 'traffic_tasks'; _link := '/trafego/tarefas?tarefa=' || _ref;
    perform public.notify(public.client_staff_profiles(_a.client_id, array[case when _a.area = 'trafego' then 'traffic_manager' else 'head_marketing' end]),
      'strategy_traffic', 'Ação da estratégia: ' || left(_a.title, 120), _cname, _link, _a.client_id);
  end if;

  update public.monthly_strategy_actions set status = 'aprovada', routed_table = _table, routed_id = _ref, routed_link = _link,
    decided_by = (select auth.uid()), decided_at = now() where id = _id;
  if _s.status = 'pronto' then update public.monthly_strategies set status = 'aprovado', approved_at = now(), approved_by = (select auth.uid()) where id = _s.id; end if;
  return _link;
end $$;
revoke all on function public.monthly_action_decide(uuid, boolean) from public, anon;
grant execute on function public.monthly_action_decide(uuid, boolean) to authenticated;

/** "Aprovar a semana": manda todas as ações propostas da semana para a produção. */
create or replace function public.monthly_approve_week(_strategy uuid, _week integer) returns integer
language plpgsql security definer set search_path to '' as $$
declare _id uuid; _n integer := 0;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  for _id in select id from public.monthly_strategy_actions where strategy_id = _strategy and week = _week and status = 'proposta' order by position loop
    perform public.monthly_action_decide(_id, true); _n := _n + 1;
  end loop;
  return _n;
end $$;
revoke all on function public.monthly_approve_week(uuid, integer) from public, anon;
grant execute on function public.monthly_approve_week(uuid, integer) to authenticated;

/** Editar uma ação antes (ou depois) de aprovar. Depois de aprovada, a mudança vai junto para o item da produção. */
create or replace function public.monthly_action_edit(_id uuid, _title text, _what text, _due date, _proof text) returns void
language plpgsql security definer set search_path to '' as $$
declare _a public.monthly_strategy_actions;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if length(trim(coalesce(_title, ''))) < 3 then raise exception 'Título curto' using errcode = 'PF006'; end if;
  update public.monthly_strategy_actions set title = left(trim(_title), 200), what = left(coalesce(_what, ''), 12000), due_date = _due,
    proof = nullif(trim(coalesce(_proof, '')), '') where id = _id returning * into _a;
  if not found then raise exception 'Não encontrado' using errcode = 'PF004'; end if;
  if _a.routed_table = 'content_items' then
    update public.content_items set title = left(_a.title, 200), briefing = public.monthly_brief(_a), deadline = coalesce(_a.due_date, deadline) where id = _a.routed_id;
  elsif _a.routed_table = 'av_projects' then
    update public.av_projects set title = left(_a.title, 200), script = left(_a.what, 20000), due_date = coalesce(_a.due_date, due_date) where id = _a.routed_id;
  elsif _a.routed_table = 'traffic_tasks' then
    update public.traffic_tasks set title = left(_a.title, 200), description = left(public.monthly_brief(_a), 4000), due_date = coalesce(_a.due_date, due_date) where id = _a.routed_id;
  end if;
end $$;
revoke all on function public.monthly_action_edit(uuid, text, text, date, text) from public, anon;
grant execute on function public.monthly_action_edit(uuid, text, text, date, text) to authenticated;

/** Ajuste de segunda: aplicar (troca o texto da ação e do item na produção) ou ignorar a sugestão. */
create or replace function public.monthly_adjust_decide(_id uuid, _accept boolean) returns void
language plpgsql security definer set search_path to '' as $$
declare _a public.monthly_strategy_actions; _g jsonb;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select * into _a from public.monthly_strategy_actions where id = _id for update;
  if not found or _a.suggestion is null then raise exception 'Sem sugestão' using errcode = 'PF004'; end if;
  _g := _a.suggestion;
  update public.monthly_strategy_actions set suggestion = null where id = _id;
  if _accept then
    perform public.monthly_action_edit(_id, coalesce(nullif(_g->>'titulo', ''), _a.title),
      coalesce(nullif(_g->>'o_que', ''), _a.what) || case when nullif(_g->>'porque', '') is not null then E'\n\nAjuste de segunda: ' || (_g->>'porque') else '' end,
      _a.due_date, _a.proof);
  end if;
end $$;
revoke all on function public.monthly_adjust_decide(uuid, boolean) from public, anon;
grant execute on function public.monthly_adjust_decide(uuid, boolean) to authenticated;

-- Lista da Consultoria: a estratégia do mês mais recente de cada cliente (para a lista, a Bete e o Início).
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
      'share_token', d.share_token,
      'monthly', (select jsonb_build_object('month', m.month, 'status', m.status, 'finished_at', m.finished_at,
          'pending', (select count(*) from public.monthly_strategy_actions a where a.strategy_id = m.id and a.status = 'proposta'),
          'suggestions', (select count(*) from public.monthly_strategy_actions a where a.strategy_id = m.id and a.suggestion is not null))
        from public.monthly_strategies m where m.client_id = c.id order by m.month desc limit 1)
    ) order by c.name)
    from public.clients c left join public.consult_docs d on d.client_id = c.id
    where public.consult_has_service(c.id)
  ), '[]'::jsonb);
end $$;

-- ───────── Automações (central em Configurações → Automações) ─────────
do $$ begin
  if exists (select 1 from cron.job where jobname = 'monthly-strategy') then perform cron.unschedule('monthly-strategy'); end if;
  perform cron.schedule('monthly-strategy', '*/2 * * * *', $c$
    select public.monthly_kick()
    where exists (select 1 from public.monthly_strategies where status = 'gerando')
       or exists (select 1 from public.monthly_strategies where status = 'na_fila')
       or (exists (select 1 from public.monthly_strategies where status = 'limite')
           and public.ai_month_spend() < (select monthly_cap_usd from public.ai_settings where id)) $c$);
  if exists (select 1 from cron.job where jobname = 'monthly-strategy-batch') then perform cron.unschedule('monthly-strategy-batch'); end if;
  -- Dia 26, 03:23 (Recife) = 06:23 UTC: depois das perguntas da última semana sobre o mês seguinte.
  perform cron.schedule('monthly-strategy-batch', '23 6 26 * *', $c$
    select public.monthly_queue_next() where coalesce((select monthly_enabled from public.consult_settings where id), true) $c$);
  if exists (select 1 from cron.job where jobname = 'monthly-strategy-adjust') then perform cron.unschedule('monthly-strategy-adjust'); end if;
  -- Segunda, 08:41 (Recife) = 11:41 UTC, depois das perguntas da semana.
  perform cron.schedule('monthly-strategy-adjust', '41 11 * * 1', $c$
    select public.monthly_kick('ajuste') where coalesce((select adjust_enabled from public.consult_settings where id), true)
      and public.ai_month_spend() < (select monthly_cap_usd from public.ai_settings where id) $c$);
end $$;

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job, flag_table, flag_column)
values ('est_mensal', 'estrategia', 5, 'Estratégia do mês',
  'No dia 26, de madrugada, a IA lê tudo de cada cliente com Consultoria (diagnóstico, respostas do cliente, direcionamento, tráfego, conteúdo, audiovisual, datas) e escreve a estratégia do mês seguinte com as 4 semanas de ações.',
  'Só prepara: a equipe revisa em Estratégia → Consultoria → Estratégia e aprova ação por ação (ou a semana toda); cada aprovada vai para a fila da área. Nada é enviado ao cliente. Para quando o gasto do mês com IA chega ao limite. Custo perto de US$ 1,50 por cliente.',
  'Dia 26, 03:23 (confere a fila a cada 2 minutos)', true, 'baixo', 'monthly-strategy-batch', 'consult_settings', 'monthly_enabled'),
 ('est_ajuste_segunda', 'estrategia', 6, 'Ajuste de segunda na estratégia',
  'Toda segunda uma IA barata compara a semana que passou (anúncios, o que foi feito, respostas do cliente) com o plano e sugere trocas nas ações da semana, só se algo mudou.',
  'Só sugere: a troca aparece na semana com "Aplicar" ou "Ignorar". Custa menos de 1 centavo de dólar por cliente.',
  'Segunda, 08:41', true, 'baixo', 'monthly-strategy-adjust', 'consult_settings', 'adjust_enabled')
on conflict (key) do update set title = excluded.title, what = excluded.what, how = excluded.how, schedule = excluded.schedule,
  uses_ai = excluded.uses_ai, cron_job = excluded.cron_job, flag_table = excluded.flag_table, flag_column = excluded.flag_column, position = excluded.position;
