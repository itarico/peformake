-- Curadoria de fotos (Ellcazo): a equipe sobe as fotos, o sistema gera prévias leves com marca d'água,
-- o cliente escolhe pelo link, paga as fotos extras pelo próprio sistema e baixa as finais (ou recebe o link do Drive).
-- Cliente parceiro comercial: tag no cliente e o mesmo desconto do contrato de 5 meses.

alter table public.clients add column if not exists is_partner boolean not null default false;

create table if not exists public.photo_galleries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  quote_id uuid references public.av_quotes(id) on delete set null,
  title text not null check (length(trim(title)) between 2 and 120),
  included_count int not null default 0 check (included_count >= 0),
  extra_price numeric(10,2) not null default 0 check (extra_price >= 0),
  discount_pct numeric(5,2) not null default 0,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'aguardando_pagamento', 'paga', 'entregue')),
  public_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  files_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  drive_link text,
  invoice_id uuid references public.invoices(id) on delete set null,
  selected_at timestamptz, paid_at timestamptz, delivered_at timestamptz,
  expires_at date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.photo_gallery_items (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.photo_galleries(id) on delete cascade,
  name text not null,
  preview_path text not null,
  final_path text,
  sort int not null default 0,
  selected boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists photo_gallery_items_gallery on public.photo_gallery_items (gallery_id, sort);

alter table public.photo_galleries enable row level security;
alter table public.photo_gallery_items enable row level security;
drop policy if exists photo_galleries_team on public.photo_galleries;
create policy photo_galleries_team on public.photo_galleries for all to authenticated using (public.can_access_av()) with check (public.can_access_av());
drop policy if exists photo_gallery_items_team on public.photo_gallery_items;
create policy photo_gallery_items_team on public.photo_gallery_items for all to authenticated using (public.can_access_av()) with check (public.can_access_av());

-- Prévias (marca d'água, baixa resolução) e finais (só das escolhidas) ficam em buckets públicos sob um token aleatório.
insert into storage.buckets (id, name, public) values ('gallery-previews', 'gallery-previews', true), ('gallery-finals', 'gallery-finals', true) on conflict (id) do nothing;
drop policy if exists gallery_files_write on storage.objects;
create policy gallery_files_write on storage.objects for insert to authenticated with check (bucket_id in ('gallery-previews', 'gallery-finals') and public.can_access_av());
drop policy if exists gallery_files_delete on storage.objects;
create policy gallery_files_delete on storage.objects for delete to authenticated using (bucket_id in ('gallery-previews', 'gallery-finals') and public.can_access_av());

-- Fatura das fotos extras.
alter table public.invoices drop constraint if exists invoices_source_check;
alter table public.invoices add constraint invoices_source_check check (source = any (array['mensalidade', 'avulso', 'sinal', 'manual', 'fotos']));

-- Desconto de parceiro = desconto do contrato de 5 meses (regra contrato_5m do orçamento).
create or replace function public.partner_discount_pct() returns numeric language sql stable security definer set search_path to '' as $$
  select coalesce((select (r->>'value')::numeric from public.av_pricing p, jsonb_array_elements(p.values->'menu'->'rules') r where p.id and r->>'id' = 'contrato_5m' limit 1),
                  (select (values->>'desconto_contrato_pct')::numeric from public.av_pricing where id), 15)
$$;

create or replace function public.client_set_partner(_client uuid, _on boolean) returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.can_manage_clients() then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.clients set is_partner = coalesce(_on, false), updated_at = now() where id = _client;
end $$;

-- Cria a galeria com o preço da foto extra de Configurações (e o desconto se for parceiro).
create or replace function public.gallery_create(_client uuid, _title text, _included int, _quote uuid default null) returns uuid language plpgsql security definer set search_path to '' as $$
declare _id uuid; _price numeric; _pct numeric := 0;
begin
  if not public.can_access_av() then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select coalesce((values->>'foto_extra')::numeric, (values->>'fotos_extra_10')::numeric / 10, 10) into _price from public.av_pricing where id;
  if (select is_partner from public.clients where id = _client) then _pct := public.partner_discount_pct(); end if;
  insert into public.photo_galleries (client_id, quote_id, title, included_count, extra_price, discount_pct, expires_at, created_by)
  values (_client, _quote, trim(_title), greatest(coalesce(_included, 0), 0), coalesce(_price, 10), _pct, current_date + 30, (select auth.uid()))
  returning id into _id;
  return _id;
end $$;

-- Página pública da galeria (sem login): fotos, escolha, valores e, depois de pago, os arquivos.
create or replace function public.gallery_public(_token text) returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'id', g.id, 'title', g.title, 'client', c.name, 'status', g.status, 'included', g.included_count,
    'extra_price', round(g.extra_price * (1 - g.discount_pct / 100), 2), 'discount_pct', g.discount_pct, 'partner', c.is_partner,
    'needs_document', coalesce(length(regexp_replace(coalesce(c.document, ''), '\D', '', 'g')), 0) not in (11, 14),
    'expires_at', g.expires_at, 'selected_at', g.selected_at,
    'payment_url', (select i.payment_url from public.invoices i where i.id = g.invoice_id),
    'amount', (select i.amount from public.invoices i where i.id = g.invoice_id),
    'drive_link', case when g.status in ('paga', 'entregue') then g.drive_link end,
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'preview', x.preview_path, 'selected', x.selected,
        'final', case when g.status in ('paga', 'entregue') then x.final_path end) order by x.sort, x.name)
      from public.photo_gallery_items x where x.gallery_id = g.id), '[]'::jsonb))
  from public.photo_galleries g join public.clients c on c.id = g.client_id
  where g.public_token = _token and length(_token) >= 40 and g.status <> 'rascunho';
