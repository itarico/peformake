-- Financeiro · Fase 1, passo 3: uma regra só de "entregue" por serviço do cliente, com a culpa do cliente separada.
-- Contratado = client_service_deliverable (passo 2). Entregue, por área:
--   Design ...........: peças do mês (planejamento do mês, sem extras) aprovadas.
--   Social Mídia .....: o contratado é o próprio planejamento do mês (peças planejadas); entregue = aprovadas.
--                       Sem planejamento no mês = falta nossa.
--   Audiovisual ......: "produção" = projetos entregues no mês; "vídeo" = vídeos (video_count) dos projetos entregues no mês.
--   Tráfego ..........: relatórios semanais enviados no mês.
--   Consultoria ......: estratégia do mês enviada.
-- Com o cliente: peça em aprovação do cliente / roteiro esperando o cliente. Passou de 2 dias com ele = culpa do cliente.
-- O ciclo fecha no dia 25: depois disso, o que faltou e não estava com o cliente é falta nossa (vai para o fechamento, passo 4).

create or replace function public.client_service_status(_month date default null, _client uuid default null)
returns table(client_id uuid, client_service_id uuid, service text, area text, measure text,
  contracted numeric, delivered numeric, with_client integer, client_late integer, ours_missing numeric, state text)
language plpgsql stable security definer set search_path to '' as $function$
declare
  _m date := date_trunc('month', coalesce(_month, (now() at time zone 'America/Sao_Paulo')::date))::date;
  _n date := (date_trunc('month', coalesce(_month, (now() at time zone 'America/Sao_Paulo')::date)) + interval '1 month')::date;
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  _closed boolean;
begin
  if not (public.has_role('admin') or public.has_role('head_marketing') or public.has_role('social_media') or public.has_role('traffic_manager')
          or public.has_role('designer') or public.has_role('videomaker') or public.has_role('editor') or public.has_role('ellcazo')) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  _closed := _today > _m + 24;  -- depois do dia 25 do mês
  return query
  with cs as (
    select cs.id, cs.client_id, s.name, s.area, d.qty, d.format
    from public.client_services cs
    join public.services s on s.id = cs.service_id
    join public.clients c on c.id = cs.client_id and c.is_active and not c.is_lost
    cross join lateral public.client_service_deliverable(cs.id) d
    where cs.is_active and (_client is null or cs.client_id = _client)
  ), pieces as (
    select i.client_id,
      count(*) filter (where not i.is_extra) planned,
      count(*) filter (where not i.is_extra and (i.approved_at is not null or i.status = 'approved')) approved,
      count(*) filter (where not i.is_extra and i.status = 'client_review') with_client,
      count(*) filter (where not i.is_extra and i.status = 'client_review'
        and coalesce((select max(e.created_at) from public.content_events e where e.item_id = i.id and e.to_status = 'client_review'), i.updated_at) < now() - interval '2 days') client_late
    from public.content_items i join public.content_plans p on p.id = i.plan_id
    where p.month = _m group by i.client_id
  ), vids as (
    select a.client_id,
      count(*) filter (where a.delivered_at >= _m and a.delivered_at < _n) prods,
      coalesce(sum(coalesce(a.video_count, 1)) filter (where a.delivered_at >= _m and a.delivered_at < _n), 0) videos,
      count(*) filter (where a.delivered_at is null and (a.status = 'client_review' or (a.script_sent_at is not null and a.script_approved_at is null))) with_client,
      count(*) filter (where a.delivered_at is null and (a.status = 'client_review' or (a.script_sent_at is not null and a.script_approved_at is null))
        and coalesce(a.script_sent_at, a.updated_at) < now() - interval '2 days') client_late
    from public.av_projects a
    where coalesce(a.month, date_trunc('month', coalesce(a.due_date, a.shoot_at::date, a.created_at::date))::date) = _m
       or (a.delivered_at >= _m and a.delivered_at < _n)
    group by a.client_id
  ), reps as (
    select r.client_id, count(*) sent from public.traffic_reports r
    where r.kind = 'weekly' and r.sent_at >= _m and r.sent_at < _n group by r.client_id
  ), strat as (
    select t.client_id, count(*) filter (where t.sent_at is not null) sent from public.traffic_strategies t
    where t.kind = 'monthly' and t.month = _m group by t.client_id
  ), calc as (
    select cs.client_id, cs.id, cs.name, cs.area,
      case when cs.area in ('design') then 'artes'
           when cs.area = 'social' then 'peças planejadas'
           when cs.area = 'audiovisual' and coalesce(cs.format, '') ilike '%vídeo%' then 'vídeos'
           when cs.area = 'audiovisual' then 'produções'
           when cs.area = 'trafego' then 'relatórios semanais'
           when cs.area = 'consultoria' then 'estratégia' end measure,
      case when cs.area = 'social' then coalesce(pc.planned, 0)::numeric else cs.qty end contracted,
      case when cs.area in ('design', 'social') then coalesce(pc.approved, 0)
           when cs.area = 'audiovisual' and coalesce(cs.format, '') ilike '%vídeo%' then coalesce(v.videos, 0)
           when cs.area = 'audiovisual' then coalesce(v.prods, 0)
           when cs.area = 'trafego' then coalesce(rp.sent, 0)
           when cs.area = 'consultoria' then least(coalesce(st.sent, 0), 1) end::numeric delivered,
      case when cs.area in ('design', 'social') then coalesce(pc.with_client, 0) when cs.area = 'audiovisual' then coalesce(v.with_client, 0) else 0 end::int with_client,
      case when cs.area in ('design', 'social') then coalesce(pc.client_late, 0) when cs.area = 'audiovisual' then coalesce(v.client_late, 0) else 0 end::int client_late,
      cs.area = 'social' and coalesce(pc.planned, 0) = 0 no_plan
    from cs
    left join pieces pc on pc.client_id = cs.client_id
    left join vids v on v.client_id = cs.client_id
    left join reps rp on rp.client_id = cs.client_id
    left join strat st on st.client_id = cs.client_id
  )
  select c.client_id, c.id, c.name, c.area, c.measure, c.contracted, c.delivered, c.with_client, c.client_late,
    case when c.measure is null or c.contracted is null then null
         else greatest(0, c.contracted - c.delivered - c.client_late) end,
    case when c.measure is null or (c.contracted is null and not c.no_plan) then 'sem_medicao'
         when c.no_plan then 'sem_planejamento'
         when c.delivered >= c.contracted then 'entregue'
         when c.client_late > 0 and c.delivered + c.client_late >= c.contracted then 'esperando_cliente'
         when _closed then 'faltou'
         else 'em_andamento' end
  from calc c;
