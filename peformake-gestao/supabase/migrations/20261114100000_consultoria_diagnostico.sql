-- Estratégia → Consultoria (Fase 1): diagnóstico + plano de ação gerados pela IA para quem tem o serviço Consultoria ativo.
-- A equipe só informa o obrigatório (CPF/CNPJ; Instagram/site se souber). O resto a IA busca (função consult-diagnosis).
-- Os 47 frameworks viram a receita interna da IA: ninguém preenche framework à mão.
-- Guarda de gasto: cada chamada de IA vai para ai_usage_log (US$ estimado) e há um teto por mês (ai_settings, padrão US$ 90).

-- ───────── Gasto com IA ─────────
create table if not exists public.ai_settings (
  id boolean primary key default true check (id),
  monthly_cap_usd numeric(10,2) not null default 90,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.ai_settings (id) values (true) on conflict do nothing;
alter table public.ai_settings enable row level security;
drop policy if exists ai_settings_read on public.ai_settings;
create policy ai_settings_read on public.ai_settings for select to authenticated using (public.has_role('admin'));

create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  function text not null,
  stage text,
  client_id uuid references public.clients(id) on delete set null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  web_searches integer not null default 0,
  usd numeric(10,4) not null default 0
);
create index if not exists ai_usage_log_created on public.ai_usage_log (created_at desc);
alter table public.ai_usage_log enable row level security;
drop policy if exists ai_usage_log_read on public.ai_usage_log;
create policy ai_usage_log_read on public.ai_usage_log for select to authenticated using (public.has_role('admin'));

