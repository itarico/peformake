-- Pedido do Italo (24/11/2026): tudo sincronizado e o sistema pegando a falha humana.
-- Cada área ganha o "próximo passo" automático, no quadro de tarefas que ela já usa:
--   audiovisual -> team_tasks    "Marcar a gravação de X"            fecha ao marcar a gravação
--   tráfego     -> traffic_tasks "Vincular a conta de anúncio de X"  fecha ao vincular a conta em Tráfego > Contas
--   social/design -> social_tasks "Fazer o planejamento de MM/AAAA de X" fecha quando o mês ganha a primeira arte
-- Nasce na hora em que o serviço é atribuído e uma varredura diária (06:40) repõe o que ficou para trás.
-- A mesma varredura avisa o admin quando a Conferência de cadastro tem pontos para corrigir.

-- 1. Audiovisual: a varredura só reabre tarefa fechada em mês anterior (não fica insistindo no mesmo mês).
create or replace function public.av_shoot_task(_client uuid, _sweep boolean)
returns void language plpgsql security definer set search_path to '' as $$
declare _name text; _month date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
begin
  select trim(name) into _name from public.clients where id = _client and is_active and not is_lost;
  if _name is null then return; end if;
  if exists (select 1 from public.av_projects p where p.client_id = _client and p.status <> 'cancelled' and p.shoot_at >= now()) then return; end if;
  insert into public.team_tasks as t (area, client_id, title, source, due_date, ref_table, ref_id, ref_kind)
  values ('audiovisual', _client, left('Marcar a gravação de ' || _name, 200), 'sistema',
    ((now() at time zone 'America/Sao_Paulo')::date + 3), 'clients', _client, 'marcar_gravacao')
  on conflict (ref_table, ref_id, ref_kind) where ref_id is not null do update set
    status = 'a_fazer', completed_at = null, due_date = excluded.due_date, title = excluded.title, updated_at = now()
    where t.status = 'feito' and (not _sweep or coalesce(t.completed_at, t.updated_at) < _month);
