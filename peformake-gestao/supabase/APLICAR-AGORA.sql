-- APLICAR NO SUPABASE (SQL Editor → colar tudo → Run). Gerado em 11/11/2026.
-- Junta, na ordem, as 6 migrações pendentes do Financeiro. Seguro: não apaga dados.

-- ===== migrations/20261110190300_fin_whatsapp_revisao.sql =====
-- Financeiro pelo WhatsApp (parte 4): aba Financeiro → WhatsApp (canais, pessoas, revisão), reembolso,
-- aviso de repetido no lançamento manual, extrato casando com o WhatsApp, fechamento do mês e automações.

create or replace function public.fin_wa_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role('admin') then raise exception 'Só administradores' using errcode = '42501'; end if;
end $$;

-- Aprende com a correção: a palavra principal passa a levar para a categoria escolhida (vale também para o extrato).
create or replace function public.fin_wa_learn(_unit text, _kind text, _cat uuid, _keyword text, _desc text) returns text
language plpgsql security definer set search_path = '' as $$
declare _hint text;
begin
  if _cat is null or not exists (select 1 from public.fin_categories c where c.id = _cat and c.unit = _unit and c.kind = _kind) then return null; end if;
  _hint := nullif(trim(public.fin_norm(_keyword)), '');
  if _hint is null then
    select w into _hint from regexp_split_to_table(regexp_replace(public.fin_norm(_desc), '[^a-z0-9 ]+', ' ', 'g'), '\s+') with ordinality t(w, n)
    where length(w) >= 4 and w !~ '^[0-9]+$'
      and w not in ('para', 'pelo', 'pela', 'com', 'gasto', 'gastei', 'paguei', 'compra', 'comprei', 'despesa', 'recebi', 'entrada', 'cliente', 'mais', 'esse', 'essa', 'isso')
    order by n limit 1;
  end if;
  if _hint is null or length(_hint) < 3 then return null; end if;
  insert into public.fin_rules (unit, match, category_id) values (_unit, left(_hint, 80), _cat)
  on conflict (unit, match) do update set category_id = excluded.category_id;
  return _hint;
end $$;

-- Tudo o que a aba precisa num pedido só.
create or replace function public.fin_wa_overview() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare _wasender text; _transcribe text; _out jsonb;
begin
  perform public.fin_wa_admin();
  perform public.fin_wa_link_pending();
  -- Só diz se falta (sim/não), pela última resposta das rotinas. Nunca lê segredo.
  begin
    select r.content into _wasender from net._http_response r
    where r.created > now() - interval '6 hours' and (r.content like '{"skipped":"Falta a chave do WhatsApp%' or r.content like '{"sent":%')
    order by r.created desc limit 1;
    select r.content into _transcribe from net._http_response r
    where r.created > now() - interval '6 hours' and (r.content like '%TRANSCRIBE_API_KEY%' or r.content like '{"processed":%')
    order by r.created desc limit 1;
  exception when others then null;
  end;
  select jsonb_build_object(
    'settings', (select to_jsonb(s) - 'id' from public.fin_wa_settings s where s.id),
    'channels', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'kind', c.kind, 'name', c.name, 'chat_jid', c.chat_jid, 'invite_code', c.invite_code,
        'phone_key', c.phone_key, 'enabled', c.enabled, 'default_unit', c.default_unit, 'accept_saida', c.accept_saida, 'accept_entrada', c.accept_entrada,
        'reply', c.reply, 'default_payer', c.default_payer, 'group_name', g.name,
        'last_at', (select max(x.received_at) from public.fin_inbox x where x.channel_id = c.id)) order by c.created_at)
      from public.fin_wa_channels c left join public.wa_groups g on g.chat_jid = c.chat_jid), '[]'::jsonb),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', trim(s.full_name), 'avatar_path', s.avatar_path, 'phone', s.phone,
        'allowed', p.staff_id is not null, 'high_value', p.high_value, 'has_pix', s.pix_key is not null, 'pix_key_type', s.pix_key_type,
        'pix_hint', case when s.pix_key is not null then '…' || right(s.pix_key, 4) end) order by p.staff_id is null, s.full_name)
      from public.staff_members s left join public.fin_wa_people p on p.staff_id = s.id where s.is_active), '[]'::jsonb),
    'unknown', coalesce((select jsonb_agg(to_jsonb(u) order by u.last_at desc) from public.fin_wa_unknown u), '[]'::jsonb),
    'groups', coalesce((select jsonb_agg(jsonb_build_object('chat_jid', g.chat_jid, 'name', g.name) order by g.name)
      from public.wa_groups g where g.client_id is null and g.name is not null), '[]'::jsonb),
    'health', jsonb_build_object(
      'wasender_missing', coalesce(_wasender like '{"skipped"%', false),
      'transcribe_missing', coalesce(_transcribe like '%TRANSCRIBE_API_KEY%', false),
      'whatsapp_sending', coalesce((select whatsapp_enabled from public.notification_settings where id), false),
      'audio_waiting', (select count(*) from public.fin_inbox where state = 'aguardando_audio'))
  ) into _out;
  return _out;
end $$;

create or replace function public.fin_wa_settings_save(_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.fin_wa_admin();
  update public.fin_wa_settings set
    enabled = coalesce((_data->>'enabled')::boolean, enabled),
    reply_enabled = coalesce((_data->>'reply_enabled')::boolean, reply_enabled),
    reimburse_enabled = coalesce((_data->>'reimburse_enabled')::boolean, reimburse_enabled),
    pix_enabled = coalesce((_data->>'pix_enabled')::boolean, pix_enabled),
    high_value = coalesce(nullif(_data->>'high_value', '')::numeric, high_value),
    updated_at = now(), updated_by = (select auth.uid())
  where id;
end $$;

create or replace function public.fin_wa_channel_save(_id uuid, _data jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare _kind text; _jid text; _code text; _phone text; _name text; _new uuid;
begin
  perform public.fin_wa_admin();
  _kind := coalesce(_data->>'kind', (select kind from public.fin_wa_channels where id = _id), 'grupo');
  _jid := nullif(trim(coalesce(_data->>'chat_jid', '')), '');
  _code := (regexp_match(coalesce(_data->>'invite', ''), '([A-Za-z0-9]{16,40})\s*$'))[1];
  _phone := public.fin_phone_key(_data->>'phone');
  _name := nullif(trim(coalesce(_data->>'name', '')), '');
  if _jid is not null then
    if exists (select 1 from public.wa_groups g where g.chat_jid = _jid and g.client_id is not null) then
      raise exception 'Esse grupo é de cliente: não pode ser canal do financeiro' using errcode = 'PF030';
    end if;
    _name := coalesce(_name, (select g.name from public.wa_groups g where g.chat_jid = _jid));
  end if;
  if _kind = 'privado' and (_phone is null or length(_phone) < 10) and _id is null then
    raise exception 'Informe o número com DDD' using errcode = '22023';
  end if;
  if _id is null then
    insert into public.fin_wa_channels (kind, name, chat_jid, invite_code, phone_key, enabled, default_unit, accept_saida, accept_entrada, reply, default_payer, created_by)
    values (_kind, coalesce(_name, case when _kind = 'grupo' then 'Grupo do financeiro' else 'Número ' || right(_phone, 4) end),
      _jid, _code, case when _kind = 'privado' then _phone end, false,
      nullif(_data->>'default_unit', ''), coalesce((_data->>'accept_saida')::boolean, true), coalesce((_data->>'accept_entrada')::boolean, true),
      coalesce((_data->>'reply')::boolean, true), coalesce(nullif(_data->>'default_payer', ''), 'empresa'), (select auth.uid()))
    returning id into _new;
  else
    update public.fin_wa_channels set
      name = coalesce(_name, name),
      chat_jid = case when _data ? 'chat_jid' then _jid else chat_jid end,
      invite_code = coalesce(_code, invite_code),
      phone_key = case when kind = 'privado' and _phone is not null then _phone else phone_key end,
      enabled = coalesce((_data->>'enabled')::boolean, enabled),
      default_unit = case when _data ? 'default_unit' then nullif(_data->>'default_unit', '') else default_unit end,
      accept_saida = coalesce((_data->>'accept_saida')::boolean, accept_saida),
      accept_entrada = coalesce((_data->>'accept_entrada')::boolean, accept_entrada),
      reply = coalesce((_data->>'reply')::boolean, reply),
      default_payer = coalesce(nullif(_data->>'default_payer', ''), default_payer)
    where id = _id returning id into _new;
  end if;
  perform public.fin_wa_link_pending();
  return _new;
end $$;

create or replace function public.fin_wa_channel_remove(_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.fin_wa_admin();
  delete from public.fin_wa_channels where id = _id;
end $$;

-- Pessoa: telefone (casa com quem manda a mensagem), limite de valor alto, chave Pix e se pode lançar.
create or replace function public.fin_wa_person_save(_staff uuid, _data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare _phone text;
begin
  perform public.fin_wa_admin();
  if not exists (select 1 from public.staff_members where id = _staff) then raise exception 'Membro não encontrado' using errcode = 'PF004'; end if;
  if _data ? 'phone' then
    _phone := nullif(regexp_replace(coalesce(_data->>'phone', ''), '[^0-9]', '', 'g'), '');
    if _phone is not null and length(_phone) < 10 then raise exception 'Telefone com DDD, por favor' using errcode = '22023'; end if;
    if _phone is not null and length(_phone) in (10, 11) then _phone := '55' || _phone; end if;
    update public.staff_members set phone = _phone where id = _staff;
    delete from public.fin_wa_unknown where phone_key = public.fin_phone_key(_phone);
  end if;
  if _data ? 'pix_key' then
    update public.staff_members set pix_key = nullif(trim(_data->>'pix_key'), ''),
      pix_key_type = case when nullif(trim(_data->>'pix_key'), '') is null then null else nullif(_data->>'pix_key_type', '') end
    where id = _staff;
  end if;
  if (_data->>'allowed')::boolean is true then
    insert into public.fin_wa_people (staff_id, high_value) values (_staff, nullif(_data->>'high_value', '')::numeric)
    on conflict (staff_id) do update set high_value = case when _data ? 'high_value' then excluded.high_value else public.fin_wa_people.high_value end;
  elsif (_data->>'allowed')::boolean is false then
    delete from public.fin_wa_people where staff_id = _staff;
  elsif _data ? 'high_value' then
    update public.fin_wa_people set high_value = nullif(_data->>'high_value', '')::numeric where staff_id = _staff;
  end if;
end $$;

create or replace function public.fin_wa_unknown_dismiss(_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.fin_wa_admin();
  delete from public.fin_wa_unknown where phone_key = _key;
end $$;

-- O que pede revisão (a mesma regra vale para a lista, o contador, o fechamento do mês e a Bete).
create or replace function public.fin_wa_needs_review(_state text, _review text) returns boolean
language sql immutable set search_path = '' as $$
  select _state in ('nao_entendi', 'aguardando_audio', 'fatura') or (_state = 'lancado' and _review = 'a_revisar')
$$;

create or replace function public.fin_wa_pending_total() returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.fin_inbox x left join public.fin_entries e on e.id = x.entry_id
  where public.fin_wa_needs_review(x.state, e.review_status)
$$;

create or replace function public.fin_wa_pending_count() returns integer
language sql stable security definer set search_path = '' as $$
  select case when public.has_role('admin') then public.fin_wa_pending_total() else 0 end
$$;

create or replace function public.fin_wa_review_list() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.fin_wa_admin();
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', x.id, 'state', x.state, 'received_at', x.received_at, 'body', x.body, 'media', x.media, 'reason', x.reason,
        'confidence', x.confidence, 'high_value', x.high_value, 'parsed', x.parsed, 'ref', left(x.id::text, 6),
        'staff_id', x.staff_id, 'sender', coalesce(trim(s.full_name), x.sender_name), 'sender_avatar', s.avatar_path,
        'channel', ch.name,
        'media_bucket', m.bucket, 'media_path', m.path, 'media_mime', m.mime, 'media_error', m.error,
        'entry', case when e.id is not null then jsonb_build_object('id', e.id, 'unit', e.unit, 'kind', e.kind, 'amount', e.amount, 'description', e.description,
          'date', coalesce(x.parsed->>'date', (coalesce(e.paid_at, e.due_date))::text), 'status', e.status, 'source', e.source,
          'category_id', e.category_id, 'category', cat.name, 'client_id', e.client_id, 'client', trim(cl.name),
          'project', av.title, 'job', j.title, 'bank', (e.bank_ref is not null or e.source = 'extrato'),
          'paid_by_staff', e.paid_by_staff, 'review_status', e.review_status, 'confirmations', e.confirmations, 'attribution', e.attribution) end,
        'invoice', case when i.id is not null then jsonb_build_object('id', i.id, 'description', i.description, 'amount', i.amount, 'due_date', i.due_date,
          'status', i.status, 'client', trim(icl.name)) end
      ) order by x.received_at desc)
      from public.fin_inbox x
      left join public.fin_entries e on e.id = x.entry_id
      left join public.staff_members s on s.id = x.staff_id
      left join public.fin_wa_channels ch on ch.id = x.channel_id
      left join public.whatsapp_media m on m.message_id = x.wa_row_id
      left join public.fin_categories cat on cat.id = e.category_id
      left join public.clients cl on cl.id = e.client_id
      left join public.av_projects av on av.id = e.av_project_id
      left join public.service_jobs j on j.id = e.service_job_id
      left join public.invoices i on i.id = x.invoice_id
      left join public.clients icl on icl.id = i.client_id
      where public.fin_wa_needs_review(x.state, e.review_status)
         or (x.state = 'repetido' and x.received_at > now() - interval '30 days')), '[]'::jsonb),
    'reimbursements', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'unit', e.unit, 'amount', e.amount, 'description', e.description, 'due_date', e.due_date,
        'staff_id', s.id, 'staff', trim(s.full_name), 'avatar_path', s.avatar_path, 'has_pix', s.pix_key is not null,
        'reimburse_status', e.reimburse_status, 'reimburse_error', case when e.reimburse_status = 'erro' then e.reimburse_ref end) order by e.due_date)
      from public.fin_entries e join public.staff_members s on s.id = e.staff_id
      where e.paid_by_staff is not null and e.staff_id = e.paid_by_staff and e.kind = 'saida' and e.status = 'pendente'), '[]'::jsonb),
    'pix_enabled', (select pix_enabled from public.fin_wa_settings where id));
end $$;

-- Confirmar (com ou sem edição). _data: kind, unit, amount, date, description, category_id, client_id, payer ('empresa' | 'pessoa'),
-- not_same (repetido: "é outro"), not_invoice (entrada: "não é essa fatura").
create or replace function public.fin_wa_review_save(_inbox uuid, _data jsonb, _confirm boolean default true) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  _i public.fin_inbox; _e public.fin_entries; _unit text; _kind text; _amount numeric; _date date; _desc text; _cat uuid; _client uuid;
  _pocket boolean; _entry uuid; _learned text; _state text;
