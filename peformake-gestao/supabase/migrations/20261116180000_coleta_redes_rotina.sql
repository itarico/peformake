-- Coleta das redes pela rotina do Claude (tarefa agendada com conectores: Firecrawl/Alexandria, Meta Ads, Supabase).
-- Decisão do Italo (12/11): "toda busca com o agente do Claude e a API só cruza e traz tudo para a estratégia".
-- A rotina lê client_scan_queue(), busca TikTok, Reels, hashtags, perfis e Biblioteca de Anúncios de cada cliente,
-- resume e grava com client_scan_save(...), fecha com client_scan_done(...). O motor monthly-strategy (scan.ts) lê
-- client_scan antes de chamar a API do Firecrawl; a API fica só de reserva. Perfis e anúncios gravados aqui também
-- alimentam o diagnóstico (consult_collected) quando o cliente está na fila de coleta da Consultoria.
-- Sem DROP (aplicar em partes pelo execute_sql).

create table if not exists public.client_scan (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  month date not null,
  source text not null check (source in ('tiktok', 'instagram', 'hashtags', 'perfis', 'ads_library', 'google')),
  query text not null default '',
  data jsonb not null default '{}'::jsonb,
  credits integer not null default 0,
  collected_at timestamptz not null default now(),
  collected_by text not null default 'rotina',
  unique (client_id, month, source, query)
);
create index if not exists client_scan_client_idx on public.client_scan (client_id, collected_at desc);
alter table public.client_scan enable row level security;

create table if not exists public.client_scan_runs (
  client_id uuid not null references public.clients(id) on delete cascade,
  month date not null,
  status text not null default 'feito' check (status in ('feito', 'parcial')),
  credits integer not null default 0,
  note text,
  done_at timestamptz not null default now(),
  primary key (client_id, month)
);
alter table public.client_scan_runs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'client_scan' and policyname = 'client_scan_read') then
    create policy client_scan_read on public.client_scan for select to authenticated using (public.is_team());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'client_scan_runs' and policyname = 'client_scan_runs_read') then
    create policy client_scan_runs_read on public.client_scan_runs for select to authenticated using (public.is_team());
  end if;
end $$;
grant select on public.client_scan, public.client_scan_runs to authenticated;
grant all on public.client_scan, public.client_scan_runs to service_role;

-- Fila da rotina: clientes com serviço de operação que ainda não foram coletados no mês do próximo plano
-- (padrão: mês seguinte), mais qualquer plano na fila/gerando sem coleta. Primeiro quem ainda não tem plano pronto.
create or replace function public.client_scan_queue(_month date default null, _limit integer default 10)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _m date := date_trunc('month', coalesce(_month, ((now() at time zone 'America/Recife') + interval '1 month')::date))::date;
begin
  if not public.consult_collect_allowed() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return coalesce((
    with alvo as (
      select c.id as client_id, _m as month from public.clients c where public.monthly_eligible(c.id)
      union
      select s.client_id, s.month from public.monthly_strategies s
      where s.status in ('na_fila', 'gerando') and s.month >= date_trunc('month', now() at time zone 'America/Recife')::date
    ), fila as (
      select a.client_id, a.month, s.status as plano_status,
             case when exists (select 1 from public.consult_docs k where k.client_id = a.client_id and k.collect_status in ('pendente', 'coletando')) then -1
                  when s.id is null or s.status not in ('pronto', 'aprovado') then 0 else 1 end as prio
      from alvo a
      left join public.monthly_strategies s on s.client_id = a.client_id and s.month = a.month
      where not exists (select 1 from public.client_scan_runs r where r.client_id = a.client_id and r.month = a.month)
      order by prio, (s.status = 'na_fila') desc nulls last, a.client_id
      limit greatest(1, least(coalesce(_limit, 10), 50))
    )
    select jsonb_agg(jsonb_build_object(
      'client_id', c.id, 'month', f.month, 'plano_status', f.plano_status, 'name', c.name, 'segment', c.segment, 'niche', c.niche,
      'city', coalesce(d.receita->>'municipio', c.address), 'uf', d.receita->>'uf',
      'instagram', c.instagram, 'website', c.website,
      'areas', jsonb_build_object('consultoria', public.client_in_area(c.id, 'consultoria'), 'trafego', public.client_in_area(c.id, 'trafego'),
                                  'conteudo', public.client_in_area(c.id, 'conteudo'), 'audiovisual', public.client_in_area(c.id, 'audiovisual')),
      'social_accounts', (select coalesce(jsonb_agg(jsonb_build_object('network', s.network, 'handle', s.handle)), '[]'::jsonb) from public.social_accounts s where s.client_id = c.id),
      'concorrentes', coalesce((select jsonb_agg(jsonb_build_object('nome', x->>'nome', 'instagram', nullif(x->>'instagram', ''), 'site', nullif(x->>'site', '')))
                                from jsonb_array_elements(case when jsonb_typeof(d.doc->'diagnostico'->'mercado'->'concorrentes') = 'array' then d.doc->'diagnostico'->'mercado'->'concorrentes' else '[]'::jsonb end) x), '[]'::jsonb),
      'concorrentes_cadastro', nullif(left(regexp_replace(coalesce(c.competitors, ''), '\s+', ' ', 'g'), 1200), ''),
      'ja_coletado', (select coalesce(jsonb_agg(jsonb_build_object('source', k.source, 'query', k.query)), '[]'::jsonb) from public.client_scan k where k.client_id = c.id and k.month = f.month),
      'diagnostico_pendente', coalesce(d.collect_status in ('pendente', 'coletando'), false)
    ) order by f.prio, c.name)
    from fila f join public.clients c on c.id = f.client_id
    left join public.consult_docs d on d.client_id = c.id
  ), '[]'::jsonb);