/** Gasto estimado do mês (horário de Brasília), em US$. */
create or replace function public.ai_month_spend() returns numeric
language sql stable security definer set search_path to '' as $$
  select coalesce(sum(usd), 0) from public.ai_usage_log
  where created_at >= (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
$$;
revoke all on function public.ai_month_spend() from public, anon, authenticated;

/** Resumo do gasto com IA do mês, só para administradores (Configurações → Automações). */
create or replace function public.ai_spend_overview() returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare _from timestamptz := (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
begin
  if not public.has_role('admin') then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return jsonb_build_object(
    'spent', public.ai_month_spend(),
    'cap', (select monthly_cap_usd from public.ai_settings where id),
    'calls', (select count(*) from public.ai_usage_log where created_at >= _from),
    'by_function', coalesce((select jsonb_agg(jsonb_build_object('function', f, 'usd', u, 'calls', n) order by u desc)
      from (select function f, sum(usd) u, count(*) n from public.ai_usage_log where created_at >= _from group by function) x), '[]'::jsonb)
  );
end $$;
grant execute on function public.ai_spend_overview() to authenticated;

create or replace function public.ai_cap_set(_usd numeric) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Só administradores mudam o limite' using errcode = '42501'; end if;
  if _usd is null or _usd < 0 or _usd > 2000 then raise exception 'Valor fora do formato' using errcode = 'PF006'; end if;
  update public.ai_settings set monthly_cap_usd = round(_usd, 2), updated_at = now(), updated_by = auth.uid() where id;
end $$;
grant execute on function public.ai_cap_set(numeric) to authenticated;

-- ───────── Base reutilizável por área (consultoria agora; tráfego, social e audiovisual depois) ─────────

-- Direcionamento da equipe por cliente e área (texto livre, pode vir de áudio transcrito). Entra no contexto da IA com prioridade.
-- month nulo = vale sempre (consultoria); com mês = direcionamento daquele mês. O tráfego ainda guarda o dele em
-- client_monthly_plans.direction (até o dia 14); client_direction_context junta os dois para não duplicar nem quebrar o tráfego.
create table if not exists public.client_directions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  area text not null check (area in ('consultoria', 'trafego', 'social', 'audiovisual')),
  month date,
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create unique index if not exists client_directions_key on public.client_directions (client_id, area, coalesce(month, '1900-01-01'::date));
alter table public.client_directions enable row level security;
drop policy if exists client_directions_read on public.client_directions;
create policy client_directions_read on public.client_directions for select to authenticated using (public.is_team());

create or replace function public.client_direction_save(_client uuid, _area text, _month date, _body text) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not (public.has_role('admin') or public.has_role('head_marketing')) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _area not in ('consultoria', 'trafego', 'social', 'audiovisual') then raise exception 'Formato invalido' using errcode = 'PF006'; end if;
  insert into public.client_directions (client_id, area, month, body, updated_at, updated_by)
  values (_client, _area, case when _month is null then null else date_trunc('month', _month)::date end, left(coalesce(_body, ''), 8000), now(), auth.uid())
  on conflict (client_id, area, coalesce(month, '1900-01-01'::date))
  do update set body = excluded.body, updated_at = now(), updated_by = auth.uid();
end $$;
grant execute on function public.client_direction_save(uuid, text, date, text) to authenticated;

/** Direcionamentos que a IA lê primeiro: o da área pedida e o do tráfego mais recente (client_monthly_plans). */
create or replace function public.client_direction_context(_client uuid, _area text) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'area', coalesce((select jsonb_agg(jsonb_build_object('month', d.month, 'text', d.body, 'updated_at', d.updated_at) order by d.month desc nulls first)
      from public.client_directions d where d.client_id = _client and d.area = _area and trim(d.body) <> ''), '[]'::jsonb),
    'outras_areas', coalesce((select jsonb_agg(jsonb_build_object('area', d.area, 'month', d.month, 'text', left(d.body, 1500)))
      from public.client_directions d where d.client_id = _client and d.area <> _area and trim(d.body) <> ''), '[]'::jsonb),
    'trafego_mes', (select jsonb_strip_nulls(jsonb_build_object('month', p.month, 'direcionamento', p.direction, 'objetivos', p.objectives,
        'produtos_prioridade', p.priority_products, 'novas_ofertas', p.new_offers, 'datas', p.important_dates, 'restricoes', p.constraints))
      from public.client_monthly_plans p where p.client_id = _client order by p.month desc limit 1)
  )
$$;
revoke all on function public.client_direction_context(uuid, text) from public, anon, authenticated;

-- Limite: no máximo 1 geração por dia por cliente e área (inclui "Refazer esta seção"; a 1ª automática conta).
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  area text not null,
  kind text not null default 'completa' check (kind in ('completa', 'secao')),
  section text,
  day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  created_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists ai_generations_day on public.ai_generations (client_id, area, day);
alter table public.ai_generations enable row level security;
drop policy if exists ai_generations_read on public.ai_generations;
create policy ai_generations_read on public.ai_generations for select to authenticated using (public.has_role('admin') or public.has_role('head_marketing'));

create or replace function public.ai_generation_allowed(_client uuid, _area text) returns boolean
language sql stable security definer set search_path to '' as $$
  select not exists (select 1 from public.ai_generations g where g.client_id = _client and g.area = _area
    and g.day = (now() at time zone 'America/Sao_Paulo')::date)
$$;
revoke all on function public.ai_generation_allowed(uuid, text) from public, anon;
grant execute on function public.ai_generation_allowed(uuid, text) to authenticated;

-- ───────── Consultoria: documento por cliente ─────────
create table if not exists public.consult_settings (
  id boolean primary key default true check (id),
  -- Nasce desligada só até o primeiro teste real; a migração seguinte (ou o admin) liga.
  auto_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.consult_settings (id) values (true) on conflict do nothing;
alter table public.consult_settings enable row level security;
drop policy if exists consult_settings_read on public.consult_settings;
create policy consult_settings_read on public.consult_settings for select to authenticated using (public.has_role('admin') or public.has_role('head_marketing'));

create table if not exists public.consult_docs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  status text not null default 'na_fila' check (status in ('falta_dados', 'na_fila', 'gerando', 'pronto', 'aprovado', 'enviado', 'erro', 'limite')),
  stage text not null default 'research' check (stage in ('research', 'diagnostico', 'plano', 'resumo', 'redo', 'done')),
  redo_section text check (redo_section in ('resumo', 'diagnostico', 'plano', 'riscos', 'do_cliente')),
  attempts integer not null default 0,
  busy_until timestamptz,
  missing text[] not null default '{}',
  receita jsonb,
  research jsonb,
  doc jsonb not null default '{}'::jsonb,
  error text,
  cost_usd numeric(10,4) not null default 0,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  sent_at timestamptz,
  sent_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.consult_docs enable row level security;
drop policy if exists consult_docs_read on public.consult_docs;
create policy consult_docs_read on public.consult_docs for select to authenticated using (public.has_role('admin') or public.has_role('head_marketing'));

create or replace function public.consult_touch() returns trigger language plpgsql set search_path to '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists consult_docs_touch on public.consult_docs;
create trigger consult_docs_touch before update on public.consult_docs for each row execute function public.consult_touch();

-- Sugestões da IA para a ficha do cliente ("sugerido pela IA"): só entram com 1 toque de admin ou head.
create table if not exists public.client_ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  field text not null check (field in ('segment', 'description', 'target_audience', 'competitors', 'value_proposition', 'acquisition_channel', 'instagram', 'website')),
  value text not null,
  current_value text,
  source text not null default 'consultoria',
  status text not null default 'pendente' check (status in ('pendente', 'aceita', 'descartada')),
  created_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);
create index if not exists client_ai_suggestions_client on public.client_ai_suggestions (client_id) where status = 'pendente';
alter table public.client_ai_suggestions enable row level security;
drop policy if exists client_ai_suggestions_read on public.client_ai_suggestions;
create policy client_ai_suggestions_read on public.client_ai_suggestions for select to authenticated using (public.has_role('admin') or public.has_role('head_marketing'));

/** Cliente ativo com o serviço Consultoria ativo. */
create or replace function public.consult_has_service(_client uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.client_services cs join public.services s on s.id = cs.service_id
    where cs.client_id = _client and cs.is_active and (s.area = 'consultoria' or lower(s.name) = 'consultoria')
  ) and exists (select 1 from public.clients c where c.id = _client and c.is_active and not coalesce(c.is_lost, false))
$$;

/** O que falta para gerar: só o CPF/CNPJ (Instagram e site a IA procura). */
create or replace function public.consult_missing(_client uuid) returns text[]
language sql stable security definer set search_path to '' as $$
  select case when length(regexp_replace(coalesce(c.document, ''), '\D', '', 'g')) in (11, 14) then '{}'::text[] else array['documento'] end
  from public.clients c where c.id = _client
$$;

/**
 * Põe o diagnóstico na fila. Sem _force, só cria (cliente novo na consultoria) ou destrava quem esperava dado/deu erro;
 * com _force, refaz o documento todo (botão "Refazer tudo").
 */
create or replace function public.consult_queue(_client uuid, _force boolean default false) returns text
language plpgsql security definer set search_path to '' as $$
declare _missing text[]; _status text; _out text;
begin
  if not public.consult_has_service(_client) then return null; end if;
  _missing := coalesce(public.consult_missing(_client), array['documento']);
  _status := case when cardinality(_missing) > 0 then 'falta_dados' else 'na_fila' end;
  insert into public.consult_docs (client_id, status, stage, missing, queued_at)
  values (_client, _status, 'research', _missing, now())
  on conflict (client_id) do update set
    status = excluded.status, stage = 'research', redo_section = null, missing = excluded.missing,
    attempts = 0, busy_until = null, error = null, queued_at = now(),
    research = case when _force then null else public.consult_docs.research end
  where _force or public.consult_docs.status in ('falta_dados', 'erro')
  returning status into _out;
  return coalesce(_out, (select status from public.consult_docs where client_id = _client));
end $$;
revoke all on function public.consult_queue(uuid, boolean) from public, anon, authenticated;

-- Consultoria ativada (cliente novo ou serviço religado): entra na fila sozinho.
create or replace function public.consult_on_service() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.is_active and (tg_op = 'INSERT' or not coalesce(old.is_active, false))
     and exists (select 1 from public.services s where s.id = new.service_id and (s.area = 'consultoria' or lower(s.name) = 'consultoria')) then
    perform public.consult_queue(new.client_id, false);
  end if;
  return new;
end $$;
drop trigger if exists consult_on_service on public.client_services;
create trigger consult_on_service after insert or update of is_active on public.client_services
  for each row execute function public.consult_on_service();

-- CPF/CNPJ preenchido depois (na ficha ou no pop-up): destrava quem estava em "Falta CNPJ".
create or replace function public.consult_on_document() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.document is distinct from old.document
     and exists (select 1 from public.consult_docs d where d.client_id = new.id and d.status = 'falta_dados') then
    perform public.consult_queue(new.id, false);
  end if;
  return new;
end $$;
drop trigger if exists consult_on_document on public.clients;
create trigger consult_on_document after update of document on public.clients
  for each row execute function public.consult_on_document();

/**
 * A função consult-diagnosis pede o próximo trabalho: uma etapa de um cliente por vez.
 * No máximo 2 clientes gerando ao mesmo tempo. Com o teto do mês atingido, nenhum começa (fica "limite");
 * os que já estavam gerando terminam. Etapa que passou de 3 tentativas vira erro.
 */
create or replace function public.consult_claim() returns public.consult_docs
language plpgsql security definer set search_path to '' as $$
declare _row public.consult_docs; _cap numeric;
begin
  -- 1) Continua quem já está gerando e ninguém está mexendo agora (ou o trabalhador anterior caiu).
  select * into _row from public.consult_docs
   where status = 'gerando' and (busy_until is null or busy_until < now())
   order by queued_at limit 1 for update skip locked;
  if not found then
    -- 2) Começa um novo, se houver vaga e dinheiro.
    if (select count(*) from public.consult_docs where status = 'gerando') >= 2 then return null; end if;
    select monthly_cap_usd into _cap from public.ai_settings where id;
    if public.ai_month_spend() >= coalesce(_cap, 90) then
      update public.consult_docs set status = 'limite' where status = 'na_fila';
      return null;
    end if;
    -- Quem já gerou hoje espera até amanhã (1 geração por dia por cliente).
    select * into _row from public.consult_docs d
     where d.status in ('na_fila', 'limite') and public.ai_generation_allowed(d.client_id, 'consultoria')
     order by d.queued_at limit 1 for update skip locked;
    if not found then return null; end if;
    insert into public.ai_generations (client_id, area, kind, section)
    values (_row.client_id, 'consultoria', case when _row.stage = 'redo' then 'secao' else 'completa' end, _row.redo_section);
    _row.status := 'gerando';
    _row.attempts := 0;
    _row.started_at := coalesce(_row.started_at, now());
  end if;
  _row.attempts := _row.attempts + 1;
  if _row.attempts > 3 then
    update public.consult_docs set status = 'erro', busy_until = null,
      error = coalesce(error, 'A etapa não terminou depois de 3 tentativas.') where id = _row.id;
    return null;
  end if;
  update public.consult_docs set status = _row.status, attempts = _row.attempts, started_at = _row.started_at,
    busy_until = now() + interval '170 seconds' where id = _row.id;
  _row.busy_until := now() + interval '170 seconds';
  return _row;