begin
  perform public.fin_wa_admin();
  _data := coalesce(_data, '{}'::jsonb);
  select * into _i from public.fin_inbox where id = _inbox for update;
  if _i.id is null then raise exception 'Item não encontrado' using errcode = 'PF004'; end if;
  if _i.state in ('confirmado', 'descartado', 'cancelado') then raise exception 'Este item já foi revisado' using errcode = 'PF031'; end if;

  if _i.state = 'repetido' then
    if (_data->>'not_same')::boolean is true then
      perform public.fin_wa_undo(_inbox);
      update public.fin_inbox set state = 'nao_entendi', entry_id = null where id = _inbox;
      _state := public.fin_wa_process(_inbox, true);
      return jsonb_build_object('state', _state);
    end if;
    update public.fin_inbox set state = 'confirmado', reviewed_by = (select auth.uid()), reviewed_at = now() where id = _inbox;
    return jsonb_build_object('state', 'confirmado', 'entry_id', _i.entry_id);
  end if;

  if _i.state = 'fatura' and (_data->>'not_invoice')::boolean is not true then
    _amount := coalesce(nullif(_data->>'amount', '')::numeric, (_i.parsed->>'amount')::numeric);
    _date := coalesce(nullif(_data->>'date', '')::date, (_i.parsed->>'date')::date);
    if not _confirm then return jsonb_build_object('state', 'fatura'); end if;
    if not public.invoice_paid_matched(_i.invoice_id, 'wa:' || _i.wa_message_id, _date, _amount, 'WhatsApp, confirmado na revisão') then
      raise exception 'A fatura não está mais em aberto (ou o valor não bate). Use "Não é essa fatura".' using errcode = 'PF032';
    end if;
    update public.fin_inbox set state = 'confirmado', reviewed_by = (select auth.uid()), reviewed_at = now() where id = _inbox;
    return jsonb_build_object('state', 'confirmado');
  end if;

  if _i.state = 'lancado' then select * into _e from public.fin_entries where id = _i.entry_id; end if;
  _kind := coalesce(nullif(_data->>'kind', ''), _e.kind, _i.parsed->>'kind');
  _unit := coalesce(nullif(_data->>'unit', ''), _e.unit, _i.parsed->>'unit_final', _i.parsed->>'unit', 'peformake');
  _amount := coalesce(nullif(_data->>'amount', '')::numeric, _e.amount, (_i.parsed->>'amount')::numeric);
  _date := coalesce(nullif(_data->>'date', '')::date, (_i.parsed->>'date')::date, _e.paid_at, _e.due_date, (_i.received_at at time zone 'America/Sao_Paulo')::date);
  _desc := left(coalesce(nullif(trim(_data->>'description'), ''), _e.description, _i.parsed->>'description', 'Lançamento pelo WhatsApp'), 200);
  _cat := case when _data ? 'category_id' then nullif(_data->>'category_id', '')::uuid else _e.category_id end;
  _client := case when _data ? 'client_id' then nullif(_data->>'client_id', '')::uuid else coalesce(_e.client_id, (_i.parsed->'client'->>'id')::uuid) end;
  _pocket := case when _data ? 'payer' then _data->>'payer' = 'pessoa' else _e.paid_by_staff is not null end;
  if _kind not in ('entrada', 'saida') then raise exception 'Escolha se é entrada ou saída' using errcode = '22023'; end if;
  if _unit not in ('peformake', 'ellcazo') then raise exception 'Empresa inválida' using errcode = '22023'; end if;
  if _amount is null or _amount <= 0 then raise exception 'Informe o valor' using errcode = '22023'; end if;
  if _kind = 'entrada' or _i.staff_id is null then _pocket := false; end if;
  if _cat is not null and not exists (select 1 from public.fin_categories c where c.id = _cat and c.unit = _unit and c.kind = _kind) then _cat := null; end if;

  if _e.id is null then
    insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, client_id, source, external_id, notes, created_by,
      review_status, attribution, paid_by_staff, staff_id)
    values (_unit, _kind, _cat, _desc, _amount, case when _pocket then public.team_payday(_date) else _date end, case when _pocket then null else _date end,
      case when _pocket then 'pendente' else 'pago' end, _client, 'whatsapp', 'wa:' || _i.wa_message_id || ':rev',
      left('Completado na revisão. Mensagem: "' || coalesce(_i.body, 'sem texto') || '"', 500), (select auth.uid()),
      case when _confirm then 'confirmado' else 'a_revisar' end, 'completado na revisão',
      case when _pocket then _i.staff_id end, case when _pocket and _confirm then _i.staff_id end)
    on conflict (unit, source, external_id) where external_id is not null do update set amount = excluded.amount
    returning id into _entry;
  else
    update public.fin_entries set unit = _unit, kind = _kind, category_id = _cat, description = _desc, amount = _amount, client_id = _client,
      due_date = case when _pocket then public.team_payday(_date) when status = 'pendente' and external_id like 'rec:%' then due_date else _date end,
      paid_at = case when _pocket then null else _date end,
      status = case when _pocket then 'pendente' else 'pago' end,
      paid_by_staff = case when _pocket then _i.staff_id end,
      staff_id = case when _pocket and _confirm then _i.staff_id else null end,
      review_status = case when _confirm then 'confirmado' else 'a_revisar' end,
      updated_at = now()
    where id = _e.id;
    _entry := _e.id;
  end if;

  -- Aprende: categoria trocada (ou dada pela primeira vez) vira regra.
  if _cat is not null and _cat is distinct from _e.category_id then
    _learned := public.fin_wa_learn(_unit, _kind, _cat, _i.parsed->>'keyword', _desc);
  end if;
  -- Apelido novo: a pessoa escolheu o cliente e escreveu como ela chama ele.
  if _client is not null and nullif(trim(_data->>'alias'), '') is not null then
    update public.clients set aliases = array(select distinct unnest(aliases || lower(trim(_data->>'alias')))) where id = _client;
  end if;

  update public.fin_inbox set state = case when _confirm then 'confirmado' else 'lancado' end, entry_id = _entry,
    reviewed_by = case when _confirm then (select auth.uid()) end, reviewed_at = case when _confirm then now() end
  where id = _inbox;
  return jsonb_build_object('state', case when _confirm then 'confirmado' else 'lancado' end, 'entry_id', _entry, 'learned', _learned);
end $$;

create or replace function public.fin_wa_review_discard(_inbox uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.fin_wa_admin();
  perform public.fin_wa_undo(_inbox);
  update public.fin_inbox set state = 'descartado', reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = _inbox and state not in ('confirmado', 'descartado', 'cancelado');
end $$;

-- "Confirmar todos os conferidos no banco": um toque.
create or replace function public.fin_wa_confirm_bank() returns integer
language plpgsql security definer set search_path = '' as $$
declare _r record; _n int := 0;
begin
  perform public.fin_wa_admin();
  for _r in select x.id from public.fin_inbox x join public.fin_entries e on e.id = x.entry_id
    where x.state = 'lancado' and e.review_status = 'a_revisar' and (e.bank_ref is not null or e.source = 'extrato') loop
    perform public.fin_wa_review_save(_r.id, '{}'::jsonb, true);
    _n := _n + 1;
  end loop;
  return _n;
end $$;

-- Lançamento manual: antes de salvar, o Caixa pergunta se já existe um igual (WhatsApp, extrato, outro manual).
create or replace function public.fin_entry_dupe_check(_data jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare _amount numeric := nullif(_data->>'amount', '')::numeric; _date date := coalesce(nullif(_data->>'date', '')::date, (now() at time zone 'America/Sao_Paulo')::date);
begin
  if _amount is null or not public.can_finance(_data->>'unit') then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(r order by r.sim desc, r.gap) from (
    select e.id, e.unit, e.description, e.amount, coalesce(e.paid_at, e.due_date) as date, e.source, abs(coalesce(e.paid_at, e.due_date) - _date) gap,
      extensions.similarity(public.fin_norm(e.description), public.fin_norm(coalesce(_data->>'description', ''))) sim,
      case e.source when 'whatsapp' then 'WhatsApp' || coalesce(' de ' || (select coalesce(nullif(split_part(trim(s.full_name), ' ', 1), ''), x.sender_name)
          from public.fin_inbox x left join public.staff_members s on s.id = x.staff_id where x.entry_id = e.id order by x.received_at limit 1), '')
        when 'extrato' then 'extrato do banco' when 'asaas' then 'Asaas' when 'contrato' then 'Cobrança' else 'lançamento manual' end as via
    from public.fin_entries e
    where public.can_finance(e.unit) and e.kind = _data->>'kind' and e.status <> 'cancelado' and abs(e.amount - _amount) < 0.01
      and abs(coalesce(e.paid_at, e.due_date) - _date) <= 2 and e.id is distinct from nullif(_data->>'id', '')::uuid
    order by sim desc limit 3) r), '[]'::jsonb);
end $$;

-- "É o mesmo": não cria outro, só registra que mais alguém confirmou.
create or replace function public.fin_entry_same(_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare _unit text;
begin
  select unit into _unit from public.fin_entries where id = _id;
  if _unit is null or not public.can_finance(_unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.fin_entries set updated_at = now(),
    confirmations = confirmations || jsonb_build_object('by', (select coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), p.email) from public.profiles p where p.id = (select auth.uid())),
      'at', now(), 'via', 'manual')
  where id = _id;
end $$;

-- Reembolso por Pix (só pela edge function billing-gateway, ação 'reimburse', com admin logado; nunca por rotina).
create or replace function public.fin_reimburse_prepare(_entry uuid, _by uuid, _dry boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare _e public.fin_entries; _s public.staff_members;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if not exists (select 1 from public.user_roles r join public.profiles p on p.id = r.user_id where r.user_id = _by and r.role = 'admin' and p.is_active) then
    raise exception 'Só administradores pagam reembolso' using errcode = '42501';
  end if;
  if not coalesce((select pix_enabled from public.fin_wa_settings where id), false) then
    raise exception 'O pagamento por Pix está desligado (Configurações → Automações)' using errcode = 'PF040';
  end if;
  select * into _e from public.fin_entries where id = _entry for update;
  if _e.id is null or _e.kind <> 'saida' or _e.status <> 'pendente' or _e.paid_by_staff is null or _e.staff_id is distinct from _e.paid_by_staff then
    raise exception 'Reembolso não está em aberto' using errcode = 'PF041';
  end if;
  if _e.reimburse_status in ('enviando', 'enviado') then raise exception 'Este Pix já foi enviado ou está sendo enviado' using errcode = 'PF042'; end if;
  select * into _s from public.staff_members where id = _e.staff_id;
  if _s.pix_key is null or _s.pix_key_type is null then raise exception 'Cadastre a chave Pix do membro em Financeiro → WhatsApp → Pessoas' using errcode = 'PF043'; end if;
  if not _dry then update public.fin_entries set reimburse_status = 'enviando', updated_at = now() where id = _entry; end if;
  return jsonb_build_object('amount', _e.amount, 'pix_key', _s.pix_key, 'pix_key_type', _s.pix_key_type, 'name', trim(_s.full_name),
    'description', left('Reembolso ' || _e.description, 100));
end $$;

create or replace function public.fin_reimburse_finish(_entry uuid, _ok boolean, _ref text, _error text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _ok then
    update public.fin_entries set status = 'pago', paid_at = (now() at time zone 'America/Sao_Paulo')::date, reimburse_status = 'enviado', reimburse_ref = left(_ref, 120),
      notes = trim(coalesce(notes, '') || ' · Reembolso pago por Pix (Asaas ' || coalesce(_ref, '') || ').'), updated_at = now()
    where id = _entry and reimburse_status = 'enviando';
  else
    update public.fin_entries set reimburse_status = 'erro', reimburse_ref = left('erro: ' || coalesce(_error, 'sem detalhe'), 300), updated_at = now()
    where id = _entry and reimburse_status = 'enviando';
  end if;
end $$;

-- Extrato do banco: casa com os lançamentos do WhatsApp (marca "conferido no banco") em vez de criar linha nova.
create or replace function public.fin_import(_unit text, _rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  _r jsonb; _amount numeric; _desc text; _date date; _ext text;
  _cat uuid; _rule uuid; _id uuid; _inv uuid; _dup uuid; _wa uuid;
  _added int := 0; _skipped int := 0; _uncat int := 0; _matched int := 0; _paid int := 0; _transfer int := 0; _wam int := 0;
begin
  if not public.can_finance(_unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if jsonb_array_length(coalesce(_rows, '[]')) > 2000 then raise exception 'Extrato grande demais' using errcode = '22023'; end if;
  for _r in select * from jsonb_array_elements(coalesce(_rows, '[]')) loop
    _amount := (_r->>'amount')::numeric;
    _desc := left(coalesce(nullif(trim(_r->>'description'), ''), 'Sem descrição'), 200);
    _date := (_r->>'date')::date;
    _ext := left(_r->>'external_id', 120);
    if _amount is null or _amount = 0 or _date is null or _ext is null then _skipped := _skipped + 1; continue; end if;
    if exists (select 1 from public.fin_entries where unit = _unit and source = 'extrato' and external_id = _ext)
       or exists (select 1 from public.fin_entries where unit = _unit and bank_ref = _ext)
       or exists (select 1 from public.invoices where paid_ref = 'extrato:' || _ext) then
      _skipped := _skipped + 1; continue;
    end if;
    -- Lançado pelo WhatsApp (pago pela empresa) com o mesmo valor e data perto: é o mesmo gasto.
    select e.id into _wa from public.fin_entries e
    where e.unit = _unit and e.source = 'whatsapp' and e.status = 'pago' and e.bank_ref is null and e.paid_by_staff is null
      and e.kind = case when _amount > 0 then 'entrada' else 'saida' end
      and abs(e.amount - abs(_amount)) < 0.01 and abs(e.paid_at - _date) <= 3
    order by abs(e.paid_at - _date), extensions.similarity(public.fin_norm(e.description), public.fin_norm(_desc)) desc limit 1;
    if _wa is not null then
      update public.fin_entries set bank_ref = _ext, paid_at = _date, notes = trim(coalesce(notes, '') || ' [extrato ' || _ext || ']'), updated_at = now() where id = _wa;
      _wam := _wam + 1; _wa := null; continue;
    end if;
    if _amount > 0 then
      if lower(_desc) ~ 'asaas' then
        insert into public.fin_entries (unit, kind, description, amount, due_date, paid_at, status, source, external_id, notes, created_by)
        values (_unit, 'entrada', _desc, abs(_amount), _date, null, 'cancelado', 'extrato', _ext,
          'Transferência do Asaas para o banco: não é receita nova (o recebimento já entrou pela cobrança).', (select auth.uid()))
        on conflict (unit, source, external_id) where external_id is not null do nothing;
        _transfer := _transfer + 1; continue;
      end if;
      select e.id into _dup from public.fin_entries e
      where e.unit = _unit and e.kind = 'entrada' and e.status = 'pago' and e.source in ('contrato', 'asaas')
        and abs(e.amount - _amount) < 0.01 and abs(e.paid_at - _date) <= 3
        and coalesce(e.notes, '') not like '%[extrato %'
      order by abs(e.paid_at - _date) limit 1;
      if _dup is not null then
        update public.fin_entries set notes = trim(coalesce(notes, '') || ' [extrato ' || _ext || ']'), bank_ref = coalesce(bank_ref, _ext), updated_at = now() where id = _dup;
        _matched := _matched + 1; _dup := null; continue;
      end if;
      _inv := public.fin_match_open_invoice(null, _unit, _amount, array[_date]);
      if _inv is not null and public.invoice_paid_matched(_inv, 'extrato:' || _ext, _date, _amount, 'extrato do banco') then
        update public.fin_entries set notes = trim(coalesce(notes, '') || ' [extrato ' || _ext || ']'), bank_ref = coalesce(bank_ref, _ext), updated_at = now() where external_id = 'inv:' || _inv;
        _paid := _paid + 1; _inv := null; continue;
      end if;
      _inv := null;
    end if;
    select r.id, r.category_id into _rule, _cat from public.fin_rules r
      join public.fin_categories c on c.id = r.category_id
      where r.unit = _unit and c.kind = case when _amount > 0 then 'entrada' else 'saida' end
        and position(r.match in lower(_desc)) > 0
      order by length(r.match) desc limit 1;
    insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, source, external_id, created_by)
    values (_unit, case when _amount > 0 then 'entrada' else 'saida' end, _cat, _desc, abs(_amount), _date, _date, 'pago', 'extrato', _ext, (select auth.uid()))
    on conflict (unit, source, external_id) where external_id is not null do nothing
    returning id into _id;
    if _id is null then _skipped := _skipped + 1;
    else
      _added := _added + 1;
      if _cat is null then _uncat := _uncat + 1; else update public.fin_rules set hits = hits + 1 where id = _rule; end if;
    end if;
    _id := null; _cat := null; _rule := null;
  end loop;
  return jsonb_build_object('added', _added, 'skipped', _skipped, 'uncategorized', _uncat,
    'matched', _matched, 'invoices_paid', _paid, 'transfers', _transfer, 'whatsapp_matched', _wam);
end $function$;

-- Fotos, comprovantes e áudios dos canais do financeiro também são baixados (pasta privada fin-whatsapp).
create or replace function public.whatsapp_media_pending(_limit integer)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'type', m.message_type, 'raw', m.raw, 'contact_id', m.contact_id, 'client_id', m.client_id, 'fin', m.fin)), '[]'::jsonb)
  from (
    select * from (
      select m.id, m.message_type, m.raw, m.received_at, c.id contact_id, c.client_id, false fin from public.whatsapp_messages m
      join lateral (select c.id, c.client_id from public.wa_contacts c where c.chat_jid = m.chat_jid and c.client_id is not null limit 1) c on true
      where m.message_type in ('image', 'video', 'document') and not m.from_me
        and coalesce(m.sent_at, m.received_at) > now() - interval '7 days'
        and not exists (select 1 from public.whatsapp_media w where w.message_id = m.id)
        and not exists (select 1 from public.fin_inbox x where x.wa_row_id = m.id)
      union all
      select m.id, m.message_type, m.raw, m.received_at, null, null, true from public.whatsapp_messages m
      join public.fin_inbox x on x.wa_row_id = m.id
      where m.message_type in ('image', 'document', 'audio')
        and coalesce(m.sent_at, m.received_at) > now() - interval '7 days'
        and not exists (select 1 from public.whatsapp_media w where w.message_id = m.id)
    ) a
    order by a.fin desc, a.received_at desc
    limit greatest(1, least(_limit, 3))
  ) m;
