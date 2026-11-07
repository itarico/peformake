-- Financeiro amarrado: Venda → Contrato → Mensalidade → Fatura (5 dias antes) → Pagamento → Caixa.

-- 1) Fatura sai 5 dias antes do vencimento (o lembrete de véspera já leva o link). Vence no dia 30.
create or replace function public.billing_gateway_queue(_limit integer default 20)
returns setof jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('id', i.id, 'amount', i.amount, 'due_date', i.due_date, 'description', i.description, 'unit', i.unit,
    'client', jsonb_build_object('id', c.id, 'name', c.name, 'document', c.document, 'email', coalesce((select x.email from public.client_contacts x where x.client_id = c.id and x.gets_billing and x.email is not null order by x.created_at limit 1), c.billing_email, c.email), 'phone', regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')))
  from public.invoices i join public.clients c on c.id = i.client_id
  where i.status = 'pendente' and i.gateway_id is null and (i.gateway_error is null or i.updated_at < now() - interval '6 hours')
    and (_limit >= 500 or (coalesce((select s.auto_charge from public.billing_settings s where s.id), false)
         and i.due_date <= (now() at time zone 'America/Sao_Paulo')::date + 5))
  order by i.due_date limit _limit;
$$;

-- 2) Mensalidade: respeita início e fim do contrato e atualiza o valor enquanto a fatura ainda não tem link.
create or replace function public.invoice_generate_month(_month date)
returns integer language plpgsql security definer set search_path to '' as $$
declare
  _m date := date_trunc('month', _month)::date;
  _n integer := 0;
  _c record;
  _a record;
  _day int;
begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  for _c in
    select c.id, c.name, ct.billing_day from public.clients c
    left join public.client_contracts ct on ct.client_id = c.id
    where c.is_active and not c.is_lost and coalesce(c.client_type, 'recurring') <> 'one-off'
      and (ct.end_date is null or ct.end_date >= _m) and (ct.start_date is null or ct.start_date < (_m + interval '1 month'))
  loop
    _day := least(greatest(coalesce(_c.billing_day, 30), 1), extract(day from (_m + interval '1 month' - interval '1 day'))::int);
    for _a in select * from public.client_monthly_amounts(_c.id) loop
      if coalesce(_a.amount, 0) <= 0 then continue; end if;
      insert into public.invoices (client_id, unit, description, amount, due_date, source, ref)
      values (_c.id, _a.unit, left('Mensalidade ' || to_char(_m, 'MM/YYYY') || ' · ' || _a.items, 200), _a.amount, _m + (_day - 1), 'mensalidade', to_char(_m, 'YYYY-MM') || ':' || _a.unit)
      on conflict (client_id, source, ref) do update set amount = excluded.amount, description = excluded.description, updated_at = now()
        where public.invoices.status = 'pendente' and public.invoices.gateway_id is null and public.invoices.amount <> excluded.amount;
      if found then _n := _n + 1; end if;
    end loop;
  end loop;
  return _n;
end $$;

-- 3) Cancelou ou deu baixa à mão numa fatura que já tem cobrança no Asaas: a cobrança lá também é fechada.
alter table public.invoices add column if not exists gateway_close text check (gateway_close in ('cancel', 'cash'));
alter table public.invoices add column if not exists gateway_closed_at timestamptz;
alter table public.invoices add column if not exists gateway_close_error text;

create or replace function public.invoice_mark_gateway_close() returns trigger
language plpgsql set search_path to '' as $$
begin
  if new.gateway_id is not null and new.gateway_closed_at is null and old.status is distinct from new.status
     and coalesce(current_setting('pf.gateway_paid', true), '') <> '1' then
    if new.status = 'cancelado' then new.gateway_close := 'cancel'; new.gateway_close_error := null;
    elsif new.status = 'pago' then new.gateway_close := 'cash'; new.gateway_close_error := null;
    elsif new.status = 'pendente' then new.gateway_close := null;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists invoice_mark_gateway_close on public.invoices;
create trigger invoice_mark_gateway_close before update of status on public.invoices
  for each row execute function public.invoice_mark_gateway_close();

create or replace function public.invoice_paid_by_gateway(_gateway text, _gateway_id text, _value numeric)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _inv public.invoices;
begin
  perform set_config('pf.gateway_paid', '1', true);
  update public.invoices set status = 'pago', paid_at = now(), paid_amount = coalesce(_value, amount), updated_at = now()
  where gateway = _gateway and gateway_id = _gateway_id and status <> 'pago'
  returning * into _inv;
  perform set_config('pf.gateway_paid', '', true);
  if _inv.id is null then return null; end if;
  insert into public.billing_events (invoice_id, kind, detail) values (_inv.id, 'pago_gateway', _gateway_id);
  perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
    'Pagamento recebido', (select name from public.clients where id = _inv.client_id) || ': ' || public.brl(coalesce(_value, _inv.amount)), '/financeiro/cobranca', _inv.client_id);
  return _inv.id;
end $$;

