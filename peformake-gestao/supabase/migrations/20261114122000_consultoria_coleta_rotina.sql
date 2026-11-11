-- Consultoria: coleta pelos conectores (rotina agendada do Claude Code com Meta Ads, Firecrawl/Alexandria e Windsor).
-- Fluxo: diagnóstico entra na fila → collect_status = 'pendente' → a rotina lê consult_collect_queue(), coleta,
-- grava com consult_collect_save(...) e fecha com consult_collect_done(...). O motor faz a pesquisa na web ao mesmo tempo
-- e, antes do cruzamento, espera a coleta terminar (até 30 min); depois segue com o que tiver.

create table if not exists public.consult_collected (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  source text not null check (source in ('meta_ad_library', 'instagram_profile', 'instagram_posts', 'instagram_comments', 'ig_insights', 'google', 'other')),
  subject text,            -- '@perfil' ou nome do concorrente
  url text,
  data jsonb not null default '{}'::jsonb,
  collected_at timestamptz not null default now(),
  collected_by text not null default 'rotina'
);
create index if not exists consult_collected_client_idx on public.consult_collected (client_id, collected_at desc);
alter table public.consult_collected enable row level security;
drop policy if exists consult_collected_read on public.consult_collected;
create policy consult_collected_read on public.consult_collected for select to authenticated using (public.has_role('admin') or public.has_role('head_marketing'));

alter table public.consult_docs add column if not exists collect_status text check (collect_status in ('pendente', 'coletando', 'feito', 'expirado'));
alter table public.consult_docs add column if not exists collect_requested_at timestamptz;
alter table public.consult_docs add column if not exists collect_done_at timestamptz;
alter table public.consult_docs add column if not exists collect_note text;

-- Quem pode gravar/ler a fila: a rotina (service_role ou o dono do banco pelo conector) e admin/head.
create or replace function public.consult_collect_allowed() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.role(), '') = 'service_role' or current_user in ('postgres', 'supabase_admin') or public.has_role('admin') or public.has_role('head_marketing')
$$;

-- Diagnóstico novo na fila (pesquisa do zero) pede coleta.
create or replace function public.consult_docs_collect_flag() returns trigger language plpgsql as $$
begin
  if new.status = 'na_fila' and new.stage = 'research' and new.research is null
     and (tg_op = 'INSERT' or old.status is distinct from 'na_fila' or old.research is not null or old.stage is distinct from 'research') then
    new.collect_status := 'pendente'; new.collect_requested_at := now(); new.collect_done_at := null; new.collect_note := null;
  end if;
  return new;
end $$;
drop trigger if exists consult_docs_collect_flag on public.consult_docs;
create trigger consult_docs_collect_flag before insert or update on public.consult_docs for each row execute function public.consult_docs_collect_flag();

-- Fila da rotina: clientes esperando coleta, com o que ajuda a achar os perfis e as contas.
create or replace function public.consult_collect_queue() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.consult_collect_allowed() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'client_id', c.id, 'name', c.name, 'legal_name', c.legal_name, 'segment', c.segment, 'niche', c.niche,
      'cnpj', nullif(regexp_replace(coalesce(c.document, ''), '\D', '', 'g'), ''),
      'city', coalesce(d.receita->>'municipio', c.address), 'uf', d.receita->>'uf', 'address', c.address,
      'instagram', c.instagram, 'website', c.website,
      'links', (select coalesce(jsonb_agg(jsonb_build_object('name', l.name, 'url', l.url)), '[]'::jsonb) from public.client_links l where l.client_id = c.id),
      'social_accounts', (select coalesce(jsonb_agg(jsonb_build_object('network', s.network, 'handle', s.handle, 'external_id', s.external_id)), '[]'::jsonb) from public.social_accounts s where s.client_id = c.id),
      'ad_accounts', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'business', a.business_name)), '[]'::jsonb) from public.ad_accounts a where a.client_id = c.id),
      'collect_status', d.collect_status, 'requested_at', d.collect_requested_at,
      'already_collected', (select count(*) from public.consult_collected k where k.client_id = c.id and k.collected_at >= d.collect_requested_at - interval '1 day')
    ) order by d.collect_requested_at)
    from public.consult_docs d join public.clients c on c.id = d.client_id
    where d.collect_status in ('pendente', 'coletando')
  ), '[]'::jsonb);
end $$;

-- Grava um item coletado (marca o cliente como "coletando").
create or replace function public.consult_collect_save(_client uuid, _source text, _subject text, _url text, _data jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  if not public.consult_collect_allowed() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  insert into public.consult_collected (client_id, source, subject, url, data)
  values (_client, _source, nullif(trim(_subject), ''), nullif(trim(_url), ''), coalesce(_data, '{}'::jsonb)) returning id into _id;
  update public.consult_docs set collect_status = 'coletando' where client_id = _client and collect_status = 'pendente';
  return _id;
end $$;

-- Fecha a coleta do cliente (o motor segue para o cruzamento).
create or replace function public.consult_collect_done(_client uuid, _note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.consult_collect_allowed() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.consult_docs set collect_status = 'feito', collect_done_at = now(), collect_note = left(_note, 1000)
  where client_id = _client and collect_status in ('pendente', 'coletando');
  perform public.consult_kick();
end $$;

revoke all on function public.consult_collect_queue() from public, anon;
revoke all on function public.consult_collect_save(uuid, text, text, text, jsonb) from public, anon;
revoke all on function public.consult_collect_done(uuid, text) from public, anon;
grant execute on function public.consult_collect_queue() to authenticated, service_role;
grant execute on function public.consult_collect_save(uuid, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.consult_collect_done(uuid, text) to authenticated, service_role;

-- Central de automações: a rotina de coleta (tarefa agendada do Claude Code com os conectores).
insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job, flag_table, flag_column)
values ('est_coleta', 'estrategia', 2, 'Coleta para o diagnóstico',
  'Antes de a IA escrever o diagnóstico, uma rotina lê com os conectores o Instagram do cliente e dos concorrentes, a Biblioteca de Anúncios da Meta e os números do Instagram, e guarda tudo para a análise.',
  'Só lê (nada é publicado nem enviado). O diagnóstico espera a coleta até 30 minutos e depois segue com o que tiver mais a pesquisa na web.',
  'Quando um diagnóstico entra na fila (tarefa agendada)', true, 'baixo', null, null, null)
on conflict (key) do update set title = excluded.title, what = excluded.what, how = excluded.how, schedule = excluded.schedule;
