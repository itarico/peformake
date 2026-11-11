-- Audiovisual medido por visita (pedido do Italo, 11/11/2026).
-- Cada serviço de audiovisual por visita/captação diz quantas visitas tem por mês; o mínimo de vídeos por visita
-- é o total de vídeos dividido pelas visitas. A entrega do mês conta visitas (projetos de vídeo entregues) e
-- mostra os vídeos entregues, que a equipe informa no projeto na hora da entrega.

alter table public.services add column if not exists visits_per_month integer
  check (visits_per_month is null or visits_per_month between 1 and 60);
comment on column public.services.visits_per_month is
  'Visitas/captações por unidade contratada. Preenchido = audiovisual medido por visita (mínimo de vídeos = entrega / visitas).';

update public.services set visits_per_month = v.n
from (values
  ('Visita mobile', 1), ('Captação com câmera', 1),
  ('Plano Mobile Semanal', 4), ('Plano Mobile Quinzenal', 2), ('Plano Mobile Premium', 4),
  ('Plano Câmera Mensal', 1), ('Plano Câmera Quinzenal', 2), ('Plano Câmera Diária', 1),
  ('Diária câmera + 6 vídeos', 1), ('Diária mobile + 10 vídeos', 1)
) as v(name, n)
where services.name = v.name and services.visits_per_month is null;

-- Vídeos entregues num projeto (visita): a equipe informa na entrega.
create or replace function public.av_set_delivered_videos(_project_id uuid, _count integer)
returns void language plpgsql security definer set search_path to '' as $$
declare _p public.av_projects;
begin
  select * into _p from public.av_projects where id = _project_id for update;
  if _p.id is null then raise exception 'Nao encontrado' using errcode = 'PF004'; end if;
  if not (public.can_manage_av() or (_p.editor_id is not null and _p.editor_id = public.my_staff_id())) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _count is null or _count < 1 or _count > 200 then raise exception 'Quantidade invalida' using errcode = '23514'; end if;
  if _count is distinct from _p.video_count then
    update public.av_projects set video_count = _count, updated_at = now(), updated_by = (select auth.uid()) where id = _p.id;
    insert into public.av_events (project_id, actor_id, actor_kind, message)
    values (_p.id, (select auth.uid()), 'staff', 'Vídeos entregues nesta visita: ' || _count);
  end if;
end $$;
revoke all on function public.av_set_delivered_videos(uuid, integer) from public, anon;
grant execute on function public.av_set_delivered_videos(uuid, integer) to authenticated;

-- Situação de cada serviço no mês: audiovisual por visita conta visitas e informa vídeos e mínimo por visita.
drop function if exists public.client_service_status(date, uuid);
create function public.client_service_status(_month date default null, _client uuid default null)
returns table(client_id uuid, client_service_id uuid, service text, area text, measure text, contracted numeric, delivered numeric,
  with_client integer, client_late integer, ours_missing numeric, state text, videos numeric, min_videos numeric)
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
  _closed := _today > _m + 24;
  return query
  with cs as (
    select cs.id, cs.client_id, s.name, s.area, d.qty, d.format,
      case when s.area = 'audiovisual' and s.visits_per_month is not null then s.visits_per_month * coalesce(cs.quantity, 1) end visits
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
           when cs.area = 'audiovisual' and cs.visits is not null then 'visitas'
           when cs.area = 'audiovisual' and coalesce(cs.format, '') ilike '%vídeo%' then 'vídeos'
           when cs.area = 'audiovisual' then 'produções'
           when cs.area = 'trafego' then 'relatórios semanais'
           when cs.area = 'consultoria' then 'estratégia' end measure,
      case when cs.area = 'social' then coalesce(pc.planned, 0)::numeric
           when cs.visits is not null then cs.visits::numeric
           else cs.qty end contracted,
      case when cs.area in ('design', 'social') then coalesce(pc.approved, 0)
           when cs.area = 'audiovisual' and cs.visits is not null then coalesce(v.prods, 0)
           when cs.area = 'audiovisual' and coalesce(cs.format, '') ilike '%vídeo%' then coalesce(v.videos, 0)
           when cs.area = 'audiovisual' then coalesce(v.prods, 0)
           when cs.area = 'trafego' then coalesce(rp.sent, 0)
           when cs.area = 'consultoria' then least(coalesce(st.sent, 0), 1) end::numeric delivered,
      case when cs.area in ('design', 'social') then coalesce(pc.with_client, 0) when cs.area = 'audiovisual' then coalesce(v.with_client, 0) else 0 end::int with_client,
      case when cs.area in ('design', 'social') then coalesce(pc.client_late, 0) when cs.area = 'audiovisual' then coalesce(v.client_late, 0) else 0 end::int client_late,
      cs.area = 'social' and coalesce(pc.planned, 0) = 0 no_plan,
      case when cs.visits is not null then coalesce(v.videos, 0)::numeric end videos,
      case when cs.visits is not null and cs.qty is not null then ceil(cs.qty / cs.visits) end min_videos
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
         else 'em_andamento' end,
    c.videos, c.min_videos
  from calc c;
end $function$;
revoke all on function public.client_service_status(date, uuid) from public, anon;
grant execute on function public.client_service_status(date, uuid) to authenticated;

-- Catálogo: admin/head ajusta as visitas por mês do serviço de audiovisual (vazio = conta vídeos, como antes).
create or replace function public.service_set_visits(_id uuid, _visits integer)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not (public.has_role('admin') or public.has_role('head_marketing')) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _visits is not null and (_visits < 1 or _visits > 60) then raise exception 'Quantidade invalida' using errcode = '23514'; end if;
  update public.services set visits_per_month = _visits where id = _id and area = 'audiovisual';
end $$;
revoke all on function public.service_set_visits(uuid, integer) from public, anon;
grant execute on function public.service_set_visits(uuid, integer) to authenticated;
