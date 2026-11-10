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