$$;

create or replace function public.whatsapp_media_saved(_message_id bigint, _contact_id uuid, _client_id uuid, _kind text, _bucket text, _path text, _mime text, _size bigint, _caption text, _error text)
returns void language plpgsql security definer set search_path = '' as $function$
begin
  insert into public.whatsapp_media (message_id, contact_id, client_id, kind, bucket, path, mime, size_bytes, caption, error)
  values (_message_id, _contact_id, _client_id, _kind, _bucket, _path, _mime, _size, left(_caption, 1000), left(_error, 300))
  on conflict (message_id) do nothing;
  -- Do financeiro (sem cliente): só guarda o arquivo para a revisão; não mexe no texto da mensagem nem nos arquivos do cliente.
  if _path is not null and _client_id is not null then
    update public.whatsapp_messages set body = '[' || case _kind when 'image' then 'Imagem' when 'video' then 'Vídeo' else 'Arquivo' end
      || ' #' || _message_id || ' salvo] ' || coalesce(_caption, '') where id = _message_id;
    insert into public.client_assets (client_id, folder, name, bucket, path, mime, size_bytes, source, source_id)
    values (_client_id, 'outros', left('WhatsApp ' || to_char(now() at time zone 'America/Recife', 'DD-MM HH24hMI') || ' ' || coalesce(nullif(left(_caption, 60), ''), _kind), 200),
      _bucket, _path, coalesce(_mime, 'application/octet-stream'), coalesce(_size, 0), 'whatsapp', null)
    on conflict (bucket, path) do nothing;
  end if;
end;
$function$;

-- Fechamento do mês avisa os lançamentos do WhatsApp ainda sem revisão.
do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.month_close_run'::regproc);
  if position('fin_wa_review' in _src) = 0 then
    _src := replace(_src, $x$  return jsonb_build_object('creditos_novos'$x$, $x$  if public.fin_wa_pending_total() > 0 then
    perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'fin_wa_review',
      public.fin_wa_pending_total() || ' lançamento(s) do WhatsApp para revisar', 'Revise antes de fechar o mês: Financeiro → WhatsApp.', '/financeiro/whatsapp', null);
  end if;
  return jsonb_build_object('creditos_novos'$x$);
    execute _src;
  end if;
end $do$;

-- Central de automações: atividade e problema das chaves novas.
do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.automation_overview'::regproc);
  if position('fin_wa_leitura' in _src) = 0 then
    _src := replace(_src, $x$      when 'trf_rel_semanal' then$x$, $x$      when 'fin_wa_leitura' then
        select max(received_at) into _activity from public.fin_inbox;
        if coalesce(_on, false) and not exists (select 1 from public.fin_wa_channels where enabled and (kind = 'privado' or chat_jid is not null)) then
          _problem := 'Nenhum canal ligado (ou o grupo ainda não apareceu na lista do WhatsApp).';
        end if;
      when 'fin_wa_resposta' then
        select max(sent_at) into _activity from public.notification_outbox where kind = 'fin_wa_reply';
        if coalesce(_on, false) and exists (select 1 from public.notification_outbox where kind = 'fin_wa_reply' and status = 'pending' and created_at < now() - interval '30 minutes') then
          _problem := 'Respostas paradas na fila: falta a chave do Wasender no servidor ou o envio de WhatsApp está desligado em Notificações.';
        end if;
      when 'trf_rel_semanal' then$x$);
    execute _src;
  end if;
end $do$;

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, flag_table, flag_column) values
  ('fin_wa_leitura', 'financeiro', 20, 'Lançamentos pelo WhatsApp', 'Lê as mensagens dos canais ligados (grupo ou número) e lança no Caixa como "a revisar", sem duplicar.',
    'Leitor por regras no banco, sem IA (custo zero). O que não entender fica para completar na revisão.', 'Na hora, a cada mensagem', false, 'baixo', 'fin_wa_settings', 'enabled'),
  ('fin_wa_resposta', 'financeiro', 21, 'Resposta no grupo do financeiro', 'Responde no grupo "Anotado: despesa R$ 250 · combustível..." e aceita "corrige" e "cancela".',
    'Mensagem interna da equipe, nunca para cliente. Sem IA. Precisa da chave do Wasender no servidor.', 'Na hora', false, 'baixo', 'fin_wa_settings', 'reply_enabled'),
  ('fin_wa_reembolso', 'financeiro', 22, 'Reembolso de quem pagou do bolso', '"Paguei do meu bolso" vira reembolso para a pessoa, que entra no pagamento do dia 30 depois da revisão.',
    'Sem IA. Só vira conta a pagar depois do OK na revisão.', 'Na revisão', false, 'medio', 'fin_wa_settings', 'reimburse_enabled'),
  ('fin_wa_pix', 'financeiro', 23, 'Pagar reembolso por Pix', 'Mostra o botão "Pagar agora por Pix" no reembolso confirmado (transferência pelo Asaas).',
    'Só com o toque e a confirmação de um administrador; nunca sozinho. Precisa da chave Pix do membro.', 'Só quando um administrador pedir', false, 'alto', 'fin_wa_settings', 'pix_enabled')
on conflict (key) do nothing;
update public.automation_catalog set what = 'Baixa o que os clientes mandam no WhatsApp e guarda nos arquivos do cliente. Também guarda os comprovantes e áudios dos canais do financeiro (só admin vê).'
where key = 'wa_midia';
update public.automation_catalog set how = 'Serviço de voz pago por uso, fora do Claude (Whisper pela Groq ou OpenAI). Precisa do segredo TRANSCRIBE_API_KEY no servidor.'
where key = 'wa_audio';

-- ===== migrations/20261110200000_fin_correcoes_dinheiro.sql =====
-- Correções do relatório docs/AVALIACAO-CLIENTES-FINANCEIRO.md (itens 1 a 14, 30): dinheiro certo.
-- Decisões do Italo (10/11): juntar automático só faturas da mesma empresa e com vencimentos até 5 dias de diferença
-- (vale o mais cedo, e a mudança fica registrada); 1ª mensalidade no mês seguinte ao início e só com dia de cobrança;
-- pagamento parcial deixa a fatura aberta com o saldo; pagamento até 30 dias depois do vencimento (ou 3 antes) é reconhecido
-- e, na dúvida, fica "A conferir" no topo do Caixa.
-- As 10 faturas manuais em atraso (ref 'atraso:%', no_merge) não são tocadas por nada aqui.

alter table public.invoices add column if not exists partial_paid numeric not null default 0;
alter table public.fin_entries add column if not exists suggest_invoice uuid;
create index if not exists fin_entries_suggest_idx on public.fin_entries (suggest_invoice) where suggest_invoice is not null;
-- Índices que vão faltar com volume (gargalos do relatório).
create index if not exists fin_entries_external_any_idx on public.fin_entries (external_id) where external_id is not null;
create index if not exists invoices_gateway_all_idx on public.invoices (gateway, gateway_id) where gateway_id is not null;
create index if not exists fin_entries_match_idx on public.fin_entries (unit, kind, amount, paid_at);
create index if not exists invoices_fin_entry_idx on public.invoices (fin_entry_id);
create index if not exists service_jobs_invoice_idx on public.service_jobs (invoice_id);
create index if not exists delivery_credits_invoice_idx on public.delivery_credits (invoice_id);

-- Saldo em aberto de uma fatura (valor menos o que já entrou de pagamento parcial).
create or replace function public.invoice_open_amount(_i public.invoices) returns numeric
language sql immutable set search_path = '' as $$ select round(_i.amount - coalesce(_i.partial_paid, 0), 2) $$;

-- Item 1: ao sair do "pago", a fatura volta a poder ser conciliada (sem a marca do extrato).
create or replace function public.invoice_clear_match(_ids uuid[]) returns void
language sql security definer set search_path = '' as $$
  update public.fin_entries e set bank_ref = null, updated_at = now(),
    notes = nullif(trim(regexp_replace(coalesce(e.notes, ''), '\s*\[extrato [^\]]*\]', '', 'g')), '')
  where e.id in (select i.fin_entry_id from public.invoices i where i.id = any(_ids) and i.fin_entry_id is not null)
    and (e.bank_ref is not null or coalesce(e.notes, '') like '%[extrato %');
  update public.invoices set paid_ref = null where id = any(_ids) and paid_ref is not null;
$$;

create or replace function public.invoice_undo_paid(_id uuid)
returns void language plpgsql security definer set search_path = '' as $function$
declare _ids uuid[] := public.invoice_group_ids(_id);
begin
  if _ids is null or exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.invoices set status = case when due_date < (now() at time zone 'America/Sao_Paulo')::date - 7 then 'vencido' else 'pendente' end,
    paid_at = null, paid_amount = null, paid_ref = null, updated_at = now()
  where id = any(_ids) and status = 'pago';
  if not found then raise exception 'Sem permissao' using errcode = '42501'; end if;
  perform public.invoice_clear_match(_ids);
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_manual', 'pagamento desfeito';
end $function$;

create or replace function public.invoice_set_status(_id uuid, _status text)
returns void language plpgsql security definer set search_path = '' as $function$
declare _inv public.invoices; _ids uuid[]; _was_paid uuid[];
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
  _was_paid := array(select id from public.invoices where id = any(_ids) and status = 'pago');
  update public.invoices set status = _status, paid_at = case when _status = 'pago' then coalesce(paid_at, now()) end,
    paid_amount = case when _status = 'pago' then coalesce(paid_amount, amount - partial_paid) end,
    paid_ref = case when _status = 'pago' then paid_ref end, updated_at = now()
  where id = any(_ids);
  if _status <> 'pago' and cardinality(_was_paid) > 0 then perform public.invoice_clear_match(_was_paid); end if;
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_manual', _status;
end $function$;

-- Item 2: no Caixa, voltar um lançamento de cobrança junta para "pendente" desfaz a cobrança inteira (e o Caixa acompanha).
create or replace function public.fin_entry_sync_invoice()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare _inv uuid; _group uuid; _linked boolean; _ids uuid[];
begin
  if new.external_id is null or new.external_id not like 'inv:%' then return null; end if;
  _inv := substring(new.external_id from 5)::uuid;
  select group_id, (gateway_id is not null or payment_url is not null) into _group, _linked from public.invoices where id = _inv;
  if _group is not null and new.status = 'cancelado' and _linked then
    raise exception 'Esta fatura faz parte de uma cobrança junta com link: cancele pela Cobrança' using errcode = 'PF008';
  end if;
  _ids := case when _group is not null and (new.status = 'pago' or old.status = 'pago') then public.invoice_group_ids(_inv) else array[_inv] end;
  update public.invoices i set
    status = case new.status when 'pago' then 'pago' when 'cancelado' then 'cancelado' else (case when i.status = 'vencido' then 'vencido' else 'pendente' end) end,
    paid_at = case when new.status = 'pago' then coalesce(i.paid_at, public.brt_noon(new.paid_at)) end,
    paid_amount = case when new.status = 'pago' then coalesce(i.paid_amount, case when i.id = _inv then new.amount else i.amount - i.partial_paid end) end,
    paid_ref = case when new.status = 'pago' then i.paid_ref end,
    updated_at = now()
  where i.id = any(_ids) and (i.status is distinct from case new.status when 'pago' then 'pago' when 'cancelado' then 'cancelado' else i.status end
                       or (new.status <> 'pago' and i.status = 'pago'));
  if found then
    insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_caixa', new.status;
    -- As outras faturas da cobrança junta: o lançamento delas no Caixa segue junto.
    update public.fin_entries e set status = new.status, paid_at = case when new.status = 'pago' then new.paid_at end, updated_at = now()
    from public.invoices i
    where i.id = any(_ids) and i.id <> _inv and e.id = i.fin_entry_id and e.status is distinct from new.status and e.status <> 'cancelado';
    if new.status <> 'pago' and old.status = 'pago' then perform public.invoice_clear_match(_ids); end if;
  end if;
  return null;
