-- Consultoria 1.1: edição humana por bloco (marcada e preservada no "Refazer"), comunicação estruturada e reutilizável
-- (client_brand_voice: Tráfego, Social e Audiovisual vão ler daqui) e perguntas ao cliente com resposta (client_questions),
-- com envio ao portal só depois de confirmar (o portal mostra; nada é mandado por mensagem).

alter table public.consult_docs add column if not exists human_edits jsonb not null default '{}'::jsonb;

/** Edita um bloco do documento (ex.: {diagnostico,swot}). A edição fica marcada e o "Refazer" não a sobrescreve. */
create or replace function public.consult_edit(_client uuid, _path text[], _value jsonb) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _path is null or cardinality(_path) not between 1 and 3
     or _path[1] not in ('resumo', 'diagnostico', 'comunicacao', 'experiencia', 'plano', 'riscos')
     or exists (select 1 from unnest(_path) p where p !~ '^[a-z_]{1,40}$') then
    raise exception 'Formato invalido' using errcode = 'PF006';
  end if;
  update public.consult_docs d set
    doc = jsonb_set(case when cardinality(_path) > 1 and d.doc #> _path[1:1] is null then jsonb_set(d.doc, _path[1:1], '{}'::jsonb) else d.doc end, _path, coalesce(_value, 'null'::jsonb), true),
    human_edits = d.human_edits || jsonb_build_object(array_to_string(_path, '.'), jsonb_build_object('at', now(), 'by', auth.uid()))
  where d.client_id = _client and d.status in ('pronto', 'aprovado', 'enviado');
  if not found then raise exception 'O diagnóstico ainda não está pronto' using errcode = 'PF005'; end if;
end $$;
grant execute on function public.consult_edit(uuid, text[], jsonb) to authenticated;

-- ───────── Comunicação do cliente (sugestão), estruturada para as outras áreas ─────────
create table if not exists public.client_brand_voice (
  client_id uuid primary key references public.clients(id) on delete cascade,
  essencia text, proposito text, arquetipo text, papel_peformake text,
  tom jsonb not null default '[]'::jsonb,        -- [{adjetivo, exemplo}]
  evitar jsonb not null default '[]'::jsonb,     -- [texto]
  expressao jsonb not null default '{}'::jsonb,  -- {paleta, ambiente, presenca}
  regra_teste text,
  pilares jsonb not null default '[]'::jsonb,    -- [{nome, descricao}]
  source text not null default 'consultoria',
  human_edited boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.client_brand_voice enable row level security;
drop policy if exists client_brand_voice_read on public.client_brand_voice;
create policy client_brand_voice_read on public.client_brand_voice for select to authenticated using (public.is_team());

/** Para Tráfego, Social, Audiovisual e agentes: como este cliente deve se comunicar (sugestão aprovada pela equipe). */
create or replace function public.client_voice(_client uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select to_jsonb(v) - 'client_id' from public.client_brand_voice v where v.client_id = _client
$$;
revoke all on function public.client_voice(uuid) from public, anon;
grant execute on function public.client_voice(uuid) to authenticated;

-- ───────── Perguntas ao cliente ─────────
create table if not exists public.client_questions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  -- Fila genérica de perguntas por cliente (todas as áreas). Depois vira o link público progressivo (1 pergunta por vez).
  area text not null default 'consultoria' check (area in ('consultoria', 'trafego', 'social', 'audiovisual', 'vendas')),
  pack text,                                   -- lote/mês (ex.: '2026-11') para agrupar o envio
  question text not null,
  why text,                                    -- motivo curto
  required boolean not null default false,
  answer text,
  status text not null default 'pendente' check (status in ('pendente', 'enviada', 'respondida', 'descartada')),
  source text not null default 'consult_diagnosis',
  sent_to_portal_at timestamptz,
  answered_at timestamptz,
  answered_by uuid,
  answered_via text check (answered_via in ('equipe', 'cliente')),
  created_at timestamptz not null default now()
);
create unique index if not exists client_questions_key on public.client_questions (client_id, area, lower(question));
alter table public.client_questions enable row level security;
drop policy if exists client_questions_read on public.client_questions;
create policy client_questions_read on public.client_questions for select to authenticated using (public.consult_can());

create or replace function public.client_question_answer(_id uuid, _answer text, _discard boolean default false) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.client_questions set
    answer = case when _discard then answer else nullif(trim(left(coalesce(_answer, ''), 4000)), '') end,
    status = case when _discard then 'descartada' when nullif(trim(coalesce(_answer, '')), '') is null then (case when sent_to_portal_at is null then 'pendente' else 'enviada' end) else 'respondida' end,
    answered_at = case when _discard then answered_at else now() end, answered_by = auth.uid(), answered_via = 'equipe'
  where id = _id;
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
end $$;
grant execute on function public.client_question_answer(uuid, text, boolean) to authenticated;

/** Deixa as perguntas pendentes visíveis no portal do cliente (só depois da confirmação na tela). Não manda mensagem. */
create or replace function public.client_questions_to_portal(_client uuid, _area text default 'consultoria') returns integer
language plpgsql security definer set search_path to '' as $$
declare _n integer;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.client_questions set sent_to_portal_at = now(), status = 'enviada'
   where client_id = _client and area = _area and status = 'pendente';
  get diagnostics _n = row_count;
  return _n;
end $$;
grant execute on function public.client_questions_to_portal(uuid, text) to authenticated;

/** Portal (link do cliente): perguntas que a equipe liberou e ainda não foram respondidas. */
create or replace function public.portal_questions(_token text) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare _client uuid := public.portal_resolve(_token);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'why', q.why) order by q.created_at)
    from public.client_questions q where q.client_id = _client and q.status = 'enviada'), '[]'::jsonb);
