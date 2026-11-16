-- Estratégia interativa: aprovar um card manda para a produção da área (como o plano antigo fazia).
-- Vídeo → projeto no Audiovisual (av_projects); peça de social → pauta no Conteúdo (content_items);
-- campanha → tarefa de tráfego; atendimento → tarefa de atendimento. Resumo e Referências só ficam aprovados.
-- Uma vez só por card (routed_*); a equipe da área recebe o aviso de sempre (notify). Nada vai ao cliente.
alter table public.strategy_cards add column if not exists routed_table text, add column if not exists routed_id uuid, add column if not exists routed_link text;

create or replace function public.strategy_card_approve(_id uuid)
returns text language plpgsql security definer set search_path to '' as $$
declare _c public.strategy_cards; _d jsonb; _cname text; _plan uuid; _ref uuid; _table text; _link text; _kind text; _date date; _refs text[]; _txt text;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select * into _c from public.strategy_cards where id = _id for update;
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  update public.strategy_cards set status = 'aprovado', redo_requested_at = null, redo_pedido = null, updated_at = now() where id = _id;
  if _c.routed_id is not null or _c.tab in ('resumo', 'referencias') then return _c.routed_link; end if;
  _d := coalesce(_c.data, '{}'::jsonb);
  _cname := (select name from public.clients where id = _c.client_id);
  _refs := coalesce((select array_agg(distinct x) from (
      select _d->'referencia'->>'link' x union all select _d->'referencia_visual'->>'link' union all select _c.inspired->>'link') r
    where x ~ '^https?://'), '{}');
  -- "05/12" do card vira data no mês da estratégia.
  begin _date := make_date(extract(year from _c.month)::int, substring(_d->>'data_sugerida' from '/(\d{1,2})')::int, substring(_d->>'data_sugerida' from '^(\d{1,2})')::int);
  exception when others then _date := null; end;

  if _c.tab = 'audiovisual' then
    _txt := (select string_agg((n)::text || '. ' || coalesce(e->>'cena', '') || E'\n   ' || coalesce(e->>'fala', ''), E'\n' order by n)
             from jsonb_array_elements(case when jsonb_typeof(_d->'roteiro') = 'array' then _d->'roteiro' else '[]'::jsonb end) with ordinality as t(e, n));
    insert into public.av_projects (client_id, kind, month, title, briefing, script, status, due_date, updated_by, format, reference_links)
    values (_c.client_id, 'project', _c.month, left(_c.title, 200),
      left(concat_ws(E'\n\n',
        'Ganchos: ' || nullif((select string_agg(x, ' | ') from jsonb_array_elements_text(case when jsonb_typeof(_d->'ganchos') = 'array' then _d->'ganchos' else '[]'::jsonb end) x), ''),
        'Outras ideias com o mesmo material: ' || nullif((select string_agg(x, ' | ') from jsonb_array_elements_text(case when jsonb_typeof(_d->'outras_ideias') = 'array' then _d->'outras_ideias' else '[]'::jsonb end) x), ''),
        'Filmar: ' || nullif(_d->>'filmar', ''), 'Por que vai dar certo: ' || nullif(_d->>'cruzamento', ''),
        'Serve: ' || nullif(_c.serves, ''), 'Meta: ' || nullif(_c.goal, ''), 'Veio da Estratégia do mês.'), 8000),
      left(coalesce(_txt, ''), 20000), 'script', null, (select auth.uid()), nullif(left(coalesce(_d->>'formato', ''), 200), ''), _refs)
    returning id into _ref;
    _table := 'av_projects'; _link := '/audiovisual/projeto/' || _ref;
    perform public.notify(public.client_staff_profiles(_c.client_id, array['videomaker']), 'strategy_audiovisual',
      'Roteiro da estratégia do mês: ' || left(_c.title, 120), _cname || ' · agende a gravação', _link, _c.client_id);

  elsif _c.tab = 'social' then
    insert into public.content_plans (client_id, month) values (_c.client_id, _c.month)
    on conflict (client_id, month) do update set updated_at = public.content_plans.updated_at
    returning id into _plan;
    _kind := case _d->>'formato' when 'carrossel' then 'carrossel' when 'reels' then 'reels' when 'stories' then 'story' else 'post' end;
    insert into public.content_items (plan_id, client_id, number, kind, status, title, briefing, publish_date, deadline, updated_by,
      headline, caption, cta, carousel_slides, reference_links)
    values (_plan, _c.client_id, coalesce((select max(number) from public.content_items where plan_id = _plan), 0) + 1, _kind, 'briefing', left(_c.title, 200),
      left(concat_ws(E'\n\n', 'Ideia: ' || nullif(_d->>'ideia', ''), 'Imagem (foto real): ' || nullif(_d->>'ideia_imagem', ''),
        'Serve: ' || nullif(_c.serves, ''), 'Meta: ' || nullif(_c.goal, ''), 'Veio da Estratégia do mês.'), 8000),
      _date, _date, (select auth.uid()),
      nullif(left(coalesce(_d->>'copy', ''), 500), ''), nullif(left(coalesce(_d->>'legenda', ''), 4000), ''), nullif(left(coalesce(_d->>'cta', ''), 200), ''),
      coalesce((select jsonb_agg(jsonb_build_object('headline', left(x, 500), 'subtitle', '', 'image_urls', '[]'::jsonb, 'description', ''))
        from jsonb_array_elements_text(case when jsonb_typeof(_d->'slides') = 'array' then _d->'slides' else '[]'::jsonb end) x), '[]'::jsonb),
      _refs)
    returning id into _ref;
    _table := 'content_items'; _link := '/conteudo/peca/' || _ref;
    perform public.notify(public.client_staff_profiles(_c.client_id, array['social_media']), 'strategy_social',
      'Pauta da estratégia do mês: ' || left(_c.title, 120), _cname, _link, _c.client_id);

  else
    insert into public.traffic_tasks (title, description, priority, category, source, client_id, status, position, due_date, created_by, updated_by, dedupe_key)
    values (left(case when length(trim(_c.title)) >= 3 then _c.title else 'Estratégia: ' || _c.title end, 200),
      left(case when _c.tab = 'trafego' then concat_ws(E'\n',
          'Objetivo: ' || nullif(_d->>'objetivo', ''), 'Público: ' || nullif(_d->>'publico', ''), 'Criativo: ' || nullif(_d->>'criativo', ''),
          'Verba: ' || nullif((select string_agg((e->>'valor_dia') || ' (' || coalesce(e->>'o_que_esperar', '') || ')', '; ') from jsonb_array_elements(case when jsonb_typeof(_d->'verba_opcoes') = 'array' then _d->'verba_opcoes' else '[]'::jsonb end) e), ''),
          'Teste A/B: A) ' || coalesce(_d->'teste_ab'->>'a', '') || ' · B) ' || coalesce(_d->'teste_ab'->>'b', '') || ' · ' || coalesce(_d->'teste_ab'->>'como_decidir', ''),
          'Meta: ' || nullif(_c.goal, ''), 'Veio da Estratégia do mês (Meta Ads só leitura: subir só com aprovação).')
        else concat_ws(E'\n', 'Oferta: ' || nullif(_d->>'oferta', ''),
          'Roteiro: ' || nullif((select string_agg(x, ' / ') from jsonb_array_elements_text(case when jsonb_typeof(_d->'roteiro_whatsapp') = 'array' then _d->'roteiro_whatsapp' else '[]'::jsonb end) x), ''),
          'Objeções: ' || nullif((select string_agg((e->>'objecao') || ' → ' || coalesce(e->>'resposta', ''), ' / ') from jsonb_array_elements(case when jsonb_typeof(_d->'objecoes') = 'array' then _d->'objecoes' else '[]'::jsonb end) e), ''),
          'Veio da Estratégia do mês.') end, 4000),
      'normal', case when _c.tab = 'trafego' then 'campanha' else 'atendimento' end,
      'strategist', _c.client_id, 'todo', 0, null, (select auth.uid()), (select auth.uid()), 'strategy:' || _c.id)
    returning id into _ref;
    _table := 'traffic_tasks'; _link := '/trafego/tarefas?tarefa=' || _ref;
    perform public.notify(public.client_staff_profiles(_c.client_id, array[case when _c.tab = 'trafego' then 'traffic_manager' else 'head_marketing' end]),
      'strategy_traffic', 'Da estratégia do mês: ' || left(_c.title, 120), _cname, _link, _c.client_id);
  end if;

  update public.strategy_cards set routed_table = _table, routed_id = _ref, routed_link = _link where id = _id;
  return _link;
end $$;
grant execute on function public.strategy_card_approve(uuid) to authenticated;
