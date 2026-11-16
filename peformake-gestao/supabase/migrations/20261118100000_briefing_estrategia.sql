-- Estratégia interativa (MVP), fase 1: briefing do cliente antes de gerar a estratégia.
-- client_briefs: dados fixos (produtos, links, público, concorrentes e referências acumulativos, voz, proibidos...).
-- client_brief_months: o que é do mês (ofertas e datas, meta, datas que travam).
-- Perguntas do mês: 8 perguntas curtas em client_questions (pack 'briefing_mes', focus 'AAAA-MM'), respondidas pelo cliente
-- no link que já existe ou pela equipe no sistema (texto ou áudio guardado em client-chat/equipe/...).

create table if not exists public.client_briefs (
  client_id uuid primary key references public.clients(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create table if not exists public.client_brief_months (
  client_id uuid not null references public.clients(id) on delete cascade,
  month date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (client_id, month)
);
alter table public.client_briefs enable row level security;
alter table public.client_brief_months enable row level security;
drop policy if exists client_briefs_all on public.client_briefs;
create policy client_briefs_all on public.client_briefs for all to authenticated using (public.consult_can()) with check (public.consult_can());
drop policy if exists client_brief_months_all on public.client_brief_months;
create policy client_brief_months_all on public.client_brief_months for all to authenticated using (public.consult_can()) with check (public.consult_can());

-- A equipe grava o áudio da resposta (pasta equipe/ do bucket das conversas).
drop policy if exists client_chat_team_insert on storage.objects;
create policy client_chat_team_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'client-chat' and public.consult_can() and (storage.foldername(name))[1] = 'equipe');

-- Cria (se faltar) as 8 perguntas do mês. O mês entra no texto (a mesma pergunta se repete todo mês).
create or replace function public.brief_questions_ensure(_client uuid, _month date)
returns integer language plpgsql security definer set search_path to '' as $$
declare m text; mes text; n integer := 0; r record;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  m := to_char(_month, 'YYYY-MM');
  mes := (array['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'])[extract(month from _month)::int];
  for r in select * from (values
    (1, 'vendas', format('Em %s, qual a oferta ou produto mais importante?', mes), 'É o centro da estratégia do mês.', '[]'::jsonb),
    (2, 'consultoria', format('Tem data ou evento especial em %s?', mes), 'Para planejar antes e não perder a data.', '["Não tem","Aniversário da empresa","Lançamento","Promoção","Evento na loja"]'::jsonb),
    (3, 'vendas', format('Antes de %s: o que mais vendeu ou mais perguntaram no último mês?', mes), 'O que já funciona vira conteúdo e anúncio.', '[]'::jsonb),
    (4, 'consultoria', format('Qual a meta de %s?', mes), 'A estratégia mira um número.', '["Vender mais","Mais clientes novos","Mais seguidores","Encher a agenda","Lançar algo novo"]'::jsonb),
    (5, 'consultoria', format('Em %s, tem algo que NÃO quer que a gente fale ou mostre?', mes), 'Evita retrabalho e erro com o público.', '["Nada","Preços","Rosto da equipe","A cozinha / bastidor","Concorrentes"]'::jsonb),
    (6, 'audiovisual', format('Quem pode aparecer nos vídeos de %s e em que dias?', mes), 'Para marcar a gravação certa.', '["Só o dono","Dono e equipe","Ninguém (só produto)","Qualquer dia","Só fim de semana"]'::jsonb),
    (7, 'consultoria', format('Alguma novidade para %s (produto, preço, equipe, reforma)?', mes), 'Novidade é assunto pronto.', '["Nada novo","Produto novo","Preço novo","Equipe nova","Reforma"]'::jsonb),
    (8, 'social', format('Para %s: algum concorrente ou perfil que você admira?', mes), 'Vira referência do mês.', '[]'::jsonb)
  ) as t(pos, area, question, why, options) loop
    insert into public.client_questions (client_id, area, pack, focus, question, why, required, status, source, options)
    values (_client, r.area, 'briefing_mes', m, r.question, r.why, r.pos in (1, 4), 'pendente', 'briefing', r.options)
    on conflict (client_id, area, lower(question)) do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- Resposta da equipe (texto e/ou áudio). O áudio fica junto do texto transcrito.
create or replace function public.brief_question_answer(_id uuid, _answer text, _attachments jsonb default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.client_questions set
    answer = nullif(trim(left(coalesce(_answer, ''), 4000)), ''),
    attachments = case when _attachments is null then attachments else coalesce(attachments, '[]'::jsonb) || _attachments end,
    audio_pending = false,
    status = case when nullif(trim(coalesce(_answer, '')), '') is null then (case when sent_to_portal_at is null then 'pendente' else 'enviada' end) else 'respondida' end,
    answered_at = now(), answered_by = auth.uid(), answered_via = 'equipe', updated_at = now()
  where id = _id;
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
end $$;

grant execute on function public.brief_questions_ensure(uuid, date) to authenticated;
grant execute on function public.brief_question_answer(uuid, text, jsonb) to authenticated;