end $function$;

-- Lançamento do Caixa de uma fatura mostra o saldo em aberto (o parcial já recebido tem lançamento próprio).
create or replace function public.invoice_sync_entry()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare _cat uuid; _id uuid; _paid date;
begin
  _paid := case when new.status = 'pago' then (coalesce(new.paid_at, now()) at time zone 'America/Sao_Paulo')::date end;
  select id into _cat from public.fin_categories
  where unit = new.unit and kind = 'entrada'
    and name = case when new.source = 'mensalidade' then 'Mensalidade de cliente' when new.unit = 'ellcazo' then 'Gravação avulsa' else 'Serviço avulso' end;
  if new.fin_entry_id is null then
    insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, client_id, source, external_id, created_by)
    values (new.unit, 'entrada', _cat, new.description, new.amount - new.partial_paid, new.due_date, _paid,
      case when new.status = 'pago' then 'pago' when new.status = 'cancelado' then 'cancelado' else 'pendente' end,
      new.client_id, 'contrato', 'inv:' || new.id, new.created_by)
    returning id into _id;
    update public.invoices set fin_entry_id = _id where id = new.id;
  else
    update public.fin_entries set amount = coalesce(new.paid_amount, new.amount - new.partial_paid), due_date = new.due_date, description = new.description,
      status = case when new.status = 'pago' then 'pago' when new.status = 'cancelado' then 'cancelado' else 'pendente' end,
      paid_at = _paid, updated_at = now()
    where id = new.fin_entry_id;
  end if;
  return null;
end $function$;

-- Item 3: pagamento parcial. Entra no Caixa o que foi recebido e a fatura segue aberta com o saldo ("Parcial: falta R$ X").
create or replace function public.invoice_add_partial(_id uuid, _value numeric, _day date, _how text)
returns numeric language plpgsql security definer set search_path = '' as $function$
declare _i public.invoices; _cat uuid; _n int; _left numeric;
begin
  select * into _i from public.invoices where id = _id for update;
  if _i.id is null or _i.status not in ('pendente', 'vencido') then raise exception 'A fatura não está em aberto' using errcode = 'PF012'; end if;
  _left := round(_i.amount - _i.partial_paid - _value, 2);
  if _value is null or _value <= 0 or _left <= 0 then raise exception 'Valor parcial inválido' using errcode = '22023'; end if;
  select count(*) + 1 into _n from public.fin_entries where external_id like 'invpart:' || _id || ':%';
  select category_id into _cat from public.fin_entries where id = _i.fin_entry_id;
  insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, client_id, source, external_id, notes, created_by)
  values (_i.unit, 'entrada', _cat, left('Parcial · ' || _i.description, 200), _value, coalesce(_day, (now() at time zone 'America/Sao_Paulo')::date),
    coalesce(_day, (now() at time zone 'America/Sao_Paulo')::date), 'pago', _i.client_id, 'contrato', 'invpart:' || _id || ':' || _n,
    'Pagamento parcial (' || coalesce(_how, 'manual') || '). Falta ' || public.brl(_left) || ' na fatura.', (select auth.uid()));
  update public.invoices set partial_paid = partial_paid + _value, updated_at = now() where id = _id;
  update public.fin_entries set amount = _left, updated_at = now() where id = _i.fin_entry_id;
  insert into public.billing_events (invoice_id, kind, detail) values (_id, 'pago_parcial', public.brl(_value) || ' recebido · falta ' || public.brl(_left));
  return _left;
end $function$;

create or replace function public.invoice_set_paid(_id uuid, _paid_at date default null, _amount numeric default null)
returns void language plpgsql security definer set search_path = '' as $function$
declare _ids uuid[] := public.invoice_group_ids(_id); _due numeric; _day date := coalesce(_paid_at, (now() at time zone 'America/Sao_Paulo')::date);
begin
  if _ids is null or exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _amount is not null and _amount <= 0 then raise exception 'Informe o valor recebido' using errcode = '22023'; end if;
  select coalesce(sum(amount - partial_paid), 0) into _due from public.invoices where id = any(_ids) and status in ('pendente', 'vencido');
  if _amount is not null and _due > 0 and _amount < _due - 0.009 then
    if cardinality(_ids) > 1 then
      raise exception 'Cobrança junta: para receber só uma parte, separe as faturas primeiro' using errcode = 'PF012';
    end if;
    perform public.invoice_add_partial(_id, _amount, _day, 'baixa manual');
    return;
  end if;
  update public.invoices set status = 'pago', paid_at = (_day::text || ' 12:00:00-03')::timestamptz,
    paid_amount = case when cardinality(_ids) = 1 then coalesce(_amount, amount - partial_paid) else amount - partial_paid end, updated_at = now()
  where id = any(_ids);
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_manual', 'pago ' || coalesce(_paid_at::text, 'hoje');
end $function$;

-- Itens 3, 9 e 30: baixa pelo Asaas. Cancelada e depois paga: fica paga, sem pedido de cancelar no Asaas, e o admin é avisado.
create or replace function public.invoice_paid_by_gateway(_gateway text, _gateway_id text, _value numeric, _paid_on date)
returns uuid language plpgsql security definer set search_path = '' as $function$
declare _first uuid; _client uuid; _tot numeric; _n int; _was_cancel uuid[]; _left numeric;
begin
  select sum(amount - partial_paid), count(*) into _tot, _n from public.invoices where gateway = _gateway and gateway_id = _gateway_id and status <> 'pago';
  if coalesce(_n, 0) = 0 then
    return (select id from public.invoices where gateway = _gateway and gateway_id = _gateway_id order by id limit 1);
  end if;
  select id, client_id into _first, _client from public.invoices where gateway = _gateway and gateway_id = _gateway_id order by id limit 1;
  -- Fatura sozinha paga com valor menor: parcial, a fatura segue aberta com o saldo.
  if _n = 1 and _value is not null and _value < _tot - 0.009
     and exists (select 1 from public.invoices where id = _first and status in ('pendente', 'vencido')) then
    _left := public.invoice_add_partial(_first, _value, _paid_on, 'Asaas');
    perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
      'Pagamento menor que a fatura', (select name from public.clients where id = _client) || ': recebido ' || public.brl(_value) || ', falta ' || public.brl(_left),
      '/financeiro/cobranca?fatura=' || _first, _client);
    return _first;
  end if;
  _was_cancel := array(select id from public.invoices where gateway = _gateway and gateway_id = _gateway_id and status = 'cancelado');
  perform set_config('pf.gateway_paid', '1', true);
  update public.invoices set status = 'pago', paid_at = coalesce(public.brt_noon(_paid_on), now()),
    paid_amount = case when _n = 1 then coalesce(_value, amount - partial_paid) else round((amount - partial_paid) * coalesce(_value, _tot) / _tot, 2) end,
    gateway_close = null, gateway_close_error = null, updated_at = now()
  where gateway = _gateway and gateway_id = _gateway_id and status <> 'pago';
  perform set_config('pf.gateway_paid', '', true);
  insert into public.billing_events (invoice_id, kind, detail) select id, 'pago_gateway', _gateway_id from public.invoices where gateway = _gateway and gateway_id = _gateway_id;
  if cardinality(_was_cancel) > 0 then
    insert into public.billing_events (invoice_id, kind, detail) select unnest(_was_cancel), 'pago_depois_de_cancelado', 'O cliente pagou no Asaas uma cobrança que tinha sido cancelada';
    perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
      'Pagou uma cobrança cancelada', (select name from public.clients where id = _client) || ' pagou ' || public.brl(coalesce(_value, _tot)) || ' de uma cobrança cancelada. Confira se precisa devolver ou abater.',
      '/financeiro/cobranca?fatura=' || _first, _client);
  end if;
  perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
    'Pagamento recebido', (select name from public.clients where id = _client) || ': ' || public.brl(coalesce(_value, _tot)), '/financeiro/cobranca?fatura=' || _first, _client);
  return _first;
end $function$;

create or replace function public.invoice_paid_matched(_inv uuid, _ref text, _paid_on date, _value numeric, _how text)
returns boolean language plpgsql security definer set search_path = '' as $function$
declare _client uuid; _n int; _ids uuid[];
begin
  _ids := public.invoice_group_ids(_inv);
  if _ids is null or exists (select 1 from public.invoices where id = any(_ids) and (status not in ('pendente', 'vencido') or paid_ref is not null)) then
    return false;
  end if;
  perform set_config('pf.gateway_paid', '1', true);
  update public.invoices set status = 'pago', paid_at = coalesce(public.brt_noon(_paid_on), now()),
    paid_amount = case when cardinality(_ids) = 1 then coalesce(_value, amount - partial_paid) else amount - partial_paid end,
    paid_ref = case when id = _inv then _ref else _ref || '#' || id end, updated_at = now(),
    gateway_close = case when gateway_id is not null and gateway_closed_at is null then 'cancel' else gateway_close end
  where id = any(_ids);
  get diagnostics _n = row_count;
  perform set_config('pf.gateway_paid', '', true);
  if _n = 0 then return false; end if;
  select client_id into _client from public.invoices where id = _inv;
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'pago_conciliado', _how || ': ' || _ref;
  perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_paid',
    'Pagamento recebido', (select name from public.clients where id = _client) || ': ' || public.brl(_value) || ' (' || _how || ')', '/financeiro/cobranca?fatura=' || _inv, _client);
  return true;
end $function$;

-- Item 5: pagamento até 30 dias depois do vencimento (ou 3 antes) casa com a fatura; com mais de uma igual, não escolhe.
create or replace function public.fin_match_open_invoice(_client uuid, _unit text, _amount numeric, _dates date[])
returns uuid language sql stable security definer set search_path = '' as $function$
  with open as (
    select i.* from public.invoices i
    where i.status in ('pendente', 'vencido') and i.paid_ref is null
      and (_client is null or i.client_id = _client)
  ), cand as (
    select o.id, o.due_date from open o where o.group_id is null and (_unit is null or o.unit = _unit) and abs((o.amount - o.partial_paid) - _amount) < 0.01
    union all
    select (array_agg(o.id order by o.id))[1], min(o.due_date) from open o where o.group_id is not null
    group by o.group_id
    having abs(sum(o.amount - o.partial_paid) - _amount) < 0.01 and (_unit is null or bool_or(o.unit = _unit))
       and count(*) = (select count(*) from public.invoices g where g.group_id = o.group_id and g.status <> 'cancelado')
  ), c as (
    select id from cand where exists (select 1 from unnest(_dates) d where d is not null and d - cand.due_date between -3 and 30)
  )
  select case when (select count(*) from c) = 1 then (select id from c) end
$function$;

-- Na dúvida: a fatura mais provável (mesmo valor, vencimento até 10 dias depois ou 90 antes do pagamento).
create or replace function public.fin_guess_open_invoice(_unit text, _amount numeric, _date date)
returns uuid language sql stable security definer set search_path = '' as $function$
  with open as (
    select i.* from public.invoices i where i.status in ('pendente', 'vencido') and i.paid_ref is null
  ), cand as (
    select o.id, o.due_date from open o where o.group_id is null and (_unit is null or o.unit = _unit) and abs((o.amount - o.partial_paid) - _amount) < 0.01
    union all
    select (array_agg(o.id order by o.id))[1], min(o.due_date) from open o where o.group_id is not null
    group by o.group_id
    having abs(sum(o.amount - o.partial_paid) - _amount) < 0.01 and (_unit is null or bool_or(o.unit = _unit))
  )
  select id from cand where _date - due_date between -10 and 90 order by abs(_date - due_date), due_date limit 1
$function$;

-- Itens 4 e 5: extrato do banco casa com conta fixa, lançamento manual e WhatsApp (dá baixa ou marca "conferido no banco"),
-- com a fatura (até 30 dias de atraso) e, na dúvida, fica "A conferir: parece a fatura X de Fulano".
create or replace function public.fin_import(_unit text, _rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  _r jsonb; _amount numeric; _desc text; _date date; _ext text;
  _cat uuid; _rule uuid; _id uuid; _inv uuid; _dup uuid; _same public.fin_entries; _guess uuid; _gi record;
  _added int := 0; _skipped int := 0; _uncat int := 0; _matched int := 0; _paid int := 0; _transfer int := 0; _wam int := 0; _mm int := 0; _review int := 0;
begin
  if not public.can_finance(_unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if jsonb_array_length(coalesce(_rows, '[]')) > 2000 then raise exception 'Extrato grande demais' using errcode = '22023'; end if;
  for _r in select * from jsonb_array_elements(coalesce(_rows, '[]')) loop
    _amount := (_r->>'amount')::numeric;
    _desc := left(coalesce(nullif(trim(_r->>'description'), ''), 'Sem descrição'), 200);
    _date := (_r->>'date')::date;
    _ext := left(_r->>'external_id', 120);
    if _amount is null or _amount = 0 or _date is null or _ext is null then _skipped := _skipped + 1; continue; end if;
    if exists (select 1 from public.fin_entries where unit = _unit and source = 'extrato' and external_id = _ext)
       or exists (select 1 from public.fin_entries where unit = _unit and bank_ref = _ext)
       or exists (select 1 from public.invoices where paid_ref = 'extrato:' || _ext) then
      _skipped := _skipped + 1; continue;
    end if;
    -- Já lançado à mão, pela conta fixa ou pelo WhatsApp (pago pela empresa), mesmo valor e data perto: é o mesmo.
    select e.* into _same from public.fin_entries e
    where e.unit = _unit and e.source in ('manual', 'whatsapp') and e.status in ('pago', 'pendente')
      and e.bank_ref is null and e.paid_by_staff is null and coalesce(e.notes, '') not like '%[extrato %'
      and e.kind = case when _amount > 0 then 'entrada' else 'saida' end
      and abs(e.amount - abs(_amount)) < 0.01 and abs(coalesce(e.paid_at, e.due_date) - _date) <= 3
    order by abs(coalesce(e.paid_at, e.due_date) - _date), (e.status = 'pago') desc,
      extensions.similarity(public.fin_norm(e.description), public.fin_norm(_desc)) desc
    limit 1;
    if _same.id is not null then
      update public.fin_entries set bank_ref = _ext, status = 'pago', paid_at = _date,
        notes = trim(coalesce(notes, '') || ' [extrato ' || _ext || ']'), updated_at = now() where id = _same.id;
      if _same.source = 'whatsapp' then _wam := _wam + 1; else _mm := _mm + 1; end if;
      _same := null; continue;
    end if;
    if _amount > 0 then
      if lower(_desc) ~ 'asaas' then
        insert into public.fin_entries (unit, kind, description, amount, due_date, paid_at, status, source, external_id, notes, created_by)
        values (_unit, 'entrada', _desc, abs(_amount), _date, null, 'cancelado', 'extrato', _ext,
          'Transferência do Asaas para o banco: não é receita nova (o recebimento já entrou pela cobrança).', (select auth.uid()))
        on conflict (unit, source, external_id) where external_id is not null do nothing;
        _transfer := _transfer + 1; continue;
      end if;
      select e.id into _dup from public.fin_entries e
      where e.unit = _unit and e.kind = 'entrada' and e.status = 'pago' and e.source in ('contrato', 'asaas')
        and abs(e.amount - _amount) < 0.01 and abs(e.paid_at - _date) <= 3
        and coalesce(e.notes, '') not like '%[extrato %' and e.bank_ref is null
      order by abs(e.paid_at - _date) limit 1;
      if _dup is not null then
        update public.fin_entries set notes = trim(coalesce(notes, '') || ' [extrato ' || _ext || ']'), bank_ref = coalesce(bank_ref, _ext), updated_at = now() where id = _dup;
        _matched := _matched + 1; _dup := null; continue;
      end if;
      _inv := public.fin_match_open_invoice(null, _unit, _amount, array[_date]);
      if _inv is not null and public.invoice_paid_matched(_inv, 'extrato:' || _ext, _date, _amount, 'extrato do banco') then
        update public.fin_entries set notes = trim(coalesce(notes, '') || ' [extrato ' || _ext || ']'), bank_ref = coalesce(bank_ref, _ext), updated_at = now()
        where id = (select fin_entry_id from public.invoices where id = _inv);
        _paid := _paid + 1; _inv := null; continue;
      end if;
      _inv := null;
      _guess := public.fin_guess_open_invoice(_unit, _amount, _date);
    end if;
    select r.id, r.category_id into _rule, _cat from public.fin_rules r
      join public.fin_categories c on c.id = r.category_id
      where r.unit = _unit and c.kind = case when _amount > 0 then 'entrada' else 'saida' end
        and position(r.match in lower(_desc)) > 0
      order by length(r.match) desc limit 1;
    if _guess is not null then
      select i.description, i.due_date, c.name client into _gi from public.invoices i join public.clients c on c.id = i.client_id where i.id = _guess;
      insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, source, external_id, created_by,
        review_status, suggest_invoice, client_id, notes)
      values (_unit, 'entrada', _cat, _desc, abs(_amount), _date, _date, 'pago', 'extrato', _ext, (select auth.uid()),
        'a_revisar', _guess, (select client_id from public.invoices where id = _guess),
        left('A conferir: parece a fatura "' || _gi.description || '" de ' || trim(_gi.client) || ' (vence ' || to_char(_gi.due_date, 'DD/MM') || ').', 500))
      on conflict (unit, source, external_id) where external_id is not null do nothing
      returning id into _id;
      if _id is null then _skipped := _skipped + 1; else _review := _review + 1; end if;
      _id := null; _cat := null; _rule := null; _guess := null;
      continue;
    end if;
    insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, source, external_id, created_by)
    values (_unit, case when _amount > 0 then 'entrada' else 'saida' end, _cat, _desc, abs(_amount), _date, _date, 'pago', 'extrato', _ext, (select auth.uid()))
    on conflict (unit, source, external_id) where external_id is not null do nothing
    returning id into _id;
    if _id is null then _skipped := _skipped + 1;
    else
      _added := _added + 1;
      if _cat is null then _uncat := _uncat + 1; else update public.fin_rules set hits = hits + 1 where id = _rule; end if;
    end if;
    _id := null; _cat := null; _rule := null;
  end loop;
  return jsonb_build_object('added', _added, 'skipped', _skipped, 'uncategorized', _uncat,
    'matched', _matched, 'invoices_paid', _paid, 'transfers', _transfer, 'whatsapp_matched', _wam, 'manual_matched', _mm, 'to_review', _review);
