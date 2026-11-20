-- Ciclo do cliente: correções seguras (docs/ESTUDO-CICLO-DO-CLIENTE.md, erros 5, 6, 7 e 8) + Conferência diária (seção 2.5).
-- Não mexe em preço nem fatura existente, nem no mês da 1ª mensalidade (aguarda decisão do Italo).

-- Erros 7 e 8: sale_apply
--  7) venda avulsa para cliente avulso grava a data de início do contrato quando está vazia (passo "Cobrança" fecha). Nunca sobrescreve.
--  8) venda mensal não cria de novo um serviço que o cliente já tem ativo (mesma regra de client_add_services).
create or replace function public.sale_apply(_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  _s public.crm_sales; _l jsonb; _x jsonb; _inv uuid; _m date; _first date; _cs uuid; _css uuid[] := '{}'; _res jsonb; _skipped int := 0;
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
    -- Erro 7: cliente avulso ganha a data de início (só se estiver vazia).
    if exists (select 1 from public.clients where id = _s.client_id and client_type = 'one-off') then
      insert into public.client_contracts (client_id, contract_type, start_date) values (_s.client_id, 'project', coalesce(_s.start_date, _s.sale_date))
      on conflict (client_id) do update set start_date = coalesce(public.client_contracts.start_date, excluded.start_date);
    end if;
    _res := jsonb_build_object('invoice_id', _inv);
  else
    _first := (date_trunc('month', coalesce(_s.start_date, _s.sale_date)) + interval '1 month')::date;
    for _l in select * from jsonb_array_elements(_s.items) loop
      -- Erro 8: serviço já ativo no cliente não é criado de novo (evita mensalidade em dobro).
      if exists (select 1 from public.client_services where client_id = _s.client_id and service_id = (_l->>'service_id')::uuid and is_active) then
        _skipped := _skipped + 1;
        continue;
      end if;
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
    _res := jsonb_build_object('client_services', to_jsonb(_css), 'first_month', _first, 'skipped_active', _skipped);
  end if;
  if _s.deal_id is not null then
    update public.crm_deals set stage = 'ganho', closed_at = coalesce(closed_at, now()), lost_reason = null, updated_at = now()
    where id = _s.deal_id and stage not in ('ganho', 'pos_venda');
  end if;
  update public.crm_sales set result = _res where id = _s.id;
end $function$;

-- Erro 5: entrega avulsa já faturada pela venda (fatura 'sale:%' com serviço de audiovisual) não dispara "Entrega avulsa sem valor".
create or replace function public.av_project_charge_delivery()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare _q record; _billed numeric; _rest numeric; _type text;
begin
  if new.status <> 'delivered' or old.status = 'delivered' then return new; end if;
  select client_type into _type from public.clients where id = new.client_id;
  if coalesce(_type, '') <> 'one-off' then return new; end if;
  select q.id, q.code, q.title, q.total into _q from public.av_quotes q
  where q.client_id = new.client_id and q.status = 'aceito'
    and not exists (select 1 from public.invoices i where i.client_id = q.client_id and i.source = 'avulso' and i.ref = q.id::text)
  order by q.accepted_at desc nulls last limit 1;
  if _q.id is null then
    if not exists (
      select 1 from public.invoices i
      join public.invoice_items ii on ii.invoice_id = i.id
      join public.services sv on sv.id = ii.service_id
      where i.client_id = new.client_id and i.ref like 'sale:%' and i.status <> 'cancelado' and sv.area = 'audiovisual'
    ) then
      perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_missing',
        'Entrega avulsa sem valor', 'O projeto foi entregue e não há orçamento aceito para cobrar. Lance a cobrança em Financeiro.', '/financeiro/cobranca', new.client_id);
    end if;
    return new;
  end if;
  select coalesce(sum(amount), 0) into _billed from public.invoices where client_id = new.client_id and source = 'sinal' and ref = _q.id::text and status <> 'cancelado';
  _rest := _q.total - _billed;
  if _rest > 0 then
    insert into public.invoices (client_id, unit, description, amount, due_date, source, ref)
    values (new.client_id, 'ellcazo', left('Entrega ' || _q.code || ' · ' || _q.title, 200), _rest, current_date + 3, 'avulso', _q.id::text)
    on conflict (client_id, source, ref) do nothing;
  end if;
  return new;
end;
$function$;