create or replace function public.billing_gateway_close_queue()
returns setof jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('id', i.id, 'gateway', i.gateway, 'gateway_id', i.gateway_id, 'close', i.gateway_close,
    'value', coalesce(i.paid_amount, i.amount), 'paid_at', coalesce((i.paid_at at time zone 'America/Sao_Paulo')::date, (now() at time zone 'America/Sao_Paulo')::date))
  from public.invoices i
  where i.gateway_close is not null and i.gateway_closed_at is null and i.gateway_id is not null
    and (i.gateway_close_error is null or i.updated_at < now() - interval '6 hours')
  order by i.updated_at limit 20;
$$;
revoke all on function public.billing_gateway_close_queue() from public, anon, authenticated;

create or replace function public.billing_gateway_close_done(_id uuid, _ok boolean, _error text)
returns void language sql security definer set search_path to '' as $$
  update public.invoices set gateway_closed_at = case when _ok then now() end, gateway_close_error = case when _ok then null else left(_error, 300) end, updated_at = now() where id = _id;
  insert into public.billing_events (invoice_id, kind, detail) values (_id, case when _ok then 'gateway_fechado' else 'gateway_fechar_erro' end, _error);
$$;
revoke all on function public.billing_gateway_close_done(uuid, boolean, text) from public, anon, authenticated;

-- A cobrança de teste cancelada (R$ 100) também é fechada no Asaas.
update public.invoices set gateway_close = 'cancel' where status = 'cancelado' and gateway_id is not null and gateway_closed_at is null;

-- 4) Venda avulsa confirmada vira FATURA (com link de pagamento e baixa automática), não lançamento solto.
--    Vence em 3 dias a partir de hoje (ou da data da venda, se for depois). Cancelar a venda cancela a fatura pendente.
create or replace function public.crm_sale_to_fin() returns trigger
language plpgsql security definer set search_path to '' as $$
declare _unit text; _today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if tg_op = 'UPDATE' and old.status = 'confirmada' and new.status <> 'confirmada' then
    update public.invoices set status = 'cancelado', updated_at = now() where source = 'avulso' and ref = 'sale:' || new.id and status = 'pendente';
    return new;
  end if;
  if new.status <> 'confirmada' or coalesce(new.value_cents, 0) <= 0 or new.client_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'confirmada' then return new; end if;
  if exists (select 1 from public.fin_entries where external_id = 'sale:' || new.id)
     or exists (select 1 from public.invoices where source = 'avulso' and ref = 'sale:' || new.id) then return new; end if;
  _unit := public.crm_sale_unit(new.description);
  insert into public.invoices (client_id, unit, description, amount, due_date, source, ref, created_by)
  values (new.client_id, _unit, left(coalesce(nullif(trim(new.description), ''), 'Venda avulsa'), 200), new.value_cents / 100.0,
          greatest(coalesce(new.sale_date, _today), _today) + 3, 'avulso', 'sale:' || new.id, new.reviewed_by)
  on conflict (client_id, source, ref) do nothing;
  return new;
end $$;

-- 5) Contrato acabando ou acabado: avisa o administrador (30 dias antes, e no dia em que vence).
create or replace function public.billing_contract_watch()
returns integer language plpgsql security definer set search_path to '' as $$
declare _r record; _n int := 0; _today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  for _r in
    select c.id, c.name, ct.end_date from public.clients c join public.client_contracts ct on ct.client_id = c.id
    where c.is_active and not c.is_lost and ct.end_date is not null and ct.end_date in (_today + 30, _today, _today - 1)
  loop
    perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'contract_ending',
      case when _r.end_date >= _today + 30 then 'Contrato vence em 30 dias' when _r.end_date = _today then 'Contrato vence hoje' else 'Contrato venceu: mensalidade parou' end,
      _r.name || ': fim em ' || to_char(_r.end_date, 'DD/MM/YYYY') || '. Renove no Financeiro → Contratos ou marque o cliente como encerrado.',
      '/financeiro/contratos?cliente=' || _r.id, _r.id);
    _n := _n + 1;
  end loop;
  return _n;
end $$;
revoke all on function public.billing_contract_watch() from public, anon, authenticated;
select cron.unschedule('contract-watch') where exists (select 1 from cron.job where jobname = 'contract-watch');
select cron.schedule('contract-watch', '40 11 * * *', 'select public.billing_contract_watch()');

-- 6) Lembretes no horário de Brasília (antes usavam a data UTC: depois das 21h o dia já tinha virado).
do $$
declare d text;
begin
  d := pg_get_functiondef('public.billing_reminders_run()'::regprocedure);
  if position('America/Sao_Paulo' in d) = 0 then
    d := replace(d, 'current_date', '(now() at time zone ''America/Sao_Paulo'')::date');
    execute d;
  end if;
end $$;

-- 07/11: catalog_ad_notify (estoque Will Motos → anúncios) não repete o mesmo aviso em 7 dias
-- e troca "(simulação)" por "(teste, nada foi mudado nos anúncios)". Aplicado pelo MCP.
