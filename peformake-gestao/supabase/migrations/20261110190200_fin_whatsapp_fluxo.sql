-- Financeiro pelo WhatsApp (parte 3): caminho da mensagem, atribuição, nada em dobro, comandos e resposta no grupo.
-- Tudo em SQL, sem IA: custo zero por lançamento.

-- Cliente citado no texto: nome, apelido (clients.aliases) ou o primeiro nome quando é único; aceita erro de digitação leve.
create or replace function public.fin_wa_match_client(_norm text) returns jsonb
language sql stable set search_path = '' as $$
  with base as (
    select c.id, c.name, public.fin_client_key(c.name) k, c.aliases from public.clients c
    where c.is_active or not coalesce(c.is_lost, false)
  ), firsts as (
    select split_part(k, ' ', 1) f from base group by 1 having count(*) = 1
  ), keys as (
    select id, name, k as key, 'nome' as how from base where length(k) >= 3
    union all
    select b.id, b.name, public.fin_client_key(a), 'apelido' from base b, unnest(b.aliases) a where length(public.fin_client_key(a)) >= 2
    union all
    select b.id, b.name, split_part(b.k, ' ', 1), 'nome' from base b join firsts f on f.f = split_part(b.k, ' ', 1)
    where length(split_part(b.k, ' ', 1)) >= 6 and b.k like '% %'
  ), hits as (
    select id, name, how, key, 100 + length(key) as score from keys
    where position(' ' || key || ' ' in ' ' || coalesce(_norm, '') || ' ') > 0
    union all
    select id, name, how || ' parecido', key, (extensions.word_similarity(key, coalesce(_norm, '')) * 100)::int from keys
    where length(key) >= 5 and extensions.word_similarity(key, coalesce(_norm, '')) >= 0.8
  )
  select jsonb_build_object('id', id, 'name', trim(name), 'how', how, 'key', key, 'score', score) from hits order by score desc, length(key) desc limit 1
$$;

-- Resposta curta no grupo (mensagem interna da equipe). Só com as duas chaves ligadas: geral e do canal.
create or replace function public.fin_wa_reply(_inbox uuid, _text text) returns void
language plpgsql security definer set search_path = '' as $$
declare _i public.fin_inbox; _ok boolean;
begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _i from public.fin_inbox where id = _inbox;
  select s.reply_enabled and c.reply into _ok from public.fin_wa_settings s, public.fin_wa_channels c where s.id and c.id = _i.channel_id;
  if not coalesce(_ok, false) or _i.chat_jid is null then return; end if;
  -- Canal de cliente nunca recebe resposta automática.
  if exists (select 1 from public.wa_groups g where g.chat_jid = _i.chat_jid and g.client_id is not null) then return; end if;
  insert into public.notification_outbox (kind, client_id, to_jid, message, dedupe_key)
  values ('fin_wa_reply', null, _i.chat_jid, left(_text, 900), 'finwa:' || _i.id || ':' || left(md5(_text), 10))
  on conflict (dedupe_key) do nothing;
end $$;

