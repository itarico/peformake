-- Central de automações: tudo o que roda sozinho no sistema, por módulo, com estado (funcionando, parado, com erro),
-- última execução e chave de ligar/desligar. Só administradores mudam; administradores e head de marketing veem.

create table if not exists public.automation_catalog (
  key text primary key,
  module text not null,          -- financeiro | trafego | comercial | whatsapp | conteudo | audiovisual | clientes | sistema
  position int not null default 0,
  title text not null,
  what text not null,            -- o que faz, em uma frase
  how text,                      -- como funciona (detalhe)
  schedule text not null,        -- quando roda, em português (horário de Brasília)
  uses_ai boolean not null default false,
  risk text not null default 'baixo' check (risk in ('baixo', 'medio', 'alto')),
  cron_job text,                 -- rotina do pg_cron (status e, sem outra chave, liga/desliga)
  flag_table text,               -- chave de configuração que liga/desliga (tabela de 1 linha)
  flag_column text,
  traffic_key text,              -- chave do painel do Tráfego (traffic_automations)
  routine_id text,               -- tarefa agendada da IA (controle fora do sistema)
  routine_on boolean,            -- situação da tarefa da IA na última conferência
  routine_checked_at timestamptz
);
alter table public.automation_catalog enable row level security;
drop policy if exists automation_catalog_read on public.automation_catalog;
create policy automation_catalog_read on public.automation_catalog for select to authenticated
  using (public.has_role('admin') or public.has_role('head_marketing'));

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job, flag_table, flag_column, traffic_key, routine_id, routine_on, routine_checked_at) values
-- Financeiro
('fin_mensalidade', 'financeiro', 1, 'Mensalidade do mês', 'Lança a mensalidade de cada contrato ativo, separada por Peformake e Ellcazo.', 'Roda todo dia, mas cria a fatura uma vez por mês. Se o valor do contrato mudou e a fatura ainda não tem link, atualiza o valor.', 'Todo dia, 03:15', false, 'medio', 'billing-monthly', 'billing_settings', 'monthly_generate', null, null, null, null),
('fin_recorrentes', 'financeiro', 2, 'Lançamentos fixos no Caixa', 'Lança no Caixa as despesas e receitas que se repetem todo mês.', null, 'Todo dia, 06:20', false, 'baixo', 'fin-recurring', null, null, null, null, null, null),
('fin_cobranca', 'financeiro', 3, 'Cobrança no Asaas', 'Gera o boleto/Pix das faturas que vencem nos próximos 5 dias.', 'Cliente sem CPF/CNPJ no cadastro não recebe cobrança: a fatura fica com erro até completar o cadastro.', 'Todo dia, 07:00', false, 'medio', 'billing-asaas-sync', 'billing_settings', 'auto_charge', null, null, null, null),
('fin_baixa', 'financeiro', 4, 'Baixa de pagamentos', 'Confere no Asaas quem pagou e dá baixa no Caixa; cancela no Asaas o que foi cancelado ou pago por fora.', null, 'A cada hora', false, 'baixo', 'billing-gateway', null, null, null, null, null, null),
('fin_conferencia', 'financeiro', 5, 'Conferência do dia e repasse da Ellcazo', 'Conferência final com o Asaas e transferência por Pix da parte da Ellcazo.', 'Move dinheiro: só ligue com a chave Pix e a porcentagem certas em Configurações do Financeiro.', 'Todo dia, 18:00', false, 'alto', 'billing-sweep', 'billing_settings', 'sweep_enabled', null, null, null, null),
('fin_lembretes', 'financeiro', 6, 'Lembretes de fatura', 'Prepara os lembretes antes e depois do vencimento para a equipe mandar.', 'Não manda nada sozinho para o cliente: a equipe confere e envia.', 'Todo dia, 09:00', false, 'baixo', 'billing-reminders', 'billing_settings', 'reminders_enabled', null, null, null, null),
('fin_contratos', 'financeiro', 7, 'Vigia de contratos', 'Avisa contrato perto de vencer ou vencido.', null, 'Todo dia, 08:40', false, 'baixo', 'contract-watch', null, null, null, null, null, null),
('fin_assinatura', 'financeiro', 8, 'Lembrete de assinatura', 'Lembra contrato esperando assinatura ou aceite.', null, 'Todo dia, 09:30', false, 'baixo', 'contract-reminders', null, null, null, null, null, null),
-- Tráfego (chaves do painel do Tráfego)
('trf_leitura', 'trafego', 1, 'Leitura dos anúncios', 'Lê gasto, campanhas e anúncios na Meta e atualiza Painel, Campanhas e Portal. Só lê.', 'Feita pela tarefa da IA "Tráfego: ler Meta Ads". Precisa dos conectores ADS, ADS - ACÁCIA, ADS- F5 e Supabase na tarefa.', '05:30, 11:30, 17:30 e 23:30', true, 'baixo', null, null, null, 'leitura_meta', 'trig_01T893T3sG2yzkjyHWzriU54', false, now()),
('trf_alertas', 'trafego', 2, 'Alertas de gasto', 'Avisa gasto alto num dia, gasto fora do padrão e conta com restrição.', null, 'Depois de cada leitura e às 06:40', false, 'baixo', 'traffic-scan-daily', null, null, 'alertas', null, null, null),
('trf_varredura', 'trafego', 3, 'Tarefas automáticas', 'Cria tarefas: anúncio sem resultado, caro, cansado e conta parada. Pausa já vem com Aprovar.', null, 'Depois de cada leitura e às 06:40', false, 'baixo', 'traffic-scan-daily', null, null, 'varredura', null, null, null),
('trf_analise', 'trafego', 4, 'Análise diária', 'A IA lê os números e escreve o que fazer em cada cliente.', null, 'Todo dia, 07:00', true, 'baixo', null, null, null, null, 'trig_01WdwMnAryCi6reRwfemSoWC', true, now()),
('trf_whatsapp', 'trafego', 5, 'WhatsApp vira tarefa', 'A IA lê as mensagens dos clientes e cria tarefa só quando o assunto é anúncio.', 'Feita pela tarefa da IA "Tráfego - Caixa de mensagens".', 'A cada hora', true, 'baixo', null, null, null, 'whatsapp', 'trig_01PsMdyXKNTTKjG6DTNoP2kX', true, now()),
('trf_execucao', 'trafego', 6, 'Executar ações aprovadas', 'O que alguém aprovou (pausar, ativar, mudar orçamento) é feito na Meta. Se a Meta recusar, volta para Revisão.', 'Roda junto com a leitura dos anúncios.', 'A cada leitura', true, 'medio', null, null, null, 'execucao', 'trig_01T893T3sG2yzkjyHWzriU54', false, now()),
('trf_piloto', 'trafego', 7, 'Piloto automático', 'Pausa sozinho o anúncio que gastou o limite em 3 dias sem resultado. Orçamento e ativação continuam pedindo aprovação.', null, 'Junto com as tarefas automáticas', false, 'alto', null, null, null, 'piloto', null, null, null),
('trf_lembrete', 'trafego', 8, 'Lembrete de aprovação', 'Avisa quem aprova sobre cards parados há mais de 2 dias e mede o efeito das ações feitas.', null, 'Todo dia, 07:30', false, 'baixo', 'task-daily-check', null, null, 'lembrete_aprovacao', null, null, null),
('trf_estrategia', 'trafego', 9, 'Estrategista semanal', 'A IA pesquisa e monta a estratégia da semana de cada cliente com gasto.', null, 'Segunda, 06:20', true, 'baixo', null, null, null, null, 'trig_01U3QaKsd5HMSvPrMGRrrnKU', true, now()),
('trf_estrategia_mes', 'trafego', 10, 'Estrategista do mês', 'A IA revisa a estratégia do mês de cada cliente.', null, 'Dia 15, 06:10', true, 'baixo', null, null, null, null, 'trig_018NTjS5vqbR7s5xf3wymnKw', true, now()),
('trf_rel_semanal', 'trafego', 11, 'Relatório semanal', 'A IA escreve o texto às 06:00 e o sistema monta o PDF às 07:15. Fica para revisão.', null, 'Segunda, 06:00 e 07:15', true, 'baixo', 'traffic-report-weekly', null, null, 'relatorio_semanal', 'trig_018vbTV9uz5YfCzAJvY8dBTG', true, now()),
('trf_rel_mensal', 'trafego', 12, 'Relatório mensal', 'Mesmo processo do semanal, no fim do mês.', null, 'Dias 28 a 31, 06:00 e 07:15', true, 'baixo', 'traffic-report-monthly', null, null, 'relatorio_mensal', 'trig_0126pCF4QKCePSH3hYrSggE9', true, now()),
('trf_envio', 'trafego', 13, 'Enviar relatórios ao cliente', 'Manda os relatórios aprovados para o WhatsApp do cliente. Desligado: a equipe envia.', null, 'Quando o relatório é aprovado', false, 'medio', null, null, null, 'envio_relatorios', null, null, null),
('trf_catalogo', 'trafego', 14, 'Catálogo da Will Motos', 'Compara o estoque de veículos com os anúncios e atualiza ou pausa o anúncio.', null, 'A cada 6 horas', false, 'medio', 'catalog-ad-sync', null, null, null, null, null, null),
-- Comercial
('com_leitura', 'comercial', 1, 'Leitura das conversas', 'A IA lê as conversas novas, atualiza o funil e sugere a próxima ação.', 'Feita pela tarefa da IA "Comercial - Leitura do WhatsApp". Só sugere: não responde ninguém.', 'A cada hora', true, 'baixo', null, null, null, null, 'trig_01W5sJQEcERKvQdybdnREiWb', true, now()),
('com_despertador', 'comercial', 2, 'Leitura na hora da mensagem', 'Quando um cliente manda mensagem, chama a leitura do Comercial em minutos, a qualquer hora.', 'Precisa do segredo ROUTINE_TOKEN_COMMERCIAL no Supabase (Edge Functions → Secrets).', 'A cada 5 minutos', false, 'baixo', 'hub-wakeup', null, null, null, null, null, null),
('com_grupos', 'comercial', 3, 'Grupos do WhatsApp', 'Atualiza os nomes dos grupos de WhatsApp comerciais.', null, 'Todo dia, 06:00', false, 'baixo', 'commercial-groups', null, null, null, null, null, null),
('com_prospeccao', 'comercial', 4, 'Prospecção', 'Busca empresas novas no Google Maps para prospectar.', null, 'Todo dia, 07:00', false, 'baixo', 'prospect-daily', null, null, null, null, null, null),
('com_enriquecer', 'comercial', 5, 'Dados das empresas prospectadas', 'Confere WhatsApp, site, pixel e Instagram e dá a nota (quente, morno, frio).', null, 'A cada hora', false, 'baixo', 'prospect-enrich', null, null, null, null, null, null),
-- WhatsApp e avisos
('wa_midia', 'whatsapp', 1, 'Fotos, vídeos e documentos', 'Baixa o que os clientes mandam no WhatsApp e guarda nos arquivos do cliente.', null, 'A cada 3 minutos', false, 'baixo', 'whatsapp-media', null, null, null, null, null, null),
('wa_audio', 'whatsapp', 2, 'Transcrição de áudios', 'Transforma os áudios do WhatsApp em texto.', 'Usa um serviço de transcrição por IA (Whisper).', 'A cada 5 minutos', true, 'baixo', 'whatsapp-transcribe', null, null, null, null, null, null),
('wa_contatos', 'whatsapp', 3, 'Dados dos contatos', 'Puxa nome, foto e status dos contatos do WhatsApp.', null, 'Todo dia, 06:00', false, 'baixo', 'wa-enrich', null, null, null, null, null, null),
('wa_avisos', 'whatsapp', 4, 'Avisos da equipe por WhatsApp', 'Manda para a equipe os avisos internos que estão na fila.', 'Precisa do segredo do Wasender com o nome certo no Supabase.', 'A cada 10 minutos', false, 'baixo', 'notify-send', null, null, null, null, null, null),
('wa_email', 'whatsapp', 5, 'E-mails', 'Envia os e-mails que estão na fila.', null, 'A cada 5 minutos', false, 'baixo', 'email-send', null, null, null, null, null, null),
-- Conteúdo e design
('ct_modelo', 'conteudo', 1, 'Arte no modelo da Peformake', 'Pedido de arte rápida (foto + chamada + botão) vira arte pronta no modelo fixo.', 'Não usa IA: aplica o modelo da Peformake com a foto do cliente.', 'Na hora do pedido', false, 'baixo', null, 'design_settings', 'auto_enabled', null, null, null, null),
('ct_assumir', 'conteudo', 2, 'Arte quando ninguém assume', 'Se ninguém pegar a arte no prazo, o sistema monta no modelo padrão.', 'Não usa IA: monta no modelo fixo.', 'A cada minuto', false, 'baixo', 'design-ai-takeover', 'design_settings', 'ai_takeover', null, null, null, null),
('ct_radar', 'conteudo', 3, 'Radar de Design', 'A IA pesquisa as novidades de design da semana para usar nos clientes.', null, 'Segunda, 07:43', true, 'baixo', null, null, null, null, 'trig_014JUQWNrz9JvqS75ZHtaY7i', true, now()),
-- Audiovisual
('av_lembretes', 'audiovisual', 1, 'Lembretes de gravação', 'Avisa a equipe na véspera e no dia da gravação e cobra o envio do material bruto.', null, 'A cada 5 minutos', false, 'baixo', 'av-reminders', null, null, null, null, null, null),
-- Clientes
('cli_ranking', 'clientes', 1, 'Nota diária dos clientes', 'Guarda a nota de cada cliente para o gráfico de evolução.', null, 'Todo dia, 07:00', false, 'baixo', 'rank-snapshot', null, null, null, null, null, null),
('cli_nicho', 'clientes', 2, 'Estudo de nicho', 'Abre o estudo do trimestre para cada nicho de cliente ativo.', null, 'Dia 1 de jan, abr, jul e out', false, 'baixo', 'niche-quarterly', null, null, null, null, null, null),
-- Sistema
('sis_melhoria', 'sistema', 1, 'Melhoria contínua', 'A IA revisa o sistema, corrige de 1 a 3 coisas e publica.', null, 'A cada hora', true, 'baixo', null, null, null, null, 'trig_012AmX8LGAupybXuRpYPUVbX', true, now())
on conflict (key) do update set module = excluded.module, position = excluded.position, title = excluded.title, what = excluded.what, how = excluded.how,
  schedule = excluded.schedule, uses_ai = excluded.uses_ai, risk = excluded.risk, cron_job = excluded.cron_job, flag_table = excluded.flag_table,
  flag_column = excluded.flag_column, traffic_key = excluded.traffic_key, routine_id = excluded.routine_id,
  routine_on = excluded.routine_on, routine_checked_at = excluded.routine_checked_at;

