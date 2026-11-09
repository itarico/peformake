-- Financeiro · Fase 0, item 5: preço do audiovisual escondido da produção e sinal configurado.
-- a) Orçamentos e tabela de preços do audiovisual: só admin e Admin Ellcazo (função 'ellcazo').
--    Antes, videomaker, editor, social media e head liam preços e orçamentos.
-- b) O sinal lia a chave errada ('sinal', sempre vazia, caía em 50%). Agora lê 'sinal_pct'.
--    O percentual continua o da tabela de preços (hoje 50%). Decisão do Italo (08/11): audiovisual sem sinal;
--    para valer, basta pôr 0% em Sinal na reserva (0% não cria fatura de sinal).

create or replace function public.can_see_av_price()
returns boolean language sql stable security definer set search_path to '' as $$
  select public.has_role('admin') or public.has_role('ellcazo');
$$;
revoke execute on function public.can_see_av_price() from public, anon;
grant execute on function public.can_see_av_price() to authenticated;

alter policy av_quotes_select on public.av_quotes using (public.can_see_av_price());
alter policy av_pricing_select on public.av_pricing using (public.can_see_av_price());

-- Criar, enviar e mudar status de orçamento: mesma regra.
do $$
declare _f text; _def text;
begin
  foreach _f in array array['av_quote_save', 'av_quote_set_status', 'av_quote_mark_sent'] loop
    select pg_get_functiondef(p.oid) into _def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = _f;
    if _def like '%(public.can_access_av() or public.can_edit_catalog())%' then
      execute replace(_def, '(public.can_access_av() or public.can_edit_catalog())', 'public.can_see_av_price()');
    end if;
  end loop;
end $$;

create or replace function public.av_quote_charge_deposit()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare _pct numeric; _amount numeric;
begin
  if new.status <> 'aceito' or old.status = 'aceito' or new.client_id is null or new.total <= 0 then return new; end if;
  select coalesce((values->>'sinal_pct')::numeric, 0) into _pct from public.av_pricing where id;
  _amount := round(new.total * coalesce(_pct, 0) / 100, 2);
  if _amount > 0 then
    insert into public.invoices (client_id, unit, description, amount, due_date, source, ref)
    values (new.client_id, 'ellcazo', left('Sinal ' || new.code || ' · ' || new.title, 200), _amount, current_date + 2, 'sinal', new.id::text)
    on conflict (client_id, source, ref) do nothing;
  end if;
  return new;
end;
$function$;

