-- Estratégia interativa: o motor PRINCIPAL é o agente do Claude (rotina "Fila da estratégia", sem crédito da API).
-- Decisão do Italo em 16/11: a API paga fica só como reserva, desligada (ai_settings.strategy_engine = 'agente').
-- "Gerar estratégia" e "Refazer este card" deixam o pedido na fila; o agente lê o briefing e grava os cards por
-- strategy_agent_submit / strategy_agent_redo. Passo a passo: docs/ROTINA-ESTRATEGIA-CARDS.md.

alter table public.ai_settings add column if not exists strategy_engine text not null default 'agente';
do $$ begin
  alter table public.ai_settings add constraint ai_settings_strategy_engine_chk check (strategy_engine in ('agente', 'api'));
exception when duplicate_object then null; end $$;
alter table public.strategy_boards add column if not exists engine text not null default 'agente';
alter table public.strategy_cards add column if not exists redo_pedido text, add column if not exists redo_requested_at timestamptz;

create or replace function public.strategy_request(_client uuid, _month date, _missing jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _id uuid; _cap numeric; _engine text;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if exists (select 1 from public.strategy_boards where client_id = _client and month = date_trunc('month', _month)::date and status in ('na_fila', 'gerando')) then
    raise exception 'Já está gerando' using errcode = 'PF012';
  end if;
  select monthly_cap_usd, coalesce(strategy_engine, 'agente') into _cap, _engine from public.ai_settings where id;
  _engine := coalesce(_engine, 'agente');
  if _engine = 'api' and public.ai_month_spend() >= coalesce(_cap, 90) then raise exception 'Limite do mês' using errcode = 'PF013'; end if;
  insert into public.strategy_boards as b (client_id, month, missing, engine)
  values (_client, date_trunc('month', _month)::date, coalesce(_missing, '[]'::jsonb), _engine)
  on conflict (client_id, month) do update set status = 'na_fila', step = 'pesquisa', partial = '{}'::jsonb, missing = excluded.missing, engine = excluded.engine,
    error = null, attempts = 0, busy_until = null, requested_by = auth.uid(), requested_at = now(), finished_at = null,
    approved_at = null, approved_by = null, updated_at = now()
  returning id into _id;
  if _engine = 'api' then perform public.strategy_kick(); end if;
  return _id;
end $$;

-- A função da API só pega quadros do motor 'api' (reserva).
create or replace function public.strategy_claim()
returns public.strategy_boards language plpgsql security definer set search_path to '' as $$
declare _row public.strategy_boards; _cap numeric;
begin
  select * into _row from public.strategy_boards
   where engine = 'api' and status in ('na_fila', 'gerando') and (busy_until is null or busy_until < now())
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

select cron.unschedule('strategy-cards') where exists (select 1 from cron.job where jobname = 'strategy-cards');
select cron.schedule('strategy-cards', '*/2 * * * *', $c$
  select public.strategy_kick() where exists (select 1 from public.strategy_boards where engine = 'api' and status in ('na_fila', 'gerando') and (busy_until is null or busy_until < now()))
$c$);

-- Refazer este card: com o agente, vai para a fila (com o pedido opcional).
create or replace function public.strategy_card_redo_request(_id uuid, _pedido text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.strategy_cards set redo_pedido = coalesce(nullif(trim(left(coalesce(_pedido, ''), 300)), ''), 'versão melhor e diferente'), redo_requested_at = now(), updated_at = now()
   where id = _id and tab <> 'referencias';
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
end $$;
grant execute on function public.strategy_card_redo_request(uuid, text) to authenticated;

-- ───────── Usado pelo agente do Claude (rotina), não pela tela ─────────
-- O que está na fila: quadros a gerar e cards a refazer.
create or replace function public.strategy_agent_queue()
returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'gerar', coalesce((select jsonb_agg(jsonb_build_object('board_id', b.id, 'client_id', b.client_id, 'cliente', c.name, 'mes', to_char(b.month, 'YYYY-MM'), 'faltou_no_briefing', b.missing, 'pedido_em', b.requested_at) order by b.requested_at)
      from public.strategy_boards b join public.clients c on c.id = b.client_id where b.engine = 'agente' and b.status in ('na_fila', 'gerando')), '[]'::jsonb),
    'refazer', coalesce((select jsonb_agg(jsonb_build_object('card_id', s.id, 'client_id', s.client_id, 'cliente', c.name, 'mes', to_char(s.month, 'YYYY-MM'), 'aba', s.tab, 'tipo', s.kind, 'pedido', s.redo_pedido, 'card', jsonb_build_object('titulo', s.title, 'funil', s.funnel, 'serve', s.serves, 'meta', s.goal, 'inspirado', s.inspired, 'suposicao', s.assumed) || s.data) order by s.redo_requested_at)
      from public.strategy_cards s join public.clients c on c.id = s.client_id where s.redo_requested_at is not null), '[]'::jsonb))
$$;
revoke execute on function public.strategy_agent_queue() from public, anon, authenticated;

-- O agente avisa que começou (a tela mostra "o agente está escrevendo").
create or replace function public.strategy_agent_start(_board uuid)
returns void language sql security definer set search_path to '' as $$
  update public.strategy_boards set status = 'gerando', partial = jsonb_build_object('stage_label', 'O agente está escrevendo'), updated_at = now() where id = _board and status in ('na_fila', 'gerando');
$$;
revoke execute on function public.strategy_agent_start(uuid) from public, anon, authenticated;

-- Um card no formato do agente: {aba, tipo, titulo, funil, serve, meta, inspirado:{link,numero}, suposicao, ...resto em data}.
create or replace function public.strategy_card_row(_c jsonb)
returns jsonb language sql immutable set search_path to '' as $$
  select jsonb_build_object(
    'tab', _c->>'aba', 'kind', coalesce(_c->>'tipo', 'card'), 'title', left(coalesce(nullif(_c->>'titulo', ''), 'Sem título'), 160),
    'funnel', case when _c->>'funil' in ('atrair', 'provar', 'objecao', 'converter') then _c->>'funil' end,
    'serves', nullif(left(coalesce(_c->>'serve', ''), 160), ''), 'goal', nullif(left(coalesce(_c->>'meta', ''), 120), ''),
    'inspired', case when coalesce(_c->'inspirado'->>'link', '') <> '' or coalesce(_c->'inspirado'->>'numero', '') <> '' then _c->'inspirado' end,
    'assumed', nullif(left(coalesce(_c->>'suposicao', ''), 200), ''),
    'data', _c - array['aba', 'tipo', 'titulo', 'funil', 'serve', 'meta', 'inspirado', 'suposicao'])
$$;

-- Grava a estratégia do agente: os aprovados de antes ficam; o resto é trocado. Aba Referências sai do briefing (sem IA).
-- _novos: {concorrentes:[{nome,link,porque}], referencias:[{link,porque,numero,tipo}]} somados ao briefing com o selo "novo".
create or replace function public.strategy_agent_submit(_board uuid, _cards jsonb, _novos jsonb default '{}'::jsonb)
returns integer language plpgsql security definer set search_path to '' as $$
declare _b public.strategy_boards; _brief jsonb; _n integer := 0; _x jsonb; _r jsonb; _pos integer := 0; _i integer;
begin
  select * into _b from public.strategy_boards where id = _board;
  if not found then raise exception 'Quadro não encontrado'; end if;
  -- Soma concorrentes e referências novos ao briefing (sem duplicar por link ou nome).
  select coalesce(data, '{}'::jsonb) into _brief from public.client_briefs where client_id = _b.client_id;
  _brief := coalesce(_brief, '{}'::jsonb);
  for _x in select * from jsonb_array_elements(coalesce(_novos->'concorrentes', '[]'::jsonb)) loop
    if coalesce(_x->>'nome', '') <> '' and not exists (select 1 from jsonb_array_elements(coalesce(_brief->'concorrentes', '[]'::jsonb)) e
       where lower(e->>'nome') = lower(_x->>'nome') or (coalesce(e->>'link', '') <> '' and rtrim(lower(e->>'link'), '/') = rtrim(lower(_x->>'link'), '/'))) then
      _brief := jsonb_set(_brief, '{concorrentes}', coalesce(_brief->'concorrentes', '[]'::jsonb) || jsonb_build_array(_x || '{"novo": true}'));
    end if;
  end loop;
  for _x in select * from jsonb_array_elements(coalesce(_novos->'referencias', '[]'::jsonb)) loop
    if coalesce(_x->>'link', '') ~ '^https?://' and not exists (select 1 from jsonb_array_elements(coalesce(_brief->'referencias', '[]'::jsonb)) e
       where rtrim(lower(e->>'link'), '/') = rtrim(lower(_x->>'link'), '/')) then
      _brief := jsonb_set(_brief, '{referencias}', coalesce(_brief->'referencias', '[]'::jsonb) || jsonb_build_array(_x || '{"novo": true}'));
    end if;
  end loop;
  insert into public.client_briefs (client_id, data, updated_at) values (_b.client_id, _brief, now())
  on conflict (client_id) do update set data = excluded.data, updated_at = now();

  delete from public.strategy_cards where board_id = _board and status <> 'aprovado';
  for _x in select * from jsonb_array_elements(coalesce(_cards, '[]'::jsonb)) loop
    _r := public.strategy_card_row(_x);
    if _r->>'tab' in ('resumo', 'audiovisual', 'social', 'trafego', 'atendimento') and not exists (
      select 1 from public.strategy_cards where board_id = _board and tab = _r->>'tab' and lower(title) = lower(_r->>'title')) then
      insert into public.strategy_cards (board_id, client_id, month, tab, kind, position, title, data, funnel, serves, goal, inspired, assumed)
      values (_board, _b.client_id, _b.month, _r->>'tab', _r->>'kind', _pos, _r->>'title', coalesce(_r->'data', '{}'::jsonb), _r->>'funnel', _r->>'serves', _r->>'goal', _r->'inspired', _r->>'assumed');
      _pos := _pos + 1; _n := _n + 1;
    end if;
  end loop;
  _i := 0;
  for _x in select * from jsonb_array_elements(coalesce(_brief->'concorrentes', '[]'::jsonb)) loop
    insert into public.strategy_cards (board_id, client_id, month, tab, kind, position, title, data, is_new)
    values (_board, _b.client_id, _b.month, 'referencias', 'concorrente', _i, left(coalesce(nullif(_x->>'nome', ''), 'Concorrente'), 160),
      jsonb_build_object('link', coalesce(_x->>'link', ''), 'porque', coalesce(_x->>'porque', '')), coalesce((_x->>'novo')::boolean, false));
    _i := _i + 1;
  end loop;
  for _x in select * from jsonb_array_elements(coalesce(_brief->'referencias', '[]'::jsonb)) loop
    insert into public.strategy_cards (board_id, client_id, month, tab, kind, position, title, data, inspired, is_new)
    values (_board, _b.client_id, _b.month, 'referencias', case when _x->>'tipo' in ('outro_nicho', 'anuncio') then _x->>'tipo' else 'referencia' end, 100 + _i,
      left(coalesce(nullif(_x->>'porque', ''), _x->>'link'), 160),
      jsonb_build_object('link', _x->>'link', 'porque', coalesce(_x->>'porque', ''), 'numero', coalesce(_x->>'numero', ''), 'thumb', coalesce(_x->>'thumb', '')),
      case when coalesce(_x->>'numero', '') <> '' then jsonb_build_object('link', _x->>'link', 'numero', _x->>'numero') end, coalesce((_x->>'novo')::boolean, false));
    _i := _i + 1;
  end loop;
  update public.strategy_boards set status = 'pronto', step = 'fim', partial = jsonb_build_object('stage_label', '', 'por', 'agente'), error = null, busy_until = null,
    finished_at = now(), updated_at = now() where id = _board;
  return _n;
end $$;
revoke execute on function public.strategy_agent_submit(uuid, jsonb, jsonb) from public, anon, authenticated;

-- Grava UM card refeito pelo agente (mesmo formato do submit).
create or replace function public.strategy_agent_redo(_card uuid, _c jsonb)
returns void language plpgsql security definer set search_path to '' as $$
declare _r jsonb := public.strategy_card_row(_c);
begin
  update public.strategy_cards set title = _r->>'title', data = coalesce(_r->'data', '{}'::jsonb), funnel = _r->>'funnel', serves = _r->>'serves', goal = _r->>'goal',
    inspired = _r->'inspired', assumed = _r->>'assumed', status = 'proposta', regen_count = regen_count + 1, redo_pedido = null, redo_requested_at = null, updated_at = now()
   where id = _card;
end $$;
revoke execute on function public.strategy_agent_redo(uuid, jsonb) from public, anon, authenticated;

update public.automation_catalog set title = 'Estratégia interativa (fila do agente)',
  what = 'Quando alguém toca em Gerar estratégia ou Refazer este card, o pedido entra na fila. O agente do Claude lê o briefing, escreve os cards (Resumo, Audiovisual, Social, Tráfego, Atendimento) e grava no sistema. Nada vai ao cliente.',
  how = 'Tarefa agendada do Claude (sem crédito da API), passo a passo em docs/ROTINA-ESTRATEGIA-CARDS.md. Fila vazia: termina na hora. A função strategy-cards (API) fica só de reserva: ai_settings.strategy_engine = ''api''.',
  schedule = 'De hora em hora, 8h a 20h (só trabalha se houver pedido)', cron_job = null
 where key = 'est_interativa';
