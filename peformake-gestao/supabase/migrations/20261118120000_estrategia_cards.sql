-- Estratégia interativa (MVP), fase 2: a estratégia do mês em CARDS editáveis por aba (função strategy-cards).
-- Gera só sob demanda, por cliente (botão "Gerar estratégia"). Nada vai ao cliente: o PDF só sai depois de aprovado.

create table if not exists public.strategy_boards (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  month date not null,
  status text not null default 'na_fila' check (status in ('na_fila', 'gerando', 'pronto', 'aprovado', 'erro', 'limite')),
  step text not null default 'pesquisa',
  partial jsonb not null default '{}'::jsonb,
  missing jsonb not null default '[]'::jsonb,
  error text, cost_usd numeric not null default 0, attempts integer not null default 0, busy_until timestamptz,
  requested_by uuid default auth.uid(), requested_at timestamptz not null default now(), finished_at timestamptz,
  approved_at timestamptz, approved_by uuid, pdf_asset_id uuid,
  updated_at timestamptz not null default now(),
  unique (client_id, month)
);
create table if not exists public.strategy_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.strategy_boards(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  month date not null,
  tab text not null check (tab in ('resumo', 'audiovisual', 'social', 'trafego', 'atendimento', 'referencias')),
  kind text not null default 'card',
  position integer not null default 0,
  title text not null default '',
  data jsonb not null default '{}'::jsonb,
  funnel text check (funnel is null or funnel in ('atrair', 'provar', 'objecao', 'converter')),
  serves text, goal text, inspired jsonb, assumed text,
  status text not null default 'proposta' check (status in ('proposta', 'aprovado', 'recusado')),
  reject_reason text, in_pdf boolean not null default true, regen_count integer not null default 0, is_new boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists strategy_cards_board_idx on public.strategy_cards (board_id, tab, position);
create index if not exists strategy_cards_client_idx on public.strategy_cards (client_id, month);

-- Regras de conteúdo: cada recusa com motivo vira regra (a geração seguinte lê e não repete o erro).
create table if not exists public.content_rules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  rule text not null, source text not null default 'recusa', card_id uuid,
  created_at timestamptz not null default now(), created_by uuid default auth.uid()
);
create index if not exists content_rules_client_idx on public.content_rules (client_id, created_at desc);

alter table public.strategy_boards enable row level security;
alter table public.strategy_cards enable row level security;
alter table public.content_rules enable row level security;
drop policy if exists strategy_boards_read on public.strategy_boards;
create policy strategy_boards_read on public.strategy_boards for select to authenticated using (public.consult_can());
drop policy if exists strategy_cards_all on public.strategy_cards;
create policy strategy_cards_all on public.strategy_cards for all to authenticated using (public.consult_can()) with check (public.consult_can());
drop policy if exists content_rules_all on public.content_rules;
create policy content_rules_all on public.content_rules for all to authenticated using (public.consult_can()) with check (public.consult_can());

create or replace function public.strategy_kick()
returns void language plpgsql security definer set search_path to '' as $$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/strategy-cards',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'traffic_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 5000);
end $$;
revoke execute on function public.strategy_kick() from public, anon, authenticated;

