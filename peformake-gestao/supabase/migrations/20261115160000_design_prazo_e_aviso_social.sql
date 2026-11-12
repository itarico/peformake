-- Design: prazo de entrega por peça, tempo de produção e aviso à social media no WhatsApp (pedido do Italo, 12/11/2026).
-- Prazo: Configurações → Inteligência → Prazos de entrega → Arte (intel_settings.art_sla_hours, agora 48 h; não era usado).
-- Quando a peça vai para o design (ou volta com ajuste), ganha design_due_at = agora + prazo (ou o prazo da peça, se for antes).
-- Abrir/baixar referências marca Em produção (tela) e o gatilho grava design_started_at. Na entrega grava delivered_at e
-- delivered_on_time (meta do designer: design_on_time(mês), mostrado na aba Design).

alter table public.content_items add column if not exists design_due_at timestamptz;
alter table public.content_items add column if not exists design_started_at timestamptz;
alter table public.content_items add column if not exists delivered_at timestamptz;
alter table public.content_items add column if not exists delivered_on_time boolean;
alter table public.design_settings add column if not exists notify_social_whatsapp boolean not null default true;

update public.intel_settings set art_sla_hours = 48 where id and art_sla_hours = 24;

create or replace function public.content_item_design_clock()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  _h integer;
  _due timestamptz;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if new.status in ('ready', 'changes_requested') and old.status not in ('ready', 'changes_requested', 'in_production') then
    select coalesce(art_sla_hours, 48) into _h from public.intel_settings where id;
    _due := now() + make_interval(hours => coalesce(_h, 48));
    if new.deadline is not null and new.deadline >= (now() at time zone 'America/Recife')::date then
      _due := least(_due, (new.deadline::timestamp + interval '18 hours') at time zone 'America/Recife');
    end if;
    new.design_due_at := _due;
    new.design_started_at := null;
  elsif new.status = 'in_production' then
    new.design_started_at := coalesce(new.design_started_at, now());
  elsif new.status in ('client_review', 'review') and old.status in ('ready', 'changes_requested', 'in_production') then
    new.delivered_at := now();
    new.delivered_on_time := new.design_due_at is null or now() <= new.design_due_at;
  end if;
  return new;
end;
$function$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'content_item_design_clock' and tgrelid = 'public.content_items'::regclass) then
    create trigger content_item_design_clock before update of status on public.content_items
      for each row execute function public.content_item_design_clock();
  end if;
end $$;

-- Peças que já estão com o design ganham o prazo a partir de agora (não conta atraso de antes).
update public.content_items i set design_due_at = now() + make_interval(hours => coalesce((select art_sla_hours from public.intel_settings where id), 48))
where i.status in ('ready', 'changes_requested', 'in_production') and i.design_due_at is null;

-- Entregas do mês por designer: no prazo × atrasadas.
create or replace function public.design_on_time(_month date)
 returns table(designer_id uuid, delivered integer, on_time integer, late integer)
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select i.designer_id, count(*)::int, count(*) filter (where i.delivered_on_time)::int, count(*) filter (where not i.delivered_on_time)::int
  from public.content_items i
  where public.can_access_content()
    and i.delivered_at >= _month and i.delivered_at < (_month + interval '1 month')
  group by i.designer_id;
$function$;
grant execute on function public.design_on_time(date) to authenticated;

-- Avisos da entrega: equipe no sistema, social media no WhatsApp e cliente no WhatsApp.
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
  _st record;
begin
  select * into _i from public.content_items where id = _item_id;
  if not found then return 0; end if;
  select trim(name) into _client from public.clients where id = _i.client_id;
  _label := coalesce(nullif(trim(_i.title), ''), nullif(trim(_i.headline), ''), 'Peça ' || _i.number);

  perform public.notify(public.client_staff_profiles(_i.client_id, array['social_media', 'head_marketing']),
    'content_delivered', 'Design entregou ao cliente: ' || _label, _client || '. Já está no portal para aprovar.',
    '/conteudo/peca/' || _i.id, _i.client_id);

  -- Social media do cliente no WhatsApp (número do cadastro da equipe).
  if coalesce((select notify_social_whatsapp from public.design_settings where id), true) then
    for _st in
      select distinct s.id, regexp_replace(coalesce(s.phone, ''), '[^0-9]', '', 'g') as phone
      from public.client_team t join public.staff_members s on s.id = t.staff_id
      where t.client_id = _i.client_id and t.role_in_client = 'social_media' and s.is_active
    loop
      _phone := _st.phone;
      if length(_phone) between 10 and 11 then _phone := '55' || _phone; end if;
      continue when _phone !~ '^[0-9]{12,15}$';
      insert into public.notification_outbox (kind, client_id, to_phone, message, dedupe_key)
      values ('content_delivered', null, _phone,
        'Arte entregue pelo design: "' || _label || '" (' || _client || '). Já foi para o cliente aprovar no portal. '
          || 'https://peformake-gestao.vercel.app/conteudo/peca/' || _i.id,
        'design_delivery_social:' || _i.id || ':' || _i.revision_count || ':' || _st.id)
      on conflict (dedupe_key) do nothing;
    end loop;
  end if;

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

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, flag_table, flag_column)
values ('ct_entrega_social', 'conteudo', 5, 'Arte entregue avisa a social media',
  'Quando o designer entrega a arte, a social media do cliente recebe no WhatsApp o aviso com o link da peça.',
  'Não usa IA: mensagem curta para o número cadastrado na equipe. Uma vez por peça e por ajuste.',
  'Na hora da entrega', false, 'baixo', 'design_settings', 'notify_social_whatsapp')
on conflict (key) do nothing;
