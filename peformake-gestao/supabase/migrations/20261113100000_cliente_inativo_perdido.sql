-- Cliente ativo, esfriando, inativo e sugestão de perdido.
-- Avulso: ativo = comprou em até 90 dias; esfriando = 91 a 180; inativo = mais de 180 (automático e reversível).
--   Compra = serviço lançado (mês de cobrança) ou fatura avulsa/manual não cancelada. Sem compra: vale a data de cadastro.
--   Inativo automático vira "Pausado" (is_active = false). Se comprar de novo, volta a ativo sozinho.
--   Quem foi pausado à mão continua pausado (só o automático é desfeito).
-- Recorrente: 60 dias sem nenhum serviço ativo => SUGERE "perdido" (aviso para a diretoria). Nunca marca sozinho.
-- "Perdido" só à mão, com motivo (client_set_status, já existente).

alter table public.clients add column if not exists activity_status text
  check (activity_status in ('ativo', 'esfriando', 'inativo'));
alter table public.clients add column if not exists last_purchase_on date;
alter table public.clients add column if not exists no_service_since date;
alter table public.clients add column if not exists lost_suggested_at timestamptz;
alter table public.clients add column if not exists lost_suggest_dismissed_at timestamptz;

comment on column public.clients.activity_status is 'Só avulso: ativo (compra em 90 dias), esfriando (91-180), inativo (180+). Calculado por client_activity_refresh.';
comment on column public.clients.no_service_since is 'Só recorrente: desde quando está sem nenhum serviço ativo.';
comment on column public.clients.lost_suggested_at is 'Recorrente: quando o sistema sugeriu marcar como perdido (60 dias sem serviço).';

-- Datas de compra de cada cliente (uma por dia: venda que lança serviço e fatura no mesmo dia conta uma vez).
create or replace function public.client_purchase_dates()
returns table (client_id uuid, d date) language sql stable set search_path to '' as $function$
  select distinct x.client_id, x.d from (
    select cs.client_id, coalesce(cs.billing_month, cs.legacy_created_at::date, cs.created_at::date) as d from public.client_services cs
    union all
    select i.client_id, i.created_at::date from public.invoices i where i.source in ('avulso', 'manual') and i.status <> 'cancelado'
  ) x where x.client_id is not null and x.d is not null and x.d <= current_date
$function$;
revoke execute on function public.client_purchase_dates() from public, anon, authenticated;