-- Pedir a geração (ou refazer tudo): guarda o que faltava no briefing (vira "suposição" nos cards).
create or replace function public.strategy_request(_client uuid, _month date, _missing jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _id uuid; _cap numeric;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if exists (select 1 from public.strategy_boards where client_id = _client and month = _month and status in ('na_fila', 'gerando')) then
    raise exception 'Já está gerando' using errcode = 'PF012';
  end if;
  select monthly_cap_usd into _cap from public.ai_settings where id;
  if public.ai_month_spend() >= coalesce(_cap, 90) then raise exception 'Limite do mês' using errcode = 'PF013'; end if;
  insert into public.strategy_boards as b (client_id, month, missing)
  values (_client, date_trunc('month', _month)::date, coalesce(_missing, '[]'::jsonb))
  on conflict (client_id, month) do update set status = 'na_fila', step = 'pesquisa', partial = '{}'::jsonb, missing = excluded.missing,
    error = null, attempts = 0, busy_until = null, requested_by = auth.uid(), requested_at = now(), finished_at = null,
    approved_at = null, approved_by = null, updated_at = now()
  returning id into _id;
  perform public.strategy_kick();
  return _id;
end $$;

-- A função pega um quadro por vez (uma etapa por chamada; 3 tentativas por etapa).
create or replace function public.strategy_claim()
returns public.strategy_boards language plpgsql security definer set search_path to '' as $$
declare _row public.strategy_boards; _cap numeric;
begin
  select * into _row from public.strategy_boards
   where status in ('na_fila', 'gerando') and (busy_until is null or busy_until < now())
   order by requested_at limit 1 for update skip locked;
  if not found then return null; end if;
  select monthly_cap_usd into _cap from public.ai_settings where id;
  if public.ai_month_spend() >= coalesce(_cap, 90) then
    update public.strategy_boards set status = 'limite', busy_until = null, updated_at = now() where id = _row.id;
    return null;
  end if;
  _row.attempts := _row.attempts + 1;
  if _row.attempts > 3 then
    update public.strategy_boards set status = 'erro', busy_until = null, updated_at = now(),
      error = coalesce(error, 'A etapa não terminou depois de 3 tentativas.') where id = _row.id;
    return null;
  end if;
  update public.strategy_boards set status = 'gerando', attempts = _row.attempts, busy_until = now() + interval '170 seconds', updated_at = now() where id = _row.id;
  _row.status := 'gerando'; _row.busy_until := now() + interval '170 seconds';
  return _row;
end $$;
revoke execute on function public.strategy_claim() from public, anon, authenticated;

-- O quadro do mês com os cards (sem o rascunho interno da geração).
create or replace function public.strategy_board_get(_client uuid, _month date)
returns jsonb language sql stable security definer set search_path to '' as $$
  select case when not public.consult_can() then null else (
    select to_jsonb(b) - 'partial' || jsonb_build_object(
      'stage', b.partial->>'stage_label',
      'cards', coalesce((select jsonb_agg(to_jsonb(c) order by c.tab, c.position, c.created_at) from public.strategy_cards c where c.board_id = b.id), '[]'::jsonb))
    from public.strategy_boards b where b.client_id = _client and b.month = date_trunc('month', _month)::date) end
$$;

create or replace function public.strategy_card_reject(_id uuid, _reason text)
returns void language plpgsql security definer set search_path to '' as $$
declare _c public.strategy_cards;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.strategy_cards set status = 'recusado', reject_reason = nullif(trim(left(coalesce(_reason, ''), 200)), ''), in_pdf = false, updated_at = now()
   where id = _id returning * into _c;
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  if _c.reject_reason is not null then
    insert into public.content_rules (client_id, rule, source, card_id) values (_c.client_id, _c.reject_reason, 'recusa', _c.id);
  end if;
end $$;

create or replace function public.strategy_approve(_board uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.strategy_boards set status = 'aprovado', approved_at = now(), approved_by = auth.uid(), updated_at = now()
   where id = _board and status in ('pronto', 'aprovado');
  if not found then raise exception 'A estratégia ainda não está pronta' using errcode = 'PF005'; end if;
end $$;

grant execute on function public.strategy_request(uuid, date, jsonb) to authenticated;
grant execute on function public.strategy_board_get(uuid, date) to authenticated;
grant execute on function public.strategy_card_reject(uuid, text) to authenticated;
grant execute on function public.strategy_approve(uuid) to authenticated;

-- Segurança: se uma etapa cair, o relógio retoma (só quando há quadro gerando).
select cron.unschedule('strategy-cards') where exists (select 1 from cron.job where jobname = 'strategy-cards');
select cron.schedule('strategy-cards', '*/2 * * * *', $c$
  select public.strategy_kick() where exists (select 1 from public.strategy_boards where status in ('na_fila', 'gerando') and (busy_until is null or busy_until < now()))
$c$);

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job)
values ('est_interativa', 'estrategia', 6, 'Estratégia interativa (cards)',
  'Gera a estratégia do mês de UM cliente em cards (Resumo, Audiovisual, Social, Tráfego, Atendimento, Referências) a partir do briefing. Só quando alguém toca em Gerar estratégia ou Refazer este card. Nada vai ao cliente.',
  'Função strategy-cards: busca no modelo pequeno, núcleo e roteiros no mais forte, social/tráfego/atendimento no intermediário. Respeita o teto do mês com IA. O relógio de 2 min só retoma uma geração que caiu.',
  'Sob demanda (retoma a cada 2 min se cair)', true, 'baixo', 'strategy-cards')
on conflict (key) do update set what = excluded.what, how = excluded.how, schedule = excluded.schedule, cron_job = excluded.cron_job;

-- A rotina agendada "Estratégia do mês seguinte" foi desligada pelo Italo em 16/11 (só sob demanda, por cliente).
update public.automation_catalog set routine_on = false, schedule = 'Desligada em 16/11 (agora é sob demanda, por cliente)' where key = 'est_mensal_agente';