end $$;
revoke all on function public.consult_claim() from public, anon, authenticated;

/** Chama a função consult-diagnosis (cron a cada 2 min e encadeamento entre etapas). */
create or replace function public.consult_kick() returns void
language plpgsql security definer set search_path to '' as $$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/consult-diagnosis',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'traffic_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 5000);
end $$;
revoke all on function public.consult_kick() from public, anon, authenticated;

-- ───────── Telas (admin e head de marketing) ─────────
create or replace function public.consult_can() returns boolean language sql stable security definer set search_path to '' as $$
  select public.has_role('admin') or public.has_role('head_marketing')
$$;

/** Lista da aba Consultoria: só quem tem Consultoria ativa. */
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
      'direction', (select d2.body from public.client_directions d2 where d2.client_id = c.id and d2.area = 'consultoria' and d2.month is null)
    ) order by c.name)
    from public.clients c left join public.consult_docs d on d.client_id = c.id
    where public.consult_has_service(c.id)
  ), '[]'::jsonb);
end $$;
grant execute on function public.consult_list() to authenticated;

/** Pop-up de 1 passo: CPF/CNPJ (com os dados da Receita já buscados na tela) e, se souber, Instagram e site. */
create or replace function public.consult_set_info(_client uuid, _document text, _instagram text default null, _website text default null,
  _legal_name text default null, _address text default null, _size text default null, _capital numeric default null) returns text
