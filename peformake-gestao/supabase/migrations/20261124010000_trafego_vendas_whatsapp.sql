-- Tráfego → Vendas (pedido do Italo, 24/11/2026): conectar o WhatsApp e o Pixel do cliente pela área de Tráfego,
-- guardar de qual anúncio veio cada conversa, marcar a venda e mandar a venda para a Meta (API de Conversões).
-- O que já existia: whatsapp_accounts (client_id), wa-client (QR pelo portal), wa-client-webhook (grava whatsapp_messages).
-- Novo aqui: client_tracking (Pixel por cliente), wa_leads (uma linha por conversa do número do cliente),
-- client_sales (vendas marcadas) e as funções da tela /trafego/vendas. O envio é feito pela função meta-conversion.

-- 1. Pixel por cliente -------------------------------------------------------------------------------------------
create table if not exists public.client_tracking (
  client_id uuid primary key references public.clients(id) on delete cascade,
  pixel_id text,                       -- ID do Pixel (conjunto de dados) da Meta
  waba_id text,                        -- ID da conta do WhatsApp Business (só na conexão oficial)
  test_event_code text,                -- código de "Testar eventos" do Gerenciador de Eventos
  send_enabled boolean not null default false,   -- nasce desligado: só manda venda à Meta depois de alguém ligar
  token_secret_id uuid,                -- token guardado no cofre (vault); o valor nunca volta para a tela
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.client_tracking enable row level security;
create policy client_tracking_select on public.client_tracking for select to authenticated using ((select public.can_access_traffic()));

-- 2. Conversas do WhatsApp do cliente (uma por contato) ----------------------------------------------------------
create table if not exists public.wa_leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  chat_jid text not null,
  phone text,
  name text,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  last_preview text,
  messages integer not null default 0,
  source text not null default 'organico' check (source in ('anuncio', 'organico')),
  ad_id text,          -- anúncio de origem (externalAdReply.sourceId)
  ctwa_clid text,      -- identificador do clique no anúncio Clique para WhatsApp
  ad_title text,
  ad_url text,
  sale_hint boolean not null default false,   -- a conversa tem sinal de venda (pix, comprovante, pedido confirmado)
  unique (account_id, chat_jid)
);
create index if not exists wa_leads_client_last on public.wa_leads (client_id, last_at desc);
alter table public.wa_leads enable row level security;
create policy wa_leads_select on public.wa_leads for select to authenticated using ((select public.can_access_traffic()));

-- 3. Vendas marcadas ---------------------------------------------------------------------------------------------
create table if not exists public.client_sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  lead_id uuid references public.wa_leads(id) on delete set null,
  value_cents bigint not null check (value_cents > 0),
  sold_at timestamptz not null default now(),
  note text,
  meta_status text not null default 'nao_enviar' check (meta_status in ('nao_enviar', 'pendente', 'enviado', 'erro')),
  meta_sent_at timestamptz,
  meta_error text,
  meta_trace text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists client_sales_client_sold on public.client_sales (client_id, sold_at desc);
alter table public.client_sales enable row level security;
create policy client_sales_select on public.client_sales for select to authenticated using ((select public.can_access_traffic()));

-- 4. Cada mensagem do número do cliente alimenta a conversa (e guarda o anúncio de origem) ------------------------
create or replace function public.wa_lead_on_message()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  _client uuid;
  _ad jsonb;
  _phone text;
  _ts timestamptz := coalesce(new.sent_at, new.received_at, now());
  _body text := coalesce(new.body, '');
  _hint boolean;
