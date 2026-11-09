-- Financeiro · Fase 0, itens 1 e 2: datas em Brasília e nada em dobro.
-- 1) Data do pagamento é a data real (Asaas) e em horário de Brasília. Antes, pagamento depois das 21h caía no dia seguinte
--    e a data era a do aviso, não a do pagamento.
-- 2) Pagamento feito direto no Asaas e extrato do banco casam com a fatura em aberto antes de virar entrada nova.

-- Meio-dia de Brasília de uma data (evita virar o dia em qualquer fuso).
create or replace function public.brt_noon(_d date)
returns timestamptz language sql immutable set search_path to '' as $$
  select (_d::timestamp + time '12:00') at time zone 'America/Sao_Paulo'
$$;

-- Fatura paga → lançamento no Caixa com a data de Brasília.
create or replace function public.invoice_sync_entry()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare _cat uuid; _id uuid; _paid date;
begin
  _paid := case when new.status = 'pago' then (coalesce(new.paid_at, now()) at time zone 'America/Sao_Paulo')::date end;
  select id into _cat from public.fin_categories
  where unit = new.unit and kind = 'entrada'
    and name = case when new.source = 'mensalidade' then 'Mensalidade de cliente' when new.unit = 'ellcazo' then 'Gravação avulsa' else 'Serviço avulso' end;
  if new.fin_entry_id is null then
    insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, client_id, source, external_id, created_by)
    values (new.unit, 'entrada', _cat, new.description, new.amount, new.due_date, _paid,
      case when new.status = 'pago' then 'pago' when new.status = 'cancelado' then 'cancelado' else 'pendente' end,
      new.client_id, 'contrato', 'inv:' || new.id, new.created_by)
    returning id into _id;
    update public.invoices set fin_entry_id = _id where id = new.id;
  else
    update public.fin_entries set amount = coalesce(new.paid_amount, new.amount), due_date = new.due_date, description = new.description,
      status = case when new.status = 'pago' then 'pago' when new.status = 'cancelado' then 'cancelado' else 'pendente' end,
      paid_at = _paid, updated_at = now()
    where id = new.fin_entry_id;
  end if;
  return null;
end $function$;

-- Baixa feita no Caixa → fatura paga com a data certa (meio-dia de Brasília, não meia-noite UTC).
create or replace function public.fin_entry_sync_invoice()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare _inv uuid;
begin
  if new.external_id is null or new.external_id not like 'inv:%' then return null; end if;
  _inv := substring(new.external_id from 5)::uuid;
  update public.invoices set
    status = case new.status when 'pago' then 'pago' when 'cancelado' then 'cancelado' else (case when status = 'vencido' then 'vencido' else 'pendente' end) end,
    paid_at = case when new.status = 'pago' then coalesce(paid_at, public.brt_noon(new.paid_at)) end,
    paid_amount = case when new.status = 'pago' then coalesce(paid_amount, new.amount) end,
    updated_at = now()
  where id = _inv and (status is distinct from case new.status when 'pago' then 'pago' when 'cancelado' then 'cancelado' else status end
                       or (new.status <> 'pago' and status = 'pago'));
  if found then
    insert into public.billing_events (invoice_id, kind, detail) values (_inv, 'status_caixa', new.status);
  end if;
  return null;
end $function$;

-- Pago pelo gateway, com a data real do pagamento (nova versão com _paid_on; a de 3 argumentos continua valendo).
create or replace function public.invoice_paid_by_gateway(_gateway text, _gateway_id text, _value numeric, _paid_on date)
returns uuid language plpgsql security definer set search_path to '' as $function$
declare _first uuid; _client uuid; _tot numeric; _n int;
begin
  select sum(amount), count(*) into _tot, _n from public.invoices where gateway = _gateway and gateway_id = _gateway_id and status <> 'pago';
  if coalesce(_n, 0) = 0 then
    return (select id from public.invoices where gateway = _gateway and gateway_id = _gateway_id order by id limit 1);
  end if;
  perform set_config('pf.gateway_paid', '1', true);
  update public.invoices set status = 'pago', paid_at = coalesce(public.brt_noon(_paid_on), now()),
    paid_amount = case when _n = 1 then coalesce(_value, amount) else round(amount * coalesce(_value, _tot) / _tot, 2) end, updated_at = now()
  where gateway = _gateway and gateway_id = _gateway_id and status <> 'pago';
  perform set_config('pf.gateway_paid', '', true);
  select id, client_id into _first, _client from public.invoices where gateway = _gateway and gateway_id = _gateway_id order by id limit 1;
  insert into public.billing_events (invoice_id, kind, detail) select id, 'pago_gateway', _gateway_id from public.invoices where gateway = _gateway and gateway_id = _gateway_id;
  perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
    'Pagamento recebido', (select name from public.clients where id = _client) || ': ' || public.brl(coalesce(_value, _tot)), '/financeiro/cobranca', _client);
  return _first;