end $$;
grant execute on function public.portal_questions(text) to anon, authenticated;

create or replace function public.portal_question_answer(_token text, _id uuid, _answer text) returns void
language plpgsql security definer set search_path to '' as $$
declare _client uuid := public.portal_resolve(_token);
begin
  if nullif(trim(coalesce(_answer, '')), '') is null then raise exception 'Escreva a resposta' using errcode = 'PF006'; end if;
  update public.client_questions set answer = left(trim(_answer), 4000), status = 'respondida', answered_at = now(), answered_via = 'cliente'
   where id = _id and client_id = _client and status = 'enviada';
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  perform public.notify(
    array(select r.user_id from public.user_roles r join public.profiles p on p.id = r.user_id where r.role in ('admin', 'head_marketing') and p.is_active),
    'client_answer', 'Cliente respondeu uma pergunta', (select trim(name) from public.clients where id = _client) || ' respondeu no portal.',
    '/estrategia/consultoria?cliente=' || _client::text || '&aba=do_cliente', _client);
end $$;
grant execute on function public.portal_question_answer(text, uuid, text) to anon, authenticated;

-- Documento mudou → atualiza a comunicação estruturada e as perguntas (sem apagar respostas).
create or replace function public.consult_after_doc() returns trigger language plpgsql security definer set search_path to '' as $$
declare _c jsonb := new.doc -> 'comunicacao';
begin
  if _c is not null and jsonb_typeof(_c) = 'object' and (tg_op = 'INSERT' or new.doc -> 'comunicacao' is distinct from old.doc -> 'comunicacao') then
    insert into public.client_brand_voice (client_id, essencia, proposito, arquetipo, papel_peformake, tom, evitar, expressao, regra_teste, pilares, human_edited, updated_at)
    values (new.client_id, _c->>'essencia', _c->>'proposito', _c->>'arquetipo', _c->>'papel_peformake', coalesce(_c->'tom', '[]'), coalesce(_c->'evitar', '[]'),
      coalesce(_c->'expressao', '{}'), _c->>'regra_teste', coalesce(_c->'pilares', '[]'), new.human_edits ? 'comunicacao', now())
    on conflict (client_id) do update set essencia = excluded.essencia, proposito = excluded.proposito, arquetipo = excluded.arquetipo,
      papel_peformake = excluded.papel_peformake, tom = excluded.tom, evitar = excluded.evitar, expressao = excluded.expressao,
      regra_teste = excluded.regra_teste, pilares = excluded.pilares, human_edited = excluded.human_edited, updated_at = now();
  end if;
  if jsonb_typeof(new.doc -> 'do_cliente') = 'array' and (tg_op = 'INSERT' or new.doc -> 'do_cliente' is distinct from old.doc -> 'do_cliente') then
    insert into public.client_questions (client_id, area, question, why, source)
    select new.client_id, 'consultoria', left(trim(q->>'pergunta'), 1000), left(q->>'por_que', 1000), 'consult_diagnosis'
    from jsonb_array_elements(new.doc -> 'do_cliente') q where nullif(trim(q->>'pergunta'), '') is not null
    on conflict (client_id, area, lower(question)) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists consult_after_doc on public.consult_docs;