-- Estado de cada automação: ligada?, última execução, problema conhecido.
create or replace function public.automation_overview()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  _r public.automation_catalog;
  _out jsonb := '[]'::jsonb;
  _on boolean; _job_active boolean;
  _last_at timestamptz; _last_status text; _last_msg text;
  _activity timestamptz; _problem text; _n int;
begin
  if not (public.has_role('admin') or public.has_role('head_marketing')) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  for _r in select * from public.automation_catalog order by module, position loop
    _on := null; _job_active := null; _last_at := null; _last_status := null; _last_msg := null; _activity := null; _problem := null;
    if _r.cron_job is not null then
      select j.active into _job_active from cron.job j where j.jobname = _r.cron_job;
      select d.start_time, d.status, left(d.return_message, 200) into _last_at, _last_status, _last_msg
        from cron.job_run_details d join cron.job j on j.jobid = d.jobid
        where j.jobname = _r.cron_job order by d.start_time desc limit 1;
      if _last_status = 'failed' then _problem := 'A última execução falhou: ' || coalesce(_last_msg, 'sem detalhe'); end if;
    end if;
    if _r.flag_table is not null then
      execute format('select %I from public.%I limit 1', _r.flag_column, _r.flag_table) into _on;
    elsif _r.traffic_key is not null then
      select t.enabled into _on from public.traffic_automations t where t.key = _r.traffic_key;
    elsif _r.cron_job is not null then
      _on := _job_active;
    end if;
    -- Rotina do banco desligada também para a chave.
    if _job_active is false then _on := false; end if;
    -- Tarefa da IA desligada: nada acontece, mesmo com a chave ligada.
    if _r.routine_id is not null and _r.routine_on is false and coalesce(_on, true) then
      _problem := coalesce(_problem, 'A tarefa da IA que faz isso está desligada.');
    end if;
    -- Sinais de que está funcionando (ou não) de verdade.
    case _r.key
      when 'com_despertador' then
        select case when l.status = 'no_token' or l.detail ilike 'falta%' then l.detail end, l.requested_at into _problem, _activity
          from public.agent_fire_log l where l.routine = 'commercial' order by l.requested_at desc limit 1;
      when 'com_leitura' then select max(ai_analyzed_at) into _activity from public.wa_contacts;
      when 'wa_avisos' then
        select count(*) into _n from public.notification_outbox where status = 'pending' and created_at < now() - interval '30 minutes';
        if _n > 0 then _problem := _n || ' aviso(s) parado(s) na fila. Confira o segredo do Wasender.'; end if;
        select max(sent_at) into _activity from public.notification_outbox;
      when 'wa_email' then
        select count(*) into _n from public.email_outbox where status = 'pending' and created_at < now() - interval '30 minutes';
        if _n > 0 then _problem := _n || ' e-mail(s) parado(s) na fila.'; end if;
        select max(sent_at) into _activity from public.email_outbox;
      when 'fin_cobranca' then
        select count(*) into _n from public.invoices where status = 'pendente' and gateway_error is not null;
        if _n > 0 then _problem := _n || ' fatura(s) com erro no Asaas (geralmente cliente sem CPF/CNPJ).'; end if;
      when 'trf_leitura' then
        select last_auto_run_at into _activity from public.traffic_settings where id;
        if coalesce(_on, false) and (_activity is null or _activity < now() - interval '12 hours') then
          _problem := coalesce(_problem, 'Sem leitura dos anúncios há mais de 12 horas.');
        end if;
      when 'trf_rel_semanal' then select max(created_at) into _activity from public.traffic_reports where kind = 'weekly';
      when 'trf_rel_mensal' then select max(created_at) into _activity from public.traffic_reports where kind = 'monthly';
      else null;
    end case;
    _out := _out || jsonb_build_object(
      'key', _r.key, 'module', _r.module, 'title', _r.title, 'what', _r.what, 'how', _r.how, 'schedule', _r.schedule,
      'uses_ai', _r.uses_ai, 'risk', _r.risk, 'routine_id', _r.routine_id, 'routine_on', _r.routine_on,
      'can_toggle', (_r.flag_table is not null or _r.traffic_key is not null or _r.cron_job is not null),
      'enabled', _on, 'last_at', _last_at, 'last_status', _last_status, 'activity_at', _activity,
      'status', case
        when _on is false then 'desligada'
        when _problem is not null then 'erro'
        when _r.routine_id is not null and _r.cron_job is null and _r.traffic_key is null and _r.flag_table is null then case when _r.routine_on then 'ok' else 'desligada' end
        else 'ok' end,
      'problem', _problem);
  end loop;
  return _out;
