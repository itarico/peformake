-- Equipe → Membros (11/11, pedido do Italo):
-- 1) Telefone do membro normalizado no banco (máscara, sem 55): nunca mais "staff_members_phone_check".
-- 2) Membros que vieram do sistema antigo ficam como cadastrados à mão: a sincronização antiga (team_ingest,
--    sem rotina agendada) não sobrescreve nem reativa quem foi editado ou removido. "Remover" só desativa.
-- 3) Tipo de contrato por membro (CLT, PJ, Freela, Sócio) com Mensal (dia 30) ou Quinzenal (15 e 30),
--    contas a pagar do fixo no dia certo, avulsos e reembolsos no próximo dia de pagamento da pessoa,
--    tabela de valores do freela e participação no lucro do sócio (só vira conta depois da aprovação do admin).
-- Nada é apagado: só colunas novas, funções novas ou trocadas e gatilhos novos.

-- ============ 1) Telefone ============
create or replace function public.staff_phone_normalize()
returns trigger language plpgsql set search_path to '' as $$
declare _d text;
begin
  _d := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');
  if _d = '' then new.phone := null; return new; end if;
  if length(_d) in (10, 11) then _d := '55' || _d; end if;
  if _d !~ '^[0-9]{12,15}$' then
    raise exception 'Telefone com DDD (ex.: (81) 99999-0000)' using errcode = '22023';
  end if;
  new.phone := _d;
  return new;
end $$;

create or replace trigger staff_members_phone_normalize before insert or update of phone on public.staff_members
  for each row execute function public.staff_phone_normalize();

-- ============ 2) Membros do sistema antigo = membros normais ============
alter table public.staff_members add column if not exists edited_at timestamptz;
comment on column public.staff_members.edited_at is 'Última edição feita no sistema (não pela sincronização antiga). Com valor, a sincronização não mexe na pessoa.';

-- Todos os membros atuais passam a ser "da casa": a sincronização antiga não mexe mais neles.
update public.staff_members set edited_at = now() where edited_at is null;

create or replace function public.staff_mark_edited()
returns trigger language plpgsql set search_path to '' as $$
begin
  if coalesce(current_setting('app.team_sync', true), '') <> 'on' then new.edited_at := now(); end if;
  return new;
end $$;

create or replace trigger staff_members_mark_edited before update on public.staff_members
  for each row execute function public.staff_mark_edited();

-- Sincronização antiga (chamada só à mão; não há rotina agendada): respeita edição e remoção.
create or replace function public.team_ingest(_staff jsonb, _team jsonb)
returns integer language plpgsql set search_path to '' as $$
begin
  perform set_config('app.team_sync', 'on', true);
  insert into public.staff_members (id, full_name, job_title, main_role, email, legacy_avatar_url, is_active)
  select (r ->> 'id')::uuid, r ->> 'full_name', r ->> 'job_title', r ->> 'main_role', r ->> 'email',
         r ->> 'legacy_avatar_url', (r ->> 'is_active')::boolean
  from jsonb_array_elements(_staff) r
  on conflict (id) do update set
    full_name = excluded.full_name, job_title = excluded.job_title, main_role = excluded.main_role,
    email = excluded.email, legacy_avatar_url = excluded.legacy_avatar_url,
    -- nunca reativa quem saiu
    is_active = public.staff_members.is_active and excluded.is_active, synced_at = now()
  where public.staff_members.edited_at is null;
  perform set_config('app.team_sync', 'off', true);

  insert into public.client_team (client_id, staff_id, role_in_client)
  select (r ->> 'client_id')::uuid, (r ->> 'staff_id')::uuid, r ->> 'role_in_client'
  from jsonb_array_elements(_team) r
  where exists (select 1 from public.clients c where c.id = (r ->> 'client_id')::uuid)
  on conflict (client_id, staff_id) do update set role_in_client = excluded.role_in_client;

  return (select count(*) from public.client_team);
end $$;

-- Remover = desativar na equipe (a linha fica: pagamentos e tarefas ligados).
-- Com login: só tira o acesso se o admin pedir (_revoke). Sem login: cancela o convite pendente (member_remove).
create or replace function public.member_deactivate(_id uuid, _revoke boolean default false)
returns void language plpgsql security definer set search_path to '' as $$
declare _p uuid;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select profile_id into _p from public.staff_members where id = _id;
  if not found then raise exception 'Membro não encontrado' using errcode = 'PF004'; end if;
  if _p is not null and exists (select 1 from public.profiles where id = _p and is_master) then raise exception 'O master não pode ser removido' using errcode = 'PF009'; end if;
  if _p = (select auth.uid()) then raise exception 'Você não pode remover você mesmo' using errcode = 'PF009'; end if;
  if _p is null or _revoke then
    perform public.member_remove(_id, null);
  else
    update public.staff_members set is_active = false where id = _id;
  end if;
