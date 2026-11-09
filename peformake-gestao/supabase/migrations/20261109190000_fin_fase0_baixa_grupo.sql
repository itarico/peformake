-- Financeiro · Fase 0, item 3: baixa no Caixa vale para a cobrança junta inteira.
-- (Aplicada depois de 20261109180000: mesma regra da baixa do grupo, mais o bloqueio de cancelar pelo Caixa e a conciliação por grupo.)
-- (A trava de valor/empresa em lançamento que veio de fatura já existe em fin_entry_save.)
-- Antes: dar baixa no Caixa numa fatura que faz parte de uma cobrança junta pagava só aquela parte,
-- e o Asaas recebia a baixa com valor parcial. Agora a baixa quita o grupo todo, com a mesma data;
-- cancelar pelo Caixa uma parte de cobrança junta com link é bloqueado (cancela-se pela Cobrança).

create or replace function public.fin_entry_sync_invoice()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare _inv uuid; _group uuid; _linked boolean; _ids uuid[];
begin
  if new.external_id is null or new.external_id not like 'inv:%' then return null; end if;
  _inv := substring(new.external_id from 5)::uuid;
  select group_id, (gateway_id is not null or payment_url is not null) into _group, _linked from public.invoices where id = _inv;
  if _group is not null and new.status = 'cancelado' and _linked then
    raise exception 'Esta fatura faz parte de uma cobrança junta com link: cancele pela Cobrança' using errcode = 'PF008';
  end if;
  _ids := case when _group is not null and new.status = 'pago' then public.invoice_group_ids(_inv) else array[_inv] end;
  update public.invoices i set
    status = case new.status when 'pago' then 'pago' when 'cancelado' then 'cancelado' else (case when i.status = 'vencido' then 'vencido' else 'pendente' end) end,
    paid_at = case when new.status = 'pago' then coalesce(i.paid_at, public.brt_noon(new.paid_at)) end,
    paid_amount = case when new.status = 'pago' then coalesce(i.paid_amount, case when i.id = _inv then new.amount else i.amount end) end,
    updated_at = now()
  where i.id = any(_ids) and (i.status is distinct from case new.status when 'pago' then 'pago' when 'cancelado' then 'cancelado' else i.status end
                       or (new.status <> 'pago' and i.status = 'pago'));
  if found then
    insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_caixa', new.status;
  end if;
  return null;
end $function$;

-- Conciliação também enxerga a cobrança junta: o valor recebido pode bater com a soma do grupo.
create or replace function public.fin_match_open_invoice(_client uuid, _unit text, _amount numeric, _dates date[])
returns uuid language sql stable security definer set search_path to '' as $$
  with open as (
    select i.* from public.invoices i
    where i.status in ('pendente', 'vencido') and i.paid_ref is null
      and (_client is null or i.client_id = _client)
  ), cand as (
    -- fatura sozinha, da empresa do extrato (quando informada)
    select o.id, o.due_date from open o where o.group_id is null and (_unit is null or o.unit = _unit) and abs(o.amount - _amount) < 0.01
    union all
    -- cobrança junta (pode ter Peformake e Ellcazo): soma do grupo inteiro
    select (array_agg(o.id order by o.id))[1], max(o.due_date) from open o where o.group_id is not null
    group by o.group_id
    having abs(sum(o.amount) - _amount) < 0.01 and (_unit is null or bool_or(o.unit = _unit))
       and count(*) = (select count(*) from public.invoices g where g.group_id = o.group_id and g.status <> 'cancelado')
  ), c as (
    select id from cand where exists (select 1 from unnest(_dates) d where d is not null and abs(cand.due_date - d) <= 3)
  )
  select case when (select count(*) from c) = 1 then (select id from c) end
$$;
revoke all on function public.fin_match_open_invoice(uuid, text, numeric, date[]) from public, anon, authenticated;

create or replace function public.invoice_paid_matched(_inv uuid, _ref text, _paid_on date, _value numeric, _how text)
returns boolean language plpgsql security definer set search_path to '' as $function$
declare _client uuid; _n int; _ids uuid[];
begin
  _ids := public.invoice_group_ids(_inv);
  if _ids is null or exists (select 1 from public.invoices where id = any(_ids) and (status not in ('pendente', 'vencido') or paid_ref is not null)) then
    return false;
  end if;
  perform set_config('pf.gateway_paid', '1', true);
  update public.invoices set status = 'pago', paid_at = coalesce(public.brt_noon(_paid_on), now()),
    paid_amount = case when cardinality(_ids) = 1 then coalesce(_value, amount) else amount end,
    paid_ref = case when id = _inv then _ref else _ref || '#' || id end, updated_at = now(),
    gateway_close = case when gateway_id is not null and gateway_closed_at is null then 'cancel' else gateway_close end
  where id = any(_ids);
  get diagnostics _n = row_count;
  perform set_config('pf.gateway_paid', '', true);
  if _n = 0 then return false; end if;
  select client_id into _client from public.invoices where id = _inv;
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'pago_conciliado', _how || ': ' || _ref;
  perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
    'Pagamento recebido', (select name from public.clients where id = _client) || ': ' || public.brl(_value) || ' (' || _how || ')', '/financeiro/cobranca', _client);
  return true;
end $function$;
revoke all on function public.invoice_paid_matched(uuid, text, date, numeric, text) from public, anon, authenticated;