end $$;

-- Grava um resultado já resumido (uma busca). Recusa linha grande: a rotina tem que resumir antes.
create or replace function public.client_scan_save(_client uuid, _month date, _source text, _query text, _data jsonb, _credits integer default 0)
returns uuid language plpgsql security definer set search_path = public as $$
declare _id uuid; _m date := date_trunc('month', _month)::date; _q text := lower(trim(coalesce(_query, '')));
begin
  if not public.consult_collect_allowed() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if pg_column_size(coalesce(_data, '{}'::jsonb)) > 60000 then raise exception 'Resultado grande demais (%) bytes: resuma antes de gravar', pg_column_size(_data); end if;
  insert into public.client_scan (client_id, month, source, query, data, credits)
  values (_client, _m, _source, _q, coalesce(_data, '{}'::jsonb), greatest(0, coalesce(_credits, 0)))
  on conflict (client_id, month, source, query) do update set data = excluded.data, credits = public.client_scan.credits + excluded.credits, collected_at = now()
  returning id into _id;
  -- Diagnóstico esperando coleta: perfis e anúncios também entram em consult_collected (uma rotina enche os dois).
  if _source in ('perfis', 'ads_library') and exists (select 1 from public.consult_docs where client_id = _client and collect_status in ('pendente', 'coletando')) then
    perform public.consult_collect_save(_client, case _source when 'perfis' then 'instagram_posts' else 'meta_ad_library' end,
      case when _source = 'perfis' then '@' || ltrim(_q, '@') else _q end,
      case when _source = 'perfis' then 'https://www.instagram.com/' || ltrim(_q, '@') || '/' else null end, _data);
  end if;
  return _id;
end $$;

-- Fecha a coleta do cliente no mês (a rotina não volta nele; o motor não chama a API do Firecrawl).
create or replace function public.client_scan_done(_client uuid, _month date, _note text default null, _credits integer default 0, _partial boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.consult_collect_allowed() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  insert into public.client_scan_runs (client_id, month, status, credits, note)
  values (_client, date_trunc('month', _month)::date, case when _partial then 'parcial' else 'feito' end, greatest(0, coalesce(_credits, 0)), left(_note, 1000))
  on conflict (client_id, month) do update set status = excluded.status, credits = public.client_scan_runs.credits + excluded.credits, note = excluded.note, done_at = now();
end $$;

revoke all on function public.client_scan_queue(date, integer), public.client_scan_save(uuid, date, text, text, jsonb, integer), public.client_scan_done(uuid, date, text, integer, boolean) from public, anon;
grant execute on function public.client_scan_queue(date, integer), public.client_scan_save(uuid, date, text, text, jsonb, integer), public.client_scan_done(uuid, date, text, integer, boolean) to authenticated, service_role;

-- Central de automações.
insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk)
values ('est_coleta_redes', 'estrategia', 5, 'Coleta das redes para o plano do mês',
  'Uma tarefa agendada do Claude, com os conectores, busca para cada cliente os vídeos do TikTok, Reels, hashtags, perfis dos concorrentes e anúncios da Biblioteca da Meta, e guarda resumido. O plano do mês e o diagnóstico usam essa coleta em vez de pagar a API.',
  'Só lê (nada é publicado nem enviado). Até 120 créditos do Firecrawl por rodada. Prompt em docs/rotina-coleta-redes.md. Se faltar coleta, o plano usa a API do Firecrawl (se tiver crédito) e a pesquisa na web.',
  'Todo dia, 03:17 (e dia 25, 22:17, véspera do plano)', true, 'baixo')