language plpgsql security definer set search_path to '' as $$
declare _doc text := regexp_replace(coalesce(_document, ''), '\D', '', 'g');
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _doc <> '' and (length(_doc) not in (11, 14) or not public.cpf_cnpj_valid(_doc)) then
    raise exception 'CPF ou CNPJ inválido' using errcode = 'PF006';
  end if;
  update public.clients c set
    document = coalesce(nullif(_doc, ''), c.document),
    instagram = coalesce(c.instagram, nullif(trim(_instagram), '')),
    website = coalesce(c.website, nullif(trim(_website), '')),
    legal_name = coalesce(c.legal_name, nullif(trim(_legal_name), '')),
    address = coalesce(c.address, nullif(trim(_address), '')),
    company_size = coalesce(c.company_size, nullif(_size, '')),
    company_capital = coalesce(c.company_capital, _capital),
    updated_at = now(), updated_by = auth.uid()
  where c.id = _client;
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  return public.consult_queue(_client, false);
end $$;
grant execute on function public.consult_set_info(uuid, text, text, text, text, text, text, numeric) to authenticated;

/** "Gerar agora" / "Refazer tudo". */
create or replace function public.consult_request(_client uuid) returns text
language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if exists (select 1 from public.consult_docs where client_id = _client and status in ('gerando')) then
    return 'gerando';
  end if;
  if not public.ai_generation_allowed(_client, 'consultoria') then
    raise exception 'Próxima geração liberada amanhã' using errcode = 'PF012';
  end if;
  return public.consult_queue(_client, true);
