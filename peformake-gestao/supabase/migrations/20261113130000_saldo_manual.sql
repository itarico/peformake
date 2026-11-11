-- Saldo manual e estimado.
-- Desde 04/11/2026 a Graph API da Meta devolve "API access blocked" e o conector Ads MCP não traz saldo.
-- Enquanto o app da Meta não for desbloqueado, a equipe informa o saldo (traffic_set_balance) e o sistema estima
-- o saldo de agora: saldo lido - gasto desde a leitura (dias depois do dia da leitura inteiros; o dia da leitura
-- conta pela metade, porque parte do gasto daquele dia já estava descontada quando o saldo foi lido).
-- Leitura com até 24 h vale como está; depois disso é estimativa. Alerta e tarefa de recarga só com leitura de até 48 h.
-- A mesma regra está no front em src/features/traffic/balanceRules.ts (describeBalance).

-- 1. Saldo de agora (estimado quando a leitura passou de 24 h). Nulo sem saldo ou com leitura mais velha que _max_age.
create or replace function public.traffic_balance_now(_account_id text, _max_age interval default interval '14 days')
returns bigint
language sql
stable
set search_path to ''
as $$
  select case
    when st.read_at > now() - interval '24 hours' then st.available_cents
    else st.available_cents - coalesce((
      select round(sum(case when m.day = (st.read_at at time zone 'America/Sao_Paulo')::date then m.spend_cents / 2.0 else m.spend_cents end))::bigint
      from public.traffic_daily_metrics m
      where m.account_id = st.account_id and m.day >= (st.read_at at time zone 'America/Sao_Paulo')::date
    ), 0)
  end
  from public.traffic_account_status st
  where st.account_id = _account_id and st.available_cents is not null and st.read_at > now() - _max_age;
$$;

-- 2. Equipe informa o saldo visto no Gerenciador da Meta.
create or replace function public.traffic_set_balance(_account_id text, _available_cents bigint)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  _threshold bigint;
begin
  if not public.can_access_traffic() then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  if _available_cents is null or _available_cents < 0 or _available_cents > 100000000 then
    raise exception 'Valor de saldo inválido' using errcode = '22023';
  end if;
  if not exists (select 1 from public.ad_accounts where id = _account_id) then
    raise exception 'Conta não encontrada' using errcode = 'P0002';
  end if;

  insert into public.traffic_account_status (account_id, is_prepaid, available_cents, funding_text, read_at)
  values (_account_id, true, _available_cents, 'Saldo informado pela equipe', now())
  on conflict (account_id) do update set
    is_prepaid = true, available_cents = excluded.available_cents, funding_text = excluded.funding_text, read_at = now();

  -- Recarga feita: fecha o alerta de saldo baixo aberto dessa conta.
  select balance_alert_cents into _threshold from public.traffic_settings where id;
  if _threshold is not null and _available_cents >= _threshold then
    update public.traffic_alerts set resolved_at = now(), resolved_by = (select auth.uid())
    where account_id = _account_id and kind = 'low_balance' and resolved_at is null;
  end if;
end;
$$;

revoke all on function public.traffic_set_balance(text, bigint) from public, anon;
grant execute on function public.traffic_set_balance(text, bigint) to authenticated, service_role;

-- 3. Alertas: saldo baixo só com leitura de até 48 h, usando o saldo estimado quando a leitura passou de 24 h.
create or replace function public.traffic_detect_alerts(_today date)
returns integer
language plpgsql
set search_path to ''
as $function$
declare
  _s public.traffic_settings;
  _count integer;