on conflict (key) do update set title = excluded.title, what = excluded.what, how = excluded.how, schedule = excluded.schedule, module = excluded.module, position = excluded.position;
update public.automation_catalog set how = 'Só lê (nada é publicado nem enviado). Feita pela mesma tarefa agendada da Coleta das redes (docs/rotina-coleta-redes.md), que atende primeiro os diagnósticos na fila. O diagnóstico espera a coleta até 30 minutos e depois segue com o que tiver mais a pesquisa na web.' where key = 'est_coleta';

-- Gancho que o monthly-strategy já chama (index.ts: db.rpc('monthly_scan_extra')): devolve a coleta da rotina
-- no formato da varredura (tiktok, reels, hashtags, perfis, anuncios, google). Usa o mês do plano; se não houver,
-- a coleta mais recente (até 45 dias). Corta listas e textos para caber nos 20 mil caracteres que a função usa.
create or replace function public.monthly_scan_extra(_client uuid, _month date)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _m date; _out jsonb; _n int := 6; _t int := 140;
begin
  select coalesce(
    (select s.month from public.client_scan s where s.client_id = _client and s.month = date_trunc('month', _month)::date limit 1),
    (select s.month from public.client_scan s where s.client_id = _client and s.collected_at > now() - interval '45 days' order by s.collected_at desc limit 1)
  ) into _m;
  if _m is null then return null; end if;
  loop
    with r as (select source, query, data, collected_at from public.client_scan where client_id = _client and month = _m),
    cut as (
      select source, query, collected_at, (
        select coalesce(jsonb_agg(case when jsonb_typeof(e) = 'object' and e ? 'texto' then jsonb_set(e, '{texto}', to_jsonb(left(e->>'texto', _t))) else e end order by o), '[]'::jsonb)
        from jsonb_array_elements(coalesce(data->case source when 'tiktok' then 'videos' when 'instagram' then 'reels' when 'hashtags' then 'posts'
                                                             when 'perfis' then 'posts' when 'ads_library' then 'anuncios' else 'resultados' end, '[]'::jsonb)) with ordinality x(e, o)
        where o <= _n) as items, data
      from r)
    select jsonb_build_object(
      'fonte', 'coleta da rotina (conectores do Claude)', 'mes', _m, 'coletado_em', (select max(collected_at)::date from r),
      'tiktok', coalesce((select jsonb_agg(jsonb_build_object('busca', query, 'videos', items)) from cut where source = 'tiktok'), '[]'::jsonb),
      'reels', coalesce((select jsonb_agg(jsonb_build_object('busca', query, 'reels', items)) from cut where source = 'instagram'), '[]'::jsonb),
      'hashtags', coalesce((select jsonb_agg(jsonb_build_object('hashtag', '#' || ltrim(query, '#'), 'posts', items)) from cut where source = 'hashtags'), '[]'::jsonb),
      'perfis', coalesce((select jsonb_agg(jsonb_build_object('perfil', coalesce(data->>'perfil', '@' || ltrim(query, '@')), 'seguidores', data->'seguidores', 'posts', items)) from cut where source = 'perfis'), '[]'::jsonb),
      'anuncios', coalesce((select jsonb_agg(jsonb_build_object('busca', query, 'anuncios', items)) from cut where source = 'ads_library'), '[]'::jsonb),
      'google', coalesce((select jsonb_agg(jsonb_build_object('busca', query, 'resultados', items)) from cut where source = 'google'), '[]'::jsonb)
    ) into _out;
    exit when length(_out::text) <= 19500 or _n <= 2;
    _n := _n - 1; _t := greatest(60, _t - 20);
  end loop;
  return _out;
end $$;
revoke all on function public.monthly_scan_extra(uuid, date) from public, anon, authenticated;
grant execute on function public.monthly_scan_extra(uuid, date) to service_role;
