-- Financeiro · Fase 0, item 6: avulso feito por membro só vira "a pagar" quando o cliente paga, com a parte da empresa.
-- Antes: lançar o serviço criava na hora a conta a pagar da pessoa, mesmo sem o cliente pagar.
-- Agora:
--   * Parte da empresa nos avulsos ajustável em Equipe → Configurações (team_settings.job_company_pct, padrão 25%).
--     Sem valor para quem fez, o sistema sugere: valor do cliente menos a parte da empresa.
--   * Com cobrança ao cliente, a conta a pagar só nasce quando a fatura fica paga, com vencimento no próximo dia 30
--     (fevereiro: último dia). Antes disso a pessoa vê "aguardando o cliente pagar".
--   * Pagamento desfeito: a conta a pagar ainda não paga é cancelada.
--   * Sem cobrança ao cliente (serviço interno): a conta a pagar nasce na hora, como antes.

alter table public.team_settings add column if not exists job_company_pct numeric(5,2) not null default 25 check (job_company_pct between 0 and 100);

create or replace function public.team_settings_save(_data jsonb)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.team_settings set
    sourcing_enabled = coalesce((_data->>'sourcing_enabled')::boolean, sourcing_enabled),
    sourcing_pct = coalesce((_data->>'sourcing_pct')::numeric, sourcing_pct),
    sourcing_months = coalesce((_data->>'sourcing_months')::smallint, sourcing_months),
    partnership_enabled = coalesce((_data->>'partnership_enabled')::boolean, partnership_enabled),
    partnership_min_revenue = coalesce((_data->>'partnership_min_revenue')::numeric, partnership_min_revenue),
    partnership_min_months = coalesce((_data->>'partnership_min_months')::smallint, partnership_min_months),
    head_commission_enabled = coalesce((_data->>'head_commission_enabled')::boolean, head_commission_enabled),
    head_commission_pct = coalesce((_data->>'head_commission_pct')::numeric, head_commission_pct),
    goals_enabled = coalesce((_data->>'goals_enabled')::boolean, goals_enabled),
    job_company_pct = least(100, greatest(0, coalesce((_data->>'job_company_pct')::numeric, job_company_pct))),
    updated_at = now(), updated_by = (select auth.uid())
  where id;
end;
$function$;

-- Próximo dia de pagamento da equipe (dia 30; fevereiro e meses curtos: último dia) a partir de uma data.
create or replace function public.team_payday(_from date)
returns date language sql immutable set search_path to '' as $$
  select case when public.safe_date(extract(year from _from)::int, extract(month from _from)::int, 30) >= _from
    then public.safe_date(extract(year from _from)::int, extract(month from _from)::int, 30)
    else public.safe_date(extract(year from (_from + interval '1 month'))::int, extract(month from (_from + interval '1 month'))::int, 30) end
$$;

create or replace function public.service_job_save(_data jsonb)
returns uuid language plpgsql security definer set search_path to '' as $function$
declare
  _unit text := coalesce(_data->>'unit', 'ellcazo');
  _client uuid := (_data->>'client_id')::uuid;
  _skill text := lower(trim(coalesce(_data->>'skill', 'outro')));
  _title text := trim(_data->>'title');
  _date date := coalesce((_data->>'job_date')::date, (now() at time zone 'America/Sao_Paulo')::date);
  _client_amount numeric := coalesce((_data->>'client_amount')::numeric, 0);
  _staff uuid := nullif(_data->>'staff_id', '')::uuid;
  _staff_amount numeric := coalesce((_data->>'staff_amount')::numeric, 0);
  _pct numeric := coalesce((select job_company_pct from public.team_settings where id), 25);
  _due date; _pay date; _id uuid := gen_random_uuid(); _inv uuid; _pay_id uuid; _client_name text;
