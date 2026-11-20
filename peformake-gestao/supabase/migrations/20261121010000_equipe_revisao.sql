-- ATENÇÃO: AINDA NÃO APLICADA NO BANCO (20/11). A ferramenta do Supabase da sessão recusou; rodar no SQL Editor do Supabase
-- (projeto peformake-app) ou numa sessão com permissão. É segura: se algum trecho não bater, para com erro e não muda nada.
-- Revisão da aba Equipe antes de liberar a equipe (21/11/2026).
-- 1) Dados pessoais da equipe (Pix, CPF/CNPJ, endereço) só por função de admin; head, tráfego, SDR e closer liam direto na tabela.
-- 2) Visitante (anon) sem nenhum privilégio nas tabelas de remuneração (o RLS já barrava; agora nem o privilégio existe).
-- 3) Variável: meta "quanto menos, melhor" (nenhuma atrasada, zero saídas...) só conta como batida se houve trabalho no mês.
--    Antes, quem não tinha cliente nem peça "batia" a meta e ganhava metade da variável.
-- 4) Placar: atraso conta igual para todas as funções (o que está atrasado agora, de qualquer mês).
-- 5) Tarefa de tráfego entregue a alguém (troca de responsável por uma pessoa) avisa o novo responsável.

-- 1) Colunas sensíveis de staff_members ----------------------------------------------------------------------
revoke select on public.staff_members from authenticated, anon;
grant select (id, full_name, job_title, main_role, email, avatar_path, legacy_avatar_url, is_active, synced_at, profile_id, phone, skills, edited_at)
  on public.staff_members to authenticated;

-- 2) Remuneração sem privilégio para visitante -------------------------------------------------------------------
revoke all on public.member_pay, public.member_pay_goals, public.team_settings from anon;

