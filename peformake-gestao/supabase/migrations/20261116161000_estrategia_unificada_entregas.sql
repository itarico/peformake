-- Plano do mês unificado: "Estratégia do mês" (entregas, metas, retenção, operação) passa a contar também o plano novo
-- (monthly_strategies): feita = gerada; enviada = aprovada pela equipe ou link mandado ao cliente. As estratégias antigas continuam contando.
-- Troca só o trecho que lia traffic_strategies (o resto de cada função fica como está).
do $mig$
declare _f record; _def text; _new text;
  _pairs text[][] := array[
    array['client_deliveries',
      'select t.client_id, max(t.sent_at) sent, max(t.created_at) made from public.traffic_strategies t where t.kind = ''monthly'' and t.month = _m group by t.client_id',
      'select x.client_id, max(x.sent) sent, max(x.made) made from (select t.client_id, t.sent_at sent, t.created_at made from public.traffic_strategies t where t.kind = ''monthly'' and t.month = _m union all select ms.client_id, coalesce(ms.share_created_at, ms.approved_at), ms.finished_at from public.monthly_strategies ms where ms.month = _m) x group by x.client_id'],
    array['client_deliveries_all',
      'select t.client_id, max(t.sent_at) sent, max(t.created_at) made from public.traffic_strategies t where t.kind = ''monthly'' and t.month = _m group by t.client_id',
      'select x.client_id, max(x.sent) sent, max(x.made) made from (select t.client_id, t.sent_at sent, t.created_at made from public.traffic_strategies t where t.kind = ''monthly'' and t.month = _m union all select ms.client_id, coalesce(ms.share_created_at, ms.approved_at), ms.finished_at from public.monthly_strategies ms where ms.month = _m) x group by x.client_id'],
    array['role_goal_value',
      'select count(distinct client_id) into _v from public.traffic_strategies where kind = ''monthly'' and month = _m and sent_at is not null;',
      'select count(distinct x.client_id) into _v from (select client_id from public.traffic_strategies where kind = ''monthly'' and month = _m and sent_at is not null union select client_id from public.monthly_strategies where month = _m and coalesce(share_created_at, approved_at) is not null) x;'],
    array['retention_overview',
      '''strategy_sent'', exists (select 1 from public.traffic_strategies s, m where s.client_id = c.id and s.month = m.n and s.sent_at is not null),',
      '''strategy_sent'', (exists (select 1 from public.traffic_strategies s, m where s.client_id = c.id and s.month = m.n and s.sent_at is not null) or exists (select 1 from public.monthly_strategies ms, m where ms.client_id = c.id and ms.month = m.n and coalesce(ms.share_created_at, ms.approved_at) is not null)),'],
    array['member_deliveries',
      '''estrategias'', (select count(*) from public.traffic_strategies st where st.reviewed_by = _profile and st.reviewed_at >= _m and st.reviewed_at < _n)',
      '''estrategias'', (select count(*) from public.traffic_strategies st where st.reviewed_by = _profile and st.reviewed_at >= _m and st.reviewed_at < _n) + (select count(distinct ma.strategy_id) from public.monthly_strategy_actions ma where ma.decided_by = _profile and ma.status = ''aprovada'' and ma.decided_at >= _m and ma.decided_at < _n)'],
    array['operation_progress',
      'from public.traffic_strategies s where s.month >= _m and s.month < _n group by s.client_id',
      'from (select client_id, status, reviewed_at, month from public.traffic_strategies union all select client_id, case when approved_at is not null then ''approved'' else status end, approved_at, month from public.monthly_strategies) s where s.month >= _m and s.month < _n group by s.client_id'],
    array['client_service_status',
      'select t.client_id, count(*) filter (where t.sent_at is not null) sent from public.traffic_strategies t
    where t.kind = ''monthly'' and t.month = _m group by t.client_id',
      'select t.client_id, count(*) filter (where t.sent_at is not null) sent from (select client_id, sent_at, kind, month from public.traffic_strategies union all select client_id, coalesce(share_created_at, approved_at), ''monthly'', month from public.monthly_strategies) t
    where t.kind = ''monthly'' and t.month = _m group by t.client_id']
  ];
  _i int;
begin
  for _i in 1 .. array_length(_pairs, 1) loop
    select p.oid, pg_get_functiondef(p.oid) def into _f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = _pairs[_i][1] limit 1;
    if _f is null then raise exception 'função % não encontrada', _pairs[_i][1]; end if;
    _def := _f.def;
    if position(_pairs[_i][3] in _def) > 0 then continue; end if; -- já aplicado
    if position(_pairs[_i][2] in _def) = 0 then raise exception 'trecho não encontrado em %', _pairs[_i][1]; end if;
    _new := replace(_def, _pairs[_i][2], _pairs[_i][3]);
    execute _new;
  end loop;
end $mig$;
