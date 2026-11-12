-- Financeiro pelo WhatsApp: lê também o que o dono do número conectado (Italo) manda no grupo do financeiro.
-- Antes, toda mensagem "enviada por mim" era ignorada, e o número conectado é o do Italo. Resposta automática do sistema continua ignorada.
-- Aplicada em 12/11/2026 pela sessão da nuvem.

create or replace function public.fin_wa_on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  _s public.fin_wa_settings; _ch public.fin_wa_channels; _key text; _staff uuid; _t text; _id uuid; _media text;
  _quoted text; _qtext text; _target uuid; _cmd text; _val numeric; _code text; _mid text;
begin
  select * into _s from public.fin_wa_settings where id;
  if not coalesce(_s.enabled, false) then return new; end if;
  -- O número conectado ao sistema é do Italo: o que ele digita no grupo do financeiro chega como "enviado por mim".
  -- Vale só em grupo cadastrado como canal; resposta automática do próprio sistema (mesmo texto na fila de envio) é ignorada.
  if new.from_me then
    if not new.is_group or not exists (select 1 from public.fin_wa_channels c where c.kind = 'grupo' and c.chat_jid = new.chat_jid and c.enabled) then return new; end if;
    if new.body is not null and exists (select 1 from public.notification_outbox o where o.to_jid = new.chat_jid and o.created_at > now() - interval '2 days'
        and trim(o.message) = trim(new.body)) then return new; end if;
  end if;
  if new.account_id is not null and new.account_id is distinct from (select a.id from public.whatsapp_accounts a where a.is_default limit 1) then return new; end if;
  _key := public.fin_phone_key(case when new.from_me then (select a.phone from public.whatsapp_accounts a where a.id = coalesce(new.account_id, (select d.id from public.whatsapp_accounts d where d.is_default limit 1)))
    else coalesce(nullif(new.sender_phone, ''), case when not new.is_group then split_part(new.chat_jid, '@', 1) end) end);
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
