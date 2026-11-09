-- Comercial: lançar serviço com variação, quantidade, extras e desconto, com o valor saindo do catálogo.
-- Regras do Italo: só o admin cria e edita serviço (head é gestão); o comercial (SDR e closer) vê os preços e vende.

-- Quem edita o catálogo: só admin. Quem vê preço do catálogo: admin, SDR e closer.
create or replace function public.can_edit_catalog()
returns boolean language sql stable security definer set search_path to '' as $$
  select public.has_role('admin');
$$;
create or replace function public.can_see_prices()
returns boolean language sql stable security definer set search_path to '' as $$
  select public.has_role('admin') or public.has_role('sdr') or public.has_role('closer');
$$;
grant execute on function public.can_see_prices() to authenticated;

-- Variações (escolhe uma) e extras (soma) de cada serviço.
create table if not exists public.service_options (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  kind text not null check (kind in ('variacao', 'extra')),
  name text not null check (length(trim(name)) between 1 and 80),
  price numeric(12,2) not null check (price >= 0),
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists service_options_service on public.service_options(service_id);
alter table public.service_options enable row level security;
create policy service_options_read on public.service_options for select to authenticated using (true);

-- Salva a lista de variações e extras de um serviço (o que sai da lista fica inativo, não some do histórico).
create or replace function public.service_options_save(_service uuid, _items jsonb)
returns void language plpgsql security definer set search_path to '' as $function$
declare _it jsonb; _keep uuid[] := '{}'; _id uuid; _pos int := 0;
begin
  if not public.can_edit_catalog() then raise exception 'Sem permissao' using errcode = '42501'; end if;
  for _it in select * from jsonb_array_elements(coalesce(_items, '[]'::jsonb)) loop
    _pos := _pos + 1;
    if length(trim(coalesce(_it->>'name', ''))) = 0 then continue; end if;
    _id := nullif(_it->>'id', '')::uuid;
    if _id is not null and exists (select 1 from public.service_options where id = _id and service_id = _service) then
      update public.service_options set kind = _it->>'kind', name = trim(_it->>'name'), price = greatest(0, (_it->>'price')::numeric), position = _pos, is_active = true where id = _id;
    else
      insert into public.service_options (service_id, kind, name, price, position)
      values (_service, _it->>'kind', trim(_it->>'name'), greatest(0, (_it->>'price')::numeric), _pos) returning id into _id;
    end if;
    _keep := _keep || _id;
  end loop;
  update public.service_options set is_active = false where service_id = _service and not (id = any(_keep));
end $function$;
grant execute on function public.service_options_save(uuid, jsonb) to authenticated;

-- Catálogo: comercial também lê, preço para quem vende, e as variações/extras de cada serviço.
create or replace function public.catalog_list(_area text default null)
returns jsonb language sql stable security definer set search_path to '' as $function$
  select jsonb_build_object(
    'can_edit', public.can_edit_catalog(),
    'can_see_prices', public.can_see_prices(),
    'services', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'area', s.area, 'description', s.description, 'deliverables', s.deliverables,
        'unit', s.unit, 'is_active', s.is_active,
        'price', case when public.can_see_prices() then d.price end,
        'clients', (select count(*) from public.client_services cs where cs.service_id = s.id and cs.is_active),
        'options', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'kind', o.kind, 'name', o.name,
            'price', case when public.can_see_prices() then o.price end) order by o.kind desc, o.position)
          from public.service_options o where o.service_id = s.id and o.is_active), '[]'::jsonb)
      ) order by s.is_active desc, s.name)
      from public.services s left join public.service_default_prices d on d.service_id = s.id
      where _area is null or s.area = _area), '[]'::jsonb),
    'packages', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'description', p.description, 'is_active', p.is_active,
        'promo_price', case when public.can_see_prices() then p.promo_price end,
        'promo_starts', p.promo_starts, 'promo_ends', p.promo_ends,
        'items', (select coalesce(jsonb_agg(jsonb_build_object('service_id', i.service_id, 'name', s2.name, 'area', s2.area, 'quantity', i.quantity,
            'price', case when public.can_see_prices() then i.price end) order by s2.name), '[]'::jsonb)
          from public.service_package_items i join public.services s2 on s2.id = i.service_id where i.package_id = p.id)
      ) order by p.is_active desc, p.name)
      from public.service_packages p
      where _area is null or exists (select 1 from public.service_package_items i join public.services s3 on s3.id = i.service_id where i.package_id = p.id and s3.area = _area)), '[]'::jsonb)
  )
  where public.can_access_content() or public.can_access_av() or public.can_access_traffic() or public.can_access_commercial() or public.can_edit_catalog();
$function$;

-- Fatura com itens detalhados: quando a função já grava os itens, o gatilho do item único não roda.
create or replace function public.invoice_single_item()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.source = 'mensalidade' or coalesce(current_setting('pf.detailed_items', true), '') = '1' then return null; end if;
  insert into public.invoice_items (invoice_id, client_id, unit, month, description, unit_price, amount, state)
  values (new.id, new.client_id, new.unit, date_trunc('month', new.due_date)::date, new.description, new.amount, new.amount,
    public.invoice_item_state(new.status, new.payment_url));
  return null;
