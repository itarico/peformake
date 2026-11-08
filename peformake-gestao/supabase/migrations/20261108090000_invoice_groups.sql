-- Cobrança única: junta as faturas do mesmo cliente no mês (Peformake + Ellcazo + avulsos) numa cobrança só no Asaas.
-- Por dentro nada muda: cada fatura continua da sua empresa (Caixa, repasse da Ellcazo, metas e painéis).
-- O grupo só junta o link: as faturas filhas recebem o mesmo gateway_id/payment_url; pago no Asaas, todas viram pagas.

alter table public.billing_settings add column if not exists merge_monthly boolean not null default false;

create table if not exists public.invoice_groups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  due_date date not null,
  description text not null,
  auto boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.invoice_groups enable row level security;
drop policy if exists invoice_groups_read on public.invoice_groups;
create policy invoice_groups_read on public.invoice_groups for select to authenticated
  using (public.can_finance('peformake') or public.can_finance('ellcazo'));

alter table public.invoices add column if not exists group_id uuid references public.invoice_groups(id) on delete set null;
-- Separada à mão: a junção automática não junta de novo.
alter table public.invoices add column if not exists no_merge boolean not null default false;
create index if not exists invoices_group_id_idx on public.invoices (group_id) where group_id is not null;

-- Monta (ou atualiza) o grupo. Interna: sem checagem de quem chama.
create or replace function public.invoice_group_build(_client uuid, _ids uuid[], _auto boolean)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _g uuid; _due date; _desc text; _n int;
begin
  -- Entram também as irmãs de qualquer grupo envolvido.
  _ids := array(select distinct i.id from public.invoices i
    where i.id = any(_ids) or i.group_id in (select x.group_id from public.invoices x where x.id = any(_ids) and x.group_id is not null));
  select count(*) into _n from public.invoices
  where id = any(_ids) and client_id = _client and status in ('pendente', 'vencido') and gateway_id is null and payment_url is null;
  if _n <> coalesce(cardinality(_ids), 0) then
    raise exception 'Só dá para juntar faturas do mesmo cliente, em aberto e ainda sem link de pagamento' using errcode = 'PF007';
  end if;
  if _n < 2 then raise exception 'Escolha pelo menos duas faturas' using errcode = 'PF007'; end if;

  select group_id into _g from public.invoices where id = any(_ids) and group_id is not null order by created_at limit 1;
  -- Vencimento: o da mensalidade (o fechamento do mês); sem mensalidade, o mais tarde.
  select coalesce(max(due_date) filter (where source = 'mensalidade'), max(due_date)) into _due from public.invoices where id = any(_ids);
  select left('Fatura ' || to_char(_due, 'MM/YYYY') || ' · '
      || string_agg(regexp_replace(description, '^Mensalidade [0-9]{2}/[0-9]{4} · ', ''), ' + ' order by unit desc, source, due_date), 200)
    into _desc from public.invoices where id = any(_ids);

  if _g is null then
    insert into public.invoice_groups (client_id, due_date, description, auto, created_by)
    values (_client, _due, _desc, _auto, (select auth.uid())) returning id into _g;
  else
    update public.invoice_groups set due_date = _due, description = _desc where id = _g;
  end if;
  update public.invoices set group_id = _g, due_date = _due, no_merge = false, updated_at = now()
  where id = any(_ids) and (group_id is distinct from _g or due_date <> _due);
  delete from public.invoice_groups g where g.client_id = _client and g.id <> _g
    and not exists (select 1 from public.invoices i where i.group_id = g.id);
  insert into public.billing_events (invoice_id, kind, detail) select id, 'agrupada', _g::text from public.invoices where id = any(_ids);
  return _g;
end $$;