end $$;

-- ============ 3) Tipo de contrato e forma de pagamento ============
alter table public.member_pay add column if not exists pay_schedule text not null default 'mensal';
alter table public.member_pay add column if not exists advance_pct numeric;
alter table public.member_pay add column if not exists variable_enabled boolean not null default false;
alter table public.member_pay add column if not exists require_invoice boolean not null default false;
alter table public.member_pay add column if not exists profit_share_pct numeric;
alter table public.member_pay add column if not exists profit_period text not null default 'mensal';
alter table public.member_pay add column if not exists job_rates jsonb not null default '{}'::jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'member_pay_schedule_chk') then
    alter table public.member_pay add constraint member_pay_schedule_chk check (pay_schedule in ('mensal', 'quinzenal'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'member_pay_profit_period_chk') then
    alter table public.member_pay add constraint member_pay_profit_period_chk check (profit_period in ('mensal', 'trimestral'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'member_pay_advance_chk') then
    alter table public.member_pay add constraint member_pay_advance_chk check (advance_pct is null or (advance_pct > 0 and advance_pct < 100));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'member_pay_profit_pct_chk') then
    alter table public.member_pay add constraint member_pay_profit_pct_chk check (profit_share_pct is null or (profit_share_pct >= 0 and profit_share_pct <= 100));
  end if;
end $$;
comment on column public.member_pay.pay_schedule is 'mensal: tudo no dia 30. quinzenal: dias 15 e 30 (fevereiro: último dia).';
comment on column public.member_pay.advance_pct is 'Quinzenal: % do fixo pago no dia 15 (CLT padrão 40, PJ padrão 50).';

-- Próximo dia de pagamento da pessoa a partir de uma data (15 ou 30; fevereiro: último dia).
create or replace function public.staff_payday(_staff uuid, _from date)
returns date language plpgsql stable security definer set search_path to '' as $$
declare _s text; _y int; _m int; _d date;
begin
  _from := coalesce(_from, (now() at time zone 'America/Sao_Paulo')::date);
  select pay_schedule into _s from public.member_pay where staff_id = _staff;
  if coalesce(_s, 'mensal') <> 'quinzenal' then return public.team_payday(_from); end if;
  _y := extract(year from _from)::int; _m := extract(month from _from)::int;
  _d := public.safe_date(_y, _m, 15); if _d >= _from then return _d; end if;
  _d := public.safe_date(_y, _m, 30); if _d >= _from then return _d; end if;
  return public.safe_date(extract(year from (_from + interval '1 month'))::int, extract(month from (_from + interval '1 month'))::int, 15);
end $$;

-- Reembolso de quem pagou do bolso: cai no próximo dia de pagamento da pessoa (quinzenal pode ser dia 15).
create or replace function public.fin_entry_staff_payday()
returns trigger language plpgsql set search_path to '' as $$
declare _who uuid := new.paid_by_staff; _today date := (now() at time zone 'America/Sao_Paulo')::date; _d date;
begin
  if new.kind <> 'saida' or new.status <> 'pendente' or _who is null then return new; end if;
  if coalesce(new.external_id, '') like 'pay:%' or coalesce(new.external_id, '') like 'lucro:%' then return new; end if;
  if tg_op = 'UPDATE' and new.due_date is not distinct from old.due_date and new.paid_by_staff is not distinct from old.paid_by_staff then return new; end if;
  if new.due_date <> public.team_payday(new.due_date) then return new; end if; -- só mexe no "dia 30" automático
  _d := public.staff_payday(_who, greatest(_today, new.due_date - 31));
  if _d < new.due_date then new.due_date := _d; end if;
  return new;
end $$;

create or replace trigger fin_entries_staff_payday before insert or update of due_date, paid_by_staff on public.fin_entries
  for each row execute function public.fin_entry_staff_payday();

-- Avulso do membro: próximo dia de pagamento DA PESSOA.
create or replace function public.service_job_release(_job uuid, _paid_on date)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _j public.service_jobs; _cat uuid; _name text; _client_name text; _id uuid; _st text; _pay date; _nf boolean;
begin
  select * into _j from public.service_jobs where id = _job for update;
  if _j.id is null or _j.staff_id is null or coalesce(_j.staff_amount, 0) <= 0 or _j.payable_id is not null then return _j.payable_id; end if;
  _pay := public.staff_payday(_j.staff_id, greatest(coalesce(_paid_on, (now() at time zone 'America/Sao_Paulo')::date), (now() at time zone 'America/Sao_Paulo')::date));
  _nf := coalesce((select require_invoice from public.member_pay where staff_id = _j.staff_id), false);
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
      'A pagar pelo serviço avulso de ' || to_char(_j.job_date, 'DD/MM') || case when _j.invoice_id is not null then ', liberado quando o cliente pagou.' else '.' end
      || case when _nf then ' Pedir a nota fiscal antes de pagar.' else '' end)
    returning id into _id;
  end if;
  update public.service_jobs set payable_id = _id, staff_pay_date = _pay where id = _j.id;
  return _id;