end $function$;

-- "É essa": o pagamento do extrato vira a baixa da fatura sugerida (ou de outra escolhida). Nada em dobro.
create or replace function public.fin_entry_invoice_confirm(_entry uuid, _invoice uuid default null)
returns void language plpgsql security definer set search_path = '' as $function$
declare _e public.fin_entries; _inv uuid; _i public.invoices; _ref text;
begin
  select * into _e from public.fin_entries where id = _entry for update;
  if _e.id is null or not public.can_finance(_e.unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  _inv := coalesce(_invoice, _e.suggest_invoice);
  select * into _i from public.invoices where id = _inv;
  if _i.id is null or not public.can_finance(_i.unit) then raise exception 'Fatura não encontrada' using errcode = 'PF004'; end if;
  if _e.kind <> 'entrada' or _e.status <> 'pago' then raise exception 'Só dá para ligar uma entrada já recebida' using errcode = 'PF013'; end if;
  _ref := coalesce(case when _e.source = 'extrato' then 'extrato:' || _e.external_id end, 'caixa:' || _e.id);
  if _i.group_id is null and _i.status in ('pendente', 'vencido') and _e.amount < _i.amount - _i.partial_paid - 0.009 then
    perform public.invoice_add_partial(_i.id, _e.amount, _e.paid_at, 'conferido no Caixa');
  elsif not public.invoice_paid_matched(_i.id, _ref, _e.paid_at, _e.amount, 'conferido no Caixa') then
    raise exception 'A fatura não está mais em aberto' using errcode = 'PF012';
  end if;
  update public.fin_entries set bank_ref = coalesce(bank_ref, _e.external_id), updated_at = now(),
    notes = trim(coalesce(notes, '') || case when _e.source = 'extrato' then ' [extrato ' || _e.external_id || ']' else '' end)
  where id = _i.fin_entry_id and _e.source = 'extrato';
  update public.fin_entries set status = 'cancelado', paid_at = null, review_status = 'confirmado', suggest_invoice = null, updated_at = now(),
    notes = left(trim(coalesce(notes, '') || ' Virou o pagamento da fatura "' || _i.description || '".'), 1000)
  where id = _entry;
end $function$;

-- "Não é": vira entrada normal no Caixa.
create or replace function public.fin_entry_review_dismiss(_entry uuid)
returns void language plpgsql security definer set search_path = '' as $function$
begin
  if not exists (select 1 from public.fin_entries where id = _entry and public.can_finance(unit)) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.fin_entries set review_status = 'confirmado', suggest_invoice = null, updated_at = now(),
    notes = left(trim(coalesce(notes, '') || ' Conferido: não é de uma fatura.'), 1000)
  where id = _entry and review_status = 'a_revisar' and suggest_invoice is not null;
end $function$;

-- O "A conferir" ainda não conta como receita no resumo do mês.
do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.fin_month_summary'::regproc);
  if position('suggest_invoice' in _src) = 0 then
    _src := replace(_src, $x$where f.unit = _unit and public.can_finance(_unit) and f.status <> 'cancelado'$x$,
      $x$where f.unit = _unit and public.can_finance(_unit) and f.status <> 'cancelado' and not (f.review_status = 'a_revisar' and f.suggest_invoice is not null)$x$);
    execute _src;
  end if;
end $do$;

-- Item 6: mudar o dia de cobrança nunca joga a fatura para o passado (este mês fica como está; vale a partir do próximo).
create or replace function public.client_contract_billing_day_sync()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare _g uuid; _today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if new.billing_day is distinct from old.billing_day and new.billing_day between 1 and 31 then
    with x as (
      select i.id, i.due_date old_due, date_trunc('month', i.due_date)::date
        + (least(new.billing_day, extract(day from (date_trunc('month', i.due_date) + interval '1 month - 1 day'))::int) - 1) new_due
      from public.invoices i
      where i.client_id = new.client_id and i.source = 'mensalidade' and i.status = 'pendente'
        and i.gateway_id is null and i.payment_url is null and i.due_date >= _today
    ), moved as (
      update public.invoices i set due_date = x.new_due, updated_at = now()
      from x where i.id = x.id and x.new_due >= _today and x.new_due <> x.old_due
      returning i.id, x.old_due, x.new_due
    )
    insert into public.billing_events (invoice_id, kind, detail)
    select id, 'vencimento', 'Dia de cobrança novo: ' || to_char(old_due, 'DD/MM') || ' → ' || to_char(new_due, 'DD/MM') from moved;
    for _g in select distinct group_id from public.invoices where client_id = new.client_id and group_id is not null and gateway_id is null and status in ('pendente', 'vencido') loop
      begin
        perform public.invoice_group_build(new.client_id, array(select id from public.invoices where group_id = _g), false);
      exception when others then null;
      end;
    end loop;
  end if;
  return new;
end $function$;

-- Item 7: juntar automático só a mesma empresa e vencimentos até 5 dias de diferença (vale o mais cedo, registrado na fatura).
create or replace function public.invoice_group_auto()
returns integer language plpgsql security definer set search_path = '' as $function$
declare _r record; _n int := 0;
begin
  if not coalesce((select merge_monthly from public.billing_settings where id), false) then return 0; end if;
  for _r in
    select i.client_id, array_agg(i.id) ids
    from public.invoices i
    where i.status in ('pendente', 'vencido') and i.gateway_id is null and i.payment_url is null and not i.no_merge
      and i.source in ('mensalidade', 'avulso', 'manual') and coalesce(i.ref, '') not like 'atraso:%'
      and i.due_date >= (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month')::date
    group by i.client_id, i.unit, date_trunc('month', i.due_date)
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
  if position('mesma empresa' in _src) = 0 then
    _src := replace(_src, $x$  if _n < 2 then raise exception 'Escolha pelo menos duas faturas' using errcode = 'PF007'; end if;$x$,
      $x$  if _n < 2 then raise exception 'Escolha pelo menos duas faturas' using errcode = 'PF007'; end if;
  if _auto and (select count(distinct unit) from public.invoices where id = any(_ids)) > 1 then
    raise exception 'Juntar automático: só faturas da mesma empresa' using errcode = 'PF007';
  end if;$x$);
    _src := replace(_src, $x$  select coalesce(max(due_date) filter (where source = 'mensalidade'), max(due_date)) into _due from public.invoices where id = any(_ids);$x$,
      $x$  if _auto then
    select min(due_date) into _due from public.invoices where id = any(_ids);
  else
    select coalesce(max(due_date) filter (where source = 'mensalidade'), max(due_date)) into _due from public.invoices where id = any(_ids);
  end if;$x$);
    _src := replace(_src, $x$  update public.invoices set group_id = _g, due_date = _due, no_merge = false, updated_at = now()$x$,
      $x$  -- Vencimento mudou ao juntar: fica registrado na fatura (a Cobrança mostra).
  insert into public.billing_events (invoice_id, kind, detail)
  select id, 'vencimento', 'Juntada: ' || to_char(due_date, 'DD/MM') || ' → ' || to_char(_due, 'DD/MM') from public.invoices where id = any(_ids) and due_date <> _due;
  update public.invoices set group_id = _g, due_date = _due, no_merge = false, updated_at = now()$x$);
    if position('mesma empresa' in _src) = 0 or position('Juntada: ' in _src) = 0 or position('min(due_date)' in _src) = 0 then
      raise exception 'invoice_group_build: texto esperado não encontrado';
    end if;
    execute _src;
  end if;
end $do$;

-- Cobrança junta vai para o Asaas na empresa certa (Ellcazo sozinha = Ellcazo) e com o saldo em aberto.
create or replace function public.billing_gateway_queue(_limit integer default 20)
returns setof jsonb language sql stable security definer set search_path = '' as $function$
  with cfg as (select coalesce((select s.auto_charge from public.billing_settings s where s.id), false) auto, (now() at time zone 'America/Sao_Paulo')::date today),
  items as (
    select i.id, i.amount - i.partial_paid amount, i.due_date, i.description, i.unit, i.client_id
    from public.invoices i, cfg
    where i.group_id is null and i.status = 'pendente' and i.gateway_id is null
      and (i.gateway_error is null or i.updated_at < now() - interval '6 hours')
      and (_limit >= 500 or (cfg.auto and i.due_date <= cfg.today + 5))
    union all
    select g.id, sum(i.amount - i.partial_paid), g.due_date, g.description, case when count(distinct i.unit) = 1 then min(i.unit) else 'peformake' end, g.client_id
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
$function$;

-- Item 8: desconto maior que a fatura não trava: desconta até o valor (a fatura zerada é cancelada) e a sobra fica para a próxima.
create or replace function public.delivery_credit_apply(_credit uuid)
returns boolean language plpgsql security definer set search_path = '' as $function$
declare _c public.delivery_credits; _i public.invoices; _use numeric; _rest numeric;
begin
  select * into _c from public.delivery_credits where id = _credit and status = 'aprovado' for update;
  if _c.id is null or coalesce(_c.discount, 0) <= 0 then return false; end if;
  select i.* into _i from public.invoices i
  where i.client_id = _c.client_id and i.unit = _c.unit and i.source = 'mensalidade' and i.status in ('pendente', 'vencido')
    and i.payment_url is null and i.gateway_id is null and i.partial_paid = 0 and coalesce(i.ref, '') not like 'atraso:%'
  order by i.due_date limit 1;
  if _i.id is null then return false; end if;
  _use := least(_c.discount, _i.amount);
  _rest := round(_c.discount - _use, 2);
  insert into public.invoice_items (invoice_id, client_id, unit, month, description, quantity, unit_price, discount, amount, state)
  values (_i.id, _c.client_id, _c.unit, date_trunc('month', _i.due_date)::date,
    left('Desconto: ' || trim(to_char(_c.qty, 'FM9990.##')) || ' ' || coalesce(_c.measure, 'entregas') || ' de ' || _c.service || ' não entregues em ' || to_char(_c.month, 'MM/YYYY'), 200),
    1, -_use, 0, -_use, public.invoice_item_state(_i.status, _i.payment_url));
  if _use >= _i.amount - 0.009 then
    -- Desconto cobre a fatura inteira: nada a cobrar neste mês.
    if _i.group_id is not null then
      update public.invoices set group_id = null, updated_at = now() where id = _i.id;
      perform public.invoice_group_tidy(_i.group_id);
    end if;
    update public.invoices set status = 'cancelado', updated_at = now() where id = _i.id;
    insert into public.billing_events (invoice_id, kind, detail) values (_i.id, 'coberta_desconto', 'Fatura inteira coberta pelo desconto de entregas');
  else
    update public.invoices set amount = round(amount - _use, 2), updated_at = now() where id = _i.id;
  end if;
  if _rest > 0 then
    update public.delivery_credits set discount = _rest, invoice_id = _i.id where id = _c.id;
  else
    update public.delivery_credits set status = 'aplicado', invoice_id = _i.id where id = _c.id;
  end if;
  insert into public.billing_events (invoice_id, kind, detail) values (_i.id, 'desconto_entrega',
    _c.service || ' ' || to_char(_c.month, 'MM/YYYY') || ': ' || _use || case when _rest > 0 then ' (sobra ' || _rest || ' para a próxima)' else '' end);
  return true;
end $function$;

create or replace function public.delivery_credits_apply_pending()
returns integer language plpgsql security definer set search_path = '' as $function$
declare _id uuid; _n int := 0; _guard int := 0;
begin
  for _id in select id from public.delivery_credits where status = 'aprovado' order by decided_at loop
    begin
      -- A sobra de um desconto grande pode cobrir mais de uma fatura.
      _guard := 0;
      while _guard < 6 and public.delivery_credit_apply(_id) loop
        _n := _n + 1; _guard := _guard + 1;
        exit when not exists (select 1 from public.delivery_credits where id = _id and status = 'aprovado');
      end loop;
    exception when others then
      raise warning 'delivery_credit_apply %: %', _id, sqlerrm;
    end;
  end loop;
  return _n;
end $function$;

-- Itens 10 e 11: mensalidade só com dia de cobrança e data de início (1ª no mês seguinte ao início, sem proporcional);
-- preço mudou e a fatura do mês ainda não tem link: atualiza itens e valor.
create or replace function public.invoice_generate_month(_month date)
returns integer language plpgsql security definer set search_path = '' as $function$
declare
  _m date := date_trunc('month', _month)::date;
  _n integer := 0;
  _c record; _u record; _x record;
  _day int; _inv uuid; _old public.invoices; _sum numeric;
begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  for _c in
    select c.id, c.name, ct.billing_day from public.clients c
    join public.client_contracts ct on ct.client_id = c.id
    where c.is_active and not c.is_lost and coalesce(c.client_type, 'recurring') <> 'one-off'
      and ct.billing_day between 1 and 31 and ct.start_date is not null
      and date_trunc('month', ct.start_date)::date < _m
      and (ct.end_date is null or ct.end_date >= _m)
  loop
    _day := least(_c.billing_day, extract(day from (_m + interval '1 month' - interval '1 day'))::int);
    for _u in
      select x.unit, sum(x.amount) amount, string_agg(x.name, ', ' order by x.name) items
      from public.client_month_items(_c.id) x group by x.unit
    loop
      if coalesce(_u.amount, 0) <= 0 then continue; end if;
      select * into _old from public.invoices where client_id = _c.id and source = 'mensalidade' and ref = to_char(_m, 'YYYY-MM') || ':' || _u.unit;
      if _old.id is null then
        _inv := null;
        insert into public.invoices (client_id, unit, description, amount, due_date, source, ref)
        values (_c.id, _u.unit, left('Mensalidade ' || to_char(_m, 'MM/YYYY') || ' · ' || _u.items, 200), _u.amount, _m + (_day - 1), 'mensalidade', to_char(_m, 'YYYY-MM') || ':' || _u.unit)
        on conflict (client_id, source, ref) do nothing
        returning id into _inv;
        if _inv is not null then
          insert into public.invoice_items (invoice_id, client_id, client_service_id, service_id, unit, month, description, quantity, unit_price, discount, amount, state)
          select _inv, _c.id, x.client_service_id, x.service_id, x.unit, _m, x.name, x.quantity, x.unit_price, x.discount, x.amount, 'confirmado'
          from public.client_month_items(_c.id) x
          where x.unit = _u.unit
            and not exists (select 1 from public.invoice_items ii where ii.client_service_id = x.client_service_id and ii.month = _m and ii.state <> 'cancelado');
          _n := _n + 1;
        end if;
      elsif _old.status = 'pendente' and _old.gateway_id is null and _old.payment_url is null and _old.partial_paid = 0
         and not exists (select 1 from public.billing_events be where be.invoice_id = _old.id and be.kind = 'valor_manual')
         and not exists (select 1 from public.invoices g where _old.group_id is not null and g.group_id = _old.group_id and (g.gateway_id is not null or g.payment_url is not null)) then
        -- Preço, quantidade ou serviço mudou depois de gerar: a fatura ainda sem link acompanha.
        for _x in select * from public.client_month_items(_c.id) x where x.unit = _u.unit loop
          update public.invoice_items set quantity = _x.quantity, unit_price = _x.unit_price, discount = _x.discount, amount = _x.amount, description = _x.name
          where invoice_id = _old.id and client_service_id = _x.client_service_id
            and (quantity, unit_price, discount, amount) is distinct from (_x.quantity, _x.unit_price, _x.discount, _x.amount);
          if not exists (select 1 from public.invoice_items where invoice_id = _old.id and client_service_id = _x.client_service_id) then
            insert into public.invoice_items (invoice_id, client_id, client_service_id, service_id, unit, month, description, quantity, unit_price, discount, amount, state)
            values (_old.id, _c.id, _x.client_service_id, _x.service_id, _x.unit, _m, _x.name, _x.quantity, _x.unit_price, _x.discount, _x.amount, 'confirmado');
          end if;
        end loop;
        -- Serviço que saiu do contrato: o item fica zerado (histórico), sem cobrar.
        update public.invoice_items ii set quantity = 0, unit_price = 0, discount = 0, amount = 0, description = left('Saiu do contrato: ' || ii.description, 200)
        where ii.invoice_id = _old.id and ii.client_service_id is not null and ii.amount <> 0
          and not exists (select 1 from public.client_month_items(_c.id) x where x.client_service_id = ii.client_service_id and x.unit = _u.unit);
        select round(sum(amount), 2) into _sum from public.invoice_items where invoice_id = _old.id;
        if _sum > 0 and abs(_sum - _old.amount) >= 0.01 then
          update public.invoices set amount = _sum, description = left('Mensalidade ' || to_char(_m, 'MM/YYYY') || ' · ' || _u.items, 200), updated_at = now() where id = _old.id;
          insert into public.billing_events (invoice_id, kind, detail) values (_old.id, 'valor_atualizado', public.brl(_old.amount) || ' → ' || public.brl(_sum));
        end if;
      end if;
      _old := null;
    end loop;
  end loop;
  perform public.invoice_group_auto();
  return _n;
end $function$;

-- Valor mudado à mão na Cobrança fica registrado (a atualização automática da mensalidade respeita).
do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.invoice_save'::regproc);
  if position('valor_manual' in _src) = 0 then
    _src := replace(_src, $x$  if not found then raise exception 'Fatura ja enviada ao gateway ou paga' using errcode = 'PF006'; end if;
  return _id;$x$, $x$  if not found then raise exception 'Fatura ja enviada ao gateway ou paga' using errcode = 'PF006'; end if;
  insert into public.billing_events (invoice_id, kind, detail) values (_id, 'valor_manual', (_data->>'amount'));
  return _id;$x$);
    if position('valor_manual' in _src) = 0 then raise exception 'invoice_save: texto esperado não encontrado'; end if;
    execute _src;
  end if;
end $do$;

-- Item 12: lançamento que veio de fatura não muda a data pelo Caixa (muda pela Cobrança).
create or replace function public.fin_entry_save(_id uuid, _data jsonb)
returns uuid language plpgsql security definer set search_path = '' as $function$
declare
  _unit text := _data->>'unit';
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  _paid date := nullif(_data->>'paid_at', '')::date;
  _status text := coalesce(nullif(_data->>'status', ''), case when _paid is null then 'pendente' else 'pago' end);
  _new uuid;
  _old public.fin_entries;
begin
  if not public.can_finance(_unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _id is not null then
    select * into _old from public.fin_entries e where e.id = _id and public.can_finance(e.unit);
    if _old.id is null then raise exception 'Lancamento nao encontrado' using errcode = 'PF004'; end if;
    if coalesce(_old.external_id, '') like 'inv:%' and (
         _unit is distinct from _old.unit or (_data->>'kind') is distinct from _old.kind
         or (_data->>'amount')::numeric is distinct from _old.amount
         or (nullif(_data->>'due_date', '') is not null and nullif(_data->>'due_date', '')::date is distinct from _old.due_date)) then
      raise exception 'Este lancamento vem de uma fatura: mude valor, data e empresa pela Cobranca' using errcode = 'PF010';
    end if;
  end if;
  if _status <> 'pago' then _paid := null; elsif _paid is null then _paid := _today; end if;

  if _id is null then
    insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, client_id, notes, created_by)
    values (_unit, _data->>'kind', nullif(_data->>'category_id', '')::uuid, trim(_data->>'description'), (_data->>'amount')::numeric,
      coalesce(nullif(_data->>'due_date', '')::date, _today), _paid, _status, nullif(_data->>'client_id', '')::uuid, nullif(_data->>'notes', ''), (select auth.uid()))
    returning id into _new;
    return _new;
  end if;

  update public.fin_entries set unit = _unit, kind = _data->>'kind', category_id = nullif(_data->>'category_id', '')::uuid,
    description = trim(_data->>'description'), amount = (_data->>'amount')::numeric,
    due_date = coalesce(nullif(_data->>'due_date', '')::date, due_date), paid_at = _paid, status = _status,
    client_id = case when _data ? 'client_id' then nullif(_data->>'client_id', '')::uuid else client_id end,
    notes = case when _data ? 'notes' then nullif(_data->>'notes', '') else notes end, updated_at = now()
  where id = _id;
  return _id;
end;
$function$;

-- Item 13: membro não ganha mais que o cliente paga (só o admin confirma de propósito).
do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.service_job_save'::regproc);
  if position('PF014' in _src) = 0 then
    _src := replace(_src, $x$  select name into _client_name from public.clients where id = _client;$x$,
      $x$  if _client_amount > 0 and _staff_amount > _client_amount
     and not (coalesce((_data->>'confirm_over')::boolean, false) and public.has_role('admin')) then
    raise exception 'O membro receberia mais do que o cliente paga' using errcode = 'PF014';
  end if;
  select name into _client_name from public.clients where id = _client;$x$);
    execute _src;
  end if;
end $do$;

-- Item 14: cliente desfez o pagamento e o membro já recebeu: o admin é avisado.
create or replace function public.service_job_on_invoice()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare _j record; _st text;
begin
  if new.source <> 'avulso' or coalesce(new.ref, '') not like 'job:%' or new.status is not distinct from old.status then return null; end if;
  for _j in select * from public.service_jobs where invoice_id = new.id loop
    if new.status = 'pago' then
      perform public.service_job_release(_j.id, (coalesce(new.paid_at, now()) at time zone 'America/Sao_Paulo')::date);
    elsif old.status = 'pago' and _j.payable_id is not null then
      update public.fin_entries set status = 'cancelado', paid_at = null, updated_at = now(),
        notes = coalesce(notes || ' ', '') || 'Cancelado: o pagamento do cliente foi desfeito.'
      where id = _j.payable_id and status = 'pendente';
      if found then
        update public.service_jobs set payable_id = null where id = _j.id;
      else
        select status into _st from public.fin_entries where id = _j.payable_id;
        if _st = 'pago' then
          perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_late',
            'Pagamento desfeito, mas o membro já recebeu', (select name from public.clients where id = new.client_id) || ': ' || _j.title
              || '. O repasse ao membro já foi pago; combine o acerto.', '/financeiro/cobranca?fatura=' || new.id, new.client_id);
          insert into public.billing_events (invoice_id, kind, detail) values (new.id, 'repasse_ja_pago', _j.title);
        end if;
      end if;
    end if;
  end loop;
  return null;
end $function$;

-- Itens 23 e 30: lembrete ao cliente só com a chave "Lembretes" ligada; aviso interno e "vencido" seguem (outra linha na central);
-- avisos abrem a fatura exata; valor é o saldo em aberto.
create or replace function public.billing_reminders_run()
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  _i record; _d int; _msg text; _sent int := 0; _alerts int := 0; _stops int := 0;
  _client_on boolean := coalesce((select reminders_enabled from public.billing_settings where id), false);
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  for _i in
    select (array_agg(i.id order by i.id))[1] as id, array_agg(i.id) as ids, (array_agg(i.client_id))[1] as client_id, max(c.name) as client_name,
      coalesce(max(g.description), max(i.description)) as description, sum(i.amount - i.partial_paid) as amount, max(i.due_date) as due_date,
      coalesce(max(i.payment_url), public.pay_url((array_agg(i.pay_token order by i.id))[1])) as payment_url, bool_and(i.status = 'pendente') as all_pending
    from public.invoices i join public.clients c on c.id = i.client_id left join public.invoice_groups g on g.id = i.group_id
    where i.status in ('pendente', 'vencido') and i.due_date between _today - 7 and _today + 1
    group by coalesce(i.group_id, i.id)
  loop
    _d := _today - _i.due_date;
    if _d in (-1, 0, 1) then
      if not _client_on then continue; end if;
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
        'Cobrança atrasada há 3 dias', _i.client_name || ': ' || _i.description, '/financeiro/cobranca?fatura=' || _i.id, _i.client_id);
      insert into public.billing_events (invoice_id, kind) values (_i.id, 'alerta_gestor');
      _alerts := _alerts + 1;
    elsif _d >= 7 and _i.all_pending then
      update public.invoices set status = 'vencido', updated_at = now() where id = any(_i.ids);
      perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_stop',
        'Cobrança parou: falar com o cliente', _i.client_name || ' está com ' || _i.description || ' atrasado há 7 dias. A régua parou e agora é conversa humana.',
        '/financeiro/cobranca?fatura=' || _i.id, _i.client_id);
      insert into public.billing_events (invoice_id, kind) values (_i.id, 'parou_d7');
      _stops := _stops + 1;
    end if;
  end loop;
  return jsonb_build_object('lembretes', _sent, 'alertas', _alerts, 'paradas', _stops, 'lembretes_ligados', _client_on);
