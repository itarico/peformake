-- Decisão do Italo (10/11): "Quem recebe" por cliente e Ellcazo no Asaas.
-- (a) padrão: cada empresa cobra a sua (junta só a mesma empresa);
-- (b) Peformake recebe tudo e repassa à Ellcazo; (c) Ellcazo recebe tudo e repassa à Peformake.
-- A receita continua de quem fez o serviço (unit da fatura). Quando a recebedora recebe a parte da outra,
-- nasce um "repasse entre empresas" (fora de receita e despesa), marcado como feito com 1 toque.
-- Ellcazo: cobrança manual/Cora por padrão; "Asaas" usa o segredo ASAAS_API_KEY_ELLCAZO (o Italo cola no Supabase).

alter table public.clients add column if not exists billing_receiver text check (billing_receiver in ('peformake', 'ellcazo'));
alter table public.billing_settings add column if not exists ellcazo_gateway text not null default 'manual' check (ellcazo_gateway in ('manual', 'asaas'));
alter table public.billing_settings add column if not exists interco_pix_enabled boolean not null default false;
alter table public.billing_settings add column if not exists peformake_pix_key text;
alter table public.billing_settings add column if not exists peformake_pix_key_type text;
-- Conta do Asaas que emitiu o link (para cancelar e conferir na conta certa).
alter table public.invoices add column if not exists gateway_account text check (gateway_account in ('peformake', 'ellcazo'));

create table if not exists public.interco_transfers (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id),
  client_id uuid references public.clients(id),
  from_unit text not null check (from_unit in ('peformake', 'ellcazo')),
  to_unit text not null check (to_unit in ('peformake', 'ellcazo')),
  amount numeric not null check (amount > 0),
  ref text not null,
  status text not null default 'pendente' check (status in ('pendente', 'feito', 'cancelado', 'enviando', 'erro')),
  note text,
  gateway_ref text,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  done_by uuid,
  unique (ref)
);
create index if not exists interco_transfers_open_idx on public.interco_transfers (status) where status in ('pendente', 'erro');
alter table public.interco_transfers enable row level security;
create policy interco_transfers_admin_read on public.interco_transfers for select to authenticated using (public.has_role('admin'));

-- Quem recebe o dinheiro desta fatura: a conta que emitiu o link, senão a escolha do cliente, senão a própria empresa.
create or replace function public.invoice_receiver(_i public.invoices) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(_i.gateway_account, (select c.billing_receiver from public.clients c where c.id = _i.client_id), _i.unit)
$$;

-- Cria (ou cancela) o repasse quando a fatura de uma empresa é paga na conta da outra.
create or replace function public.interco_on_invoice()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare _from text; _st text;
begin
  if new.status is not distinct from old.status then return null; end if;
  _from := public.invoice_receiver(new);
  if new.status = 'pago' and _from <> new.unit and coalesce(new.paid_amount, new.amount) > 0 then
    insert into public.interco_transfers (invoice_id, client_id, from_unit, to_unit, amount, ref, note)
    values (new.id, new.client_id, _from, new.unit, coalesce(new.paid_amount, new.amount - new.partial_paid), 'inv:' || new.id || ':' || to_char(now(), 'YYYYMMDDHH24MISSMS'),
      'A repassar para ' || case new.unit when 'ellcazo' then 'Ellcazo' else 'Peformake' end || ': ' || new.description)
    on conflict (ref) do nothing;
  elsif old.status = 'pago' and new.status <> 'pago' then
    update public.interco_transfers set status = 'cancelado', note = coalesce(note, '') || ' · Cancelado: o pagamento foi desfeito.'
    where invoice_id = new.id and status = 'pendente' and ref like 'inv:%';
    if exists (select 1 from public.interco_transfers where invoice_id = new.id and status = 'feito' and ref like 'inv:%') then
      perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_late',
        'Pagamento desfeito com repasse já feito', 'O repasse entre as empresas desta fatura já tinha sido feito: combine o acerto.',
        '/financeiro/cobranca?fatura=' || new.id, new.client_id);
    end if;
  end if;
  return null;
end $function$;
drop trigger if exists interco_on_invoice on public.invoices;
create trigger interco_on_invoice after update of status on public.invoices for each row execute function public.interco_on_invoice();

