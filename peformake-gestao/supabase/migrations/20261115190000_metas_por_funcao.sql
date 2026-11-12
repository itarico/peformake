-- Metas por função da pessoa + OTE 60/40 (pedidos do Italo, 12/11/2026).
-- As metas do pop-up do membro (Pagamento → 3 Metas) saem das FUNÇÕES da pessoa (Função no sistema + "Também faz"),
-- cada uma medida só com o trabalho dela (filtro pelo responsável). O alvo e o prazo (horas/dias) ele define.
-- OTE: "Aplica OTE?" (CLT e PJ). Total = 60% fixo + 40% variável. No máximo 2 metas; cada meta BATIDA paga 20% do OTE
-- (metade da variável), tudo ou nada por meta. Alvo sugerido = histórico da pessoa (média dos 3 meses anteriores + um pouco).
-- Sem função marcada: continua valendo a meta da área (role_goals), como antes.
-- 1) Catálogo de metas por função
create table if not exists public.member_goal_catalog (
  key text primary key,
  func text not null,                 -- videomaker, editor, fotografo, designer, social_media, traffic_manager, comercial, head_marketing
  title text not null,                -- título curto (use {n} para o parâmetro)
  how text not null,                  -- como mede (1 linha)
  unit text not null check (unit in ('pct', 'qtd', 'brl')),
  better text not null check (better in ('mais', 'menos')),
  default_target numeric not null,     -- padrão conservador: só vale quando a pessoa não tem histórico
  param_label text check (param_label in ('horas', 'min', 'dia', 'dias')),
  default_param numeric,
  is_default boolean not null default false,   -- já vem ligada quando nada foi salvo
  historic boolean not null default true,      -- false = número de agora (atrasos), sem histórico por mês
  position int not null default 1
);
alter table public.member_goal_catalog add column if not exists historic boolean not null default true;
alter table public.member_goal_catalog enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'member_goal_catalog' and policyname = 'member_goal_catalog_read') then
    create policy member_goal_catalog_read on public.member_goal_catalog for select to authenticated using (true);
  end if;
end $$;

