-- Design entrega direto ao cliente (decisão do Italo, 12/11/2026).
-- O designer entrega a arte → a peça vai para o portal do cliente aprovar (client_review), sem a revisão interna da social.
-- No mesmo momento: aviso no sistema para a social media e o head (link para a peça) e WhatsApp automático para o cliente
-- com o link do portal (exceção aprovada pelo Italo; desligável em Configurações → Automações: design_settings.delivery_whatsapp).

alter table public.design_settings add column if not exists delivery_whatsapp boolean not null default true;

-- Link de aprovação: abre o portal do cliente (o mesmo painel), vale 30 dias. Guardado só o resumo (hash), como o link do portal.
create table if not exists public.content_approval_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  item_id uuid not null references public.content_items(id) on delete cascade,
  revision integer not null default 0,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  last_used_at timestamptz,
  visits integer not null default 0
);
alter table public.content_approval_links enable row level security;
create index if not exists content_approval_links_item on public.content_approval_links (item_id);

-- O portal aceita também o link de aprovação (válido e de cliente ativo).
create or replace function public.portal_resolve(_token text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  _link public.client_portal_links;
  _ap public.content_approval_links;
begin
  if _token is null or length(_token) <> 43 then
    raise exception 'Link invalido' using errcode = 'PF007';
  end if;
  select l.* into _link
    from public.client_portal_links l
    join public.clients c on c.id = l.client_id
    where l.token_hash = extensions.digest(_token, 'sha256')
      and l.revoked_at is null
      and c.is_active and not c.is_lost;
  if not found then
    select a.* into _ap
      from public.content_approval_links a
      join public.clients c on c.id = a.client_id
      where a.token_hash = extensions.digest(_token, 'sha256')
        and a.expires_at > now()
        and c.is_active and not c.is_lost;
    if not found then
      raise exception 'Link invalido' using errcode = 'PF007';
    end if;
    if _ap.last_used_at is null or _ap.last_used_at < now() - interval '30 minutes' then
      update public.content_approval_links set last_used_at = now(), visits = visits + 1 where id = _ap.id;
    end if;
    return _ap.client_id;
  end if;
  if _link.last_used_at is null or _link.last_used_at < now() - interval '30 minutes' then
    update public.client_portal_links set last_used_at = now(), visits = visits + 1 where id = _link.id;
  end if;
  return _link.client_id;
end;
$function$;

-- Avisos da entrega do design: equipe no sistema + cliente no WhatsApp (uma vez por peça e por rodada de ajuste).
create or replace function public.content_delivery_notify(_item_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  _i public.content_items;
  _client text;
  _label text;
  _token text;
  _url text;
  _first text;
  _phone text;
  _n integer := 0;
  _c record;
begin
  select * into _i from public.content_items where id = _item_id;
  if not found then return 0; end if;
  select trim(name) into _client from public.clients where id = _i.client_id;
  _label := coalesce(nullif(trim(_i.title), ''), nullif(trim(_i.headline), ''), 'Peça ' || _i.number);

  perform public.notify(public.client_staff_profiles(_i.client_id, array['social_media', 'head_marketing']),
    'content_delivered', 'Design entregou ao cliente: ' || _label, _client || '. Já está no portal para aprovar.',
    '/conteudo/peca/' || _i.id, _i.client_id);

  if not coalesce((select delivery_whatsapp from public.design_settings where id), true)
    or not coalesce((select notify_client_review from public.notification_settings where id), false)
    or not coalesce((select whatsapp_client from public.notification_rules where kind = 'content_client_review'), true) then
    return 0;
  end if;

  for _c in
    with contacts as (
      select regexp_replace(coalesce(cc.phone, ''), '[^0-9]', '', 'g') as phone, nullif(split_part(trim(coalesce(cc.name, '')), ' ', 1), '') as first
      from public.client_contacts cc where cc.client_id = _i.client_id and cc.gets_approvals and cc.phone is not null
    ), fallback as (
      select regexp_replace(coalesce(cl.phone, ''), '[^0-9]', '', 'g') as phone, null::text as first
      from public.clients cl where cl.id = _i.client_id and not exists (select 1 from contacts)
    )
    select distinct on (phone) phone, first from (select * from contacts union all select * from fallback) x order by phone, first nulls last
  loop
    _phone := _c.phone;
    if length(_phone) between 10 and 11 then _phone := '55' || _phone; end if;
    continue when _phone !~ '^[0-9]{12,15}$';
    if _token is null then
      _token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
      insert into public.content_approval_links (client_id, item_id, revision, token_hash)
      values (_i.client_id, _i.id, _i.revision_count, extensions.digest(_token, 'sha256'));
      _url := 'https://peformake-gestao.vercel.app/portal#' || _token;
    end if;
    _first := coalesce(initcap(lower(_c.first)), '');
    insert into public.notification_outbox (kind, client_id, to_phone, message, dedupe_key)
    values ('content_client_review', _i.client_id, _phone,
      'Oi' || case when _first <> '' then ', ' || _first else '' end || '! A arte "' || _label || '" está pronta para você aprovar: ' || _url,
      'design_delivery:' || _i.id || ':' || _i.revision_count || ':' || _phone)
    on conflict (dedupe_key) do nothing;
    if found then _n := _n + 1; end if;
  end loop;
  return _n;
end;
$function$;
revoke all on function public.content_delivery_notify(uuid) from public, anon, authenticated;

-- Etapas da peça. Novo: o designer entrega direto ao cliente (pronto/ajuste/produção → com o cliente, exige arte final).
create or replace function public.content_item_set_status(_item_id uuid, _status text, _note text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  _i public.content_items;
  _planner boolean := public.can_plan_content();
  _designer boolean := public.has_role('designer');
  _client text;
  _label text;
  _link text;
  _delivery boolean;
begin
  perform public.content_require_access();
  select * into _i from public.content_items where id = _item_id for update;
  if not found then
    raise exception 'Nao encontrado' using errcode = 'PF004';
  end if;
  if _status = _i.status then
    return;
  end if;
  if _status not in ('briefing', 'ready', 'in_production', 'review', 'client_review', 'changes_requested', 'approved', 'published') then
    raise exception 'Formato invalido' using errcode = 'PF006';
  end if;
  if not _planner and not (_designer and (
      (_i.status in ('ready', 'changes_requested') and _status = 'in_production')
      or (_i.status = 'in_production' and _status = 'review')
      or (_i.status in ('ready', 'changes_requested', 'in_production') and _status = 'client_review'))) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  if _status = 'ready' and (coalesce(_i.title, '') = '' or coalesce(_i.briefing, _i.headline, '') = '') then
    raise exception 'Preencha titulo e briefing' using errcode = 'PF006';
  end if;
  if _status in ('review', 'client_review', 'approved') and _i.status in ('briefing', 'ready', 'in_production', 'changes_requested')
    and not exists (select 1 from public.content_files where item_id = _i.id and role = 'final') and cardinality(_i.legacy_final_urls) = 0 then
    raise exception 'Envie a arte final antes' using errcode = 'PF006';
  end if;
  if _status = 'changes_requested' and length(trim(coalesce(_note, ''))) < 3 then
    raise exception 'Diga o que ajustar' using errcode = 'PF006';
  end if;
  if _status = 'published' and _i.status <> 'approved' then
    raise exception 'So publica depois de aprovado' using errcode = 'PF006';
  end if;
  _delivery := _status = 'client_review' and _i.status in ('ready', 'changes_requested', 'in_production');

  update public.content_items set status = _status,
    revision_note = case when _status = 'changes_requested' then trim(_note) when _status = 'approved' then null else revision_note end,
    revision_count = revision_count + case when _status = 'changes_requested' then 1 else 0 end,
    approved_at = case when _status = 'approved' then now() when _status in ('briefing', 'ready', 'in_production', 'changes_requested') then null else approved_at end,
    updated_at = now(), updated_by = (select auth.uid())
  where id = _i.id;
  insert into public.content_events (item_id, actor_id, actor_kind, from_status, to_status, message)
  values (_i.id, (select auth.uid()), 'staff', _i.status, _status,
    coalesce(nullif(trim(coalesce(_note, '')), ''), case when _delivery then 'Design entregou direto ao cliente' end));

  select name into _client from public.clients where id = _i.client_id;
  _label := coalesce(_i.title, 'Peça ' || _i.number);
  _link := '/conteudo/peca/' || _i.id;
  if _status in ('ready', 'changes_requested') then
    perform public.notify(coalesce(array[(select profile_id from public.staff_members where id = _i.designer_id)], '{}')
      || public.client_staff_profiles(_i.client_id, array['designer']),
      'content_' || _status, case when _status = 'ready' then 'Arte para produzir: ' else 'Ajuste pedido: ' end || _label,
      _client || coalesce('. ' || nullif(trim(coalesce(_note, '')), ''), ''), _link, _i.client_id);
  elsif _status = 'review' then
    perform public.notify(public.client_staff_profiles(_i.client_id, array['social_media', 'head_marketing']),
      'content_review', 'Arte para revisar: ' || _label, _client, _link, _i.client_id);
  elsif _status = 'approved' then
    perform public.notify(public.client_staff_profiles(_i.client_id, array['social_media', 'designer']),
      'content_approved', 'Arte aprovada: ' || _label, _client, _link, _i.client_id);
  elsif _delivery then
    update public.content_plans set sent_to_client_at = now(), updated_at = now() where id = _i.plan_id;
    perform public.content_delivery_notify(_i.id);
  end if;
end;
$function$;

-- Regra de aviso nova (central de avisos) e automação na central (Configurações → Automações).
insert into public.notification_rules (kind, category, name, description, audience, in_app, whatsapp_client, position, email)
values ('content_delivered', 'conteudo', 'Design entregou ao cliente', 'A social media e o head sabem que a arte foi direto para o portal do cliente.', 'equipe', true, false, 7, false)
on conflict (kind) do nothing;

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, flag_table, flag_column)
values ('ct_entrega_cliente', 'conteudo', 4, 'Arte entregue avisa o cliente',
  'Quando o designer entrega a arte, ela vai direto ao portal e o cliente recebe no WhatsApp o link para aprovar.',
  'Não usa IA: mensagem curta com o primeiro nome do contato de aprovação e o link do portal. Uma vez por peça e por ajuste.',
  'Na hora da entrega', false, 'medio', 'design_settings', 'delivery_whatsapp')
on conflict (key) do nothing;
