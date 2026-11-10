-- Correções do relatório docs/AVALIACAO-CLIENTES-FINANCEIRO.md (itens 1 a 14, 30): dinheiro certo.
-- Decisões do Italo (10/11): juntar automático só faturas da mesma empresa e com vencimentos até 5 dias de diferença
-- (vale o mais cedo, e a mudança fica registrada); 1ª mensalidade no mês seguinte ao início e só com dia de cobrança;
-- pagamento parcial deixa a fatura aberta com o saldo; pagamento até 30 dias depois do vencimento (ou 3 antes) é reconhecido
-- e, na dúvida, fica "A conferir" no topo do Caixa.
-- As 10 faturas manuais em atraso (ref 'atraso:%', no_merge) não são tocadas por nada aqui.

alter table public.invoices add column if not exists partial_paid numeric not null default 0;
alter table public.fin_entries add column if not exists suggest_invoice uuid;
create index if not exists fin_entries_suggest_idx on public.fin_entries (suggest_invoice) where suggest_invoice is not null;
-- Índices que vão faltar com volume (gargalos do relatório).
create index if not exists fin_entries_external_any_idx on public.fin_entries (external_id) where external_id is not null;
create index if not exists invoices_gateway_all_idx on public.invoices (gateway, gateway_id) where gateway_id is not null;
create index if not exists fin_entries_match_idx on public.fin_entries (unit, kind, amount, paid_at);
create index if not exists invoices_fin_entry_idx on public.invoices (fin_entry_id);
create index if not exists service_jobs_invoice_idx on public.service_jobs (invoice_id);
create index if not exists delivery_credits_invoice_idx on public.delivery_credits (invoice_id);

-- Saldo em aberto de uma fatura (valor menos o que já entrou de pagamento parcial).
create or replace function public.invoice_open_amount(_i public.invoices) returns numeric
language sql immutable set search_path = '' as $$ select round(_i.amount - coalesce(_i.partial_paid, 0), 2) $$;

-- Item 1: ao sair do "pago", a fatura volta a poder ser conciliada (sem a marca do extrato).
create or replace function public.invoice_clear_match(_ids uuid[]) returns void
language sql security definer set search_path = '' as $$
  update public.fin_entries e set bank_ref = null, updated_at = now(),
    notes = nullif(trim(regexp_replace(coalesce(e.notes, ''), '\s*\[extrato [^\]]*\]', '', 'g')), '')
  where e.id in (select i.fin_entry_id from public.invoices i where i.id = any(_ids) and i.fin_entry_id is not null)
    and (e.bank_ref is not null or coalesce(e.notes, '') like '%[extrato %');
  update public.invoices set paid_ref = null where id = any(_ids) and paid_ref is not null;
$$;

create or replace function public.invoice_undo_paid(_id uuid)
returns void language plpgsql security definer set search_path = '' as $function$
declare _ids uuid[] := public.invoice_group_ids(_id);
begin
  if _ids is null or exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.invoices set status = case when due_date < (now() at time zone 'America/Sao_Paulo')::date - 7 then 'vencido' else 'pendente' end,
    paid_at = null, paid_amount = null, paid_ref = null, updated_at = now()
  where id = any(_ids) and status = 'pago';
  if not found then raise exception 'Sem permissao' using errcode = '42501'; end if;
  perform public.invoice_clear_match(_ids);
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_manual', 'pagamento desfeito';
end $function$;

create or replace function public.invoice_set_status(_id uuid, _status text)
returns void language plpgsql security definer set search_path = '' as $function$
declare _inv public.invoices; _ids uuid[]; _was_paid uuid[];
begin
  if _status not in ('pago', 'cancelado', 'pendente') then raise exception 'Status invalido' using errcode = '22023'; end if;
  select * into _inv from public.invoices where id = _id;
  if _inv.id is null then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _inv.group_id is not null and _inv.gateway_id is null and _status = 'cancelado' then
    if not public.can_finance(_inv.unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
    update public.invoices set group_id = null, updated_at = now() where id = _id;
    perform public.invoice_group_tidy(_inv.group_id);
    _ids := array[_id];
  else
    _ids := public.invoice_group_ids(_id);
  end if;
  if exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  _was_paid := array(select id from public.invoices where id = any(_ids) and status = 'pago');
  update public.invoices set status = _status, paid_at = case when _status = 'pago' then coalesce(paid_at, now()) end,
    paid_amount = case when _status = 'pago' then coalesce(paid_amount, amount - partial_paid) end,
    paid_ref = case when _status = 'pago' then paid_ref end, updated_at = now()
  where id = any(_ids);
  if _status <> 'pago' and cardinality(_was_paid) > 0 then perform public.invoice_clear_match(_was_paid); end if;
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_manual', _status;
end $function$;

-- Item 2: no Caixa, voltar um lançamento de cobrança junta para "pendente" desfaz a cobrança inteira (e o Caixa acompanha).
create or replace function public.fin_entry_sync_invoice()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare _inv uuid; _group uuid; _linked boolean; _ids uuid[];
begin
  if new.external_id is null or new.external_id not like 'inv:%' then return null; end if;
  _inv := substring(new.external_id from 5)::uuid;
  select group_id, (gateway_id is not null or payment_url is not null) into _group, _linked from public.invoices where id = _inv;
  if _group is not null and new.status = 'cancelado' and _linked then
    raise exception 'Esta fatura faz parte de uma cobrança junta com link: cancele pela Cobrança' using errcode = 'PF008';
  end if;
  _ids := case when _group is not null and (new.status = 'pago' or old.status = 'pago') then public.invoice_group_ids(_inv) else array[_inv] end;
  update public.invoices i set
    status = case new.status when 'pago' then 'pago' when 'cancelado' then 'cancelado' else (case when i.status = 'vencido' then 'vencido' else 'pendente' end) end,
    paid_at = case when new.status = 'pago' then coalesce(i.paid_at, public.brt_noon(new.paid_at)) end,
    paid_amount = case when new.status = 'pago' then coalesce(i.paid_amount, case when i.id = _inv then new.amount else i.amount - i.partial_paid end) end,
    paid_ref = case when new.status = 'pago' then i.paid_ref end,
    updated_at = now()
  where i.id = any(_ids) and (i.status is distinct from case new.status when 'pago' then 'pago' when 'cancelado' then 'cancelado' else i.status end
                       or (new.status <> 'pago' and i.status = 'pago'));
  if found then
    insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_caixa', new.status;
    -- As outras faturas da cobrança junta: o lançamento delas no Caixa segue junto.
    update public.fin_entries e set status = new.status, paid_at = case when new.status = 'pago' then new.paid_at end, updated_at = now()
    from public.invoices i
    where i.id = any(_ids) and i.id <> _inv and e.id = i.fin_entry_id and e.status is distinct from new.status and e.status <> 'cancelado';
    if new.status <> 'pago' and old.status = 'pago' then perform public.invoice_clear_match(_ids); end if;
  end if;
  return null;
end $function$;

-- Lançamento do Caixa de uma fatura mostra o saldo em aberto (o parcial já recebido tem lançamento próprio).
create or replace function public.invoice_sync_entry()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare _cat uuid; _id uuid; _paid date;
begin
  _paid := case when new.status = 'pago' then (coalesce(new.paid_at, now()) at time zone 'America/Sao_Paulo')::date end;
  select id into _cat from public.fin_categories
  where unit = new.unit and kind = 'entrada'
    and name = case when new.source = 'mensalidade' then 'Mensalidade de cliente' when new.unit = 'ellcazo' then 'Gravação avulsa' else 'Serviço avulso' end;
  if new.fin_entry_id is null then
    insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, client_id, source, external_id, created_by)
    values (new.unit, 'entrada', _cat, new.description, new.amount - new.partial_paid, new.due_date, _paid,
      case when new.status = 'pago' then 'pago' when new.status = 'cancelado' then 'cancelado' else 'pendente' end,
      new.client_id, 'contrato', 'inv:' || new.id, new.created_by)
    returning id into _id;
    update public.invoices set fin_entry_id = _id where id = new.id;
  else
    update public.fin_entries set amount = coalesce(new.paid_amount, new.amount - new.partial_paid), due_date = new.due_date, description = new.description,
      status = case when new.status = 'pago' then 'pago' when new.status = 'cancelado' then 'cancelado' else 'pendente' end,
      paid_at = _paid, updated_at = now()
    where id = new.fin_entry_id;
  end if;
  return null;
