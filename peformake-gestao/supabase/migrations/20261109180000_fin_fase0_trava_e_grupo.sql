-- Financeiro · Fase 0, item 3.
-- a) Lançamento que veio de fatura (external_id 'inv:...') não muda valor, empresa nem tipo pelo Caixa:
--    antes a fatura não acompanhava e a edição se perdia. Ajuste é pela Cobrança.
-- b) Baixa no Caixa de uma fatura que faz parte de uma cobrança junta (group_id) quita o grupo inteiro,
--    para o Asaas receber o valor total da cobrança e não só uma parte.

create or replace function public.fin_entry_save(_id uuid, _data jsonb)
returns uuid language plpgsql security definer set search_path to '' as $function$
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
         or (_data->>'amount')::numeric is distinct from _old.amount) then
      raise exception 'Este lancamento vem de uma fatura: mude valor e empresa pela Cobranca' using errcode = 'PF010';
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

-- Baixa no Caixa → fatura paga com a data certa; se a fatura é de uma cobrança junta, o grupo inteiro fica pago.
create or replace function public.fin_entry_sync_invoice()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare _inv uuid; _group uuid;
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
    if new.status = 'pago' then
      select group_id into _group from public.invoices where id = _inv;
      if _group is not null then
        with paid as (
          update public.invoices set status = 'pago', paid_at = public.brt_noon(new.paid_at), paid_amount = amount, updated_at = now()
          where group_id = _group and id <> _inv and status not in ('pago', 'cancelado')
          returning id)
        insert into public.billing_events (invoice_id, kind, detail) select id, 'status_caixa', 'pago com o grupo' from paid;
      end if;
    end if;
  end if;
  return null;
end $function$;