create trigger consult_after_doc after insert or update of doc on public.consult_docs for each row execute function public.consult_after_doc();

/** Respostas e perguntas da área, para o contexto da IA (prioridade sobre a pesquisa). */
create or replace function public.client_answers_context(_client uuid, _area text) returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('pergunta', q.question, 'resposta', q.answer, 'quando', q.answered_at::date) order by q.answered_at), '[]'::jsonb)
  from public.client_questions q where q.client_id = _client and q.area = _area and q.status = 'respondida'
$$;
revoke all on function public.client_answers_context(uuid, text) from public, anon, authenticated;

-- Lista: conta perguntas pendentes.
create or replace function public.consult_list() returns jsonb
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'client_id', c.id, 'name', c.name, 'logo_path', c.logo_path, 'segment', c.segment,
      'document', c.document, 'instagram', c.instagram, 'website', c.website,
      'status', coalesce(d.status, case when cardinality(public.consult_missing(c.id)) > 0 then 'falta_dados' else 'na_fila' end),
      'stage', d.stage, 'redo_section', d.redo_section, 'error', d.error,
      'updated_at', coalesce(d.updated_at, c.updated_at), 'finished_at', d.finished_at,
      'suggestions', (select count(*) from public.client_ai_suggestions s where s.client_id = c.id and s.status = 'pendente'),
      'can_generate', public.ai_generation_allowed(c.id, 'consultoria'),
      'direction', (select d2.body from public.client_directions d2 where d2.client_id = c.id and d2.area = 'consultoria' and d2.month is null),
      'questions_open', (select count(*) from public.client_questions q where q.client_id = c.id and q.area = 'consultoria' and q.status in ('pendente', 'enviada')),
      'questions_answered', (select count(*) from public.client_questions q where q.client_id = c.id and q.area = 'consultoria' and q.status = 'respondida'),
      'share_token', d.share_token
    ) order by c.name)
    from public.clients c left join public.consult_docs d on d.client_id = c.id
    where public.consult_has_service(c.id)
  ), '[]'::jsonb);
end $$;
grant execute on function public.consult_list() to authenticated;

insert into public.notification_rules (kind, category, name, description, audience, in_app, email, position)
values ('client_answer', 'clientes', 'Cliente respondeu no portal', 'Resposta do cliente às perguntas do diagnóstico (Consultoria).', 'equipe', true, false, 90)
on conflict (kind) do nothing;

-- Docs já prontos: preenche comunicação e perguntas sem gerar nada de novo.
insert into public.client_brand_voice (client_id, essencia, proposito, arquetipo, papel_peformake, tom, evitar, expressao, regra_teste, pilares)
select d.client_id, c->>'essencia', c->>'proposito', c->>'arquetipo', c->>'papel_peformake', coalesce(c->'tom', '[]'), coalesce(c->'evitar', '[]'),
  coalesce(c->'expressao', '{}'), c->>'regra_teste', coalesce(c->'pilares', '[]')