begin
  if not public.can_finance(_unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _title is null or length(_title) < 2 then raise exception 'Escreva o serviço' using errcode = '22023'; end if;
  if _client_amount <= 0 and _staff_amount <= 0 then raise exception 'Informe o valor' using errcode = '22023'; end if;
  -- Sem valor para quem fez: o do cliente menos a parte da empresa.
  if _staff is not null and _staff_amount <= 0 and _client_amount > 0 then
    _staff_amount := round(_client_amount * (100 - _pct) / 100, 2);
  end if;
  if _staff_amount > 0 and _staff is null then raise exception 'Escolha quem faz o serviço' using errcode = '22023'; end if;
  select name into _client_name from public.clients where id = _client;
  if _client_name is null then raise exception 'Cliente não encontrado' using errcode = '22023'; end if;

  select max(due_date) into _due from public.invoices
  where client_id = _client and source = 'mensalidade' and status in ('pendente', 'vencido') and date_trunc('month', due_date) = date_trunc('month', _date);
  _due := coalesce(_due, greatest(_date, (now() at time zone 'America/Sao_Paulo')::date));
  _pay := public.team_payday(_due);

  if _client_amount > 0 then
    insert into public.invoices (client_id, unit, description, amount, due_date, source, ref, created_by)
    values (_client, _unit, left(_title || ' · ' || to_char(_date, 'DD/MM'), 200), _client_amount, _due, 'avulso', 'job:' || _id, (select auth.uid()))
    returning id into _inv;
  end if;

  insert into public.service_jobs (id, client_id, unit, skill, title, job_date, client_amount, staff_id, staff_amount, staff_pay_date, invoice_id, payable_id, created_by)
  values (_id, _client, _unit, _skill, _title, _date, _client_amount, _staff, _staff_amount, _pay, _inv, null, (select auth.uid()));

  if _staff is not null then
    update public.staff_members set skills = array(select distinct unnest(skills || _skill)) where id = _staff and not (_skill = any(skills));
    -- Serviço interno (sem cobrar o cliente): a conta a pagar nasce na hora.
    if _inv is null and _staff_amount > 0 then
      _pay_id := public.service_job_release(_id, (now() at time zone 'America/Sao_Paulo')::date);
    end if;
  end if;

  if _inv is not null then perform public.invoice_group_auto(); end if;
  return _id;
end $function$;

-- Cria a conta a pagar de quem fez o avulso (uma vez só; se foi cancelada por pagamento desfeito, reabre a mesma).
create or replace function public.service_job_release(_job uuid, _paid_on date)
returns uuid language plpgsql security definer set search_path to '' as $function$
declare _j public.service_jobs; _cat uuid; _name text; _client_name text; _id uuid; _st text; _pay date;
begin
  select * into _j from public.service_jobs where id = _job for update;
  if _j.id is null or _j.staff_id is null or coalesce(_j.staff_amount, 0) <= 0 or _j.payable_id is not null then return _j.payable_id; end if;
  _pay := public.team_payday(coalesce(_paid_on, (now() at time zone 'America/Sao_Paulo')::date));
  select id, status into _id, _st from public.fin_entries where unit = _j.unit and source = 'manual' and external_id = 'job:' || _j.id limit 1;
  if _id is not null then
    if _st = 'cancelado' then
      update public.fin_entries set status = 'pendente', paid_at = null, amount = _j.staff_amount, due_date = _pay, updated_at = now(),
        notes = coalesce(notes || ' ', '') || 'Reaberto: o cliente pagou de novo.'
      where id = _id;
    end if;
  else
    select full_name into _name from public.staff_members where id = _j.staff_id;
    select name into _client_name from public.clients where id = _j.client_id;
    select id into _cat from public.fin_categories where unit = _j.unit and kind = 'saida' and name = 'Equipe' and is_active limit 1;
    insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, status, client_id, source, external_id, staff_id, created_by, notes)
    values (_j.unit, 'saida', _cat, left(coalesce(_name, 'Equipe') || ' · ' || _j.title || ' · ' || coalesce(_client_name, 'cliente'), 200), _j.staff_amount, _pay, 'pendente',
      _j.client_id, 'manual', 'job:' || _j.id, _j.staff_id, _j.created_by,
      'A pagar pelo serviço avulso de ' || to_char(_j.job_date, 'DD/MM') || case when _j.invoice_id is not null then ', liberado quando o cliente pagou.' else '.' end)
    returning id into _id;
  end if;
  update public.service_jobs set payable_id = _id, staff_pay_date = _pay where id = _j.id;
  return _id;
end $function$;
revoke execute on function public.service_job_release(uuid, date) from public, anon, authenticated;

-- Fatura do avulso paga → libera a conta a pagar; pagamento desfeito → cancela a conta ainda não paga.
create or replace function public.service_job_on_invoice()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare _j record;
begin
  if new.source <> 'avulso' or coalesce(new.ref, '') not like 'job:%' or new.status is not distinct from old.status then return null; end if;
  for _j in select * from public.service_jobs where invoice_id = new.id loop
    if new.status = 'pago' then
      perform public.service_job_release(_j.id, (coalesce(new.paid_at, now()) at time zone 'America/Sao_Paulo')::date);
    elsif old.status = 'pago' and _j.payable_id is not null then
      update public.fin_entries set status = 'cancelado', paid_at = null, updated_at = now(),
        notes = coalesce(notes || ' ', '') || 'Cancelado: o pagamento do cliente foi desfeito.'
      where id = _j.payable_id and status = 'pendente';
      if found then update public.service_jobs set payable_id = null where id = _j.id; end if;
    end if;
  end loop;
  return null;
end $function$;
create trigger service_job_on_invoice after update of status on public.invoices
  for each row execute function public.service_job_on_invoice();

-- "Você tem para receber": também mostra o que espera o cliente pagar.
create or replace function public.my_payables(_staff_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare _staff uuid;
begin
  if _staff_id is not null and public.has_role('admin') then _staff := _staff_id;
  else select id into _staff from public.staff_members where profile_id = (select auth.uid()) limit 1; end if;
  if _staff is null then return jsonb_build_object('pending', 0, 'paid_month', 0, 'waiting', 0, 'items', '[]'::jsonb, 'waiting_items', '[]'::jsonb); end if;
  return jsonb_build_object(
    'pending', coalesce((select sum(amount) from public.fin_entries where staff_id = _staff and kind = 'saida' and status = 'pendente'), 0),
    'paid_month', coalesce((select sum(amount) from public.fin_entries where staff_id = _staff and kind = 'saida' and status = 'pago'
      and paid_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date), 0),
    'waiting', coalesce((select sum(j.staff_amount) from public.service_jobs j join public.invoices i on i.id = j.invoice_id
      where j.staff_id = _staff and j.payable_id is null and i.status in ('pendente', 'vencido')), 0),
    'waiting_items', coalesce((select jsonb_agg(jsonb_build_object('id', j.id, 'title', j.title, 'client', trim(c.name), 'amount', j.staff_amount, 'due_date', i.due_date) order by i.due_date)
      from public.service_jobs j join public.invoices i on i.id = j.invoice_id join public.clients c on c.id = j.client_id
      where j.staff_id = _staff and j.payable_id is null and i.status in ('pendente', 'vencido')), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'description', f.description, 'amount', f.amount, 'due_date', f.due_date, 'status', f.status, 'paid_at', f.paid_at) order by f.status <> 'pendente', f.due_date)
      from (select * from public.fin_entries where staff_id = _staff and kind = 'saida' and status in ('pendente', 'pago')
            and (status = 'pendente' or paid_at >= (now() at time zone 'America/Sao_Paulo')::date - 60) order by due_date desc limit 20) f), '[]'::jsonb));
end $function$;
