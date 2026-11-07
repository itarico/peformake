-- Tráfego: painel de automações (o "i"), piloto automático, execução que não esconde falha,
-- varredura diária própria, alertas sem leitura velha e WhatsApp sem card repetido.

create table if not exists public.traffic_automations (
  key text primary key,
  position int not null default 0,
  title text not null,
  what text not null,
  schedule text not null,
  risk text not null default 'baixo' check (risk in ('baixo','medio','alto')),
  enabled boolean not null default true,
  params jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.traffic_automations enable row level security;
drop policy if exists traffic_automations_read on public.traffic_automations;
create policy traffic_automations_read on public.traffic_automations for select to authenticated using (public.can_access_traffic());

insert into public.traffic_automations (key, position, title, what, schedule, risk, enabled, params) values
('leitura_meta', 1, 'Leitura dos anúncios', 'Lê gasto, campanhas, conjuntos e anúncios de cada conta pela Meta e atualiza Painel, Campanhas e Portal do cliente. Só lê, não muda nada na Meta.', 'A cada 6 horas', 'baixo', true, '{}'),
('alertas', 2, 'Alertas de gasto', 'Avisa gasto alto num dia, gasto fora do padrão e conta com restrição na Meta.', 'Depois de cada leitura', 'baixo', true, '{}'),
('varredura', 3, 'Tarefas automáticas', 'Cria tarefas: anúncio gastando sem resultado, anúncio caro, criativo cansado (frequência alta) e conta que parou de rodar. Anúncio para pausar já vem com o botão Aprovar.', 'Depois de cada leitura e todo dia às 8h', 'baixo', true, '{}'),
('whatsapp', 4, 'WhatsApp vira tarefa', 'Lê as mensagens dos clientes e cria tarefa só quando é assunto de anúncio, no formato padrão. O mesmo assunto em vários dias vira um card só. Pedido de pausar ou mudar verba já vira ação para aprovar.', 'A cada hora', 'baixo', true, '{}'),
('execucao', 5, 'Executar ações aprovadas', 'Quando alguém aprova um card (pausar, ativar, mudar orçamento), o sistema faz a mudança na Meta e registra o resultado no card. Se a Meta recusar, o card volta para Revisão com o motivo.', 'A cada leitura', 'medio', true, '{}'),
('piloto', 6, 'Piloto automático', 'Faz sozinho, sem esperar aprovação, só o que é seguro: pausar anúncio que gastou o limite abaixo em 3 dias sem nenhum resultado. Mudança de orçamento e ativação continuam pedindo aprovação.', 'Junto com as tarefas automáticas', 'alto', false, '{"pause_min_cents": 3000}'),
('relatorio_semanal', 7, 'Relatório semanal', 'Monta o relatório de cada cliente toda segunda (fica para revisão, não envia sozinho).', 'Segunda, 9h', 'baixo', true, '{}'),
('relatorio_mensal', 8, 'Relatório mensal', 'Monta o relatório do mês de cada cliente no fim do mês (fica para revisão).', 'Últimos dias do mês', 'baixo', true, '{}'),
('envio_relatorios', 9, 'Enviar relatórios ao cliente', 'Manda os relatórios aprovados para o WhatsApp do cliente. Desligado: a equipe envia.', 'Quando o relatório é aprovado', 'medio', false, '{}'),
('lembrete_aprovacao', 10, 'Lembrete de aprovação', 'Avisa quem aprova quando um card está parado em Revisão há mais de 2 dias e mede o efeito das ações feitas.', 'Todo dia, 10h', 'baixo', true, '{}')
on conflict (key) do nothing;

update public.traffic_automations a set enabled = s.scan_enabled from public.traffic_settings s where a.key = 'varredura';
update public.traffic_automations a set enabled = s.weekly_report_enabled from public.traffic_settings s where a.key = 'relatorio_semanal';
update public.traffic_automations a set enabled = s.monthly_report_enabled from public.traffic_settings s where a.key = 'relatorio_mensal';
update public.traffic_automations a set enabled = s.send_reports_enabled from public.traffic_settings s where a.key = 'envio_relatorios';

create or replace function public.traffic_automation_on(_key text) returns boolean
language sql stable set search_path to '' as $$
  select coalesce((select enabled from public.traffic_automations where key = _key), false)
$$;

create or replace function public.traffic_automation_set(_key text, _enabled boolean, _params jsonb default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Só administradores mudam automações' using errcode = '42501';
  end if;
  update public.traffic_automations set enabled = _enabled, params = coalesce(_params, params), updated_at = now(), updated_by = auth.uid() where key = _key;
  if not found then raise exception 'Automação não encontrada' using errcode = 'PF004'; end if;
  update public.traffic_settings set
    scan_enabled = case when _key = 'varredura' then _enabled else scan_enabled end,
    weekly_report_enabled = case when _key = 'relatorio_semanal' then _enabled else weekly_report_enabled end,
    monthly_report_enabled = case when _key = 'relatorio_mensal' then _enabled else monthly_report_enabled end,
    send_reports_enabled = case when _key = 'envio_relatorios' then _enabled else send_reports_enabled end
  where id;
end $$;
revoke all on function public.traffic_automation_set(text, boolean, jsonb) from public, anon;
grant execute on function public.traffic_automation_set(text, boolean, jsonb) to authenticated;

-- Ação que falhou volta para Revisão com o motivo (não fica escondida em Concluído).
create or replace function public.traffic_finish_action(_task_id uuid, _ok boolean, _result text)
returns void language plpgsql set search_path to '' as $$
begin
  update public.traffic_tasks set action_status = case when _ok then 'done' else 'failed' end,
    action_result = left(_result, 4000), updated_at = now(),
    status = case when _ok then 'done' else 'review' end,
    completed_at = case when _ok then now() else null end
  where id = _task_id;
end $$;

-- Execução desligada no painel: a fila não anda.
create or replace function public.traffic_next_action()
returns table(task_id uuid, action jsonb) language plpgsql set search_path to '' as $$
begin
  if not public.traffic_automation_on('execucao') then return; end if;
  return query
    update public.traffic_tasks t set action_status = 'running', updated_at = now()
    where t.id = (select id from public.traffic_tasks where action_status = 'queued' order by approved_at limit 1 for update skip locked)
    returning t.id, t.proposed_action;
end $$;

-- Ações que falharam antes ficam visíveis de novo.
update public.traffic_tasks set status = 'review', completed_at = null, updated_at = now()
where action_status = 'failed' and status = 'done';

-- Varredura de anúncios: pausa já vem como ação para aprovar; com piloto ligado, entra na fila sozinha.
create or replace function public.traffic_scan_ads(_today date)
returns integer language plpgsql set search_path to '' as $$
declare
  _r record;
  _count integer := 0;
  _id uuid;
  _pilot boolean := public.traffic_automation_on('piloto');
  _limit bigint := coalesce((select (params ->> 'pause_min_cents')::bigint from public.traffic_automations where key = 'piloto'), 3000);
begin
  for _r in
    with ad7 as (
      select e.id, e.name, e.account_id, a.client_id, a.name account_name,
        sum(d.spend_cents) spend, sum(d.results) results, sum(d.impressions) impressions, sum(d.reach) reach,
        sum(d.spend_cents) filter (where d.day > _today - 3) spend3, sum(d.results) filter (where d.day > _today - 3) results3
      from public.traffic_entities e
      join public.ad_accounts a on a.id = e.account_id and a.enabled
      join public.traffic_entity_daily d on d.entity_id = e.id and d.day > _today - 7 and d.day <= _today
      where e.level = 'ad' and e.effective_status = 'ACTIVE'
      group by e.id, e.name, e.account_id, a.client_id, a.name
    ),
    acc as (select account_id, sum(spend) spend, sum(results) results from ad7 group by account_id)
    select ad7.*, acc.spend acc_spend, acc.results acc_results from ad7 join acc using (account_id)
  loop
    _id := null;
    if coalesce(_r.spend3, 0) >= 3000 and coalesce(_r.results3, 0) = 0 then
      begin
        _id := public.agent_propose_action(_r.id, 'set_status', 'PAUSED',
          'Conta ' || _r.account_name || '. Gastou ' || public.brl_text(_r.spend3) || ' nos últimos 3 dias sem nenhuma conversa ou cadastro.');
        update public.traffic_tasks set priority = 'high' where id = _id and action_status = 'waiting_approval';
        if _pilot and _r.spend3 >= _limit then
          update public.traffic_tasks set action_status = 'queued', approved_at = now(),
            action_summary = 'Piloto automático: ' || action_summary, updated_at = now()
          where id = _id and action_status = 'waiting_approval';
        end if;
        _count := _count + 1;
      exception when others then null;
      end;
    elsif _r.results > 0 and _r.acc_results > 0 and _r.spend >= 3000
      and (_r.spend::numeric / _r.results) >= 2 * (_r.acc_spend::numeric / _r.acc_results) then
      begin
        perform public.agent_propose_action(_r.id, 'set_status', 'PAUSED',
          'Conta ' || _r.account_name || '. Custo por resultado de ' || public.brl_text(round(_r.spend::numeric / _r.results)::bigint)
            || ' contra ' || public.brl_text(round(_r.acc_spend::numeric / _r.acc_results)::bigint) || ' na média da conta (7 dias).');
        _count := _count + 1;
      exception when others then null;
      end;
    end if;

    if _r.reach > 0 and _r.impressions::numeric / _r.reach >= 3.5 then
      begin
        perform public.agent_task_create(jsonb_build_object(
          'title', 'Trocar criativo cansado: ' || left(_r.name, 120),
          'description', 'Conta ' || _r.account_name || '. Frequência de ' || round(_r.impressions::numeric / _r.reach, 1)
            || ' em 7 dias: o mesmo público está vendo o anúncio muitas vezes.',
          'source', 'agent', 'priority', 'normal', 'category', 'criativo', 'client_id', _r.client_id,
          'dedupe_key', 'fatigue:' || _r.id));
        _count := _count + 1;
      exception when unique_violation then null;
      end;
    end if;
  end loop;

  -- Saldo: só com leitura recente (leitura velha não gera tarefa).
  for _r in
    select a.id, a.name, a.client_id, st.available_cents,
      (select avg(m.spend_cents) from public.traffic_daily_metrics m
        where m.account_id = a.id and m.day between _today - 7 and _today - 1 and m.spend_cents > 0) avg_cents
    from public.ad_accounts a join public.traffic_account_status st on st.account_id = a.id
    where a.enabled and st.is_prepaid and st.available_cents is not null and st.read_at > now() - interval '3 days'
  loop
    if _r.avg_cents > 0 and _r.available_cents / _r.avg_cents <= 3 then
      begin
        perform public.agent_task_create(jsonb_build_object(
          'title', 'Recarregar saldo: ' || _r.name,
          'description', 'Restam ' || public.brl_text(_r.available_cents) || ', cerca de ' || floor(_r.available_cents / _r.avg_cents)
            || ' dia(s) no ritmo atual. Combine a recarga com o cliente.',
          'source', 'alert', 'priority', 'high', 'category', 'atendimento', 'client_id', _r.client_id, 'due_date', _today,
          'dedupe_key', 'balance:' || _r.id));
        _count := _count + 1;
      exception when unique_violation then null;
      end;
    end if;
  end loop;
  return _count;
end $$;

-- A varredura respeita a chave do painel.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.traffic_scan(date)'::regprocedure);
  if position('traffic_automation_on' in d) = 0 then
    d := replace(d, '  _count := public.traffic_scan_ads(_today);', '  if not public.traffic_automation_on(''varredura'') then return 0; end if;' || E'\n' || '  _count := public.traffic_scan_ads(_today);');
    execute d;
  end if;
  d := pg_get_functiondef('public.traffic_detect_alerts(date)'::regprocedure);
  if position('traffic_automation_on' in d) = 0 then
    d := replace(d, E'begin\n  select * into _s from public.traffic_settings where id;', E'begin\n  if not public.traffic_automation_on(''alertas'') then return 0; end if;\n  select * into _s from public.traffic_settings where id;');
    d := replace(d, 'join public.traffic_account_status st on st.account_id = a.id', 'join public.traffic_account_status st on st.account_id = a.id and st.read_at > now() - interval ''3 days''');
    execute d;
  end if;
end $$;
revoke all on function public.traffic_scan(date) from public, anon, authenticated;
revoke all on function public.traffic_scan_ads(date) from public, anon, authenticated;

-- Varredura e alertas todo dia às 8h10 (Brasília), sem depender da leitura antiga.
select cron.unschedule('traffic-scan-daily') where exists (select 1 from cron.job where jobname = 'traffic-scan-daily');
select cron.schedule('traffic-scan-daily', '10 11 * * *', $$select public.traffic_detect_alerts((now() at time zone 'America/Sao_Paulo')::date), public.traffic_scan((now() at time zone 'America/Sao_Paulo')::date)$$);

-- O executor antigo usa a chave da Meta que foi bloqueada: a fila agora é tocada pela rotina oficial da Meta.
update cron.job set active = false where jobname = 'traffic-execute';

-- WhatsApp: respeita a chave e junta o mesmo assunto em um card só (3 dias).
create or replace function public.agent_task_create(_data jsonb)
returns uuid language plpgsql set search_path to '' as $$
declare
  _id uuid;
  _topic text;
begin
  if length(trim(coalesce(_data ->> 'title', ''))) not between 3 and 200
    or coalesce(_data ->> 'source', '') not in ('agent', 'whatsapp', 'strategist', 'alert')
    or coalesce(_data ->> 'priority', 'normal') not in ('high', 'normal', 'low')
    or coalesce(_data ->> 'category', 'outro') not in ('criativo', 'campanha', 'ajuste', 'relatorio', 'atendimento', 'outro')
    or _data ? 'proposed_action' then
    raise exception 'Formato invalido' using errcode = 'PF006';
  end if;
  if _data ->> 'source' = 'whatsapp' then
    if not public.traffic_automation_on('whatsapp') then return null; end if;
    -- "wa:<cliente>:<tema>:<data>" → o mesmo tema do mesmo cliente nos últimos 3 dias vira o mesmo card.
    _topic := regexp_replace(coalesce(_data ->> 'dedupe_key', ''), ':[0-9]{4}-[0-9]{2}-[0-9]{2}$', '');
    if _topic <> '' then
      select id into _id from public.traffic_tasks
      where source = 'whatsapp' and status <> 'done' and created_at > now() - interval '3 days'
        and regexp_replace(coalesce(dedupe_key, ''), ':[0-9]{4}-[0-9]{2}-[0-9]{2}$', '') = _topic
      order by created_at desc limit 1;
      if found then
        update public.traffic_tasks set
          description = left(coalesce(description, '') || E'\n\n' || to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || ': ' || coalesce(_data ->> 'description', ''), 4000),
          priority = case when _data ->> 'priority' = 'high' then 'high' else priority end,
          updated_at = now()
        where id = _id;
        return _id;
      end if;
    end if;
  end if;
  if nullif(_data ->> 'dedupe_key', '') is not null then
    select id into _id from public.traffic_tasks where dedupe_key = _data ->> 'dedupe_key' and status <> 'done';
    if found then return _id; end if;
  end if;
  insert into public.traffic_tasks (title, description, priority, category, source, client_id, due_date, status, position, dedupe_key)
  values (
    trim(_data ->> 'title'),
    nullif(trim(coalesce(_data ->> 'description', '')), ''),
    coalesce(_data ->> 'priority', 'normal'),
    coalesce(_data ->> 'category', 'outro'),
    _data ->> 'source',
    nullif(_data ->> 'client_id', '')::uuid,
    coalesce(nullif(_data ->> 'due_date', '')::date, case when _data ->> 'source' = 'whatsapp' then (now() at time zone 'America/Sao_Paulo')::date + case when _data ->> 'priority' = 'high' then 0 else 1 end end),
    'todo', 0,
    nullif(_data ->> 'dedupe_key', '')
  ) returning id into _id;
  return _id;
end $$;

-- Instruções da caixa do WhatsApp: formato padrão, só assunto de anúncio, pedido de Meta vira ação.
update public.agent_instructions set body = regexp_replace(body, '## WhatsApp dos clientes.*?(?=## Resumo da rodada)', $wa$## WhatsApp dos clientes

`whatsapp` traz as mensagens novas recebidas em conversas ligadas a clientes, inclusive grupos.

Só crie card no Tráfego para assunto de ANÚNCIO:
- pedido de campanha, promoção, anúncio novo, mudança de verba, público ou região;
- reclamação de resultado (poucos contatos, lead ruim, "não vi movimento");
- aviso que muda o anúncio: produto acabou, preço novo, horário novo, data especial;
- dúvida do cliente sobre a conta de anúncio ou cobrança da Meta.

NÃO crie card no Tráfego (outras áreas cuidam): arte de feed, aprovação de postagem, vídeo, gravação, agenda, contrato, pagamento à agência, cumprimentos, "ok", figurinhas, áudios sem texto, mensagens da equipe da Peformake.

Pedido para pausar, ativar ou mudar a verba de um anúncio que existe (procure o anúncio em `agent_context_client`):
- use `agent_propose_action(entity_id, 'set_status', 'PAUSED' | 'ACTIVE', motivo)` ou `agent_propose_action(entity_id, 'set_daily_budget', centavos, motivo)`;
- o motivo diz quem pediu e o trecho da mensagem. Não crie tarefa comum para isso.
- Se não achar o anúncio, crie tarefa com título "Cliente: pausar <nome do anúncio> (não achei na conta)".

Formato OBRIGATÓRIO do card (`agent_task_create`, `source = 'whatsapp'`):
- `title`: "<Cliente>: <verbo> <o quê>", até 70 caracteres. Ex.: "Fornario: quer campanha de Natal", "MF Máquinas: reclama que não vê resultado".
- `description` em 3 linhas:
  Pedido: <o que o cliente quer, em uma frase>
  Quem: <nome> · <grupo ou conversa> · <dia e hora>
  Fazer: <próximo passo da equipe, em uma frase>
- `category`: campanha (anúncio novo/promoção), ajuste (verba/público/pausa), criativo (trocar peça do anúncio), atendimento (dúvida/reclamação), relatorio (pedido de números).
- `priority = 'high'` só para reclamação, urgência ("hoje", "urgente", "parou") ou dinheiro.
- `dedupe_key = 'wa:' || client_id || ':' || tema-curto-sem-espaco || ':' || data`. Use SEMPRE o mesmo tema para o mesmo assunto (ex.: "resultado", "natal", "pausa-fox2014"): o sistema junta o mesmo assunto dos últimos 3 dias num card só.

Nunca responda o cliente no WhatsApp.

$wa$, 's')
where name = 'trafego-caixa-mensagens';
