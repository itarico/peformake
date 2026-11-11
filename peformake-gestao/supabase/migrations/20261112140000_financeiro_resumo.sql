-- Financeiro → Resumo (Fases A, B e parte da C do docs/ESTUDO-FINANCEIRO-RESUMO.md).
-- Tudo calculado no banco, sem IA: fin_dashboard(_unit, _month) devolve cartões, selo de confiança,
-- "o que fazer agora", séries, caixa projetado, gráficos extras, dicas e a tabela por cliente numa chamada.
-- Meta de faturamento opcional por empresa (fin_goals) e fotografia do mês (fin_month_snapshots, pg_cron dia 1).
-- Fonte única do dinheiro: fin_entries (as faturas espelham nele por invoices.fin_entry_id).

create table if not exists public.fin_goals (
  unit text primary key check (unit in ('peformake', 'ellcazo')),
  target numeric(12, 2) check (target is null or target > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.fin_goals enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'fin_goals' and policyname = 'fin_goals_admin') then
    create policy fin_goals_admin on public.fin_goals for select using (public.has_role('admin'));
  end if;
end $$;

create or replace function public.fin_goal_save(_unit text, _target numeric)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _unit not in ('peformake', 'ellcazo') then raise exception 'Empresa inválida' using errcode = '22023'; end if;
  insert into public.fin_goals (unit, target, updated_at, updated_by)
  values (_unit, case when coalesce(_target, 0) > 0 then round(_target, 2) end, now(), (select auth.uid()))
  on conflict (unit) do update set target = excluded.target, updated_at = now(), updated_by = excluded.updated_by;
end $$;
revoke all on function public.fin_goal_save(text, numeric) from public, anon;
grant execute on function public.fin_goal_save(text, numeric) to authenticated;

-- Fotografia do mês: gravada uma vez, nunca muda depois (anti-falha 4).
create table if not exists public.fin_month_snapshots (
  month date not null,
  unit text not null check (unit in ('peformake', 'ellcazo')),
  mrr numeric(12, 2) not null default 0,
  received numeric(12, 2) not null default 0,
  expenses numeric(12, 2) not null default 0,
  overdue numeric(12, 2) not null default 0,
  active_clients int not null default 0,
  created_at timestamptz not null default now(),
  primary key (month, unit)
);
alter table public.fin_month_snapshots enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'fin_month_snapshots' and policyname = 'fin_month_snapshots_admin') then
    create policy fin_month_snapshots_admin on public.fin_month_snapshots for select using (public.has_role('admin'));
  end if;
end $$;

-- Mensalidade ativa por cliente e empresa, só dos serviços que já começaram a cobrar no mês.
create or replace function public.fin_mrr_rows(_month date)
returns table (client_id uuid, unit text, amount numeric)
language sql stable security definer set search_path to '' as $$
  select cs.client_id, case when s.area = 'audiovisual' then 'ellcazo' else 'peformake' end,
    round(sum(greatest(0, coalesce(p.price, 0) * coalesce(cs.quantity, 1)
      - case when p.discount_type in ('percent', 'percentage') then coalesce(p.price, 0) * coalesce(cs.quantity, 1) * coalesce(p.discount_value, 0) / 100 else coalesce(p.discount_value, 0) end)), 2)
  from public.client_services cs
  join public.services s on s.id = cs.service_id
  join public.clients c on c.id = cs.client_id
  left join public.client_service_prices p on p.client_service_id = cs.id
  where cs.is_active and c.is_active and not coalesce(c.is_lost, false) and coalesce(c.client_type, 'recurring') <> 'one-off'
    and coalesce(cs.billing_month, '2000-01-01'::date) <= date_trunc('month', _month)::date
  group by 1, 2
  having sum(coalesce(p.price, 0)) > 0;
$$;
revoke all on function public.fin_mrr_rows(date) from public, anon, authenticated;