end $$;
revoke all on function public.automation_overview() from public, anon;
grant execute on function public.automation_overview() to authenticated;

-- Liga/desliga: chave de configuração > chave do Tráfego > rotina do banco. Só administrador.
create or replace function public.automation_set(_key text, _enabled boolean)
returns void language plpgsql security definer set search_path to '' as $$
declare _r public.automation_catalog; _id bigint;
begin
  if not public.has_role('admin') then raise exception 'Só administradores mudam automações' using errcode = '42501'; end if;
  select * into _r from public.automation_catalog where key = _key;
  if not found then raise exception 'Automação não encontrada' using errcode = 'PF004'; end if;
  if _r.flag_table is not null then
    execute format('update public.%I set %I = $1 where id', _r.flag_table, _r.flag_column) using _enabled;
    -- Ligar a chave religa também a rotina, se alguém tinha desligado a rotina.
    if _enabled and _r.cron_job is not null then
      select jobid into _id from cron.job where jobname = _r.cron_job;
      if _id is not null then perform cron.alter_job(_id, active := true); end if;
    end if;
  elsif _r.traffic_key is not null then
    perform public.traffic_automation_set(_r.traffic_key, _enabled, null);
  elsif _r.cron_job is not null then
    select jobid into _id from cron.job where jobname = _r.cron_job;
    if _id is null then raise exception 'Rotina não encontrada' using errcode = 'PF004'; end if;
    perform cron.alter_job(_id, active := _enabled);
  else
    raise exception 'Esta automação é ligada e desligada na tarefa da IA' using errcode = 'PF005';
  end if;
end $$;
revoke all on function public.automation_set(text, boolean) from public, anon;
grant execute on function public.automation_set(text, boolean) to authenticated;

-- Correção: a chave do Tráfego ainda chamava has_role com dois argumentos no banco (dava erro ao ligar).
create or replace function public.traffic_automation_set(_key text, _enabled boolean, _params jsonb default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then
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