end $function$;

-- Item 3: pagamento parcial. Entra no Caixa o que foi recebido e a fatura segue aberta com o saldo ("Parcial: falta R$ X").
create or replace function public.invoice_add_partial(_id uuid, _value numeric, _day date, _how text)
returns numeric language plpgsql security definer set search_path = '' as $function$
declare _i public.invoices; _cat uuid; _n int; _left numeric;
begin
  select * into _i from public.invoices where id = _id for update;
  if _i.id is null or _i.status not in ('pendente', 'vencido') then raise exception 'A fatura não está em aberto' using errcode = 'PF012'; end if;
  _left := round(_i.amount - _i.partial_paid - _value, 2);
  if _value is null or _value <= 0 or _left <= 0 then raise exception 'Valor parcial inválido' using errcode = '22023'; end if;
  select count(*) + 1 into _n from public.fin_entries where external_id like 'invpart:' || _id || ':%';
  select category_id into _cat from public.fin_entries where id = _i.fin_entry_id;
  insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, client_id, source, external_id, notes, created_by)
  values (_i.unit, 'entrada', _cat, left('Parcial · ' || _i.description, 200), _value, coalesce(_day, (now() at time zone 'America/Sao_Paulo')::date),
    coalesce(_day, (now() at time zone 'America/Sao_Paulo')::date), 'pago', _i.client_id, 'contrato', 'invpart:' || _id || ':' || _n,
    'Pagamento parcial (' || coalesce(_how, 'manual') || '). Falta ' || public.brl(_left) || ' na fatura.', (select auth.uid()));
  update public.invoices set partial_paid = partial_paid + _value, updated_at = now() where id = _id;
  update public.fin_entries set amount = _left, updated_at = now() where id = _i.fin_entry_id;
  insert into public.billing_events (invoice_id, kind, detail) values (_id, 'pago_parcial', public.brl(_value) || ' recebido · falta ' || public.brl(_left));
  return _left;
end $function$;

create or replace function public.invoice_set_paid(_id uuid, _paid_at date default null, _amount numeric default null)
returns void language plpgsql security definer set search_path = '' as $function$
declare _ids uuid[] := public.invoice_group_ids(_id); _due numeric; _day date := coalesce(_paid_at, (now() at time zone 'America/Sao_Paulo')::date);
begin
  if _ids is null or exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _amount is not null and _amount <= 0 then raise exception 'Informe o valor recebido' using errcode = '22023'; end if;
  select coalesce(sum(amount - partial_paid), 0) into _due from public.invoices where id = any(_ids) and status in ('pendente', 'vencido');
  if _amount is not null and _due > 0 and _amount < _due - 0.009 then
    if cardinality(_ids) > 1 then
      raise exception 'Cobrança junta: para receber só uma parte, separe as faturas primeiro' using errcode = 'PF012';
    end if;
    perform public.invoice_add_partial(_id, _amount, _day, 'baixa manual');
    return;
  end if;
  update public.invoices set status = 'pago', paid_at = (_day::text || ' 12:00:00-03')::timestamptz,
    paid_amount = case when cardinality(_ids) = 1 then coalesce(_amount, amount - partial_paid) else amount - partial_paid end, updated_at = now()
  where id = any(_ids);
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_manual', 'pago ' || coalesce(_paid_at::text, 'hoje');
end $function$;

-- Itens 3, 9 e 30: baixa pelo Asaas. Cancelada e depois paga: fica paga, sem pedido de cancelar no Asaas, e o admin é avisado.
create or replace function public.invoice_paid_by_gateway(_gateway text, _gateway_id text, _value numeric, _paid_on date)
returns uuid language plpgsql security definer set search_path = '' as $function$
declare _first uuid; _client uuid; _tot numeric; _n int; _was_cancel uuid[]; _left numeric;
begin
  select sum(amount - partial_paid), count(*) into _tot, _n from public.invoices where gateway = _gateway and gateway_id = _gateway_id and status <> 'pago';
  if coalesce(_n, 0) = 0 then
    return (select id from public.invoices where gateway = _gateway and gateway_id = _gateway_id order by id limit 1);
  end if;
  select id, client_id into _first, _client from public.invoices where gateway = _gateway and gateway_id = _gateway_id order by id limit 1;
  -- Fatura sozinha paga com valor menor: parcial, a fatura segue aberta com o saldo.
  if _n = 1 and _value is not null and _value < _tot - 0.009
     and exists (select 1 from public.invoices where id = _first and status in ('pendente', 'vencido')) then
    _left := public.invoice_add_partial(_first, _value, _paid_on, 'Asaas');
    perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
      'Pagamento menor que a fatura', (select name from public.clients where id = _client) || ': recebido ' || public.brl(_value) || ', falta ' || public.brl(_left),
      '/financeiro/cobranca?fatura=' || _first, _client);
    return _first;
  end if;
  _was_cancel := array(select id from public.invoices where gateway = _gateway and gateway_id = _gateway_id and status = 'cancelado');
  perform set_config('pf.gateway_paid', '1', true);
  update public.invoices set status = 'pago', paid_at = coalesce(public.brt_noon(_paid_on), now()),
    paid_amount = case when _n = 1 then coalesce(_value, amount - partial_paid) else round((amount - partial_paid) * coalesce(_value, _tot) / _tot, 2) end,
    gateway_close = null, gateway_close_error = null, updated_at = now()
  where gateway = _gateway and gateway_id = _gateway_id and status <> 'pago';
  perform set_config('pf.gateway_paid', '', true);
  insert into public.billing_events (invoice_id, kind, detail) select id, 'pago_gateway', _gateway_id from public.invoices where gateway = _gateway and gateway_id = _gateway_id;
  if cardinality(_was_cancel) > 0 then
    insert into public.billing_events (invoice_id, kind, detail) select unnest(_was_cancel), 'pago_depois_de_cancelado', 'O cliente pagou no Asaas uma cobrança que tinha sido cancelada';
    perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
      'Pagou uma cobrança cancelada', (select name from public.clients where id = _client) || ' pagou ' || public.brl(coalesce(_value, _tot)) || ' de uma cobrança cancelada. Confira se precisa devolver ou abater.',
      '/financeiro/cobranca?fatura=' || _first, _client);
  end if;
  perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
    'Pagamento recebido', (select name from public.clients where id = _client) || ': ' || public.brl(coalesce(_value, _tot)), '/financeiro/cobranca?fatura=' || _first, _client);
  return _first;