end $$;

-- Valor do membro por tipo de produção (freela). Sem valor: null (vale a parte da empresa).
create or replace function public.staff_job_rate(_staff uuid, _skill text)
returns numeric language sql stable security definer set search_path to '' as $$
  select nullif((p.job_rates ->> lower(_skill))::numeric, 0) from public.member_pay p
  where p.staff_id = _staff and (public.can_finance('peformake') or public.can_finance('ellcazo'))
$$;

-- Lançar avulso: valor do membro pela tabela dele quando não foi digitado; dia de pagamento da pessoa.
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
  _pct numeric := coalesce((select job_company_pct from public.team_settings where id), 25);
  _due date; _pay date; _id uuid := gen_random_uuid(); _inv uuid; _pay_id uuid; _client_name text;
begin
  if not public.can_finance(_unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _title is null or length(_title) < 2 then raise exception 'Escreva o serviço' using errcode = '22023'; end if;
  if _staff is not null and _staff_amount <= 0 then
    _staff_amount := coalesce((select nullif((job_rates ->> _skill)::numeric, 0) from public.member_pay where staff_id = _staff), 0);
  end if;
  if _client_amount <= 0 and _staff_amount <= 0 then raise exception 'Informe o valor' using errcode = '22023'; end if;
  if _staff is not null and _staff_amount <= 0 and _client_amount > 0 then
    _staff_amount := round(_client_amount * (100 - _pct) / 100, 2);
  end if;
  if _staff_amount > 0 and _staff is null then raise exception 'Escolha quem faz o serviço' using errcode = '22023'; end if;
  select name into _client_name from public.clients where id = _client;
  if _client_name is null then raise exception 'Cliente não encontrado' using errcode = '22023'; end if;

  select max(due_date) into _due from public.invoices
  where client_id = _client and source = 'mensalidade' and status in ('pendente', 'vencido') and date_trunc('month', due_date) = date_trunc('month', _date);
  _due := coalesce(_due, greatest(_date, (now() at time zone 'America/Sao_Paulo')::date));
  _pay := case when _staff is not null then public.staff_payday(_staff, _due) else public.team_payday(_due) end;

  if _client_amount > 0 then
    insert into public.invoices (client_id, unit, description, amount, due_date, source, ref, created_by)
    values (_client, _unit, left(_title || ' · ' || to_char(_date, 'DD/MM'), 200), _client_amount, _due, 'avulso', 'job:' || _id, (select auth.uid()))
    returning id into _inv;
  end if;

  insert into public.service_jobs (id, client_id, unit, skill, title, job_date, client_amount, staff_id, staff_amount, staff_pay_date, invoice_id, payable_id, created_by)
  values (_id, _client, _unit, _skill, _title, _date, _client_amount, _staff, _staff_amount, _pay, _inv, null, (select auth.uid()));

  if _staff is not null then
    update public.staff_members set skills = array(select distinct unnest(skills || _skill)) where id = _staff and not (_skill = any(skills));
    if _inv is null and _staff_amount > 0 then
      _pay_id := public.service_job_release(_id, (now() at time zone 'America/Sao_Paulo')::date);
    end if;
  end if;

  if _inv is not null then perform public.invoice_group_auto(); end if;
  return _id;
end $$;

-- Remuneração do membro (agora com tipo de contrato e forma de pagamento). Sem cadastro: contract = null ("definir").
create or replace function public.member_ote(_staff uuid, _month date default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  _m date := date_trunc('month', coalesce(_month, (now() at time zone 'America/Sao_Paulo')::date))::date;
  _p public.member_pay; _role text; _min int; _cap int; _goals jsonb; _att numeric; _earned numeric := 0; _var_on boolean;
begin
  if not (public.has_role('admin') or exists (select 1 from public.staff_members where id = _staff and profile_id = (select auth.uid()))) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  select * into _p from public.member_pay where staff_id = _staff;
  _role := public.member_goal_role(_staff);
  select coalesce(var_min_pct, 70), coalesce(var_cap_pct, 120) into _min, _cap from public.team_settings where id;
  _var_on := _p.contract = 'pj' or (_p.contract = 'clt' and _p.variable_enabled);

  with base as (
    select g.key, g.target, g.weight, 'pessoal' as origem from public.member_pay_goals g where g.staff_id = _staff
    union all
    select r.key, r.target, 1, 'area' from public.role_goals r
    where r.month = _m and r.role = _role and not exists (select 1 from public.member_pay_goals g where g.staff_id = _staff)
  ), val as (
    select b.*, coalesce(public.role_goal_value(b.key, _m, coalesce((select r.info from public.role_goals r where r.month = _m and r.role = _role and r.key = b.key), '{}')), 0) as actual
    from base b
  ), pct as (
    select v.*, least(_cap, case
      when v.key in ('saidas', 'devendo', 'inadimplencia', 'aprovacao_parada') then
        case when v.actual <= v.target then 100 when v.actual = 0 then 100 else greatest(0, round(100 * v.target / nullif(v.actual, 0))) end
      when v.target <= 0 then 100
      else round(100 * v.actual / v.target) end) as pct
    from val v
  )
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'target', target, 'actual', actual, 'pct', pct, 'weight', weight, 'origem', origem) order by origem, key), '[]'),
         case when sum(weight) > 0 then round(sum(pct * weight) / sum(weight)) else null end
    into _goals, _att from pct;

  if coalesce(_var_on, false) and _att is not null and _att >= _min then _earned := round(coalesce(_p.variable_target, 0) * least(_att, _cap) / 100, 2); end if;
  return jsonb_build_object(
    'month', _m, 'goal_role', _role, 'min_pct', _min, 'cap_pct', _cap,
    'contract', _p.contract, 'base_salary', coalesce(_p.base_salary, 0), 'variable_target', case when _var_on then coalesce(_p.variable_target, 0) else 0 end,
    'ote', coalesce(_p.base_salary, 0) + case when _var_on then coalesce(_p.variable_target, 0) else 0 end,
    'pay_day', _p.pay_day, 'unit', coalesce(_p.unit, 'peformake'), 'notes', _p.notes,
    'pay_schedule', coalesce(_p.pay_schedule, 'mensal'),
    'advance_pct', coalesce(_p.advance_pct, case when _p.contract = 'clt' then 40 else 50 end),
    'variable_enabled', coalesce(_p.variable_enabled, false), 'require_invoice', coalesce(_p.require_invoice, false),
    'profit_share_pct', _p.profit_share_pct, 'profit_period', coalesce(_p.profit_period, 'mensal'), 'job_rates', coalesce(_p.job_rates, '{}'::jsonb),
    'has_own_goals', exists (select 1 from public.member_pay_goals g where g.staff_id = _staff),
    'goals', _goals, 'attainment', _att, 'variable_earned', _earned, 'total_month', coalesce(_p.base_salary, 0) + _earned);