end $function$;

-- Lançar serviço: o valor é calculado aqui pelo catálogo (a tela só escolhe). Cria a fatura avulsa com uma linha por parte.
create or replace function public.sale_service_launch(_data jsonb)
returns uuid language plpgsql security definer set search_path to '' as $function$
declare
  _client uuid := (_data->>'client_id')::uuid;
  _service public.services;
  _var public.service_options;
  _qty numeric := greatest(1, coalesce((_data->>'quantity')::numeric, 1));
  _base numeric;
  _line numeric;
  _extras numeric := 0;
  _disc numeric := 0;
  _total numeric;
  _unit text;
  _due date := coalesce(nullif(_data->>'due_date', '')::date, (now() at time zone 'America/Sao_Paulo')::date);
  _m date;
  _inv uuid;
  _desc text;
  _e jsonb;
  _x public.service_options;
begin
  if not (public.has_role('admin') or public.has_role('sdr') or public.has_role('closer')) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if not exists (select 1 from public.clients where id = _client) then raise exception 'Cliente não encontrado' using errcode = 'PF004'; end if;
  select * into _service from public.services where id = (_data->>'service_id')::uuid and is_active;
  if _service.id is null then raise exception 'Serviço não encontrado' using errcode = 'PF004'; end if;
  if nullif(_data->>'variant_id', '') is not null then
    select * into _var from public.service_options where id = (_data->>'variant_id')::uuid and service_id = _service.id and kind = 'variacao' and is_active;
    if _var.id is null then raise exception 'Variação não encontrada' using errcode = 'PF004'; end if;
    _base := _var.price;
  else
    select price into _base from public.service_default_prices where service_id = _service.id;
  end if;
  if coalesce(_base, 0) <= 0 then raise exception 'Serviço sem preço no catálogo' using errcode = 'PF006'; end if;
  _unit := case when _service.area = 'audiovisual' then 'ellcazo' else 'peformake' end;
  _m := date_trunc('month', _due)::date;
  _line := round(_base * _qty, 2);
  _desc := _service.name || coalesce(' · ' || _var.name, '') || case when _qty > 1 then ' × ' || trim(to_char(_qty, 'FM9990.##')) else '' end;

  -- Extras: cada um com a quantidade escolhida.
  for _e in select * from jsonb_array_elements(coalesce(_data->'extras', '[]'::jsonb)) loop
    select * into _x from public.service_options where id = (_e->>'id')::uuid and service_id = _service.id and kind = 'extra' and is_active;
    if _x.id is not null then _extras := _extras + round(_x.price * greatest(1, coalesce((_e->>'quantity')::numeric, 1)), 2); end if;
  end loop;

  if (_data->>'discount_type') = 'percent' then _disc := round((_line + _extras) * least(100, greatest(0, coalesce((_data->>'discount_value')::numeric, 0))) / 100, 2);
  elsif (_data->>'discount_type') = 'fixed' then _disc := least(_line + _extras, greatest(0, coalesce((_data->>'discount_value')::numeric, 0)));
  end if;
  _total := _line + _extras - _disc;
  if _total <= 0 then raise exception 'Valor final zerado' using errcode = 'PF006'; end if;

  perform set_config('pf.detailed_items', '1', true);
  insert into public.invoices (client_id, unit, description, amount, due_date, source, ref, created_by)
  values (_client, _unit, left(_desc || case when _extras > 0 then ' + extras' else '' end, 200), _total, _due, 'avulso', 'venda:' || gen_random_uuid(), (select auth.uid()))
  returning id into _inv;
  perform set_config('pf.detailed_items', '', true);

  insert into public.invoice_items (invoice_id, client_id, service_id, unit, month, description, quantity, unit_price, amount, state)
  values (_inv, _client, _service.id, _unit, _m, _desc, _qty, _base, _line, 'confirmado');
  for _e in select * from jsonb_array_elements(coalesce(_data->'extras', '[]'::jsonb)) loop
    select * into _x from public.service_options where id = (_e->>'id')::uuid and service_id = _service.id and kind = 'extra' and is_active;
    if _x.id is not null then
      insert into public.invoice_items (invoice_id, client_id, service_id, unit, month, description, quantity, unit_price, amount, state)
      values (_inv, _client, _service.id, _unit, _m, 'Extra: ' || _x.name, greatest(1, coalesce((_e->>'quantity')::numeric, 1)), _x.price,
        round(_x.price * greatest(1, coalesce((_e->>'quantity')::numeric, 1)), 2), 'confirmado');
    end if;
  end loop;
  if _disc > 0 then
    insert into public.invoice_items (invoice_id, client_id, unit, month, description, quantity, unit_price, amount, state)
    values (_inv, _client, _unit, _m, 'Desconto', 1, -_disc, -_disc, 'confirmado');
  end if;
  insert into public.billing_events (invoice_id, kind, detail) values (_inv, 'venda_lancada', _desc);
  perform public.invoice_group_auto();
  return _inv;
end $function$;
revoke execute on function public.sale_service_launch(jsonb) from public, anon;
grant execute on function public.sale_service_launch(jsonb) to authenticated;