begin
  if not public.traffic_automation_on('alertas') then return 0; end if;
  select * into _s from public.traffic_settings where id;

  with balances as (
    select a.id as account_id, a.name, st.read_at, public.traffic_balance_now(a.id, interval '48 hours') as now_cents
    from public.ad_accounts a join public.traffic_account_status st on st.account_id = a.id
    where a.enabled and st.available_cents is not null and st.read_at > now() - interval '48 hours'
  ),
  candidates as (
    select b.account_id, 'low_balance' as kind, _today as day, b.now_cents as value_cents, _s.balance_alert_cents as threshold_cents,
      case when b.read_at > now() - interval '24 hours'
        then 'Saldo baixo: restam ' || public.brl_text(b.now_cents) || ' na conta ' || b.name
        else 'Saldo pode estar acabando: cerca de ' || public.brl_text(greatest(b.now_cents, 0)) || ' (estimativa) na conta ' || b.name || '. Confira na Meta.'
      end as message
    from balances b
    where b.now_cents is not null and b.now_cents < _s.balance_alert_cents
    union all
    select a.id, 'account_problem', _today, null, null,
      'Conta ' || a.name || ' com restrição na Meta (status ' || st.account_status || ')'
    from public.ad_accounts a join public.traffic_account_status st on st.account_id = a.id and st.read_at > now() - interval '3 days'
    where a.enabled and st.account_status is not null and st.account_status <> 1
    union all
    select m.account_id, 'daily_spend', m.day, m.spend_cents, _s.daily_spend_alert_cents,
      'Gasto alto: ' || public.brl_text(m.spend_cents) || ' em um dia na conta ' || a.name
    from public.traffic_daily_metrics m join public.ad_accounts a on a.id = m.account_id
    where a.enabled and _s.daily_spend_alert_cents > 0 and m.day between _today - 1 and _today
      and m.spend_cents >= _s.daily_spend_alert_cents
    union all
    select m.account_id, 'spend_spike', m.day, m.spend_cents, round(h.avg_cents * _s.spike_multiplier)::bigint,
      'Gasto fora do padrão: ' || public.brl_text(m.spend_cents) || ' contra média de '
        || public.brl_text(round(h.avg_cents)::bigint) || ' por dia na conta ' || a.name
    from public.traffic_daily_metrics m
    join public.ad_accounts a on a.id = m.account_id
    cross join lateral (
      select avg(p.spend_cents) avg_cents, count(*) n
      from public.traffic_daily_metrics p
      where p.account_id = m.account_id and p.day between m.day - 7 and m.day - 1 and p.spend_cents > 0
    ) h
    where a.enabled and m.day between _today - 1 and _today and h.n >= 3
      and m.spend_cents >= 5000 and m.spend_cents >= h.avg_cents * _s.spike_multiplier
  ),
  inserted as (
    insert into public.traffic_alerts (account_id, kind, day, value_cents, threshold_cents, message)
    select account_id, kind, day, value_cents, threshold_cents, message from candidates
    on conflict (account_id, kind, day) do nothing
    returning 1
  )
  select count(*) into _count from inserted;
  return _count;
end;
$function$;

-- 4. Tarefa "Recarregar saldo": mesma regra (leitura de até 48 h, saldo estimado).
create or replace function public.traffic_scan_ads(_today date)
returns integer
language plpgsql
set search_path to ''
as $function$
declare
  _r record;
  _count integer := 0;
  _id uuid;
  _pilot boolean := public.traffic_automation_on('piloto');
  _limit bigint := coalesce((select (params ->> 'pause_min_cents')::bigint from public.traffic_automations where key = 'piloto'), 3000);
begin
  for _r in
    with ad7 as (
      select e.id, e.name, e.account_id, a.client_id, a.name account_name,
        sum(d.spend_cents) spend, sum(d.results) results, sum(d.impressions) impressions, sum(d.reach) reach,
        sum(d.spend_cents) filter (where d.day > _today - 3) spend3, sum(d.results) filter (where d.day > _today - 3) results3
      from public.traffic_entities e
      join public.ad_accounts a on a.id = e.account_id and a.enabled
      join public.traffic_entity_daily d on d.entity_id = e.id and d.day > _today - 7 and d.day <= _today
      where e.level = 'ad' and e.effective_status = 'ACTIVE'
      group by e.id, e.name, e.account_id, a.client_id, a.name
    ),
    acc as (select account_id, sum(spend) spend, sum(results) results from ad7 group by account_id)
    select ad7.*, acc.spend acc_spend, acc.results acc_results from ad7 join acc using (account_id)
  loop
    _id := null;
    if coalesce(_r.spend3, 0) >= 3000 and coalesce(_r.results3, 0) = 0 then
      begin
        _id := public.agent_propose_action(_r.id, 'set_status', 'PAUSED',
          'Conta ' || _r.account_name || '. Gastou ' || public.brl_text(_r.spend3) || ' nos últimos 3 dias sem nenhuma conversa ou cadastro.');
        update public.traffic_tasks set priority = 'high' where id = _id and action_status = 'waiting_approval';
        if _pilot and _r.spend3 >= _limit then
          update public.traffic_tasks set action_status = 'queued', approved_at = now(),
            action_summary = 'Piloto automático: ' || action_summary, updated_at = now()
          where id = _id and action_status = 'waiting_approval';
        end if;
        _count := _count + 1;
      exception when others then null;
      end;
    elsif _r.results > 0 and _r.acc_results > 0 and _r.spend >= 3000
      and (_r.spend::numeric / _r.results) >= 2 * (_r.acc_spend::numeric / _r.acc_results) then
      begin
        perform public.agent_propose_action(_r.id, 'set_status', 'PAUSED',
          'Conta ' || _r.account_name || '. Custo por resultado de ' || public.brl_text(round(_r.spend::numeric / _r.results)::bigint)
            || ' contra ' || public.brl_text(round(_r.acc_spend::numeric / _r.acc_results)::bigint) || ' na média da conta (7 dias).');
        _count := _count + 1;
      exception when others then null;
      end;
    end if;

    if _r.reach > 0 and _r.impressions::numeric / _r.reach >= 3.5 then
      begin
        perform public.agent_task_create(jsonb_build_object(
          'title', 'Trocar criativo cansado: ' || left(_r.name, 120),
          'description', 'Conta ' || _r.account_name || '. Frequência de ' || round(_r.impressions::numeric / _r.reach, 1)
            || ' em 7 dias: o mesmo público está vendo o anúncio muitas vezes.',
          'source', 'agent', 'priority', 'normal', 'category', 'criativo', 'client_id', _r.client_id,
          'dedupe_key', 'fatigue:' || _r.id));
        _count := _count + 1;
      exception when unique_violation then null;
      end;
    end if;
  end loop;

  for _r in
    select a.id, a.name, a.client_id, st.read_at, public.traffic_balance_now(a.id, interval '48 hours') available_cents,
      (select avg(m.spend_cents) from public.traffic_daily_metrics m
        where m.account_id = a.id and m.day between _today - 7 and _today - 1 and m.spend_cents > 0) avg_cents
    from public.ad_accounts a join public.traffic_account_status st on st.account_id = a.id
    where a.enabled and st.is_prepaid and st.available_cents is not null and st.read_at > now() - interval '48 hours'
  loop
    if _r.available_cents is not null and _r.avg_cents > 0 and _r.available_cents / _r.avg_cents <= 3 then
      begin
        perform public.agent_task_create(jsonb_build_object(
          'title', 'Recarregar saldo: ' || _r.name,
          'description', case when _r.read_at > now() - interval '24 hours'
            then 'Restam ' || public.brl_text(_r.available_cents)
            else 'Restam cerca de ' || public.brl_text(greatest(_r.available_cents, 0)) || ' (estimativa, confira na Meta)'
          end || ', cerca de ' || greatest(floor(_r.available_cents / _r.avg_cents), 0)
            || ' dia(s) no ritmo atual. Combine a recarga com o cliente.',
          'source', 'alert', 'priority', 'high', 'category', 'atendimento', 'client_id', _r.client_id, 'due_date', _today,
          'dedupe_key', 'balance:' || _r.id));
        _count := _count + 1;
      exception when unique_violation then null;
      end;
    end if;
  end loop;
  return _count;