insert into public.member_goal_catalog (key, func, title, how, unit, better, default_target, param_label, default_param, is_default, position) values
  ('ed_prazo', 'editor', 'Edição entregue em até {n} h', 'Vídeos dele entregues para revisão até {n} h depois de o bruto chegar.', 'pct', 'mais', 80, 'horas', 24, true, 1),
  ('ed_sem_ajuste', 'editor', 'Vídeos aprovados sem ajuste', 'Vídeos dele aprovados no mês sem pedido de ajuste.', 'pct', 'mais', 70, null, null, true, 2),
  ('ed_entregas', 'editor', 'Vídeos editados no mês', 'Vídeos dele entregues no mês (inclui avulsos de edição).', 'qtd', 'mais', 4, null, null, false, 3),
  ('ed_atraso', 'editor', 'Nenhuma edição atrasada', 'Vídeos com ele que passaram do prazo de {n} h e não foram entregues.', 'qtd', 'menos', 0, 'horas', 24, false, 4),
  ('cap_na_data', 'videomaker', 'Gravações feitas na data marcada', 'Gravações dele do mês com check-in no dia agendado.', 'pct', 'mais', 80, null, null, true, 1),
  ('cap_bruto', 'videomaker', 'Bruto enviado em até {n} h', 'Material bruto dele enviado ao editor até {n} h depois de gravar.', 'pct', 'mais', 80, 'horas', 3, true, 2),
  ('cap_pontual', 'videomaker', 'Chegou no horário (até {n} min)', 'Check-in dele até {n} min depois do horário marcado.', 'pct', 'mais', 80, 'min', 10, false, 3),
  ('cap_gravacoes', 'videomaker', 'Gravações no mês', 'Gravações dele concluídas no mês (inclui avulsos de captação).', 'qtd', 'mais', 4, null, null, false, 4),
  ('fo_trabalhos', 'fotografo', 'Trabalhos de fotografia no mês', 'Serviços avulsos de fotografia lançados para ele no mês.', 'qtd', 'mais', 2, null, null, true, 1),
  ('ds_prazo', 'designer', 'Artes entregues no prazo do design', 'Artes dele entregues dentro do prazo configurado do design.', 'pct', 'mais', 80, null, null, true, 1),
  ('ds_sem_ajuste', 'designer', 'Artes aprovadas sem ajuste', 'Artes dele aprovadas no mês sem pedido de ajuste.', 'pct', 'mais', 70, null, null, true, 2),
  ('ds_entregas', 'designer', 'Artes entregues no mês', 'Artes dele entregues para revisão no mês.', 'qtd', 'mais', 10, null, null, false, 3),
  ('ds_atrasadas', 'designer', 'Nenhuma arte atrasada', 'Artes com ele que passaram do prazo e não foram entregues.', 'qtd', 'menos', 0, null, null, false, 4),
  ('so_planos', 'social_media', 'Planejamento enviado até o dia {n}', 'Clientes dele com o planejamento do mês enviado até o dia {n}.', 'pct', 'mais', 80, 'dia', 5, true, 1),
  ('so_parada', 'social_media', 'Nenhuma peça parada na aprovação', 'Peças dos clientes dele esperando o cliente há mais de {n} dias.', 'qtd', 'menos', 0, 'dias', 3, true, 2),
  ('so_aprovadas', 'social_media', 'Peças aprovadas pelo cliente', 'Peças dos clientes dele aprovadas no mês.', 'qtd', 'mais', 10, null, null, false, 3),
  ('so_tarefas', 'social_media', 'Tarefas de social no prazo', 'Tarefas de social dele concluídas até o prazo.', 'pct', 'mais', 80, null, null, false, 4),
  ('tr_relatorios', 'traffic_manager', 'Relatório toda segunda', 'Relatórios semanais enviados aos clientes de tráfego dele, por segunda do mês.', 'pct', 'mais', 80, null, null, true, 1),
  ('tr_estrategias', 'traffic_manager', 'Estratégia enviada até o dia {n}', 'Clientes de tráfego dele com a estratégia do mês enviada até o dia {n}.', 'pct', 'mais', 80, 'dia', 15, true, 2),
  ('tr_tarefas', 'traffic_manager', 'Tarefas de tráfego no prazo', 'Tarefas de tráfego dele concluídas até o prazo.', 'pct', 'mais', 80, null, null, false, 3),
  ('co_ganhos', 'comercial', 'Negócios fechados no mês', 'Negócios do funil dele marcados como ganhos no mês.', 'qtd', 'mais', 1, null, null, true, 1),
  ('co_conversao', 'comercial', 'Taxa de fechamento', 'Dos negócios dele encerrados no mês, quantos foram ganhos.', 'pct', 'mais', 20, null, null, true, 2),
  ('co_valor', 'comercial', 'Valor fechado no mês', 'Soma dos negócios dele ganhos no mês.', 'brl', 'mais', 2000, null, null, false, 3),
  ('co_followup', 'comercial', 'Nenhum próximo passo atrasado', 'Negócios abertos dele com o próximo passo vencido.', 'qtd', 'menos', 0, null, null, false, 4),
  ('re_reunioes', 'head_marketing', 'Reunião do mês com cada cliente', 'Clientes da carteira dele com reunião feita no mês.', 'pct', 'mais', 80, null, null, true, 1),
  ('re_saidas', 'head_marketing', 'Zero saídas na carteira', 'Clientes da carteira dele que saíram no mês.', 'qtd', 'menos', 0, null, null, true, 2),
  ('re_devendo', 'head_marketing', 'Nenhum cliente da carteira devendo', 'Clientes da carteira dele com fatura vencida agora.', 'qtd', 'menos', 0, null, null, false, 3)
on conflict (key) do update set func = excluded.func, title = excluded.title, how = excluded.how, unit = excluded.unit, better = excluded.better,
  default_target = excluded.default_target, param_label = excluded.param_label, default_param = excluded.default_param,
  is_default = excluded.is_default, position = excluded.position;
update public.member_goal_catalog set historic = key not in ('ed_atraso', 'ds_atrasadas', 'so_parada', 'co_followup', 're_devendo');

-- 2) Parâmetro (horas/min/dia) por meta da pessoa
alter table public.member_pay_goals add column if not exists param numeric;

