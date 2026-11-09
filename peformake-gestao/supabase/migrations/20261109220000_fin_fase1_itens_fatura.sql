-- Financeiro · Fase 1, passo 1: itens por serviço dentro da fatura e os estados do dinheiro.
-- Antes: a mensalidade era um valor só por empresa ("Consultoria, Design, Tráfego"), sem dar para dizer quanto é de cada serviço.
-- Agora: cada fatura tem itens (um por serviço contratado no mês; avulsos têm um item). Cada item guarda o valor do mês
-- (não muda se o preço do cadastro mudar depois) e o estado:
--   previsto   = ainda vai acontecer (reservado para orçamento e meses futuros)
--   confirmado = mês começou com contrato ativo / avulso lançado
--   cobrado    = a fatura tem link de pagamento
--   pago       = o dinheiro entrou
--   cancelado  = a fatura foi cancelada
-- Chave única (serviço do cliente + mês) impede cobrar o mesmo serviço duas vezes no mês.

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  client_service_id uuid references public.client_services(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  unit text not null check (unit in ('peformake', 'ellcazo')),
  month date not null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  amount numeric(12,2) not null,
  state text not null default 'confirmado' check (state in ('previsto', 'confirmado', 'cobrado', 'pago', 'cancelado')),
  created_at timestamptz not null default now()
);
create index if not exists invoice_items_invoice on public.invoice_items(invoice_id);
create index if not exists invoice_items_client_month on public.invoice_items(client_id, month);
create unique index if not exists invoice_items_service_month on public.invoice_items(client_service_id, month) where client_service_id is not null and state <> 'cancelado';
alter table public.invoice_items enable row level security;
create policy invoice_items_read on public.invoice_items for select to authenticated using (public.can_finance(unit));

-- Estado do item a partir da fatura.
create or replace function public.invoice_item_state(_status text, _payment_url text)
returns text language sql immutable set search_path to '' as $$
  select case when _status = 'pago' then 'pago' when _status = 'cancelado' then 'cancelado'
    when _payment_url is not null then 'cobrado' else 'confirmado' end
$$;

-- Itens da mensalidade de um cliente num mês, por empresa (um por serviço ativo com preço).
create or replace function public.client_month_items(_client uuid)
returns table(client_service_id uuid, service_id uuid, unit text, name text, quantity numeric, unit_price numeric, discount numeric, amount numeric)
language sql stable security definer set search_path to '' as $$
  select cs.id, s.id, case when s.area = 'audiovisual' then 'ellcazo' else 'peformake' end, s.name,
    coalesce(cs.quantity, 1)::numeric, coalesce(p.price, 0),
    round(case when p.discount_type in ('percent', 'percentage') then coalesce(p.price, 0) * coalesce(cs.quantity, 1) * coalesce(p.discount_value, 0) / 100 else coalesce(p.discount_value, 0) end, 2),
    round(greatest(0, coalesce(p.price, 0) * coalesce(cs.quantity, 1)
      - case when p.discount_type in ('percent', 'percentage') then coalesce(p.price, 0) * coalesce(cs.quantity, 1) * coalesce(p.discount_value, 0) / 100 else coalesce(p.discount_value, 0) end), 2)
  from public.client_services cs
  join public.services s on s.id = cs.service_id
  left join public.client_service_prices p on p.client_service_id = cs.id
  where cs.client_id = _client and cs.is_active and coalesce(p.price, 0) > 0
$$;
revoke execute on function public.client_month_items(uuid) from public, anon, authenticated;

-- Fatura que não é mensalidade (avulso, sinal, extra): nasce com um item igual a ela.
create or replace function public.invoice_single_item()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.source = 'mensalidade' then return null; end if;
  insert into public.invoice_items (invoice_id, client_id, unit, month, description, unit_price, amount, state)
  values (new.id, new.client_id, new.unit, date_trunc('month', new.due_date)::date, new.description, new.amount, new.amount,
    public.invoice_item_state(new.status, new.payment_url));
  return null;