-- Parcial recebido na conta da outra empresa também vira repasse.
create or replace function public.interco_on_partial()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare _i public.invoices; _from text;
begin
  if new.external_id is null or new.external_id not like 'invpart:%' then return null; end if;
  select * into _i from public.invoices where id = split_part(new.external_id, ':', 2)::uuid;
  if _i.id is null then return null; end if;
  _from := public.invoice_receiver(_i);
  if _from <> _i.unit then
    insert into public.interco_transfers (invoice_id, client_id, from_unit, to_unit, amount, ref, note)
    values (_i.id, _i.client_id, _from, _i.unit, new.amount, new.external_id,
      'A repassar (parcial) para ' || case _i.unit when 'ellcazo' then 'Ellcazo' else 'Peformake' end || ': ' || _i.description)
    on conflict (ref) do nothing;
  end if;
  return null;
end $function$;
drop trigger if exists interco_on_partial on public.fin_entries;
create trigger interco_on_partial after insert on public.fin_entries for each row execute function public.interco_on_partial();

-- "Repasse feito" (1 toque, com confirmação na tela). Só administrador.
create or replace function public.interco_mark_done(_id uuid, _note text default null)
returns void language plpgsql security definer set search_path = '' as $function$
begin
  if not public.has_role('admin') then raise exception 'Só administradores' using errcode = '42501'; end if;
  update public.interco_transfers set status = 'feito', done_at = now(), done_by = (select auth.uid()),
    note = coalesce(note, '') || coalesce(' · ' || nullif(trim(_note), ''), '')
  where id = _id and status in ('pendente', 'erro');
  if not found then raise exception 'Repasse não está em aberto' using errcode = 'PF020'; end if;
end $function$;

create or replace function public.interco_overview()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.has_role('admin') then coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'invoice_id', t.invoice_id, 'client', trim(c.name),
      'from_unit', t.from_unit, 'to_unit', t.to_unit, 'amount', t.amount, 'status', t.status, 'note', t.note, 'created_at', t.created_at,
      'days', ((now() at time zone 'America/Sao_Paulo')::date - (t.created_at at time zone 'America/Sao_Paulo')::date)) order by t.created_at)
    from public.interco_transfers t left join public.clients c on c.id = t.client_id where t.status in ('pendente', 'erro', 'enviando')), '[]'::jsonb)
  else '[]'::jsonb end
$$;

-- Pix automático do repasse (edge function billing-gateway, ação 'interco', só admin logado e com a chave ligada).
create or replace function public.interco_prepare(_id uuid, _by uuid, _dry boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare _t public.interco_transfers; _s public.billing_settings;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if not exists (select 1 from public.user_roles r where r.user_id = _by and r.role = 'admin') then raise exception 'Só administradores' using errcode = '42501'; end if;
  select * into _s from public.billing_settings where id;
  if not _s.interco_pix_enabled then raise exception 'O Pix automático de repasse está desligado (Configurações → Automações)' using errcode = 'PF021'; end if;
  select * into _t from public.interco_transfers where id = _id for update;
  if _t.id is null or _t.status not in ('pendente', 'erro') then raise exception 'Repasse não está em aberto' using errcode = 'PF020'; end if;
  if (_t.to_unit = 'ellcazo' and _s.sweep_pix_key is null) or (_t.to_unit = 'peformake' and _s.peformake_pix_key is null) then
    raise exception 'Falta a chave Pix da empresa que recebe o repasse (Cobrança → Configurar cobrança)' using errcode = 'PF022';
  end if;
  if not _dry then update public.interco_transfers set status = 'enviando' where id = _id; end if;
  return jsonb_build_object('amount', _t.amount, 'from_unit', _t.from_unit, 'to_unit', _t.to_unit,
    'pix_key', case _t.to_unit when 'ellcazo' then _s.sweep_pix_key else _s.peformake_pix_key end,
    'pix_key_type', case _t.to_unit when 'ellcazo' then _s.sweep_pix_key_type else _s.peformake_pix_key_type end,
    'description', left('Repasse ' || coalesce(_t.note, ''), 100));
end $function$;

create or replace function public.interco_finish(_id uuid, _ok boolean, _ref text, _error text)
returns void language plpgsql security definer set search_path = '' as $function$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.interco_transfers set status = case when _ok then 'feito' else 'erro' end, done_at = case when _ok then now() end,
    gateway_ref = left(coalesce(_ref, _error), 300) where id = _id and status = 'enviando';
end $function$;

-- Bete/aviso: só quando um repasse passa de 7 dias parado (uma vez por semana).
create or replace function public.interco_overdue_check()
returns integer language plpgsql security definer set search_path = '' as $function$
declare _n int; _sum numeric;
begin
  select count(*), coalesce(sum(amount), 0) into _n, _sum from public.interco_transfers
  where status in ('pendente', 'erro') and created_at < now() - interval '7 days';
  if _n > 0 and not exists (select 1 from public.notifications where kind = 'interco_late' and created_at > now() - interval '7 days') then
    perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'interco_late',
      _n || ' repasse(s) entre empresas há mais de 7 dias', 'Total ' || public.brl(_sum) || '. Marque como feito no Caixa.', '/financeiro/caixa?repasses=1', null);
  end if;
  return _n;