from public.consult_docs d cross join lateral (select d.doc -> 'comunicacao' as c) x
where jsonb_typeof(x.c) = 'object'
on conflict (client_id) do nothing;
insert into public.client_questions (client_id, area, question, why, source)
select d.client_id, 'consultoria', left(trim(q->>'pergunta'), 1000), left(q->>'por_que', 1000), 'consult_diagnosis'
from public.consult_docs d cross join lateral jsonb_array_elements(case when jsonb_typeof(d.doc -> 'do_cliente') = 'array' then d.doc -> 'do_cliente' else '[]'::jsonb end) q
where nullif(trim(q->>'pergunta'), '') is not null
on conflict (client_id, area, lower(question)) do nothing;

-- ───────── Apresentação: link público vivo (só depois de aprovar) e portal ─────────
alter table public.consult_docs add column if not exists share_token text unique;
alter table public.consult_docs add column if not exists share_created_at timestamptz;

/** O que o cliente pode ver: o documento (sem fontes nem frameworks, sem custo) e as perguntas com respostas. */
create or replace function public.consult_public_payload(_client uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'name', trim(c.name), 'logo_path', c.logo_path, 'segment', c.segment,
    'doc', d.doc - 'fontes' - 'frameworks' - 'do_cliente',
    'questions', coalesce((select jsonb_agg(jsonb_build_object('question', q.question, 'why', q.why, 'answer', q.answer) order by q.created_at)
      from public.client_questions q where q.client_id = c.id and q.area = 'consultoria' and q.status <> 'descartada'), '[]'::jsonb),
    'approved_at', d.approved_at,
    'updated_at', greatest(d.updated_at, (select max(q.answered_at) from public.client_questions q where q.client_id = c.id and q.area = 'consultoria'))
  )
  from public.consult_docs d join public.clients c on c.id = d.client_id where d.client_id = _client
$$;
revoke all on function public.consult_public_payload(uuid) from public, anon, authenticated;

create or replace function public.consult_share_create(_client uuid) returns text
language plpgsql security definer set search_path to '' as $$
declare _t text;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.consult_docs set
    share_token = coalesce(share_token, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')),
    share_created_at = coalesce(share_created_at, now())
  where client_id = _client and status in ('aprovado', 'enviado')
  returning share_token into _t;
  if _t is null then raise exception 'Aprove antes de criar o link' using errcode = 'PF005'; end if;
  return _t;
end $$;
grant execute on function public.consult_share_create(uuid) to authenticated;

create or replace function public.consult_share_revoke(_client uuid) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.consult_docs set share_token = null, share_created_at = null where client_id = _client;
end $$;
grant execute on function public.consult_share_revoke(uuid) to authenticated;

/** Link público (sem login): só lê, só depois de aprovado. Em revisão, avisa que está sendo atualizado. */
create or replace function public.consult_public(_token text) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare _d public.consult_docs;
begin
  if _token is null or length(_token) < 40 then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  select * into _d from public.consult_docs where share_token = _token;
  if not found then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  if _d.status not in ('aprovado', 'enviado') then return jsonb_build_object('updating', true); end if;
  return public.consult_public_payload(_d.client_id);
end $$;
grant execute on function public.consult_public(text) to anon, authenticated;

/** Portal do cliente: o diagnóstico aprovado (mesma apresentação viva). */
create or replace function public.portal_consult(_token text) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare _client uuid := public.portal_resolve(_token);
begin
  if not exists (select 1 from public.consult_docs d where d.client_id = _client and d.status in ('aprovado', 'enviado')) then return null; end if;
  return public.consult_public_payload(_client);
end $$;
grant execute on function public.portal_consult(text) to anon, authenticated;