end $$;
grant execute on function public.consult_request(uuid) to authenticated;

/** "Refazer esta seção": usa a mesma pesquisa, reescreve só a parte pedida. */
create or replace function public.consult_redo(_client uuid, _section text) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _section not in ('resumo', 'diagnostico', 'plano', 'riscos', 'do_cliente') then raise exception 'Formato invalido' using errcode = 'PF006'; end if;
  if not public.ai_generation_allowed(_client, 'consultoria') then
    raise exception 'Próxima geração liberada amanhã' using errcode = 'PF012';
  end if;
  update public.consult_docs set status = 'na_fila', stage = 'redo', redo_section = _section, attempts = 0, busy_until = null, error = null, queued_at = now()
   where client_id = _client and status in ('pronto', 'aprovado', 'enviado', 'erro') and research is not null;
  if not found then raise exception 'O diagnóstico ainda não está pronto' using errcode = 'PF005'; end if;
end $$;
grant execute on function public.consult_redo(uuid, text) to authenticated;

create or replace function public.consult_approve(_client uuid) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.consult_docs set status = 'aprovado', approved_at = now(), approved_by = auth.uid()
   where client_id = _client and status in ('pronto', 'aprovado');
  if not found then raise exception 'O diagnóstico ainda não está pronto' using errcode = 'PF005'; end if;
end $$;
grant execute on function public.consult_approve(uuid) to authenticated;

