-- Remuneração de cada membro: contrato, fixo, variável (OTE = fixo + variável cheia) e as metas que liberam a variável.
-- Valores só para administrador (e a própria pessoa vê o dela).

alter table public.team_settings add column if not exists var_min_pct int not null default 70;   -- abaixo disso, variável zero
alter table public.team_settings add column if not exists var_cap_pct int not null default 120;  -- acima disso não cresce

create table if not exists public.member_pay (
  staff_id uuid primary key references public.staff_members(id) on delete cascade,
  contract text not null default 'pj' check (contract in ('clt', 'pj', 'freela', 'socio')),
  base_salary numeric not null default 0 check (base_salary >= 0),
  variable_target numeric not null default 0 check (variable_target >= 0),
  pay_day int check (pay_day between 1 and 31),
  unit text not null default 'peformake' check (unit in ('peformake', 'ellcazo')),
  goal_role text,   -- área das metas (gestao, comercial, relacionamento, trafego, conteudo, audiovisual, financeiro); vazio = pela função
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
alter table public.member_pay enable row level security;
drop policy if exists member_pay_admin on public.member_pay;
create policy member_pay_admin on public.member_pay for select to authenticated using (public.has_role('admin'));

-- Metas próprias de uma pessoa (substituem as da área no cálculo da variável).
create table if not exists public.member_pay_goals (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_members(id) on delete cascade,
  key text not null,
  target numeric not null check (target >= 0),
  weight int not null default 1 check (weight between 1 and 10),
  unique (staff_id, key)
);
alter table public.member_pay_goals enable row level security;
drop policy if exists member_pay_goals_admin on public.member_pay_goals;
create policy member_pay_goals_admin on public.member_pay_goals for select to authenticated using (public.has_role('admin'));

-- Área das metas pela função no sistema (mesma régua da tela de Metas).
create or replace function public.member_goal_role(_staff uuid)
returns text language sql stable security definer set search_path to '' as $$
  select coalesce(nullif(p.goal_role, ''), case s.main_role
    when 'head_marketing' then 'relacionamento' when 'sdr' then 'comercial' when 'closer' then 'comercial' when 'traffic_manager' then 'trafego'
    when 'social_media' then 'conteudo' when 'designer' then 'conteudo' when 'videomaker' then 'audiovisual' when 'editor' then 'audiovisual'
    when 'ellcazo' then 'audiovisual' when 'admin' then 'gestao' else 'gestao' end)
  from public.staff_members s left join public.member_pay p on p.staff_id = s.id where s.id = _staff;
$$;

-- Cálculo do mês de uma pessoa: metas (próprias ou da área), quanto de cada uma, atingimento e variável a receber.
create or replace function public.member_ote(_staff uuid, _month date default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  _m date := date_trunc('month', coalesce(_month, (now() at time zone 'America/Sao_Paulo')::date))::date;
  _p public.member_pay; _role text; _min int; _cap int; _goals jsonb; _att numeric; _earned numeric := 0;
begin
  if not (public.has_role('admin') or exists (select 1 from public.staff_members where id = _staff and profile_id = (select auth.uid()))) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  select * into _p from public.member_pay where staff_id = _staff;
  _role := public.member_goal_role(_staff);
  select coalesce(var_min_pct, 70), coalesce(var_cap_pct, 120) into _min, _cap from public.team_settings where id;

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

  if _att is not null and _att >= _min then _earned := round(coalesce(_p.variable_target, 0) * least(_att, _cap) / 100, 2); end if;
  return jsonb_build_object(
    'month', _m, 'goal_role', _role, 'min_pct', _min, 'cap_pct', _cap,
    'contract', coalesce(_p.contract, 'pj'), 'base_salary', coalesce(_p.base_salary, 0), 'variable_target', coalesce(_p.variable_target, 0),
    'ote', coalesce(_p.base_salary, 0) + coalesce(_p.variable_target, 0), 'pay_day', _p.pay_day, 'unit', coalesce(_p.unit, 'peformake'), 'notes', _p.notes,
    'has_own_goals', exists (select 1 from public.member_pay_goals g where g.staff_id = _staff),
    'goals', _goals, 'attainment', _att, 'variable_earned', _earned, 'total_month', coalesce(_p.base_salary, 0) + _earned);
end $$;

-- Visão da equipe inteira (admin): uma linha por membro ativo.
create or replace function public.team_pay_overview(_month date default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('staff_id', s.id, 'name', s.full_name, 'avatar_path', s.avatar_path, 'job_title', s.job_title, 'main_role', s.main_role,
      'has_pay', exists (select 1 from public.member_pay p where p.staff_id = s.id)) || public.member_ote(s.id, _month) order by s.full_name)
    from public.staff_members s where s.is_active), '[]');
end $$;

create or replace function public.member_pay_save(_staff uuid, _data jsonb)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  insert into public.member_pay (staff_id, contract, base_salary, variable_target, pay_day, unit, goal_role, notes, updated_at, updated_by)
  values (_staff, coalesce(_data->>'contract', 'pj'), coalesce((_data->>'base_salary')::numeric, 0), coalesce((_data->>'variable_target')::numeric, 0),
    nullif(_data->>'pay_day', '')::int, coalesce(_data->>'unit', 'peformake'), nullif(_data->>'goal_role', ''), nullif(trim(coalesce(_data->>'notes', '')), ''), now(), (select auth.uid()))
  on conflict (staff_id) do update set contract = excluded.contract, base_salary = excluded.base_salary, variable_target = excluded.variable_target,
    pay_day = excluded.pay_day, unit = excluded.unit, goal_role = excluded.goal_role, notes = excluded.notes, updated_at = now(), updated_by = excluded.updated_by;
  if _data ? 'goals' then
    delete from public.member_pay_goals where staff_id = _staff;
    insert into public.member_pay_goals (staff_id, key, target, weight)
    select _staff, g->>'key', (g->>'target')::numeric, coalesce((g->>'weight')::int, 1) from jsonb_array_elements(_data->'goals') g
    where coalesce(g->>'key', '') <> '' and (g->>'target') is not null
    on conflict (staff_id, key) do update set target = excluded.target, weight = excluded.weight;
  end if;
end $$;

-- Regras gerais: gatilho e teto da variável junto com as regras que já existiam.
create or replace function public.team_pay_rules_save(_min int, _cap int)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _min < 0 or _min > 100 or _cap < 100 or _cap > 300 then raise exception 'Valores fora do limite' using errcode = '22023'; end if;
  update public.team_settings set var_min_pct = _min, var_cap_pct = _cap, updated_at = now(), updated_by = (select auth.uid()) where id;
end $$;

revoke execute on function public.member_goal_role(uuid) from public, anon;
revoke execute on function public.member_ote(uuid, date) from public, anon;
revoke execute on function public.team_pay_overview(date) from public, anon;
revoke execute on function public.member_pay_save(uuid, jsonb) from public, anon;
revoke execute on function public.team_pay_rules_save(int, int) from public, anon;
grant execute on function public.member_goal_role(uuid) to authenticated;
grant execute on function public.member_ote(uuid, date) to authenticated;
grant execute on function public.team_pay_overview(date) to authenticated;
grant execute on function public.member_pay_save(uuid, jsonb) to authenticated;
grant execute on function public.team_pay_rules_save(int, int) to authenticated;
