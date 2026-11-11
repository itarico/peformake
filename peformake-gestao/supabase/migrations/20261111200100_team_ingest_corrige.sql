-- Sincronização antiga (team_ingest): a parte da equipe por cliente quebrava (a chave de client_team agora inclui a função).
-- Corrigida e sem mexer em quem já foi editado no sistema.
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
    and exists (select 1 from public.staff_members s where s.id = (r ->> 'staff_id')::uuid and s.edited_at is null)
  on conflict (client_id, staff_id, role_in_client) do nothing;

  return (select count(*) from public.client_team);
end $$;
