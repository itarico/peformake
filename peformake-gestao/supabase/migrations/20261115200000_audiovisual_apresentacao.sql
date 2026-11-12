-- Plano do mês → Audiovisual: link público só dos vídeos APROVADOS (roteiro, filmagem, referências, anúncio), na identidade Ellcazo.
-- Código próprio (não é o mesmo link da estratégia do mês). Quem cria: administrador/head ou quem cuida do audiovisual do cliente.
-- O público nunca recebe: observações internas, "a confirmar", custo/verba, público dos anúncios, link do sistema.

alter table public.monthly_strategies
  add column if not exists av_share_token text unique,
  add column if not exists av_share_created_at timestamptz;

create or replace function public.monthly_av_share(_strategy uuid)
returns text language plpgsql security definer set search_path to '' as $$
declare _t text; _c uuid;
begin
  select client_id into _c from public.monthly_strategies where id = _strategy;
  if _c is null or not (public.consult_can() or public.monthly_area_ok(_c, 'audiovisual')) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  update public.monthly_strategies set
    av_share_token = coalesce(av_share_token, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')),
    av_share_created_at = coalesce(av_share_created_at, now())
  where id = _strategy and status in ('pronto', 'aprovado')
  returning av_share_token into _t;
  if _t is null then raise exception 'A estratégia ainda não está pronta' using errcode = 'PF005'; end if;
  return _t;
end $$;

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
      'doc', jsonb_build_object('plano', jsonb_build_object(
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

revoke all on function public.monthly_av_share(uuid) from public, anon;
grant execute on function public.monthly_av_share(uuid) to authenticated;
revoke all on function public.monthly_av_public(text) from public;
grant execute on function public.monthly_av_public(text) to anon, authenticated;