end $function$;
revoke execute on function public.client_service_status(date, uuid) from public, anon;
grant execute on function public.client_service_status(date, uuid) to authenticated;

-- Operação (página Operação e "Entregas do mês" na ficha) passa a contar contra o contratado, pela mesma regra.
-- Design/Social: total = o maior entre artes contratadas e peças planejadas (as duas áreas contam as mesmas peças).
create or replace function public.operation_progress(_month date)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare _m date := date_trunc('month', _month)::date; _n date := (date_trunc('month', _month) + interval '1 month')::date; _due int;
begin
  if not (public.has_role('admin') or public.has_role('head_marketing')) then return '[]'::jsonb; end if;
  _due := greatest(1, least(4, ceil(extract(day from least(now(), _n - interval '1 day') - _m) / 7.0)::int));
  return coalesce((
    with cl as (
      select c.id, trim(c.name) as name, public.client_areas(c.id) as areas from public.clients c where c.is_active and not c.is_lost
    ), st as (select * from public.client_service_status(_m, null)),
    design as (
      select s.client_id, max(s.contracted) total, max(s.delivered) done, max(s.with_client) waiting
      from st s where s.area in ('design', 'social') and s.contracted is not null group by s.client_id
    ), av as (
      select s.client_id, sum(s.contracted) total, sum(s.delivered) done, sum(s.with_client) waiting
      from st s where s.area = 'audiovisual' and s.contracted is not null group by s.client_id
    ), traffic as (
      select r.client_id, count(*) filter (where r.kind = 'weekly' and r.sent_at is not null) as weekly_sent
      from public.traffic_reports r where r.period_end >= _m and r.period_start < _n group by r.client_id
    ), strat as (
      select s.client_id, bool_or(s.status in ('approved', 'sent', 'reviewed') or s.reviewed_at is not null) as reviewed
      from public.traffic_strategies s where s.month >= _m and s.month < _n group by s.client_id
    )
    select jsonb_agg(row order by (row->>'pct')::numeric nulls last, row->>'name')
    from (
      select jsonb_build_object(
        'client_id', cl.id, 'name', cl.name, 'areas', cl.areas,
        'design', case when cl.areas && array['design', 'social'] then jsonb_build_object('total', coalesce(d.total, 0), 'done', least(coalesce(d.done, 0), coalesce(d.total, 0)), 'waiting', coalesce(d.waiting, 0)) end,
        'audiovisual', case when 'audiovisual' = any(cl.areas) then jsonb_build_object('total', coalesce(a.total, 0), 'done', least(coalesce(a.done, 0), coalesce(a.total, 0)), 'waiting', coalesce(a.waiting, 0)) end,
        'trafego', case when 'trafego' = any(cl.areas) then jsonb_build_object('weekly_sent', coalesce(t.weekly_sent, 0), 'weekly_due', _due, 'strategy', coalesce(s.reviewed, false)) end,
        'pct', (
          select case when sum(tot) = 0 then null else round(100.0 * sum(dn) / sum(tot)) end
          from (values
            (case when cl.areas && array['design', 'social'] then coalesce(d.total, 0) else 0 end, case when cl.areas && array['design', 'social'] then least(coalesce(d.done, 0), coalesce(d.total, 0)) else 0 end),
            (case when 'audiovisual' = any(cl.areas) then coalesce(a.total, 0) else 0 end, case when 'audiovisual' = any(cl.areas) then least(coalesce(a.done, 0), coalesce(a.total, 0)) else 0 end),
            (case when 'trafego' = any(cl.areas) then _due + 1 else 0 end,
             case when 'trafego' = any(cl.areas) then least(coalesce(t.weekly_sent, 0), _due) + (case when coalesce(s.reviewed, false) then 1 else 0 end) else 0 end)
          ) v(tot, dn)
        )
      ) as row
      from cl
      left join design d on d.client_id = cl.id
      left join av a on a.client_id = cl.id
      left join traffic t on t.client_id = cl.id
      left join strat s on s.client_id = cl.id
      where cl.areas && array['design', 'social', 'audiovisual', 'trafego']
    ) x
  ), '[]'::jsonb);
end $function$;