end $function$;

create or replace function public.invoice_paid_matched(_inv uuid, _ref text, _paid_on date, _value numeric, _how text)
returns boolean language plpgsql security definer set search_path = '' as $function$
declare _client uuid; _n int; _ids uuid[];
begin
  _ids := public.invoice_group_ids(_inv);
  if _ids is null or exists (select 1 from public.invoices where id = any(_ids) and (status not in ('pendente', 'vencido') or paid_ref is not null)) then
    return false;
  end if;
  perform set_config('pf.gateway_paid', '1', true);
  update public.invoices set status = 'pago', paid_at = coalesce(public.brt_noon(_paid_on), now()),
    paid_amount = case when cardinality(_ids) = 1 then coalesce(_value, amount - partial_paid) else amount - partial_paid end,
    paid_ref = case when id = _inv then _ref else _ref || '#' || id end, updated_at = now(),
    gateway_close = case when gateway_id is not null and gateway_closed_at is null then 'cancel' else gateway_close end
  where id = any(_ids);
  get diagnostics _n = row_count;
  perform set_config('pf.gateway_paid', '', true);
  if _n = 0 then return false; end if;
  select client_id into _client from public.invoices where id = _inv;
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'pago_conciliado', _how || ': ' || _ref;
  perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
    'Pagamento recebido', (select name from public.clients where id = _client) || ': ' || public.brl(_value) || ' (' || _how || ')', '/financeiro/cobranca?fatura=' || _inv, _client);
  return true;
end $function$;

-- Item 5: pagamento até 30 dias depois do vencimento (ou 3 antes) casa com a fatura; com mais de uma igual, não escolhe.
create or replace function public.fin_match_open_invoice(_client uuid, _unit text, _amount numeric, _dates date[])
returns uuid language sql stable security definer set search_path = '' as $function$
  with open as (
    select i.* from public.invoices i
    where i.status in ('pendente', 'vencido') and i.paid_ref is null
      and (_client is null or i.client_id = _client)
  ), cand as (
    select o.id, o.due_date from open o where o.group_id is null and (_unit is null or o.unit = _unit) and abs((o.amount - o.partial_paid) - _amount) < 0.01
    union all
    select (array_agg(o.id order by o.id))[1], min(o.due_date) from open o where o.group_id is not null
    group by o.group_id
    having abs(sum(o.amount - o.partial_paid) - _amount) < 0.01 and (_unit is null or bool_or(o.unit = _unit))
       and count(*) = (select count(*) from public.invoices g where g.group_id = o.group_id and g.status <> 'cancelado')
  ), c as (
    select id from cand where exists (select 1 from unnest(_dates) d where d is not null and d - cand.due_date between -3 and 30)
  )
  select case when (select count(*) from c) = 1 then (select id from c) end
$function$;

-- Na dúvida: a fatura mais provável (mesmo valor, vencimento até 10 dias depois ou 90 antes do pagamento).
create or replace function public.fin_guess_open_invoice(_unit text, _amount numeric, _date date)
returns uuid language sql stable security definer set search_path = '' as $function$
  with open as (
    select i.* from public.invoices i where i.status in ('pendente', 'vencido') and i.paid_ref is null
  ), cand as (
    select o.id, o.due_date from open o where o.group_id is null and (_unit is null or o.unit = _unit) and abs((o.amount - o.partial_paid) - _amount) < 0.01
    union all
    select (array_agg(o.id order by o.id))[1], min(o.due_date) from open o where o.group_id is not null
    group by o.group_id
    having abs(sum(o.amount - o.partial_paid) - _amount) < 0.01 and (_unit is null or bool_or(o.unit = _unit))
  )
  select id from cand where _date - due_date between -10 and 90 order by abs(_date - due_date), due_date limit 1
$function$;

