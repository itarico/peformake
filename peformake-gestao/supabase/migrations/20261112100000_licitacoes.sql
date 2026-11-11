-- Licitação (pedido de compras / ata): o cliente tem um CRÉDITO com itens, quantidade máxima e preço unitário,
-- e vai usando durante a vigência por ordens de serviço (OS). Cada OS realizada vira uma fatura que vence
-- N dias depois (padrão 30) da realização ou da nota fiscal, conforme a licitação.
-- Tudo só para administradores (tem valores). Sem rotina agendada: os avisos são calculados na hora (bid_alerts).

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  unit text not null default 'ellcazo' check (unit in ('peformake', 'ellcazo')),
  buyer text,
  number text not null check (length(trim(number)) between 1 and 60),
  process text,
  issued_on date,
  starts_on date,
  ends_on date,
  payment_days int not null default 30 check (payment_days between 0 and 180),
  due_from text not null default 'realizacao' check (due_from in ('realizacao', 'nf')),
  nf_instructions text,
  notes text,
  files jsonb not null default '[]'::jsonb,
  status text not null default 'ativa' check (status in ('ativa', 'encerrada', 'cancelada')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, number)
);

create table if not exists public.bid_items (
  id uuid primary key default gen_random_uuid(),
  bid_id uuid not null references public.bids(id) on delete cascade,
  position int not null default 0,
  description text not null check (length(trim(description)) between 1 and 200),
  unit_label text not null default 'UN',
  max_qty numeric not null check (max_qty > 0),
  unit_price numeric not null check (unit_price >= 0),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists bid_items_bid on public.bid_items (bid_id);

create table if not exists public.bid_orders (
  id uuid primary key default gen_random_uuid(),
  bid_id uuid not null references public.bids(id) on delete cascade,
  seq int not null,
  planned_on date,
  done_on date,
  status text not null default 'aberta' check (status in ('aberta', 'realizada', 'cancelada')),
  notes text,
  over_ok boolean not null default false,
  nf_number text,
  nf_on date,
  nf_files jsonb not null default '[]'::jsonb,
  invoice_id uuid references public.invoices(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bid_id, seq)
);

create table if not exists public.bid_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.bid_orders(id) on delete cascade,
  item_id uuid not null references public.bid_items(id) on delete cascade,
  qty numeric not null check (qty > 0),
  unit_price numeric not null check (unit_price >= 0)
);
create index if not exists bid_order_items_order on public.bid_order_items (order_id);

alter table public.bids enable row level security;
alter table public.bid_items enable row level security;
alter table public.bid_orders enable row level security;
alter table public.bid_order_items enable row level security;
create policy bids_admin_read on public.bids for select to authenticated using (public.has_role('admin'));
create policy bid_items_admin_read on public.bid_items for select to authenticated using (public.has_role('admin'));
create policy bid_orders_admin_read on public.bid_orders for select to authenticated using (public.has_role('admin'));
create policy bid_order_items_admin_read on public.bid_order_items for select to authenticated using (public.has_role('admin'));

-- Anexos (pedido, edital, E.T., nota fiscal): pasta privada, só admin.
insert into storage.buckets (id, name, public) values ('bid-docs', 'bid-docs', false) on conflict (id) do nothing;
create policy bid_docs_admin_select on storage.objects for select to authenticated using (bucket_id = 'bid-docs' and public.has_role('admin'));
create policy bid_docs_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'bid-docs' and public.has_role('admin'));

