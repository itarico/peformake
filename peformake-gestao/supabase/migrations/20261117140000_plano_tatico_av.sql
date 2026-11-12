-- Plano tático do audiovisual no link público (/apresentacao/audiovisual/:token): guia da marca e o que o plano traz
-- para as páginas de essência, tom de voz, expressão, linguagem de vídeo e linha editorial.
-- Função separada (monthly_av_public continua igual). Só o que pode ir ao cliente: nada de papel interno, pendências ou custo.
create or replace function public.monthly_av_public_extra(_token text) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare _s public.monthly_strategies;
begin
  if _token is null or length(_token) < 40 then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  select * into _s from public.monthly_strategies where av_share_token = _token;
  if not found then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  if _s.status not in ('pronto', 'aprovado') then return null; end if;
  return (
    select jsonb_build_object(
      'client', jsonb_build_object('segment', c.segment, 'niche', c.niche,
        'brand_style', case when jsonb_typeof(c.brand_style) = 'object' then jsonb_strip_nulls(jsonb_build_object(
          'cores', c.brand_style->'cores', 'essencia', c.brand_style->'essencia', 'foto', c.brand_style->'foto', 'personalidade', c.brand_style->'personalidade',
          'voz', c.brand_style->'voz', 'faca', c.brand_style->'faca', 'evite', c.brand_style->'evite', 'layout', c.brand_style->'layout', 'grafismo', c.brand_style->'grafismo')) end),
      'voice', (select jsonb_build_object('essencia', public.monthly_clean(v.essencia), 'proposito', public.monthly_clean(v.proposito), 'arquetipo', public.monthly_clean(v.arquetipo),
          'tom', v.tom, 'evitar', v.evitar, 'expressao', v.expressao, 'regra_teste', public.monthly_clean(v.regra_teste))
        from public.client_brand_voice v where v.client_id = c.id),
      'guide', (select g.guide from public.client_brand_guides g where g.client_id = c.id),
      'titulo', _s.doc->'titulo', 'foco', _s.doc->'foco',
      'plano', jsonb_strip_nulls(jsonb_build_object(
        'marca', _s.doc#>'{plano,marca}',
        'series', coalesce((select jsonb_agg(jsonb_build_object('codigo', x->'codigo', 'nome', x->'nome', 'o_que_e', public.monthly_clean(x->>'o_que_e'), 'episodios', x->'episodios'))
          from jsonb_array_elements(coalesce(_s.doc#>'{plano,series}', '[]')) x), '[]'::jsonb),
        'perfil_fala', _s.doc#>'{plano,perfil_fala}', 'linguagem_video', _s.doc#>'{plano,linguagem_video}', 'linguagem_frase', _s.doc#>'{plano,linguagem_frase}',
        'papel_audiovisual', _s.doc#>'{plano,papel_audiovisual}', 'quem_fala', _s.doc#>'{plano,quem_fala}', 'quem_grava', _s.doc#>'{plano,quem_grava}'))
    )
    from public.clients c where c.id = _s.client_id
  );
end $$;
revoke all on function public.monthly_av_public_extra(text) from public;
grant execute on function public.monthly_av_public_extra(text) to anon, authenticated;
