-- Barra de entregas do mês por cliente recorrente: reunião antes da estratégia, estratégia do dia 15,
-- relatório de toda segunda (tráfego), artes (social/design) e vídeos (audiovisual).
-- Atraso: até delivery_yellow_days fica amarelo; acima, vermelho. Dias configuráveis em Inteligência.
alter table public.intel_settings add column if not exists delivery_yellow_days int not null default 3 check (delivery_yellow_days between 1 and 30);
alter table public.intel_settings add column if not exists meeting_due_day int not null default 14 check (meeting_due_day between 1 and 28);
alter table public.intel_settings add column if not exists strategy_due_day int not null default 15 check (strategy_due_day between 1 and 28);

create or replace function public.client_deliveries(_month date default null) returns table(client_id uuid, items jsonb) language plpgsql stable security definer set search_path to '' as $$
declare _m date := date_trunc('month', coalesce(_month, (now() at time zone 'America/Sao_Paulo')::date))::date; _n date; _today date := (now() at time zone 'America/Sao_Paulo')::date;
  s public.intel_settings%rowtype; _auto boolean;
begin
  if not (public.has_role('admin') or public.has_role('head_marketing') or public.has_role('social_media') or public.has_role('traffic_manager') or public.has_role('designer') or public.has_role('videomaker') or public.has_role('editor')) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  _n := (_m + interval '1 month')::date;
  select * into s from public.intel_settings where id;
  select coalesce(send_reports_enabled, false) into _auto from public.traffic_settings limit 1;
  return query
  with live as (
    select c.id from public.clients c where c.is_active and not c.is_lost and coalesce(c.client_type, 'recurring') <> 'one-off'
  ), areas as (
    select cs.client_id, array_agg(distinct sv.area) a from public.client_services cs join public.services sv on sv.id = cs.service_id where cs.is_active group by cs.client_id
  ), meet as (
    select m.client_id, min(m.scheduled_at) at_, bool_or(m.status = 'feita') held from public.client_meetings m
    where m.scheduled_at >= _m and m.scheduled_at < _n and coalesce(m.status, '') <> 'cancelada' group by m.client_id
  ), strat as (
    select t.client_id, max(t.sent_at) sent, max(t.created_at) made from public.traffic_strategies t where t.kind = 'monthly' and t.month = _m group by t.client_id
  ), mondays as (
    select d::date as wd from generate_series(_m, _n - 1, interval '1 day') d where extract(isodow from d) = 1
  ), reports as (
    select r.client_id, md.wd, bool_or(r.sent_at is not null) sent, bool_or(true) made
    from mondays md join public.traffic_reports r on r.kind = 'weekly' and r.created_at::date between md.wd - 1 and md.wd + 6
    group by r.client_id, md.wd
  ), arts as (
    select ci.client_id, count(*) total, count(*) filter (where ci.approved_at is not null or ci.status = 'approved') done,
      max(case when ci.approved_at is null and ci.status <> 'approved' and ci.deadline < _today then _today - ci.deadline end) late
    from public.content_items ci where ci.deadline >= _m and ci.deadline < _n group by ci.client_id
  ), vids as (
    select v.client_id, count(*) total, count(*) filter (where v.delivered_at is not null) done,
      max(case when v.delivered_at is null and v.due_date < _today then _today - v.due_date end) late
    from public.av_projects v where v.due_date >= _m and v.due_date < _n group by v.client_id
  )
  select l.id, (
    -- Reunião do mês (todo recorrente)
    jsonb_build_array(jsonb_build_object('key', 'reuniao', 'label', 'Reunião do mês', 'due', (_m + (s.meeting_due_day - 1))::date,
      'done', coalesce(mt.held, false) or (mt.at_ is not null and mt.at_::date <= (_m + (s.meeting_due_day - 1))::date and mt.at_ <= now()),
      'scheduled', mt.at_, 'total', 1, 'count', case when coalesce(mt.held, false) or (mt.at_ is not null and mt.at_ <= now()) then 1 else 0 end, 'action', 'meeting'))
    -- Estratégia do dia 15 (tráfego ou social)
    || case when ar.a && array['trafego', 'social'] then jsonb_build_array(jsonb_build_object('key', 'estrategia', 'label', 'Estratégia do mês', 'due', (_m + (s.strategy_due_day - 1))::date,
      'done', st.sent is not null, 'made', st.made is not null, 'total', 1, 'count', case when st.sent is not null then 1 else 0 end, 'action', '/trafego/estrategia')) else '[]'::jsonb end
    -- Relatório de toda segunda (tráfego)
    || case when ar.a && array['trafego'] then coalesce((select jsonb_agg(jsonb_build_object('key', 'relatorio_' || md.wd, 'label', 'Relatório de segunda ' || to_char(md.wd, 'DD/MM'), 'due', md.wd,
      'done', coalesce(rp.sent, false), 'made', coalesce(rp.made, false), 'auto', _auto, 'total', 1, 'count', case when rp.sent then 1 else 0 end, 'action', '/trafego/relatorios') order by md.wd)
      from mondays md left join reports rp on rp.client_id = l.id and rp.wd = md.wd where md.wd <= _today), '[]'::jsonb) else '[]'::jsonb end
    -- Artes do mês
    || case when aa.total > 0 then jsonb_build_array(jsonb_build_object('key', 'artes', 'label', 'Artes do mês', 'due', null, 'done', aa.done >= aa.total, 'late_days', aa.late,
      'total', aa.total, 'count', aa.done, 'action', '/conteudo')) else '[]'::jsonb end
    -- Vídeos do mês
    || case when vv.total > 0 then jsonb_build_array(jsonb_build_object('key', 'videos', 'label', 'Vídeos do mês', 'due', null, 'done', vv.done >= vv.total, 'late_days', vv.late,
      'total', vv.total, 'count', vv.done, 'action', '/audiovisual/producao')) else '[]'::jsonb end
  )
  from live l left join areas ar on ar.client_id = l.id left join meet mt on mt.client_id = l.id left join strat st on st.client_id = l.id
  left join arts aa on aa.client_id = l.id left join vids vv on vv.client_id = l.id;
end $$;

-- Marcar reunião rápida pela barra de entregas.
create or replace function public.client_meeting_schedule(_client uuid, _at timestamptz, _kind text default 'estrategia_mensal', _agenda text default null) returns uuid language plpgsql security definer set search_path to '' as $$
declare _id uuid;
begin
  if not (public.has_role('admin') or public.has_role('head_marketing') or public.has_role('social_media') or public.has_role('traffic_manager')) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  insert into public.client_meetings (client_id, kind, scheduled_at, status, agenda, created_by)
  values (_client, coalesce(_kind, 'estrategia_mensal'), _at, 'marcada', nullif(trim(coalesce(_agenda, '')), ''), (select auth.uid())) returning id into _id;
  return _id;
end $$;

create or replace function public.client_meeting_done(_id uuid, _notes text default null) returns void language plpgsql security definer set search_path to '' as $$
begin
  if not (public.has_role('admin') or public.has_role('head_marketing') or public.has_role('social_media') or public.has_role('traffic_manager')) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.client_meetings set status = 'feita', notes = coalesce(nullif(trim(coalesce(_notes, '')), ''), notes) where id = _id;
end $$;
