-- Plano de execução do mês (monthly-strategy reconstruída: pesquisa → núcleo → calendário → copy de cada peça → tráfego e vendas).
-- 1) monthly_strategy_actions.payload: a copy pronta da peça (título, legenda, slides do carrossel, CTA, links), para
--    "Aprovar = vai para produção" já criar a peça preenchida (content_items.carousel_slides, caption, headline, cta).
-- 2) trend_cache: varredura de tendências (TikTok, Reels, hashtags, perfis, Biblioteca de Anúncios) guardada por mês;
--    clientes do mesmo nicho/praça reaproveitam a mesma busca (sem pagar de novo). Só a função (service role) lê e grava.
-- 3) monthly_plan_get: o plano completo para qualquer pessoa da equipe (cada área abre e imprime o "Plano de execução").
-- Sem DROP (apply_migration com DROP trava).

alter table public.monthly_strategy_actions add column if not exists payload jsonb;

create table if not exists public.trend_cache (
  capability text not null,
  query text not null,
  month date not null,
  data jsonb not null default '{}'::jsonb,
  credits integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (capability, query, month)
);
alter table public.trend_cache enable row level security;

create or replace function public.monthly_plan_get(_client uuid, _month date)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare _s public.monthly_strategies;
begin
  if not public.is_team() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select * into _s from public.monthly_strategies where client_id = _client and month = date_trunc('month', _month)::date;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', _s.id, 'client_id', _s.client_id, 'name', (select trim(name) from public.clients where id = _s.client_id),
    'month', _s.month, 'status', _s.status, 'doc', _s.doc, 'finished_at', _s.finished_at,
    'actions', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'week', a.week, 'area', a.area, 'title', a.title, 'status', a.status,
      'due_date', a.due_date, 'routed_link', a.routed_link) order by a.week, a.position) from public.monthly_strategy_actions a where a.strategy_id = _s.id), '[]'::jsonb)
  );
end $function$;
grant execute on function public.monthly_plan_get(uuid, date) to authenticated;

-- Aprovar: igual a antes, e agora com a copy da peça (payload) já dentro do item de produção.
create or replace function public.monthly_action_decide(_id uuid, _approve boolean)
 returns text language plpgsql security definer set search_path to '' as $function$
