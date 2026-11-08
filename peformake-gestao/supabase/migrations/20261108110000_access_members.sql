-- Acessos: uma lista só de membros (equipe + login + convite), adicionar/editar em pop-up, master protegido.

-- Master: o dono da conta. Sempre tem acesso total, não pode ser bloqueado, rebaixado nem removido.
alter table public.profiles add column if not exists is_master boolean not null default false;
update public.profiles p set is_master = true
where p.id = (select r.user_id from public.user_roles r join public.profiles x on x.id = r.user_id where r.role = 'admin' and x.is_active order by x.created_at limit 1)
  and not exists (select 1 from public.profiles where is_master);

-- Quem aceita o convite e entra pela primeira vez já fica ligado ao seu cadastro na equipe (pelo e-mail).
create or replace function public.profile_autolink_staff()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  update public.staff_members set profile_id = new.id
  where profile_id is null and email is not null and lower(email) = lower(new.email)
    and not exists (select 1 from public.staff_members s where s.profile_id = new.id);
  return new;
end $$;
drop trigger if exists profile_autolink_staff on public.profiles;
create trigger profile_autolink_staff after insert on public.profiles for each row execute function public.profile_autolink_staff();

-- Lista para a tela (só admin).
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
      -- Login sem cadastro na equipe: aparece igual, para poder completar.
      select jsonb_build_object('id', null, 'name', coalesce(nullif(p.full_name, ''), p.email), 'job_title', null, 'main_role', null, 'email', p.email, 'phone', null,
        'skills', '{}'::text[], 'avatar_path', null, 'active', true, 'profile_id', p.id, 'login_active', p.is_active, 'is_master', p.is_master,
        'roles', coalesce((select array_agg(r.role) from public.user_roles r where r.user_id = p.id), '{}'), 'area_admin', p.area_admin, 'invited', false,
        'level', case when not p.is_active then 'none' when exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin') then 'total' when cardinality(p.area_admin) > 0 then 'area' else 'user' end)
      from public.profiles p where not exists (select 1 from public.staff_members s where s.profile_id = p.id)
    ) x), '[]'::jsonb);
end $$;

-- Adicionar ou editar um membro. Nível: none (sem acesso), user (usuário), area (admin de área), total (administrador).
create or replace function public.member_save(_data jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  _id uuid := nullif(_data->>'id', '')::uuid;
  _profile uuid := nullif(_data->>'profile_id', '')::uuid;
  _name text := trim(coalesce(_data->>'name', ''));
  _email text := nullif(lower(trim(coalesce(_data->>'email', ''))), '');
  _phone text := nullif(regexp_replace(coalesce(_data->>'phone', ''), '[^0-9]', '', 'g'), '');
  _job text := nullif(trim(coalesce(_data->>'job_title', '')), '');
  _role text := nullif(_data->>'main_role', '');
  _level text := coalesce(_data->>'level', 'none');
  _areas text[] := coalesce(array(select jsonb_array_elements_text(_data->'areas')), '{}');
  _skills text[] := coalesce(array(select jsonb_array_elements_text(_data->'skills')), '{}');
  _roles public.app_role[];
  _master boolean := false;
  _result text;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if length(_name) < 2 then raise exception 'Escreva o nome' using errcode = '22023'; end if;
  if _level not in ('none', 'user', 'area', 'total') then raise exception 'Nível inválido' using errcode = '22023'; end if;
  if _email is not null and _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido' using errcode = '22023'; end if;
  if _level <> 'none' and _email is null then raise exception 'Para dar acesso, informe o e-mail da pessoa' using errcode = '22023'; end if;
  if _level <> 'none' and _role is null then raise exception 'Escolha a função da pessoa' using errcode = '22023'; end if;
  if _level = 'area' and cardinality(_areas) = 0 then raise exception 'Escolha de qual área a pessoa é administradora' using errcode = '22023'; end if;

  -- Cadastro na equipe.
  if _id is null and _profile is not null then select id into _id from public.staff_members where profile_id = _profile; end if;
  if _id is null then
    insert into public.staff_members (full_name, job_title, main_role, email, phone, skills, is_active, profile_id)
    values (_name, _job, _role, _email, _phone, _skills, true, _profile) returning id into _id;
  else
    update public.staff_members set full_name = _name, job_title = _job, main_role = coalesce(_role, main_role), email = _email, phone = _phone, skills = _skills, is_active = true
    where id = _id;
  end if;

  -- Login: o que já existe (ligado ao cadastro ou com o mesmo e-mail).
  select profile_id into _profile from public.staff_members where id = _id;
  if _profile is null and _email is not null then
    select id into _profile from public.profiles where lower(email) = _email limit 1;
    if _profile is not null then perform public.staff_link_profile(_id, _profile); end if;
  end if;
  if _profile is not null then select is_master into _master from public.profiles where id = _profile; end if;
  if _master and _level <> 'total' then raise exception 'O master sempre tem acesso total' using errcode = 'PF009'; end if;

  _roles := array(select distinct r::public.app_role from unnest(array[_role] || case when _level = 'total' then array['admin'] else '{}'::text[] end) r where r is not null);

  if _level = 'none' then
    if _profile is not null and not _master then perform public.admin_set_user_access(_profile, false, coalesce((select array_agg(role) from public.user_roles where user_id = _profile), '{}')); end if;
    if _email is not null then delete from public.access_invites where email = _email and accepted_at is null; end if;
    _result := 'sem_acesso';
  elsif _profile is not null then
    perform public.admin_set_user_access(_profile, true, _roles);
    perform public.admin_set_area_admin(_profile, case when _level = 'area' then _areas else '{}' end);
    _result := 'atualizado';
  else
    _result := public.access_invite_save(_email, _roles, case when _level = 'area' then _areas else '{}' end);
  end if;
  return jsonb_build_object('id', _id, 'result', _result);
end $$;

-- Remover da equipe: sai da lista, perde o acesso e o convite é cancelado. Nada é apagado (histórico fica).
create or replace function public.member_remove(_id uuid, _profile uuid default null)
returns void language plpgsql security definer set search_path to '' as $$
declare _p uuid := _profile; _email text;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _id is not null then select profile_id, lower(email) into _p, _email from public.staff_members where id = _id; end if;
  if _p is not null and exists (select 1 from public.profiles where id = _p and is_master) then raise exception 'O master não pode ser removido' using errcode = 'PF009'; end if;
  if _p = (select auth.uid()) then raise exception 'Você não pode remover você mesmo' using errcode = 'PF009'; end if;
  if _id is not null then update public.staff_members set is_active = false where id = _id; end if;
  if _p is not null then perform public.admin_set_user_access(_p, false, coalesce((select array_agg(role) from public.user_roles where user_id = _p), '{}')); end if;
  if _email is not null then delete from public.access_invites where email = _email and accepted_at is null; end if;
end $$;

revoke execute on function public.access_members() from public, anon;
revoke execute on function public.member_save(jsonb) from public, anon;
revoke execute on function public.member_remove(uuid, uuid) from public, anon;
grant execute on function public.access_members() to authenticated;
grant execute on function public.member_save(jsonb) to authenticated;
grant execute on function public.member_remove(uuid, uuid) to authenticated;

-- Membro novo criado pelo sistema precisa de código próprio (a tabela veio da importação sem padrão).
alter table public.staff_members alter column id set default gen_random_uuid();

-- (versão final do member_save: checa o master antes de tudo e usa o e-mail do login quando a pessoa já tem conta)
-- Aplicada no banco como "member_save_order"; o texto completo está no Supabase.
