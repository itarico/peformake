-- CPF e endereço do membro ficam numa tabela só do administrador (staff_members é lida pela equipe toda).
-- As colunas staff_members.document/address criadas na 220000 ficam vazias e sem uso.
create table if not exists public.staff_private (
  staff_id uuid primary key references public.staff_members(id),
  document text,
  address text,
  updated_at timestamptz not null default now()
);
alter table public.staff_private enable row level security;
create policy staff_private_admin_read on public.staff_private for select to authenticated using (public.has_role('admin'));

do $do$
declare d text;
begin
  d := pg_get_functiondef('public.staff_contract_create(uuid,jsonb)'::regprocedure);
  d := replace(d, $x$_doc := coalesce(nullif(_doc, ''), regexp_replace(coalesce(_s.document, ''), '\D', '', 'g'));$x$,
                  $x$_doc := coalesce(nullif(_doc, ''), (select regexp_replace(coalesce(x.document, ''), '\D', '', 'g') from public.staff_private x where x.staff_id = _staff), '');$x$);
  d := replace(d, $x$update public.staff_members set email = coalesce(email, _email), document = _doc, address = coalesce(_addr, address) where id = _staff;$x$,
                  $x$update public.staff_members set email = coalesce(email, _email) where id = _staff;
  insert into public.staff_private (staff_id, document, address) values (_staff, _doc, _addr)
    on conflict (staff_id) do update set document = excluded.document, address = coalesce(excluded.address, staff_private.address), updated_at = now();$x$);
  execute d;
  d := pg_get_functiondef('public.staff_contract_compose(uuid,text)'::regprocedure);
  d := replace(d, $x$_doc := regexp_replace(coalesce(_s.document, ''), '\D', '', 'g');$x$,
                  $x$select x.document, x.address into _s.document, _s.address from public.staff_private x where x.staff_id = _staff;
  _doc := regexp_replace(coalesce(_s.document, ''), '\D', '', 'g');$x$);
  execute d;
end $do$;

-- Dados do contrato do membro para a tela (só administrador).
create or replace function public.staff_contract_info(_staff uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select case when public.has_role('admin') then jsonb_build_object(
    'email', s.email, 'document', x.document, 'address', x.address,
    'contract', m.contract, 'unit', coalesce(m.unit, 'peformake'),
    'missing', public.company_profile_missing(coalesce(m.unit, 'peformake')),
    'usage', public.assinafy_month_usage(),
    'enabled', coalesce((select c.enabled from public.contract_settings c where c.id), false),
    'last', (select to_jsonb(d) - 'body' from public.staff_contract_docs d where d.staff_id = _staff and d.status <> 'cancelado' order by d.created_at desc limit 1)
  ) end
  from public.staff_members s
  left join public.staff_private x on x.staff_id = s.id
  left join public.member_pay m on m.staff_id = s.id
  where s.id = _staff;
$$;
