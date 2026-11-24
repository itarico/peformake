-- Financeiro pelo WhatsApp, dois ajustes (pedido do Italo, 24/11/2026):
-- 1. Cliente com número no nome (3LM, F5 Multimarcas) quebrava a leitura: o "3" virava um segundo valor e a mensagem
--    caía em "Achei mais de um valor". Agora o leitor de valores ignora os números que fazem parte do nome de um cliente.
-- 2. Entrada de um cliente que tem fatura em aberto, mas com valor diferente, era lançada solta, sem aviso. Agora a
--    Revisão mostra a fatura em aberto e diz que o valor não bate (valor igual já casava com a fatura sozinho).

-- 1 ----------------------------------------------------------------------------------------------------------------
alter function public.fin_wa_parse(text, date) rename to fin_wa_parse_core;

create or replace function public.fin_wa_parse(_text text, _today date default ((now() at time zone 'America/Sao_Paulo')::date))
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _full jsonb; _masked text := _text; _w text; _m jsonb;
begin
  _full := public.fin_wa_parse_core(_text, _today);
  -- Palavras de nome ou apelido de cliente que misturam letra e número (ex.: 3LM, F5).
  for _w in
    select distinct w from (
      select regexp_split_to_table(trim(c.name), '\s+') w from public.clients c where c.name ~ '[0-9]'
      union all
      select regexp_split_to_table(trim(a), '\s+') from public.clients c, unnest(coalesce(c.aliases, '{}')) a where a ~ '[0-9]'
    ) t where w ~ '[0-9]' and w ~* '[a-z]' and length(w) between 2 and 20
  loop
    _masked := regexp_replace(_masked, '(^|[^[:alnum:]])' || regexp_replace(_w, '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g') || '($|[^[:alnum:]])', '\1cliente\2', 'gi');
  end loop;
  if _masked = _text then return _full; end if;
  _m := public.fin_wa_parse_core(_masked, _today);
  return _full || jsonb_build_object('amount', _m -> 'amount', 'candidates', _m -> 'candidates', 'money_weight', _m -> 'money_weight');
end $$;
revoke execute on function public.fin_wa_parse(text, date) from public, anon;
grant execute on function public.fin_wa_parse(text, date) to authenticated, service_role;

-- 2 ----------------------------------------------------------------------------------------------------------------
create or replace function public.fin_inbox_fatura_hint()
returns trigger language plpgsql security definer set search_path to '' as $$
declare _client uuid; _hint text;
begin
  if new.state <> 'lancado' or new.invoice_id is not null or coalesce(new.parsed ->> 'kind', '') <> 'entrada'
     or coalesce(new.reason, '') like '%fatura em aberto%' then
    return new;
  end if;
  begin
    _client := nullif(new.parsed -> 'client' ->> 'id', '')::uuid;
    if _client is null and new.entry_id is not null then
      select client_id into _client from public.fin_entries where id = new.entry_id;
    end if;
    if _client is null then return new; end if;
    select string_agg('R$ ' || translate(to_char(i.amount, 'FM999G999G990D00'), ',.', '.,') || ' (vence ' || to_char(i.due_date, 'DD/MM') || ')', ' e ' order by i.due_date)
      into _hint from (select amount, due_date from public.invoices where client_id = _client and status in ('pendente', 'vencido') order by due_date limit 3) i;
    if _hint is not null then
      new.reason := concat_ws(' · ', nullif(new.reason, ''), 'Atenção: o cliente tem fatura em aberto de ' || _hint || ' e o valor não bate. Confira antes de confirmar');
    end if;
  exception when others then
    raise warning 'fin_inbox_fatura_hint falhou: %', sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public.fin_inbox_fatura_hint() from public, anon, authenticated;

create or replace trigger fin_inbox_fatura_hint before insert or update on public.fin_inbox
for each row execute function public.fin_inbox_fatura_hint();
