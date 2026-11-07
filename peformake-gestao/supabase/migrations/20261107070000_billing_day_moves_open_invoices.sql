-- Mudou o dia de cobrança do cliente: a mensalidade em aberto que ainda não foi para o Asaas (sem link)
-- passa para o dia novo, no mesmo mês. Fatura já enviada ao cliente, paga ou cancelada não muda.
create or replace function public.client_contract_billing_day_sync()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.billing_day is distinct from old.billing_day and new.billing_day between 1 and 31 then
    update public.invoices i set
      due_date = date_trunc('month', i.due_date)::date
        + (least(new.billing_day, extract(day from (date_trunc('month', i.due_date) + interval '1 month - 1 day'))::int) - 1),
      updated_at = now()
    where i.client_id = new.client_id
      and i.source = 'mensalidade'
      and i.status = 'pendente'
      and i.gateway_id is null and i.payment_url is null
      and i.due_date >= (now() at time zone 'America/Sao_Paulo')::date;
  end if;
  return new;
end $$;

create trigger client_contract_billing_day_sync
  after update of billing_day on public.client_contracts
  for each row execute function public.client_contract_billing_day_sync();
