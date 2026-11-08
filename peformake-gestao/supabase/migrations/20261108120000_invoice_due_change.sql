-- Mudar vencimento direto na Cobrança: só esta fatura (ou a cobrança junta inteira) ou o dia de cobrança de todo mês.

create or replace function public.invoice_set_due(_id uuid, _due date, _every_month boolean default false)
returns void language plpgsql security definer set search_path to '' as $$
declare _inv public.invoices; _ids uuid[];
begin
  select * into _inv from public.invoices where id = _id;
  if _inv.id is null then raise exception 'Fatura não encontrada' using errcode = 'PF004'; end if;
  _ids := coalesce((select array_agg(id) from public.invoices where _inv.group_id is not null and group_id = _inv.group_id), array[_id]);
  if exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if exists (select 1 from public.invoices where id = any(_ids) and (gateway_id is not null or payment_url is not null)) then
    raise exception 'Esta cobrança já tem link de pagamento. Cancele e crie de novo para mudar a data.' using errcode = 'PF006';
  end if;
  if exists (select 1 from public.invoices where id = any(_ids) and status not in ('pendente', 'vencido')) then
    raise exception 'Só dá para mudar a data de fatura em aberto' using errcode = 'PF006';
  end if;

  if _every_month then
    -- Dia de cobrança do contrato: o gatilho já leva junto as mensalidades em aberto (e as cobranças juntas).
    if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
    insert into public.client_contracts (client_id, billing_day) values (_inv.client_id, extract(day from _due)::int)
    on conflict (client_id) do update set billing_day = excluded.billing_day;
  end if;

  update public.invoices set due_date = _due, status = case when _due >= (now() at time zone 'America/Sao_Paulo')::date then 'pendente' else status end, updated_at = now()
  where id = any(_ids);
  update public.invoice_groups set due_date = _due where id = _inv.group_id;
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'vencimento', _due::text || case when _every_month then ' (todo mês)' else '' end;
end $$;

revoke execute on function public.invoice_set_due(uuid, date, boolean) from public, anon;
grant execute on function public.invoice_set_due(uuid, date, boolean) to authenticated;