begin
  begin
    if new.account_id is null or new.is_group or coalesce(new.chat_jid, '') = '' then
      return new;
    end if;
    select client_id into _client from public.whatsapp_accounts where id = new.account_id;
    if _client is null then
      return new;
    end if;
    if new.chat_jid like '%@s.whatsapp.net' then
      _phone := nullif(regexp_replace(split_part(new.chat_jid, '@', 1), '\D', '', 'g'), '');
    end if;
    if _phone is null and not new.from_me then
      _phone := nullif(regexp_replace(coalesce(new.sender_phone, ''), '\D', '', 'g'), '');
    end if;
    if not new.from_me and new.raw is not null then
      _ad := jsonb_path_query_first(new.raw, 'strict $.**.externalAdReply');
    end if;
    _hint := (not new.from_me and _body ~* '(comprovante|paguei|pagamento feito|fiz o pix|pix feito|transferi)')
          or (new.from_me and _body ~* '(pagamento (recebido|confirmado)|pedido confirmado|obrigad[oa] pela (compra|prefer))');

    insert into public.wa_leads as l (client_id, account_id, chat_jid, phone, name, first_at, last_at, last_preview, messages,
                                      source, ad_id, ctwa_clid, ad_title, ad_url, sale_hint)
    values (_client, new.account_id, new.chat_jid, _phone, case when new.from_me then null else nullif(trim(new.sender_name), '') end,
            _ts, _ts, left(nullif(_body, ''), 140), 1,
            case when _ad is null then 'organico' else 'anuncio' end,
            _ad ->> 'sourceId', _ad ->> 'ctwaClid', left(_ad ->> 'title', 140), _ad ->> 'sourceUrl', _hint)
    on conflict (account_id, chat_jid) do update set
      phone = coalesce(l.phone, excluded.phone),
      name = coalesce(excluded.name, l.name),
      first_at = least(l.first_at, excluded.first_at),
      last_preview = case when excluded.last_at >= l.last_at then coalesce(excluded.last_preview, l.last_preview) else l.last_preview end,
      last_at = greatest(l.last_at, excluded.last_at),
      messages = l.messages + 1,
      source = case when excluded.source = 'anuncio' then 'anuncio' else l.source end,
      ad_id = coalesce(excluded.ad_id, l.ad_id),
      ctwa_clid = coalesce(excluded.ctwa_clid, l.ctwa_clid),
      ad_title = coalesce(excluded.ad_title, l.ad_title),
      ad_url = coalesce(excluded.ad_url, l.ad_url),
      sale_hint = l.sale_hint or excluded.sale_hint;
  exception when others then
    raise warning 'wa_lead_on_message falhou para %: %', new.message_id, sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public.wa_lead_on_message() from public, anon, authenticated;


create or replace trigger whatsapp_messages_lead after insert on public.whatsapp_messages
for each row execute function public.wa_lead_on_message();

-- As conversas do número do cliente são dos clientes dele: não entram no Comercial da Peformake.
create or replace function public.commercial_on_message()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.account_id is not null and exists (select 1 from public.whatsapp_accounts a where a.id = new.account_id and a.client_id is not null) then
    return new;
  end if;
  begin
    perform public.commercial_ingest(new);
  exception when others then
    raise warning 'commercial_ingest falhou para %: %', new.message_id, sqlerrm;
  end;
  return new;
end $$;

-- 5. Tela /trafego/vendas ----------------------------------------------------------------------------------------
create or replace function public.traffic_sales_board()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _out jsonb; _set record; _used int;
begin
  if not public.can_access_traffic() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  select client_sessions_enabled, session_limit into _set from public.whatsapp_settings where id;
  select count(*) into _used from public.whatsapp_accounts where client_id is not null and status <> 'desconectado';
  select coalesce(jsonb_agg(r order by r ->> 'name'), '[]'::jsonb) into _out from (
    select jsonb_build_object(
      'id', c.id, 'name', trim(c.name),
      'wa', (select jsonb_build_object('status', a.status, 'phone', a.phone, 'error', a.last_error)
             from public.whatsapp_accounts a where a.client_id = c.id limit 1),
      'pixel_id', t.pixel_id, 'waba_id', t.waba_id, 'test_event_code', t.test_event_code,
      'send_enabled', coalesce(t.send_enabled, false), 'has_token', t.token_secret_id is not null,
      'leads', (select count(*) from public.wa_leads l where l.client_id = c.id and l.last_at > now() - interval '30 days'),
      'from_ads', (select count(*) from public.wa_leads l where l.client_id = c.id and l.source = 'anuncio' and l.last_at > now() - interval '30 days'),
      'hints', (select count(*) from public.wa_leads l where l.client_id = c.id and l.sale_hint
                and not exists (select 1 from public.client_sales s where s.lead_id = l.id and s.canceled_at is null)),
      'sales', (select count(*) from public.client_sales s where s.client_id = c.id and s.canceled_at is null and s.sold_at > now() - interval '30 days'),
      'value_cents', (select coalesce(sum(s.value_cents), 0) from public.client_sales s where s.client_id = c.id and s.canceled_at is null and s.sold_at > now() - interval '30 days'),
      'send_errors', (select count(*) from public.client_sales s where s.client_id = c.id and s.canceled_at is null and s.meta_status = 'erro')
    ) as r
    from public.clients c
    left join public.client_tracking t on t.client_id = c.id
    where t.client_id is not null
       or exists (select 1 from public.whatsapp_accounts a where a.client_id = c.id)
       or (c.is_active and exists (select 1 from public.ad_accounts x where x.client_id = c.id))
  ) q;
  return jsonb_build_object('clients', _out, 'sessions_used', _used, 'sessions_limit', coalesce(_set.session_limit, 0));
