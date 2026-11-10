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