end $function$;

-- Ninguém de fora chama as funções internas novas.
revoke execute on function public.invoice_clear_match(uuid[]) from public, anon, authenticated;
revoke execute on function public.invoice_add_partial(uuid, numeric, date, text) from public, anon, authenticated;
revoke execute on function public.fin_guess_open_invoice(text, numeric, date) from public, anon, authenticated;
revoke execute on function public.invoice_open_amount(public.invoices) from public, anon;
revoke execute on function public.fin_entry_invoice_confirm(uuid, uuid) from public, anon;
revoke execute on function public.fin_entry_review_dismiss(uuid) from public, anon;
grant execute on function public.fin_entry_invoice_confirm(uuid, uuid) to authenticated;
grant execute on function public.fin_entry_review_dismiss(uuid) to authenticated;
grant execute on function public.invoice_clear_match(uuid[]), public.invoice_add_partial(uuid, numeric, date, text), public.fin_guess_open_invoice(text, numeric, date) to service_role;

-- ===== migrations/20261110200100_clientes_permissoes.sql =====
-- Correções do relatório (itens 15 a 23, 31 e 32): dados de cliente protegidos e permissões das rotinas.

-- Item 15: cliente com fatura ou lançamento no Caixa não é excluído (a tela oferece "Perdido").
create or replace function public.client_delete(_client_id uuid, _confirm_name text)
returns void language plpgsql security definer set search_path = '' as $function$
declare _name text;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select name into _name from public.clients where id = _client_id for update;
  if not found then raise exception 'Cliente nao encontrado' using errcode = 'PF004'; end if;
  if lower(trim(_name)) <> lower(trim(coalesce(_confirm_name, ''))) then raise exception 'Nome nao confere' using errcode = 'PF010'; end if;
  if exists (select 1 from public.invoices where client_id = _client_id)
     or exists (select 1 from public.fin_entries where client_id = _client_id and status <> 'cancelado') then
    raise exception 'Este cliente tem histórico financeiro: marque como Perdido em vez de excluir' using errcode = 'PF015';
  end if;
  delete from public.clients where id = _client_id;
end $function$;

