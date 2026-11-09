-- Cobrança: juntar faturas que já têm link e desconto por pagar antes.
-- 1) Juntar faturas com link do Asaas ainda não pago: os links antigos entram numa fila de cancelamento
--    (billing_gateway_cancels, apagados no Asaas pela billing-gateway) e as faturas viram uma cobrança só, com link novo.
-- 2) Desconto por pagar antes do vencimento: liga/desliga em Configurar cobrança (até 3%, até X dias antes);
--    por cliente: padrão, sem desconto (0) ou um percentual próprio (clients.billing_discount_pct).

create table if not exists public.billing_gateway_cancels (
  id uuid primary key default gen_random_uuid(),
  gateway text not null,
  gateway_id text not null,
  invoice_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  done_at timestamptz,
  error text,
  unique (gateway, gateway_id)
);
alter table public.billing_gateway_cancels enable row level security;
create policy billing_gateway_cancels_read on public.billing_gateway_cancels for select to authenticated using (public.has_role('admin'));

create or replace function public.invoice_group(_ids uuid[])
returns uuid language plpgsql security definer set search_path to '' as $function$
declare _client uuid;
begin
  if exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) or not exists (select 1 from public.invoices where id = any(_ids)) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  select (array_agg(distinct client_id))[1] into _client from public.invoices where id = any(_ids) having count(distinct client_id) = 1;
  if _client is null then raise exception 'Só dá para juntar faturas do mesmo cliente' using errcode = 'PF007'; end if;
  -- Já tem link e não foi paga: o link antigo vai para a fila de cancelamento no Asaas (só admin).
  if exists (select 1 from public.invoices where id = any(_ids) and gateway_id is not null and status in ('pendente', 'vencido')) then
    if not public.has_role('admin') then raise exception 'Só o administrador junta faturas que já têm link' using errcode = '42501'; end if;
    insert into public.billing_gateway_cancels (gateway, gateway_id, invoice_ids)
    select i.gateway, i.gateway_id, array_agg(i.id) from public.invoices i
    where i.id = any(_ids) and i.gateway_id is not null and i.status in ('pendente', 'vencido')
    group by i.gateway, i.gateway_id
    on conflict (gateway, gateway_id) do nothing;
    insert into public.billing_events (invoice_id, kind, detail)
    select id, 'link_cancelado', 'Juntada com outras: link antigo ' || gateway_id || ' será apagado no Asaas'
    from public.invoices where id = any(_ids) and gateway_id is not null and status in ('pendente', 'vencido');
    update public.invoices set gateway_id = null, payment_url = null, gateway_error = null, gateway_close = null, gateway_close_error = null, updated_at = now()
    where id = any(_ids) and gateway_id is not null and status in ('pendente', 'vencido');
  end if;
  return public.invoice_group_build(_client, _ids, false);
end $function$;

create or replace function public.billing_gateway_cancel_queue()
returns setof public.billing_gateway_cancels language sql stable security definer set search_path to '' as $$
  select * from public.billing_gateway_cancels where done_at is null and (error is null or created_at < now() - interval '6 hours') order by created_at limit 20
$$;
create or replace function public.billing_gateway_cancel_done(_id uuid, _ok boolean, _error text)
returns void language sql security definer set search_path to '' as $$
  update public.billing_gateway_cancels set done_at = case when _ok then now() end, error = case when _ok then null else left(_error, 300) end where id = _id
$$;
revoke execute on function public.billing_gateway_cancel_queue(), public.billing_gateway_cancel_done(uuid, boolean, text) from public, anon, authenticated;

-- Desconto por pagar antes.
alter table public.billing_settings
  add column if not exists discount_enabled boolean not null default false,
  add column if not exists discount_pct numeric(4,2) not null default 2 check (discount_pct between 0 and 3),
  add column if not exists discount_days integer not null default 0 check (discount_days between 0 and 30);
alter table public.clients add column if not exists billing_discount_pct numeric(4,2) check (billing_discount_pct is null or billing_discount_pct between 0 and 3);

create or replace function public.billing_settings_save(_data jsonb)
returns void language plpgsql security definer set search_path to '' as $function$
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
    fine_enabled = coalesce((_data->>'fine_enabled')::boolean, fine_enabled),
    fine_pct = least(2, greatest(0, coalesce((_data->>'fine_pct')::numeric, fine_pct))),
    interest_pct = least(1, greatest(0, coalesce((_data->>'interest_pct')::numeric, interest_pct))),
    discount_enabled = coalesce((_data->>'discount_enabled')::boolean, discount_enabled),
    discount_pct = least(3, greatest(0, coalesce((_data->>'discount_pct')::numeric, discount_pct))),
    discount_days = least(30, greatest(0, coalesce((_data->>'discount_days')::int, discount_days))),
    updated_at = now(), updated_by = (select auth.uid())
  where id;
  if coalesce((_data->>'merge_monthly')::boolean, false) then perform public.invoice_group_auto(); end if;
end;
$function$;

-- Desconto do cliente: nulo = padrão, 0 = sem desconto, ou um percentual até 3%.
create or replace function public.client_discount_save(_client uuid, _pct numeric)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _pct is not null and (_pct < 0 or _pct > 3) then raise exception 'Desconto vai de 0 a 3%%' using errcode = 'PF006'; end if;
  update public.clients set billing_discount_pct = _pct, updated_at = now(), updated_by = (select auth.uid()) where id = _client;
end $function$;
revoke execute on function public.client_discount_save(uuid, numeric) from public, anon;
grant execute on function public.client_discount_save(uuid, numeric) to authenticated;
