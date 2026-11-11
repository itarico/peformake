-- Nova venda: avulso de cliente recorrente vence junto com a mensalidade da MESMA empresa (pedido do Italo, 11/11).
-- Devolve a próxima data de cobrança: a mensalidade em aberto mais próxima (mesma empresa) ou, sem ela, o próximo
-- dia de cobrança do contrato. Sem valores: só a data.
create or replace function public.sale_next_due(_client uuid, _unit text)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _today date := (now() at time zone 'America/Sao_Paulo')::date; _due date; _day int; _cand date;
begin
  perform public.commercial_require_team();
  select i.due_date into _due from public.invoices i
  where i.client_id = _client and i.unit = _unit and i.source = 'mensalidade' and i.status = 'pendente' and i.due_date >= _today
  order by i.due_date limit 1;
  if _due is not null then return jsonb_build_object('due', _due, 'from', 'fatura'); end if;
  select c.billing_day into _day from public.client_contracts c
  join public.clients cl on cl.id = c.client_id and cl.client_type = 'recurring' and cl.is_active and not cl.is_lost
  where c.client_id = _client and c.billing_day between 1 and 31;
  if _day is null then return null; end if;
  _cand := least(date_trunc('month', _today)::date + (_day - 1), (date_trunc('month', _today) + interval '1 month - 1 day')::date);
  if _cand <= _today then
    _cand := least((date_trunc('month', _today) + interval '1 month')::date + (_day - 1), (date_trunc('month', _today) + interval '2 month - 1 day')::date);
  end if;
  return jsonb_build_object('due', _cand, 'from', 'contrato');
end $$;
revoke all on function public.sale_next_due(uuid, text) from public, anon;
grant execute on function public.sale_next_due(uuid, text) to authenticated;