-- Item 16: cliente e contato principal gravados juntos (se um falhar, nada é gravado e a tela mostra o erro).
create or replace function public.client_create(_data jsonb, _contact jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $function$
declare _id uuid;
begin
  _id := public.client_save(null, null, _data);
  if _contact is not null and (coalesce(_contact->>'phone', '') <> '' or coalesce(_contact->>'email', '') <> '') then
    perform public.client_contact_save(null, _id, _contact);
  end if;
  return _id;
end $function$;
revoke execute on function public.client_create(jsonb, jsonb) from public, anon;
grant execute on function public.client_create(jsonb, jsonb) to authenticated;

-- Item 17: ao marcar como perdido, a tela pergunta e cancela as faturas em aberto daqui para frente.
create or replace function public.client_cancel_open_invoices(_client uuid)
returns integer language plpgsql security definer set search_path = '' as $function$
declare _ids uuid[]; _g uuid; _n int;
begin
  _ids := array(select id from public.invoices where client_id = _client and status in ('pendente', 'vencido')
    and due_date >= (now() at time zone 'America/Sao_Paulo')::date and coalesce(ref, '') not like 'atraso:%');
  if exists (select 1 from public.invoices where id = any(_ids) and not public.can_finance(unit)) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if coalesce(cardinality(_ids), 0) = 0 then return 0; end if;
  update public.invoices set status = 'cancelado', updated_at = now() where id = any(_ids);
  get diagnostics _n = row_count;
  insert into public.billing_events (invoice_id, kind, detail) select unnest(_ids), 'status_manual', 'cancelado: cliente perdido';
  for _g in select distinct group_id from public.invoices where id = any(_ids) and group_id is not null loop
    perform public.invoice_group_tidy(_g);
  end loop;
  return _n;
end $function$;
revoke execute on function public.client_cancel_open_invoices(uuid) from public, anon;
grant execute on function public.client_cancel_open_invoices(uuid) to authenticated;

-- Item 22: só o administrador muda dia de cobrança e datas do contrato (os outros campos seguem como antes).
do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.client_save(uuid, timestamp with time zone, jsonb)'::regprocedure);
  if position('PF011' in _src) = 0 then
    _src := replace(_src, $x$  if exists (
    select 1 from public.clients
    where lower(trim(name)) = lower(_name) and id is distinct from _id and not is_lost
  ) then$x$, $x$  if not public.has_role('admin') then
    if exists (select 1 from public.client_contracts ct where ct.client_id = _id
        and (ct.billing_day, ct.start_date, ct.end_date, ct.months) is distinct from (_billing, _start, _end, _months))
       or (_id is null and (_billing is not null or _start is not null or _end is not null or _months is not null))
       or (_id is not null and not exists (select 1 from public.client_contracts ct where ct.client_id = _id)
           and (_billing is not null or _start is not null or _end is not null or _months is not null)) then
      raise exception 'Só o administrador muda dia de cobrança e datas do contrato' using errcode = 'PF011';
    end if;
  end if;

  if exists (
    select 1 from public.clients
    where lower(trim(name)) = lower(_name) and id is distinct from _id and not is_lost
  ) then$x$);
    if position('PF011' in _src) = 0 then raise exception 'client_save: texto esperado não encontrado'; end if;
    execute _src;
  end if;
end $do$;

-- Itens 21 e 32: valor da dívida só para administrador; atraso contado no horário de Brasília.
do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.client_intel'::regproc);
  if position('America/Sao_Paulo' in _src) = 0 then
    _src := replace(_src, 'current_date', '(now() at time zone ''America/Sao_Paulo'')::date');
    _src := replace(_src, $x$'devendo_valor', (select coalesce(sum(iv.amount), 0)$x$,
      $x$'devendo_valor', case when session_user <> 'authenticator' or public.has_role('admin') then (select coalesce(sum(iv.amount - iv.partial_paid), 0)$x$);
    _src := replace(_src, $x$and iv.due_date < (now() at time zone 'America/Sao_Paulo')::date)),$x$,
      $x$and iv.due_date < (now() at time zone 'America/Sao_Paulo')::date) end),$x$);
    if position('has_role(''admin'') then (select coalesce' in _src) = 0 then raise exception 'client_intel: texto esperado não encontrado'; end if;
    execute _src;
  end if;
end $do$;

do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.contract_reminders_run'::regproc);
  if position('America/Sao_Paulo' in _src) = 0 then
    _src := replace(_src, 'current_date', '(now() at time zone ''America/Sao_Paulo'')::date');
    execute _src;
  end if;
end $do$;

-- Item 20: contas fixas só pela rotina ou por quem cuida do financeiro.
do $do$
declare _src text;
begin
  _src := pg_get_functiondef('public.fin_recurring_generate'::regproc);
  if position('42501' in _src) = 0 then
    _src := replace(_src, $x$begin
  _last := $x$, $x$begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  _last := $x$);
    execute _src;
  end if;
end $do$;

