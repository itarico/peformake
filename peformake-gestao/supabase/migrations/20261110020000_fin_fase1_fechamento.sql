-- Financeiro · Fase 1, passo 4: fechamento do mês (dia 26) com a fila "Para revisar".
-- Decisões do Italo (08/11): o ciclo fecha no dia 25. Erro nosso: o que faltou vira crédito para o mês seguinte
-- (a fatura sai cheia). Se o crédito também não for entregue no fechamento seguinte, vence e o sistema SUGERE o
-- desconto com o valor calculado; o admin aprova com um toque (nunca desconta sozinho). Culpa do cliente não gera nada.
-- Começa a valer em novembro de 2026 (antes do sistema as entregas não eram registradas).

create table if not exists public.delivery_credits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  client_service_id uuid references public.client_services(id) on delete set null,
  unit text not null check (unit in ('peformake', 'ellcazo')),
  service text not null,
  measure text,
  month date not null,               -- mês em que faltou
  qty numeric(8,2) not null check (qty > 0),
  unit_value numeric(12,2) not null default 0,
  status text not null default 'credito' check (status in ('credito', 'entregue', 'sugerido', 'aprovado', 'aplicado', 'dispensado')),
  discount numeric(12,2),
  invoice_id uuid references public.invoices(id) on delete set null,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (client_service_id, month)
);
alter table public.delivery_credits enable row level security;
create policy delivery_credits_read on public.delivery_credits for select to authenticated using (public.can_finance(unit));

-- Valor de uma entrega: o item da fatura do mês (valor / quantidade contratada), ou o preço do serviço.
create or replace function public.delivery_unit_value(_cs uuid, _month date, _contracted numeric)
returns numeric language sql stable security definer set search_path to '' as $$
  select round(coalesce(
    (select sum(ii.amount) from public.invoice_items ii where ii.client_service_id = _cs and ii.month = _month and ii.state <> 'cancelado'),
    (select x.amount from public.client_services cs cross join lateral public.client_month_items(cs.client_id) x where cs.id = _cs and x.client_service_id = _cs)
  ) / nullif(_contracted, 0), 2)
$$;

-- Aplica um desconto aprovado na fatura de mensalidade em aberto e ainda sem link do cliente (mesma empresa).
-- Sem fatura assim agora: fica "aprovado" e entra na próxima mensalidade gerada.
create or replace function public.delivery_credit_apply(_credit uuid)
returns boolean language plpgsql security definer set search_path to '' as $function$
declare _c public.delivery_credits; _inv uuid;
begin
  select * into _c from public.delivery_credits where id = _credit and status = 'aprovado' for update;
  if _c.id is null or coalesce(_c.discount, 0) <= 0 then return false; end if;
  select i.id into _inv from public.invoices i
  where i.client_id = _c.client_id and i.unit = _c.unit and i.source = 'mensalidade' and i.status in ('pendente', 'vencido')
    and i.payment_url is null and i.gateway_id is null
  order by i.due_date limit 1;
  if _inv is null then return false; end if;
  insert into public.invoice_items (invoice_id, client_id, unit, month, description, quantity, unit_price, discount, amount, state)
  select _inv, _c.client_id, _c.unit, date_trunc('month', i.due_date)::date,
    left('Desconto: ' || trim(to_char(_c.qty, 'FM9990.##')) || ' ' || coalesce(_c.measure, 'entregas') || ' de ' || _c.service || ' não entregues em ' || to_char(_c.month, 'MM/YYYY'), 200),
    1, -_c.discount, 0, -_c.discount, public.invoice_item_state(i.status, i.payment_url)
  from public.invoices i where i.id = _inv;
  update public.invoices set amount = greatest(0, amount - _c.discount), updated_at = now() where id = _inv;
  update public.delivery_credits set status = 'aplicado', invoice_id = _inv where id = _c.id;
  insert into public.billing_events (invoice_id, kind, detail) values (_inv, 'desconto_entrega', _c.service || ' ' || to_char(_c.month, 'MM/YYYY') || ': ' || _c.discount);
  return true;
end $function$;

-- Fechamento de um mês (roda no dia 26). Idempotente.
create or replace function public.month_close_run(_month date default null)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  _m date := date_trunc('month', coalesce(_month, (now() at time zone 'America/Sao_Paulo')::date))::date;
  _prev date := (date_trunc('month', coalesce(_month, (now() at time zone 'America/Sao_Paulo')::date)) - interval '1 month')::date;
  _new int := 0; _done int := 0; _sug int := 0;
  _r record;
begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _m < date '2026-11-01' then return jsonb_build_object('pulado', 'Antes de novembro de 2026 as entregas não eram registradas no sistema.'); end if;
  if _today <= _m + 24 then return jsonb_build_object('pulado', 'O ciclo deste mês fecha no dia 25.'); end if;

  -- 1) Créditos do mês anterior: entregues agora (sobra acima do contratado cobre) ou vencem e viram sugestão de desconto.
  for _r in
    select dc.id, dc.qty, dc.unit_value, s.delivered, s.contracted
    from public.delivery_credits dc
    left join lateral (select x.delivered, x.contracted from public.client_service_status(_m, dc.client_id) x where x.client_service_id = dc.client_service_id) s on true
    where dc.month = _prev and dc.status = 'credito'
  loop
    if coalesce(_r.delivered, 0) - coalesce(_r.contracted, 0) >= _r.qty then
      update public.delivery_credits set status = 'entregue' where id = _r.id; _done := _done + 1;
    else
      update public.delivery_credits set status = 'sugerido',
        discount = round(greatest(_r.qty - greatest(coalesce(_r.delivered, 0) - coalesce(_r.contracted, 0), 0), 0) * _r.unit_value, 2)
      where id = _r.id; _sug := _sug + 1;
    end if;
  end loop;

  -- 2) Faltas nossas deste mês viram crédito para o mês seguinte.
  insert into public.delivery_credits (client_id, client_service_id, unit, service, measure, month, qty, unit_value)
  select s.client_id, s.client_service_id, case when s.area = 'audiovisual' then 'ellcazo' else 'peformake' end, s.service, s.measure, _m, s.ours_missing,
    coalesce(public.delivery_unit_value(s.client_service_id, _m, s.contracted), 0)
  from public.client_service_status(_m, null) s
  where s.state = 'faltou' and coalesce(s.ours_missing, 0) > 0
  on conflict (client_service_id, month) do nothing;
  get diagnostics _new = row_count;

  if _new + _sug > 0 then
    perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'month_close',
      'Fechamento de ' || to_char(_m, 'MM/YYYY') || ': ' || (_new + _sug) || ' para revisar',
      _new || ' crédito(s) para o próximo mês e ' || _sug || ' desconto(s) sugerido(s).', '/financeiro/cobranca?revisar=1', null);
  end if;
  return jsonb_build_object('creditos_novos', _new, 'creditos_entregues', _done, 'descontos_sugeridos', _sug);
end $function$;

-- Aprovar (aplica o desconto) ou dispensar uma sugestão; ou dar baixa num crédito à mão.
create or replace function public.delivery_credit_decide(_id uuid, _action text, _discount numeric default null)
returns text language plpgsql security definer set search_path to '' as $function$
declare _c public.delivery_credits;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _c from public.delivery_credits where id = _id for update;
  if _c.id is null then raise exception 'Nao encontrado' using errcode = 'PF004'; end if;
  if _action = 'aprovar' then
    if _c.status <> 'sugerido' then raise exception 'Só sugestão pode ser aprovada' using errcode = 'PF007'; end if;
    update public.delivery_credits set status = 'aprovado', discount = coalesce(_discount, discount), decided_by = (select auth.uid()), decided_at = now() where id = _id;
    return case when public.delivery_credit_apply(_id) then 'aplicado' else 'aprovado' end;
  elsif _action = 'dispensar' then
    update public.delivery_credits set status = 'dispensado', decided_by = (select auth.uid()), decided_at = now() where id = _id and status in ('credito', 'sugerido', 'aprovado');
    return 'dispensado';
  elsif _action = 'entregue' then
    update public.delivery_credits set status = 'entregue', decided_by = (select auth.uid()), decided_at = now() where id = _id and status in ('credito', 'sugerido');
    return 'entregue';
  end if;
  raise exception 'Ação inválida' using errcode = 'PF006';
end $function$;
grant execute on function public.delivery_credit_decide(uuid, text, numeric) to authenticated;

-- Mensalidade nova: entram os descontos aprovados que estavam esperando uma fatura sem link.
create or replace function public.delivery_credits_apply_pending()
returns integer language plpgsql security definer set search_path to '' as $function$
declare _id uuid; _n int := 0;
begin
  for _id in select id from public.delivery_credits where status = 'aprovado' order by decided_at loop
    if public.delivery_credit_apply(_id) then _n := _n + 1; end if;
  end loop;
  return _n;
end $function$;

-- Agendamento: dia 26, 09:00 de Brasília (12:00 UTC) fecha o mês; todo dia aplica descontos aprovados que estavam esperando.
select cron.schedule('month-close', '0 12 26 * *', $$ select public.month_close_run(); $$);
select cron.schedule('delivery-credits-apply', '20 12 * * *', $$ select public.delivery_credits_apply_pending(); $$);

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job)
values ('fin_fechamento', 'financeiro', 20, 'Fechamento do mês',
  'No dia 26 confere as entregas de cada serviço contra o contratado. O que faltou por erro nosso vira crédito no mês seguinte; crédito que vence vira desconto sugerido.',
  'Nunca desconta sozinho: o desconto entra na fatura só quando o admin aprova em Cobrança → Para revisar. O que ficou parado com o cliente não conta.',
  'Dia 26, 09:00', false, 'medio', 'month-close')
on conflict (key) do nothing;