-- Desfaz o que a mensagem lançou (usado por "cancela", Descartar e "outro").
create or replace function public.fin_wa_undo(_inbox uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare _i public.fin_inbox; _e public.fin_entries;
begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _i from public.fin_inbox where id = _inbox;
  if _i.entry_id is null then return; end if;
  select * into _e from public.fin_entries where id = _i.entry_id;
  if _e.id is null then return; end if;
  if _i.state = 'repetido' then
    update public.fin_entries set confirmations = coalesce((select jsonb_agg(c) from jsonb_array_elements(confirmations) c where c->>'inbox' is distinct from _inbox::text), '[]'::jsonb), updated_at = now()
    where id = _e.id;
  elsif _i.parsed->>'matched' = 'recorrente' then
    update public.fin_entries set status = 'pendente', paid_at = null, amount = coalesce((_i.parsed->>'prev_amount')::numeric, amount),
      review_status = null, attribution = null, confidence = null, updated_at = now(),
      confirmations = coalesce((select jsonb_agg(c) from jsonb_array_elements(confirmations) c where c->>'inbox' is distinct from _inbox::text), '[]'::jsonb)
    where id = _e.id;
  elsif _e.source = 'whatsapp' and _e.external_id like 'wa:' || _i.wa_message_id || '%' then
    update public.fin_entries set status = 'cancelado', paid_at = null, review_status = null, staff_id = null, updated_at = now(),
      notes = trim(coalesce(notes, '') || ' · Cancelado pela revisão do WhatsApp.')
    where id = _e.id;
  end if;
end $$;

-- Lê uma mensagem da caixa de entrada e lança (ou deixa para revisar). _force_new: "é outro gasto", não junta com o repetido.
create or replace function public.fin_wa_process(_id uuid, _force_new boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare
  _i public.fin_inbox; _ch public.fin_wa_channels; _s public.fin_wa_settings; _st public.staff_members;
  _p jsonb; _amount numeric; _kind text; _date date; _unit text; _cl jsonb; _client uuid; _client_name text;
  _av_id uuid; _av_title text; _av_date date; _job_id uuid; _job_title text; _job_date date; _job_unit text;
  _cat uuid; _cat_name text; _rule_match text; _reasons text[] := '{}'; _conf int := 40;
  _limit numeric; _high boolean; _pocket boolean; _dup public.fin_entries; _rec public.fin_entries; _inv uuid; _inv_desc text;
  _entry uuid; _desc text; _ref text; _who text; _orig text; _norm text; _due date; _paid date; _status text; _sum text;
begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _i from public.fin_inbox where id = _id for update;
  if _i.id is null then return null; end if;
  if _i.state not in ('nao_entendi', 'aguardando_audio', 'repetido') then return _i.state; end if;
  select * into _ch from public.fin_wa_channels where id = _i.channel_id;
  select * into _s from public.fin_wa_settings where id;
  select * into _st from public.staff_members where id = _i.staff_id;
  _who := coalesce(nullif(split_part(trim(_st.full_name), ' ', 1), ''), _i.sender_name, 'alguém');
  _ref := left(_i.id::text, 6);

  if _i.media = 'audio' and coalesce(trim(_i.body), '') = '' then
    update public.fin_inbox set state = 'aguardando_audio', reason = 'Áudio: esperando a transcrição. Pode ouvir e completar aqui.', confidence = 0 where id = _id;
    return 'aguardando_audio';
  end if;

  _p := public.fin_wa_parse(regexp_replace(coalesce(_i.body, ''), '^\[[^\]]*\]\s*', ''), (_i.received_at at time zone 'America/Sao_Paulo')::date);
  if _i.parsed ? 'amount_override' then _p := _p || jsonb_build_object('amount', (_i.parsed->>'amount_override')::numeric, 'amount_override', (_i.parsed->>'amount_override')::numeric, 'money_weight', 3); end if;
  _amount := (_p->>'amount')::numeric; _kind := _p->>'kind'; _date := (_p->>'date')::date; _norm := _p->>'norm';
  _cl := public.fin_wa_match_client(_norm);
  _client := (_cl->>'id')::uuid; _client_name := _cl->>'name';
  _p := _p || jsonb_build_object('client', _cl);

  if _amount is null or _kind is null then
    update public.fin_inbox set state = 'nao_entendi', parsed = _p, confidence = 0, entry_id = null, invoice_id = null,
      reason = case
        when _i.media in ('image', 'document') and _amount is null then 'Comprovante: confira o valor na foto e complete.'
        when _amount is null and jsonb_array_length(_p->'candidates') > 1 then 'Achei mais de um valor: escolha o certo.'
        when _amount is null then 'Não achei o valor.'
        else 'Não deu para saber se é gasto ou entrada.' end
    where id = _id;
    perform public.fin_wa_reply(_id, 'Financeiro: não entendi tudo. Ficou para completar na revisão. Exemplo: "paguei 89,90 canva" ou "recebi 1.200 da Will Motos". ref ' || _ref);
    return 'nao_entendi';
  end if;
  if (_kind = 'saida' and not _ch.accept_saida) or (_kind = 'entrada' and not _ch.accept_entrada) then
    update public.fin_inbox set state = 'descartado', parsed = _p, reason = 'Este canal não aceita ' || case when _kind = 'saida' then 'despesas' else 'entradas' end || '.' where id = _id;
    return 'descartado';
  end if;

  -- Atribuição: cliente citado -> captação/projeto do audiovisual ou serviço avulso do cliente perto da data (±3 dias).
  if _client is not null then
    _reasons := _reasons || ('Cliente ' || _client_name || ' citado' || case when _cl->>'how' like '%parecido' then ' (nome parecido)' when _cl->>'how' = 'apelido' then ' (apelido)' else '' end);
    select p.id, p.title, coalesce((p.shoot_at at time zone 'America/Sao_Paulo')::date, p.due_date) into _av_id, _av_title, _av_date
    from public.av_projects p
    where p.client_id = _client and coalesce((p.shoot_at at time zone 'America/Sao_Paulo')::date, p.due_date) between _date - 3 and _date + 3
    order by abs(coalesce((p.shoot_at at time zone 'America/Sao_Paulo')::date, p.due_date) - _date) limit 1;
    if _av_id is not null then
      _reasons := _reasons || ('captação "' || left(_av_title, 40) || '" de ' || to_char(_av_date, 'DD/MM'));
    else
      select j.id, j.title, j.job_date, j.unit into _job_id, _job_title, _job_date, _job_unit
      from public.service_jobs j
      where j.client_id = _client and j.job_date between _date - 3 and _date + 3 and coalesce(j.status, '') <> 'cancelado'
      order by abs(j.job_date - _date) limit 1;
      if _job_id is not null then _reasons := _reasons || ('serviço avulso "' || left(_job_title, 40) || '" de ' || to_char(_job_date, 'DD/MM')); end if;
    end if;
  elsif _kind = 'saida' then
    _reasons := _reasons || 'Sem cliente citado: despesa geral'::text;
  end if;

  -- Empresa: a palavra na mensagem > o serviço > o padrão do canal > pista ("captação") > Peformake.
  _unit := coalesce(_p->>'unit', case when _av_id is not null then 'ellcazo' end, _job_unit, _ch.default_unit, _p->>'unit_hint', 'peformake');

  -- Categoria: regra aprendida no Caixa (da empresa) > dicionário do leitor.
  select c.id, c.name, r.match into _cat, _cat_name, _rule_match
  from public.fin_rules r join public.fin_categories c on c.id = r.category_id
  where r.unit = _unit and c.kind = _kind and c.is_active and length(trim(r.match)) >= 3
    and (' ' || _norm || ' ') ~ ('\m' || regexp_replace(public.fin_norm(trim(r.match)), '([.$^*+?()\[\]{}|\\])', '\\\1', 'g') || '\M')
  order by length(r.match) desc limit 1;
  if _cat is not null then
    _reasons := _reasons || ('categoria pela regra "' || _rule_match || '"');
  elsif _p->>'category' is not null then
    select c.id, c.name into _cat, _cat_name from public.fin_categories c
    where c.unit = _unit and c.kind = _kind and c.is_active and c.name = _p->>'category' limit 1;
    if _cat is not null then _reasons := _reasons || ('categoria pela palavra "' || (_p->>'keyword') || '"'); end if;
  end if;

  _desc := _p->>'description';
  _limit := coalesce((select high_value from public.fin_wa_people where staff_id = _i.staff_id), _s.high_value, 1000);
  _high := _amount >= _limit;
  _conf := _conf + case when (_p->>'kind_explicit')::boolean then 25 else 10 end
                 + case when (_p->>'money_weight')::int >= 2 then 15 else 5 end
                 + case when _cat is not null then 10 else 0 end
                 + case when _cl->>'how' like '%parecido' then -10 when _client is not null then 10 else 5 end;
  _conf := least(greatest(_conf, 5), 99);

  -- Quem pagou: "do meu bolso" (ou o padrão do canal) vira reembolso para quem lançou, se o reembolso estiver ligado.
  _pocket := _kind = 'saida' and _i.staff_id is not null
    and ((_p->>'pocket')::boolean or (_ch.default_payer = 'quem_lancou' and not (_p->>'company_paid')::boolean));
  if _pocket and not _s.reimburse_enabled then
    _reasons := _reasons || 'disse que pagou do bolso (reembolso desligado: ficou como pago pela empresa)'::text;
    _pocket := false;
  elsif _pocket then
    _reasons := _reasons || ('pago por ' || _who || ': vira reembolso depois da revisão');
  end if;

  -- Entrada de cliente: sugere a fatura em aberto. Nunca dá baixa sozinho.
  if _kind = 'entrada' and not _force_new then
    _inv := public.fin_match_open_invoice(_client, null, _amount, array[_date]);
    if _inv is null and _client is not null then
      select i.id into _inv from public.invoices i
      where i.client_id = _client and i.status in ('pendente', 'vencido') and i.paid_ref is null and i.group_id is null and abs(i.amount - _amount) < 0.01
      order by abs(i.due_date - _date) limit 1;
    end if;
    if _inv is not null then
      select left(i.description, 80) || ' (vence ' || to_char(i.due_date, 'DD/MM') || ')' into _inv_desc from public.invoices i where i.id = _inv;
      update public.fin_inbox set state = 'fatura', invoice_id = _inv, entry_id = null, parsed = _p || jsonb_build_object('unit_final', _unit),
        reason = array_to_string(_reasons || ('fatura em aberto com o mesmo valor: ' || _inv_desc || '. Confirme para dar baixa.'), ' · '),
        confidence = _conf, high_value = _high where id = _id;
      perform public.fin_wa_reply(_id, 'Financeiro: vi a entrada de ' || public.brl(_amount) || coalesce(' de ' || _client_name, '')
        || '. Tem uma fatura em aberto com esse valor: fica para confirmar no sistema (não dei baixa). ref ' || _ref);
      return 'fatura';
    end if;
  end if;

  if not _force_new then
    -- Conta fixa prevista no mês: casa em vez de criar outra.
    select e.* into _rec from public.fin_entries e
    where e.kind = _kind and e.status = 'pendente' and e.external_id like 'rec:%'
      and date_trunc('month', e.due_date) = date_trunc('month', _date)
      and abs(e.amount - _amount) <= greatest(1, e.amount * 0.1)
      and (extensions.similarity(public.fin_norm(e.description), public.fin_norm(_desc)) >= 0.3 or (_cat is not null and e.category_id = _cat))
    order by abs(e.amount - _amount) limit 1;
    if _rec.id is not null then
      update public.fin_entries set status = 'pago', paid_at = _date, amount = _amount, review_status = 'a_revisar', updated_at = now(),
        attribution = array_to_string(_reasons || ('casou com a conta fixa "' || left(_rec.description, 40) || '"'), ' · '), confidence = _conf,
        confirmations = confirmations || jsonb_build_object('by', _who, 'staff_id', _i.staff_id, 'at', now(), 'via', 'whatsapp', 'inbox', _id)
      where id = _rec.id;
      update public.fin_inbox set state = 'lancado', entry_id = _rec.id, parsed = _p || jsonb_build_object('matched', 'recorrente', 'prev_amount', _rec.amount),
        reason = array_to_string(_reasons || ('casou com a conta fixa "' || left(_rec.description, 40) || '"'), ' · '), confidence = _conf, high_value = _high where id = _id;
      perform public.fin_wa_reply(_id, 'Financeiro: anotado ✓ ' || public.brl(_amount) || ' · ' || _rec.description || ' (conta fixa do mês, marcada como paga). Errado? Responda "cancela". ref ' || _ref);
      return 'lancado';
    end if;

    -- Impressão digital: mesmo tipo + mesmo valor + data com até 2 dias + descrição parecida (ou mesma categoria/cliente, ou veio do extrato).
    select e.* into _dup from public.fin_entries e
    where e.kind = _kind and e.status <> 'cancelado' and abs(e.amount - _amount) < 0.01
      and abs(coalesce(e.paid_at, e.due_date) - _date) <= 2
      and (e.unit = _unit or e.source = 'extrato' or extensions.similarity(public.fin_norm(e.description), public.fin_norm(_desc)) >= 0.5)
      and (e.source = 'extrato'
        or extensions.similarity(public.fin_norm(e.description), public.fin_norm(_desc)) >= 0.3
        or (_cat is not null and e.category_id = _cat)
        or (_client is not null and e.client_id = _client))
    order by (e.unit = _unit) desc, abs(coalesce(e.paid_at, e.due_date) - _date), e.created_at limit 1;
    if _dup.id is not null then
      update public.fin_entries set updated_at = now(),
        confirmations = confirmations || jsonb_build_object('by', _who, 'staff_id', _i.staff_id, 'at', now(), 'via', 'whatsapp', 'inbox', _id),
        bank_ref = case when source = 'extrato' and bank_ref is null then external_id else bank_ref end,
        client_id = coalesce(client_id, _client), category_id = coalesce(category_id, case when unit = _unit then _cat end),
        av_project_id = coalesce(av_project_id, _av_id), service_job_id = coalesce(service_job_id, _job_id),
        attribution = coalesce(attribution, nullif(array_to_string(_reasons, ' · '), ''))
      where id = _dup.id;
      select coalesce((select coalesce(nullif(split_part(trim(s.full_name), ' ', 1), ''), x.sender_name) || ' às ' || to_char(x.received_at at time zone 'America/Sao_Paulo', 'HH24"h"MI')
        from public.fin_inbox x left join public.staff_members s on s.id = x.staff_id where x.entry_id = _dup.id and x.state in ('lancado', 'confirmado') and x.id <> _id order by x.received_at limit 1),
        case _dup.source when 'extrato' then 'o extrato do banco' when 'asaas' then 'o Asaas' else 'lançamento no sistema' end) into _sum;
      update public.fin_inbox set state = 'repetido', entry_id = _dup.id, parsed = _p, confidence = _conf, high_value = _high,
        reason = 'Já lançado por ' || _sum || ': ' || left(_dup.description, 60) || ' · ' || public.brl(_dup.amount) where id = _id;
      perform public.fin_wa_reply(_id, 'Financeiro: já estava lançado por ' || _sum || ' (' || public.brl(_dup.amount) || ' · ' || left(_dup.description, 40)
        || '). Marquei como confirmado por você. É outro gasto? Responda esta mensagem com "outro". ref ' || _ref);
      return 'repetido';
    end if;
  end if;

  -- Lançamento novo, "a revisar". Pago pela empresa: saída já realizada. Do bolso: fica em aberto até a revisão virar reembolso.
  _due := case when _pocket then public.team_payday(_date) else _date end;
  _paid := case when _pocket then null else _date end;
  _status := case when _pocket then 'pendente' else 'pago' end;
  insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, paid_at, status, client_id, source, external_id, notes, created_by,
    review_status, attribution, confidence, av_project_id, service_job_id, paid_by_staff)
  values (_unit, _kind, _cat, _desc, _amount, _due, _paid, _status, _client, 'whatsapp',
    'wa:' || _i.wa_message_id || case when _force_new then ':outro' else '' end,
    left('Lançado por ' || _who || ' no WhatsApp: "' || coalesce(_i.body, '') || '"', 500), _st.profile_id,
    'a_revisar', nullif(array_to_string(_reasons, ' · '), ''), _conf, _av_id, _job_id, case when _pocket then _i.staff_id end)
  on conflict (unit, source, external_id) where external_id is not null do nothing
  returning id into _entry;
  if _entry is null then
    select id into _entry from public.fin_entries where unit = _unit and source = 'whatsapp' and external_id = 'wa:' || _i.wa_message_id || case when _force_new then ':outro' else '' end;
  end if;
  update public.fin_inbox set state = 'lancado', entry_id = _entry, invoice_id = null, parsed = _p, confidence = _conf, high_value = _high,
    reason = nullif(array_to_string(_reasons, ' · '), '') where id = _id;
  perform public.fin_wa_reply(_id, 'Financeiro: anotado ✓ ' || case when _kind = 'saida' then 'despesa ' else 'entrada ' end || public.brl(_amount)
    || ' · ' || _desc || coalesce(' · ' || _cat_name, '') || coalesce(' · ' || _client_name, '')
    || case when _av_id is not null then ' (captação de ' || to_char(_av_date, 'DD/MM') || ')' when _job_id is not null then ' (avulso de ' || to_char(_job_date, 'DD/MM') || ')' else '' end
    || case when _unit = 'ellcazo' then ' · Ellcazo' else '' end
    || case when _pocket then ' · reembolso para ' || _who || ' depois da revisão' else '' end
    || '. Errado? Responda esta mensagem com "corrige 230" ou "cancela". ref ' || _ref);
  return 'lancado';
end $$;

-- Comandos respondendo à mensagem: "cancela", "corrige 230", "outro".
create or replace function public.fin_wa_command(_inbox uuid, _cmd text, _val numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare _i public.fin_inbox; _e public.fin_entries; _ref text;
begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _i from public.fin_inbox where id = _inbox for update;
  if _i.id is null then return; end if;
  _ref := left(_i.id::text, 6);
  if _i.state in ('confirmado', 'descartado', 'cancelado') then
    perform public.fin_wa_reply(_inbox, 'Financeiro: esse lançamento já foi revisado ou cancelado. Para mudar, use o sistema. ref ' || _ref);
    return;
  end if;
  if _cmd = 'cancela' then
    perform public.fin_wa_undo(_inbox);
    update public.fin_inbox set state = 'cancelado', reason = 'Cancelado no WhatsApp.' where id = _inbox;
    perform public.fin_wa_reply(_inbox, 'Financeiro: cancelado ✓ ref ' || _ref);
  elsif _cmd = 'corrige' then
    if _val is null or _val <= 0 then
      perform public.fin_wa_reply(_inbox, 'Financeiro: não entendi o valor. Exemplo: "corrige 230". ref ' || _ref);
      return;
    end if;
    select * into _e from public.fin_entries where id = _i.entry_id;
    if _i.state = 'lancado' and _e.id is not null and _e.review_status = 'a_revisar' and coalesce(_i.parsed->>'matched', '') <> 'recorrente' and _e.source = 'whatsapp' then
      update public.fin_entries set amount = _val, updated_at = now(),
        notes = left(trim(coalesce(notes, '') || ' · Valor corrigido no WhatsApp: ' || public.brl(_e.amount) || ' → ' || public.brl(_val)), 1000)
      where id = _e.id;
      update public.fin_inbox set parsed = parsed || jsonb_build_object('amount', _val, 'amount_override', _val) where id = _inbox;
      perform public.fin_wa_reply(_inbox, 'Financeiro: corrigido ✓ agora ' || public.brl(_val) || '. ref ' || _ref);
    else
      perform public.fin_wa_undo(_inbox);
      update public.fin_inbox set state = 'nao_entendi', entry_id = null, invoice_id = null, parsed = parsed || jsonb_build_object('amount_override', _val) where id = _inbox;
      perform public.fin_wa_process(_inbox, false);
    end if;
  elsif _cmd = 'outro' then
    if _i.state = 'repetido' then
      perform public.fin_wa_undo(_inbox);
      update public.fin_inbox set state = 'nao_entendi', entry_id = null where id = _inbox;
      perform public.fin_wa_process(_inbox, true);
    else
      perform public.fin_wa_reply(_inbox, 'Financeiro: esse já está lançado separado. ref ' || _ref);
    end if;
  end if;
end $$;

-- Gatilho: cada mensagem nova de um canal ligado entra na caixa de entrada. Nunca derruba a gravação da mensagem.
create or replace function public.fin_wa_on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  _s public.fin_wa_settings; _ch public.fin_wa_channels; _key text; _staff uuid; _t text; _id uuid; _media text;
  _quoted text; _qtext text; _target uuid; _cmd text; _val numeric; _code text; _mid text;
begin
  select * into _s from public.fin_wa_settings where id;
  if not coalesce(_s.enabled, false) or new.from_me then return new; end if;
  if new.account_id is not null and new.account_id is distinct from (select a.id from public.whatsapp_accounts a where a.is_default limit 1) then return new; end if;
  _key := public.fin_phone_key(coalesce(nullif(new.sender_phone, ''), case when not new.is_group then split_part(new.chat_jid, '@', 1) end));
  if new.is_group then
    select * into _ch from public.fin_wa_channels where kind = 'grupo' and chat_jid = new.chat_jid and enabled;
  else
    select * into _ch from public.fin_wa_channels where kind = 'privado' and phone_key = _key and enabled;
  end if;
  if _ch.id is null or _key is null then return new; end if;

  _media := case when new.message_type in ('audio', 'image', 'document') then new.message_type end;
  _t := trim(public.fin_norm(coalesce(new.body, '')));
  -- Conversa comum ("ok", "bom dia") não entra. No privado, só o que tem número ou anexo.
  if _media is null and _t !~ '[0-9]' and _t !~ '\m(cancela|cancelar|outro|outra|reembolso)\M' then return new; end if;
  if _ch.kind = 'privado' and _media is null and _t !~ '[0-9]' then return new; end if;

  select s.id into _staff from public.staff_members s join public.fin_wa_people p on p.staff_id = s.id
  where s.is_active and public.fin_phone_key(s.phone) = _key limit 1;
  if _staff is null then
    insert into public.fin_wa_unknown (phone_key, phone, name, channel_id, last_text)
    values (_key, coalesce(nullif(new.sender_phone, ''), split_part(new.chat_jid, '@', 1)), new.sender_name, _ch.id, left(new.body, 200))
    on conflict (phone_key) do update set attempts = public.fin_wa_unknown.attempts + 1, last_at = now(), last_text = excluded.last_text,
      name = coalesce(excluded.name, public.fin_wa_unknown.name), channel_id = excluded.channel_id;
    return new;
  end if;

  -- Comandos.
  if _media is null then
    if _t ~ '^(cancela|cancelar|cancele|apaga|apagar|exclui|excluir)( (o )?ultimo)?[ .!]*$' then _cmd := 'cancela';
    elsif _t ~ '^(corrige|corrigir|corrija|correcao)\M' then _cmd := 'corrige'; _val := (public.fin_wa_parse(regexp_replace(_t, '^\S+', ''))->>'amount')::numeric;
    elsif _t ~ '^(e |eh )?(outro|outra)( gasto| despesa| lancamento)?[ .!]*$' then _cmd := 'outro';
    end if;
  end if;
  if _cmd is not null then
    _quoted := jsonb_path_query_first(new.raw, '$.**.contextInfo.stanzaId') #>> '{}';
    _qtext := (jsonb_path_query_first(new.raw, '$.**.contextInfo.quotedMessage'))::text;
    if _quoted is not null then select id into _target from public.fin_inbox where wa_message_id = _quoted; end if;
    if _target is null and _qtext is not null then
      _code := (regexp_match(_qtext, 'ref ([0-9a-f]{6})'))[1];
      if _code is not null then
        select id into _target from public.fin_inbox where chat_jid = new.chat_jid and id::text like _code || '%' and received_at > now() - interval '45 days' limit 1;
      end if;
    end if;
    if _target is null and _quoted is null then
      select id into _target from public.fin_inbox
      where chat_jid = new.chat_jid and staff_id = _staff and received_at > now() - interval '48 hours'
        and state in ('lancado', 'repetido', 'fatura', 'nao_entendi', 'aguardando_audio')
      order by received_at desc limit 1;
    end if;
    if _target is not null then
      perform public.fin_wa_command(_target, _cmd, _val);
      return new;
    end if;
    if _cmd <> 'corrige' then return new; end if;
  end if;

  _mid := coalesce(nullif(new.message_id, ''), 'row:' || new.id);
  insert into public.fin_inbox (wa_message_id, wa_row_id, channel_id, chat_jid, staff_id, sender_name, body, media, received_at)
  values (_mid, new.id, _ch.id, new.chat_jid, _staff, new.sender_name, nullif(trim(coalesce(new.body, '')), ''), _media, coalesce(new.sent_at, new.received_at, now()))
  on conflict (wa_message_id) do nothing
  returning id into _id;
  if _id is null then return new; end if;
  begin
    perform public.fin_wa_process(_id, false);
  exception when others then
    update public.fin_inbox set state = 'nao_entendi', reason = left('Erro na leitura: ' || sqlerrm, 200) where id = _id;
  end;
  return new;
exception when others then
  raise warning 'fin_wa_on_message: %', sqlerrm;
  return new;
end $$;

drop trigger if exists fin_wa_on_message on public.whatsapp_messages;
create trigger fin_wa_on_message after insert on public.whatsapp_messages
  for each row execute function public.fin_wa_on_message();

-- Áudio transcrito: relê o item que estava esperando.
create or replace function public.fin_wa_on_transcribed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare _id uuid;
begin
  update public.fin_inbox set body = new.body where wa_row_id = new.id and state = 'aguardando_audio' returning id into _id;
  if _id is not null then perform public.fin_wa_process(_id, false); end if;
  return new;
exception when others then
  raise warning 'fin_wa_on_transcribed: %', sqlerrm;
  return new;
end $$;
drop trigger if exists fin_wa_on_transcribed on public.whatsapp_messages;
create trigger fin_wa_on_transcribed after update of transcribed_at on public.whatsapp_messages
  for each row when (old.transcribed_at is null and new.transcribed_at is not null) execute function public.fin_wa_on_transcribed();

-- Grupo com o mesmo nome do canal aparece na sincronização: liga sozinho.
create or replace function public.fin_wa_link_pending() returns integer
language plpgsql security definer set search_path = '' as $$
declare _n int := 0; _r record; _jid text;
begin
  for _r in select id, name from public.fin_wa_channels where kind = 'grupo' and chat_jid is null loop
    select g.chat_jid into _jid from public.wa_groups g
    where g.client_id is null and not exists (select 1 from public.fin_wa_channels c where c.chat_jid = g.chat_jid)
      and (public.fin_client_key(g.name) = public.fin_client_key(_r.name) or extensions.similarity(public.fin_client_key(g.name), public.fin_client_key(_r.name)) >= 0.8)
    order by extensions.similarity(public.fin_client_key(g.name), public.fin_client_key(_r.name)) desc limit 1;
    if _jid is not null then
      update public.fin_wa_channels set chat_jid = _jid where id = _r.id;
      _n := _n + 1; _jid := null;
    end if;
  end loop;
  return _n;
end $$;
create or replace function public.fin_wa_on_group() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.fin_wa_channels where kind = 'grupo' and chat_jid is null) then perform public.fin_wa_link_pending(); end if;
  return null;
exception when others then return null;
end $$;
drop trigger if exists fin_wa_on_group on public.wa_groups;
create trigger fin_wa_on_group after insert or update of name on public.wa_groups
  for each statement execute function public.fin_wa_on_group();