-- 3) Funções da pessoa: Função no sistema + "Também faz"
create or replace function public.member_functions(_staff uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct f order by f), '{}') from (
    select case s.main_role when 'sdr' then 'comercial' when 'closer' then 'comercial' else s.main_role end as f
    from public.staff_members s where s.id = _staff
    union
    select unnest(s.skills) from public.staff_members s where s.id = _staff
  ) x where f in (select distinct func from public.member_goal_catalog);
$$;

-- 4) Realizado de uma meta para UMA pessoa: {done, total, actual}. Em %: actual = done/total (null sem dados).
create or replace function public.member_goal_value(_staff uuid, _key text, _m date, _param numeric default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  _n date := (_m + interval '1 month')::date;
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  _end timestamptz := least(now(), (_n::timestamp at time zone 'America/Sao_Paulo'));
  _ms timestamptz := (_m::timestamp at time zone 'America/Sao_Paulo');
  _ns timestamptz := (_n::timestamp at time zone 'America/Sao_Paulo');
  _p numeric := coalesce(_param, (select default_param from public.member_goal_catalog where key = _key));
  _profile uuid := (select profile_id from public.staff_members where id = _staff);
  _done numeric := 0; _total numeric := 0; _unit text := (select unit from public.member_goal_catalog where key = _key);
  _mondays int;
begin
  case _key
  -- EDIÇÃO: entrega = primeira ida para revisão depois do bruto (ou aprovação/entrega final).
  when 'ed_prazo', 'ed_atraso', 'ed_entregas', 'ed_sem_ajuste' then
    with e as (
      select p.id, p.status, p.raw_sent_at, p.revision_count, p.delivered_at, p.internal_approved_at,
        coalesce((select min(v.created_at) from public.av_events v where v.project_id = p.id and v.to_status in ('review', 'client_review', 'approved', 'delivered')
                  and (p.raw_sent_at is null or v.created_at >= p.raw_sent_at)), p.internal_approved_at, p.delivered_at) as d
      from public.av_projects p where p.editor_id = _staff and p.status <> 'cancelled'
    )
    select
      case _key
        when 'ed_prazo' then count(*) filter (where e.raw_sent_at is not null and e.d is not null and e.d >= _ms and e.d < _ns and e.d <= e.raw_sent_at + make_interval(hours => _p::int))
        when 'ed_atraso' then count(*) filter (where e.raw_sent_at is not null and e.d is null and e.status not in ('delivered', 'approved') and e.raw_sent_at + make_interval(hours => _p::int) < now())
        when 'ed_entregas' then count(*) filter (where e.d >= _ms and e.d < _ns)
        else count(*) filter (where e.status in ('approved', 'delivered') and coalesce(e.internal_approved_at, e.delivered_at) >= _ms and coalesce(e.internal_approved_at, e.delivered_at) < _ns and coalesce(e.revision_count, 0) = 0) end,
      case _key
        when 'ed_prazo' then count(*) filter (where e.raw_sent_at is not null and ((e.d >= _ms and e.d < _ns)
          or (e.d is null and e.raw_sent_at + make_interval(hours => _p::int) >= _ms and e.raw_sent_at + make_interval(hours => _p::int) < _end)))
        when 'ed_sem_ajuste' then count(*) filter (where e.status in ('approved', 'delivered') and coalesce(e.internal_approved_at, e.delivered_at) >= _ms and coalesce(e.internal_approved_at, e.delivered_at) < _ns)
        else 0 end
    into _done, _total from e;
    if _key = 'ed_entregas' then
      _done := _done + (select count(*) from public.service_jobs j where j.staff_id = _staff and j.skill = 'editor' and j.status = 'ativo' and j.job_date >= _m and j.job_date < _n);
    end if;
  -- CAPTAÇÃO
  when 'cap_na_data', 'cap_pontual' then
    select count(*) filter (where case _key
        when 'cap_na_data' then p.checkin_at is not null and (p.checkin_at at time zone 'America/Sao_Paulo')::date = (p.shoot_at at time zone 'America/Sao_Paulo')::date
        else p.checkin_at is not null and p.checkin_at <= p.shoot_at + make_interval(mins => _p::int) end),
      count(*)
    into _done, _total from public.av_projects p
    where p.videomaker_id = _staff and p.status <> 'cancelled' and p.shoot_at >= _ms and p.shoot_at < _end;
  when 'cap_bruto' then
    select count(*) filter (where p.raw_sent_at is not null and p.raw_sent_at <= p.checkout_at + make_interval(hours => _p::int)), count(*)
    into _done, _total from public.av_projects p
    where p.videomaker_id = _staff and p.checkout_at >= _ms and p.checkout_at < _ns;
  when 'cap_gravacoes' then
    _done := (select count(*) from public.av_projects p where p.videomaker_id = _staff and p.checkout_at >= _ms and p.checkout_at < _ns)
      + (select count(*) from public.service_jobs j where j.staff_id = _staff and j.skill = 'videomaker' and j.status = 'ativo' and j.job_date >= _m and j.job_date < _n);
  -- FOTOGRAFIA
  when 'fo_trabalhos' then
    _done := (select count(*) from public.service_jobs j where j.staff_id = _staff and j.skill = 'fotografo' and j.status = 'ativo' and j.job_date >= _m and j.job_date < _n);
  -- DESIGN
  when 'ds_prazo' then
    select count(*) filter (where c.delivered_at is not null and c.delivered_on_time), count(*)
    into _done, _total from public.content_items c
    where c.designer_id = _staff and ((c.delivered_at >= _ms and c.delivered_at < _ns)
      or (c.delivered_at is null and c.status in ('ready', 'in_production', 'changes_requested') and c.design_due_at >= _ms and c.design_due_at < _end));
  when 'ds_sem_ajuste' then
    select count(*) filter (where coalesce(c.revision_count, 0) = 0), count(*)
    into _done, _total from public.content_items c where c.designer_id = _staff and c.approved_at >= _ms and c.approved_at < _ns;
  when 'ds_entregas' then
    _done := (select count(*) from public.content_items c where c.designer_id = _staff and coalesce(c.delivered_at, c.approved_at) >= _ms and coalesce(c.delivered_at, c.approved_at) < _ns);
  when 'ds_atrasadas' then
    _done := (select count(*) from public.content_items c where c.designer_id = _staff and c.status in ('ready', 'in_production', 'changes_requested')
      and (c.design_due_at < now() or (c.design_due_at is null and c.deadline < _today)));
  -- SOCIAL (carteira = clientes onde a pessoa está no time, com Conteúdo contratado)
  when 'so_planos' then
    select count(*) filter (where exists (select 1 from public.content_plans cp where cp.client_id = k.client_id and cp.month = _m
        and cp.sent_to_client_at is not null and cp.sent_to_client_at < ((_m + (_p::int) * interval '1 day')::timestamp at time zone 'America/Sao_Paulo'))), count(*)
    into _done, _total from (select distinct ct.client_id from public.client_team ct join public.clients c on c.id = ct.client_id
      where ct.staff_id = _staff and c.is_active and not c.is_lost and public.client_in_area(ct.client_id, 'conteudo')) k;
  when 'so_parada' then
    _done := (select count(*) from public.content_items i where i.status = 'client_review' and i.updated_at < now() - make_interval(days => _p::int)
      and i.client_id in (select ct.client_id from public.client_team ct where ct.staff_id = _staff));
  when 'so_aprovadas' then
    _done := (select count(*) from public.content_items i where i.approved_at >= _ms and i.approved_at < _ns
      and i.client_id in (select ct.client_id from public.client_team ct where ct.staff_id = _staff));
  when 'so_tarefas' then
    select count(*) filter (where t.completed_at is not null and (t.due_date is null or (t.completed_at at time zone 'America/Sao_Paulo')::date <= t.due_date)), count(*)
    into _done, _total from public.social_tasks t
    where _profile is not null and t.assignee_id = _profile
      and ((t.completed_at >= _ms and t.completed_at < _ns) or (t.completed_at is null and t.due_date >= _m and t.due_date < least(_today, _n)));
  -- TRÁFEGO (carteira = clientes onde a pessoa está no time, com Tráfego contratado)
  when 'tr_relatorios' then
    select count(*) into _mondays from generate_series(_m, least(_today, _n - 1), interval '1 day') d where extract(isodow from d) = 1;
    select count(*) * _mondays,
      least(count(*) * _mondays, (select count(*) from public.traffic_reports r where r.kind = 'weekly' and r.sent_at >= _ms and r.sent_at < _ns and r.client_id in (select k2.client_id from public.client_team k2 where k2.staff_id = _staff)))
    into _total, _done
    from (select distinct ct.client_id from public.client_team ct join public.clients c on c.id = ct.client_id
      where ct.staff_id = _staff and c.is_active and not c.is_lost and public.client_in_area(ct.client_id, 'trafego')) k;
  when 'tr_estrategias' then
    select count(*) filter (where exists (select 1 from public.traffic_strategies s where s.client_id = k.client_id and s.kind = 'monthly' and s.month = _m
          and s.sent_at < ((_m + (_p::int) * interval '1 day')::timestamp at time zone 'America/Sao_Paulo'))
        or exists (select 1 from public.monthly_strategies s where s.client_id = k.client_id and s.month = _m
          and coalesce(s.share_created_at, s.approved_at) < ((_m + (_p::int) * interval '1 day')::timestamp at time zone 'America/Sao_Paulo'))), count(*)
    into _done, _total from (select distinct ct.client_id from public.client_team ct join public.clients c on c.id = ct.client_id
      where ct.staff_id = _staff and c.is_active and not c.is_lost and public.client_in_area(ct.client_id, 'trafego')) k;
  when 'tr_tarefas' then
    select count(*) filter (where t.completed_at is not null and (t.due_date is null or (t.completed_at at time zone 'America/Sao_Paulo')::date <= t.due_date)), count(*)
    into _done, _total from public.traffic_tasks t
    where t.assignee_id = _staff and ((t.completed_at >= _ms and t.completed_at < _ns) or (t.completed_at is null and t.status <> 'done' and t.due_date >= _m and t.due_date < least(_today, _n)));
  -- COMERCIAL (funil: dono do negócio)
  when 'co_ganhos' then
    _done := (select count(*) from public.crm_deals d where d.owner_id = _staff and d.stage in ('ganho', 'pos_venda') and d.closed_at >= _ms and d.closed_at < _ns);
  when 'co_conversao' then
    select count(*) filter (where d.stage in ('ganho', 'pos_venda')), count(*)
    into _done, _total from public.crm_deals d where d.owner_id = _staff and d.stage in ('ganho', 'pos_venda', 'perdido') and d.closed_at >= _ms and d.closed_at < _ns;
  when 'co_valor' then
    _done := (select coalesce(sum(d.value_cents), 0) / 100.0 from public.crm_deals d where d.owner_id = _staff and d.stage in ('ganho', 'pos_venda') and d.closed_at >= _ms and d.closed_at < _ns);
  when 'co_followup' then
    _done := (select count(*) from public.crm_deals d where d.owner_id = _staff and d.stage in ('novo', 'qualificacao', 'negociacao', 'aguardando') and d.next_step_at < _today);
  -- RELACIONAMENTO (carteira = clientes onde a pessoa está no time)
  when 're_reunioes' then
    select count(*) filter (where exists (select 1 from public.client_meetings m where m.client_id = k.client_id and m.scheduled_at >= _ms and m.scheduled_at < _ns
        and (m.status = 'feita' or (m.status = 'marcada' and m.scheduled_at <= now())))), count(*)
    into _done, _total from (select distinct ct.client_id from public.client_team ct join public.clients c on c.id = ct.client_id
      where ct.staff_id = _staff and c.is_active and not c.is_lost and coalesce(c.client_type, 'recurring') <> 'one-off') k;
  when 're_saidas' then
    _done := (select count(distinct c.id) from public.clients c join public.client_team ct on ct.client_id = c.id
      where ct.staff_id = _staff and c.is_lost and coalesce(c.client_type, 'recurring') <> 'one-off' and c.lost_at >= _m and c.lost_at < _n);
  when 're_devendo' then
    _done := (select count(distinct i.client_id) from public.invoices i where (i.status = 'vencido' or (i.status = 'pendente' and i.due_date < _today))
      and i.client_id in (select ct.client_id from public.client_team ct where ct.staff_id = _staff));
  else
    return null;
  end case;
  return jsonb_build_object('done', _done, 'total', _total,
    'actual', case when _unit = 'pct' then case when _total > 0 then round(100 * _done / _total) end else _done end);
end $$;

revoke execute on function public.member_functions(uuid) from public, anon;
revoke execute on function public.member_goal_value(uuid, text, date, numeric) from public, anon, authenticated;


-- 5) Alvo alcançável: histórico da pessoa (média dos 3 meses anteriores com dados + um pouco).
--    Em %: média + 5 pontos (até 100). Em quantidade: média + 10%. Sem histórico: padrão conservador do catálogo.
--    Metas de "agora" (atrasos, paradas) e as de "menos é melhor" ficam no padrão (0).
create or replace function public.member_goal_suggest(_staff uuid, _key text, _m date, _param numeric default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare _c public.member_goal_catalog; _v jsonb; _vals numeric[] := '{}'; _avg numeric; _t numeric;
begin
  select * into _c from public.member_goal_catalog where key = _key;
  if _c.key is null then return null; end if;
  if not _c.historic or _c.better = 'menos' then
    return jsonb_build_object('target', _c.default_target, 'history', null, 'has_history', false, 'historic', false);
  end if;
  for i in 1..3 loop
    _v := public.member_goal_value(_staff, _key, (_m - make_interval(months => i))::date, _param);
    if _c.unit = 'pct' and coalesce((_v->>'total')::numeric, 0) > 0 then _vals := _vals || (_v->>'actual')::numeric;
    elsif _c.unit <> 'pct' and coalesce((_v->>'done')::numeric, 0) > 0 then _vals := _vals || (_v->>'done')::numeric;
    end if;
  end loop;
  if cardinality(_vals) = 0 then
    return jsonb_build_object('target', _c.default_target, 'history', null, 'has_history', false, 'historic', true);
  end if;
  select avg(x) into _avg from unnest(_vals) x;
  _t := case _c.unit when 'pct' then least(100, round(_avg + 5)) when 'brl' then greatest(100, round(_avg * 1.1, -2)) else greatest(1, ceil(_avg * 1.1)) end;
  return jsonb_build_object('target', _t, 'history', round(_avg, 1), 'has_history', true, 'historic', true, 'months', cardinality(_vals));
end $$;
revoke execute on function public.member_goal_suggest(uuid, text, date, numeric) from public, anon, authenticated;

-- 6) member_ote: metas da pessoa (no máximo 2), cada meta batida = 20% do OTE (metade da variável)
create or replace function public.member_ote(_staff uuid, _month date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  _m date := date_trunc('month', coalesce(_month, (now() at time zone 'America/Sao_Paulo')::date))::date;
  _p public.member_pay; _role text; _min int; _cap int; _goals jsonb; _att numeric; _earned numeric := 0; _var_on boolean;
  _funcs text[]; _own boolean; _catalog jsonb; _hits int := 0; _share numeric := 0;
begin
  if not (public.has_role('admin') or exists (select 1 from public.staff_members where id = _staff and profile_id = (select auth.uid()))) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  select * into _p from public.member_pay where staff_id = _staff;
  _role := public.member_goal_role(_staff);
  _funcs := public.member_functions(_staff);
  _own := exists (select 1 from public.member_pay_goals g where g.staff_id = _staff);
  select coalesce(var_min_pct, 70), coalesce(var_cap_pct, 120) into _min, _cap from public.team_settings where id;
  _var_on := _p.contract in ('clt', 'pj') and coalesce(_p.variable_enabled, false);
  _share := case when _var_on then round(coalesce(_p.variable_target, 0) / 2, 2) else 0 end;

  with base as (
    select g.key, g.target, g.param, g.weight, 'pessoal' as origem from (
      select * from public.member_pay_goals g where g.staff_id = _staff order by g.key limit 2) g
    union all
    select x.key, coalesce((public.member_goal_suggest(_staff, x.key, _m, x.default_param)->>'target')::numeric, x.default_target), x.default_param, 1, 'funcao' from (
      select c.key, c.default_target, c.default_param from public.member_goal_catalog c
      where not _own and c.is_default and c.func = any(_funcs) order by c.position, c.func limit 2) x
    union all
    select r.key, r.target, null, 1, 'area' from (
      select * from public.role_goals r where r.month = _m and r.role = _role and not _own and cardinality(_funcs) = 0 order by r.position limit 2) r
  ), val as (
    select b.*, c.better, c.func,
      case when c.key is not null then public.member_goal_value(_staff, b.key, _m, b.param)
        else jsonb_build_object('actual', coalesce(public.role_goal_value(b.key, _m, coalesce((select r.info from public.role_goals r where r.month = _m and r.role = _role and r.key = b.key), '{}')), 0)) end as v
    from base b left join public.member_goal_catalog c on c.key = b.key
  ), pct as (
    select v.*, (v.v->>'actual')::numeric as actual,
      case when v.v->>'actual' is null then null else least(_cap, case
        when v.better = 'menos' or (v.better is null and v.key in ('saidas', 'devendo', 'inadimplencia', 'aprovacao_parada')) then
          case when (v.v->>'actual')::numeric <= v.target then 100 else greatest(0, round(100 * v.target / nullif((v.v->>'actual')::numeric, 0))) end
        when v.target <= 0 then 100
        else round(100 * (v.v->>'actual')::numeric / v.target) end) end as pct
    from val v
  )
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'target', target, 'param', param, 'actual', actual, 'done', v->'done', 'total', v->'total',
           'pct', pct, 'hit', coalesce(pct >= 100, false), 'weight', weight, 'origem', origem, 'func', func) order by origem, key), '[]'),
         case when count(*) > 0 then round(avg(least(coalesce(pct, 0), 100))) else null end,
         count(*) filter (where pct >= 100)
    into _goals, _att, _hits from pct;

  select coalesce(jsonb_agg(jsonb_build_object('key', c.key, 'func', c.func, 'title', c.title, 'how', c.how, 'unit', c.unit, 'better', c.better,
      'target', coalesce((s.sug->>'target')::numeric, c.default_target), 'history', s.sug->'history', 'has_history', coalesce((s.sug->>'has_history')::boolean, false),
      'historic', c.historic and c.better = 'mais', 'param_label', c.param_label, 'param', c.default_param, 'is_default', c.is_default,
      'value', public.member_goal_value(_staff, c.key, _m, coalesce(s.saved_param, c.default_param)))
      order by array_position(_funcs, c.func), c.position), '[]')
    into _catalog
    from public.member_goal_catalog c
    cross join lateral (select (select g.param from public.member_pay_goals g where g.staff_id = _staff and g.key = c.key) as saved_param) sp
    cross join lateral (select sp.saved_param, public.member_goal_suggest(_staff, c.key, _m, coalesce(sp.saved_param, c.default_param)) as sug) s
    where c.func = any(_funcs);

  if _var_on then _earned := least(coalesce(_p.variable_target, 0), _share * _hits); end if;
  return jsonb_build_object(
    'month', _m, 'goal_role', _role, 'min_pct', _min, 'cap_pct', _cap,
    'contract', _p.contract, 'base_salary', coalesce(_p.base_salary, 0), 'variable_target', case when _var_on then coalesce(_p.variable_target, 0) else 0 end,
    'ote', coalesce(_p.base_salary, 0) + case when _var_on then coalesce(_p.variable_target, 0) else 0 end,
    'pay_day', _p.pay_day, 'unit', coalesce(_p.unit, 'peformake'), 'notes', _p.notes,
    'pay_schedule', coalesce(_p.pay_schedule, 'mensal'),
    'advance_pct', coalesce(_p.advance_pct, case when _p.contract = 'clt' then 40 else 50 end),
    'variable_enabled', coalesce(_var_on, false), 'require_invoice', coalesce(_p.require_invoice, false),
    'profit_share_pct', _p.profit_share_pct, 'profit_period', coalesce(_p.profit_period, 'mensal'), 'job_rates', coalesce(_p.job_rates, '{}'::jsonb),
    'has_own_goals', _own, 'functions', to_jsonb(_funcs), 'catalog', _catalog, 'max_goals', 2, 'goal_share', _share, 'hits', _hits,
    'goals', _goals, 'attainment', _att, 'variable_earned', _earned, 'total_month', coalesce(_p.base_salary, 0) + _earned);