end $$;
revoke execute on function public.av_shoot_task(uuid, boolean) from public, anon, authenticated;
-- O nome antigo continua valendo (gatilhos de serviço, cadastro e cancelamento chamam ele).
create or replace function public.av_first_shoot_task(_client uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  perform public.av_shoot_task(_client, false);
end $$;
revoke execute on function public.av_first_shoot_task(uuid) from public, anon, authenticated;

-- 2. Tráfego: cliente com serviço de tráfego e sem conta de anúncio vinculada.
create or replace function public.traffic_account_task(_client uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare _name text; _key text := 'conta:' || _client;
begin
  select trim(name) into _name from public.clients where id = _client and is_active and not is_lost;
  if _name is null then return; end if;
  if exists (select 1 from public.ad_accounts a where a.client_id = _client) then return; end if;
  if exists (select 1 from public.traffic_tasks t where t.dedupe_key = _key
             and (t.status <> 'done' or coalesce(t.completed_at, t.updated_at) > now() - interval '30 days')) then return; end if;
  insert into public.traffic_tasks (client_id, title, description, status, priority, category, source, due_date, dedupe_key)
  values (_client, left('Vincular a conta de anúncio de ' || _name, 200),
    'O cliente tem serviço de tráfego e nenhuma conta de anúncio ligada a ele. Em Tráfego, aba Contas, escolha o cliente na conta dele. A tarefa fecha sozinha.',
    'todo', 'high', 'outro', 'alert', ((now() at time zone 'America/Sao_Paulo')::date + 2), _key);
end $$;
revoke execute on function public.traffic_account_task(uuid) from public, anon, authenticated;

create or replace function public.ad_account_link_closes_task()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  begin
    if new.client_id is not null then
      update public.traffic_tasks set status = 'done', completed_at = coalesce(completed_at, now()), updated_at = now()
       where dedupe_key = 'conta:' || new.client_id and status <> 'done';
    end if;
  exception when others then
    raise warning 'ad_account_link_closes_task falhou para %: %', new.id, sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public.ad_account_link_closes_task() from public, anon, authenticated;
create or replace trigger ad_account_link_closes_task after insert or update of client_id on public.ad_accounts
for each row execute function public.ad_account_link_closes_task();

-- 3. Social e design: mês sem nenhuma arte planejada.
create or replace function public.content_plan_task(_client uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare _name text; _month date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
begin
  select trim(name) into _name from public.clients where id = _client and is_active and not is_lost;
  if _name is null then return; end if;
  if not (public.client_areas(_client) && array['social', 'design']) then return; end if;
  if exists (select 1 from public.content_items i join public.content_plans p on p.id = i.plan_id
             where p.client_id = _client and p.month = _month) then return; end if;
  insert into public.social_tasks as t (client_id, title, description, status, source, network, due_date, ref_table, ref_id)
  values (_client, left('Fazer o planejamento de ' || to_char(_month, 'MM/YYYY') || ' de ' || _name, 200),
    'O cliente tem social ou design e o mês ainda não tem nenhuma arte planejada. A tarefa fecha sozinha quando a primeira arte do mês entra.',
    'a_fazer', 'agente', 'geral', ((now() at time zone 'America/Sao_Paulo')::date + 3), 'plano_mes', _client)
  on conflict (ref_table, ref_id) where ref_id is not null do update set
    status = 'a_fazer', completed_at = null, due_date = excluded.due_date, title = excluded.title, updated_at = now()
    where t.status = 'feito' and coalesce(t.completed_at, t.updated_at) < _month;
end $$;
revoke execute on function public.content_plan_task(uuid) from public, anon, authenticated;

create or replace function public.content_item_closes_plan_task()
returns trigger language plpgsql security definer set search_path to '' as $$
declare _client uuid;
begin
  begin
    select p.client_id into _client from public.content_plans p
     where p.id = new.plan_id and p.month = date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
    if _client is not null then
      update public.social_tasks set status = 'feito', completed_at = coalesce(completed_at, now()), updated_at = now()
       where ref_table = 'plano_mes' and ref_id = _client and status <> 'feito';
    end if;
  exception when others then
    raise warning 'content_item_closes_plan_task falhou para %: %', new.id, sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public.content_item_closes_plan_task() from public, anon, authenticated;
create or replace trigger content_item_closes_plan_task after insert on public.content_items
for each row execute function public.content_item_closes_plan_task();

-- 4. Atribuiu (ou reativou) o serviço: o próximo passo da área nasce na hora.
create or replace function public.client_service_next_step()
returns trigger language plpgsql security definer set search_path to '' as $$
declare _area text;
begin
  begin
    if new.is_active and (tg_op = 'INSERT' or not coalesce(old.is_active, false)) then
      select s.area into _area from public.services s where s.id = new.service_id;
      if _area = 'audiovisual' then perform public.av_first_shoot_task(new.client_id);
      elsif _area = 'trafego' then perform public.traffic_account_task(new.client_id);
      elsif _area in ('social', 'design') then perform public.content_plan_task(new.client_id);
      end if;
    end if;
  exception when others then
    raise warning 'client_service_next_step falhou para %: %', new.client_id, sqlerrm;
  end;
  return new;
end $$;

-- 5. Conferência de cadastro: a mesma lista, agora também para a varredura (sem checar quem chama).
create or replace function public.client_consistency_rows()
returns table(client_id uuid, cliente text, tipo text, problema text, link text)
language plpgsql stable security definer set search_path to '' as $function$
declare _month date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
begin
  return query
  with ativos as (select c.id, c.name, c.client_type from public.clients c where c.is_active and not c.is_lost),
  srv as (
    select cs.id cs_id, cs.client_id, s.name sname, s.area, coalesce(s.visits_per_month, 0) visits
    from public.client_services cs join public.services s on s.id = cs.service_id
    join ativos a on a.id = cs.client_id where cs.is_active
  )
  select a.id, a.name, 'servico_sem_preco'::text, 'Serviço ativo sem preço: ' || x.sname, '/clientes/' || a.id || '?aba=operacao'
  from srv x join ativos a on a.id = x.client_id
  where not exists (select 1 from public.client_service_prices p where p.client_service_id = x.cs_id and p.price is not null)
  union all
  select a.id, a.name, 'fixo_sem_dia', 'Cliente fixo sem dia de cobrança', '/clientes/' || a.id || '?passo=cobranca'
  from ativos a left join public.client_contracts ct on ct.client_id = a.id
  where coalesce(a.client_type, 'recurring') <> 'one-off' and ct.billing_day is null
  union all
  select a.id, a.name, 'tipo_divergente',
    case when a.client_type = 'one-off' then 'Avulso na ficha, mas o contrato é de fixo mensal' else 'Fixo na ficha, mas o contrato é de avulso' end,
    '/clientes/' || a.id || '?aba=contrato'
  from ativos a join public.client_contracts ct on ct.client_id = a.id
  where (a.client_type = 'one-off' and (ct.contract_type = 'recurring' or ct.contract_model = 'MRR'))
     or (coalesce(a.client_type, 'recurring') = 'recurring' and (ct.contract_type = 'project' or ct.contract_model = 'One-off'))
  union all
  select a.id, a.name, 'servico_duplicado', 'Serviço ativo em dobro: ' || min(x.sname), '/clientes/' || a.id || '?aba=operacao'
  from srv x join ativos a on a.id = x.client_id join public.client_services cs on cs.id = x.cs_id
  group by a.id, a.name, cs.service_id having count(*) > 1
  union all
  select c.id, c.name, 'venda_sem_lancamento', 'Venda confirmada de ' || to_char(s.sale_date, 'DD/MM') || ' sem fatura nem serviço', '/clientes/' || c.id || '?aba=contrato'
  from public.crm_sales s join public.clients c on c.id = s.client_id
  where s.status = 'confirmada'
    and not exists (select 1 from public.invoices i where i.ref = 'sale:' || s.id)
    and not exists (select 1 from public.client_services cs where cs.id::text in (select jsonb_array_elements_text(coalesce(s.result->'client_services', '[]'::jsonb))))
  union all
  select a.id, a.name, 'audiovisual_sem_projeto', 'Plano de visitas sem captação no mês: ' || min(x.sname), '/clientes/' || a.id || '?aba=operacao'
  from srv x join ativos a on a.id = x.client_id
  where x.area = 'audiovisual' and x.visits > 0
    and not exists (select 1 from public.av_projects p where p.client_id = a.id and p.month = _month)
  group by a.id, a.name
  union all
  select a.id, a.name, 'social_sem_plano', 'Social/design sem planejamento do mês', '/clientes/' || a.id || '?aba=operacao'
  from srv x join ativos a on a.id = x.client_id
  where x.area in ('social', 'design')
    and not exists (select 1 from public.content_plans p where p.client_id = a.id and p.month = _month)
  group by a.id, a.name
  union all
  -- Sem CPF/CNPJ a cobrança pelo Asaas e a nota fiscal não saem.
  select a.id, a.name, 'sem_documento', 'Cliente com fatura em aberto e sem CPF ou CNPJ', '/clientes/' || a.id || '/editar'
  from ativos a join public.clients c on c.id = a.id
  where coalesce(c.document, '') = ''
    and exists (select 1 from public.invoices i where i.client_id = a.id and i.status in ('pendente', 'vencido'))
  order by 3, 2;
end $function$;
revoke execute on function public.client_consistency_rows() from public, anon, authenticated;

create or replace function public.client_consistency_issues()
returns table(client_id uuid, cliente text, tipo text, problema text, link text)
language plpgsql stable security definer set search_path to '' as $function$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  return query select * from public.client_consistency_rows();
end $function$;

-- 6. Varredura diária: repõe o próximo passo que ficou para trás e avisa o admin das falhas de cadastro.
create or replace function public.next_step_sweep()
returns jsonb language plpgsql security definer set search_path to '' as $$
declare _c record; _month date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
        _av int := 0; _tr int := 0; _so int := 0; _n int; _body text; _admins uuid[]; _title text;
        _b_av int; _b_tr int; _b_so int;
begin
  select count(*) into _b_av from public.team_tasks where ref_kind = 'marcar_gravacao' and status <> 'feito';
  select count(*) into _b_tr from public.traffic_tasks where dedupe_key like 'conta:%' and status <> 'done';
  select count(*) into _b_so from public.social_tasks where ref_table = 'plano_mes' and status <> 'feito';
  for _c in select c.id, public.client_areas(c.id) areas from public.clients c where c.is_active and not c.is_lost loop
    begin
      -- Audiovisual: só quem tem plano com visita no mês e ainda não gravou nem marcou neste mês.
      if 'audiovisual' = any(_c.areas)
         and exists (select 1 from public.client_services cs join public.services s on s.id = cs.service_id
                     where cs.client_id = _c.id and cs.is_active and s.area = 'audiovisual' and coalesce(s.visits_per_month, 0) > 0)
         and not exists (select 1 from public.av_projects p where p.client_id = _c.id and p.status <> 'cancelled' and p.month = _month) then
        perform public.av_shoot_task(_c.id, true);
      end if;
      if 'trafego' = any(_c.areas) then perform public.traffic_account_task(_c.id); end if;
      if _c.areas && array['social', 'design'] then perform public.content_plan_task(_c.id); end if;
    exception when others then
      raise warning 'next_step_sweep falhou para %: %', _c.id, sqlerrm;
    end;
  end loop;
  select count(*) - _b_av into _av from public.team_tasks where ref_kind = 'marcar_gravacao' and status <> 'feito';
  select count(*) - _b_tr into _tr from public.traffic_tasks where dedupe_key like 'conta:%' and status <> 'done';
  select count(*) - _b_so into _so from public.social_tasks where ref_table = 'plano_mes' and status <> 'feito';

  select coalesce(sum(t.n), 0), string_agg(t.rotulo || ': ' || t.n, E'\n' order by t.rotulo) into _n, _body
  from (select case r.tipo
      when 'servico_sem_preco' then 'Serviço sem preço'
      when 'fixo_sem_dia' then 'Fixo sem dia de cobrança'
      when 'tipo_divergente' then 'Ficha e contrato não batem'
      when 'servico_duplicado' then 'Serviço em dobro'
      when 'venda_sem_lancamento' then 'Venda sem fatura nem serviço'
      when 'audiovisual_sem_projeto' then 'Plano de vídeo sem gravação no mês'
      when 'social_sem_plano' then 'Social ou design sem planejamento'
      when 'sem_documento' then 'Fatura em aberto sem CPF ou CNPJ'
      else r.tipo end as rotulo, count(*)::int as n
    from public.client_consistency_rows() r group by r.tipo) t;
  if _n > 0 then
    _title := _n || case when _n = 1 then ' ponto de cadastro para corrigir' else ' pontos de cadastro para corrigir' end;
    -- Avisa de novo só se o número mudou ou se já passou uma semana.
    if not exists (select 1 from public.notifications n where n.kind = 'cadastro_falhas'
                   and ((n.title = _title and n.created_at > now() - interval '7 days') or n.created_at > now() - interval '20 hours')) then
      select array_agg(distinct r.user_id) into _admins from public.user_roles r join public.profiles p on p.id = r.user_id and p.is_active where r.role = 'admin';
      if _admins is not null then
        perform public.notify(_admins, 'cadastro_falhas', _title, left(_body, 1900), '/configuracoes/conferencia', null);
      end if;
    end if;
  end if;
  return jsonb_build_object('audiovisual', _av, 'trafego', _tr, 'social', _so, 'falhas', _n);
end $$;
revoke execute on function public.next_step_sweep() from public, anon, authenticated;

select cron.schedule('next-step-sweep', '40 9 * * *', $cron$ select public.next_step_sweep(); $cron$);

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job)
values ('cli_proximo_passo', 'clientes', 4, 'Próximo passo de cada serviço',
  'Cliente com serviço e sem o passo seguinte ganha a tarefa na área: marcar a gravação, vincular a conta de anúncio, fazer o planejamento do mês. Avisa o admin quando a Conferência de cadastro tem pontos para corrigir.',
  'Não usa IA e não manda nada para o cliente. A tarefa fecha sozinha quando o passo é feito.',
  'Todo dia, 06:40', false, 'baixo', 'next-step-sweep')
on conflict (key) do nothing;