-- Itens 4 e 5: extrato do banco casa com conta fixa, lançamento manual e WhatsApp (dá baixa ou marca "conferido no banco"),
-- com a fatura (até 30 dias de atraso) e, na dúvida, fica "A conferir: parece a fatura X de Fulano".
create or replace function public.fin_import(_unit text, _rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  _r jsonb; _amount numeric; _desc text; _date date; _ext text;
  _cat uuid; _rule uuid; _id uuid; _inv uuid; _dup uuid; _same public.fin_entries; _guess uuid; _gi record;
  _added int := 0; _skipped int := 0; _uncat int := 0; _matched int := 0; _paid int := 0; _transfer int := 0; _wam int := 0; _mm int := 0; _review int := 0;
begin
  if not public.can_finance(_unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if jsonb_array_length(coalesce(_rows, '[]')) > 2000 then raise exception 'Extrato grande demais' using errcode = '22023'; end if;
  for _r in select * from jsonb_array_elements(coalesce(_rows, '[]')) loop
    _amount := (_r->>'amount')::numeric;
    _desc := left(coalesce(nullif(trim(_r->>'description'), ''), 'Sem descrição'), 200);
    _date := (_r->>'date')::date;
    _ext := left(_r->>'external_id', 120);
    if _amount is null or _amount = 0 or _date is null or _ext is null then _skipped := _skipped + 1; continue; end if;
    if exists (select 1 from public.fin_entries where unit = _unit and source = 'extrato' and external_id = _ext)
       or exists (select 1 from public.fin_entries where unit = _unit and bank_ref = _ext)
       or exists (select 1 from public.invoices where paid_ref = 'extrato:' || _ext) then
      _skipped := _skipped + 1; continue;
    end if;
    -- Já lançado à mão, pela conta fixa ou pelo WhatsApp (pago pela empresa), mesmo valor e data perto: é o mesmo.
    select e.* into _same from public.fin_entries e
    where e.unit = _unit and e.source in ('manual', 'whatsapp') and e.status in ('pago', 'pendente')
      and e.bank_ref is null and e.paid_by_staff is null and coalesce(e.notes, '') not like '%[extrato %'
      and e.kind = case when _amount > 0 then 'entrada' else 'saida' end
      and abs(e.amount - abs(_amount)) < 0.01 and abs(coalesce(e.paid_at, e.due_date) - _date) <= 3
    order by abs(coalesce(e.paid_at, e.due_date) - _date), (e.status = 'pago') desc,
      extensions.similarity(public.fin_norm(e.description), public.fin_norm(_desc)) desc
    limit 1;
    if _same.id is not null then
      update public.fin_entries set bank_ref = _ext, status = 'pago', paid_at = _date,
        notes = trim(coalesce(notes, '') || ' [extrato ' || _ext || ']'), updated_at = now() where id = _same.id;
      if _same.source = 'whatsapp' then _wam := _wam + 1; else _mm := _mm + 1; end if;
      _same := null; continue;
    end if;
    if _amount > 0 then
      if lower(_desc) ~ 'asaas' then
        insert into public.fin_entries (unit, kind, description, amount, due_date, paid_at, status, source, external_id, notes, created_by)
        values (_unit, 'entrada', _desc, abs(_amount), _date, null, 'cancelado', 'extrato', _ext,
          'Transferência do Asaas para o banco: não é receita nova (o recebimento já entrou pela cobrança).', (select auth.uid()))
        on conflict (unit, source, external_id) where external_id is not null do nothing;
        _transfer := _transfer + 1; continue;
      end if;
      select e.id into _dup from public.fin_entries e
      where e.unit = _unit and e.kind = 'entrada' and e.status = 'pago' and e.source in ('contrato', 'asaas')
        and abs(e.amount - _amount) < 0.01 and abs(e.paid_at - _date) <= 3
        and coalesce(e.notes, '') not like '%[extrato %' and e.bank_ref is null
      order by abs(e.paid_at - _date) limit 1;
      if _dup is not null then
        update public.fin_entries set notes = trim(coalesce(notes, '') || ' [extrato ' || _ext || ']'), bank_ref = coalesce(bank_ref, _ext), updated_at = now() where id = _dup;
        _matched := _matched + 1; _dup := null; continue;
      end if;
      _inv := public.fin_match_open_invoice(null, _unit, _amount, array[_date]);
      if _inv is not null and public.invoice_paid_matched(_inv, 'extrato:' || _ext, _date, _amount, 'extrato do banco') then
        update public.fin_entries set notes = trim(coalesce(notes, '') || ' [extrato ' || _ext || ']'), bank_ref = coalesce(bank_ref, _ext), updated_at = now()
        where id = (select fin_entry_id from public.invoices where id = _inv);
        _paid := _paid + 1; _inv := null; continue;
      end if;
      _inv := null;
      _guess := public.fin_guess_open_invoice(_unit, _amount, _date);
    end if;
    select r.id, r.category_id into _rule, _cat from public.fin_rules r
      join public.fin_categories c on c.id = r.category_id
      where r.unit = _unit and c.kind = case when _amount > 0 then 'entrada' else 'saida' end
        and position(r.match in lower(_desc)) > 0
      order by length(r.match) desc limit 1;
    if _guess is not null then
      select i.description, i.due_date, c.name client into _gi from public.invoices i join public.clients c on c.id = i.client_id where i.id = _guess;
      insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, source, external_id, created_by,
        review_status, suggest_invoice, client_id, notes)
      values (_unit, 'entrada', _cat, _desc, abs(_amount), _date, _date, 'pago', 'extrato', _ext, (select auth.uid()),
        'a_revisar', _guess, (select client_id from public.invoices where id = _guess),
        left('A conferir: parece a fatura "' || _gi.description || '" de ' || trim(_gi.client) || ' (vence ' || to_char(_gi.due_date, 'DD/MM') || ').', 500))
      on conflict (unit, source, external_id) where external_id is not null do nothing
      returning id into _id;
      if _id is null then _skipped := _skipped + 1; else _review := _review + 1; end if;
      _id := null; _cat := null; _rule := null; _guess := null;
      continue;
    end if;
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
    'matched', _matched, 'invoices_paid', _paid, 'transfers', _transfer, 'whatsapp_matched', _wam, 'manual_matched', _mm, 'to_review', _review);
end $function$;

