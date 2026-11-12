-- PDFs da Peformake: Aprovar = enviar sozinho pelo Wasender (decisão do Italo, 12/11/2026) e anotações da reunião com o cliente.
-- Aplicada em 12/11/2026 (nuvem).
alter table public.client_assets add column if not exists approved_at timestamptz, add column if not exists approved_by uuid references public.profiles(id) on delete set null, add column if not exists sent_at timestamptz;

create or replace function public.agent_doc_approve(_asset uuid, _url text) returns integer
language plpgsql security definer set search_path = '' as $$
declare _a public.client_assets; _client text; _label text; _c record; _phone text; _n int := 0; _first text;
begin
  if not (public.has_role('admin') or public.has_role('head_marketing')) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select * into _a from public.client_assets where id = _asset and source = 'agente';
  if _a.id is null then raise exception 'Documento não encontrado' using errcode = 'PF004'; end if;
  if coalesce(_url, '') !~ '^https://' then raise exception 'Link inválido' using errcode = '22023'; end if;
  select trim(name) into _client from public.clients where id = _a.client_id;
  _label := regexp_replace(_a.name, '\.pdf$', '', 'i');
  update public.client_assets set approved_at = now(), approved_by = (select auth.uid()) where id = _asset;
  for _c in
    with contacts as (
      select regexp_replace(coalesce(cc.phone, ''), '[^0-9]', '', 'g') as phone, nullif(split_part(trim(coalesce(cc.name, '')), ' ', 1), '') as first
      from public.client_contacts cc where cc.client_id = _a.client_id and cc.gets_approvals and cc.phone is not null
    ), fallback as (
      select regexp_replace(coalesce(cl.phone, ''), '[^0-9]', '', 'g') as phone, null::text as first
      from public.clients cl where cl.id = _a.client_id and not exists (select 1 from contacts)
    )
    select distinct on (phone) phone, first from (select * from contacts union all select * from fallback) x order by phone, first nulls last
  loop
    _phone := _c.phone;
    if length(_phone) between 10 and 11 then _phone := '55' || _phone; end if;
    continue when _phone !~ '^[0-9]{12,15}$';
    _first := coalesce(_c.first, '');
    insert into public.notification_outbox (kind, client_id, to_phone, message, dedupe_key)
    values ('agent_doc', _a.client_id, _phone,
      'Olá' || case when _first <> '' then ', ' || _first else '' end || '! Aqui é da Peformake. Segue o ' || _label || ' de ' || _client || ':' || chr(10) || _url
        || chr(10) || chr(10) || 'Qualquer ajuste, é só responder aqui.',
      'agent_doc:' || _asset || ':' || _phone)
    on conflict (dedupe_key) do nothing;
    _n := _n + 1;
  end loop;
  if _n > 0 then update public.client_assets set sent_at = now() where id = _asset; end if;
  return _n;
end $$;
grant execute on function public.agent_doc_approve(uuid, text) to authenticated;

create table if not exists public.client_meeting_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 8000),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  done_at timestamptz
);
create index if not exists client_meeting_notes_client on public.client_meeting_notes (client_id, created_at desc);
alter table public.client_meeting_notes enable row level security;
create policy cmn_select on public.client_meeting_notes for select to authenticated using (public.consult_can());
create policy cmn_insert on public.client_meeting_notes for insert to authenticated with check (public.consult_can());
create policy cmn_update on public.client_meeting_notes for update to authenticated using (public.consult_can()) with check (public.consult_can());
