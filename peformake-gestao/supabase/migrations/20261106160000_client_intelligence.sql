-- Inteligência por parâmetros (sem IA): temperatura do relacionamento, porte da empresa,
-- próximo serviço pelo que os outros clientes compram junto, e faixa de preço por serviço.

alter table public.clients add column if not exists company_size text,
  add column if not exists company_capital numeric;
alter table public.clients drop constraint if exists clients_company_size_check;
alter table public.clients add constraint clients_company_size_check check (company_size is null or company_size in ('micro', 'pequena', 'media', 'grande'));

-- Cadastro: aceita porte e capital social vindos da consulta do CNPJ.
create or replace function public.client_save_legal(_client_id uuid, _data jsonb)
returns void language plpgsql security definer set search_path to '' as $$
declare _doc text := regexp_replace(coalesce(_data ->> 'document', ''), '[^0-9]', '', 'g');
        _billing text := nullif(lower(trim(coalesce(_data ->> 'billing_email', ''))), '');
        _size text := nullif(_data ->> 'company_size', '');
begin
  perform public.clients_require_manager();
  if _doc <> '' and _doc !~ '^[0-9]{11}([0-9]{3})?$' then raise exception 'CPF ou CNPJ invalido' using errcode = 'PF006'; end if;
  if _billing is not null and _billing !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail invalido' using errcode = 'PF006'; end if;
  if _size is not null and _size not in ('micro', 'pequena', 'media', 'grande') then _size := null; end if;
  update public.clients set
    document = nullif(_doc, ''),
    legal_name = nullif(left(trim(coalesce(_data ->> 'legal_name', '')), 160), ''),
    address = nullif(left(trim(coalesce(_data ->> 'address', '')), 300), ''),
    billing_email = _billing,
    company_size = coalesce(_size, company_size),
    company_capital = coalesce(nullif(_data ->> 'company_capital', '')::numeric, company_capital)
  where id = _client_id;
end $$;

-- Valor líquido de cada serviço ativo (preço x quantidade com desconto).
create or replace function public.client_service_net(_price numeric, _qty integer, _dtype text, _dvalue numeric)
returns numeric language sql immutable set search_path to '' as $$
  select greatest(
    case when _dtype in ('percent', 'percentage') then coalesce(_price, 0) * greatest(coalesce(_qty, 1), 1) * (1 - least(coalesce(_dvalue, 0), 100) / 100)
         when _dtype = 'fixed' then coalesce(_price, 0) * greatest(coalesce(_qty, 1), 1) - coalesce(_dvalue, 0)
         else coalesce(_price, 0) * greatest(coalesce(_qty, 1), 1) end, 0)
$$;

-- Porte estimado: o do CNPJ quando existe; se não, pelo valor mensal com a assessoria.
create or replace function public.client_size_of(_client uuid)
returns text language sql stable security definer set search_path to '' as $$
  select coalesce(c.company_size,
    case when m.total is null or m.total = 0 then null
         when m.total < 1500 then 'micro' when m.total < 4000 then 'pequena' when m.total < 10000 then 'media' else 'grande' end)
  from public.clients c
  left join lateral (select sum(public.client_service_net(p.price, cs.quantity, p.discount_type, p.discount_value)) total
    from public.client_services cs left join public.client_service_prices p on p.client_service_id = cs.id
    where cs.client_id = c.id and cs.is_active) m on true
  where c.id = _client
$$;

-- Inteligência de cada cliente ativo. Só equipe com acesso a clientes.
create or replace function public.client_intel()
returns table (client_id uuid, temperature integer, temp_label text, factors jsonb, last_contact_at timestamptz,
  company_size text, size_source text, next_service text, next_service_pct integer)