create or replace function public.fin_snapshot_take(_month date default null)
returns int language plpgsql security definer set search_path to '' as $$
declare
  _m date := date_trunc('month', coalesce(_month, ((now() at time zone 'America/Sao_Paulo')::date - interval '1 month')::date))::date;
  _n date := (_m + interval '1 month')::date;
  _c int;
begin
  insert into public.fin_month_snapshots (month, unit, mrr, received, expenses, overdue, active_clients)
  select _m, u.unit,
    coalesce((select sum(r.amount) from public.fin_mrr_rows(_m) r where r.unit = u.unit), 0),
    coalesce((select sum(f.amount) from public.fin_entries f where f.unit = u.unit and f.kind = 'entrada' and f.status = 'pago' and f.paid_at >= _m and f.paid_at < _n), 0),
    coalesce((select sum(f.amount) from public.fin_entries f where f.unit = u.unit and f.kind = 'saida' and f.status = 'pago' and f.paid_at >= _m and f.paid_at < _n), 0),
    coalesce((select sum(f.amount) from public.fin_entries f where f.unit = u.unit and f.kind = 'entrada' and f.status = 'pendente' and f.due_date < _n), 0),
    (select count(distinct r.client_id) from public.fin_mrr_rows(_m) r where r.unit = u.unit)
  from (values ('peformake'), ('ellcazo')) u(unit)
  on conflict (month, unit) do nothing;
  get diagnostics _c = row_count;
  return _c;
end $$;
revoke all on function public.fin_snapshot_take(date) from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'fin-snapshot') then perform cron.schedule('fin-snapshot', '40 6 1 * *', 'select public.fin_snapshot_take()'); end if;
end $$;

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job)
values ('fin_fotografia', 'financeiro', 20, 'Fotografia do mês',
  'Guarda no dia 1 os números do mês que passou (receita recorrente, recebido, despesas, atraso e clientes) de cada empresa.',
  'Grava uma vez e nunca altera. Serve para o histórico do Resumo (perdas e crescimento).', 'Dia 1, 03:40', false, 'baixo', 'fin-snapshot')
on conflict (key) do update set title = excluded.title, what = excluded.what, how = excluded.how, schedule = excluded.schedule, cron_job = excluded.cron_job;

-- Link do aviso "Entrega avulsa sem valor": o lugar de lançar a cobrança é a aba Cobrança (o /financeiro virou o Resumo).
create or replace function public.av_project_charge_delivery()
 returns trigger language plpgsql security definer set search_path to '' as $function$
declare _q record; _billed numeric; _rest numeric; _type text;
begin
  if new.status <> 'delivered' or old.status = 'delivered' then return new; end if;
  select client_type into _type from public.clients where id = new.client_id;
  if coalesce(_type, '') <> 'one-off' then return new; end if;
  select q.id, q.code, q.title, q.total into _q from public.av_quotes q
  where q.client_id = new.client_id and q.status = 'aceito'
    and not exists (select 1 from public.invoices i where i.client_id = q.client_id and i.source = 'avulso' and i.ref = q.id::text)
  order by q.accepted_at desc nulls last limit 1;
  if _q.id is null then
    perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_missing',
      'Entrega avulsa sem valor', 'O projeto foi entregue e não há orçamento aceito para cobrar. Lance a cobrança em Financeiro.', '/financeiro/cobranca', new.client_id);
    return new;
  end if;
  select coalesce(sum(amount), 0) into _billed from public.invoices where client_id = new.client_id and source = 'sinal' and ref = _q.id::text and status <> 'cancelado';
  _rest := _q.total - _billed;
  if _rest > 0 then
    insert into public.invoices (client_id, unit, description, amount, due_date, source, ref)
    values (new.client_id, 'ellcazo', left('Entrega ' || _q.code || ' · ' || _q.title, 200), _rest, current_date + 3, 'avulso', _q.id::text)
    on conflict (client_id, source, ref) do nothing;
  end if;
  return new;
end;
$function$;