-- Recalcula a situação (um cliente ou todos). Devolve quantos clientes mudaram.
create or replace function public.client_activity_refresh(_client uuid default null)
returns integer language plpgsql security definer set search_path to '' as $function$
declare
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  _n int := 0; _k int; _r record;
begin
  -- Avulsos
  with p as (
    select pd.client_id, max(pd.d) as last from public.client_purchase_dates() pd
    where _client is null or pd.client_id = _client group by 1
  ), calc as (
    select c.id, p.last,
      case when _today - coalesce(p.last, c.legacy_created_at::date, c.sourced_at, c.synced_at::date, _today) <= 90 then 'ativo'
           when _today - coalesce(p.last, c.legacy_created_at::date, c.sourced_at, c.synced_at::date, _today) <= 180 then 'esfriando'
           else 'inativo' end as st
    from public.clients c left join p on p.client_id = c.id
    where c.client_type = 'one-off' and not c.is_lost and (_client is null or c.id = _client)
  )
  update public.clients c set
    activity_status = calc.st,
    last_purchase_on = calc.last,
    is_active = case when calc.st = 'inativo' and c.activity_status is distinct from 'inativo' and c.is_active then false
                     when calc.st <> 'inativo' and c.activity_status = 'inativo' and not c.is_active then true
                     else c.is_active end
  from calc
  where c.id = calc.id and (c.activity_status is distinct from calc.st or c.last_purchase_on is distinct from calc.last);
  get diagnostics _k = row_count; _n := _n + _k;

  -- Recorrentes: marca desde quando está sem serviço ativo; limpa quando volta a ter.
  update public.clients c set no_service_since = null, lost_suggested_at = null, lost_suggest_dismissed_at = null
  where coalesce(c.client_type, 'recurring') <> 'one-off' and (_client is null or c.id = _client)
    and (c.no_service_since is not null or c.lost_suggested_at is not null)
    and exists (select 1 from public.client_services cs where cs.client_id = c.id and cs.is_active);
  get diagnostics _k = row_count; _n := _n + _k;

  update public.clients c set no_service_since = _today
  where coalesce(c.client_type, 'recurring') <> 'one-off' and c.is_active and not c.is_lost and c.no_service_since is null
    and (_client is null or c.id = _client)
    and not exists (select 1 from public.client_services cs where cs.client_id = c.id and cs.is_active);
  get diagnostics _k = row_count; _n := _n + _k;

  -- 60 dias sem serviço: sugere perdido uma vez (aviso só para a equipe; nada vai para o cliente).
  for _r in
    select c.id, c.name, c.no_service_since from public.clients c
    where coalesce(c.client_type, 'recurring') <> 'one-off' and c.is_active and not c.is_lost
      and c.no_service_since <= _today - 60 and c.lost_suggested_at is null and c.lost_suggest_dismissed_at is null
      and (_client is null or c.id = _client)
  loop
    update public.clients set lost_suggested_at = now() where id = _r.id;
    perform public.notify(array(select ur.user_id from public.user_roles ur where ur.role = 'admin'), 'client_lost_suggest',
      'Cliente sem serviço há 60 dias',
      _r.name || ': nenhum serviço ativo desde ' || to_char(_r.no_service_since, 'DD/MM/YYYY') || '. Se ele saiu, marque como perdido com o motivo. Se não, dispense o aviso no Resumo de Clientes.',
      '/clientes/' || _r.id || '?aba=arquivos', _r.id);
    _n := _n + 1;
  end loop;
  return _n;
end $function$;
revoke execute on function public.client_activity_refresh(uuid) from public, anon, authenticated;

-- Comprou de novo (serviço ou fatura): recalcula na hora, sem esperar a rotina do dia.
create or replace function public.client_activity_touch()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  perform public.client_activity_refresh(coalesce(new.client_id, old.client_id));
  return null;
exception when others then
  return null; -- nunca impede salvar o serviço ou a fatura
end $function$;

create or replace trigger client_activity_on_service after insert or update of is_active, billing_month or delete on public.client_services
  for each row execute function public.client_activity_touch();
create or replace trigger client_activity_on_invoice after insert or update of status on public.invoices
  for each row when (pg_trigger_depth() < 2) execute function public.client_activity_touch();

-- "Não é perdido": dispensa a sugestão até o cliente voltar a ter serviço e ficar sem de novo.
create or replace function public.client_lost_suggest_dismiss(_client_id uuid)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  perform public.clients_require_manager();
  update public.clients set lost_suggest_dismissed_at = now() where id = _client_id;
end $function$;
grant execute on function public.client_lost_suggest_dismiss(uuid) to authenticated;

insert into public.notification_rules (kind, category, name, description, audience, in_app, whatsapp_client, position, email)
values ('client_lost_suggest', 'clientes', 'Cliente sem serviço há 60 dias', 'Sugestão de marcar como perdido. O sistema nunca marca sozinho.', 'equipe', true, false, 223, false)
on conflict (kind) do nothing;

-- Rotina diária (06:50 de Brasília).
select cron.schedule('client-activity', '50 9 * * *', $$ select public.client_activity_refresh(); $$);

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job)
values ('cli_atividade', 'clientes', 3, 'Avulso esfriando e recorrente sem serviço',
  'Avulso sem compra há 91 a 180 dias fica "esfriando" (hora de oferecer de novo); com mais de 180 dias vira pausado e volta sozinho se comprar. Recorrente 60 dias sem serviço ativo gera sugestão de perdido.',
  'Não usa IA e não manda nada para o cliente. "Perdido" continua sendo marcado à mão, com motivo.',
  'Todo dia, 06:50', false, 'baixo', 'client-activity')