declare _a public.monthly_strategy_actions; _s public.monthly_strategies; _plan uuid; _ref uuid; _table text; _link text; _kind text; _brief text; _cname text; _p jsonb;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select * into _a from public.monthly_strategy_actions where id = _id for update;
  if not found then raise exception 'Não encontrado' using errcode = 'PF004'; end if;
  if _a.status <> 'proposta' then raise exception 'Já decidido' using errcode = 'PF001'; end if;
  if not _approve then
    update public.monthly_strategy_actions set status = 'recusada', decided_by = (select auth.uid()), decided_at = now() where id = _id;
    return null;
  end if;
  select * into _s from public.monthly_strategies where id = _a.strategy_id;
  _brief := public.monthly_brief(_a);
  _cname := (select name from public.clients where id = _a.client_id);
  _p := coalesce(_a.payload, '{}'::jsonb);

  if _a.area in ('social', 'design') then
    insert into public.content_plans (client_id, month) values (_a.client_id, _s.month)
    on conflict (client_id, month) do update set updated_at = public.content_plans.updated_at
    returning id into _plan;
    _kind := case when _a.format in ('post', 'carrossel', 'story', 'reels', 'anuncio') then _a.format else 'post' end;
    insert into public.content_items (plan_id, client_id, number, kind, status, title, briefing, publish_date, deadline, updated_by,
      headline, subtitle, caption, cta, carousel_slides, reference_links)
    values (_plan, _a.client_id, coalesce((select max(number) from public.content_items where plan_id = _plan), 0) + 1, _kind,
      case when _a.area = 'design' then 'ready' else 'briefing' end, left(_a.title, 200), _brief,
      case when _a.area = 'social' then _a.due_date end, _a.due_date, (select auth.uid()),
      nullif(left(_p->>'headline', 500), ''), nullif(left(_p->>'subtitle', 500), ''), nullif(left(_p->>'caption', 4000), ''), nullif(left(_p->>'cta', 200), ''),
      case when jsonb_typeof(_p->'carousel_slides') = 'array' and jsonb_array_length(_p->'carousel_slides') > 0 then _p->'carousel_slides' else '[]'::jsonb end,
      coalesce((select array_agg(x) from jsonb_array_elements_text(case when jsonb_typeof(_p->'reference_links') = 'array' then _p->'reference_links' else '[]'::jsonb end) x where x ~ '^https?://'), '{}'))
    returning id into _ref;
    _table := 'content_items'; _link := '/conteudo/peca/' || _ref;
    perform public.notify(public.client_staff_profiles(_a.client_id, array[case when _a.area = 'design' then 'designer' else 'social_media' end]),
      'strategy_' || _a.area, case when _a.area = 'design' then 'Arte da estratégia para produzir: ' else 'Pauta da estratégia: ' end || left(_a.title, 120),
      _cname, _link, _a.client_id);
  elsif _a.area = 'audiovisual' then
    insert into public.av_projects (client_id, kind, month, title, briefing, script, status, due_date, updated_by, format, reference_links)
    values (_a.client_id, 'project', _s.month, left(_a.title, 200),
      left(concat_ws(E'\n\n', nullif(trim(coalesce(_p->>'briefing', '')), ''),
        case when nullif(trim(coalesce(_a.proof, '')), '') is not null then 'O número que prova: ' || trim(_a.proof) end,
        case when nullif(trim(coalesce(_a.why, '')), '') is not null then 'Por quê: ' || trim(_a.why) end, 'Veio da estratégia do mês (Consultoria), semana ' || _a.week || '.'), 8000),
      left(_a.what, 20000), 'script', _a.due_date, (select auth.uid()), nullif(left(_p->>'format', 200), ''),
      coalesce((select array_agg(x) from jsonb_array_elements_text(case when jsonb_typeof(_p->'reference_links') = 'array' then _p->'reference_links' else '[]'::jsonb end) x where x ~ '^https?://'), '{}'))
    returning id into _ref;
    _table := 'av_projects'; _link := '/audiovisual/projeto/' || _ref;
    perform public.notify(public.client_staff_profiles(_a.client_id, array['videomaker']), 'strategy_audiovisual',
      'Roteiro da estratégia: ' || left(_a.title, 120), _cname || ' · agende a gravação para entrar no quadro', _link, _a.client_id);
  else
    insert into public.traffic_tasks (title, description, priority, category, source, client_id, status, position, due_date, created_by, updated_by, dedupe_key)
    values (left(_a.title, 200), left(_brief, 4000), 'normal',
      case when _a.area = 'trafego' then (case when _a.format = 'anuncio' then 'criativo' else 'campanha' end) else 'atendimento' end,
      'strategist', _a.client_id, 'todo', 0, _a.due_date, (select auth.uid()), (select auth.uid()), 'monthly:' || _a.id)
    returning id into _ref;
    _table := 'traffic_tasks'; _link := '/trafego/tarefas?tarefa=' || _ref;
    perform public.notify(public.client_staff_profiles(_a.client_id, array[case when _a.area = 'trafego' then 'traffic_manager' else 'head_marketing' end]),
      'strategy_traffic', 'Ação da estratégia: ' || left(_a.title, 120), _cname, _link, _a.client_id);
  end if;

  update public.monthly_strategy_actions set status = 'aprovada', routed_table = _table, routed_id = _ref, routed_link = _link,
    decided_by = (select auth.uid()), decided_at = now() where id = _id;
  if _s.status = 'pronto' then update public.monthly_strategies set status = 'aprovado', approved_at = now(), approved_by = (select auth.uid()) where id = _s.id; end if;
  return _link;
end $function$;