end $$;

-- Salvar remuneração com o tipo de contrato. Reaproveita member_pay_save (fixo, variável, metas) e grava o resto.
create or replace function public.member_pay_config_save(_staff uuid, _data jsonb)
returns void language plpgsql security definer set search_path to '' as $$
declare
  _c text := nullif(_data->>'contract', '');
  _sched text := coalesce(nullif(_data->>'pay_schedule', ''), 'mensal');
  _adv numeric := nullif(_data->>'advance_pct', '')::numeric;
  _var boolean := coalesce((_data->>'variable_enabled')::boolean, false);
  _d jsonb := _data;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _c is null or _c not in ('clt', 'pj', 'freela', 'socio') then raise exception 'Escolha o tipo de contrato' using errcode = '22023'; end if;
  if _sched not in ('mensal', 'quinzenal') then raise exception 'Escolha Mensal ou Quinzenal' using errcode = '22023'; end if;
  if _adv is not null and (_adv <= 0 or _adv >= 100) then raise exception 'O adiantamento é um percentual entre 1 e 99' using errcode = '22023'; end if;
  if _c in ('freela', 'socio') then _sched := 'mensal'; end if;
  if _c = 'freela' then _d := _d || jsonb_build_object('base_salary', 0); end if;
  if not (_c = 'pj' or (_c = 'clt' and _var)) then _d := _d || jsonb_build_object('variable_target', 0, 'goals', '[]'::jsonb); end if;
  perform public.member_pay_save(_staff, _d || jsonb_build_object('pay_day', ''));
  update public.member_pay set
    pay_schedule = _sched,
    advance_pct = case when _sched = 'quinzenal' then coalesce(_adv, case when _c = 'clt' then 40 else 50 end) else null end,
    variable_enabled = (_c = 'clt' and _var),
    require_invoice = (_c = 'pj' and coalesce((_data->>'require_invoice')::boolean, false)),
    profit_share_pct = case when _c = 'socio' then nullif(_data->>'profit_share_pct', '')::numeric end,
    profit_period = case when _c = 'socio' and _data->>'profit_period' = 'trimestral' then 'trimestral' else 'mensal' end,
    job_rates = case when _c = 'freela' then coalesce((select jsonb_object_agg(k, v::numeric) from jsonb_each_text(coalesce(_data->'job_rates', '{}'::jsonb)) e(k, v)
                 where v ~ '^[0-9]+(\.[0-9]+)?$' and v::numeric > 0), '{}'::jsonb) else '{}'::jsonb end
  where staff_id = _staff;