end $function$;

create or replace function public.invoice_paid_by_gateway(_gateway text, _gateway_id text, _value numeric)
returns uuid language sql security definer set search_path to '' as $$
  select public.invoice_paid_by_gateway(_gateway, _gateway_id, _value, null::date)
$$;
revoke all on function public.invoice_paid_by_gateway(text, text, numeric, date) from public, anon, authenticated;

-- Referência do pagamento que quitou a fatura por conciliação (pagamento direto no Asaas ou crédito no extrato).
alter table public.invoices add column if not exists paid_ref text;
create unique index if not exists invoices_paid_ref_key on public.invoices (paid_ref) where paid_ref is not null;

-- Fatura em aberto que casa com um valor recebido: mesmo cliente (se houver), mesma empresa (se houver),
-- mesmo valor (até 1 centavo) e vencimento até 3 dias da data. Só devolve quando há exatamente uma.
create or replace function public.fin_match_open_invoice(_client uuid, _unit text, _amount numeric, _dates date[])
returns uuid language sql stable security definer set search_path to '' as $$
  with c as (
    select i.id from public.invoices i
    where i.status in ('pendente', 'vencido') and i.paid_ref is null
      and (_client is null or i.client_id = _client)
      and (_unit is null or i.unit = _unit)
      and abs(i.amount - _amount) < 0.01
      and exists (select 1 from unnest(_dates) d where d is not null and abs(i.due_date - d) <= 3)
  )
  select case when (select count(*) from c) = 1 then (select id from c) end
$$;
revoke all on function public.fin_match_open_invoice(uuid, text, numeric, date[]) from public, anon, authenticated;

-- Quita a fatura casada. Se ela tinha cobrança própria no Asaas, essa cobrança é cancelada lá (o cliente pagou por outro caminho).
create or replace function public.invoice_paid_matched(_inv uuid, _ref text, _paid_on date, _value numeric, _how text)
returns boolean language plpgsql security definer set search_path to '' as $function$
declare _client uuid; _n int;
begin
  perform set_config('pf.gateway_paid', '1', true);
  update public.invoices set status = 'pago', paid_at = coalesce(public.brt_noon(_paid_on), now()), paid_amount = coalesce(_value, amount),
    paid_ref = _ref, updated_at = now(),
    gateway_close = case when gateway_id is not null and gateway_closed_at is null then 'cancel' else gateway_close end
  where id = _inv and status in ('pendente', 'vencido') and paid_ref is null
  returning client_id into _client;
  get diagnostics _n = row_count;
  perform set_config('pf.gateway_paid', '', true);
  if _n = 0 then return false; end if;
  insert into public.billing_events (invoice_id, kind, detail) values (_inv, 'pago_conciliado', _how || ': ' || _ref);
  perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
    'Pagamento recebido', (select name from public.clients where id = _client) || ': ' || public.brl(_value) || ' (' || _how || ')', '/financeiro/cobranca', _client);
  return true;
end $function$;
revoke all on function public.invoice_paid_matched(uuid, text, date, numeric, text) from public, anon, authenticated;

