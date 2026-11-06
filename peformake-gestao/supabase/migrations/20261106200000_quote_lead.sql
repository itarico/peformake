-- Orçamento: só salva com cliente cadastrado ou com nome + WhatsApp do interessado.
-- O interessado fica em Comercial → Prospecção (site_leads) até aceitar; ao aceitar vira cliente e o lead é marcado.
create or replace function public.av_quote_save(_id uuid, _data jsonb)
 returns uuid language plpgsql security definer set search_path to '' as $function$
declare _qid uuid := _id; _phone text := regexp_replace(coalesce(_data->>'lead_phone', ''), '[^0-9]', '', 'g'); _client uuid := nullif(_data->>'client_id', '')::uuid;
begin
  if not (public.can_access_av() or public.can_edit_catalog()) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if length(trim(coalesce(_data->>'title', ''))) < 2 then raise exception 'Formato invalido' using errcode = 'PF006'; end if;
  if length(_phone) between 10 and 11 then _phone := '55' || _phone; end if;
  if _client is null and (length(trim(coalesce(_data->>'lead_name', ''))) < 2 or _phone !~ '^[0-9]{12,13}$') then
    raise exception 'Informe nome e WhatsApp do interessado' using errcode = 'PF006';
  end if;
  if _qid is null then
    insert into public.av_quotes (client_id, lead_name, lead_phone, lead_email, title, kind, months, items, inputs, subtotal, discount, total, notes, valid_until, created_by)
    values (_client, nullif(trim(_data->>'lead_name'), ''), nullif(_phone, ''), nullif(lower(trim(_data->>'lead_email')), ''),
      trim(_data->>'title'), coalesce(_data->>'kind', 'avulso'), nullif(_data->>'months', '')::smallint, coalesce(_data->'items', '[]'), coalesce(_data->'inputs', '{}'),
      coalesce((_data->>'subtotal')::numeric, 0), coalesce((_data->>'discount')::numeric, 0), coalesce((_data->>'total')::numeric, 0),
      nullif(trim(_data->>'notes'), ''), coalesce(nullif(_data->>'valid_until', '')::date, (now() at time zone 'America/Sao_Paulo')::date + 7), (select auth.uid()))
    returning id into _qid;
  else
    update public.av_quotes set client_id = _client, lead_name = nullif(trim(_data->>'lead_name'), ''),
      lead_phone = nullif(_phone, ''), lead_email = nullif(lower(trim(_data->>'lead_email')), ''), title = trim(_data->>'title'),
      kind = coalesce(_data->>'kind', kind), months = nullif(_data->>'months', '')::smallint, items = coalesce(_data->'items', items), inputs = coalesce(_data->'inputs', inputs),
      subtotal = coalesce((_data->>'subtotal')::numeric, subtotal), discount = coalesce((_data->>'discount')::numeric, discount), total = coalesce((_data->>'total')::numeric, total),
      notes = nullif(trim(_data->>'notes'), ''), valid_until = coalesce(nullif(_data->>'valid_until', '')::date, valid_until), updated_at = now()
    where id = _qid and status in ('rascunho', 'enviado');
    if not found then raise exception 'Orcamento nao pode mais ser editado' using errcode = 'PF004'; end if;
  end if;
  -- Interessado novo vira lead (um por telefone, sem duplicar).
  if _client is null and not exists (select 1 from public.site_leads where phone = _phone and status <> 'descartado') then
    insert into public.site_leads (name, phone, interest, message, status)
    values (left(trim(_data->>'lead_name'), 120), _phone, left('Orçamento Ellcazo: ' || trim(_data->>'title'), 120),
      'Orçamento ' || (select code from public.av_quotes where id = _qid) || ' de ' || to_char(coalesce((_data->>'total')::numeric, 0), 'FM999G999G990D00') || ' reais.', 'novo');
  end if;
  return _qid;
end $function$;

-- Ao aceitar: lead marcado como convertido.
create or replace function public.av_quote_lead_done() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.status = 'aceito' and old.status is distinct from 'aceito' and new.lead_phone is not null then
    update public.site_leads set status = 'virou_lead' where phone = new.lead_phone and status in ('novo', 'contatado');
  end if;
  return new;
end $$;
drop trigger if exists av_quote_lead_done on public.av_quotes;
create trigger av_quote_lead_done after update of status on public.av_quotes for each row execute function public.av_quote_lead_done();