end $$;
revoke execute on function public.traffic_sales_board() from public, anon;
grant execute on function public.traffic_sales_board() to authenticated;

-- Salva o Pixel do cliente. O token (opcional) vai para o cofre e nunca volta para a tela.
create or replace function public.traffic_tracking_save(
  _client uuid, _pixel_id text, _waba_id text default null, _test_event_code text default null,
  _send_enabled boolean default false, _token text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare
  _pixel text := nullif(regexp_replace(coalesce(_pixel_id, ''), '\D', '', 'g'), '');
  _waba text := nullif(regexp_replace(coalesce(_waba_id, ''), '\D', '', 'g'), '');
  _tok text := nullif(trim(coalesce(_token, '')), '');
  _secret uuid;
begin
  if not public.can_access_traffic() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clients where id = _client) then
    raise exception 'Cliente não encontrado' using errcode = 'PF004';
  end if;
  if _pixel is not null and length(_pixel) not between 8 and 20 then
    raise exception 'ID do Pixel inválido' using errcode = 'PF011';
  end if;
  if _send_enabled and _pixel is null then
    raise exception 'Informe o Pixel antes de ligar o envio' using errcode = 'PF012';
  end if;
  select token_secret_id into _secret from public.client_tracking where client_id = _client;
  if _tok is not null then
    if not public.has_role('admin') then
      raise exception 'Só administrador troca o token' using errcode = '42501';
    end if;
    if _secret is null then
      _secret := vault.create_secret(_tok, 'meta_capi_' || _client::text, 'Token da API de Conversões da Meta (cliente)');
    else
      perform vault.update_secret(_secret, _tok);
    end if;
  end if;
  insert into public.client_tracking as t (client_id, pixel_id, waba_id, test_event_code, send_enabled, token_secret_id, updated_at, updated_by)
  values (_client, _pixel, _waba, nullif(trim(coalesce(_test_event_code, '')), ''), coalesce(_send_enabled, false), _secret, now(), auth.uid())
  on conflict (client_id) do update set
    pixel_id = excluded.pixel_id, waba_id = excluded.waba_id, test_event_code = excluded.test_event_code,
    send_enabled = excluded.send_enabled, token_secret_id = coalesce(excluded.token_secret_id, t.token_secret_id),
    updated_at = now(), updated_by = auth.uid();
end $$;
revoke execute on function public.traffic_tracking_save(uuid, text, text, text, boolean, text) from public, anon;
grant execute on function public.traffic_tracking_save(uuid, text, text, text, boolean, text) to authenticated;

