-- Acesso de membros honesto: o selo só diz "Convite enviado" quando um e-mail saiu de verdade.
-- sent_at: quando a função member-access mandou o e-mail de convite (ou de nova senha).
-- must_change_password: login criado com senha temporária; a pessoa troca no primeiro acesso.
alter table public.access_invites add column if not exists sent_at timestamptz;
alter table public.profiles add column if not exists must_change_password boolean not null default false;

-- A própria pessoa avisa que já trocou a senha (só tira a marca dela mesma).
create or replace function public.my_password_changed()
returns void language sql security definer set search_path to '' as $$
  update public.profiles set must_change_password = false where id = (select auth.uid());
$$;
revoke all on function public.my_password_changed() from public, anon;
grant execute on function public.my_password_changed() to authenticated;

-- Lista de membros: + invite_sent_at (e-mail que saiu de verdade), never_signed_in (login criado, nunca entrou), must_change_password.
CREATE OR REPLACE FUNCTION public.access_members()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
        'invite_sent_at', (select greatest(i.sent_at, (select max(o.sent_at) from public.email_outbox o where o.kind = 'convite' and o.to_email = i.email and o.status = 'sent'))
                           from public.access_invites i where i.email = lower(coalesce(p.email, s.email))),
        'never_signed_in', p.id is not null and (select u.last_sign_in_at is null from auth.users u where u.id = p.id),
        'must_change_password', coalesce(p.must_change_password, false),
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
        'invite_sent_at', null, 'never_signed_in', (select u.last_sign_in_at is null from auth.users u where u.id = p.id),
        'must_change_password', p.must_change_password,
        'contract', null, 'pay_schedule', null,
        'level', case when not p.is_active then 'none' when exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin') then 'total' when cardinality(p.area_admin) > 0 then 'area' else 'user' end)
      from public.profiles p where not exists (select 1 from public.staff_members s where s.profile_id = p.id)
    ) x), '[]'::jsonb);
end $function$;