end $function$;

-- 5. Agente de tráfego (rotina diária): recebe o saldo de agora e se é estimativa.
create or replace function public.agent_client_snapshot(_client_id uuid, _today date)
returns jsonb
language sql
stable
set search_path to ''
as $function$
  select jsonb_build_object(
    'client_id', c.id,
    'name', c.name,
    'segment', c.segment,
    'month_plan', (
      select jsonb_build_object('objectives', p.objectives, 'priority_products', p.priority_products, 'budget', p.budget,
        'important_dates', p.important_dates, 'new_offers', p.new_offers, 'status', p.status)
      from public.client_monthly_plans p where p.client_id = c.id and p.month = date_trunc('month', _today)::date
    ),
    'accounts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'account_id', a.id, 'name', a.name,
        'available_cents', s.available_cents, 'is_prepaid', s.is_prepaid, 'funding_text', s.funding_text, 'status_read_at', s.read_at,
        'balance_now_cents', public.traffic_balance_now(a.id),
        'balance_is_estimate', s.read_at is not null and s.read_at <= now() - interval '24 hours',
        'last7', public.agent_account_period(a.id, _today - 7, _today - 1),
        'prev7', public.agent_account_period(a.id, _today - 14, _today - 8),
        'yesterday', public.agent_account_period(a.id, _today - 1, _today - 1),
        'today', public.agent_account_period(a.id, _today, _today)
      ) order by a.name)
      from public.ad_accounts a left join public.traffic_account_status s on s.account_id = a.id
      where a.client_id = c.id and a.enabled
    ), '[]'::jsonb),
    'ads_last7', public.agent_ads_period(c.id, _today - 7, _today - 1, 20)
  )
  from public.clients c where c.id = _client_id;
$function$;

-- 6. Texto da rotina diária: usar o saldo de agora, não o lido.
update public.agent_instructions
set body = replace(body,
  '1. **Saldo**: conta pré-paga com `available_cents` abaixo de 3 dias do gasto médio dos últimos 7 dias.',
  '1. **Saldo**: conta pré-paga com `balance_now_cents` abaixo de 3 dias do gasto médio dos últimos 7 dias.' || chr(10)
    || '   - `available_cents` é o saldo da última leitura (`status_read_at`). Se `balance_is_estimate` for verdadeiro, `balance_now_cents` é estimativa (saldo lido menos o gasto desde então): escreva "cerca de" e peça para conferir na Meta.' || chr(10)
    || '   - `balance_now_cents` vazio: saldo sem leitura recente. Não afirme saldo; no máximo recomende conferir o saldo na Meta.'),
  updated_at = now()
where name = 'trafego-diario' and body not like '%balance_now_cents%';