$$;

-- O cliente confirma a escolha. Extras viram fatura; sem extras, já fica pronta para entrega.
create or replace function public.gallery_select(_token text, _ids uuid[], _document text default null) returns jsonb language plpgsql security definer set search_path to '' as $$
declare g public.photo_galleries%rowtype; _n int; _extra int; _amount numeric; _inv uuid; _doc text := regexp_replace(coalesce(_document, ''), '\D', '', 'g'); _team uuid[];
begin
  select * into g from public.photo_galleries where public_token = _token and length(_token) >= 40 for update;
  if not found then raise exception 'Nao encontrado' using errcode = 'PF004'; end if;
  if g.status <> 'enviada' then raise exception 'Escolha ja enviada' using errcode = 'PF001'; end if;
  if g.expires_at is not null and g.expires_at < current_date then raise exception 'Galeria expirada' using errcode = 'PF001'; end if;
  update public.photo_gallery_items set selected = (id = any(coalesce(_ids, '{}'))) where gallery_id = g.id;
  select count(*) into _n from public.photo_gallery_items where gallery_id = g.id and selected;
  if _n = 0 then raise exception 'Escolha pelo menos uma foto' using errcode = 'PF006'; end if;
  _extra := greatest(_n - g.included_count, 0);
  _amount := round(_extra * g.extra_price * (1 - g.discount_pct / 100), 2);
  if _amount > 0 then
    if length(_doc) in (11, 14) then update public.clients set document = _doc where id = g.client_id and coalesce(document, '') = ''; end if;
    insert into public.invoices (client_id, unit, description, amount, due_date, source, ref)
    values (g.client_id, 'ellcazo', left(_extra || ' fotos extras · ' || g.title, 200), _amount, current_date + 2, 'fotos', g.id::text)
    on conflict (client_id, source, ref) do update set amount = excluded.amount, description = excluded.description, updated_at = now()
    returning id into _inv;
    update public.photo_galleries set status = 'aguardando_pagamento', invoice_id = _inv, selected_at = now(), updated_at = now() where id = g.id;
  else
    update public.photo_galleries set status = 'paga', selected_at = now(), paid_at = now(), updated_at = now() where id = g.id;
  end if;
  select array_agg(distinct user_id) into _team from public.user_roles where role in ('admin', 'head_marketing', 'social_media', 'editor', 'videomaker');
  perform public.notify(_team, 'gallery_selected', 'Fotos escolhidas: ' || g.title,
    _n || ' fotos escolhidas' || case when _extra > 0 then ', ' || _extra || ' extras (' || to_char(_amount, 'FM999G990D00') || ' reais a pagar)' else '' end || '.',
    '/audiovisual/fotos/' || g.id, g.client_id);
  return jsonb_build_object('selected', _n, 'extra', _extra, 'amount', _amount, 'invoice_id', _inv);
end $$;

-- Fatura das fotos paga: a galeria fica paga e a equipe é avisada para entregar.
create or replace function public.gallery_invoice_paid() returns trigger language plpgsql security definer set search_path to '' as $$
declare g public.photo_galleries%rowtype;
begin
  if new.source = 'fotos' and new.status = 'pago' and old.status is distinct from 'pago' then
    update public.photo_galleries set status = 'paga', paid_at = now(), updated_at = now() where invoice_id = new.id and status = 'aguardando_pagamento' returning * into g;
    if found then
      perform public.notify(array(select distinct user_id from public.user_roles where role in ('admin', 'head_marketing', 'social_media', 'editor')),
        'gallery_paid', 'Fotos pagas: ' || g.title, 'Pagamento confirmado. Suba as finais ou o link do Drive e entregue.', '/audiovisual/fotos/' || g.id, g.client_id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists gallery_invoice_paid on public.invoices;
create trigger gallery_invoice_paid after update of status on public.invoices for each row execute function public.gallery_invoice_paid();

-- O link de pagamento só é criado pela função gallery-pay (Asaas). Ela lê a fatura pelo token da galeria.
create or replace function public.gallery_pay_item(_token text) returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('id', i.id, 'amount', i.amount, 'due_date', i.due_date, 'description', i.description, 'unit', i.unit, 'payment_url', i.payment_url, 'gateway_id', i.gateway_id,
    'client', jsonb_build_object('id', c.id, 'name', c.name, 'document', regexp_replace(coalesce(c.document, ''), '\D', '', 'g'), 'email', coalesce(c.billing_email, c.email), 'phone', regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')))
  from public.photo_galleries g join public.invoices i on i.id = g.invoice_id join public.clients c on c.id = g.client_id
  where g.public_token = _token and length(_token) >= 40 and g.status = 'aguardando_pagamento' and i.status = 'pendente';
$$;
revoke execute on function public.gallery_pay_item(text) from public, anon, authenticated;

grant execute on function public.gallery_public(text) to anon, authenticated;
grant execute on function public.gallery_select(text, uuid[], text) to anon, authenticated;