on conflict (key) do update set title = excluded.title, what = excluded.what, how = excluded.how, schedule = excluded.schedule, cron_job = excluded.cron_job;

select public.client_activity_refresh();

-- Resumo de Clientes: tempo de casa com 1-2 anos e 2+ anos; sugestões de perdido.
create or replace function public.dash_clients()
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
begin
  if not (public.can_access_traffic() or public.can_access_content() or public.can_access_commercial()) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  return (
    with base as (
      select c.id, c.name, c.is_active, c.is_lost, c.lost_at::date as lost_on, c.lost_reason, c.nps,
        c.no_service_since, c.lost_suggested_at, c.lost_suggest_dismissed_at,
        coalesce(k.start_date, c.legacy_created_at::date) as started_on, k.end_date
      from public.clients c left join public.client_contracts k on k.client_id = c.id
      where coalesce(c.client_type, 'recurring') <> 'one-off'
    ),
    months as (
      select (date_trunc('month', current_date) - make_interval(months => g))::date as m from generate_series(0, 11) g
    ),
    flow as (
      select m,
        (select count(*) from base where started_on < m and (lost_on is null or lost_on >= m)) as at_start,
        (select count(*) from base where started_on >= m and started_on < (m + interval '1 month')) as joined,
        (select count(*) from base where lost_on >= m and lost_on < (m + interval '1 month')) as left_n
      from months
    ),
    active as (select * from base where is_active and not is_lost),
    nps_answers as (
      select score from public.crm_nps where score is not null and answered_at > now() - interval '180 days'
      union all
      select nps from base where nps is not null and is_active and not is_lost
        and not exists (select 1 from public.crm_nps n where n.client_id = base.id and n.score is not null)
    )
    select jsonb_build_object(
      'active', (select count(*) from active),
      'one_off_active', (select count(*) from public.clients c where c.is_active and not c.is_lost and c.client_type = 'one-off'),
      'lost_90d', (select count(*) from base where is_lost and lost_on > current_date - 90),
      'health', coalesce((select jsonb_object_agg(level, n) from (
        select l.level, count(*) n from active c
        join lateral (select level from public.client_assessments a where a.client_id = c.id order by assessed_at desc limit 1) l on true
        group by l.level) h), '{}'::jsonb),
      'unassessed', (select count(*) from active c
                     where not exists (select 1 from public.client_assessments a where a.client_id = c.id and a.assessed_at > now() - interval '45 days')),
      'services', coalesce((select jsonb_agg(x order by x.n desc) from (
        select s.name, count(distinct cs.client_id) n from public.client_services cs join public.services s on s.id = cs.service_id
        join active c on c.id = cs.client_id
        where cs.is_active group by s.name order by n desc limit 8) x), '[]'::jsonb),
      'flow', coalesce((select jsonb_agg(jsonb_build_object('month', m, 'at_start', at_start, 'joined', joined, 'left', left_n) order by m) from flow), '[]'::jsonb),
      'tenure', jsonb_build_object(
        'avg_months', (select round(avg((current_date - started_on) / 30.44)::numeric, 1) from active where started_on is not null),
        'lost_avg_months', (select round(avg((lost_on - started_on) / 30.44)::numeric, 1) from base where is_lost and lost_on is not null and started_on is not null),
        'buckets', jsonb_build_object(
          'lt3', (select count(*) from active where started_on > current_date - 91),
          '3to6', (select count(*) from active where started_on <= current_date - 91 and started_on > current_date - 183),
          '6to12', (select count(*) from active where started_on <= current_date - 183 and started_on > current_date - 365),
          '12to24', (select count(*) from active where started_on <= current_date - 365 and started_on > current_date - 730),
          'gt24', (select count(*) from active where started_on <= current_date - 730),
          'gt12', (select count(*) from active where started_on <= current_date - 365),
          'unknown', (select count(*) from active where started_on is null))
      ),
      'renewals_60d', (select count(*) from active where end_date between current_date and current_date + 60),
      'nps', jsonb_build_object(
        'answers', (select count(*) from nps_answers),
        'promoters', (select count(*) from nps_answers where score >= 9),
        'neutral', (select count(*) from nps_answers where score between 7 and 8),
        'detractors', (select count(*) from nps_answers where score <= 6)
      ),
      'lost_reasons', coalesce((select jsonb_agg(x order by x.n desc) from (
        select coalesce(nullif(trim(lost_reason), ''), 'Sem motivo registrado') as reason, count(*) n
        from base where is_lost and lost_on > current_date - 365 group by 1 order by 2 desc limit 6) x), '[]'::jsonb),
      'lost_suggested', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'since', no_service_since) order by no_service_since)
        from active where lost_suggested_at is not null and lost_suggest_dismissed_at is null), '[]'::jsonb)
    )
  );