end $function$;
create trigger invoice_single_item after insert on public.invoices for each row execute function public.invoice_single_item();

-- Fatura muda de situação ou ganha link → os itens acompanham. Fatura de item único que muda de valor → o item acompanha.
create or replace function public.invoice_items_follow()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.status is distinct from old.status or new.payment_url is distinct from old.payment_url then
    update public.invoice_items set state = public.invoice_item_state(new.status, new.payment_url)
    where invoice_id = new.id and state <> 'previsto';
  end if;
  if new.amount is distinct from old.amount and (select count(*) from public.invoice_items where invoice_id = new.id) = 1 then
    update public.invoice_items set unit_price = new.amount, amount = new.amount, quantity = 1, discount = 0 where invoice_id = new.id;
  end if;
  if new.description is distinct from old.description and (select count(*) from public.invoice_items where invoice_id = new.id) = 1 and new.source <> 'mensalidade' then
    update public.invoice_items set description = new.description where invoice_id = new.id;
  end if;
  return null;
end $function$;
create trigger invoice_items_follow after update of status, payment_url, amount, description on public.invoices
  for each row execute function public.invoice_items_follow();

-- Geração da mensalidade: valor = soma dos itens, e os itens ficam gravados.
create or replace function public.invoice_generate_month(_month date)
returns integer language plpgsql security definer set search_path to '' as $function$
declare
  _m date := date_trunc('month', _month)::date;
  _n integer := 0;
  _c record;
  _u record;
  _day int;
  _inv uuid;
begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  for _c in
    select c.id, c.name, ct.billing_day from public.clients c
    left join public.client_contracts ct on ct.client_id = c.id
    where c.is_active and not c.is_lost and coalesce(c.client_type, 'recurring') <> 'one-off'
      and (ct.end_date is null or ct.end_date >= _m) and (ct.start_date is null or ct.start_date < (_m + interval '1 month'))
  loop
    _day := least(greatest(coalesce(_c.billing_day, 30), 1), extract(day from (_m + interval '1 month' - interval '1 day'))::int);
    for _u in
      select x.unit, sum(x.amount) amount, string_agg(x.name, ', ' order by x.name) items
      from public.client_month_items(_c.id) x
      where not exists (select 1 from public.invoice_items ii where ii.client_service_id = x.client_service_id and ii.month = _m and ii.state <> 'cancelado')
      group by x.unit
    loop
      if coalesce(_u.amount, 0) <= 0 then continue; end if;
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
    end loop;
  end loop;
  perform public.invoice_group_auto();
  return _n;
end;
$function$;

-- Itens das faturas que já existem.
-- Mensalidade em que a soma dos serviços de hoje bate com a fatura: um item por serviço. Senão: um item com o valor da fatura.
insert into public.invoice_items (invoice_id, client_id, client_service_id, service_id, unit, month, description, quantity, unit_price, discount, amount, state)
select i.id, i.client_id, x.client_service_id, x.service_id, x.unit, date_trunc('month', i.due_date)::date, x.name, x.quantity, x.unit_price, x.discount, x.amount,
  public.invoice_item_state(i.status, i.payment_url)
from public.invoices i
cross join lateral public.client_month_items(i.client_id) x
where i.source = 'mensalidade' and x.unit = i.unit
  and not exists (select 1 from public.invoice_items ii where ii.invoice_id = i.id)
  and (select coalesce(sum(y.amount), 0) from public.client_month_items(i.client_id) y where y.unit = i.unit) = i.amount;

insert into public.invoice_items (invoice_id, client_id, unit, month, description, unit_price, amount, state)
select i.id, i.client_id, i.unit, date_trunc('month', i.due_date)::date, i.description, i.amount, i.amount, public.invoice_item_state(i.status, i.payment_url)
from public.invoices i
where not exists (select 1 from public.invoice_items ii where ii.invoice_id = i.id);