language plpgsql stable security definer set search_path to '' as $$
begin
  if not (public.has_role('admin') or public.has_role('head_marketing') or public.has_role('traffic_manager') or public.has_role('social_media')) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  return query
  with live as (
    select c.id, c.company_size from public.clients c where c.is_active and not c.is_lost
  ),
  staff_phones as (
    select right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 8) p from public.staff_members where phone is not null
  ),
  wa as (
    select g.client_id,
      count(*) filter (where m.sent_at > now() - interval '30 days') as msgs30,
      max(m.sent_at) as last_at
    from public.wa_groups g join public.whatsapp_messages m on m.chat_jid = g.chat_jid
    where g.client_id is not null and not m.from_me
      and right(regexp_replace(coalesce(m.sender_phone, ''), '\D', '', 'g'), 8) not in (select p from staff_phones)
    group by g.client_id
  ),
  approvals as (
    select i.client_id,
      count(*) filter (where i.approved_at > now() - interval '30 days') as approved30,
      count(*) filter (where i.status = 'client_review' and i.updated_at < now() - interval '4 days') as stuck
    from public.content_items i group by i.client_id
  ),
  av as (
    select a.client_id,
      count(*) filter (where a.script_approved_at > now() - interval '30 days' or a.shoot_confirmed_at > now() - interval '30 days') as av30,
      count(*) filter (where a.status = 'client_review' and a.updated_at < now() - interval '4 days') as av_stuck
    from public.av_projects a group by a.client_id
  ),
  portal as (
    select l.client_id, max(l.last_used_at) as last_visit from public.client_portal_links l where l.revoked_at is null group by l.client_id
  ),
  health as (
    select distinct on (a.client_id) a.client_id, a.level from public.client_assessments a order by a.client_id, a.assessed_at desc
  ),
  late as (
    select i.client_id, count(*) as n from public.invoices i where i.status in ('pendente', 'vencido') and i.due_date < current_date - 3 group by i.client_id
  ),
  scored as (
    select l.id,
      wa.msgs30, wa.last_at, approvals.approved30, approvals.stuck, av.av30, av.av_stuck, portal.last_visit, health.level, late.n as late_n,
      greatest(wa.last_at, portal.last_visit) as last_contact,
      -- Recência do último contato do cliente (até 40)
      (case when greatest(wa.last_at, portal.last_visit) > now() - interval '3 days' then 40
            when greatest(wa.last_at, portal.last_visit) > now() - interval '7 days' then 30
            when greatest(wa.last_at, portal.last_visit) > now() - interval '14 days' then 15
            when greatest(wa.last_at, portal.last_visit) > now() - interval '30 days' then 5 else 0 end)
      -- Volume de conversa no mês (até 20)
      + least(coalesce(wa.msgs30, 0), 40) / 2
      -- Aprova e responde (até 20)
      + least((coalesce(approvals.approved30, 0) + coalesce(av.av30, 0)) * 4, 20)
      -- Portal visitado nas últimas 2 semanas (10)
      + case when portal.last_visit > now() - interval '14 days' then 10 else 0 end
      -- Como a equipe sente o relacionamento (de -15 a +10)
      + case health.level when 'muito_bom' then 10 when 'bom' then 6 when 'neutro' then 0 when 'ruim' then -10 when 'muito_ruim' then -15 else 0 end
      -- Travas: aprovação parada e conta atrasada
      - least((coalesce(approvals.stuck, 0) + coalesce(av.av_stuck, 0)) * 5, 15)
      - case when coalesce(late.n, 0) > 0 then 15 else 0 end as score
    from live l
    left join wa on wa.client_id = l.id
    left join approvals on approvals.client_id = l.id
    left join av on av.client_id = l.id
    left join portal on portal.client_id = l.id
    left join health on health.client_id = l.id
    left join late on late.client_id = l.id
  ),
  owned as (
    select distinct cs.client_id, cs.service_id from public.client_services cs join live on live.id = cs.client_id where cs.is_active
  ),
  -- "Quem compra A também compra B": para cada serviço que o cliente não tem, a maior chance entre os serviços que ele tem.
  pair as (
    select a.service_id as a_id, b.service_id as b_id, count(*)::numeric as both_n
    from owned a join owned b on a.client_id = b.client_id and a.service_id <> b.service_id group by 1, 2
  ),
  base as (select service_id, count(*)::numeric as n from owned group by 1),
  suggestion as (
    select distinct on (o.client_id) o.client_id, s.name, round(100 * p.both_n / base.n)::int as pct
    from owned o
    join pair p on p.a_id = o.service_id
    join base on base.service_id = o.service_id
    join public.services s on s.id = p.b_id and s.is_active
    where not exists (select 1 from owned x where x.client_id = o.client_id and x.service_id = p.b_id)
      and base.n >= 3
    order by o.client_id, (p.both_n / base.n) desc, p.both_n desc
  )
  select s.id,
    greatest(0, least(100, s.score))::int,
    case when s.score >= 60 then 'quente' when s.score >= 35 then 'morno' else 'frio' end,
    jsonb_build_object('mensagens_30d', coalesce(s.msgs30, 0), 'ultima_mensagem', s.last_at, 'aprovacoes_30d', coalesce(s.approved30, 0) + coalesce(s.av30, 0),
      'aprovacoes_paradas', coalesce(s.stuck, 0) + coalesce(s.av_stuck, 0), 'ultima_visita_portal', s.last_visit, 'avaliacao', s.level, 'faturas_atrasadas', coalesce(s.late_n, 0)),
    s.last_contact,
    public.client_size_of(s.id),
    case when (select company_size from public.clients where id = s.id) is not null then 'cnpj' else 'valor' end,
    sg.name, sg.pct
  from scored s left join suggestion sg on sg.client_id = s.id;
end $$;
grant execute on function public.client_intel() to authenticated;

-- Faixa de preço de um serviço entre os clientes ativos: geral, do mesmo nicho e do mesmo porte.
create or replace function public.service_price_benchmark(_service uuid, _niche text default null, _size text default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _r jsonb;
begin
  if not (public.has_role('admin') or public.has_role('head_marketing')) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  with p as (
    select p.price as unit_price, c.niche, public.client_size_of(c.id) as size
    from public.client_services cs
    join public.client_service_prices p on p.client_service_id = cs.id
    join public.clients c on c.id = cs.client_id
    where cs.service_id = _service and cs.is_active and c.is_active and not c.is_lost and p.price > 0
  ),
  agg as (
    select 'geral' as k, count(*) n, avg(unit_price) avg, percentile_cont(0.25) within group (order by unit_price) p25, percentile_cont(0.75) within group (order by unit_price) p75, min(unit_price) mn, max(unit_price) mx from p
    union all
    select 'nicho', count(*), avg(unit_price), percentile_cont(0.25) within group (order by unit_price), percentile_cont(0.75) within group (order by unit_price), min(unit_price), max(unit_price) from p where _niche is not null and niche = _niche
    union all
    select 'porte', count(*), avg(unit_price), percentile_cont(0.25) within group (order by unit_price), percentile_cont(0.75) within group (order by unit_price), min(unit_price), max(unit_price) from p where _size is not null and size = _size
  )
  select jsonb_object_agg(k, jsonb_build_object('n', n, 'avg', round(avg, 2), 'p25', round(p25::numeric, 2), 'p75', round(p75::numeric, 2), 'min', mn, 'max', mx))
    || jsonb_build_object('catalogo', (select price from public.service_default_prices d where d.service_id = _service limit 1))
  into _r from agg;
  return _r;
end $$;
grant execute on function public.service_price_benchmark(uuid, text, text) to authenticated;
