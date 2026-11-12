-- Modo gravação (/gravacao/:clientId/:mes): no set, cada vídeo do plano do mês com "Feito" por cena, "Gravado" no vídeo,
-- o roteiro de fala editado ali mesmo e as anotações do set. Cada toque salva na hora.
-- Uma linha por cena (scene_index 0, 1, 2…) e uma pelo vídeo inteiro (scene_index -1 = gravado + anotação).
-- Gravado avança o projeto do audiovisual ligado à ação (Roteiro/Captação marcada → Captado) e avisa o editor,
-- como av_set_status já faz. O texto editado vale também no pop-up "Ver roteiro", no PDF curto e na apresentação
-- (o link público recebe só o texto, nunca as anotações).

create table if not exists public.monthly_av_takes (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.monthly_strategies(id),
  client_id uuid not null references public.clients(id),
  video_key text not null check (length(video_key) between 1 and 80),
  scene_index integer not null default -1 check (scene_index between -1 and 200),
  done_at timestamptz,
  done_by uuid,
  text_override text check (length(text_override) <= 2000),
  note text check (length(note) <= 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (strategy_id, video_key, scene_index)
);
create index if not exists monthly_av_takes_client on public.monthly_av_takes (client_id);
alter table public.monthly_av_takes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'monthly_av_takes' and policyname = 'monthly_av_takes_read') then
    create policy monthly_av_takes_read on public.monthly_av_takes for select to authenticated
      using (public.monthly_area_ok(client_id, 'audiovisual'));
  end if;
end $$;
grant select on public.monthly_av_takes to authenticated;