-- Salvar a licitação com os itens. Item que saiu da lista é arquivado (o que já foi usado continua contando).
create or replace function public.bid_save(_id uuid, _data jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _bid uuid := _id; _it jsonb; _pos int := 0; _keep uuid[] := '{}'; _item uuid;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if coalesce(trim(_data ->> 'number'), '') = '' then raise exception 'Informe o número do pedido' using errcode = 'PF020'; end if;
  if jsonb_typeof(_data -> 'items') <> 'array' or jsonb_array_length(_data -> 'items') = 0 then raise exception 'Coloque pelo menos um item' using errcode = 'PF020'; end if;
  if (_data ->> 'ends_on') is not null and (_data ->> 'starts_on') is not null and (_data ->> 'ends_on')::date < (_data ->> 'starts_on')::date then
    raise exception 'O fim da vigência é antes do início' using errcode = 'PF020';
  end if;
  if _bid is null then
    insert into public.bids (client_id, unit, buyer, number, process, issued_on, starts_on, ends_on, payment_days, due_from, nf_instructions, notes, files, created_by)
    values ((_data ->> 'client_id')::uuid, coalesce(_data ->> 'unit', 'ellcazo'), nullif(trim(_data ->> 'buyer'), ''), trim(_data ->> 'number'), nullif(trim(_data ->> 'process'), ''),
      nullif(_data ->> 'issued_on', '')::date, nullif(_data ->> 'starts_on', '')::date, nullif(_data ->> 'ends_on', '')::date,
      coalesce(nullif(_data ->> 'payment_days', '')::int, 30), coalesce(_data ->> 'due_from', 'realizacao'),
      nullif(trim(_data ->> 'nf_instructions'), ''), nullif(trim(_data ->> 'notes'), ''), coalesce(_data -> 'files', '[]'::jsonb), auth.uid())
    returning id into _bid;
  else
    update public.bids set unit = coalesce(_data ->> 'unit', unit), buyer = nullif(trim(_data ->> 'buyer'), ''), number = trim(_data ->> 'number'),
      process = nullif(trim(_data ->> 'process'), ''), issued_on = nullif(_data ->> 'issued_on', '')::date,
      starts_on = nullif(_data ->> 'starts_on', '')::date, ends_on = nullif(_data ->> 'ends_on', '')::date,
      payment_days = coalesce(nullif(_data ->> 'payment_days', '')::int, payment_days), due_from = coalesce(_data ->> 'due_from', due_from),
      nf_instructions = nullif(trim(_data ->> 'nf_instructions'), ''), notes = nullif(trim(_data ->> 'notes'), ''),
      files = coalesce(_data -> 'files', files), status = coalesce(_data ->> 'status', status), updated_at = now()
    where id = _bid;
    if not found then raise exception 'Licitação não encontrada' using errcode = 'PF020'; end if;
  end if;
  for _it in select * from jsonb_array_elements(_data -> 'items') loop
    _pos := _pos + 1;
    if coalesce((_it ->> 'max_qty')::numeric, 0) <= 0 then raise exception 'Item %: quantidade precisa ser maior que zero', _pos using errcode = 'PF020'; end if;
    _item := nullif(_it ->> 'id', '')::uuid;
    if _item is not null and exists (select 1 from public.bid_items where id = _item and bid_id = _bid) then
      update public.bid_items set position = _pos, description = trim(_it ->> 'description'), unit_label = coalesce(nullif(trim(_it ->> 'unit_label'), ''), 'UN'),
        max_qty = (_it ->> 'max_qty')::numeric, unit_price = coalesce((_it ->> 'unit_price')::numeric, 0), archived = false
      where id = _item;
    else
      insert into public.bid_items (bid_id, position, description, unit_label, max_qty, unit_price)
      values (_bid, _pos, trim(_it ->> 'description'), coalesce(nullif(trim(_it ->> 'unit_label'), ''), 'UN'), (_it ->> 'max_qty')::numeric, coalesce((_it ->> 'unit_price')::numeric, 0))
      returning id into _item;
    end if;
    _keep := _keep || _item;
  end loop;
  update public.bid_items set archived = true where bid_id = _bid and not (id = any(_keep));
  return _bid;
end $$;

-- Cria a fatura da OS (uma por OS). Sem link do Asaas: órgão paga por transferência depois da NF.
-- gateway 'manual' + gateway_id preenchido = fora da fila do Asaas; no_merge = não junta com mensalidade.
create or replace function public.bid_invoice_make(_order uuid, _due date)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _o record; _amount numeric; _inv uuid;
begin
  select o.*, b.client_id, b.unit, b.number into _o from public.bid_orders o join public.bids b on b.id = o.bid_id where o.id = _order;
  if _o.invoice_id is not null then return _o.invoice_id; end if;
  select round(sum(qty * unit_price), 2) into _amount from public.bid_order_items where order_id = _order;
  if coalesce(_amount, 0) <= 0 then raise exception 'OS sem valor' using errcode = 'PF020'; end if;
  perform set_config('pf.detailed_items', '1', true);
  insert into public.invoices (client_id, unit, description, amount, due_date, status, source, ref, gateway, gateway_id, no_merge, created_by)
  values (_o.client_id, _o.unit, left('Licitação · Pedido ' || _o.number || ' · OS ' || _o.seq, 200), _amount, _due, 'pendente', 'manual',
    'licitacao:' || _order, 'manual', 'licitacao:' || _order, true, auth.uid())
  returning id into _inv;
  insert into public.invoice_items (invoice_id, client_id, unit, month, description, quantity, unit_price, amount, state)
  select _inv, _o.client_id, _o.unit, date_trunc('month', _due)::date, left(i.description, 200), oi.qty, oi.unit_price, round(oi.qty * oi.unit_price, 2), public.invoice_item_state('pendente', null)
  from public.bid_order_items oi join public.bid_items i on i.id = oi.item_id where oi.order_id = _order order by i.position;
  perform set_config('pf.detailed_items', '', true);
  update public.bid_orders set invoice_id = _inv, updated_at = now() where id = _order;
  return _inv;
end $$;
revoke execute on function public.bid_invoice_make(uuid, date) from public, anon, authenticated;

-- Nova OS: escolhe itens e quantidades. Passou do que resta? Só com _force (o admin confirmou).
create or replace function public.bid_order_create(_bid uuid, _data jsonb, _force boolean default false)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _b record; _o uuid; _seq int; _it jsonb; _item record; _used numeric; _over text := ''; _n int := 0;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _b from public.bids where id = _bid;
  if not found then raise exception 'Licitação não encontrada' using errcode = 'PF020'; end if;
  if _b.status <> 'ativa' then raise exception 'Licitação encerrada' using errcode = 'PF020'; end if;
  if jsonb_typeof(_data -> 'items') <> 'array' then raise exception 'Escolha os itens' using errcode = 'PF020'; end if;
  for _it in select * from jsonb_array_elements(_data -> 'items') loop
    if coalesce((_it ->> 'qty')::numeric, 0) <= 0 then continue; end if;
    select * into _item from public.bid_items where id = (_it ->> 'item_id')::uuid and bid_id = _bid;
    if not found then raise exception 'Item não é desta licitação' using errcode = 'PF020'; end if;
    _n := _n + 1;
    select coalesce(sum(oi.qty), 0) into _used from public.bid_order_items oi join public.bid_orders o on o.id = oi.order_id
      where oi.item_id = _item.id and o.status <> 'cancelada';
    if _used + (_it ->> 'qty')::numeric > _item.max_qty then
      _over := _over || format(E'\n• %s: pediu %s, restam %s', _item.description, (_it ->> 'qty')::numeric, greatest(_item.max_qty - _used, 0));
    end if;
  end loop;
  if _n = 0 then raise exception 'Escolha pelo menos um item com quantidade' using errcode = 'PF020'; end if;
  if _over <> '' and not _force then raise exception 'Passa da quantidade da licitação:%', _over using errcode = 'PF021'; end if;
  select coalesce(max(seq), 0) + 1 into _seq from public.bid_orders where bid_id = _bid;
  insert into public.bid_orders (bid_id, seq, planned_on, notes, over_ok, created_by)
  values (_bid, _seq, nullif(_data ->> 'planned_on', '')::date, nullif(trim(_data ->> 'notes'), ''), _over <> '', auth.uid())
  returning id into _o;
  insert into public.bid_order_items (order_id, item_id, qty, unit_price)
  select _o, i.id, (x ->> 'qty')::numeric, i.unit_price
  from jsonb_array_elements(_data -> 'items') x join public.bid_items i on i.id = (x ->> 'item_id')::uuid
  where coalesce((x ->> 'qty')::numeric, 0) > 0;
  return _o;
end $$;

-- Marcar a OS como realizada. Conta da realização: a fatura nasce já com vencimento. Conta da NF: espera a nota.
create or replace function public.bid_order_done(_id uuid, _done_on date default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare _o record; _day date := coalesce(_done_on, (now() at time zone 'America/Sao_Paulo')::date); _inv uuid; _due date;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select o.*, b.due_from, b.payment_days into _o from public.bid_orders o join public.bids b on b.id = o.bid_id where o.id = _id;
  if not found then raise exception 'OS não encontrada' using errcode = 'PF020'; end if;
  if _o.status = 'cancelada' then raise exception 'OS cancelada' using errcode = 'PF020'; end if;
  update public.bid_orders set status = 'realizada', done_on = _day, updated_at = now() where id = _id;
  if _o.due_from = 'realizacao' then
    _due := _day + _o.payment_days;
    _inv := public.bid_invoice_make(_id, _due);
  elsif _o.nf_on is not null then
    _due := _o.nf_on + _o.payment_days;
    _inv := public.bid_invoice_make(_id, _due);
  end if;
  return jsonb_build_object('invoice_id', _inv, 'due_date', _due, 'waiting_nf', _inv is null);
end $$;

-- Nota fiscal da OS (número, data e arquivos PDF/XML). Se a conta começa na NF, cria a fatura agora.
create or replace function public.bid_order_nf(_id uuid, _data jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare _o record; _inv uuid; _due date; _nf date;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select o.*, b.due_from, b.payment_days into _o from public.bid_orders o join public.bids b on b.id = o.bid_id where o.id = _id;
  if not found then raise exception 'OS não encontrada' using errcode = 'PF020'; end if;
  _nf := coalesce(nullif(_data ->> 'nf_on', '')::date, (now() at time zone 'America/Sao_Paulo')::date);
  update public.bid_orders set nf_number = nullif(trim(_data ->> 'nf_number'), ''), nf_on = _nf,
    nf_files = coalesce(_data -> 'files', nf_files), updated_at = now() where id = _id;
  if _o.status = 'realizada' and _o.invoice_id is null then
    _due := case when _o.due_from = 'nf' then _nf else coalesce(_o.done_on, _nf) end + _o.payment_days;
    _inv := public.bid_invoice_make(_id, _due);
  end if;
  return jsonb_build_object('invoice_id', coalesce(_inv, _o.invoice_id), 'due_date', _due);
end $$;

-- Cancelar a OS: devolve o crédito. Fatura em aberto é cancelada junto; paga não deixa cancelar.
create or replace function public.bid_order_cancel(_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare _o record;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select o.*, i.status inv_status into _o from public.bid_orders o left join public.invoices i on i.id = o.invoice_id where o.id = _id;
  if not found then raise exception 'OS não encontrada' using errcode = 'PF020'; end if;
  if _o.inv_status = 'pago' then raise exception 'A fatura desta OS já foi paga. Desfaça o pagamento antes.' using errcode = 'PF020'; end if;
  if _o.invoice_id is not null then update public.invoices set status = 'cancelado', updated_at = now() where id = _o.invoice_id and status <> 'cancelado'; end if;
  update public.bid_orders set status = 'cancelada', updated_at = now() where id = _id;
end $$;

-- Tudo de uma vez para a tela: licitações com itens (usado/resta), OS e situação da fatura.
create or replace function public.bid_list(_client uuid default null)
returns jsonb language sql stable security definer set search_path to '' as $$
  select case when not public.has_role('admin') then '[]'::jsonb else coalesce(jsonb_agg(x order by x ->> 'ends_on' nulls last), '[]'::jsonb) end
  from (
    select to_jsonb(b) || jsonb_build_object(
      'client_name', c.name,
      'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'position', i.position, 'description', i.description, 'unit_label', i.unit_label,
          'max_qty', i.max_qty, 'unit_price', i.unit_price, 'archived', i.archived,
          'used_qty', coalesce((select sum(oi.qty) from public.bid_order_items oi join public.bid_orders o on o.id = oi.order_id where oi.item_id = i.id and o.status <> 'cancelada'), 0))
          order by i.position) from public.bid_items i where i.bid_id = b.id), '[]'::jsonb),
      'orders', coalesce((select jsonb_agg(to_jsonb(o) || jsonb_build_object(
          'amount', (select round(sum(oi.qty * oi.unit_price), 2) from public.bid_order_items oi where oi.order_id = o.id),
          'lines', (select jsonb_agg(jsonb_build_object('item_id', oi.item_id, 'qty', oi.qty, 'unit_price', oi.unit_price, 'description', i.description)) from public.bid_order_items oi join public.bid_items i on i.id = oi.item_id where oi.order_id = o.id),
          'invoice', (select jsonb_build_object('id', v.id, 'status', v.status, 'due_date', v.due_date, 'paid_at', v.paid_at) from public.invoices v where v.id = o.invoice_id))
          order by o.seq desc) from public.bid_orders o where o.bid_id = b.id), '[]'::jsonb)
    ) x
    from public.bids b join public.clients c on c.id = b.client_id
    where _client is null or b.client_id = _client
  ) s;
