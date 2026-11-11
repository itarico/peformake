-- Completar a venda: vendas sugeridas pelo agente do WhatsApp chegam só com descrição e valor
-- (sem serviço, empresa e tipo) e, ao serem confirmadas, não iam para o Financeiro.
-- 1) sale_complete: grava serviço/empresa/tipo/valor/vencimento e confirma pelo mesmo caminho da Nova venda
--    (trigger crm_sale_to_fin -> sale_apply: fatura avulsa ou serviços mensais, com result.invoice_id).
--    Também serve para venda já confirmada sem cobrança (chama sale_apply direto).
-- 2) Trava: nenhuma venda vira "confirmada" sem itens ("Complete a venda antes de confirmar").
-- 3) sale_save (venda rápida antiga, sem itens) passa a nascer sempre pendente, para não bater na trava.

create or replace function public.sale_complete(_sale_id uuid, _data jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  _uid uuid := (select auth.uid());
  _s public.crm_sales;
  _line jsonb;
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  _due date := nullif(_data->>'due_date', '')::date;
  _start date := nullif(_data->>'start_date', '')::date;
  _client uuid;
  _kind text;
begin
  if not public.can_manage_clients() then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  select * into _s from public.crm_sales where id = _sale_id for update;
  if _s.id is null or _s.status not in ('pendente', 'confirmada') then
    raise exception 'Venda nao encontrada' using errcode = 'PF004';
  end if;
  if _s.items is not null or (_s.result ? 'invoice_id' and _s.result->>'invoice_id' is not null) or _s.result ? 'client_services' then
    raise exception 'Esta venda já está completa' using errcode = 'PF001';
  end if;
  _client := _s.client_id;
  if _client is null and _s.contact_id is not null then
    select client_id into _client from public.wa_contacts where id = _s.contact_id;
  end if;
  if _client is null then
    raise exception 'Venda sem cliente: cadastre o cliente pela Nova venda' using errcode = 'PF006';
  end if;
  if jsonb_typeof(_data->'item') is distinct from 'object' then
    raise exception 'Escolha o serviço' using errcode = 'PF006';
  end if;
  _line := public.sale_line(_data->'item', public.can_edit_catalog());
  _kind := _line->>'kind';
  if _kind = 'avulso' then
    _due := coalesce(_due, greatest(_s.sale_date, _today) + 3);
    if _due < _today - 30 then raise exception 'Vencimento inválido' using errcode = 'PF006'; end if;
  else
    _start := coalesce(_start, _s.sale_date);
  end if;

  update public.crm_sales set
    client_id = _client,
    items = jsonb_build_array(_line),
    unit = _line->>'unit',
    kind = _kind,
    value_cents = round((_line->>'total')::numeric * 100)::bigint,
    due_date = case when _kind = 'avulso' then _due end,
    start_date = case when _kind = 'recorrente' then _start end,
    seller_id = coalesce(seller_id, created_by, _uid),
    status = 'confirmada',
    reviewed_by = coalesce(reviewed_by, _uid),
    reviewed_at = coalesce(reviewed_at, now())
  where id = _s.id;

  -- Já estava confirmada: o trigger de status não dispara de novo, então lança aqui.
  if _s.status = 'confirmada' then
    perform public.sale_apply(_s.id);
  end if;

  select * into _s from public.crm_sales where id = _sale_id;
  return jsonb_build_object('sale_id', _s.id, 'kind', _s.kind, 'unit', _s.unit, 'result', _s.result,
    'total', case when public.can_see_prices() then _s.value_cents / 100.0 end);
end $function$;

revoke all on function public.sale_complete(uuid, jsonb) from public, anon;
grant execute on function public.sale_complete(uuid, jsonb) to authenticated;

-- Trava: confirmar só com itens (serviço, empresa e tipo), para nunca ficar confirmada sem cobrança.
create or replace function public.crm_sale_require_items()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if new.status = 'confirmada' and new.items is null
     and (tg_op = 'INSERT' or old.status is distinct from 'confirmada') then
    raise exception 'Complete a venda antes de confirmar' using errcode = 'PF010';
  end if;
  return new;
end $function$;

drop trigger if exists crm_sale_require_items on public.crm_sales;
create trigger crm_sale_require_items before insert or update of status on public.crm_sales
  for each row execute function public.crm_sale_require_items();

create or replace function public.sale_save(_data jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  _id uuid;
  _deal uuid := nullif(_data ->> 'deal_id', '')::uuid;
  _contact uuid := nullif(_data ->> 'contact_id', '')::uuid;
  _client uuid := nullif(_data ->> 'client_id', '')::uuid;
  _value bigint := nullif(_data ->> 'value_cents', '')::bigint;
  _date date := coalesce(nullif(_data ->> 'sale_date', '')::date, (now() at time zone 'America/Recife')::date);
  _desc text := trim(coalesce(_data ->> 'description', ''));
begin
  perform public.commercial_require_team();
  if length(_desc) not between 2 and 300
    or _value is null or _value <= 0
    or _date > (now() at time zone 'America/Recife')::date + 1
    or (_deal is not null and not exists (select 1 from public.crm_deals where id = _deal))
    or (_contact is not null and not exists (select 1 from public.wa_contacts where id = _contact))
    or (_client is not null and not exists (select 1 from public.clients where id = _client)) then
    raise exception 'Formato invalido' using errcode = 'PF006';
  end if;
  if _deal is not null and _contact is null then
    select contact_id into _contact from public.crm_deals where id = _deal;
  end if;
  if _contact is not null and _client is null then
    select client_id into _client from public.wa_contacts where id = _contact;
  end if;
  -- Sem itens: nasce pendente e é completada em Comercial -> Vendas (sale_complete).
  insert into public.crm_sales (deal_id, contact_id, client_id, description, value_cents, sale_date, status, source, created_by)
    values (_deal, _contact, _client, _desc, _value, _date, 'pendente', 'manual', (select auth.uid()))
    returning id into _id;
  return _id;
end;
$function$;