-- Um toque no set: _patch = {"done": true|false} e/ou {"text": "..."|null} e/ou {"note": "..."|null}.
create or replace function public.monthly_av_take_save(_strategy uuid, _video text, _scene integer, _patch jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare _s public.monthly_strategies; _a public.monthly_strategy_actions; _p public.av_projects; _t public.monthly_av_takes;
  _advanced text; _client text; _done boolean;
begin
  select * into _s from public.monthly_strategies where id = _strategy;
  if not found then raise exception 'Não encontrado' using errcode = 'PF004'; end if;
  if not public.monthly_area_ok(_s.client_id, 'audiovisual') then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _video is null or length(_video) < 1 or length(_video) > 80 or _scene is null or _scene < -1 or _scene > 200 then
    raise exception 'Confira os dados' using errcode = 'PF006';
  end if;
  _patch := coalesce(_patch, '{}'::jsonb);
  _done := case when _patch ? 'done' then coalesce((_patch->>'done')::boolean, false) end;

  insert into public.monthly_av_takes as t (strategy_id, client_id, video_key, scene_index, done_at, done_by, text_override, note, updated_at, updated_by)
  values (_strategy, _s.client_id, _video, _scene,
    case when _done then now() end, case when _done then (select auth.uid()) end,
    nullif(left(trim(coalesce(_patch->>'text', '')), 2000), ''), nullif(left(trim(coalesce(_patch->>'note', '')), 1000), ''),
    now(), (select auth.uid()))
  on conflict (strategy_id, video_key, scene_index) do update set
    done_at = case when _patch ? 'done' then (case when _done then coalesce(t.done_at, now()) end) else t.done_at end,
    done_by = case when _patch ? 'done' then (case when _done then coalesce(t.done_by, (select auth.uid())) end) else t.done_by end,
    text_override = case when _patch ? 'text' then excluded.text_override else t.text_override end,
    note = case when _patch ? 'note' then excluded.note else t.note end,
    updated_at = now(), updated_by = (select auth.uid())
  returning * into _t;

  -- Vídeo gravado: o projeto do audiovisual ligado à ação vai para "Captado" e o editor é avisado.
  if _scene = -1 and _done then
    select * into _a from public.monthly_strategy_actions where strategy_id = _strategy and id::text = _video;
    if found and _a.routed_table = 'av_projects' and _a.routed_id is not null then
      select * into _p from public.av_projects where id = _a.routed_id for update;
      if found and _p.status in ('script', 'scheduled') then
        update public.av_projects set status = 'captured',
          checkout_at = coalesce(checkout_at, now()),
          due_date = coalesce(due_date, ((now() at time zone 'America/Sao_Paulo')::date + 2)),
          updated_at = now(), updated_by = (select auth.uid())
        where id = _p.id;
        insert into public.av_events (project_id, actor_id, actor_kind, from_status, to_status, message)
        values (_p.id, (select auth.uid()), 'staff', _p.status, 'captured', 'Gravado no set (modo gravação)');
        select name into _client from public.clients where id = _p.client_id;
        perform public.notify(coalesce(array[(select profile_id from public.staff_members where id = _p.editor_id)], '{}')
          || public.client_staff_profiles(_p.client_id, array['editor']),
          'av_captured', 'Material para editar: ' || _client,
          _p.title || case when _p.raw_link is null then ' · gravado agora; o bruto chega pelo link da captação' else '' end,
          '/audiovisual/projeto/' || _p.id, _p.client_id);
        _advanced := 'captured';
      end if;
    end if;
  end if;

  return jsonb_build_object('video_key', _t.video_key, 'scene_index', _t.scene_index, 'done_at', _t.done_at, 'done_by', _t.done_by,
    'text_override', _t.text_override, 'note', _t.note, 'updated_at', _t.updated_at, 'advanced', _advanced);
end $$;

grant execute on function public.monthly_av_take_save(uuid, text, integer, jsonb) to authenticated;

-- Link público do audiovisual: passa a levar o roteiro de fala editado no set (doc.av_takes).
create or replace function public.monthly_av_public(_token text)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _s public.monthly_strategies;
begin
  if _token is null or length(_token) < 40 then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  select * into _s from public.monthly_strategies where av_share_token = _token;
  if not found then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  if _s.status not in ('pronto', 'aprovado') then return jsonb_build_object('updating', true); end if;
  return (
    select jsonb_build_object(
      'name', trim(c.name), 'month', _s.month, 'status', _s.status,
      'doc', jsonb_build_object(
        -- Roteiro de fala editado no set (modo gravação): só o texto; anotações do set ficam de fora.
        'av_takes', coalesce((select jsonb_agg(jsonb_build_object('video_key', t.video_key, 'scene_index', t.scene_index, 'text_override', t.text_override))
          from public.monthly_av_takes t where t.strategy_id = _s.id and t.scene_index >= 0 and nullif(trim(coalesce(t.text_override, '')), '') is not null), '[]'::jsonb),
        'plano', jsonb_build_object(
        'calendario', jsonb_build_object(
          'pecas', coalesce((select jsonb_agg(jsonb_build_object(
              'id', p->'id', 'data', p->'data', 'formato', p->'formato', 'serie', p->'serie', 'titulo', p->'titulo', 'objetivo', p->'objetivo', 'funil', p->'funil', 'papel', p->'papel', 'papel_porque', public.monthly_clean(p->>'papel_porque'),
              'ideia', public.monthly_clean(p->>'ideia'), 'material', p->'material', 'vira_anuncio', p->'vira_anuncio', 'tendencia_link', p->'tendencia_link',
              'copy', case when p->'copy' is null or jsonb_typeof(p->'copy') <> 'object' then null
                else (p->'copy') - 'observacoes_internas' - 'metrica' end))
            from jsonb_array_elements(coalesce(_s.doc#>'{plano,calendario,pecas}', '[]')) p where p->>'formato' = 'reels'), '[]'::jsonb),
          'capturas', coalesce((select jsonb_agg(jsonb_build_object('data', k->'data', 'onde', k->'onde', 'quem', k->'quem', 'quem_apresenta', k->'quem_apresenta', 'pecas', k->'pecas', 'o_que_gravar', k->'o_que_gravar'))
            from jsonb_array_elements(coalesce(_s.doc#>'{plano,calendario,capturas}', '[]')) k), '[]'::jsonb),
          'banco_ideias', coalesce((select jsonb_agg(jsonb_build_object('tipo', b->'tipo', 'ideia', public.monthly_clean(b->>'ideia')))
            from jsonb_array_elements(coalesce(_s.doc#>'{plano,calendario,banco_ideias}', '[]')) b), '[]'::jsonb)),
        'series', coalesce((select jsonb_agg(jsonb_build_object('codigo', x->'codigo', 'nome', x->'nome', 'episodios', x->'episodios'))
          from jsonb_array_elements(coalesce(_s.doc#>'{plano,series}', '[]')) x), '[]'::jsonb),
        'pesquisa', jsonb_build_object(
          'tendencias', coalesce((select jsonb_agg(jsonb_build_object('link', t->'link', 'tendencia', t->'tendencia', 'ideia', t->'ideia', 'numeros', t->'numeros', 'plataforma', t->'plataforma', 'por_que_serve', public.monthly_clean(t->>'por_que_serve')))
            from jsonb_array_elements(coalesce(_s.doc#>'{plano,pesquisa,tendencias}', '[]')) t), '[]'::jsonb),
          'referencias', coalesce((select jsonb_agg(jsonb_build_object('link', r->'link', 'nome', r->'nome', 'o_que_faz', r->'o_que_faz'))
            from jsonb_array_elements(coalesce(_s.doc#>'{plano,pesquisa,referencias}', '[]')) r), '[]'::jsonb)),
        'trafego', jsonb_build_object(
          'anuncios', coalesce((select jsonb_agg(jsonb_build_object('peca_id', a->'peca_id', 'criativo', a->'criativo', 'texto_principal', a->'texto_principal', 'variacoes', a->'variacoes', 'titulo', a->'titulo', 'cta', a->'cta'))
            from jsonb_array_elements(coalesce(_s.doc#>'{plano,trafego,anuncios}', '[]')) a), '[]'::jsonb),
          'campanhas', coalesce((select jsonb_agg(jsonb_build_object('conjuntos', coalesce((select jsonb_agg(jsonb_build_object('criativos', j->'criativos'))
              from jsonb_array_elements(coalesce(cp->'conjuntos', '[]')) j), '[]'::jsonb)))
            from jsonb_array_elements(coalesce(_s.doc#>'{plano,trafego,campanhas}', '[]')) cp), '[]'::jsonb))
      )),
      'actions', coalesce((select jsonb_agg(jsonb_build_object(
          'id', a.id, 'week', a.week, 'area', a.area, 'title', a.title, 'due_date', a.due_date, 'status', a.status, 'format', a.format,
          'what', regexp_replace(regexp_replace(coalesce(a.what, ''), 'ATEN[ÇC][ÃA]O:.*?(?=\s(PRECISA|REGRAS)\M|$)', '', 'g'), 'Plano do m[êe]s \(sua se[çc][ãa]o\):\s*\S+', '', 'g')
        ) order by a.week, a.position, a.created_at)
        from public.monthly_strategy_actions a where a.strategy_id = _s.id and a.area = 'audiovisual' and a.status = 'aprovada'), '[]'::jsonb),
      'scan', coalesce((select jsonb_agg(jsonb_build_object('source', x.source, 'data', x.data))
        from public.client_scan x where x.client_id = _s.client_id and x.month = _s.month and x.source in ('tiktok', 'instagram')), '[]'::jsonb)
    )
    from public.clients c where c.id = _s.client_id
  );
end $$;
