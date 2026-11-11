-- Comercial → Nova venda: um só caminho para vender (substitui "Lançar venda" e "Lançar serviço").
-- Cliente (busca ou cadastro rápido), serviços do catálogo (variação, quantidade, extras, desconto; o preço sai do catálogo)
-- e confirmação. A venda entra em crm_sales; só quando confirmada (admin ou head) vira dinheiro:
--   avulso     → fatura avulsa detalhada (ref sale:<id>), como o antigo sale_service_launch;
--   recorrente → serviços do cliente (client_services) cobrados a partir do mês seguinte ao início; negócio do funil vira ganho.
-- Vendas antigas (sem itens) seguem o caminho de antes.

alter table public.crm_sales
  add column if not exists kind text,
  add column if not exists unit text,
  add column if not exists items jsonb,
  add column if not exists due_date date,
  add column if not exists start_date date,
  add column if not exists seller_id uuid references public.profiles(id) on delete set null,
  add column if not exists group_id uuid,
  add column if not exists result jsonb;
do $$ begin
  alter table public.crm_sales add constraint crm_sales_kind_check check (kind is null or kind in ('avulso', 'recorrente'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.crm_sales add constraint crm_sales_unit_check check (unit is null or unit in ('peformake', 'ellcazo'));
exception when duplicate_object then null; end $$;

-- Uma linha da venda: o valor é calculado aqui, pelo catálogo. Preço diferente do catálogo só para quem edita o catálogo (admin).
create or replace function public.sale_line(_it jsonb, _can_price boolean)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  _service public.services;
  _var public.service_options;
  _x public.service_options;
  _pkg uuid := nullif(_it->>'package_id', '')::uuid;
  _qty int := greatest(1, least(999, coalesce(nullif(_it->>'quantity', '')::numeric, 1)::int));
  _base numeric; _line numeric; _extras numeric := 0; _disc numeric := 0; _total numeric;
  _xs jsonb := '[]'; _e jsonb; _xq int; _kind text; _desc text;
begin
  select * into _service from public.services where id = nullif(_it->>'service_id', '')::uuid and is_active;
  if _service.id is null then raise exception 'Serviço não encontrado' using errcode = 'PF004'; end if;
  if nullif(_it->>'variant_id', '') is not null then
    select * into _var from public.service_options where id = (_it->>'variant_id')::uuid and service_id = _service.id and kind = 'variacao' and is_active;
    if _var.id is null then raise exception 'Variação não encontrada' using errcode = 'PF004'; end if;
    _base := _var.price;
  elsif _pkg is not null then
    select coalesce(i.price, d.price) into _base from public.service_package_items i
      left join public.service_default_prices d on d.service_id = i.service_id
      where i.package_id = _pkg and i.service_id = _service.id;
  else
    select price into _base from public.service_default_prices where service_id = _service.id;
  end if;
  if _can_price and nullif(_it->>'price', '') is not null then _base := greatest(0, (_it->>'price')::numeric); end if;
  if coalesce(_base, 0) <= 0 then raise exception 'Serviço sem preço no catálogo: %', _service.name using errcode = 'PF006'; end if;
  _line := round(_base * _qty, 2);
  for _e in select * from jsonb_array_elements(coalesce(_it->'extras', '[]'::jsonb)) loop
    select * into _x from public.service_options where id = nullif(_e->>'id', '')::uuid and service_id = _service.id and kind = 'extra' and is_active;
    if _x.id is null then continue; end if;
    _xq := greatest(1, least(999, coalesce(nullif(_e->>'quantity', '')::numeric, 1)::int));
    _extras := _extras + round(_x.price * _xq, 2);
    _xs := _xs || jsonb_build_array(jsonb_build_object('id', _x.id, 'name', _x.name, 'quantity', _xq, 'price', _x.price, 'amount', round(_x.price * _xq, 2)));
  end loop;
  if (_it->>'discount_type') = 'percent' then _disc := round((_line + _extras) * least(100, greatest(0, coalesce(nullif(_it->>'discount_value', '')::numeric, 0))) / 100, 2);
  elsif (_it->>'discount_type') = 'fixed' then _disc := least(_line + _extras, greatest(0, coalesce(nullif(_it->>'discount_value', '')::numeric, 0)));
  end if;
  _total := _line + _extras - _disc;
  if _total <= 0 then raise exception 'Valor final zerado' using errcode = 'PF006'; end if;
  _kind := case when _it->>'kind' in ('avulso', 'recorrente') then _it->>'kind' when _service.unit = 'mês' then 'recorrente' else 'avulso' end;
  _desc := _service.name || coalesce(' · ' || _var.name, '') || case when _qty > 1 then ' × ' || _qty else '' end;
  return jsonb_build_object(
    'service_id', _service.id, 'name', _service.name, 'variant_id', _var.id, 'variant', _var.name, 'package_id', _pkg,
    'quantity', _qty, 'unit_price', _base, 'line', _line, 'extras', _xs, 'extras_total', _extras, 'discount', _disc,
    'total', _total, 'kind', _kind, 'unit', case when _service.area = 'audiovisual' then 'ellcazo' else 'peformake' end, 'desc', _desc);
end $function$;
revoke execute on function public.sale_line(jsonb, boolean) from public, anon, authenticated;

-- Busca do passo "Cliente": clientes (nome, razão social, e-mail, telefone, CPF/CNPJ e contatos), leads do funil e contatos do WhatsApp.
create or replace function public.sale_find(_q text)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  _t text := extensions.unaccent(lower(trim(coalesce(_q, ''))));
  _d text := regexp_replace(coalesce(_q, ''), '\D', '', 'g');
  _out jsonb;
begin
  perform public.commercial_require_team();
  if length(_d) < 4 then _d := null; end if;
  with c as (
    select 'cliente' kind, cl.id client_id, null::uuid deal_id, null::uuid contact_id, trim(cl.name) name,
      nullif(trim(coalesce(cl.legal_name, '')), '') company, cl.phone, cl.email, cl.logo_path photo, null::text avatar,
      case when cl.is_lost then 'perdido' when cl.is_active then 'ativo' else 'inativo' end tag,
      case when extensions.unaccent(lower(cl.name)) like _t || '%' then 0 else 1 end rk, cl.updated_at at
    from public.clients cl
    where _t = '' and cl.is_active and not cl.is_lost
       or _t <> '' and (
         extensions.unaccent(lower(cl.name)) like '%' || _t || '%'
         or extensions.unaccent(lower(coalesce(cl.legal_name, ''))) like '%' || _t || '%'
         or lower(coalesce(cl.email, '')) like '%' || _t || '%'
         or exists (select 1 from unnest(cl.aliases) a where extensions.unaccent(lower(a)) like '%' || _t || '%')
         or (_d is not null and (regexp_replace(coalesce(cl.phone, ''), '\D', '', 'g') like '%' || _d || '%' or coalesce(cl.document, '') like '%' || _d || '%'))
         or exists (select 1 from public.client_contacts cc where cc.client_id = cl.id and (
              extensions.unaccent(lower(cc.name)) like '%' || _t || '%' or lower(coalesce(cc.email, '')) like '%' || _t || '%'
              or (_d is not null and regexp_replace(coalesce(cc.phone, ''), '\D', '', 'g') like '%' || _d || '%'))))
  ), l as (
    select 'lead' kind, w.client_id, d.id deal_id, d.contact_id, coalesce(nullif(trim(d.lead_name), ''), nullif(trim(w.display_name), ''), nullif(trim(w.wa_name), ''), d.title) name,
      nullif(trim(coalesce(d.lead_company, '')), '') company, coalesce(nullif(d.lead_phone, ''), w.phone) phone, null::text email, null::text photo, w.avatar_path avatar,
      case when d.stage = 'perdido' then 'perdido' when d.stage in ('ganho', 'pos_venda') then 'ganho' else 'lead' end tag,
      case when d.stage in ('ganho', 'pos_venda', 'perdido') then 3 else 2 end rk, d.updated_at at
    from public.crm_deals d left join public.wa_contacts w on w.id = d.contact_id
    where w.client_id is null and public.deal_visible(d.owner_id)
      and (_t = '' and d.stage not in ('ganho', 'pos_venda', 'perdido')
        or _t <> '' and (
          extensions.unaccent(lower(coalesce(d.lead_name, '') || ' ' || coalesce(d.lead_company, '') || ' ' || d.title || ' ' || coalesce(w.display_name, '') || ' ' || coalesce(w.wa_name, ''))) like '%' || _t || '%'
          or (_d is not null and regexp_replace(coalesce(d.lead_phone, '') || ' ' || coalesce(w.phone, ''), '\D', '', 'g') like '%' || _d || '%')))
  ), wc as (
    select 'contato' kind, null::uuid client_id, null::uuid deal_id, w.id contact_id, coalesce(nullif(trim(w.display_name), ''), nullif(trim(w.wa_name), ''), w.phone) name,
      null::text company, w.phone, null::text email, null::text photo, w.avatar_path avatar, 'lead' tag, 4 rk, w.updated_at at
    from public.wa_contacts w
    where _t <> '' and not w.is_group and not w.hidden and w.client_id is null and w.kind in ('novo', 'lead', 'cliente', 'outro')
      and not exists (select 1 from public.crm_deals d where d.contact_id = w.id)
      and (extensions.unaccent(lower(coalesce(w.display_name, '') || ' ' || coalesce(w.wa_name, ''))) like '%' || _t || '%'
        or (_d is not null and regexp_replace(coalesce(w.phone, ''), '\D', '', 'g') like '%' || _d || '%'))
  ), allr as (select * from c union all select * from l union all select * from wc)
  select coalesce(jsonb_agg(to_jsonb(x) - 'rk' - 'at' order by x.rk, x.at desc nulls last), '[]'::jsonb) into _out
  from (select * from allr order by rk, at desc nulls last limit 12) x;
  return _out;
end $function$;
revoke execute on function public.sale_find(text) from public, anon;
grant execute on function public.sale_find(text) to authenticated;

-- Nova venda. Uma linha em crm_sales por empresa (Peformake/Ellcazo) e tipo (avulso/recorrente): faturamento separado.
create or replace function public.sale_create(_data jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  _uid uuid := (select auth.uid());
  _manager boolean := public.can_manage_clients();
  _can_price boolean := public.can_edit_catalog();
  _client uuid := nullif(_data->>'client_id', '')::uuid;
  _deal uuid := nullif(_data->>'deal_id', '')::uuid;
  _contact uuid := nullif(_data->>'contact_id', '')::uuid;
  _nc jsonb := _data->'new_client';
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  _date date := coalesce(nullif(_data->>'sale_date', '')::date, (now() at time zone 'America/Sao_Paulo')::date);
  _start date := nullif(_data->>'start_date', '')::date;
  _due date := nullif(_data->>'due_date', '')::date;
  _seller uuid := coalesce(nullif(_data->>'seller_id', '')::uuid, (select auth.uid()));
  _lines jsonb := '[]';
  _it jsonb; _g record; _sid uuid; _ids uuid[] := '{}'; _group uuid := gen_random_uuid();
  _company text; _person text; _phone text; _email text; _name text;
  _total numeric := 0; _created boolean := false; _recurring boolean;
begin
  perform public.commercial_require_team();
  if jsonb_typeof(_data->'items') is distinct from 'array' or jsonb_array_length(_data->'items') not between 1 and 20 then
    raise exception 'Escolha ao menos um serviço' using errcode = 'PF006';
  end if;
  if _date > _today + 1 or _date < _today - 400 then raise exception 'Data da venda inválida' using errcode = 'PF006'; end if;
  _start := coalesce(_start, _date);
  _due := coalesce(_due, greatest(_date, _today) + 3);
  if _due < _today - 30 then raise exception 'Vencimento inválido' using errcode = 'PF006'; end if;
  if _seller is null or not exists (select 1 from public.profiles where id = _seller) then _seller := _uid; end if;
  if _deal is not null then
    if not exists (select 1 from public.crm_deals where id = _deal and public.deal_visible(owner_id)) then raise exception 'Negócio não encontrado' using errcode = 'PF004'; end if;
    if _contact is null then select contact_id into _contact from public.crm_deals where id = _deal; end if;
  end if;
  if _contact is not null and not exists (select 1 from public.wa_contacts where id = _contact) then _contact := null; end if;
  if _client is null and _contact is not null then select client_id into _client from public.wa_contacts where id = _contact; end if;

  -- Linhas calculadas antes de gravar qualquer coisa: se uma falhar, nada é gravado.
  for _it in select * from jsonb_array_elements(_data->'items') loop
    _lines := _lines || jsonb_build_array(public.sale_line(_it, _can_price));
  end loop;
  _recurring := exists (select 1 from jsonb_array_elements(_lines) l where l->>'kind' = 'recorrente');

  if _client is null then
    if _nc is null or jsonb_typeof(_nc) <> 'object' then raise exception 'Escolha o cliente' using errcode = 'PF006'; end if;
    _company := regexp_replace(trim(coalesce(_nc->>'company', '')), '\s+', ' ', 'g');
    _person := regexp_replace(trim(coalesce(_nc->>'person', '')), '\s+', ' ', 'g');
    _phone := regexp_replace(coalesce(_nc->>'phone', ''), '\D', '', 'g');
    _email := nullif(lower(trim(coalesce(_nc->>'email', ''))), '');
    if length(_person) not between 2 and 120 or length(_company) = 1 or length(_company) > 120
      or length(_phone) not between 10 and 13 or (_email is not null and _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
      raise exception 'Confira os dados do cliente' using errcode = 'PF006';
    end if;
    _name := coalesce(nullif(_company, ''), _person);
    if exists (select 1 from public.clients where lower(trim(name)) = lower(_name) and not is_lost) then
      raise exception 'Já existe um cliente com esse nome' using errcode = 'PF009';
    end if;
    _client := gen_random_uuid();
    insert into public.clients (id, name, phone, email, billing_email, legal_name, source, synced_at, is_active, is_lost, legacy_created_at, updated_by, client_type, sourced_by, sourced_at)
    values (_client, _name, _phone, _email, _email, case when _company = '' then _person end, 'app', now(), true, false, now(), _uid,
      case when _recurring then 'recurring' else 'one-off' end, _seller, _date);
    insert into public.client_contracts (client_id, contract_type) values (_client, case when _recurring then 'recurring' else 'project' end) on conflict (client_id) do nothing;
    insert into public.client_contacts (client_id, name, role, phone, email, gets_billing, gets_approvals, gets_reports, gets_contract)
    values (_client, _person, 'dono', _phone, _email, true, true, true, true);
    insert into public.client_events (client_id, event_type, notes, created_by) values (_client, 'joined', 'Cadastro pela venda', _uid);
    _created := true;
  elsif not exists (select 1 from public.clients where id = _client) then
    raise exception 'Cliente não encontrado' using errcode = 'PF004';
  end if;
  if _contact is not null then
    update public.wa_contacts set client_id = _client, kind = 'cliente', updated_at = now(), updated_by = _uid where id = _contact and client_id is null;
  end if;

  for _g in
    select l->>'unit' unit, l->>'kind' kind, jsonb_agg(l) items, sum((l->>'total')::numeric) total, string_agg(l->>'desc', ' + ') descr
    from jsonb_array_elements(_lines) l group by 1, 2 order by 2 desc, 1 desc
  loop
    insert into public.crm_sales (deal_id, contact_id, client_id, description, value_cents, sale_date, status, source, created_by, reviewed_by, reviewed_at,
      kind, unit, items, due_date, start_date, seller_id, group_id)
    values (_deal, _contact, _client, left(case when _g.kind = 'recorrente' then 'Mensal: ' else '' end || _g.descr, 300), round(_g.total * 100)::bigint, _date,
      case when _manager then 'confirmada' else 'pendente' end, 'manual', _uid, case when _manager then _uid end, case when _manager then now() end,
      _g.kind, _g.unit, _g.items, case when _g.kind = 'avulso' then _due end, case when _g.kind = 'recorrente' then _start end, _seller, _group)
    returning id into _sid;
    _ids := _ids || _sid;
    _total := _total + _g.total;
  end loop;

  return jsonb_build_object('client_id', _client, 'client_created', _created, 'sale_ids', to_jsonb(_ids),
    'status', case when _manager then 'confirmada' else 'pendente' end, 'total', case when public.can_see_prices() or _manager then _total end, 'recurring', _recurring);
end $function$;
revoke execute on function public.sale_create(jsonb) from public, anon;
grant execute on function public.sale_create(jsonb) to authenticated;

-- Aplica uma venda nova confirmada (chamada pelo gatilho; não é para a tela).
create or replace function public.sale_apply(_id uuid)
returns void language plpgsql security definer set search_path to '' as $function$
declare
  _s public.crm_sales; _l jsonb; _x jsonb; _inv uuid; _m date; _first date; _cs uuid; _css uuid[] := '{}'; _res jsonb;
begin
  select * into _s from public.crm_sales where id = _id;
  if _s.id is null or _s.items is null or _s.client_id is null or _s.result is not null then return; end if;
  if _s.kind = 'avulso' then
    _m := date_trunc('month', coalesce(_s.due_date, _s.sale_date))::date;
    perform set_config('pf.detailed_items', '1', true);
    insert into public.invoices (client_id, unit, description, amount, due_date, source, ref, created_by)
    values (_s.client_id, _s.unit, left(_s.description, 200), _s.value_cents / 100.0,
      coalesce(_s.due_date, (now() at time zone 'America/Sao_Paulo')::date + 3), 'avulso', 'sale:' || _s.id, coalesce(_s.reviewed_by, _s.created_by))
    on conflict (client_id, source, ref) do nothing
    returning id into _inv;
    perform set_config('pf.detailed_items', '', true);
    if _inv is not null then
      for _l in select * from jsonb_array_elements(_s.items) loop
        insert into public.invoice_items (invoice_id, client_id, service_id, unit, month, description, quantity, unit_price, amount, state)
        values (_inv, _s.client_id, (_l->>'service_id')::uuid, _s.unit, _m, _l->>'desc', (_l->>'quantity')::numeric, (_l->>'unit_price')::numeric, (_l->>'line')::numeric, 'confirmado');
        for _x in select * from jsonb_array_elements(coalesce(_l->'extras', '[]'::jsonb)) loop
          insert into public.invoice_items (invoice_id, client_id, service_id, unit, month, description, quantity, unit_price, amount, state)
          values (_inv, _s.client_id, (_l->>'service_id')::uuid, _s.unit, _m, 'Extra: ' || (_x->>'name'), (_x->>'quantity')::numeric, (_x->>'price')::numeric, (_x->>'amount')::numeric, 'confirmado');
        end loop;
        if (_l->>'discount')::numeric > 0 then
          insert into public.invoice_items (invoice_id, client_id, unit, month, description, quantity, unit_price, amount, state)
          values (_inv, _s.client_id, _s.unit, _m, 'Desconto · ' || (_l->>'name'), 1, -(_l->>'discount')::numeric, -(_l->>'discount')::numeric, 'confirmado');
        end if;
      end loop;
      insert into public.billing_events (invoice_id, kind, detail) values (_inv, 'venda_lancada', left(_s.description, 300));
      perform public.invoice_group_auto();
    end if;
    _res := jsonb_build_object('invoice_id', _inv);
  else
    -- Regra do Italo: a 1ª mensalidade é no mês seguinte ao início.
    _first := (date_trunc('month', coalesce(_s.start_date, _s.sale_date)) + interval '1 month')::date;
    for _l in select * from jsonb_array_elements(_s.items) loop
      insert into public.client_services (client_id, service_id, quantity, is_active, billing_month, notes, package_id)
      values (_s.client_id, (_l->>'service_id')::uuid, (_l->>'quantity')::int, true, _first,
        left('Venda de ' || to_char(_s.sale_date, 'DD/MM/YYYY') || coalesce(' · ' || (_l->>'variant'), ''), 300), nullif(_l->>'package_id', '')::uuid)
      returning id into _cs;
      insert into public.client_service_prices (client_service_id, price, discount_type, discount_value)
      values (_cs, round(((_l->>'line')::numeric + (_l->>'extras_total')::numeric) / greatest(1, (_l->>'quantity')::numeric), 2),
        case when (_l->>'discount')::numeric > 0 then 'fixed' end, nullif((_l->>'discount')::numeric, 0));
      _css := _css || _cs;
    end loop;
    insert into public.client_contracts (client_id, contract_type, start_date) values (_s.client_id, 'recurring', coalesce(_s.start_date, _s.sale_date))
    on conflict (client_id) do update set contract_type = 'recurring', start_date = coalesce(public.client_contracts.start_date, excluded.start_date);
    update public.clients set client_type = 'recurring', is_active = true, updated_at = now() where id = _s.client_id and coalesce(client_type, '') <> 'recurring';
    _res := jsonb_build_object('client_services', to_jsonb(_css), 'first_month', _first);
  end if;
  if _s.deal_id is not null then
    update public.crm_deals set stage = 'ganho', closed_at = coalesce(closed_at, now()), lost_reason = null, updated_at = now()
    where id = _s.deal_id and stage not in ('ganho', 'pos_venda');
  end if;
  update public.crm_sales set result = _res where id = _s.id;
end $function$;
revoke execute on function public.sale_apply(uuid) from public, anon, authenticated;

-- Gatilho da venda: vendas novas (com itens) usam sale_apply; as antigas seguem como antes.
create or replace function public.crm_sale_to_fin()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare _unit text; _today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if tg_op = 'UPDATE' and old.status = 'confirmada' and new.status <> 'confirmada' then
    update public.invoices set status = 'cancelado', updated_at = now() where source = 'avulso' and ref = 'sale:' || new.id and status = 'pendente';
    if new.items is not null and jsonb_typeof(new.result->'client_services') = 'array' then
      update public.client_services set is_active = false
      where id in (select (v #>> '{}')::uuid from jsonb_array_elements(new.result->'client_services') v);
    end if;
    return new;
  end if;
  if new.status <> 'confirmada' or coalesce(new.value_cents, 0) <= 0 or new.client_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'confirmada' then return new; end if;
  if new.items is not null then
    perform public.sale_apply(new.id);
    return new;
  end if;
  if exists (select 1 from public.fin_entries where external_id = 'sale:' || new.id)
     or exists (select 1 from public.invoices where source = 'avulso' and ref = 'sale:' || new.id) then return new; end if;
  _unit := public.crm_sale_unit(new.description);
  insert into public.invoices (client_id, unit, description, amount, due_date, source, ref, created_by)
  values (new.client_id, _unit, left(coalesce(nullif(trim(new.description), ''), 'Venda avulsa'), 200), new.value_cents / 100.0,
          greatest(coalesce(new.sale_date, _today), _today) + 3, 'avulso', 'sale:' || new.id, new.reviewed_by)
  on conflict (client_id, source, ref) do nothing;
  return new;
end $function$;
