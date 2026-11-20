-- APLICADA em 20/11 pelo Italo no SQL Editor (ponto do tr_resultados trocado por regexp_replace, que ignora espaços; mesmo efeito). Conferida no banco.
-- Revisão da área de cada membro (20/11/2026), fonte de cada número:
-- 1) Social, "Nenhuma peça parada na aprovação": contava o tempo desde a última edição qualquer da peça (updated_at).
--    Agora conta desde que a peça foi para o cliente (histórico content_events; sem histórico, cai no updated_at).
-- 2) Relacionamento, "Reunião do mês com cada cliente": contava reunião só "marcada" com a data passada como feita.
--    Agora só conta a reunião marcada como Feita (botão na ficha do cliente).
-- 3) Tráfego medido pelo resultado: meta nova "Clientes com a meta de tráfego batida" (tr_resultados), a partir das metas
--    de cada cliente (Tráfego → Metas: CPL, CPA, ROAS, leads, vendas...). Fica desligada; o admin liga na remuneração.
-- 4) Placar: tarefas de social (social_tasks) passam a contar junto com as de tráfego (+3 feita, -2 vencida).

do $mig$
declare d text := pg_get_functiondef('public.member_goal_value(uuid, text, date, numeric)'::regprocedure); o text; n int := 0;
begin
  o := d;
  -- 1) so_parada: desde a ida ao cliente
  d := replace(d, $q$public.content_items i where i.status = 'client_review' and i.updated_at < now() - make_interval(days => _p::int)$q$,
    $q$public.content_items i where i.status = 'client_review'
      and coalesce((select max(ev.created_at) from public.content_events ev where ev.item_id = i.id and ev.to_status = 'client_review'), i.updated_at) < now() - make_interval(days => _p::int)$q$);
  if d = o then raise exception 'member_goal_value: trecho so_parada não encontrado.'; end if;
  o := d;
  -- 2) re_reunioes: só reunião feita
  d := replace(d, $q$and (m.status = 'feita' or (m.status = 'marcada' and m.scheduled_at <= now())))), count(*)$q$,
    $q$and m.status = 'feita')), count(*)$q$);
  if d = o then raise exception 'member_goal_value: trecho re_reunioes não encontrado.'; end if;
  o := d;
  -- 3) tr_resultados: metas de tráfego dos clientes dele batidas (custo: atual <= alvo; ROAS: atual >= alvo;
  --    volume: projeção do mês >= alvo; investimento: projeção <= alvo + 5%)
  d := replace(d, $q$
  when 'co_ganhos' then$q$,
    $q$
  when 'tr_resultados' then
    with k as (
      select distinct ct.client_id from public.client_team ct join public.clients c on c.id = ct.client_id
      where ct.staff_id = _staff and c.is_active and not c.is_lost and public.client_in_area(ct.client_id, 'trafego')
    ), ag as (
      select a.client_id, sum(m.spend_cents) / 100.0 as spend, sum(m.leads) as leads, sum(m.purchases) as vendas,
        sum(coalesce(m.results, 0)) as resultados, sum(m.purchase_value_cents) / 100.0 as receita
      from public.traffic_daily_metrics m join public.ad_accounts a on a.id = m.account_id
      where m.day >= _m and m.day < _n and a.client_id in (select k.client_id from k)
      group by a.client_id
    ), g as (
      select tg.metric, tg.target, coalesce(ag.spend, 0) as spend, coalesce(ag.leads, 0) as leads, coalesce(ag.vendas, 0) as vendas,
        coalesce(ag.resultados, 0) as resultados, coalesce(ag.receita, 0) as receita,
        (_n - _m)::numeric / greatest(1, least(_n - _m, _today - _m + 1))::numeric as proj
      from public.traffic_goals tg join k on k.client_id = tg.client_id left join ag on ag.client_id = tg.client_id
      where tg.is_active and tg.target > 0
    )
    select count(*) filter (where case g.metric
        when 'cpl' then g.leads > 0 and g.spend / g.leads <= g.target
        when 'cpa' then g.vendas > 0 and g.spend / g.vendas <= g.target
        when 'custo_resultado' then g.resultados > 0 and g.spend / g.resultados <= g.target
        when 'roas' then g.spend > 0 and g.receita / g.spend >= g.target
        when 'leads' then g.leads * g.proj >= g.target
        when 'vendas' then g.vendas * g.proj >= g.target
        when 'resultados' then g.resultados * g.proj >= g.target
        when 'investimento' then g.spend > 0 and g.spend * g.proj <= g.target * 1.05
        else false end), count(*)
    into _done, _total from g;
  when 'co_ganhos' then$q$);
  if d = o then raise exception 'member_goal_value: ponto de inserção tr_resultados não encontrado.'; end if;
  execute d;
end $mig$;

insert into public.member_goal_catalog (key, func, title, how, unit, better, default_target, param_label, default_param, is_default, position, historic)
values ('tr_resultados', 'traffic_manager', 'Clientes com a meta de tráfego batida',
  'Metas de tráfego dos clientes dele (CPL, CPA, ROAS, leads, vendas) batidas no mês. Defina as metas em Tráfego → Metas.',
  'pct', 'mais', 70, null, null, false, 4, true)
on conflict (key) do nothing;

-- 4) Placar: tarefas de social contam junto com as de tráfego
do $mig$
declare d text := pg_get_functiondef('public.team_board(date)'::regprocedure); o text;
begin
  o := d;
  d := replace(d, $q$(select count(*) from public.traffic_tasks t where t.assignee_id = s.id and t.completed_at >= _m and t.completed_at < _n) as tasks_done,$q$,
    $q$((select count(*) from public.traffic_tasks t where t.assignee_id = s.id and t.completed_at >= _m and t.completed_at < _n)
          + (select count(*) from public.social_tasks t where s.profile_id is not null and t.assignee_id = s.profile_id and t.completed_at >= _m and t.completed_at < _n)) as tasks_done,$q$);
  if d = o then raise exception 'team_board: trecho tasks_done não encontrado.'; end if;
  o := d;
  d := replace(d, $q$(select count(*) from public.traffic_tasks t where t.assignee_id = s.id and t.due_date < _now::date and t.completed_at is null and t.status <> 'done') as tasks_late,$q$,
    $q$((select count(*) from public.traffic_tasks t where t.assignee_id = s.id and t.due_date < _now::date and t.completed_at is null and t.status <> 'done')
          + (select count(*) from public.social_tasks t where s.profile_id is not null and t.assignee_id = s.profile_id and t.due_date < _now::date and t.completed_at is null)) as tasks_late,$q$);
  if d = o then raise exception 'team_board: trecho tasks_late não encontrado.'; end if;
  execute d;
end $mig$;