-- Itens 18, 19 e 20: rotinas internas e do WhatsApp sem acesso de fora (só gatilho, rotina ou serviço).
revoke execute on function public.fin_wa_command(uuid, text, numeric) from public, anon, authenticated;
revoke execute on function public.fin_wa_undo(uuid) from public, anon, authenticated;
revoke execute on function public.fin_wa_reply(uuid, text) from public, anon, authenticated;
revoke execute on function public.fin_wa_process(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.fin_wa_link_pending() from public, anon, authenticated;
revoke execute on function public.contract_reminders_run() from public, anon, authenticated;
revoke execute on function public.fin_recurring_generate(date) from public, anon, authenticated;
grant execute on function public.fin_wa_command(uuid, text, numeric), public.fin_wa_undo(uuid), public.fin_wa_reply(uuid, text),
  public.fin_wa_process(uuid, boolean), public.fin_wa_link_pending(), public.contract_reminders_run(), public.fin_recurring_generate(date) to service_role;
-- Funções do financeiro que gravam: nunca pela chave pública (sem login).
revoke execute on function public.invoice_set_paid(uuid, date, numeric) from public, anon;
revoke execute on function public.invoice_undo_paid(uuid) from public, anon;
revoke execute on function public.fin_recurring_save(uuid, jsonb) from public, anon;
revoke execute on function public.delivery_credit_decide(uuid, text, numeric) from public, anon;
grant execute on function public.invoice_set_paid(uuid, date, numeric), public.invoice_undo_paid(uuid), public.fin_recurring_save(uuid, jsonb),
  public.delivery_credit_decide(uuid, text, numeric) to authenticated;

-- Item 31: um motivo de perda só.
update public.clients set lost_reason = 'Fim de contrato' where lost_reason = 'Fim do contrato';

-- ===== migrations/20261110200200_quem_recebe_repasse.sql =====
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

-- ===== migrations/20261110200300_autoteste_semanal.sql =====
-- Autoteste SOB DEMANDA sem IA (roda quando o Italo pedir: select public.selftest_run();). Sem agendamento. Cada cenário roda numa subtransação que se desfaz
-- (raise 'selftest_rollback'): só o resultado fica gravado em selftest_runs. Nenhum serviço externo é chamado.

create table if not exists public.selftest_runs (
  id bigint generated always as identity primary key,
  run_id uuid not null,
  ran_at timestamptz not null default now(),
  scenario text not null,
  ok boolean not null,
  detail text,
  ms integer
);
create index if not exists selftest_runs_ran_idx on public.selftest_runs (ran_at desc);
alter table public.selftest_runs enable row level security;
create policy selftest_runs_admin_read on public.selftest_runs for select to authenticated using (public.has_role('admin'));

create or replace function public.selftest_fail(_msg text) returns void language plpgsql set search_path = '' as $$
begin raise exception 'FALHOU: %', _msg; end $$;

-- Cliente e fatura de teste (sempre dentro da subtransação que se desfaz).
create or replace function public.selftest_client(_name text, _receiver text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare _id uuid := gen_random_uuid();
begin
  insert into public.clients (id, name, source, synced_at, is_active, is_lost, legacy_created_at, billing_receiver)
  values (_id, 'SELFTEST ' || _name || ' ' || left(_id::text, 6), 'app', now(), true, false, now(), _receiver);
  insert into public.client_contracts (client_id, contract_type, billing_day, start_date) values (_id, 'recurring', 30, current_date - 90);
  return _id;
end $$;

create or replace function public.selftest_invoice(_client uuid, _unit text, _amount numeric, _due date, _source text default 'manual') returns uuid
language plpgsql security definer set search_path = '' as $$
declare _id uuid;
begin
  insert into public.invoices (client_id, unit, description, amount, due_date, source, ref)
  values (_client, _unit, 'SELFTEST fatura ' || _amount, _amount, _due, _source, 'selftest:' || gen_random_uuid())
  returning id into _id;
  return _id;
end $$;

create or replace function public.selftest_case(_n text)
returns void language plpgsql security definer set search_path = '' as $function$
declare
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  _c uuid; _c2 uuid; _a uuid; _b uuid; _e uuid; _r jsonb; _txt text; _n2 int; _v numeric;
begin
  perform set_config('pf.selftest', '1', true);
  perform set_config('request.jwt.claims', json_build_object('sub', (select user_id from public.user_roles where role = 'admin' limit 1), 'role', 'authenticated')::text, true);
  update public.billing_settings set merge_monthly = false, reminders_enabled = false where id;

  if _n = '01_desfazer_pagamento_concilia_de_novo' then
    _c := public.selftest_client('desfazer'); _a := public.selftest_invoice(_c, 'peformake', 777.71, _today);
    perform public.invoice_paid_matched(_a, 'extrato:ST-A', _today, 777.71, 'teste');
    perform public.invoice_undo_paid(_a);
    if (select paid_ref from public.invoices where id = _a) is not null then perform public.selftest_fail('paid_ref ficou depois de desfazer'); end if;
    _r := public.fin_import('peformake', jsonb_build_array(jsonb_build_object('amount', 777.71, 'date', _today, 'description', 'PIX SELFTEST', 'external_id', 'ST-B')));
    if (select status from public.invoices where id = _a) <> 'pago' then perform public.selftest_fail('novo pagamento não casou: ' || _r::text); end if;

  elsif _n = '02_caixa_desfaz_cobranca_junta_inteira' then
    _c := public.selftest_client('junta'); _a := public.selftest_invoice(_c, 'peformake', 1000, _today + 10); _b := public.selftest_invoice(_c, 'ellcazo', 500, _today + 10);
    perform public.invoice_group_build(_c, array[_a, _b], false);
    update public.fin_entries set status = 'pago', paid_at = _today where id = (select fin_entry_id from public.invoices where id = _a);
    if (select count(*) from public.invoices where id in (_a, _b) and status = 'pago') <> 2 then perform public.selftest_fail('baixa do grupo pelo Caixa não quitou as duas'); end if;
    update public.fin_entries set status = 'pendente', paid_at = null where id = (select fin_entry_id from public.invoices where id = _a);
    if exists (select 1 from public.invoices where id in (_a, _b) and status = 'pago') then perform public.selftest_fail('desfazer pelo Caixa deixou parte paga'); end if;
    if (select status from public.fin_entries where id = (select fin_entry_id from public.invoices where id = _b)) <> 'pendente' then perform public.selftest_fail('Caixa da Ellcazo ficou pago'); end if;

  elsif _n = '03_pagamento_parcial_deixa_saldo' then
    _c := public.selftest_client('parcial'); _a := public.selftest_invoice(_c, 'peformake', 777.77, _today);
    perform public.invoice_set_paid(_a, _today, 400);
    if (select status from public.invoices where id = _a) not in ('pendente', 'vencido') then perform public.selftest_fail('parcial quitou a fatura'); end if;
    if (select amount from public.fin_entries where id = (select fin_entry_id from public.invoices where id = _a)) <> 377.77 then perform public.selftest_fail('saldo no Caixa errado'); end if;
    perform public.invoice_set_paid(_a, _today, null);
    select sum(amount) into _v from public.fin_entries where client_id = _c and kind = 'entrada' and status = 'pago';
    if _v <> 777.77 then perform public.selftest_fail('total recebido ' || _v || ' em vez de 777,77'); end if;

  elsif _n = '04_extrato_nao_duplica_conta_fixa_e_manual' then
    insert into public.fin_entries (unit, kind, description, amount, due_date, status, source, external_id)
    values ('peformake', 'saida', 'SELFTEST aluguel', 1234.56, _today, 'pendente', 'manual', 'rec:selftest:' || _today) returning id into _e;
    perform public.fin_import('peformake', jsonb_build_array(jsonb_build_object('amount', -1234.56, 'date', _today, 'description', 'PAGAMENTO ALUGUEL', 'external_id', 'ST-C')));
    if (select status from public.fin_entries where id = _e) <> 'pago' then perform public.selftest_fail('conta fixa não recebeu a baixa'); end if;
    if exists (select 1 from public.fin_entries where source = 'extrato' and external_id = 'ST-C') then perform public.selftest_fail('extrato criou saída repetida'); end if;
    insert into public.fin_entries (unit, kind, description, amount, due_date, paid_at, status, source)
    values ('peformake', 'entrada', 'SELFTEST manual', 250.53, _today, _today, 'pago', 'manual') returning id into _e;
    perform public.fin_import('peformake', jsonb_build_array(jsonb_build_object('amount', 250.53, 'date', _today, 'description', 'PIX RECEBIDO', 'external_id', 'ST-D')));
    if exists (select 1 from public.fin_entries where source = 'extrato' and external_id = 'ST-D') then perform public.selftest_fail('extrato criou entrada repetida'); end if;

  elsif _n = '05_pagamento_atrasado_casa_e_duvida_fica_a_conferir' then
    _c := public.selftest_client('atrasado'); _a := public.selftest_invoice(_c, 'peformake', 333.37, _today - 6);
    perform public.fin_import('peformake', jsonb_build_array(jsonb_build_object('amount', 333.37, 'date', _today, 'description', 'PIX', 'external_id', 'ST-E')));
    if (select status from public.invoices where id = _a) <> 'pago' then perform public.selftest_fail('pagamento 6 dias depois não casou'); end if;
    _c := public.selftest_client('duvida1'); _c2 := public.selftest_client('duvida2');
    _a := public.selftest_invoice(_c, 'peformake', 444.47, _today); _b := public.selftest_invoice(_c2, 'peformake', 444.47, _today);
    perform public.fin_import('peformake', jsonb_build_array(jsonb_build_object('amount', 444.47, 'date', _today, 'description', 'PIX', 'external_id', 'ST-F')));
    if exists (select 1 from public.invoices where id in (_a, _b) and status = 'pago') then perform public.selftest_fail('escolheu sozinho entre duas faturas iguais'); end if;
    select id into _e from public.fin_entries where source = 'extrato' and external_id = 'ST-F';
    if (select review_status from public.fin_entries where id = _e) is distinct from 'a_revisar' then perform public.selftest_fail('dúvida não ficou "A conferir"'); end if;
    perform public.fin_entry_invoice_confirm(_e, null);
    if (select count(*) from public.invoices where id in (_a, _b) and status = 'pago') <> 1 then perform public.selftest_fail('"É essa" não deu baixa'); end if;
    if (select status from public.fin_entries where id = _e) <> 'cancelado' then perform public.selftest_fail('"É essa" deixou a entrada em dobro'); end if;

  elsif _n = '06_dia_de_cobranca_nao_vai_para_o_passado' then
    if extract(day from _today) = 1 then return; end if;
    _c := public.selftest_client('dia');
    _a := public.selftest_invoice(_c, 'peformake', 99.91, (date_trunc('month', _today) + interval '1 month - 1 day')::date, 'mensalidade');
    update public.client_contracts set billing_day = 1 where client_id = _c;
    if (select due_date from public.invoices where id = _a) < _today then perform public.selftest_fail('vencimento foi para o passado'); end if;

  elsif _n = '07_juntar_so_mesma_empresa' then
    update public.billing_settings set merge_monthly = true where id;
    _c := public.selftest_client('juntar');
    _a := public.selftest_invoice(_c, 'peformake', 100, _today + 20); _b := public.selftest_invoice(_c, 'ellcazo', 50, _today + 20);
    perform public.invoice_group_auto();
    if exists (select 1 from public.invoices where id in (_a, _b) and group_id is not null) then perform public.selftest_fail('juntou Peformake com Ellcazo'); end if;
    _b := public.selftest_invoice(_c, 'peformake', 60, _today + 22);
    perform public.invoice_group_auto();
    if (select count(distinct group_id) from public.invoices where id in (_a, _b) and group_id is not null) <> 1 then perform public.selftest_fail('não juntou duas da Peformake'); end if;
    if (select due_date from public.invoices where id = _b) <> _today + 20 then perform public.selftest_fail('vencimento não foi o mais cedo'); end if;

  elsif _n = '08_quem_recebe_tudo_gera_repasse' then
    update public.billing_settings set merge_monthly = true where id;
    _c := public.selftest_client('recebe', 'peformake');
    _a := public.selftest_invoice(_c, 'peformake', 100, _today + 20); _b := public.selftest_invoice(_c, 'ellcazo', 50, _today + 20);
    perform public.invoice_group_auto();
    if (select count(distinct group_id) from public.invoices where id in (_a, _b) and group_id is not null) <> 1 then perform public.selftest_fail('não juntou as duas empresas com "Peformake recebe tudo"'); end if;
    perform public.invoice_set_paid(_a, _today, null);
    if (select coalesce(sum(amount), 0) from public.interco_transfers where invoice_id = _b and status = 'pendente' and to_unit = 'ellcazo') <> 50 then perform public.selftest_fail('repasse para a Ellcazo não nasceu'); end if;
    perform public.invoice_undo_paid(_a);
    if exists (select 1 from public.interco_transfers where invoice_id = _b and status = 'pendente') then perform public.selftest_fail('desfazer não cancelou o repasse'); end if;

  elsif _n = '09_desconto_maior_que_a_fatura' then
    _c := public.selftest_client('desconto'); _a := public.selftest_invoice(_c, 'peformake', 777.77, _today + 10, 'mensalidade');
    insert into public.delivery_credits (client_id, unit, service, month, qty, status, discount) values (_c, 'peformake', 'SELFTEST', date_trunc('month', _today)::date, 1, 'aprovado', 900) returning id into _e;
    if not public.delivery_credit_apply(_e) then perform public.selftest_fail('desconto não entrou'); end if;
    if (select status from public.invoices where id = _a) <> 'cancelado' then perform public.selftest_fail('fatura coberta pelo desconto não foi zerada'); end if;
    if (select discount from public.delivery_credits where id = _e) <> 122.23 then perform public.selftest_fail('sobra do desconto errada'); end if;

  elsif _n = '10_cancelada_e_paga_no_asaas' then
    _c := public.selftest_client('cancelada'); _a := public.selftest_invoice(_c, 'peformake', 88.81, _today);
    update public.invoices set gateway = 'asaas', gateway_id = 'SELFTEST-' || _a, status = 'cancelado' where id = _a;
    perform public.invoice_paid_by_gateway('asaas', 'SELFTEST-' || _a, 88.81, _today);
    if (select status || coalesce(gateway_close, '') from public.invoices where id = _a) <> 'pago' then perform public.selftest_fail('ficou com pedido de cancelar no Asaas'); end if;

  elsif _n = '11_caixa_nao_muda_data_de_fatura' then
    _c := public.selftest_client('data'); _a := public.selftest_invoice(_c, 'peformake', 55.51, _today + 5);
    select fin_entry_id into _e from public.invoices where id = _a;
    begin
      perform public.fin_entry_save(_e, jsonb_build_object('unit', 'peformake', 'kind', 'entrada', 'amount', 55.51, 'description', 'x', 'due_date', _today + 30, 'status', 'pendente'));
      perform public.selftest_fail('Caixa mudou a data de uma fatura');
    exception when sqlstate 'PF010' then null;
    end;

  elsif _n = '12_permissoes_sem_login' then
    select string_agg(f, ', ') into _txt from unnest(array[
      'public.fin_wa_process(uuid,boolean)', 'public.fin_wa_command(uuid,text,numeric)', 'public.fin_wa_undo(uuid)', 'public.fin_wa_reply(uuid,text)',
      'public.fin_wa_link_pending()', 'public.contract_reminders_run()', 'public.fin_recurring_generate(date)', 'public.invoice_set_paid(uuid,date,numeric)',
      'public.invoice_undo_paid(uuid)', 'public.fin_entry_save(uuid,jsonb)', 'public.fin_import(text,jsonb)', 'public.invoice_generate_month(date)']) f
    where has_function_privilege('anon', f, 'execute');
    if _txt is not null then perform public.selftest_fail('sem login pode chamar: ' || _txt); end if;
    select string_agg(f, ', ') into _txt from unnest(array['public.fin_wa_process(uuid,boolean)', 'public.contract_reminders_run()', 'public.fin_recurring_generate(date)']) f
    where has_function_privilege('authenticated', f, 'execute');
    if _txt is not null then perform public.selftest_fail('qualquer logado pode chamar: ' || _txt); end if;

  elsif _n = '13_atrasados_manuais_intactos' then
    if exists (select 1 from public.invoices where ref like 'atraso:%' and (group_id is not null or gateway_id is not null or not no_merge)) then
      perform public.selftest_fail('fatura de atraso foi juntada ou mandada ao Asaas');
    end if;

  elsif _n = '14_dados_conferem' then
    select count(*) into _n2 from public.invoices where paid_ref is not null and status <> 'pago';
    if _n2 > 0 then perform public.selftest_fail(_n2 || ' fatura(s) não paga(s) com marca de conciliação'); end if;
    select count(*) into _n2 from public.invoices i join public.fin_entries e on e.id = i.fin_entry_id
      where (i.status = 'pago') <> (e.status = 'pago') or (i.status = 'cancelado') <> (e.status = 'cancelado');
    if _n2 > 0 then perform public.selftest_fail(_n2 || ' fatura(s) com status diferente do Caixa'); end if;
    select count(*) into _n2 from public.invoices i where i.source = 'mensalidade' and i.status <> 'cancelado'
      and abs(coalesce((select sum(amount) from public.invoice_items ii where ii.invoice_id = i.id), 0) - i.amount) >= 0.01
      and not exists (select 1 from public.billing_events be where be.invoice_id = i.id and be.kind = 'valor_manual');
    if _n2 > 0 then perform public.selftest_fail(_n2 || ' mensalidade(s) com soma dos itens diferente do valor'); end if;

  elsif _n = '15_desempenho_mes' then
    _v := extract(epoch from clock_timestamp());
    perform public.invoice_generate_month(_today);
    if extract(epoch from clock_timestamp()) - _v > 2 then perform public.selftest_fail('gerar o mês levou mais de 2 s'); end if;
  else
    perform public.selftest_fail('cenário desconhecido');
  end if;
end $function$;

create or replace function public.selftest_run()
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare _run uuid := gen_random_uuid(); _s text; _t0 timestamptz; _ok boolean; _detail text; _fail int := 0; _total int := 0;
begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  foreach _s in array array['01_desfazer_pagamento_concilia_de_novo', '02_caixa_desfaz_cobranca_junta_inteira', '03_pagamento_parcial_deixa_saldo',
    '04_extrato_nao_duplica_conta_fixa_e_manual', '05_pagamento_atrasado_casa_e_duvida_fica_a_conferir', '06_dia_de_cobranca_nao_vai_para_o_passado',
    '07_juntar_so_mesma_empresa', '08_quem_recebe_tudo_gera_repasse', '09_desconto_maior_que_a_fatura', '10_cancelada_e_paga_no_asaas',
    '11_caixa_nao_muda_data_de_fatura', '12_permissoes_sem_login', '13_atrasados_manuais_intactos', '14_dados_conferem', '15_desempenho_mes'] loop
    _t0 := clock_timestamp(); _ok := false; _detail := null;
    begin
      perform public.selftest_case(_s);
      raise exception 'selftest_rollback';
    exception when others then
      if sqlerrm = 'selftest_rollback' then _ok := true;
      elsif sqlerrm like 'FALHOU:%' then _detail := substring(sqlerrm from 9);
      else _detail := 'erro: ' || sqlerrm; end if;
    end;
    insert into public.selftest_runs (run_id, scenario, ok, detail, ms) values (_run, _s, _ok, left(_detail, 500), (extract(epoch from clock_timestamp() - _t0) * 1000)::int);
    _total := _total + 1; if not _ok then _fail := _fail + 1; end if;
  end loop;
  if _fail > 0 then
    perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'selftest_fail',
      'Autoteste: ' || _fail || ' de ' || _total || ' falharam', 'Veja em Configurações → Automações → Autoteste.', '/configuracoes/automacoes', null);
  end if;
  return jsonb_build_object('run_id', _run, 'total', _total, 'falhas', _fail);
end $function$;

create or replace function public.selftest_last()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.has_role('admin') then (
    select jsonb_build_object('ran_at', max(r.ran_at), 'total', count(*), 'ok', count(*) filter (where r.ok),
      'falhas', coalesce(jsonb_agg(jsonb_build_object('scenario', r.scenario, 'detail', r.detail)) filter (where not r.ok), '[]'::jsonb))
    from public.selftest_runs r where r.run_id = (select run_id from public.selftest_runs order by ran_at desc limit 1)) end
$$;

revoke execute on function public.selftest_run(), public.selftest_case(text), public.selftest_client(text, text),
  public.selftest_invoice(uuid, text, numeric, date, text), public.selftest_fail(text) from public, anon, authenticated;
grant execute on function public.selftest_run() to service_role;
revoke execute on function public.selftest_last() from public, anon;
grant execute on function public.selftest_last() to authenticated;

-- Sem agendamento (decisão do Italo, 10/11): roda só sob demanda. Se existir um agendamento antigo, desliga.
do $$ begin
  if exists (select 1 from cron.job where jobname = 'selftest-weekly') then perform cron.unschedule('selftest-weekly'); end if;
end $$;

-- ===== migrations/20261110200400_automacoes_fieis.sql =====
-- Central de Automações fiel ao que roda (item 6 do escopo e itens 11 e 23 do relatório).

update public.automation_catalog set
  how = 'Roda todo dia e cria a fatura uma vez por mês. Cliente novo: só com dia de cobrança e data de início, e a 1ª sai no mês seguinte ao início (sem proporcional). Se o preço mudou e a fatura ainda não tem link nem pagamento parcial (e ninguém mudou o valor à mão), atualiza itens e valor.'
where key = 'fin_mensalidade';

update public.automation_catalog set cron_job = 'billing-gateway', schedule = 'A cada hora, aos 20 min',
  what = 'Gera o boleto/Pix das faturas que vencem nos próximos 5 dias e fecha no Asaas o que foi cancelado ou pago por fora.',
  how = 'Cliente sem CPF/CNPJ não recebe cobrança: a fatura fica com erro até completar o cadastro. A cobrança sai da conta de quem recebe; Ellcazo fica manual (Cora) até ligar o Asaas dela.'
where key = 'fin_cobranca';

update public.automation_catalog set cron_job = 'billing-asaas-sync', schedule = 'Todo dia, 07:00', flag_table = null, flag_column = null,
  what = 'Confere no Asaas quem pagou nos últimos 5 dias e dá baixa (o aviso do Asaas também dá baixa na hora).'
where key = 'fin_baixa';

update public.automation_catalog set
  what = 'Manda ao cliente o lembrete um dia antes, no dia e um dia depois do vencimento.',
  how = 'Desligado: nenhum lembrete vai para o cliente. O aviso interno de atraso continua (linha "Atraso: aviso à equipe").'
where key = 'fin_lembretes';

update public.automation_catalog set
  what = 'Junta as faturas do mesmo cliente no mês numa cobrança só: só da mesma empresa e com vencimentos até 5 dias de diferença (vale o mais cedo, registrado na fatura). Com "Quem recebe" escolhido no cliente, junta as duas empresas na conta de quem recebe.',
  how = 'Separar à mão em Cobrança impede de juntar de novo. Faturas de atraso lançadas à mão nunca são juntadas.'
where key = 'fin_juntar';

update public.automation_catalog set
  how = 'Desligado e substituído pelo "Repasse entre empresas". Move dinheiro: só ligue com a chave Pix e a porcentagem certas.'
where key = 'fin_conferencia';

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job, flag_table, flag_column) values
  ('fin_atraso', 'financeiro', 6, 'Atraso: aviso à equipe', 'Avisa a equipe com 3 dias de atraso e marca "vencido" com 7 dias (a régua para e vira conversa humana).',
    'Interno, nada vai para o cliente.', 'Todo dia, 09:00', false, 'baixo', 'billing-reminders', null, null),
  ('fin_descontos', 'financeiro', 21, 'Aplicar descontos aprovados', 'Coloca na próxima fatura em aberto os descontos de entrega que o admin aprovou. Desconto maior que a fatura zera a fatura e a sobra vai para a seguinte.',
    'Só o que o admin aprovou em Cobrança → Para revisar.', 'Todo dia, 09:20', false, 'medio', 'delivery-credits-apply', null, null),
  ('fin_repasse', 'financeiro', 22, 'Repasse entre empresas', 'Quando uma empresa recebe a parte da outra ("Quem recebe" no cliente), anota "a repassar R$ X" no Caixa e avisa só se passar de 7 dias.',
    'Nada sai sozinho: o repasse é marcado como feito com 1 toque. Pix automático só com a chave ligada e o OK do admin.', 'Na hora do pagamento; aviso todo dia, 08:50', false, 'medio', 'interco-overdue', 'billing_settings', 'interco_pix_enabled'),
  ('cfg_autoteste', 'configuracoes', 90, 'Autoteste (sob demanda)', 'Testa as regras de cobrança, Caixa, extrato e permissões com dados de teste que se desfazem sozinhos. Só o resultado fica guardado.',
    'Sem IA e sem serviço externo (custo zero). Falhou algo: um aviso normal para o admin.', 'Sob demanda (quando o Italo pedir)', false, 'baixo', null, null, null)
on conflict (key) do update set title = excluded.title, what = excluded.what, how = excluded.how, schedule = excluded.schedule, cron_job = excluded.cron_job,
  flag_table = excluded.flag_table, flag_column = excluded.flag_column;
