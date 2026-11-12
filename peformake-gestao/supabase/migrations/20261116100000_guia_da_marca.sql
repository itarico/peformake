-- Guia da marca por cliente (PLANO-COMUNICACAO-E-DISTRIBUICAO, item 1): o que quem executa lê antes de produzir.
-- Partes: posicionamento, visual (cores, fontes, logo, foto e vídeo), voz e copy, design e copy, audiovisual.
-- Fontes: cadastro (clients.brand_style, logo), diagnóstico (consult_docs.doc.comunicacao → client_brand_voice),
-- respostas do cliente e direcionamento da equipe. A IA (função brand-guide, modelo barato) só preenche as partes que
-- ninguém editou; a parte editada pela equipe fica em `edited` e vale mais que a IA.

create table if not exists public.client_brand_guides (
  client_id uuid primary key references public.clients(id) on delete cascade,
  guide jsonb not null default '{}'::jsonb,      -- {posicionamento, visual, voz, design, audiovisual}
  edited text[] not null default '{}',           -- partes que a equipe editou (a IA não mexe)
  ai_at timestamptz,
  ai_usd numeric not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.client_brand_guides enable row level security;
-- (tabela nova: sem "drop policy"; o apply_migration trava com DROP)
create policy client_brand_guides_read on public.client_brand_guides for select to authenticated using (public.is_team());

/** Tudo o que a tela do guia precisa: o guia, a voz do diagnóstico e o estilo do cadastro (a tela junta as fontes). */
create or replace function public.brand_guide_get(_client uuid) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.is_team() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return (
    select jsonb_build_object(
      'client', jsonb_build_object('id', c.id, 'name', trim(c.name), 'segment', c.segment, 'logo_path', c.logo_path, 'brand_style', c.brand_style),
      'voice', (select to_jsonb(v) - 'client_id' from public.client_brand_voice v where v.client_id = c.id),
      'guide', coalesce(g.guide, '{}'::jsonb), 'edited', to_jsonb(coalesce(g.edited, '{}'::text[])),
      'ai_at', g.ai_at, 'updated_at', g.updated_at,
      'has_diagnosis', exists (select 1 from public.consult_docs d where d.client_id = c.id and d.doc ? 'comunicacao'))
    from public.clients c left join public.client_brand_guides g on g.client_id = c.id
    where c.id = _client);
end $$;
revoke all on function public.brand_guide_get(uuid) from public, anon;
grant execute on function public.brand_guide_get(uuid) to authenticated;

/** A equipe salva uma parte do guia. A parte passa a valer mais que a IA. Voz e copy também atualizam client_brand_voice. */
create or replace function public.brand_guide_save(_client uuid, _section text, _data jsonb) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_team() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _section not in ('posicionamento', 'visual', 'voz', 'design', 'audiovisual') or jsonb_typeof(_data) <> 'object' then
    raise exception 'Formato invalido' using errcode = 'PF006';
  end if;
  if length(_data::text) > 20000 then raise exception 'Texto longo demais' using errcode = 'PF006'; end if;
  insert into public.client_brand_guides (client_id, guide, edited, updated_at, updated_by)
  values (_client, jsonb_build_object(_section, _data), array[_section], now(), auth.uid())
  on conflict (client_id) do update set
    guide = public.client_brand_guides.guide || jsonb_build_object(_section, _data),
    edited = (select array_agg(distinct x) from unnest(public.client_brand_guides.edited || array[_section]) x),
    updated_at = now(), updated_by = auth.uid();
  if _section = 'voz' then
    insert into public.client_brand_voice (client_id, essencia, tom, evitar, regra_teste, source, human_edited, updated_at)
    values (_client, _data->>'essencia', coalesce(_data->'tom', '[]'), coalesce(_data->'evitar', '[]'), _data->>'regra_teste', 'guia', true, now())
    on conflict (client_id) do update set essencia = coalesce(excluded.essencia, public.client_brand_voice.essencia),
      tom = excluded.tom, evitar = excluded.evitar, regra_teste = coalesce(excluded.regra_teste, public.client_brand_voice.regra_teste),
      human_edited = true, updated_at = now();
  end if;
end $$;
revoke all on function public.brand_guide_save(uuid, text, jsonb) from public, anon;
grant execute on function public.brand_guide_save(uuid, text, jsonb) to authenticated;

/** Volta uma parte para a IA (tira a marca de editada; a próxima montagem com IA reescreve essa parte). */
create or replace function public.brand_guide_unlock(_client uuid, _section text) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_team() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.client_brand_guides set edited = array_remove(edited, _section), updated_at = now(), updated_by = auth.uid() where client_id = _client;
end $$;
revoke all on function public.brand_guide_unlock(uuid, text) from public, anon;
grant execute on function public.brand_guide_unlock(uuid, text) to authenticated;

-- Diagnóstico refeito não apaga a voz que a equipe editou no guia (o editado vale mais que a IA).
create or replace function public.consult_after_doc() returns trigger language plpgsql security definer set search_path to '' as $$
declare _c jsonb := new.doc -> 'comunicacao';
begin
  if _c is not null and jsonb_typeof(_c) = 'object' and (tg_op = 'INSERT' or new.doc -> 'comunicacao' is distinct from old.doc -> 'comunicacao') then
    insert into public.client_brand_voice (client_id, essencia, proposito, arquetipo, papel_peformake, tom, evitar, expressao, regra_teste, pilares, human_edited, updated_at)
    values (new.client_id, _c->>'essencia', _c->>'proposito', _c->>'arquetipo', _c->>'papel_peformake', coalesce(_c->'tom', '[]'), coalesce(_c->'evitar', '[]'),
      coalesce(_c->'expressao', '{}'), _c->>'regra_teste', coalesce(_c->'pilares', '[]'), new.human_edits ? 'comunicacao', now())
    on conflict (client_id) do update set essencia = excluded.essencia, proposito = excluded.proposito, arquetipo = excluded.arquetipo,
      papel_peformake = excluded.papel_peformake, tom = excluded.tom, evitar = excluded.evitar, expressao = excluded.expressao,
      regra_teste = excluded.regra_teste, pilares = excluded.pilares, human_edited = excluded.human_edited, updated_at = now()
    where not public.client_brand_voice.human_edited or excluded.human_edited;
  end if;
  if jsonb_typeof(new.doc -> 'do_cliente') = 'array' and (tg_op = 'INSERT' or new.doc -> 'do_cliente' is distinct from old.doc -> 'do_cliente') then
    insert into public.client_questions (client_id, area, question, why, source)
    select new.client_id, 'consultoria', left(trim(q->>'pergunta'), 1000), left(q->>'por_que', 1000), 'consult_diagnosis'
    from jsonb_array_elements(new.doc -> 'do_cliente') q where nullif(trim(q->>'pergunta'), '') is not null
    on conflict (client_id, area, lower(question)) do nothing;
  end if;
  return new;
end $$;

-- Agentes (design e criativos) leem o guia junto com o estilo do cadastro.
create or replace function public.agent_client_style(_client_id uuid)
 returns jsonb language sql stable set search_path to '' as $$
  select jsonb_build_object('name', trim(c.name), 'segment', c.segment, 'brand_style', c.brand_style, 'description', c.description, 'value_proposition', c.value_proposition,
    'brand_guide', (select g.guide from public.client_brand_guides g where g.client_id = c.id),
    'services', coalesce((select jsonb_agg(distinct s.name) from public.client_services cs join public.services s on s.id = cs.service_id where cs.client_id = c.id and cs.is_active), '[]'::jsonb),
    'playbook', (select to_jsonb(p) - 'client_id' from public.client_playbook p where p.client_id = c.id),
    'recent_headlines', coalesce((select jsonb_agg(i.headline) from (select headline from public.content_items where client_id = c.id and headline is not null order by created_at desc limit 8) i), '[]'::jsonb))
  from public.clients c where c.id = _client_id;
$$;

create or replace function public.creative_context(_request_id uuid)
 returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'request', to_jsonb(r),
    'client', jsonb_build_object('id', c.id, 'name', trim(c.name), 'segment', c.segment, 'drive_folder_id', c.drive_folder_id, 'brand_style', c.brand_style,
      'brand_guide', (select g.guide from public.client_brand_guides g where g.client_id = c.id)),
    'settings', (select to_jsonb(s) from public.design_settings s where s.id),
    'used', coalesce((select jsonb_agg(file_id) from public.creative_photos_used u where u.client_id = c.id), '[]'::jsonb)
  )
  from public.creative_requests r join public.clients c on c.id = r.client_id
  where r.id = _request_id;
$$;