end $function$;

-- Juntar automático: com "Quem recebe" escolhido, as duas empresas viram uma cobrança só, emitida pela recebedora.
create or replace function public.invoice_group_auto()
returns integer language plpgsql security definer set search_path = '' as $function$
declare _r record; _n int := 0;
begin
  if not coalesce((select merge_monthly from public.billing_settings where id), false) then return 0; end if;
  for _r in
    select i.client_id, array_agg(i.id) ids
    from public.invoices i join public.clients c on c.id = i.client_id
    where i.status in ('pendente', 'vencido') and i.gateway_id is null and i.payment_url is null and not i.no_merge
      and i.source in ('mensalidade', 'avulso', 'manual') and coalesce(i.ref, '') not like 'atraso:%'
      and i.due_date >= (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month')::date
    group by i.client_id, coalesce(c.billing_receiver, i.unit), date_trunc('month', i.due_date)
    having count(*) >= 2 and max(i.due_date) - min(i.due_date) <= 5 and (bool_or(i.group_id is null) or count(distinct i.group_id) > 1)
  loop
    begin
      perform public.invoice_group_build(_r.client_id, _r.ids, true);
      _n := _n + 1;
    exception when others then
      raise warning 'invoice_group_auto %: %', _r.client_id, sqlerrm;
    end;
  end loop;
  return _n;
end $function$;

do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.invoice_group_build(uuid, uuid[], boolean)'::regprocedure);
  if position('billing_receiver' in _src) = 0 then
    _src := replace(_src, $x$  if _auto and (select count(distinct unit) from public.invoices where id = any(_ids)) > 1 then$x$,
      $x$  if _auto and (select count(distinct unit) from public.invoices where id = any(_ids)) > 1
     and (select billing_receiver from public.clients where id = _client) is null then$x$);
    if position('billing_receiver' in _src) = 0 then raise exception 'invoice_group_build: texto esperado não encontrado'; end if;
    execute _src;
  end if;
end $do$;

-- Fila do Asaas: a cobrança sai da conta de quem recebe; Ellcazo sem Asaas ligado fica manual (sem link automático).
create or replace function public.billing_gateway_queue(_limit integer default 20)
returns setof jsonb language sql stable security definer set search_path = '' as $function$
  with cfg as (select coalesce((select s.auto_charge from public.billing_settings s where s.id), false) auto,
                      coalesce((select s.ellcazo_gateway from public.billing_settings s where s.id), 'manual') ell,
                      (now() at time zone 'America/Sao_Paulo')::date today),
  items as (
    select i.id, i.amount - i.partial_paid amount, i.due_date, i.description, coalesce(c.billing_receiver, i.unit) unit, i.client_id
    from public.invoices i join public.clients c on c.id = i.client_id, cfg
    where i.group_id is null and i.status = 'pendente' and i.gateway_id is null
      and (i.gateway_error is null or i.updated_at < now() - interval '6 hours')
      and (_limit >= 500 or (cfg.auto and i.due_date <= cfg.today + 5))
    union all
    select g.id, sum(i.amount - i.partial_paid), g.due_date, g.description,
      coalesce(max(c.billing_receiver), case when count(distinct i.unit) = 1 then min(i.unit) else 'peformake' end), g.client_id
    from public.invoice_groups g join public.invoices i on i.group_id = g.id join public.clients c on c.id = g.client_id, cfg
    group by g.id, cfg.auto, cfg.today
    having bool_and(i.status in ('pendente', 'vencido') and i.gateway_id is null)
      and bool_and(i.gateway_error is null or i.updated_at < now() - interval '6 hours')
      and (_limit >= 500 or (cfg.auto and g.due_date <= cfg.today + 5))
  )
  select jsonb_build_object('id', it.id, 'amount', it.amount, 'due_date', it.due_date, 'description', it.description, 'unit', it.unit,
    'client', jsonb_build_object('id', c.id, 'name', c.name, 'document', c.document, 'email', coalesce((select x.email from public.client_contacts x where x.client_id = c.id and x.gets_billing and x.email is not null order by x.created_at limit 1), c.billing_email, c.email), 'phone', regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')))
  from items it join public.clients c on c.id = it.client_id, cfg
  where it.unit = 'peformake' or cfg.ell = 'asaas'
  order by it.due_date limit _limit;
$function$;

-- "Quem recebe" e configuração da Ellcazo: só administrador.
create or replace function public.client_receiver_save(_client uuid, _receiver text)
returns void language plpgsql security definer set search_path = '' as $function$
begin
  if not public.has_role('admin') then raise exception 'Só administradores' using errcode = '42501'; end if;
  if _receiver is not null and _receiver not in ('peformake', 'ellcazo') then raise exception 'Opção inválida' using errcode = '22023'; end if;
  update public.clients set billing_receiver = _receiver, updated_at = now() where id = _client;
  if not found then raise exception 'Cliente nao encontrado' using errcode = 'PF004'; end if;
  perform public.invoice_group_auto();
end $function$;

create or replace function public.billing_units_save(_data jsonb)
returns void language plpgsql security definer set search_path = '' as $function$
begin
  if not public.has_role('admin') then raise exception 'Só administradores' using errcode = '42501'; end if;
  update public.billing_settings set
    ellcazo_gateway = coalesce(nullif(_data->>'ellcazo_gateway', ''), ellcazo_gateway),
    interco_pix_enabled = coalesce((_data->>'interco_pix_enabled')::boolean, interco_pix_enabled),
    peformake_pix_key = case when _data ? 'peformake_pix_key' then nullif(trim(_data->>'peformake_pix_key'), '') else peformake_pix_key end,
    peformake_pix_key_type = case when _data ? 'peformake_pix_key_type' then nullif(_data->>'peformake_pix_key_type', '') else peformake_pix_key_type end,
    updated_at = now(), updated_by = (select auth.uid())
  where id;
end $function$;

revoke execute on function public.invoice_receiver(public.invoices) from public, anon, authenticated;
revoke execute on function public.interco_prepare(uuid, uuid, boolean), public.interco_finish(uuid, boolean, text, text), public.interco_overdue_check() from public, anon, authenticated;
grant execute on function public.interco_prepare(uuid, uuid, boolean), public.interco_finish(uuid, boolean, text, text), public.interco_overdue_check(), public.invoice_receiver(public.invoices) to service_role;
revoke execute on function public.interco_mark_done(uuid, text), public.interco_overview(), public.client_receiver_save(uuid, text), public.billing_units_save(jsonb) from public, anon;
grant execute on function public.interco_mark_done(uuid, text), public.interco_overview(), public.client_receiver_save(uuid, text), public.billing_units_save(jsonb) to authenticated;

select cron.schedule('interco-overdue', '50 11 * * *', $$ select public.interco_overdue_check(); $$);

-- Item 7 (limpeza): cobranças juntas automáticas que misturam Peformake e Ellcazo, ainda sem link, voltam a ser separadas
-- (o juntar automático junta de novo só a mesma empresa). A com link (já no Asaas) fica como está.
update public.invoices i set group_id = null, updated_at = now()
where i.group_id in (
  select g.id from public.invoice_groups g join public.invoices x on x.group_id = g.id
  where g.auto group by g.id having count(distinct x.unit) > 1 and bool_and(x.gateway_id is null and x.payment_url is null))
  and coalesce(i.ref, '') not like 'atraso:%'
  and (select billing_receiver from public.clients c where c.id = i.client_id) is null;
select public.invoice_group_auto();