$$;

-- Avisos calculados na hora (sem rotina): crédito 80% usado, vigência acabando, OS sem NF há 3 dias, fatura vencida.
create or replace function public.bid_alerts()
returns jsonb language sql stable security definer set search_path to '' as $$
  with today as (select (now() at time zone 'America/Sao_Paulo')::date d),
  b as (
    select b.*, c.name client_name,
      (select coalesce(sum(i.max_qty * i.unit_price), 0) from public.bid_items i where i.bid_id = b.id and not i.archived) total,
      (select coalesce(sum(oi.qty * oi.unit_price), 0) from public.bid_order_items oi join public.bid_orders o on o.id = oi.order_id where o.bid_id = b.id and o.status <> 'cancelada') used
    from public.bids b join public.clients c on c.id = b.client_id where b.status = 'ativa'
  ),
  a as (
    select 'bid80:' || b.id || ':' || floor(b.used / nullif(b.total, 0) * 10) id, 'info' level, b.client_id,
      format('📑 %s: %s%% do crédito da licitação usado', b.client_name, floor(b.used / b.total * 100)) title,
      format('Pedido %s · faltam R$ %s', b.number, to_char(greatest(b.total - b.used, 0), 'FM999G999G990D00')) sub, b.id bid_id
    from b where b.total > 0 and b.used / b.total >= 0.8
    union all
    select 'bidend:' || b.id || ':' || b.ends_on, 'info', b.client_id,
      format('📑 %s: licitação acaba em %s dias', b.client_name, b.ends_on - t.d),
      format('Pedido %s · ainda há R$ %s para usar', b.number, to_char(b.total - b.used, 'FM999G999G990D00')), b.id
    from b, today t where b.ends_on between t.d and t.d + 30 and b.total - b.used > 0.009
    union all
    select 'bidnf:' || o.id, 'hoje', b.client_id,
      format('🧾 %s: OS %s realizada sem nota fiscal', b.client_name, o.seq),
      format('Há %s dias · Pedido %s', t.d - o.done_on, b.number), b.id
    from public.bid_orders o join b on b.id = o.bid_id, today t
    where o.status = 'realizada' and o.nf_on is null and o.done_on <= t.d - 3
    union all
    select 'bidlate:' || v.id, 'urgente', b.client_id,
      format('%s: fatura da licitação vencida', b.client_name),
      format('OS %s · venceu %s', o.seq, to_char(v.due_date, 'DD/MM')), b.id
    from public.bid_orders o join b on b.id = o.bid_id join public.invoices v on v.id = o.invoice_id, today t
    where v.status in ('pendente', 'vencido') and v.due_date < t.d
  )
  select case when not public.has_role('admin') then '[]'::jsonb else
    coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'level', a.level, 'client_id', a.client_id, 'title', a.title, 'sub', a.sub,
      'to', '/clientes/' || a.client_id || '?aba=contrato&licitacao=' || a.bid_id)), '[]'::jsonb) end
  from a;
$$;

grant execute on function public.bid_save(uuid, jsonb), public.bid_order_create(uuid, jsonb, boolean), public.bid_order_done(uuid, date),
  public.bid_order_nf(uuid, jsonb), public.bid_order_cancel(uuid), public.bid_list(uuid), public.bid_alerts() to authenticated;
