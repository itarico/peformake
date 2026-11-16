-- Decisão do Italo (16/11): a Estratégia interativa SUBSTITUI o "Plano do mês" antigo (monthly-strategy pela API). Desligado de vez:
-- sem fila do dia 26 nem ajuste de segunda; a lista da Consultoria (consult_list.monthly) passa a ler o quadro novo (strategy_boards).
-- Os planos antigos ficam só para consulta (/plano/:cliente/:mes).
update public.consult_settings set monthly_enabled = false, adjust_enabled = false;
update public.automation_catalog set schedule = 'Desligada em 16/11: substituída pela Estratégia interativa' where key in ('est_mensal', 'est_ajuste_segunda');

-- Gerar pelo motor antigo não é mais possível.
create or replace function public.monthly_request(_client uuid, _month date, _ideas text default null)
returns text language plpgsql security definer set search_path to '' as $$
begin
  raise exception 'O plano do mês antigo foi substituído pela Estratégia interativa' using errcode = 'PF006';
end $$;

create or replace function public.consult_list()
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare _lead boolean := public.consult_can();
begin
  if not (_lead or public.has_role('traffic_manager'::public.app_role) or public.has_role('social_media'::public.app_role) or public.has_role('designer'::public.app_role)) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'client_id', c.id, 'name', c.name, 'logo_path', c.logo_path, 'segment', c.segment,
      'document', case when _lead then c.document end, 'instagram', c.instagram, 'website', c.website,
      'consultoria', x.co,
      'areas', jsonb_build_object('trafego', x.tr, 'social', x.so, 'audiovisual', x.av),
      'status', coalesce(d.status, case when cardinality(public.consult_missing(c.id)) > 0 then 'falta_dados' else 'na_fila' end),
      'stage', d.stage, 'redo_section', d.redo_section, 'error', d.error,
      'updated_at', coalesce(d.updated_at, c.updated_at), 'finished_at', d.finished_at,
      'suggestions', (select count(*) from public.client_ai_suggestions s where s.client_id = c.id and s.status = 'pendente'),
      'can_generate', _lead and x.co and public.ai_generation_allowed(c.id, 'consultoria'),
      'direction', case when _lead then (select d2.body from public.client_directions d2 where d2.client_id = c.id and d2.area = 'consultoria' and d2.month is null) end,
      'questions_open', (select count(*) from public.client_questions q where q.client_id = c.id and q.area = 'consultoria' and q.status in ('pendente', 'enviada')),
      'questions_answered', (select count(*) from public.client_questions q where q.client_id = c.id and q.area = 'consultoria' and q.status = 'respondida'),
      'answers_new', (select count(*) from public.client_questions q where q.client_id = c.id and q.status = 'respondida' and q.answered_via = 'cliente' and q.answered_at > now() - interval '7 days'),
      'answers_last', (select max(q.answered_at) from public.client_questions q where q.client_id = c.id and q.status = 'respondida' and q.answered_via = 'cliente'),
      'share_token', case when _lead then d.share_token end,
      -- Estratégia interativa do mês mais recente: cards esperando revisão (proposta) e pedidos de refazer.
      'monthly', (select jsonb_build_object('month', b.month, 'status', b.status, 'finished_at', b.finished_at,
          'pending', (select count(*) from public.strategy_cards s where s.board_id = b.id and s.status = 'proposta'),
          'suggestions', 0)
        from public.strategy_boards b where b.client_id = c.id order by b.month desc limit 1)
    ) order by c.name)
    from public.clients c
    cross join lateral (select public.consult_has_service(c.id) co, public.client_in_area(c.id, 'trafego') tr,
      public.client_in_area(c.id, 'conteudo') so, public.client_in_area(c.id, 'audiovisual') av) x
    left join public.consult_docs d on d.client_id = c.id
    where (x.co or x.tr or x.so or x.av)
      and (_lead or public.monthly_area_ok(c.id, 'trafego') or public.monthly_area_ok(c.id, 'social'))
  ), '[]'::jsonb);
end $function$;