-- Marca a venda. Devolve se ela precisa ser enviada à Meta (a tela chama a função meta-conversion em seguida).
create or replace function public.traffic_sale_save(
  _client uuid, _lead uuid, _value_cents bigint, _sold_at timestamptz default now(), _note text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  _t record; _id uuid; _status text := 'nao_enviar'; _why text; _when timestamptz := coalesce(_sold_at, now());
begin
  if not public.can_access_traffic() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if _value_cents is null or _value_cents <= 0 then
    raise exception 'Informe o valor da venda' using errcode = 'PF013';
  end if;
  if _when > now() + interval '1 hour' then
    raise exception 'A data da venda não pode ser no futuro' using errcode = 'PF014';
  end if;
  if _lead is not null and not exists (select 1 from public.wa_leads where id = _lead and client_id = _client) then
    raise exception 'Conversa não encontrada' using errcode = 'PF004';
  end if;
  select pixel_id, send_enabled into _t from public.client_tracking where client_id = _client;
  if coalesce(_t.send_enabled, false) and _t.pixel_id is not null then
    if _when < now() - interval '7 days' then
      _why := 'Venda com mais de 7 dias: a Meta não aceita.';
    else
      _status := 'pendente';
    end if;
  end if;
  insert into public.client_sales (client_id, lead_id, value_cents, sold_at, note, meta_status, meta_error, created_by)
  values (_client, _lead, _value_cents, _when, nullif(trim(coalesce(_note, '')), ''), _status, _why, auth.uid())
  returning id into _id;
  return jsonb_build_object('id', _id, 'meta_status', _status);
end $$;
revoke execute on function public.traffic_sale_save(uuid, uuid, bigint, timestamptz, text) from public, anon;
grant execute on function public.traffic_sale_save(uuid, uuid, bigint, timestamptz, text) to authenticated;

-- Apagar venda = marcar como cancelada (a linha fica para auditoria; some das telas e das contas).
alter table public.client_sales add column if not exists canceled_at timestamptz;
create or replace function public.traffic_sale_delete(_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.can_access_traffic() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if exists (select 1 from public.client_sales where id = _id and meta_status = 'enviado') then
    raise exception 'Venda já enviada à Meta não pode ser apagada' using errcode = 'PF015';
  end if;
  update public.client_sales set canceled_at = now() where id = _id and canceled_at is null;
end $$;
revoke execute on function public.traffic_sale_delete(uuid) from public, anon;
grant execute on function public.traffic_sale_delete(uuid) to authenticated;

-- 6. Só a função meta-conversion (service_role) usa estas duas -----------------------------------------------------
create or replace function public.meta_conversion_payload(_sale uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'sale_id', s.id, 'meta_status', s.meta_status, 'value_cents', s.value_cents, 'sold_at', extract(epoch from s.sold_at)::bigint,
    'pixel_id', t.pixel_id, 'waba_id', t.waba_id, 'test_event_code', t.test_event_code, 'send_enabled', coalesce(t.send_enabled, false),
    'token', (select d.decrypted_secret from vault.decrypted_secrets d where d.id = t.token_secret_id),
    'phone', l.phone, 'name', l.name, 'ctwa_clid', l.ctwa_clid)
  from public.client_sales s
  left join public.client_tracking t on t.client_id = s.client_id
  left join public.wa_leads l on l.id = s.lead_id
  where s.id = _sale;
$$;
revoke execute on function public.meta_conversion_payload(uuid) from public, anon, authenticated;
grant execute on function public.meta_conversion_payload(uuid) to service_role;

create or replace function public.meta_conversion_result(_sale uuid, _ok boolean, _error text, _trace text)
returns void language sql security definer set search_path to '' as $$
  update public.client_sales set
    meta_status = case when _ok then 'enviado' else 'erro' end,
    meta_sent_at = case when _ok then now() else meta_sent_at end,
    meta_error = case when _ok then null else left(_error, 300) end,
    meta_trace = left(_trace, 120)
  where id = _sale;
$$;
revoke execute on function public.meta_conversion_result(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.meta_conversion_result(uuid, boolean, text, text) to service_role;

-- 7. Central de automações ---------------------------------------------------------------------------------------
insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk)
values ('trf_vendas_meta', 'trafego', 8, 'Vendas do WhatsApp para a Meta',
  'Quando alguém marca "Vendeu" numa conversa do WhatsApp do cliente, a venda (valor e telefone embaralhado) vai para o Pixel do cliente, para a Meta aprender quem compra.',
  'Liga e desliga por cliente em Tráfego → Vendas → Pixel. Nasce desligado. Envio feito pela função meta-conversion.',
  'Na hora em que a venda é marcada', false, 'medio')
on conflict (key) do nothing;
