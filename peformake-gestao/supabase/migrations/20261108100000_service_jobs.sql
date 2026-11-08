-- Serviço avulso com quem executa (ex.: apresentadora num mês).
-- Um lançamento cria, de uma vez: a fatura do cliente (entra na cobrança única do mês) e a conta a pagar da pessoa no Caixa.
-- A pessoa vê no painel dela quanto tem para receber.

-- Funções extras de quem é da equipe ou freela (apresentadora, fotógrafo...). O sistema aprende: quem faz uma vez fica marcado.
alter table public.staff_members add column if not exists skills text[] not null default '{}';
-- Conta a pagar ligada a uma pessoa da equipe.
alter table public.fin_entries add column if not exists staff_id uuid references public.staff_members(id) on delete set null;
create index if not exists fin_entries_staff_idx on public.fin_entries (staff_id) where staff_id is not null;

create table if not exists public.service_jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  unit text not null check (unit in ('peformake', 'ellcazo')),
  skill text not null,
  title text not null check (length(trim(title)) between 2 and 160),
  job_date date not null,
  client_amount numeric not null check (client_amount >= 0),
  staff_id uuid references public.staff_members(id) on delete set null,
  staff_amount numeric not null default 0 check (staff_amount >= 0),
  staff_pay_date date,
  invoice_id uuid references public.invoices(id) on delete set null,
  payable_id uuid references public.fin_entries(id) on delete set null,
  status text not null default 'ativo' check (status in ('ativo', 'cancelado')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.service_jobs enable row level security;
drop policy if exists service_jobs_read on public.service_jobs;
create policy service_jobs_read on public.service_jobs for select to authenticated using (public.can_finance(unit));

-- Lançar: fatura do cliente + conta a pagar da pessoa. Vencimento do cliente: o da mensalidade do mês (para juntar), senão a data do serviço.
create or replace function public.service_job_save(_data jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  _unit text := coalesce(_data->>'unit', 'ellcazo');
  _client uuid := (_data->>'client_id')::uuid;
  _skill text := lower(trim(coalesce(_data->>'skill', 'outro')));
  _title text := trim(_data->>'title');
  _date date := coalesce((_data->>'job_date')::date, (now() at time zone 'America/Sao_Paulo')::date);
  _client_amount numeric := coalesce((_data->>'client_amount')::numeric, 0);
  _staff uuid := nullif(_data->>'staff_id', '')::uuid;
  _staff_amount numeric := coalesce((_data->>'staff_amount')::numeric, 0);
  _due date; _pay date; _id uuid := gen_random_uuid(); _inv uuid; _pay_id uuid; _cat uuid; _name text; _client_name text;
begin
  if not public.can_finance(_unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _title is null or length(_title) < 2 then raise exception 'Escreva o serviço' using errcode = '22023'; end if;
  if _client_amount <= 0 and _staff_amount <= 0 then raise exception 'Informe o valor' using errcode = '22023'; end if;
  if _staff_amount > 0 and _staff is null then raise exception 'Escolha quem faz o serviço' using errcode = '22023'; end if;
  select name into _client_name from public.clients where id = _client;
  if _client_name is null then raise exception 'Cliente não encontrado' using errcode = '22023'; end if;

  select max(due_date) into _due from public.invoices
  where client_id = _client and source = 'mensalidade' and status in ('pendente', 'vencido') and date_trunc('month', due_date) = date_trunc('month', _date);
  _due := coalesce(_due, greatest(_date, (now() at time zone 'America/Sao_Paulo')::date));
  _pay := coalesce((_data->>'staff_pay_date')::date, _due);

  if _client_amount > 0 then
    insert into public.invoices (client_id, unit, description, amount, due_date, source, ref, created_by)
    values (_client, _unit, left(_title || ' · ' || to_char(_date, 'DD/MM'), 200), _client_amount, _due, 'avulso', 'job:' || _id, (select auth.uid()))
    returning id into _inv;
  end if;

  if _staff is not null and _staff_amount > 0 then
    select full_name into _name from public.staff_members where id = _staff;
    select id into _cat from public.fin_categories where unit = _unit and kind = 'saida' and name = 'Equipe' and is_active limit 1;
    insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, status, client_id, source, external_id, staff_id, created_by, notes)
    values (_unit, 'saida', _cat, left(coalesce(_name, 'Equipe') || ' · ' || _title || ' · ' || _client_name, 200), _staff_amount, _pay, 'pendente', _client, 'manual', 'job:' || _id, _staff, (select auth.uid()),
      'A pagar pelo serviço avulso de ' || to_char(_date, 'DD/MM') || '.')
    returning id into _pay_id;
    -- Aprende a função da pessoa (aparece primeiro da próxima vez).
    update public.staff_members set skills = array(select distinct unnest(skills || _skill)) where id = _staff and not (_skill = any(skills));
  end if;

  insert into public.service_jobs (id, client_id, unit, skill, title, job_date, client_amount, staff_id, staff_amount, staff_pay_date, invoice_id, payable_id, created_by)
  values (_id, _client, _unit, _skill, _title, _date, _client_amount, _staff, _staff_amount, _pay, _inv, _pay_id, (select auth.uid()));

  if _inv is not null then perform public.invoice_group_auto(); end if;
  return _id;
end $$;

-- Cancelar: cancela a fatura (se ainda em aberto) e a conta a pagar (se ainda não paga).
create or replace function public.service_job_cancel(_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare _j public.service_jobs;
begin
  select * into _j from public.service_jobs where id = _id;
  if _j.id is null or not public.can_finance(_j.unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _j.invoice_id is not null and exists (select 1 from public.invoices where id = _j.invoice_id and status in ('pendente', 'vencido')) then
    perform public.invoice_set_status(_j.invoice_id, 'cancelado');
  end if;
  update public.fin_entries set status = 'cancelado', updated_at = now() where id = _j.payable_id and status = 'pendente';
  update public.service_jobs set status = 'cancelado' where id = _id;
end $$;

-- Para a pessoa: o que ela tem para receber e o que recebeu no mês (só dela; admin pode ver "como" alguém).
create or replace function public.my_payables(_staff_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _staff uuid;
begin
  if _staff_id is not null and public.has_role('admin') then _staff := _staff_id;
  else select id into _staff from public.staff_members where profile_id = (select auth.uid()) limit 1; end if;
  if _staff is null then return jsonb_build_object('pending', 0, 'paid_month', 0, 'items', '[]'::jsonb); end if;
  return jsonb_build_object(
    'pending', coalesce((select sum(amount) from public.fin_entries where staff_id = _staff and kind = 'saida' and status = 'pendente'), 0),
    'paid_month', coalesce((select sum(amount) from public.fin_entries where staff_id = _staff and kind = 'saida' and status = 'pago'
      and paid_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date), 0),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'description', f.description, 'amount', f.amount, 'due_date', f.due_date, 'status', f.status, 'paid_at', f.paid_at) order by f.status <> 'pendente', f.due_date)
      from (select * from public.fin_entries where staff_id = _staff and kind = 'saida' and status in ('pendente', 'pago')
            and (status = 'pendente' or paid_at >= (now() at time zone 'America/Sao_Paulo')::date - 60) order by due_date desc limit 20) f), '[]'::jsonb));
end $$;

revoke execute on function public.service_job_save(jsonb) from public, anon;
revoke execute on function public.service_job_cancel(uuid) from public, anon;
revoke execute on function public.my_payables(uuid) from public, anon;
grant execute on function public.service_job_save(jsonb) to authenticated;
grant execute on function public.service_job_cancel(uuid) to authenticated;
grant execute on function public.my_payables(uuid) to authenticated;