-- Erro 6: cliente + contato numa transação só (a tela já chama client_create; antes caía no plano B em 2 passos).
-- Mesmas regras de client_save e client_contact_save (permissão, campos) e a mesma conferência de nome repetido da venda.
create or replace function public.client_create(_data jsonb, _contact jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $function$
declare _id uuid; _name text;
begin
  perform public.clients_require_manager();
  _name := regexp_replace(trim(coalesce(_data->>'name', '')), '\s+', ' ', 'g');
  if exists (select 1 from public.clients where lower(trim(name)) = lower(_name) and not is_lost) then
    raise exception 'Já existe um cliente com esse nome' using errcode = 'PF009';
  end if;
  _id := public.client_save(null, null, _data || jsonb_build_object('name', _name));
  if _contact is not null and jsonb_typeof(_contact) = 'object'
     and (coalesce(trim(_contact->>'name'), '') <> '' or coalesce(_contact->>'phone', '') <> '' or coalesce(_contact->>'email', '') <> '') then
    perform public.client_contact_save(null, _id, _contact);
  end if;
  return _id;
end $function$;
revoke execute on function public.client_create(jsonb, jsonb) from public, anon;
grant execute on function public.client_create(jsonb, jsonb) to authenticated, service_role;

-- Conferência diária (só avisa, não corrige). Só administrador.
create or replace function public.client_consistency_issues()
returns table (client_id uuid, cliente text, tipo text, problema text, link text)
language plpgsql stable security definer set search_path = '' as $function$
declare _month date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  return query
  with ativos as (select c.id, c.name, c.client_type from public.clients c where c.is_active and not c.is_lost),
  srv as (
    select cs.id cs_id, cs.client_id, s.name sname, s.area, coalesce(s.visits_per_month, 0) visits
    from public.client_services cs join public.services s on s.id = cs.service_id
    join ativos a on a.id = cs.client_id where cs.is_active
  )
  select a.id, a.name, 'servico_sem_preco'::text, 'Serviço ativo sem preço: ' || x.sname, '/clientes/' || a.id || '?aba=operacao'
  from srv x join ativos a on a.id = x.client_id
  where not exists (select 1 from public.client_service_prices p where p.client_service_id = x.cs_id and p.price is not null)
  union all
  select a.id, a.name, 'fixo_sem_dia', 'Cliente fixo sem dia de cobrança', '/clientes/' || a.id || '?passo=cobranca'
  from ativos a left join public.client_contracts ct on ct.client_id = a.id
  where coalesce(a.client_type, 'recurring') <> 'one-off' and ct.billing_day is null
  union all
  select a.id, a.name, 'tipo_divergente',
    case when a.client_type = 'one-off' then 'Avulso na ficha, mas o contrato é de fixo mensal' else 'Fixo na ficha, mas o contrato é de avulso' end,
    '/clientes/' || a.id || '?aba=contrato'
  from ativos a join public.client_contracts ct on ct.client_id = a.id
  where (a.client_type = 'one-off' and (ct.contract_type = 'recurring' or ct.contract_model = 'MRR'))
     or (coalesce(a.client_type, 'recurring') = 'recurring' and (ct.contract_type = 'project' or ct.contract_model = 'One-off'))
  union all
  select a.id, a.name, 'servico_duplicado', 'Serviço ativo em dobro: ' || min(x.sname), '/clientes/' || a.id || '?aba=operacao'
  from srv x join ativos a on a.id = x.client_id join public.client_services cs on cs.id = x.cs_id
  group by a.id, a.name, cs.service_id having count(*) > 1
  union all
  select c.id, c.name, 'venda_sem_lancamento', 'Venda confirmada de ' || to_char(s.sale_date, 'DD/MM') || ' sem fatura nem serviço', '/clientes/' || c.id || '?aba=contrato'
  from public.crm_sales s join public.clients c on c.id = s.client_id
  where s.status = 'confirmada'
    and not exists (select 1 from public.invoices i where i.ref = 'sale:' || s.id)
    and not exists (select 1 from public.client_services cs where cs.id::text in (select jsonb_array_elements_text(coalesce(s.result->'client_services', '[]'::jsonb))))
  union all
  select a.id, a.name, 'audiovisual_sem_projeto', 'Plano de visitas sem captação no mês: ' || min(x.sname), '/clientes/' || a.id || '?aba=operacao'
  from srv x join ativos a on a.id = x.client_id
  where x.area = 'audiovisual' and x.visits > 0
    and not exists (select 1 from public.av_projects p where p.client_id = a.id and p.month = _month)
  group by a.id, a.name
  union all
  select a.id, a.name, 'social_sem_plano', 'Social/design sem planejamento do mês', '/clientes/' || a.id || '?aba=operacao'
  from srv x join ativos a on a.id = x.client_id
  where x.area in ('social', 'design')
    and not exists (select 1 from public.content_plans p where p.client_id = a.id and p.month = _month)
  group by a.id, a.name
  order by 3, 2;
end $function$;
revoke execute on function public.client_consistency_issues() from public, anon;
grant execute on function public.client_consistency_issues() to authenticated, service_role;