-- 3) Metas "menos": total = trabalho do mês; sem trabalho, a meta fica "Sem dados" e não paga ------------------------
do $mig$
declare d text := pg_get_functiondef('public.member_goal_value(uuid, text, date, numeric)'::regprocedure); o text;
begin
  o := d;
  -- edição: houve material para editar no mês (entregue no mês ou ainda em aberto)
  d := replace(d, $q$        else 0 end
    into _done, _total from e;$q$,
    $q$        when 'ed_atraso' then count(*) filter (where e.raw_sent_at is not null and ((e.d >= _ms and e.d < _ns) or e.d is null))
        else 0 end
    into _done, _total from e;$q$);
  -- design: teve arte com a pessoa no mês
  d := replace(d, $q$
  when 'so_planos' then$q$,
    $q$
    _total := (select count(*) from public.content_items c where c.designer_id = _staff and (c.status in ('ready', 'in_production', 'changes_requested')
      or (coalesce(c.delivered_at, c.approved_at) >= _ms and coalesce(c.delivered_at, c.approved_at) < _ns)));
  when 'so_planos' then$q$);
  -- social: tem cliente ativo no conteúdo
  d := replace(d, $q$
  when 'so_aprovadas' then$q$,
    $q$
    _total := (select count(distinct ct.client_id) from public.client_team ct join public.clients c on c.id = ct.client_id
      where ct.staff_id = _staff and c.is_active and not c.is_lost and public.client_in_area(ct.client_id, 'conteudo'));
  when 'so_aprovadas' then$q$);
  -- relacionamento: carteira do mês (ativos + quem saiu no mês)
  d := replace(d, $q$
  when 're_devendo' then$q$,
    $q$
    _total := (select count(distinct c.id) from public.clients c join public.client_team ct on ct.client_id = c.id
      where ct.staff_id = _staff and coalesce(c.client_type, 'recurring') <> 'one-off' and ((c.is_active and not c.is_lost) or (c.is_lost and c.lost_at >= _m and c.lost_at < _n)));
  when 're_devendo' then$q$);
  d := replace(d, $q$
  else
    return null;$q$,
    $q$
    _total := (select count(distinct c.id) from public.clients c join public.client_team ct on ct.client_id = c.id
      where ct.staff_id = _staff and c.is_active and not c.is_lost);
  else
    return null;$q$);
  -- comercial: tem negócio aberto ou fechado no mês
  d := replace(d, $q$
  when 're_reunioes' then$q$,
    $q$
    _total := (select count(*) from public.crm_deals d where d.owner_id = _staff and (d.stage in ('novo', 'qualificacao', 'negociacao', 'aguardando')
      or (d.closed_at >= _ms and d.closed_at < _ns)));
  when 're_reunioes' then$q$);
  if (length(d) - length(o)) < 900 then raise exception 'member_goal_value: trechos não encontrados (%).', length(d) - length(o); end if;
  execute d;

  d := pg_get_functiondef('public.member_ote(uuid, date)'::regprocedure); o := d;
  d := replace(d, $q$case when v.v->>'actual' is null then null else least(_cap, case$q$,
    $q$case when v.v->>'actual' is null or (v.better = 'menos' and v.v ? 'total' and coalesce((v.v->>'total')::numeric, 0) = 0) then null else least(_cap, case$q$);
  if d = o then raise exception 'member_ote: trecho não encontrado.'; end if;
  execute d;
end $mig$;

-- 4) Placar: atraso = o que está atrasado agora (sem o corte "prazo dentro do mês" que só artes e social tinham) -------
do $mig$
declare d text := pg_get_functiondef('public.team_board(date)'::regprocedure); o text;
begin
  o := d;
  d := replace(d, $q$c.deadline < _now::date and c.deadline >= _m and c.status not in ('approved', 'client_review', 'published')$q$,
    $q$c.deadline < _now::date and c.status not in ('approved', 'client_review', 'published')$q$);
  d := replace(d, $q$c.status = 'briefing' and c.deadline < _now::date and c.deadline >= _m$q$,
    $q$c.status = 'briefing' and c.deadline < _now::date$q$);
  if length(o) - length(d) <> 2 * length(' and c.deadline >= _m') then raise exception 'team_board: trechos não encontrados.'; end if;
  execute d;
end $mig$;

-- 5) Tarefa de tráfego: aviso ao novo responsável ----------------------------------------------------------------
-- Só quando uma pessoa troca o responsável (o automático já aparece no Início e na Bete; a Consultoria avisa sozinha).
create or replace function public.traffic_task_assignee_notify()
returns trigger language plpgsql security definer set search_path to '' as $$
declare _profile uuid; _link text;
begin
  if new.assignee_id is null or new.assignee_id is not distinct from old.assignee_id or new.status = 'done' or (select auth.uid()) is null then
    return new;
  end if;
  select s.profile_id into _profile from public.staff_members s where s.id = new.assignee_id and s.is_active;
  if _profile is null then return new; end if;
  _link := case when exists (select 1 from public.user_roles r where r.user_id = _profile and r.role in ('admin', 'head_marketing', 'traffic_manager'))
    then '/trafego/tarefas?tarefa=' || new.id else '/inicio' end;
  perform public.notify(array[_profile], 'task_assigned', 'Tarefa para você: ' || left(new.title, 120),
    coalesce((select trim(c.name) from public.clients c where c.id = new.client_id) || coalesce(' · prazo ' || to_char(new.due_date, 'DD/MM'), ''),
      coalesce('Prazo ' || to_char(new.due_date, 'DD/MM'), 'Sem prazo')),
    _link, new.client_id);
  return new;
end $$;
revoke execute on function public.traffic_task_assignee_notify() from public, anon, authenticated;
drop trigger if exists traffic_task_assignee_notify on public.traffic_tasks;
create trigger traffic_task_assignee_notify after update of assignee_id on public.traffic_tasks
  for each row execute function public.traffic_task_assignee_notify();
insert into public.notification_rules (kind, category, name, description, audience, in_app, email, position)
values ('task_assigned', 'trafego', 'Tarefa entregue a você', 'Alguém colocou você como responsável por uma tarefa de tráfego.', 'equipe', true, false, 2)
on conflict (kind) do nothing;
