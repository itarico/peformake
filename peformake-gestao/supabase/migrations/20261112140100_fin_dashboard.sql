-- ===== O painel: fin_dashboard(_unit juntas|peformake|ellcazo, _month) — só admin, tudo numa chamada =====
create or replace function public.fin_dashboard(_unit text default 'juntas', _month date default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  _units text[];
  _m date; _n date; _pm date; _cur boolean;
  _received numeric; _received_prev numeric; _expected numeric; _exp_to_date numeric;
  _to_receive numeric; _to_receive_n int;
  _overdue numeric; _overdue_clients int; _overdue_max int;
  _exp_paid numeric; _exp_open numeric; _result numeric;
  _goal numeric;
  _score numeric := 0; _reasons jsonb := '[]'; _no_profit boolean := false; _check jsonb := '[]';
  _u text; _ulabel text; _last date; _w numeric; _cnt int; _tot int; _a numeric; _b numeric;
  _actions jsonb := '[]'; _insights jsonb := '[]';
  _series jsonb; _cash jsonb; _start numeric; _min numeric; _min_day date; _neg_day date;
  _by_area jsonb; _conc jsonb; _top1 numeric := 0; _top1_name text; _conc_total numeric;
  _delinq jsonb; _expenses jsonb; _clients jsonb;
  _team numeric; _credits numeric; _avg_delay numeric; _r record;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  _units := case coalesce(_unit, 'juntas') when 'peformake' then array['peformake'] when 'ellcazo' then array['ellcazo'] else array['peformake', 'ellcazo'] end;
  _m := date_trunc('month', coalesce(_month, _today))::date;
  _n := (_m + interval '1 month')::date;
  _pm := (_m - interval '1 month')::date;
  _cur := _m = date_trunc('month', _today)::date;

  -- ---- Cartões ----
  select coalesce(sum(amount) filter (where status = 'pago' and paid_at >= _m and paid_at < _n), 0),
         coalesce(sum(amount) filter (where status = 'pago' and paid_at >= _pm and paid_at < _m), 0),
         coalesce(sum(amount) filter (where status <> 'cancelado' and due_date >= _m and due_date < _n), 0),
         coalesce(sum(amount) filter (where status <> 'cancelado' and due_date >= _m and due_date <= least(_today, _n - 1)), 0),
         coalesce(sum(amount) filter (where status = 'pendente' and due_date >= greatest(_today, _m) and due_date < _n), 0),
         count(*) filter (where status = 'pendente' and due_date >= greatest(_today, _m) and due_date < _n),
         coalesce(sum(amount) filter (where status = 'pendente' and due_date < _today), 0),
         count(distinct coalesce(client_id::text, id::text)) filter (where status = 'pendente' and due_date < _today),
         coalesce(_today - min(due_date) filter (where status = 'pendente' and due_date < _today), 0)
    into _received, _received_prev, _expected, _exp_to_date, _to_receive, _to_receive_n, _overdue, _overdue_clients, _overdue_max
  from public.fin_entries where kind = 'entrada' and unit = any(_units);

  select coalesce(sum(amount) filter (where status = 'pago' and paid_at >= _m and paid_at < _n), 0),
         coalesce(sum(amount) filter (where status = 'pendente' and due_date >= _m and due_date < _n), 0)
    into _exp_paid, _exp_open
  from public.fin_entries where kind = 'saida' and unit = any(_units);
  _result := _received - _exp_paid;
  select sum(target) into _goal from public.fin_goals where unit = any(_units) and target is not null;

  -- ---- Selo de confiança (100 pontos por empresa; "Juntas" é a média) ----
  foreach _u in array _units loop
    _ulabel := case when array_length(_units, 1) > 1 then case _u when 'peformake' then ' da Peformake' else ' da Ellcazo' end else '' end;
    -- 1. Extrato em dia (30)
    select max(coalesce(paid_at, due_date)) into _last from public.fin_entries where unit = _u and source = 'extrato';
    if _last is null then
      _w := 0;
      _reasons := _reasons || jsonb_build_object('key', 'extrato', 'unit', _u, 'weight', 30,
        'text', 'falta importar o extrato' || _ulabel || ' (nunca importado)', 'to', '/financeiro/caixa', 'label', 'Importar extrato');
    elsif _today - _last <= 7 then _w := 30;
    else
      _w := case when _today - _last <= 30 then 15 else 0 end;
      _reasons := _reasons || jsonb_build_object('key', 'extrato', 'unit', _u, 'weight', 30 - _w,
        'text', 'falta importar o extrato' || _ulabel || ' desde ' || to_char(_last + 1, 'DD/MM'), 'to', '/financeiro/caixa', 'label', 'Importar extrato');
    end if;
    _score := _score + _w;
    -- 2. Despesas fixas cadastradas (20)
    if exists (select 1 from public.fin_recurring where unit = _u and kind = 'saida' and is_active) then _score := _score + 20;
    else _reasons := _reasons || jsonb_build_object('key', 'fixas', 'unit', _u, 'weight', 20,
        'text', 'sem despesas fixas' || _ulabel || ' (Contas fixas)', 'to', '/financeiro/caixa', 'label', 'Cadastrar contas fixas');
    end if;
    -- 3. Pró-labore e impostos entre as fixas (10)
    if exists (select 1 from public.fin_recurring r left join public.fin_categories c on c.id = r.category_id
               where r.unit = _u and r.kind = 'saida' and r.is_active
                 and lower(r.description || ' ' || coalesce(c.name, '')) ~ '(pr[oó].?labore|imposto|simples|inss|\mdas\M|\miss\M|tribut)') then _score := _score + 10;
    else _reasons := _reasons || jsonb_build_object('key', 'prolabore', 'unit', _u, 'weight', 10,
        'text', 'lucro sem pró-labore/impostos' || _ulabel, 'to', '/financeiro/caixa', 'label', 'Cadastrar contas fixas');
    end if;
    -- 4. Todo cliente ativo com fatura no mês (20)
    select count(*), count(*) filter (where not exists (
             select 1 from public.fin_entries f where f.client_id = r.client_id and f.unit = r.unit and f.kind = 'entrada'
               and f.status <> 'cancelado' and f.due_date >= _m and f.due_date < _n))
      into _tot, _cnt from public.fin_mrr_rows(_m) r where r.unit = _u;
    _score := _score + case when _tot = 0 then 20 else round(20.0 * (_tot - _cnt) / _tot, 1) end;
    if _cnt > 0 then _reasons := _reasons || jsonb_build_object('key', 'sem_fatura', 'unit', _u, 'weight', round(20.0 * _cnt / _tot, 1),
        'text', _cnt || case when _cnt = 1 then ' cliente ativo sem fatura' else ' clientes ativos sem fatura' end || ' no mês' || _ulabel,
        'to', '/financeiro/cobranca', 'label', 'Ver Cobrança');
    end if;
    -- 5. Entrada identificada: com cliente ou categoria (10)
    select count(*), count(*) filter (where client_id is null and category_id is null) into _tot, _cnt
      from public.fin_entries where unit = _u and kind = 'entrada' and status = 'pago' and paid_at >= _m and paid_at < _n;
    _score := _score + case when _tot = 0 then 10 else round(10.0 * (_tot - _cnt) / _tot, 1) end;
    if _cnt > 0 then _reasons := _reasons || jsonb_build_object('key', 'sem_cliente', 'unit', _u, 'weight', round(10.0 * _cnt / _tot, 1),
        'text', _cnt || case when _cnt = 1 then ' entrada sem cliente nem categoria' else ' entradas sem cliente nem categoria' end || _ulabel,
        'to', '/financeiro/caixa', 'label', 'Categorizar');
    end if;
    -- 6. Conferência: faturas pagas no mês = baixas no Caixa (10). Diferença acima de R$ 1 esconde o lucro.
    select coalesce(sum(coalesce(i.paid_amount, i.amount)), 0) into _a from public.invoices i
      where i.unit = _u and i.status = 'pago' and (i.paid_at at time zone 'America/Sao_Paulo')::date >= _m and (i.paid_at at time zone 'America/Sao_Paulo')::date < _n;
    select coalesce(sum(f.amount), 0) into _b from public.invoices i join public.fin_entries f on f.id = i.fin_entry_id
      where i.unit = _u and i.status = 'pago' and f.status = 'pago' and (i.paid_at at time zone 'America/Sao_Paulo')::date >= _m and (i.paid_at at time zone 'America/Sao_Paulo')::date < _n;
    _check := _check || jsonb_build_object('unit', _u, 'name', 'Faturas pagas = baixas no Caixa', 'a', _a, 'b', _b, 'ok', abs(_a - _b) <= 1);
    if abs(_a - _b) <= 1 then _score := _score + 10;
    else
      _no_profit := true;
      _reasons := _reasons || jsonb_build_object('key', 'conferir', 'unit', _u, 'weight', 10,
        'text', 'conferir' || _ulabel || ': faturas pagas ' || public.brl(_a) || ' e baixas no Caixa ' || public.brl(_b), 'to', '/financeiro/cobranca', 'label', 'Conferir');
    end if;
  end loop;
  _score := round(_score / array_length(_units, 1));
  select coalesce(jsonb_agg(x order by (x->>'weight')::numeric desc), '[]') into _reasons from jsonb_array_elements(_reasons) x;

  -- ---- Séries de 12 meses (recebido e previsto por empresa) ----
  select jsonb_agg(jsonb_build_object('month', to_char(mo, 'YYYY-MM'),
      'received_p', coalesce(rp, 0), 'received_e', coalesce(re, 0), 'expected_p', coalesce(xp, 0), 'expected_e', coalesce(xe, 0),
      'expenses', coalesce(sx, 0)) order by mo)
    into _series
  from (
    select g.mo,
      sum(f.amount) filter (where f.kind = 'entrada' and f.status = 'pago' and f.unit = 'peformake' and f.paid_at >= g.mo and f.paid_at < g.mo + interval '1 month') rp,
      sum(f.amount) filter (where f.kind = 'entrada' and f.status = 'pago' and f.unit = 'ellcazo' and f.paid_at >= g.mo and f.paid_at < g.mo + interval '1 month') re,
      sum(f.amount) filter (where f.kind = 'entrada' and f.status <> 'cancelado' and f.unit = 'peformake' and f.due_date >= g.mo and f.due_date < g.mo + interval '1 month') xp,
      sum(f.amount) filter (where f.kind = 'entrada' and f.status <> 'cancelado' and f.unit = 'ellcazo' and f.due_date >= g.mo and f.due_date < g.mo + interval '1 month') xe,
      sum(f.amount) filter (where f.kind = 'saida' and f.status = 'pago' and f.paid_at >= g.mo and f.paid_at < g.mo + interval '1 month') sx
    from (select (_m - make_interval(months => k))::date mo from generate_series(0, 11) k) g
    left join public.fin_entries f on f.unit = any(_units)
    group by g.mo
  ) s;

  -- ---- Caixa projetado 90 dias (saldo pelo que já entrou e saiu no Caixa/extrato) ----
  select coalesce(sum(case when kind = 'entrada' then amount else -amount end), 0) into _start
    from public.fin_entries where unit = any(_units) and status = 'pago' and paid_at <= _today;
  with ev as (
    -- Entradas em aberto que vencem de hoje a 90 dias (as vencidas ficam de fora: não dá para contar com elas).
    select f.due_date d, f.amount v from public.fin_entries f
      where f.unit = any(_units) and f.kind = 'entrada' and f.status = 'pendente' and f.due_date >= _today and f.due_date <= _today + 90
    union all -- Saídas em aberto (as vencidas contam hoje: precisam ser pagas)
    select greatest(f.due_date, _today), -f.amount from public.fin_entries f
      where f.unit = any(_units) and f.kind = 'saida' and f.status = 'pendente' and f.due_date <= _today + 90
    union all -- Contas fixas dos meses que ainda não foram lançados
    select x.d, case when r.kind = 'entrada' then r.amount else -r.amount end
      from public.fin_recurring r
      cross join lateral (select (mo + (least(r.day, extract(day from (mo + interval '1 month' - interval '1 day'))::int) - 1))::date d
                          from (select (date_trunc('month', _today) + make_interval(months => k))::date mo from generate_series(0, 3) k) mm) x
      where r.unit = any(_units) and r.is_active and x.d >= _today and x.d <= _today + 90
        and r.starts_on <= x.d and (r.ends_on is null or r.ends_on >= x.d)
        and not exists (select 1 from public.fin_entries f where f.unit = r.unit and f.source = 'manual' and f.external_id = 'rec:' || r.id || ':' || to_char(x.d, 'YYYY-MM'))
    union all -- Mensalidades dos próximos meses ainda sem fatura
    select x.d, mr.amount
      from (select (date_trunc('month', _today) + make_interval(months => k))::date mo from generate_series(0, 3) k) mm
      cross join lateral public.fin_mrr_rows(mm.mo) mr
      left join public.client_contracts k on k.client_id = mr.client_id
      cross join lateral (select (mm.mo + (least(coalesce(k.billing_day, 10), extract(day from (mm.mo + interval '1 month' - interval '1 day'))::int) - 1))::date d) x
      where mr.unit = any(_units) and x.d > _today and x.d <= _today + 90
        and not exists (select 1 from public.fin_entries f where f.client_id = mr.client_id and f.unit = mr.unit and f.kind = 'entrada'
          and f.status <> 'cancelado' and f.due_date >= mm.mo and f.due_date < mm.mo + interval '1 month')
  ),
  daily as (
    select g.d::date d, _start + coalesce((select sum(v) from ev where ev.d <= g.d), 0) bal
    from generate_series(_today, _today + 90, interval '1 day') g(d)
  )
  select jsonb_build_object(
      'start', _start,
      'points', (select jsonb_agg(jsonb_build_object('date', d, 'balance', round(bal, 2)) order by d) from daily where (d - _today) % 7 = 0 or d = _today + 90),
      'min', (select round(min(bal), 2) from daily),
      'min_date', (select d from daily order by bal, d limit 1),
      'negative_on', (select min(d) from daily where bal < 0),
      'end', (select round(bal, 2) from daily where d = _today + 90),
      'in', coalesce((select sum(v) from ev where v > 0), 0),
      'out', coalesce((select -sum(v) from ev where v < 0), 0))
    into _cash;
  _min := (_cash->>'min')::numeric; _neg_day := (_cash->>'negative_on')::date; _min_day := (_cash->>'min_date')::date;

  -- ---- Receita por área (itens das faturas do mês) ----
  select coalesce(jsonb_agg(jsonb_build_object('area', area, 'amount', amount) order by amount desc), '[]') into _by_area
  from (
    select coalesce(case when i.source = 'manual' and i.ref like 'licitacao:%' then 'licitacao' end, s.area, 'outros') area, sum(ii.amount) amount
    from public.invoice_items ii
    join public.invoices i on i.id = ii.invoice_id
    left join public.services s on s.id = ii.service_id
    where ii.unit = any(_units) and coalesce(ii.state, '') <> 'cancelado' and i.status <> 'cancelado'
      and coalesce(ii.month, date_trunc('month', i.due_date)::date) = _m
    group by 1 having sum(ii.amount) > 0
  ) a;

  -- ---- Concentração (últimos 3 meses de faturamento) ----
  select coalesce(sum(amount), 0) into _conc_total from public.fin_entries
    where unit = any(_units) and kind = 'entrada' and status <> 'cancelado' and client_id is not null and due_date >= (_m - interval '2 months') and due_date < _n;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'amount', amount, 'pct', case when _conc_total > 0 then round(100 * amount / _conc_total, 1) else 0 end) order by amount desc), '[]')
    into _conc
  from (select c.id, c.name, sum(f.amount) amount from public.fin_entries f join public.clients c on c.id = f.client_id
        where f.unit = any(_units) and f.kind = 'entrada' and f.status <> 'cancelado' and f.due_date >= (_m - interval '2 months') and f.due_date < _n
        group by c.id, c.name order by 3 desc limit 5) t;
  if jsonb_array_length(_conc) > 0 then _top1 := (_conc->0->>'pct')::numeric; _top1_name := _conc->0->>'name'; end if;

  -- ---- Inadimplência por mês (6 meses): parte do faturado que atrasou ----
  select jsonb_agg(jsonb_build_object('month', to_char(mo, 'YYYY-MM'), 'billed', billed, 'late', late,
      'pct', case when billed > 0 then round(100 * late / billed, 1) else 0 end) order by mo) into _delinq
  from (
    select g.mo,
      coalesce(sum(f.amount), 0) billed,
      coalesce(sum(f.amount) filter (where (f.status = 'pago' and f.paid_at > f.due_date) or (f.status = 'pendente' and f.due_date < _today)), 0) late
    from (select (_m - make_interval(months => k))::date mo from generate_series(0, 5) k) g
    left join public.fin_entries f on f.unit = any(_units) and f.kind = 'entrada' and f.status <> 'cancelado' and f.source <> 'extrato'
      and f.due_date >= g.mo and f.due_date < g.mo + interval '1 month' and f.due_date <= _today
    group by g.mo
  ) d;

  -- ---- Despesas por categoria (mês × média dos 3 anteriores) ----
  select coalesce(jsonb_agg(jsonb_build_object('category', cat, 'amount', cur, 'avg3', round(avg3, 2)) order by cur desc), '[]') into _expenses
  from (
    select coalesce(c.name, 'Sem categoria') cat,
      coalesce(sum(f.amount) filter (where f.paid_at >= _m and f.paid_at < _n), 0) cur,
      coalesce(sum(f.amount) filter (where f.paid_at >= _m - interval '3 months' and f.paid_at < _m), 0) / 3.0 avg3
    from public.fin_entries f left join public.fin_categories c on c.id = f.category_id
    where f.unit = any(_units) and f.kind = 'saida' and f.status = 'pago' and f.paid_at >= _m - interval '3 months' and f.paid_at < _n
    group by 1
  ) e where cur > 0;

  -- ---- O que fazer agora (candidatos; a tela mostra os 3 de mais dinheiro) ----
  for _r in
    select c.id, c.name, sum(f.amount) amount, _today - min(f.due_date) days
    from public.fin_entries f join public.clients c on c.id = f.client_id
    where f.unit = any(_units) and f.kind = 'entrada' and f.status = 'pendente' and f.due_date < _today
    group by c.id, c.name order by 3 desc limit 3
  loop
    _actions := _actions || jsonb_build_object('key', 'atraso:' || _r.id, 'title', _r.name || ': ' || public.brl(_r.amount) || ' em atraso há ' || _r.days || case when _r.days = 1 then ' dia' else ' dias' end,
      'amount', _r.amount, 'urgent', _r.days > 5, 'to', '/clientes/' || _r.id || '?aba=contrato&acao=cobrar', 'label', 'Cobrar', 'source', 'Faturas vencidas e não pagas');
  end loop;
  select count(*), coalesce(sum(discount), 0) into _cnt, _a from public.delivery_credits where unit = any(_units) and status = 'sugerido';
  if _cnt > 0 then _actions := _actions || jsonb_build_object('key', 'creditos', 'title', _cnt || case when _cnt = 1 then ' crédito para revisar' else ' créditos para revisar' end,
      'amount', _a, 'to', '/financeiro/cobranca', 'label', 'Revisar', 'source', 'Entregas que faltaram no fechamento'); end if;
  select count(*), coalesce(sum(amount), 0), min(due_date) into _cnt, _a, _last from public.fin_entries
    where unit = any(_units) and kind = 'saida' and status = 'pendente' and staff_id is not null and due_date <= _today + 15;
  if _cnt > 0 then _actions := _actions || jsonb_build_object('key', 'equipe', 'title', 'Pagamentos da equipe até ' || to_char(_last, 'DD/MM') || ': ' || public.brl(_a),
      'amount', _a, 'to', '/equipe/membros', 'label', 'Ver equipe', 'source', 'Contas a pagar da equipe'); end if;
  select count(distinct c.id), coalesce(sum(f.amount), 0) into _cnt, _a from public.fin_entries f join public.clients c on c.id = f.client_id
    where f.unit = any(_units) and f.kind = 'entrada' and f.status = 'pendente' and f.due_date >= _today and f.due_date <= _today + 10 and nullif(trim(coalesce(c.document, '')), '') is null;
  if _cnt > 0 then _actions := _actions || jsonb_build_object('key', 'sem_doc', 'title', _cnt || case when _cnt = 1 then ' cliente sem CPF/CNPJ' else ' clientes sem CPF/CNPJ' end || ' com fatura perto de vencer',
      'amount', _a, 'to', '/financeiro/cobranca', 'label', 'Completar', 'source', 'Sem documento o boleto/Pix não sai'); end if;
  if _neg_day is not null then _actions := _actions || jsonb_build_object('key', 'caixa', 'title', 'Caixa fica negativo em ' || to_char(_neg_day, 'DD/MM') || ' (mínimo ' || public.brl(_min) || ')',
      'amount', abs(_min), 'urgent', _neg_day <= _today + 30, 'to', '/financeiro/caixa', 'label', 'Ver Caixa', 'source', 'Caixa projetado 90 dias'); end if;
  if exists (select 1 from jsonb_array_elements(_reasons) x where x->>'key' = 'extrato') then
    _actions := _actions || jsonb_build_object('key', 'extrato', 'title', (select x->>'text' from jsonb_array_elements(_reasons) x where x->>'key' = 'extrato' limit 1),
      'amount', 0, 'to', '/financeiro/caixa', 'label', 'Importar', 'source', 'Selo de confiança');
  end if;
  select coalesce(jsonb_agg(x order by (x->>'amount')::numeric desc), '[]') into _actions from jsonb_array_elements(_actions) x;

  -- ---- Inteligência sem IA: ritmo, gastos, lucro, gargalos e dicas ----
  if _cur and _exp_to_date > 0 then
    _insights := _insights || jsonb_build_object('kind', 'ritmo', 'tone', case when _received >= _exp_to_date * 0.9 then 'ok' else 'warn' end,
      'title', 'Ritmo do mês: recebido ' || round(100 * _received / _exp_to_date) || '% do que venceu até hoje',
      'value', round(100 * _received / _exp_to_date), 'source', public.brl(_received) || ' de ' || public.brl(_exp_to_date) || ' (vencimentos de 01 até hoje)',
      'to', '/financeiro/cobranca', 'label', 'Ver Cobrança');
  end if;
  if _goal is not null then
    _insights := _insights || jsonb_build_object('kind', 'ritmo', 'tone', case when _received >= _goal then 'ok' else 'neutral' end,
      'title', case when _received >= _goal then 'Meta do mês batida' else 'Faltam ' || public.brl(_goal - _received) || ' para a meta' end,
      'value', round(100 * _received / _goal), 'source', 'Meta ' || public.brl(_goal) || ' · recebido ' || public.brl(_received), 'to', null, 'label', null);
  end if;
  for _r in select x->>'category' cat, (x->>'amount')::numeric cur, (x->>'avg3')::numeric avg3 from jsonb_array_elements(_expenses) x
            where (x->>'avg3')::numeric > 0 and (x->>'amount')::numeric > 1.3 * (x->>'avg3')::numeric order by (x->>'amount')::numeric - (x->>'avg3')::numeric desc limit 2
  loop
    _insights := _insights || jsonb_build_object('kind', 'gasto', 'tone', 'warn', 'title', 'Gastando muito com ' || _r.cat || ': ' || public.brl(_r.cur),
      'value', _r.cur, 'source', '+' || round(100 * (_r.cur - _r.avg3) / _r.avg3) || '% sobre a média de 3 meses (' || public.brl(_r.avg3) || ')', 'to', '/financeiro/caixa', 'label', 'Ver saídas');
  end loop;
  select coalesce(sum(amount), 0) into _team from public.fin_entries where unit = any(_units) and kind = 'saida' and status = 'pago' and staff_id is not null and paid_at >= _m and paid_at < _n;
  if _received > 0 and _team > 0.5 * _received then
    _insights := _insights || jsonb_build_object('kind', 'gasto', 'tone', 'warn', 'title', 'Equipe custou ' || round(100 * _team / _received) || '% do recebido',
      'value', _team, 'source', public.brl(_team) || ' pagos à equipe no mês (alerta acima de 50%)', 'to', '/equipe/membros', 'label', 'Ver equipe');
  end if;
  select coalesce(sum(discount), 0) into _credits from public.delivery_credits where unit = any(_units) and month = _m and status not in ('dispensado', 'sugerido');
  if _credits > 0 then
    _insights := _insights || jsonb_build_object('kind', 'gasto', 'tone', 'warn', 'title', 'Entregas que faltaram custaram ' || public.brl(_credits),
      'value', _credits, 'source', 'Créditos e descontos por erro nosso no mês', 'to', '/financeiro/cobranca', 'label', 'Ver créditos');
  end if;
  if jsonb_array_length(_by_area) > 0 then
    _a := (select sum((x->>'amount')::numeric) from jsonb_array_elements(_by_area) x);
    _insights := _insights || jsonb_build_object('kind', 'lucro', 'tone', 'ok',
      'title', 'Lucrando com ' || (select case _by_area->0->>'area' when 'social' then 'Social' when 'design' then 'Design' when 'trafego' then 'Tráfego'
          when 'audiovisual' then 'Audiovisual' when 'consultoria' then 'Consultoria' when 'sistemas' then 'Sistemas e CRM' when 'comercial' then 'Comercial'
          when 'licitacao' then 'Licitações' else 'Outros' end) || ': ' || round(100 * (_by_area->0->>'amount')::numeric / nullif(_a, 0)) || '% da receita',
      'value', (_by_area->0->>'amount')::numeric, 'source', public.brl((_by_area->0->>'amount')::numeric) || ' nas faturas do mês (custo por área ainda não medido)', 'to', null, 'label', null);
  end if;
  if _top1 > 20 then
    _insights := _insights || jsonb_build_object('kind', 'gargalo', 'tone', 'warn', 'title', 'Receita concentrada: ' || _top1_name || ' é ' || round(_top1) || '% do faturado',
      'value', _top1, 'source', 'Últimos 3 meses (risco acima de 20%). Dica: prospectar o segmento dos melhores clientes.', 'to', '/comercial', 'label', 'Prospectar');
  end if;
  select round(avg(paid_at - due_date), 1) into _avg_delay from public.fin_entries
    where unit = any(_units) and kind = 'entrada' and status = 'pago' and source <> 'extrato' and paid_at >= _today - 90;
  if _avg_delay > 3 then
    _insights := _insights || jsonb_build_object('kind', 'gargalo', 'tone', 'warn', 'title', 'Clientes pagam em média ' || _avg_delay || ' dias depois do vencimento',
      'value', _avg_delay, 'source', 'Pagamentos dos últimos 90 dias (bom: até 3 dias)', 'to', '/financeiro/cobranca', 'label', 'Ver Cobrança');
  end if;
  for _r in
    select c.id, c.name, count(distinct date_trunc('month', f.due_date)) months
    from public.fin_entries f join public.clients c on c.id = f.client_id
    where f.unit = any(_units) and f.kind = 'entrada' and f.status <> 'cancelado' and f.source <> 'extrato' and f.due_date >= _today - 180 and f.due_date < _today
      and ((f.status = 'pago' and f.paid_at > f.due_date + 3) or f.status = 'pendente')
    group by c.id, c.name having count(distinct date_trunc('month', f.due_date)) >= 2 order by 3 desc limit 1
  loop
    _insights := _insights || jsonb_build_object('kind', 'dica', 'tone', 'neutral', 'title', _r.name || ' atrasou em ' || _r.months || ' meses: propor cartão recorrente ou pré-pago',
      'value', _r.months, 'source', 'Faturas pagas com mais de 3 dias de atraso ou em aberto (6 meses)', 'to', '/clientes/' || _r.id || '?aba=contrato', 'label', 'Abrir cliente');
  end loop;
  if _neg_day is not null then
    _insights := _insights || jsonb_build_object('kind', 'dica', 'tone', 'warn', 'title', 'Caixa projetado negativo em ' || to_char(_neg_day, 'DD/MM') || ': antecipar cobranças ou adiar despesas',
      'value', _min, 'source', 'Caixa projetado 90 dias', 'to', '/financeiro/caixa', 'label', 'Ver Caixa');
  end if;
  for _r in
    select c.id, c.name, k.start_date from public.client_contracts k join public.clients c on c.id = k.client_id
    where c.is_active and not coalesce(c.is_lost, false) and k.start_date <= _today - 365
      and exists (select 1 from public.fin_mrr_rows(_m) r where r.client_id = c.id and r.unit = any(_units))
    order by k.start_date limit 1
  loop
    _insights := _insights || jsonb_build_object('kind', 'dica', 'tone', 'neutral', 'title', _r.name || ': contrato com mais de 12 meses, sugerir reajuste (IPCA)',
      'value', (_today - _r.start_date) / 30, 'source', 'Início do contrato em ' || to_char(_r.start_date, 'DD/MM/YYYY'), 'to', '/financeiro/contratos?cliente=' || _r.id, 'label', 'Ver contrato');
  end loop;

  -- ---- Tabela por cliente ----
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'mrr', mrr, 'paid3', paid3, 'overdue', overdue, 'days', days, 'nps', nps,
      'risk', case when overdue > 0 and days > 30 then 'alto' when overdue > 0 or coalesce(nps, 10) <= 6 then 'medio' else 'baixo' end) order by overdue desc, mrr desc), '[]')
    into _clients
  from (
    select c.id, c.name, c.nps,
      coalesce((select sum(r.amount) from public.fin_mrr_rows(_m) r where r.client_id = c.id and r.unit = any(_units)), 0) mrr,
      coalesce((select sum(f.amount) from public.fin_entries f where f.client_id = c.id and f.unit = any(_units) and f.kind = 'entrada' and f.status = 'pago' and f.paid_at >= _m - interval '2 months' and f.paid_at < _n), 0) paid3,
      coalesce((select sum(f.amount) from public.fin_entries f where f.client_id = c.id and f.unit = any(_units) and f.kind = 'entrada' and f.status = 'pendente' and f.due_date < _today), 0) overdue,
      coalesce((select _today - min(f.due_date) from public.fin_entries f where f.client_id = c.id and f.unit = any(_units) and f.kind = 'entrada' and f.status = 'pendente' and f.due_date < _today), 0) days
    from public.clients c
    where exists (select 1 from public.fin_mrr_rows(_m) r where r.client_id = c.id and r.unit = any(_units))
       or exists (select 1 from public.fin_entries f where f.client_id = c.id and f.unit = any(_units) and f.kind = 'entrada' and f.status <> 'cancelado' and f.due_date >= _m - interval '2 months')
  ) t;

  return jsonb_build_object(
    'unit', coalesce(_unit, 'juntas'), 'units', to_jsonb(_units), 'month', to_char(_m, 'YYYY-MM'), 'today', _today, 'is_current', _cur,
    'cards', jsonb_build_object(
      'received', _received, 'received_prev', _received_prev,
      'received_delta_pct', case when _received_prev > 0 then round(100 * (_received - _received_prev) / _received_prev, 1) end,
      'expected', _expected, 'to_receive', _to_receive, 'to_receive_n', _to_receive_n,
      'overdue', _overdue, 'overdue_clients', _overdue_clients, 'overdue_max_days', _overdue_max,
      'income', _received, 'expenses_paid', _exp_paid, 'expenses_open', _exp_open,
      'result', _result, 'margin_pct', case when _received > 0 then round(100 * _result / _received, 1) end,
      'goal', _goal, 'goal_pct', case when _goal > 0 then round(100 * _received / _goal, 1) end,
      'mrr', coalesce((select sum(amount) from public.fin_mrr_rows(_m) where unit = any(_units)), 0)),
    'goals', coalesce((select jsonb_object_agg(unit, target) from public.fin_goals where unit = any(_units)), '{}'),
    'trust', jsonb_build_object('pct', _score, 'reasons', _reasons, 'checks', _check, 'no_profit', _no_profit),
    'actions', _actions,
    'series', coalesce(_series, '[]'),
    'cash', _cash,
    'by_area', _by_area,
    'concentration', jsonb_build_object('top', _conc, 'total', _conc_total, 'top1_pct', _top1,
      'top5_pct', case when _conc_total > 0 then round(100 * (select sum((x->>'amount')::numeric) from jsonb_array_elements(_conc) x) / _conc_total, 1) else 0 end),
    'delinquency', coalesce(_delinq, '[]'),
    'expenses', _expenses,
    'insights', _insights,
    'clients', _clients
  );
end $$;
revoke all on function public.fin_dashboard(text, date) from public, anon;
grant execute on function public.fin_dashboard(text, date) to authenticated;