-- Extrato do banco: antes de criar, casa com o que já existe.
--   a) crédito que já entrou no Caixa por fatura ou pelo Asaas (mesmo valor, até 3 dias) → não duplica;
--   b) crédito vindo do Asaas (transferência do saldo para o banco) → não é receita nova, só registra a conferência;
--   c) crédito que casa com uma única fatura em aberto da empresa → quita a fatura (o Caixa recebe pela fatura);
--   d) o resto entra como antes.
create or replace function public.fin_import(_unit text, _rows jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  _r jsonb; _amount numeric; _desc text; _date date; _ext text;
  _cat uuid; _rule uuid; _id uuid; _inv uuid; _dup uuid;
  _added int := 0; _skipped int := 0; _uncat int := 0; _matched int := 0; _paid int := 0; _transfer int := 0;
begin
  if not public.can_finance(_unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if jsonb_array_length(coalesce(_rows, '[]')) > 2000 then raise exception 'Extrato grande demais' using errcode = '22023'; end if;
  for _r in select * from jsonb_array_elements(coalesce(_rows, '[]')) loop
    _amount := (_r->>'amount')::numeric;
    _desc := left(coalesce(nullif(trim(_r->>'description'), ''), 'Sem descrição'), 200);
    _date := (_r->>'date')::date;
    _ext := left(_r->>'external_id', 120);
    if _amount is null or _amount = 0 or _date is null or _ext is null then _skipped := _skipped + 1; continue; end if;
    -- Já importada antes.
    if exists (select 1 from public.fin_entries where unit = _unit and source = 'extrato' and external_id = _ext)
       or exists (select 1 from public.invoices where paid_ref = 'extrato:' || _ext) then
      _skipped := _skipped + 1; continue;
    end if;
    if _amount > 0 then
      -- b) Saque do saldo do Asaas para o banco: o dinheiro já entrou pela cobrança.
      if lower(_desc) ~ 'asaas' then
        insert into public.fin_entries (unit, kind, description, amount, due_date, paid_at, status, source, external_id, notes, created_by)
        values (_unit, 'entrada', _desc, abs(_amount), _date, null, 'cancelado', 'extrato', _ext,
          'Transferência do Asaas para o banco: não é receita nova (o recebimento já entrou pela cobrança).', (select auth.uid()))
        on conflict (unit, source, external_id) where external_id is not null do nothing;
        _transfer := _transfer + 1; continue;
      end if;
      -- a) Mesmo valor já recebido no Caixa (fatura ou Asaas) em até 3 dias.
      select e.id into _dup from public.fin_entries e
      where e.unit = _unit and e.kind = 'entrada' and e.status = 'pago' and e.source in ('contrato', 'asaas')
        and abs(e.amount - _amount) < 0.01 and abs(e.paid_at - _date) <= 3
        and coalesce(e.notes, '') not like '%[extrato %'
      order by abs(e.paid_at - _date) limit 1;
      if _dup is not null then
        update public.fin_entries set notes = trim(coalesce(notes, '') || ' [extrato ' || _ext || ']'), updated_at = now() where id = _dup;
        _matched := _matched + 1; _dup := null; continue;
      end if;
      -- c) Fatura em aberto da empresa com o mesmo valor e vencimento perto: quita a fatura.
      _inv := public.fin_match_open_invoice(null, _unit, _amount, array[_date]);
      if _inv is not null and public.invoice_paid_matched(_inv, 'extrato:' || _ext, _date, _amount, 'extrato do banco') then
        update public.fin_entries set notes = trim(coalesce(notes, '') || ' [extrato ' || _ext || ']'), updated_at = now() where external_id = 'inv:' || _inv;
        _paid := _paid + 1; _inv := null; continue;
      end if;
      _inv := null;
    end if;
    -- d) Lançamento novo, como antes.
    select r.id, r.category_id into _rule, _cat from public.fin_rules r
      join public.fin_categories c on c.id = r.category_id
      where r.unit = _unit and c.kind = case when _amount > 0 then 'entrada' else 'saida' end
        and position(r.match in lower(_desc)) > 0
      order by length(r.match) desc limit 1;
    insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, source, external_id, created_by)
    values (_unit, case when _amount > 0 then 'entrada' else 'saida' end, _cat, _desc, abs(_amount), _date, _date, 'pago', 'extrato', _ext, (select auth.uid()))
    on conflict (unit, source, external_id) where external_id is not null do nothing
    returning id into _id;
    if _id is null then _skipped := _skipped + 1;
    else
      _added := _added + 1;
      if _cat is null then _uncat := _uncat + 1; else update public.fin_rules set hits = hits + 1 where id = _rule; end if;
    end if;
    _id := null; _cat := null; _rule := null;
  end loop;
  return jsonb_build_object('added', _added, 'skipped', _skipped, 'uncategorized', _uncat,
    'matched', _matched, 'invoices_paid', _paid, 'transfers', _transfer);
end $function$;