-- "É essa": o pagamento do extrato vira a baixa da fatura sugerida (ou de outra escolhida). Nada em dobro.
create or replace function public.fin_entry_invoice_confirm(_entry uuid, _invoice uuid default null)
returns void language plpgsql security definer set search_path = '' as $function$
declare _e public.fin_entries; _inv uuid; _i public.invoices; _ref text;
begin
  select * into _e from public.fin_entries where id = _entry for update;
  if _e.id is null or not public.can_finance(_e.unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  _inv := coalesce(_invoice, _e.suggest_invoice);
  select * into _i from public.invoices where id = _inv;
  if _i.id is null or not public.can_finance(_i.unit) then raise exception 'Fatura não encontrada' using errcode = 'PF004'; end if;
  if _e.kind <> 'entrada' or _e.status <> 'pago' then raise exception 'Só dá para ligar uma entrada já recebida' using errcode = 'PF013'; end if;
  _ref := coalesce(case when _e.source = 'extrato' then 'extrato:' || _e.external_id end, 'caixa:' || _e.id);
  if _i.group_id is null and _i.status in ('pendente', 'vencido') and _e.amount < _i.amount - _i.partial_paid - 0.009 then
    perform public.invoice_add_partial(_i.id, _e.amount, _e.paid_at, 'conferido no Caixa');
  elsif not public.invoice_paid_matched(_i.id, _ref, _e.paid_at, _e.amount, 'conferido no Caixa') then
    raise exception 'A fatura não está mais em aberto' using errcode = 'PF012';
  end if;
  update public.fin_entries set bank_ref = coalesce(bank_ref, _e.external_id), updated_at = now(),
    notes = trim(coalesce(notes, '') || case when _e.source = 'extrato' then ' [extrato ' || _e.external_id || ']' else '' end)
  where id = _i.fin_entry_id and _e.source = 'extrato';
  update public.fin_entries set status = 'cancelado', paid_at = null, review_status = 'confirmado', suggest_invoice = null, updated_at = now(),
    notes = left(trim(coalesce(notes, '') || ' Virou o pagamento da fatura "' || _i.description || '".'), 1000)
  where id = _entry;
end $function$;

-- "Não é": vira entrada normal no Caixa.
create or replace function public.fin_entry_review_dismiss(_entry uuid)
returns void language plpgsql security definer set search_path = '' as $function$
begin
  if not exists (select 1 from public.fin_entries where id = _entry and public.can_finance(unit)) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.fin_entries set review_status = 'confirmado', suggest_invoice = null, updated_at = now(),
    notes = left(trim(coalesce(notes, '') || ' Conferido: não é de uma fatura.'), 1000)
  where id = _entry and review_status = 'a_revisar' and suggest_invoice is not null;
end $function$;

-- O "A conferir" ainda não conta como receita no resumo do mês.
do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.fin_month_summary'::regproc);
  if position('suggest_invoice' in _src) = 0 then
    _src := replace(_src, $x$where f.unit = _unit and public.can_finance(_unit) and f.status <> 'cancelado'$x$,
      $x$where f.unit = _unit and public.can_finance(_unit) and f.status <> 'cancelado' and not (f.review_status = 'a_revisar' and f.suggest_invoice is not null)$x$);
    execute _src;
  end if;
end $do$;

-- Item 6: mudar o dia de cobrança nunca joga a fatura para o passado (este mês fica como está; vale a partir do próximo).
create or replace function public.client_contract_billing_day_sync()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare _g uuid; _today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if new.billing_day is distinct from old.billing_day and new.billing_day between 1 and 31 then
    with x as (
      select i.id, i.due_date old_due, date_trunc('month', i.due_date)::date
        + (least(new.billing_day, extract(day from (date_trunc('month', i.due_date) + interval '1 month - 1 day'))::int) - 1) new_due
      from public.invoices i
      where i.client_id = new.client_id and i.source = 'mensalidade' and i.status = 'pendente'
        and i.gateway_id is null and i.payment_url is null and i.due_date >= _today
    ), moved as (
      update public.invoices i set due_date = x.new_due, updated_at = now()
      from x where i.id = x.id and x.new_due >= _today and x.new_due <> x.old_due
      returning i.id, x.old_due, x.new_due
    )
    insert into public.billing_events (invoice_id, kind, detail)
    select id, 'vencimento', 'Dia de cobrança novo: ' || to_char(old_due, 'DD/MM') || ' → ' || to_char(new_due, 'DD/MM') from moved;
    for _g in select distinct group_id from public.invoices where client_id = new.client_id and group_id is not null and gateway_id is null and status in ('pendente', 'vencido') loop
      begin
        perform public.invoice_group_build(new.client_id, array(select id from public.invoices where group_id = _g), false);
      exception when others then null;
      end;
    end loop;
  end if;
  return new;
end $function$;

-- Item 7: juntar automático só a mesma empresa e vencimentos até 5 dias de diferença (vale o mais cedo, registrado na fatura).
create or replace function public.invoice_group_auto()
returns integer language plpgsql security definer set search_path = '' as $function$
declare _r record; _n int := 0;
begin
  if not coalesce((select merge_monthly from public.billing_settings where id), false) then return 0; end if;
  for _r in
    select i.client_id, array_agg(i.id) ids
    from public.invoices i
    where i.status in ('pendente', 'vencido') and i.gateway_id is null and i.payment_url is null and not i.no_merge
      and i.source in ('mensalidade', 'avulso', 'manual') and coalesce(i.ref, '') not like 'atraso:%'
      and i.due_date >= (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month')::date
    group by i.client_id, i.unit, date_trunc('month', i.due_date)
    having count(*) >= 2 and max(i.due_date) - min(i.due_date) <= 5 and (bool_or(i.group_id is null) or count(distinct i.group_id) > 1)
  loop
    begin
      perform public.invoice_group_build(_r.client_id, _r.ids, true);
      _n := _n + 1;
    exception when others then
      raise warning 'invoice_group_auto %: %', _r.client_id, sqlerrm;
    end;
  end loop;
  return _n;
end $function$;

do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.invoice_group_build(uuid, uuid[], boolean)'::regprocedure);
  if position('mesma empresa' in _src) = 0 then
    _src := replace(_src, $x$  if _n < 2 then raise exception 'Escolha pelo menos duas faturas' using errcode = 'PF007'; end if;$x$,
      $x$  if _n < 2 then raise exception 'Escolha pelo menos duas faturas' using errcode = 'PF007'; end if;
  if _auto and (select count(distinct unit) from public.invoices where id = any(_ids)) > 1 then
    raise exception 'Juntar automático: só faturas da mesma empresa' using errcode = 'PF007';
  end if;$x$);
    _src := replace(_src, $x$  select coalesce(max(due_date) filter (where source = 'mensalidade'), max(due_date)) into _due from public.invoices where id = any(_ids);$x$,
      $x$  if _auto then
    select min(due_date) into _due from public.invoices where id = any(_ids);
  else
    select coalesce(max(due_date) filter (where source = 'mensalidade'), max(due_date)) into _due from public.invoices where id = any(_ids);
  end if;$x$);
    _src := replace(_src, $x$  update public.invoices set group_id = _g, due_date = _due, no_merge = false, updated_at = now()$x$,
      $x$  -- Vencimento mudou ao juntar: fica registrado na fatura (a Cobrança mostra).
  insert into public.billing_events (invoice_id, kind, detail)
  select id, 'vencimento', 'Juntada: ' || to_char(due_date, 'DD/MM') || ' → ' || to_char(_due, 'DD/MM') from public.invoices where id = any(_ids) and due_date <> _due;
  update public.invoices set group_id = _g, due_date = _due, no_merge = false, updated_at = now()$x$);
    if position('mesma empresa' in _src) = 0 or position('Juntada: ' in _src) = 0 or position('min(due_date)' in _src) = 0 then
      raise exception 'invoice_group_build: texto esperado não encontrado';
    end if;
    execute _src;
  end if;
end $do$;

-- Cobrança junta vai para o Asaas na empresa certa (Ellcazo sozinha = Ellcazo) e com o saldo em aberto.
create or replace function public.billing_gateway_queue(_limit integer default 20)
returns setof jsonb language sql stable security definer set search_path = '' as $function$
  with cfg as (select coalesce((select s.auto_charge from public.billing_settings s where s.id), false) auto, (now() at time zone 'America/Sao_Paulo')::date today),
  items as (
    select i.id, i.amount - i.partial_paid amount, i.due_date, i.description, i.unit, i.client_id
    from public.invoices i, cfg
    where i.group_id is null and i.status = 'pendente' and i.gateway_id is null
      and (i.gateway_error is null or i.updated_at < now() - interval '6 hours')
      and (_limit >= 500 or (cfg.auto and i.due_date <= cfg.today + 5))
    union all
    select g.id, sum(i.amount - i.partial_paid), g.due_date, g.description, case when count(distinct i.unit) = 1 then min(i.unit) else 'peformake' end, g.client_id
    from public.invoice_groups g join public.invoices i on i.group_id = g.id, cfg
    group by g.id, cfg.auto, cfg.today
    having bool_and(i.status in ('pendente', 'vencido') and i.gateway_id is null)
      and bool_and(i.gateway_error is null or i.updated_at < now() - interval '6 hours')
      and (_limit >= 500 or (cfg.auto and g.due_date <= cfg.today + 5))
  )
  select jsonb_build_object('id', it.id, 'amount', it.amount, 'due_date', it.due_date, 'description', it.description, 'unit', it.unit,
    'client', jsonb_build_object('id', c.id, 'name', c.name, 'document', c.document, 'email', coalesce((select x.email from public.client_contacts x where x.client_id = c.id and x.gets_billing and x.email is not null order by x.created_at limit 1), c.billing_email, c.email), 'phone', regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')))
  from items it join public.clients c on c.id = it.client_id
  order by it.due_date limit _limit;
$function$;

-- Item 8: desconto maior que a fatura não trava: desconta até o valor (a fatura zerada é cancelada) e a sobra fica para a próxima.
create or replace function public.delivery_credit_apply(_credit uuid)
returns boolean language plpgsql security definer set search_path = '' as $function$
declare _c public.delivery_credits; _i public.invoices; _use numeric; _rest numeric;
begin
  select * into _c from public.delivery_credits where id = _credit and status = 'aprovado' for update;
  if _c.id is null or coalesce(_c.discount, 0) <= 0 then return false; end if;
  select i.* into _i from public.invoices i
  where i.client_id = _c.client_id and i.unit = _c.unit and i.source = 'mensalidade' and i.status in ('pendente', 'vencido')
    and i.payment_url is null and i.gateway_id is null and i.partial_paid = 0 and coalesce(i.ref, '') not like 'atraso:%'
  order by i.due_date limit 1;
  if _i.id is null then return false; end if;
  _use := least(_c.discount, _i.amount);
  _rest := round(_c.discount - _use, 2);
  insert into public.invoice_items (invoice_id, client_id, unit, month, description, quantity, unit_price, discount, amount, state)
  values (_i.id, _c.client_id, _c.unit, date_trunc('month', _i.due_date)::date,
    left('Desconto: ' || trim(to_char(_c.qty, 'FM9990.##')) || ' ' || coalesce(_c.measure, 'entregas') || ' de ' || _c.service || ' não entregues em ' || to_char(_c.month, 'MM/YYYY'), 200),
    1, -_use, 0, -_use, public.invoice_item_state(_i.status, _i.payment_url));
  if _use >= _i.amount - 0.009 then
    -- Desconto cobre a fatura inteira: nada a cobrar neste mês.
    if _i.group_id is not null then
      update public.invoices set group_id = null, updated_at = now() where id = _i.id;
      perform public.invoice_group_tidy(_i.group_id);
    end if;
    update public.invoices set status = 'cancelado', updated_at = now() where id = _i.id;
    insert into public.billing_events (invoice_id, kind, detail) values (_i.id, 'coberta_desconto', 'Fatura inteira coberta pelo desconto de entregas');
  else
    update public.invoices set amount = round(amount - _use, 2), updated_at = now() where id = _i.id;
  end if;
  if _rest > 0 then
    update public.delivery_credits set discount = _rest, invoice_id = _i.id where id = _c.id;
  else
    update public.delivery_credits set status = 'aplicado', invoice_id = _i.id where id = _c.id;
  end if;
  insert into public.billing_events (invoice_id, kind, detail) values (_i.id, 'desconto_entrega',
    _c.service || ' ' || to_char(_c.month, 'MM/YYYY') || ': ' || _use || case when _rest > 0 then ' (sobra ' || _rest || ' para a próxima)' else '' end);
  return true;
end $function$;

create or replace function public.delivery_credits_apply_pending()
returns integer language plpgsql security definer set search_path = '' as $function$
declare _id uuid; _n int := 0; _guard int := 0;
begin
  for _id in select id from public.delivery_credits where status = 'aprovado' order by decided_at loop
    begin
      -- A sobra de um desconto grande pode cobrir mais de uma fatura.
      _guard := 0;
      while _guard < 6 and public.delivery_credit_apply(_id) loop
        _n := _n + 1; _guard := _guard + 1;
        exit when not exists (select 1 from public.delivery_credits where id = _id and status = 'aprovado');
      end loop;
    exception when others then
      raise warning 'delivery_credit_apply %: %', _id, sqlerrm;
    end;
  end loop;
  return _n;
end $function$;

-- Itens 10 e 11: mensalidade só com dia de cobrança e data de início (1ª no mês seguinte ao início, sem proporcional);
-- preço mudou e a fatura do mês ainda não tem link: atualiza itens e valor.
create or replace function public.invoice_generate_month(_month date)
returns integer language plpgsql security definer set search_path = '' as $function$
declare
  _m date := date_trunc('month', _month)::date;
  _n integer := 0;
  _c record; _u record; _x record;
  _day int; _inv uuid; _old public.invoices; _sum numeric;
begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  for _c in
    select c.id, c.name, ct.billing_day from public.clients c
    join public.client_contracts ct on ct.client_id = c.id
    where c.is_active and not c.is_lost and coalesce(c.client_type, 'recurring') <> 'one-off'
      and ct.billing_day between 1 and 31 and ct.start_date is not null
      and date_trunc('month', ct.start_date)::date < _m
      and (ct.end_date is null or ct.end_date >= _m)
  loop
    _day := least(_c.billing_day, extract(day from (_m + interval '1 month' - interval '1 day'))::int);
    for _u in
      select x.unit, sum(x.amount) amount, string_agg(x.name, ', ' order by x.name) items
      from public.client_month_items(_c.id) x group by x.unit
    loop
      if coalesce(_u.amount, 0) <= 0 then continue; end if;
      select * into _old from public.invoices where client_id = _c.id and source = 'mensalidade' and ref = to_char(_m, 'YYYY-MM') || ':' || _u.unit;
      if _old.id is null then
        _inv := null;
        insert into public.invoices (client_id, unit, description, amount, due_date, source, ref)
        values (_c.id, _u.unit, left('Mensalidade ' || to_char(_m, 'MM/YYYY') || ' · ' || _u.items, 200), _u.amount, _m + (_day - 1), 'mensalidade', to_char(_m, 'YYYY-MM') || ':' || _u.unit)
        on conflict (client_id, source, ref) do nothing
        returning id into _inv;
        if _inv is not null then
          insert into public.invoice_items (invoice_id, client_id, client_service_id, service_id, unit, month, description, quantity, unit_price, discount, amount, state)
          select _inv, _c.id, x.client_service_id, x.service_id, x.unit, _m, x.name, x.quantity, x.unit_price, x.discount, x.amount, 'confirmado'
          from public.client_month_items(_c.id) x
          where x.unit = _u.unit
            and not exists (select 1 from public.invoice_items ii where ii.client_service_id = x.client_service_id and ii.month = _m and ii.state <> 'cancelado');
          _n := _n + 1;
        end if;
      elsif _old.status = 'pendente' and _old.gateway_id is null and _old.payment_url is null and _old.partial_paid = 0
         and not exists (select 1 from public.billing_events be where be.invoice_id = _old.id and be.kind = 'valor_manual')
         and not exists (select 1 from public.invoices g where _old.group_id is not null and g.group_id = _old.group_id and (g.gateway_id is not null or g.payment_url is not null)) then
        -- Preço, quantidade ou serviço mudou depois de gerar: a fatura ainda sem link acompanha.
        for _x in select * from public.client_month_items(_c.id) x where x.unit = _u.unit loop
          update public.invoice_items set quantity = _x.quantity, unit_price = _x.unit_price, discount = _x.discount, amount = _x.amount, description = _x.name
          where invoice_id = _old.id and client_service_id = _x.client_service_id
            and (quantity, unit_price, discount, amount) is distinct from (_x.quantity, _x.unit_price, _x.discount, _x.amount);
          if not exists (select 1 from public.invoice_items where invoice_id = _old.id and client_service_id = _x.client_service_id) then
            insert into public.invoice_items (invoice_id, client_id, client_service_id, service_id, unit, month, description, quantity, unit_price, discount, amount, state)
            values (_old.id, _c.id, _x.client_service_id, _x.service_id, _x.unit, _m, _x.name, _x.quantity, _x.unit_price, _x.discount, _x.amount, 'confirmado');
          end if;
        end loop;
        -- Serviço que saiu do contrato: o item fica zerado (histórico), sem cobrar.
        update public.invoice_items ii set quantity = 0, unit_price = 0, discount = 0, amount = 0, description = left('Saiu do contrato: ' || ii.description, 200)
        where ii.invoice_id = _old.id and ii.client_service_id is not null and ii.amount <> 0
          and not exists (select 1 from public.client_month_items(_c.id) x where x.client_service_id = ii.client_service_id and x.unit = _u.unit);
        select round(sum(amount), 2) into _sum from public.invoice_items where invoice_id = _old.id;
        if _sum > 0 and abs(_sum - _old.amount) >= 0.01 then
          update public.invoices set amount = _sum, description = left('Mensalidade ' || to_char(_m, 'MM/YYYY') || ' · ' || _u.items, 200), updated_at = now() where id = _old.id;
          insert into public.billing_events (invoice_id, kind, detail) values (_old.id, 'valor_atualizado', public.brl(_old.amount) || ' → ' || public.brl(_sum));
        end if;
      end if;
      _old := null;
    end loop;
  end loop;
  perform public.invoice_group_auto();
  return _n;
end $function$;

-- Valor mudado à mão na Cobrança fica registrado (a atualização automática da mensalidade respeita).
do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.invoice_save'::regproc);
  if position('valor_manual' in _src) = 0 then
    _src := replace(_src, $x$  if not found then raise exception 'Fatura ja enviada ao gateway ou paga' using errcode = 'PF006'; end if;
  return _id;$x$, $x$  if not found then raise exception 'Fatura ja enviada ao gateway ou paga' using errcode = 'PF006'; end if;
  insert into public.billing_events (invoice_id, kind, detail) values (_id, 'valor_manual', (_data->>'amount'));
  return _id;$x$);
    if position('valor_manual' in _src) = 0 then raise exception 'invoice_save: texto esperado não encontrado'; end if;
    execute _src;
  end if;
end $do$;

-- Item 12: lançamento que veio de fatura não muda a data pelo Caixa (muda pela Cobrança).
create or replace function public.fin_entry_save(_id uuid, _data jsonb)
returns uuid language plpgsql security definer set search_path = '' as $function$
declare
  _unit text := _data->>'unit';
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  _paid date := nullif(_data->>'paid_at', '')::date;
  _status text := coalesce(nullif(_data->>'status', ''), case when _paid is null then 'pendente' else 'pago' end);
  _new uuid;
  _old public.fin_entries;
begin
  if not public.can_finance(_unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _id is not null then
    select * into _old from public.fin_entries e where e.id = _id and public.can_finance(e.unit);
    if _old.id is null then raise exception 'Lancamento nao encontrado' using errcode = 'PF004'; end if;
    if coalesce(_old.external_id, '') like 'inv:%' and (
         _unit is distinct from _old.unit or (_data->>'kind') is distinct from _old.kind
         or (_data->>'amount')::numeric is distinct from _old.amount
         or (nullif(_data->>'due_date', '') is not null and nullif(_data->>'due_date', '')::date is distinct from _old.due_date)) then
      raise exception 'Este lancamento vem de uma fatura: mude valor, data e empresa pela Cobranca' using errcode = 'PF010';
    end if;
  end if;
  if _status <> 'pago' then _paid := null; elsif _paid is null then _paid := _today; end if;

  if _id is null then
    insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, client_id, notes, created_by)
    values (_unit, _data->>'kind', nullif(_data->>'category_id', '')::uuid, trim(_data->>'description'), (_data->>'amount')::numeric,
      coalesce(nullif(_data->>'due_date', '')::date, _today), _paid, _status, nullif(_data->>'client_id', '')::uuid, nullif(_data->>'notes', ''), (select auth.uid()))
    returning id into _new;
    return _new;
  end if;

  update public.fin_entries set unit = _unit, kind = _data->>'kind', category_id = nullif(_data->>'category_id', '')::uuid,
    description = trim(_data->>'description'), amount = (_data->>'amount')::numeric,
    due_date = coalesce(nullif(_data->>'due_date', '')::date, due_date), paid_at = _paid, status = _status,
    client_id = case when _data ? 'client_id' then nullif(_data->>'client_id', '')::uuid else client_id end,
    notes = case when _data ? 'notes' then nullif(_data->>'notes', '') else notes end, updated_at = now()
  where id = _id;
  return _id;
end;
$function$;

-- Item 13: membro não ganha mais que o cliente paga (só o admin confirma de propósito).
do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.service_job_save'::regproc);
  if position('PF014' in _src) = 0 then
    _src := replace(_src, $x$  select name into _client_name from public.clients where id = _client;$x$,
      $x$  if _client_amount > 0 and _staff_amount > _client_amount
     and not (coalesce((_data->>'confirm_over')::boolean, false) and public.has_role('admin')) then
    raise exception 'O membro receberia mais do que o cliente paga' using errcode = 'PF014';
  end if;
  select name into _client_name from public.clients where id = _client;$x$);
    execute _src;
  end if;
end $do$;

-- Item 14: cliente desfez o pagamento e o membro já recebeu: o admin é avisado.
create or replace function public.service_job_on_invoice()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare _j record; _st text;
begin
  if new.source <> 'avulso' or coalesce(new.ref, '') not like 'job:%' or new.status is not distinct from old.status then return null; end if;
  for _j in select * from public.service_jobs where invoice_id = new.id loop
    if new.status = 'pago' then
      perform public.service_job_release(_j.id, (coalesce(new.paid_at, now()) at time zone 'America/Sao_Paulo')::date);
    elsif old.status = 'pago' and _j.payable_id is not null then
      update public.fin_entries set status = 'cancelado', paid_at = null, updated_at = now(),
        notes = coalesce(notes || ' ', '') || 'Cancelado: o pagamento do cliente foi desfeito.'
      where id = _j.payable_id and status = 'pendente';
      if found then
        update public.service_jobs set payable_id = null where id = _j.id;
      else
        select status into _st from public.fin_entries where id = _j.payable_id;
        if _st = 'pago' then
          perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_late',
            'Pagamento desfeito, mas o membro já recebeu', (select name from public.clients where id = new.client_id) || ': ' || _j.title
              || '. O repasse ao membro já foi pago; combine o acerto.', '/financeiro/cobranca?fatura=' || new.id, new.client_id);
          insert into public.billing_events (invoice_id, kind, detail) values (new.id, 'repasse_ja_pago', _j.title);
        end if;
      end if;
    end if;
  end loop;
  return null;
end $function$;

-- Itens 23 e 30: lembrete ao cliente só com a chave "Lembretes" ligada; aviso interno e "vencido" seguem (outra linha na central);
-- avisos abrem a fatura exata; valor é o saldo em aberto.
create or replace function public.billing_reminders_run()
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  _i record; _d int; _msg text; _sent int := 0; _alerts int := 0; _stops int := 0;
  _client_on boolean := coalesce((select reminders_enabled from public.billing_settings where id), false);
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  for _i in
    select (array_agg(i.id order by i.id))[1] as id, array_agg(i.id) as ids, (array_agg(i.client_id))[1] as client_id, max(c.name) as client_name,
      coalesce(max(g.description), max(i.description)) as description, sum(i.amount - i.partial_paid) as amount, max(i.due_date) as due_date,
      coalesce(max(i.payment_url), public.pay_url((array_agg(i.pay_token order by i.id))[1])) as payment_url, bool_and(i.status = 'pendente') as all_pending
    from public.invoices i join public.clients c on c.id = i.client_id left join public.invoice_groups g on g.id = i.group_id
    where i.status in ('pendente', 'vencido') and i.due_date between _today - 7 and _today + 1
    group by coalesce(i.group_id, i.id)
  loop
    _d := _today - _i.due_date;
    if _d in (-1, 0, 1) then
      if not _client_on then continue; end if;
      _msg := case _d
        when -1 then 'Oi, ' || _i.client_name || '! Passando para lembrar que amanhã vence ' || _i.description || ' (' || public.brl(_i.amount) || ').'
        when 0 then 'Oi, ' || _i.client_name || '! Hoje vence ' || _i.description || ' (' || public.brl(_i.amount) || ').'
        else 'Oi, ' || _i.client_name || '! Não identificamos o pagamento de ' || _i.description || ', que venceu ontem. Se já pagou, pode ignorar esta mensagem.'
      end || coalesce(E'\n\nPara pagar: ' || _i.payment_url, '');
      if public.notify_client_private(_i.client_id, 'billing_reminder', _msg, 'inv:' || _i.id || ':' || _d) then
        _sent := _sent + 1;
        insert into public.billing_events (invoice_id, kind, detail) values (_i.id, 'lembrete', 'D' || case when _d >= 0 then '+' else '' end || _d);
      end if;
    elsif _d = 3 and not exists (select 1 from public.billing_events e where e.invoice_id = _i.id and e.kind = 'alerta_gestor') then
      perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_late',
        'Cobrança atrasada há 3 dias', _i.client_name || ': ' || _i.description, '/financeiro/cobranca?fatura=' || _i.id, _i.client_id);
      insert into public.billing_events (invoice_id, kind) values (_i.id, 'alerta_gestor');
      _alerts := _alerts + 1;
    elsif _d >= 7 and _i.all_pending then
      update public.invoices set status = 'vencido', updated_at = now() where id = any(_i.ids);
      perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_stop',
        'Cobrança parou: falar com o cliente', _i.client_name || ' está com ' || _i.description || ' atrasado há 7 dias. A régua parou e agora é conversa humana.',
        '/financeiro/cobranca?fatura=' || _i.id, _i.client_id);
      insert into public.billing_events (invoice_id, kind) values (_i.id, 'parou_d7');
      _stops := _stops + 1;
    end if;
  end loop;
  return jsonb_build_object('lembretes', _sent, 'alertas', _alerts, 'paradas', _stops, 'lembretes_ligados', _client_on);
end $function$;

-- Ninguém de fora chama as funções internas novas.
revoke execute on function public.invoice_clear_match(uuid[]) from public, anon, authenticated;
revoke execute on function public.invoice_add_partial(uuid, numeric, date, text) from public, anon, authenticated;
revoke execute on function public.fin_guess_open_invoice(text, numeric, date) from public, anon, authenticated;
revoke execute on function public.invoice_open_amount(public.invoices) from public, anon;
revoke execute on function public.fin_entry_invoice_confirm(uuid, uuid) from public, anon;
revoke execute on function public.fin_entry_review_dismiss(uuid) from public, anon;
grant execute on function public.fin_entry_invoice_confirm(uuid, uuid) to authenticated;
grant execute on function public.fin_entry_review_dismiss(uuid) to authenticated;
grant execute on function public.invoice_clear_match(uuid[]), public.invoice_add_partial(uuid, numeric, date, text), public.fin_guess_open_invoice(text, numeric, date) to service_role;
