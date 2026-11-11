-- Clientes → Resumo: bloco "Clientes avulsos" (base cadastrada, sem misturar com os recorrentes).
-- Compra = fatura avulsa (source avulso ou manual, não cancelada) de cliente avulso. Dinheiro só para administrador.
create or replace function public.dash_clients_avulsos()
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare _admin boolean := public.has_role('admin');
begin
  if not (public.can_access_traffic() or public.can_access_content() or public.can_access_commercial()) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  return (
    with cl as (
      select c.id, coalesce(c.legacy_created_at::date, c.updated_at::date) as since
      from public.clients c where c.client_type = 'one-off'
    ),
    buy as (
      select i.client_id, i.created_at::date as d, i.amount, i.status, i.paid_at, i.paid_amount
      from public.invoices i join cl on cl.id = i.client_id
      where i.source in ('avulso', 'manual') and i.status <> 'cancelado'
    ),
    months as (select (date_trunc('month', current_date) - make_interval(months => g))::date as m from generate_series(0, 11) g),
    paid12 as (select coalesce(paid_amount, amount) v from buy where status = 'pago' and paid_at >= current_date - 365)
    select jsonb_build_object(
      'total', (select count(*) from cl),
      'bought_90d', (select count(distinct client_id) from buy where d >= current_date - 90),
      'new_month', (select count(*) from cl where since >= date_trunc('month', current_date)),
      'buyers', (select count(distinct client_id) from buy),
      'repeat', (select count(*) from (select client_id from buy group by 1 having count(*) > 1) r),
      'new_by_month', (select jsonb_agg(jsonb_build_object('month', m, 'n', (select count(*) from cl where since >= m and since < m + interval '1 month')) order by m) from months),
      'revenue_12m', case when _admin then (select coalesce(sum(v), 0) from paid12) end,
      'paid_count_12m', case when _admin then (select count(*) from paid12) end,
      'ticket', case when _admin then (select round(avg(v), 2) from paid12) end
    )
  );
end;
$function$;