end $$;

-- Gera as contas a pagar do mês da equipe (fixo, adiantamento quinzenal, variável do mês anterior, pró-labore).
-- Idempotente: não duplica (external_id pay:<membro>:<AAAA-MM>:<parte>). Freela não tem fixo; lucro do sócio é à parte.
create or replace function public.team_pay_generate(_month date default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  _m date := date_trunc('month', coalesce(_month, (now() at time zone 'America/Sao_Paulo')::date))::date;
  _d15 date := public.safe_date(extract(year from _m)::int, extract(month from _m)::int, 15);
  _d30 date := public.safe_date(extract(year from _m)::int, extract(month from _m)::int, 30);
  _tag text := to_char(_m, 'YYYY-MM');
  _r record; _cat uuid; _adv numeric; _var numeric; _n int := 0; _k int; _nf text;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  for _r in select s.id, s.full_name, p.* from public.staff_members s join public.member_pay p on p.staff_id = s.id where s.is_active loop
    select id into _cat from public.fin_categories where unit = _r.unit and kind = 'saida' and name = 'Equipe' and is_active limit 1;
    _nf := case when _r.require_invoice then ' Pedir a nota fiscal antes de pagar.' else '' end;
    if _r.contract in ('clt', 'pj', 'socio') and coalesce(_r.base_salary, 0) > 0 then
      if _r.pay_schedule = 'quinzenal' and _r.contract <> 'socio' then
        _adv := round(_r.base_salary * coalesce(_r.advance_pct, case when _r.contract = 'clt' then 40 else 50 end) / 100, 2);
        insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, status, source, external_id, staff_id, created_by, notes)
        values (_r.unit, 'saida', _cat, left(_r.full_name || ' · adiantamento ' || to_char(_m, 'MM/YYYY'), 200), _adv, _d15, 'pendente', 'manual',
          'pay:' || _r.id || ':' || _tag || ':fixo1', _r.id, (select auth.uid()), 'Quinzenal: ' || coalesce(_r.advance_pct, case when _r.contract = 'clt' then 40 else 50 end) || '% do fixo no dia 15.' || _nf)
        on conflict (unit, source, external_id) where external_id is not null do nothing;
        get diagnostics _k = row_count; _n := _n + _k;
        insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, status, source, external_id, staff_id, created_by, notes)
        values (_r.unit, 'saida', _cat, left(_r.full_name || ' · saldo do fixo ' || to_char(_m, 'MM/YYYY'), 200), _r.base_salary - _adv, _d30, 'pendente', 'manual',
          'pay:' || _r.id || ':' || _tag || ':fixo2', _r.id, (select auth.uid()), 'Quinzenal: saldo do fixo no dia 30.' || _nf)
        on conflict (unit, source, external_id) where external_id is not null do nothing;
        get diagnostics _k = row_count; _n := _n + _k;
      else
        insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, status, source, external_id, staff_id, created_by, notes)
        values (_r.unit, 'saida', _cat, left(_r.full_name || case when _r.contract = 'socio' then ' · pró-labore ' else ' · fixo ' end || to_char(_m, 'MM/YYYY'), 200), _r.base_salary, _d30, 'pendente', 'manual',
          'pay:' || _r.id || ':' || _tag || ':fixo', _r.id, (select auth.uid()), 'Mensal: dia 30.' || _nf)
        on conflict (unit, source, external_id) where external_id is not null do nothing;
        get diagnostics _k = row_count; _n := _n + _k;
      end if;
    end if;
    if _r.contract = 'pj' or (_r.contract = 'clt' and _r.variable_enabled) then
      _var := coalesce((public.member_ote(_r.id, (_m - interval '1 month')::date) ->> 'variable_earned')::numeric, 0);
      if _var > 0 then
        insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, status, source, external_id, staff_id, created_by, notes)
        values (_r.unit, 'saida', _cat, left(_r.full_name || ' · variável de ' || to_char(_m - interval '1 month', 'MM/YYYY'), 200), _var, _d30, 'pendente', 'manual',
          'pay:' || _r.id || ':' || _tag || ':var', _r.id, (select auth.uid()), 'Variável pelas metas do mês anterior.' || _nf)
        on conflict (unit, source, external_id) where external_id is not null do nothing;
        get diagnostics _k = row_count; _n := _n + _k;
      end if;
    end if;
  end loop;
  return jsonb_build_object('month', _m, 'created', _n);