end;
$function$;

-- Clientes → Resumo: base de avulsos com frequência, recência e quem está esfriando.
create or replace function public.dash_clients_avulsos()
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare _admin boolean := public.has_role('admin');
begin
  if not (public.can_access_traffic() or public.can_access_content() or public.can_access_commercial()) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  return (
    with cl as (
      select c.id, c.name, c.is_lost, c.activity_status, coalesce(c.legacy_created_at::date, c.synced_at::date) as since
      from public.clients c where c.client_type = 'one-off'
    ),
    pd as (select p.client_id, p.d from public.client_purchase_dates() p join cl on cl.id = p.client_id),
    per as (select client_id, count(*) n, max(d) last from pd group by 1),
    live as (select cl.*, coalesce(per.n, 0) n, per.last from cl left join per on per.client_id = cl.id where not cl.is_lost),
    buy as (
      select i.client_id, i.amount, i.status, i.paid_at, i.paid_amount
      from public.invoices i join cl on cl.id = i.client_id
      where i.source in ('avulso', 'manual') and i.status <> 'cancelado'
    ),
    months as (select (date_trunc('month', current_date) - make_interval(months => g))::date as m from generate_series(0, 11) g),
    paid12 as (select coalesce(paid_amount, amount) v from buy where status = 'pago' and paid_at >= current_date - 365)
    select jsonb_build_object(
      'total', (select count(*) from cl),
      'bought_90d', (select count(*) from live where last >= current_date - 90),
      'new_month', (select count(*) from cl where since >= date_trunc('month', current_date)),
      'buyers', (select count(*) from live where n > 0),
      'repeat', (select count(*) from live where n > 1),
      'new_by_month', (select jsonb_agg(jsonb_build_object('month', m, 'n', (select count(*) from cl where since >= m and since < m + interval '1 month')) order by m) from months),
      'activity', jsonb_build_object(
        'ativo', (select count(*) from live where activity_status = 'ativo'),
        'esfriando', (select count(*) from live where activity_status = 'esfriando'),
        'inativo', (select count(*) from live where activity_status = 'inativo')),
      'frequency', jsonb_build_object(
        'f1', (select count(*) from live where n = 1),
        'f2', (select count(*) from live where n = 2),
        'f3', (select count(*) from live where n = 3),
        'f4', (select count(*) from live where n >= 4),
        'none', (select count(*) from live where n = 0)),
      'recency', jsonb_build_object(
        'le90', (select count(*) from live where last >= current_date - 90),
        'd91to180', (select count(*) from live where last < current_date - 90 and last >= current_date - 180),
        'gt180', (select count(*) from live where last < current_date - 180),
        'none', (select count(*) from live where last is null)),
      'cooling', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'last', last, 'n', n) order by last nulls last)
        from (select * from live where activity_status = 'esfriando' order by last nulls last limit 20) x), '[]'::jsonb),
      'revenue_12m', case when _admin then (select coalesce(sum(v), 0) from paid12) end,
      'paid_count_12m', case when _admin then (select count(*) from paid12) end,
      'ticket', case when _admin then (select round(avg(v), 2) from paid12) end
    )
  );
end;
$function$;