end $$;

-- 7) Salvar: "Aplica OTE?" vale para CLT e PJ; alvo e parâmetro por meta; no máximo 2 metas
create or replace function public.member_pay_config_save(_staff uuid, _data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _c text := nullif(_data->>'contract', '');
  _sched text := coalesce(nullif(_data->>'pay_schedule', ''), 'mensal');
  _adv numeric := nullif(_data->>'advance_pct', '')::numeric;
  _var boolean := coalesce((_data->>'variable_enabled')::boolean, false);
  _d jsonb := _data;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _c is null or _c not in ('clt', 'pj', 'freela', 'socio') then raise exception 'Escolha o tipo de contrato' using errcode = '22023'; end if;
  if _sched not in ('mensal', 'quinzenal') then raise exception 'Escolha Mensal ou Quinzenal' using errcode = '22023'; end if;
  if _adv is not null and (_adv <= 0 or _adv >= 100) then raise exception 'O adiantamento é um percentual entre 1 e 99' using errcode = '22023'; end if;
  if jsonb_array_length(coalesce(_data->'goals', '[]'::jsonb)) > 2 then raise exception 'No máximo 2 metas por pessoa' using errcode = '22023'; end if;
  if _c = 'socio' then _sched := 'mensal'; end if;
  if _c = 'freela' then _d := _d || jsonb_build_object('base_salary', 0); end if;
  if not (_c in ('clt', 'pj') and _var) then _d := _d || jsonb_build_object('variable_target', 0, 'goals', '[]'::jsonb); end if;
  perform public.member_pay_save(_staff, _d || jsonb_build_object('pay_day', ''));
  update public.member_pay_goals g set param = case when x->>'param' ~ '^[0-9]+(\.[0-9]+)?$' and (x->>'param')::numeric > 0 then (x->>'param')::numeric end
  from jsonb_array_elements(coalesce(_d->'goals', '[]'::jsonb)) x
  where g.staff_id = _staff and g.key = x->>'key';
  update public.member_pay set
    pay_schedule = _sched,
    advance_pct = case when _sched = 'quinzenal' then coalesce(_adv, case when _c = 'clt' then 40 else 50 end) else null end,
    variable_enabled = (_c in ('clt', 'pj') and _var),
    require_invoice = (_c = 'pj' and coalesce((_data->>'require_invoice')::boolean, false)),
    profit_share_pct = case when _c = 'socio' then nullif(_data->>'profit_share_pct', '')::numeric end,
    profit_period = case when _c = 'socio' and _data->>'profit_period' = 'trimestral' then 'trimestral' else 'mensal' end,
    job_rates = case when _c = 'freela' then coalesce((select jsonb_object_agg(k, v::numeric) from jsonb_each_text(coalesce(_data->'job_rates', '{}'::jsonb)) e(k, v)
                 where v ~ '^[0-9]+(\.[0-9]+)?$' and v::numeric > 0), '{}'::jsonb) else '{}'::jsonb end
  where staff_id = _staff;
end $$;

-- 8) PJ que já tinha variável continua com OTE ligado (antes o PJ tinha variável sempre)
update public.member_pay set variable_enabled = true where contract = 'pj' and coalesce(variable_target, 0) > 0 and not coalesce(variable_enabled, false);

-- 9) Texto do contrato da equipe: variável só com OTE ligado e a regra das metas
do $$
declare _def text;
begin
  select pg_get_functiondef(p.oid) into _def from pg_proc p where p.proname = 'staff_contract_compose' and p.pronamespace = 'public'::regnamespace;
  if _def is not null and strpos(_def, '(_m.contract = ''pj'' or _m.variable_enabled)') > 0 then
    _def := replace(_def, '(_m.contract = ''pj'' or _m.variable_enabled)', '(_m.contract in (''clt'', ''pj'') and _m.variable_enabled)');
    _def := replace(_def, 'conforme as metas combinadas no sistema, paga', 'conforme as metas combinadas no sistema (até 2 metas; cada meta batida vale metade da variável), paga');
    execute _def;
  end if;
end $$;
