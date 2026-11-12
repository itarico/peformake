-- Estratégia organizada (interface nova) + o que a guia de revisão deixou pela metade:
-- 1) Link público do audiovisual (/apresentacao/audiovisual/:token): a revisão da equipe vem à parte (monthly_av_public_review),
--    para a página esconder os slides recusados e usar o texto editado. Função separada para não mexer em monthly_av_public
--    (que o modo gravação também altera). Sem os motivos.
-- 2) Link público do plano do mês: diz quais ações a equipe adicionou na revisão ('added'), para cada uma ganhar slide próprio.

create or replace function public.monthly_av_public_review(_token text) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare _s public.monthly_strategies;
begin
  if _token is null or length(_token) < 40 then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  select * into _s from public.monthly_strategies where av_share_token = _token;
  if not found then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  return (select jsonb_build_object('slides', coalesce((select jsonb_object_agg(x.key, x.value - 'reason')
      from jsonb_each(case when jsonb_typeof(r.state -> 'slides') = 'object' then r.state -> 'slides' else '{}'::jsonb end) x), '{}'::jsonb))
    from public.strategy_reviews r where r.kind = 'audiovisual' and r.client_id = _s.client_id and r.ref = to_char(_s.month, 'YYYY-MM-DD'));
end $$;
grant execute on function public.monthly_av_public_review(text) to anon, authenticated;

create or replace function public.monthly_public(_token text) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare _s public.monthly_strategies;
begin
  if _token is null or length(_token) < 40 then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  select * into _s from public.monthly_strategies where share_token = _token;
  if not found then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  if _s.status not in ('pronto', 'aprovado') then return jsonb_build_object('updating', true); end if;
  return public.monthly_public_payload(_s.id) || jsonb_build_object('review', (
    select jsonb_build_object('slides', coalesce((select jsonb_object_agg(x.key, x.value - 'reason') from jsonb_each(case when jsonb_typeof(r.state -> 'slides') = 'object' then r.state -> 'slides' else '{}'::jsonb end) x), '{}'::jsonb))
    from public.strategy_reviews r where r.kind = 'plano' and r.client_id = _s.client_id and r.ref = to_char(_s.month, 'YYYY-MM-DD')),
    'added', coalesce((select jsonb_agg(a.id) from public.monthly_strategy_actions a
      where a.strategy_id = _s.id and a.status <> 'recusada' and a.payload ->> 'source' = 'revisao'), '[]'::jsonb));
end $$;