-- Arruma o grupo depois que uma fatura saiu: com menos de duas, desfaz; senão refaz a descrição.
create or replace function public.invoice_group_tidy(_g uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare _ids uuid[]; _client uuid;
begin
  select array_agg(id), (array_agg(client_id))[1] into _ids, _client from public.invoices where group_id = _g and status <> 'cancelado';
  if coalesce(cardinality(_ids), 0) < 2 then
    update public.invoices set group_id = null, updated_at = now() where group_id = _g;
    delete from public.invoice_groups where id = _g;
  elsif not exists (select 1 from public.invoices where group_id = _g and gateway_id is not null) then
    perform public.invoice_group_build(_client, _ids, false);
  end if;
end $$;

-- Junção automática: faturas em aberto, sem link, do mesmo cliente e do mesmo mês (mensalidade, avulso e manual).
-- Sinal de orçamento e fotos ficam de fora: são pagos antes, não no fechamento.
create or replace function public.invoice_group_auto()
returns integer language plpgsql security definer set search_path to '' as $$
declare _r record; _n int := 0;
begin
  if not coalesce((select merge_monthly from public.billing_settings where id), false) then return 0; end if;
  for _r in
    select i.client_id, array_agg(i.id) ids
    from public.invoices i
    where i.status in ('pendente', 'vencido') and i.gateway_id is null and i.payment_url is null and not i.no_merge
      and i.source in ('mensalidade', 'avulso', 'manual')
      and i.due_date >= (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month')::date
    group by i.client_id, date_trunc('month', i.due_date)
    having count(*) >= 2 and (bool_or(i.group_id is null) or count(distinct i.group_id) > 1)
  loop
    begin
      perform public.invoice_group_build(_r.client_id, _r.ids, true);
      _n := _n + 1;
    exception when others then
      raise warning 'invoice_group_auto %: %', _r.client_id, sqlerrm;
    end;
  end loop;
  return _n;
end $$;

-- Ações do Financeiro (admin da empresa de cada fatura).
create or replace function public.invoice_group(_ids uuid[])
returns uuid language plpgsql security definer set search_path to '' as $$
declare _client uuid;
begin
  if exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) or not exists (select 1 from public.invoices where id = any(_ids)) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  select (array_agg(distinct client_id))[1] into _client from public.invoices where id = any(_ids) having count(distinct client_id) = 1;
  if _client is null then raise exception 'Só dá para juntar faturas do mesmo cliente' using errcode = 'PF007'; end if;
  return public.invoice_group_build(_client, _ids, false);
end $$;

create or replace function public.invoice_ungroup(_group uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if exists (select 1 from public.invoices where group_id = _group and not public.can_finance(unit)) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  if exists (select 1 from public.invoices where group_id = _group and (gateway_id is not null or payment_url is not null)) then
    raise exception 'A cobrança junta já tem link de pagamento. Cancele-a para separar.' using errcode = 'PF008';
  end if;
  insert into public.billing_events (invoice_id, kind, detail) select id, 'separada', _group::text from public.invoices where group_id = _group;
  update public.invoices set group_id = null, no_merge = true, updated_at = now() where group_id = _group;
  delete from public.invoice_groups where id = _group;
end $$;

revoke execute on function public.invoice_group_build(uuid, uuid[], boolean) from public, anon, authenticated;
revoke execute on function public.invoice_group_tidy(uuid) from public, anon, authenticated;
revoke execute on function public.invoice_group_auto() from public, anon, authenticated;
revoke execute on function public.invoice_group(uuid[]) from public, anon;
revoke execute on function public.invoice_ungroup(uuid) from public, anon;
grant execute on function public.invoice_group(uuid[]) to authenticated;
grant execute on function public.invoice_ungroup(uuid) to authenticated;

-- Fila do gateway: faturas soltas como antes + um item por grupo (id do grupo, valor somado).
create or replace function public.billing_gateway_queue(_limit integer default 20)
returns setof jsonb language sql stable security definer set search_path to '' as $$
  with cfg as (select coalesce((select s.auto_charge from public.billing_settings s where s.id), false) auto, (now() at time zone 'America/Sao_Paulo')::date today),
  items as (
    select i.id, i.amount, i.due_date, i.description, i.unit, i.client_id
    from public.invoices i, cfg
    where i.group_id is null and i.status = 'pendente' and i.gateway_id is null
      and (i.gateway_error is null or i.updated_at < now() - interval '6 hours')
      and (_limit >= 500 or (cfg.auto and i.due_date <= cfg.today + 5))
    union all
    select g.id, sum(i.amount), g.due_date, g.description, 'peformake', g.client_id
    from public.invoice_groups g join public.invoices i on i.group_id = g.id, cfg
    group by g.id, cfg.auto, cfg.today
    having bool_and(i.status in ('pendente', 'vencido') and i.gateway_id is null)
      and bool_and(i.gateway_error is null or i.updated_at < now() - interval '6 hours')
      and (_limit >= 500 or (cfg.auto and g.due_date <= cfg.today + 5))
  )
  select jsonb_build_object('id', it.id, 'amount', it.amount, 'due_date', it.due_date, 'description', it.description, 'unit', it.unit,
    'client', jsonb_build_object('id', c.id, 'name', c.name, 'document', c.document, 'email', coalesce((select x.email from public.client_contacts x where x.client_id = c.id and x.gets_billing and x.email is not null order by x.created_at limit 1), c.billing_email, c.email), 'phone', regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')))
  from items it join public.clients c on c.id = it.client_id
  order by it.due_date limit _limit;
$$;

-- Link criado: vale para a fatura ou para todas as do grupo.
create or replace function public.invoice_gateway_set(_id uuid, _gateway text, _gateway_id text, _url text, _error text)
returns void language sql security definer set search_path to '' as $$
  update public.invoices set gateway = _gateway, gateway_id = coalesce(_gateway_id, gateway_id), payment_url = coalesce(_url, payment_url), gateway_error = _error, updated_at = now()
  where id = _id or group_id = _id;
  insert into public.billing_events (invoice_id, kind, detail)
  select id, case when _error is null then 'gateway_ok' else 'gateway_erro' end, coalesce(_error, _gateway_id) from public.invoices where id = _id or group_id = _id;
$$;

-- Pago no gateway: todas as faturas da cobrança (grupo) viram pagas; o valor pago é dividido na proporção de cada uma.
create or replace function public.invoice_paid_by_gateway(_gateway text, _gateway_id text, _value numeric)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _first uuid; _client uuid; _tot numeric; _n int;
begin
  select sum(amount), count(*) into _tot, _n from public.invoices where gateway = _gateway and gateway_id = _gateway_id and status <> 'pago';
  if coalesce(_n, 0) = 0 then
    -- Já baixada: devolve a fatura para quem sincroniza não lançar de novo no Caixa.
    return (select id from public.invoices where gateway = _gateway and gateway_id = _gateway_id order by id limit 1);
  end if;
  perform set_config('pf.gateway_paid', '1', true);
  update public.invoices set status = 'pago', paid_at = now(),
    paid_amount = case when _n = 1 then coalesce(_value, amount) else round(amount * coalesce(_value, _tot) / _tot, 2) end, updated_at = now()
  where gateway = _gateway and gateway_id = _gateway_id and status <> 'pago';
  perform set_config('pf.gateway_paid', '', true);
  select id, client_id into _first, _client from public.invoices where gateway = _gateway and gateway_id = _gateway_id order by id limit 1;
  insert into public.billing_events (invoice_id, kind, detail) select id, 'pago_gateway', _gateway_id from public.invoices where gateway = _gateway and gateway_id = _gateway_id;
  perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
    'Pagamento recebido', (select name from public.clients where id = _client) || ': ' || public.brl(coalesce(_value, _tot)), '/financeiro/cobranca', _client);
  return _first;
end $$;

-- Ações manuais: numa fatura do grupo valem para o grupo todo (é uma cobrança só).
-- Exceção: cancelar uma fatura do grupo que ainda não tem link só tira ela do grupo.
create or replace function public.invoice_group_ids(_id uuid)
returns uuid[] language sql stable security definer set search_path to '' as $$
  select coalesce((select array_agg(x.id) from public.invoices x where x.group_id = i.group_id), array[i.id]) from public.invoices i where i.id = _id;
$$;
revoke execute on function public.invoice_group_ids(uuid) from public, anon, authenticated;

create or replace function public.invoice_set_status(_id uuid, _status text)
returns void language plpgsql security definer set search_path to '' as $$
declare _inv public.invoices; _ids uuid[];
begin
  if _status not in ('pago', 'cancelado', 'pendente') then raise exception 'Status invalido' using errcode = '22023'; end if;
  select * into _inv from public.invoices where id = _id;
  if _inv.id is null then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _inv.group_id is not null and _inv.gateway_id is null and _status = 'cancelado' then
    if not public.can_finance(_inv.unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
    update public.invoices set group_id = null, updated_at = now() where id = _id;
    perform public.invoice_group_tidy(_inv.group_id);
    _ids := array[_id];
  else
    _ids := public.invoice_group_ids(_id);
  end if;
  if exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.invoices set status = _status, paid_at = case when _status = 'pago' then coalesce(paid_at, now()) end,
    paid_amount = case when _status = 'pago' then coalesce(paid_amount, amount) end, updated_at = now()
  where id = any(_ids);
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_manual', _status;
end $$;

create or replace function public.invoice_set_paid(_id uuid, _paid_at date default null, _amount numeric default null)
returns void language plpgsql security definer set search_path to '' as $$
declare _ids uuid[] := public.invoice_group_ids(_id);
begin
  if _ids is null or exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.invoices set status = 'pago',
    paid_at = (coalesce(_paid_at, (now() at time zone 'America/Sao_Paulo')::date)::text || ' 12:00:00-03')::timestamptz,
    paid_amount = case when cardinality(_ids) = 1 then coalesce(_amount, amount) else amount end, updated_at = now()
  where id = any(_ids);
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_manual', 'pago ' || coalesce(_paid_at::text, 'hoje');
end $$;

create or replace function public.invoice_undo_paid(_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare _ids uuid[] := public.invoice_group_ids(_id);
begin
  if _ids is null or exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.invoices set status = case when due_date < (now() at time zone 'America/Sao_Paulo')::date - 7 then 'vencido' else 'pendente' end,
    paid_at = null, paid_amount = null, updated_at = now()
  where id = any(_ids) and status = 'pago';
  if not found then raise exception 'Sem permissao' using errcode = '42501'; end if;
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_manual', 'pagamento desfeito';
end $$;

-- Fechar no Asaas: uma vez por cobrança (o grupo divide o mesmo gateway_id), com o valor somado.
create or replace function public.billing_gateway_close_queue()
returns setof jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('id', (array_agg(i.id order by i.id))[1], 'gateway', i.gateway, 'gateway_id', i.gateway_id, 'close', max(i.gateway_close),
    'value', sum(coalesce(i.paid_amount, i.amount)),
    'paid_at', coalesce(max((i.paid_at at time zone 'America/Sao_Paulo')::date), (now() at time zone 'America/Sao_Paulo')::date))
  from public.invoices i
  where i.gateway_close is not null and i.gateway_closed_at is null and i.gateway_id is not null
    and (i.gateway_close_error is null or i.updated_at < now() - interval '6 hours')
  group by i.gateway, i.gateway_id
  order by min(i.updated_at) limit 20;
$$;

create or replace function public.billing_gateway_close_done(_id uuid, _ok boolean, _error text)
returns void language sql security definer set search_path to '' as $$
  with ref as (select gateway, gateway_id from public.invoices where id = _id),
  done as (
    update public.invoices i set gateway_closed_at = case when _ok then now() end, gateway_close_error = case when _ok then null else left(_error, 300) end, updated_at = now()
    from ref where i.id = _id or (ref.gateway_id is not null and i.gateway = ref.gateway and i.gateway_id = ref.gateway_id and i.gateway_close is not null and i.gateway_closed_at is null)
    returning i.id)
  insert into public.billing_events (invoice_id, kind, detail) select id, case when _ok then 'gateway_fechado' else 'gateway_fechar_erro' end, _error from done;
$$;

-- Aviso de fatura nova com link: uma mensagem por cobrança (no grupo, com o total).
create or replace function public.invoice_link_notify()
returns trigger language plpgsql security definer set search_path to '' as $$
declare _name text; _desc text := new.description; _amount numeric := new.amount;
begin
  if new.payment_url is not null and old.payment_url is null and new.status in ('pendente', 'vencido') then
    if new.group_id is not null then
      if new.id <> (select id from public.invoices where group_id = new.group_id order by id limit 1) then return new; end if;
      select g.description, (select sum(i.amount) from public.invoices i where i.group_id = g.id) into _desc, _amount from public.invoice_groups g where g.id = new.group_id;
    end if;
    select name into _name from public.clients where id = new.client_id;
    perform public.notify_client_private(new.client_id, 'billing_new',
      'Oi, ' || coalesce(_name, '') || '! Sua fatura de ' || _desc || ' (' || public.brl(_amount) || ') vence em '
        || to_char(new.due_date, 'DD/MM') || E'.\n\nPara pagar por Pix, boleto ou cartão: ' || new.payment_url,
      'inv:' || new.id || ':nova');
  end if;
  return new;
end $$;

-- Lembretes: um por cobrança (o grupo vira uma linha com o total).
create or replace function public.billing_reminders_run()
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  _i record;
  _d int;
  _msg text;
  _sent int := 0;
  _alerts int := 0;
  _stops int := 0;
begin
  for _i in
    select (array_agg(i.id order by i.id))[1] as id, array_agg(i.id) as ids, (array_agg(i.client_id))[1] as client_id, max(c.name) as client_name,
      coalesce(max(g.description), max(i.description)) as description, sum(i.amount) as amount, max(i.due_date) as due_date,
      max(i.payment_url) as payment_url, bool_and(i.status = 'pendente') as all_pending
    from public.invoices i join public.clients c on c.id = i.client_id left join public.invoice_groups g on g.id = i.group_id
    where i.status in ('pendente', 'vencido') and i.due_date between (now() at time zone 'America/Sao_Paulo')::date - 7 and (now() at time zone 'America/Sao_Paulo')::date + 1
    group by coalesce(i.group_id, i.id)
  loop
    _d := (now() at time zone 'America/Sao_Paulo')::date - _i.due_date;
    if _d in (-1, 0, 1) then
      _msg := case _d
        when -1 then 'Oi, ' || _i.client_name || '! Passando para lembrar que amanhã vence ' || _i.description || ' (' || public.brl(_i.amount) || ').'
        when 0 then 'Oi, ' || _i.client_name || '! Hoje vence ' || _i.description || ' (' || public.brl(_i.amount) || ').'
        else 'Oi, ' || _i.client_name || '! Não identificamos o pagamento de ' || _i.description || ', que venceu ontem. Se já pagou, pode ignorar esta mensagem.'
      end || coalesce(E'\n\nPara pagar: ' || _i.payment_url, '');
      if public.notify_client_private(_i.client_id, 'billing_reminder', _msg, 'inv:' || _i.id || ':' || _d) then
        _sent := _sent + 1;
        insert into public.billing_events (invoice_id, kind, detail) values (_i.id, 'lembrete', 'D' || case when _d >= 0 then '+' else '' end || _d);
      end if;
    elsif _d = 3 and not exists (select 1 from public.billing_events e where e.invoice_id = _i.id and e.kind = 'alerta_gestor') then
      perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_late',
        'Cobrança atrasada há 3 dias', _i.client_name || ': ' || _i.description, '/financeiro/cobranca', _i.client_id);
      insert into public.billing_events (invoice_id, kind) values (_i.id, 'alerta_gestor');
      _alerts := _alerts + 1;
    elsif _d >= 7 and _i.all_pending then
      update public.invoices set status = 'vencido', updated_at = now() where id = any(_i.ids);
      perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_stop',
        'Cobrança parou: falar com o cliente', _i.client_name || ' está com ' || _i.description || ' atrasado há 7 dias. A régua parou e agora é conversa humana.', '/financeiro/cobranca', _i.client_id);
      insert into public.billing_events (invoice_id, kind) values (_i.id, 'parou_d7');
      _stops := _stops + 1;
    end if;
  end loop;
  return jsonb_build_object('lembretes', _sent, 'alertas', _alerts, 'paradas', _stops);
end $$;

-- Mudou o dia de cobrança: grupos ainda sem link acompanham o novo vencimento da mensalidade.
create or replace function public.client_contract_billing_day_sync()
returns trigger language plpgsql security definer set search_path to '' as $$
declare _g uuid;
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
    for _g in select distinct group_id from public.invoices where client_id = new.client_id and group_id is not null and gateway_id is null and status in ('pendente', 'vencido') loop
      begin
        perform public.invoice_group_build(new.client_id, array(select id from public.invoices where group_id = _g), false);
      exception when others then null;
      end;
    end loop;
  end if;
  return new;
end $$;

-- Configuração: chave nova "juntar as faturas do mês".
create or replace function public.billing_settings_save(_data jsonb)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.billing_settings set
    gateway = coalesce(_data->>'gateway', gateway), gateway_env = coalesce(_data->>'gateway_env', gateway_env),
    auto_charge = coalesce((_data->>'auto_charge')::boolean, auto_charge),
    reminders_enabled = coalesce((_data->>'reminders_enabled')::boolean, reminders_enabled),
    monthly_generate = coalesce((_data->>'monthly_generate')::boolean, monthly_generate),
    merge_monthly = coalesce((_data->>'merge_monthly')::boolean, merge_monthly),
    sweep_enabled = coalesce((_data->>'sweep_enabled')::boolean, sweep_enabled),
    sweep_pix_key = case when _data ? 'sweep_pix_key' then nullif(trim(_data->>'sweep_pix_key'), '') else sweep_pix_key end,
    sweep_pix_key_type = case when _data ? 'sweep_pix_key_type' then nullif(_data->>'sweep_pix_key_type', '') else sweep_pix_key_type end,
    sweep_share_pct = coalesce((_data->>'sweep_share_pct')::numeric, sweep_share_pct),
    updated_at = now(), updated_by = (select auth.uid())
  where id;
  if coalesce((_data->>'merge_monthly')::boolean, false) then perform public.invoice_group_auto(); end if;
end;
$$;

-- Junta logo depois de criar fatura (avulso novo ou mensalidades do mês), sem esperar a rodada.
create or replace function public.invoice_save(_id uuid, _data jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _unit text := _data->>'unit'; _new uuid;
begin
  if not public.can_finance(_unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _id is null then
    insert into public.invoices (client_id, unit, description, amount, due_date, source, ref, created_by)
    values ((_data->>'client_id')::uuid, _unit, trim(_data->>'description'), (_data->>'amount')::numeric, (_data->>'due_date')::date, 'manual', gen_random_uuid()::text, (select auth.uid()))
    returning id into _new;
    perform public.invoice_group_auto();
    return _new;
  end if;
  update public.invoices set description = trim(_data->>'description'), amount = (_data->>'amount')::numeric,
    due_date = case when group_id is null then (_data->>'due_date')::date else due_date end, updated_at = now()
  where id = _id and status in ('pendente', 'vencido') and gateway_id is null and public.can_finance(unit);
  if not found then raise exception 'Fatura ja enviada ao gateway ou paga' using errcode = 'PF006'; end if;
  return _id;
end;
$$;

create or replace function public.invoice_generate_month(_month date)
returns integer language plpgsql security definer set search_path to '' as $$
declare
  _m date := date_trunc('month', _month)::date;
  _n integer := 0;
  _c record;
  _a record;
  _day int;
begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  for _c in
    select c.id, c.name, ct.billing_day from public.clients c
    left join public.client_contracts ct on ct.client_id = c.id
    where c.is_active and not c.is_lost and coalesce(c.client_type, 'recurring') <> 'one-off'
      and (ct.end_date is null or ct.end_date >= _m) and (ct.start_date is null or ct.start_date < (_m + interval '1 month'))
  loop
    -- Padrão: dia 30 (fevereiro cai no último dia do mês).
    _day := least(greatest(coalesce(_c.billing_day, 30), 1), extract(day from (_m + interval '1 month' - interval '1 day'))::int);
    for _a in select * from public.client_monthly_amounts(_c.id) loop
      if coalesce(_a.amount, 0) <= 0 then continue; end if;
      insert into public.invoices (client_id, unit, description, amount, due_date, source, ref)
      values (_c.id, _a.unit, left('Mensalidade ' || to_char(_m, 'MM/YYYY') || ' · ' || _a.items, 200), _a.amount, _m + (_day - 1), 'mensalidade', to_char(_m, 'YYYY-MM') || ':' || _a.unit)
      on conflict (client_id, source, ref) do nothing;
      if found then _n := _n + 1; end if;
    end loop;
  end loop;
  perform public.invoice_group_auto();
  return _n;
end;
$$;

-- Portal do cliente: a cobrança junta aparece como uma linha só, com o total.
create or replace function public.portal_overview(_token text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare _client uuid := public.portal_resolve(_token); _m date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  _unit text; _promise text;
begin
  if _client is null then return null; end if;
  select s.delivery_unit, s.deliverables into _unit, _promise
    from public.client_services cs join public.services s on s.id = cs.service_id
    where cs.client_id = _client and cs.is_active and s.area = 'audiovisual' and s.delivery_unit is not null
    order by (s.unit = 'mês') desc, s.name limit 1;
  return jsonb_build_object(
    'month', _m,
    'design', (select jsonb_build_object('total', count(i.*), 'done', count(i.*) filter (where i.status in ('approved', 'published')), 'waiting', count(i.*) filter (where i.status = 'client_review'))
      from public.content_plans p join public.content_items i on i.plan_id = p.id where p.client_id = _client and p.month = _m),
    'videos', (select jsonb_build_object('total', count(*), 'done', count(*) filter (where status in ('approved', 'delivered')), 'waiting', count(*) filter (where status = 'client_review'),
        'unit', coalesce(_unit, 'produção'), 'promise', _promise)
      from public.av_projects where client_id = _client and status <> 'cancelled' and (month = _m or (month is null and created_at >= _m))),
    'reports', (select count(*) from public.traffic_reports where client_id = _client and sent_at is not null and period_end >= _m),
    'invoices', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'description', x.description, 'amount', x.amount, 'due_date', x.due_date, 'status', x.status, 'payment_url', x.payment_url) order by x.due_date desc)
      from (select coalesce(i.group_id, i.id) id, coalesce(max(g.description), max(i.description)) description, sum(i.amount) amount, max(i.due_date) due_date,
              case when bool_and(i.status = 'pago') then 'pago' when bool_or(i.status = 'vencido') then 'vencido' else 'pendente' end status, max(i.payment_url) payment_url
            from public.invoices i left join public.invoice_groups g on g.id = i.group_id
            where i.client_id = _client and i.status <> 'cancelado' and (i.status in ('pendente', 'vencido') or i.due_date > current_date - 90)
            group by coalesce(i.group_id, i.id) order by max(i.due_date) desc limit 12) x), '[]'),
    'rated_this_week', exists (select 1 from public.service_ratings r where r.client_id = _client and r.week = date_trunc('week', now())::date),
    'areas', public.client_areas(_client),
    'destaque', (select case when s.tier in ('ouro', 'diamante') or s.rank <= 3 then jsonb_build_object(
        'stars', ((coalesce((s.parts ->> 'valor')::numeric, 0) >= 21)::int + (coalesce((s.parts ->> 'avaliacao')::numeric, 0) >= 11)::int
          + (coalesce((s.parts ->> 'tempo_de_casa')::numeric, 0) >= 7.5 and coalesce((s.parts ->> 'pagamento')::numeric, 0) >= 10)::int),
        'top', s.rank <= 3) end
      from public.client_rank_snapshot s where s.client_id = _client order by s.day desc limit 1)
  );
end $$;

-- Rodada de segurança: junta o que entrou por outros caminhos antes do gateway criar os links (que roda aos :20).
select cron.unschedule('billing-merge') where exists (select 1 from cron.job where jobname = 'billing-merge');
select cron.schedule('billing-merge', '10 * * * *', $$ select public.invoice_group_auto() where (select merge_monthly from public.billing_settings where id); $$);

-- Central de Automações.
insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job, flag_table, flag_column, traffic_key, routine_id, routine_on, routine_checked_at) values
('fin_juntar', 'financeiro', 9, 'Cobrança única do mês', 'Junta as faturas do mesmo cliente no mês (Peformake, Ellcazo e avulsos) numa cobrança só, com um link.',
 'Por dentro cada empresa continua com a sua parte (Caixa e repasse da Ellcazo). Sinal de orçamento e fotos não entram. Separar à mão em Cobrança impede de juntar de novo.',
 'A cada hora, aos 10 min, e logo ao criar fatura', false, 'medio', 'billing-merge', 'billing_settings', 'merge_monthly', null, null, null, null)
on conflict (key) do update set module = excluded.module, position = excluded.position, title = excluded.title, what = excluded.what, how = excluded.how,
  schedule = excluded.schedule, uses_ai = excluded.uses_ai, risk = excluded.risk, cron_job = excluded.cron_job, flag_table = excluded.flag_table, flag_column = excluded.flag_column;

-- O grupo divide o mesmo código do Asaas entre as faturas: a trava de "um código por fatura" passa a valer só para as soltas.
drop index if exists public.invoices_gateway_uq;
create unique index if not exists invoices_gateway_uq on public.invoices (gateway, gateway_id) where gateway_id is not null and group_id is null;
