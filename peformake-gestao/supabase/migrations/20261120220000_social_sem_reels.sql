-- Social media é só post e carrossel (Italo, 20/11): card que chega na aba social com formato Reels/vídeo vai para Vídeos.
CREATE OR REPLACE FUNCTION public.strategy_card_row(_c jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'tab', case when _c->>'aba' = 'social' and coalesce(_c->>'formato', '') ~* '(reels?|v[ií]deo|tiktok|shorts)' then 'audiovisual' else _c->>'aba' end,
    'kind', coalesce(_c->>'tipo', 'card'), 'title', left(coalesce(nullif(_c->>'titulo', ''), 'Sem título'), 160),
    'funnel', case when _c->>'funil' in ('atrair', 'provar', 'objecao', 'converter') then _c->>'funil' end,
    'serves', nullif(left(coalesce(_c->>'serve', ''), 160), ''), 'goal', nullif(left(coalesce(_c->>'meta', ''), 120), ''),
    'inspired', case when coalesce(_c->'inspirado'->>'link', '') <> '' or coalesce(_c->'inspirado'->>'numero', '') <> '' then _c->'inspirado' end,
    'assumed', nullif(left(coalesce(_c->>'suposicao', ''), 200), ''),
    'data', _c - array['aba', 'tipo', 'titulo', 'funil', 'serve', 'meta', 'inspirado', 'suposicao'])
$function$;
update public.strategy_cards set tab = 'audiovisual' where tab = 'social' and coalesce(data->>'formato','') ~* '(reels?|v[ií]deo|tiktok|shorts)';