/** Só marca: o envio é feito por uma pessoa (WhatsApp no aparelho dela), depois de confirmar. */
create or replace function public.consult_mark_sent(_client uuid) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.consult_docs set status = 'enviado', sent_at = now(), sent_by = auth.uid(),
    approved_at = coalesce(approved_at, now()), approved_by = coalesce(approved_by, auth.uid())
   where client_id = _client and status in ('pronto', 'aprovado', 'enviado');
  if not found then raise exception 'O diagnóstico ainda não está pronto' using errcode = 'PF005'; end if;
end $$;
grant execute on function public.consult_mark_sent(uuid) to authenticated;

/** Aceitar ou descartar uma sugestão da IA na ficha. Aceitar grava no campo do cliente. */
create or replace function public.client_ai_suggestion_decide(_id uuid, _accept boolean) returns void
language plpgsql security definer set search_path to '' as $$
declare _s public.client_ai_suggestions;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select * into _s from public.client_ai_suggestions where id = _id and status = 'pendente' for update;
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  if _accept then
    update public.clients set
      segment = case when _s.field = 'segment' then _s.value else segment end,
      description = case when _s.field = 'description' then _s.value else description end,
      target_audience = case when _s.field = 'target_audience' then _s.value else target_audience end,
      competitors = case when _s.field = 'competitors' then _s.value else competitors end,
      value_proposition = case when _s.field = 'value_proposition' then _s.value else value_proposition end,
      acquisition_channel = case when _s.field = 'acquisition_channel' then _s.value else acquisition_channel end,
      instagram = case when _s.field = 'instagram' then _s.value else instagram end,
      website = case when _s.field = 'website' then _s.value else website end,
      updated_at = now(), updated_by = auth.uid()
    where id = _s.client_id;
  end if;
  update public.client_ai_suggestions set status = case when _accept then 'aceita' else 'descartada' end, reviewed_by = auth.uid(), reviewed_at = now() where id = _id;
end $$;
grant execute on function public.client_ai_suggestion_decide(uuid, boolean) to authenticated;

-- ───────── Automação (central em Configurações → Automações) ─────────
do $$ begin
  if exists (select 1 from cron.job where jobname = 'consult-diagnosis') then perform cron.unschedule('consult-diagnosis'); end if;
end $$;
select cron.schedule('consult-diagnosis', '*/2 * * * *', $cron$
  select public.consult_kick()
  where exists (select 1 from public.consult_docs where status = 'gerando')
     or ((select auto_enabled from public.consult_settings where id)
         and (exists (select 1 from public.consult_docs where status = 'na_fila')
              or (exists (select 1 from public.consult_docs where status = 'limite')
                  and public.ai_month_spend() < (select monthly_cap_usd from public.ai_settings where id))));
$cron$);

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job, flag_table, flag_column)
values ('est_diagnostico', 'estrategia', 1, 'Diagnóstico da consultoria',
  'Quando um cliente entra na Consultoria, a IA pesquisa o negócio (site, Google, Reclame Aqui, anúncios) e escreve o diagnóstico e o plano de ação para a equipe revisar.',
  'Só gera o documento interno: nada é enviado ao cliente. Pede só o CPF/CNPJ quando falta. No máximo 2 clientes por vez e para sozinha quando o gasto do mês com IA chega ao limite (Configurações → Automações).',
  'Quando a Consultoria é ativada (confere a cada 2 minutos)', true, 'baixo', 'consult-diagnosis', 'consult_settings', 'auto_enabled')
on conflict (key) do update set module = excluded.module, title = excluded.title, what = excluded.what, how = excluded.how,
  schedule = excluded.schedule, uses_ai = excluded.uses_ai, cron_job = excluded.cron_job, flag_table = excluded.flag_table, flag_column = excluded.flag_column;

-- Clientes que já têm Consultoria: entram na lista (a fila só anda com a automação ligada ou pelo botão).
insert into public.consult_docs (client_id, status, stage, missing)
select c.id, case when cardinality(public.consult_missing(c.id)) > 0 then 'falta_dados' else 'na_fila' end, 'research', public.consult_missing(c.id)
from public.clients c where public.consult_has_service(c.id)
on conflict (client_id) do nothing;
