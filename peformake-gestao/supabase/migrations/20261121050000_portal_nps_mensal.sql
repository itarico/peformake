-- NPS no fim das perguntas do mês do portal (Italo, 20/11): uma vez por mês por cliente, no mesmo lugar do NPS de sempre
-- (crm_nps + clients.nps), para o Comercial e o resumo de Clientes contarem sozinhos. Nota 0 a 6 avisa a equipe (urgente).
create or replace function public.portal_brief(_token text, _month date)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare _client uuid := public.portal_resolve(_token); m text := to_char(_month, 'YYYY-MM');
begin
  return jsonb_build_object(
    'data', coalesce((select b.data - 'cnpj' from public.client_briefs b where b.client_id = _client), '{}'::jsonb),
    'known', (select jsonb_build_object('segment', c.segment, 'description', c.description, 'target_audience', c.target_audience,
        'value_proposition', c.value_proposition, 'competitors', c.competitors, 'instagram', c.instagram, 'website', c.website, 'phone', c.phone)
      from public.clients c where c.id = _client),
    'links', coalesce((select jsonb_agg(jsonb_build_object('name', l.name, 'url', l.url)) from (select name, url from public.client_links where client_id = _client limit 30) l), '[]'::jsonb),
    'voz', (select jsonb_build_object('essencia', v.essencia, 'tom', v.tom, 'evitar', v.evitar) from public.client_brand_voice v where v.client_id = _client),
    'rivals', (select d.doc->'diagnostico'->'mercado'->'concorrentes' from public.consult_docs d where d.client_id = _client),
    'has_video', exists (select 1 from public.client_services cs join public.services s on s.id = cs.service_id
      where cs.client_id = _client and cs.is_active and s.is_audiovisual),
    'docs', coalesce((select jsonb_agg(jsonb_build_object('name', a.name, 'at', a.created_at) order by a.created_at desc)
      from (select name, created_at from public.client_assets where client_id = _client and folder = 'briefing' order by created_at desc limit 20) a), '[]'::jsonb),
    'brand', public.client_brand(_client),
    'nps_done', exists (select 1 from public.crm_nps n where n.client_id = _client and n.phone_key = 'portal:' || m and n.score is not null),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'why', case when q.why ilike 'Do diagn%' then null else q.why end, 'options', q.options, 'cond', q.cond,
        'answer', q.answer, 'status', q.status, 'answered_via', q.answered_via) order by q.created_at)
      from public.client_questions q where q.client_id = _client and q.pack = 'briefing_mes' and q.focus = m and q.status <> 'descartada'), '[]'::jsonb));
end $function$;
revoke execute on function public.portal_brief(text, date) from public;
grant execute on function public.portal_brief(text, date) to anon, authenticated;

create or replace function public.portal_brief_nps(_token text, _month date, _score integer, _comment text default null)
returns void language plpgsql security definer set search_path to '' as $function$
declare
  _client uuid := public.portal_resolve(_token);
  _key text := 'portal:' || to_char(_month, 'YYYY-MM');
  _row public.crm_nps; _phone text; _name text;
begin
  if _score is not null and (_score < 0 or _score > 10) then raise exception 'Nota de 0 a 10' using errcode = 'PF006'; end if;
  select * into _row from public.crm_nps where client_id = _client and phone_key = _key order by requested_at desc limit 1;
  if _row.id is null then
    if _score is null then raise exception 'Nota de 0 a 10' using errcode = 'PF006'; end if;
    select coalesce(nullif(phone, ''), 'portal') into _phone from public.clients where id = _client;
    insert into public.crm_nps (client_id, phone, phone_key, status, score, comment, requested_at, answered_at, commented_at)
    values (_client, _phone, _key, 'answered', _score, coalesce(left(trim(_comment), 2000), ''), now(), now(), case when _comment is not null then now() end);
  else
    update public.crm_nps set
      score = coalesce(_score, score),
      comment = coalesce(left(trim(_comment), 2000), comment),
      commented_at = case when _comment is not null then now() else commented_at end
     where id = _row.id;
  end if;
  if _score is not null then
    update public.clients set nps = _score where id = _client;
    -- Cliente insatisfeito: avisa uma vez (na primeira nota baixa do mês).
    if _score <= 6 and (_row.id is null or coalesce(_row.score, 99) > 6) then
      select trim(name) into _name from public.clients where id = _client;
      perform public.notify(public.commercial_team_profiles() || public.client_staff_profiles(_client, array['head_marketing']),
        'crm_nps_detractor', 'Nota baixa no NPS: ' || _score || ' de ' || _name, 'Respondeu no portal, nas perguntas do mês. Ligue para entender o motivo.',
        '/estrategia/consultoria?cliente=' || _client::text || '&ver=perguntas', _client);
    end if;
  end if;
end $function$;
revoke execute on function public.portal_brief_nps(text, date, integer, text) from public;
grant execute on function public.portal_brief_nps(text, date, integer, text) to anon, authenticated;