end $$;

-- Participação no lucro do sócio: só calcula. Vira conta a pagar apenas com partner_profit_approve (admin).
create or replace function public.partner_profit(_staff uuid, _ref date default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _p public.member_pay; _ref2 date; _start date; _end date; _in numeric; _out numeric; _res numeric; _val numeric; _launched boolean;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _p from public.member_pay where staff_id = _staff;
  if _p.staff_id is null or _p.contract <> 'socio' or coalesce(_p.profit_share_pct, 0) <= 0 then return null; end if;
  -- Padrão: o último período fechado.
  _ref2 := coalesce(_ref, ((now() at time zone 'America/Sao_Paulo')::date - interval '1 month')::date);
  if _p.profit_period = 'trimestral' then
    _start := date_trunc('quarter', _ref2)::date; _end := (date_trunc('quarter', _ref2) + interval '3 months - 1 day')::date;
  else
    _start := date_trunc('month', _ref2)::date; _end := (date_trunc('month', _ref2) + interval '1 month - 1 day')::date;
  end if;
  select coalesce(sum(amount) filter (where kind = 'entrada'), 0), coalesce(sum(amount) filter (where kind = 'saida'), 0) into _in, _out
  from public.fin_entries where unit = _p.unit and status = 'pago' and paid_at between _start and _end;
  _res := _in - _out;
  _val := round(greatest(_res, 0) * _p.profit_share_pct / 100, 2);
  _launched := exists (select 1 from public.fin_entries where unit = _p.unit and source = 'manual' and external_id = 'lucro:' || _staff || ':' || _start);
  return jsonb_build_object('unit', _p.unit, 'period', _p.profit_period, 'start', _start, 'end', _end, 'entradas', _in, 'saidas', _out,
    'resultado', _res, 'pct', _p.profit_share_pct, 'valor', _val, 'launched', _launched);
end $$;

create or replace function public.partner_profit_approve(_staff uuid, _ref date default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _x jsonb; _cat uuid; _name text; _id uuid;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  _x := public.partner_profit(_staff, _ref);
  if _x is null then raise exception 'Este membro não tem participação no lucro' using errcode = '22023'; end if;
  if (_x->>'valor')::numeric <= 0 then raise exception 'Sem lucro no período: nada a pagar' using errcode = '22023'; end if;
  if (_x->>'launched')::boolean then raise exception 'A participação deste período já foi lançada' using errcode = '22023'; end if;
  select full_name into _name from public.staff_members where id = _staff;
  select id into _cat from public.fin_categories where unit = _x->>'unit' and kind = 'saida' and name = 'Equipe' and is_active limit 1;
  insert into public.fin_entries (unit, kind, category_id, description, amount, due_date, status, source, external_id, staff_id, created_by, notes)
  values (_x->>'unit', 'saida', _cat, left(coalesce(_name, 'Sócio') || ' · participação no lucro ' || to_char((_x->>'start')::date, 'DD/MM') || ' a ' || to_char((_x->>'end')::date, 'DD/MM/YYYY'), 200),
    (_x->>'valor')::numeric, public.staff_payday(_staff, (now() at time zone 'America/Sao_Paulo')::date), 'pendente', 'manual',
    'lucro:' || _staff || ':' || (_x->>'start'), _staff, (select auth.uid()),
    'Aprovado pelo admin: ' || (_x->>'pct') || '% de um resultado de R$ ' || (_x->>'resultado') || ' (entradas pagas menos saídas pagas).')
  returning id into _id;
  return _id;
end $$;

-- Lista de membros: tipo de contrato e forma de pagamento (só admin; a função já é só de admin).
create or replace function public.access_members()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(m order by (m->>'is_master')::boolean desc, (m->>'level' = 'total') desc, (m->>'active')::boolean desc, m->>'name')
    from (
      select jsonb_build_object(
        'id', s.id, 'name', s.full_name, 'job_title', s.job_title, 'main_role', s.main_role, 'email', coalesce(p.email, s.email), 'phone', s.phone,
        'skills', coalesce(s.skills, '{}'), 'avatar_path', s.avatar_path, 'active', s.is_active,
        'profile_id', p.id, 'login_active', coalesce(p.is_active, false), 'is_master', coalesce(p.is_master, false),
        'roles', coalesce((select array_agg(r.role) from public.user_roles r where r.user_id = p.id), '{}'),
        'area_admin', coalesce(p.area_admin, '{}'),
        'contract', (select mp.contract from public.member_pay mp where mp.staff_id = s.id),
        'pay_schedule', (select mp.pay_schedule from public.member_pay mp where mp.staff_id = s.id),
        'invited', exists (select 1 from public.access_invites i where s.email is not null and i.email = lower(s.email) and i.accepted_at is null),
        'level', case
          when p.id is null then case when exists (select 1 from public.access_invites i where s.email is not null and i.email = lower(s.email) and i.accepted_at is null)
            then (select case when 'admin' = any(i.roles) then 'total' when cardinality(i.area_admin) > 0 then 'area' else 'user' end from public.access_invites i where i.email = lower(s.email)) else 'none' end
          when not p.is_active then 'none'
          when exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin') then 'total'
          when cardinality(p.area_admin) > 0 then 'area'
          else 'user' end
      ) m
      from public.staff_members s left join public.profiles p on p.id = s.profile_id
      union all
      select jsonb_build_object('id', null, 'name', coalesce(nullif(p.full_name, ''), p.email), 'job_title', null, 'main_role', null, 'email', p.email, 'phone', null,
        'skills', '{}'::text[], 'avatar_path', null, 'active', true, 'profile_id', p.id, 'login_active', p.is_active, 'is_master', p.is_master,
        'roles', coalesce((select array_agg(r.role) from public.user_roles r where r.user_id = p.id), '{}'), 'area_admin', p.area_admin, 'invited', false,
        'contract', null, 'pay_schedule', null,
        'level', case when not p.is_active then 'none' when exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin') then 'total' when cardinality(p.area_admin) > 0 then 'area' else 'user' end)
      from public.profiles p where not exists (select 1 from public.staff_members s where s.profile_id = p.id)
    ) x), '[]'::jsonb);
end $$;

revoke execute on function public.member_deactivate(uuid, boolean) from public, anon;
revoke execute on function public.staff_job_rate(uuid, text) from public, anon;
revoke execute on function public.member_pay_config_save(uuid, jsonb) from public, anon;
revoke execute on function public.team_pay_generate(date) from public, anon;
revoke execute on function public.partner_profit(uuid, date) from public, anon;
revoke execute on function public.partner_profit_approve(uuid, date) from public, anon;
grant execute on function public.member_deactivate(uuid, boolean) to authenticated;
grant execute on function public.staff_job_rate(uuid, text) to authenticated;
grant execute on function public.member_pay_config_save(uuid, jsonb) to authenticated;
grant execute on function public.team_pay_generate(date) to authenticated;
grant execute on function public.partner_profit(uuid, date) to authenticated;
grant execute on function public.partner_profit_approve(uuid, date) to authenticated;
grant execute on function public.staff_payday(uuid, date) to authenticated;
