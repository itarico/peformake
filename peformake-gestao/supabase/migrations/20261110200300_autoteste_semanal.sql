-- Autoteste SOB DEMANDA sem IA (roda quando o Italo pedir: select public.selftest_run();). Sem agendamento. Cada cenário roda numa subtransação que se desfaz
-- (raise 'selftest_rollback'): só o resultado fica gravado em selftest_runs. Nenhum serviço externo é chamado.

create table if not exists public.selftest_runs (
  id bigint generated always as identity primary key,
  run_id uuid not null,
  ran_at timestamptz not null default now(),
  scenario text not null,
  ok boolean not null,
  detail text,
  ms integer
);
create index if not exists selftest_runs_ran_idx on public.selftest_runs (ran_at desc);
alter table public.selftest_runs enable row level security;
create policy selftest_runs_admin_read on public.selftest_runs for select to authenticated using (public.has_role('admin'));

create or replace function public.selftest_fail(_msg text) returns void language plpgsql set search_path = '' as $$
begin raise exception 'FALHOU: %', _msg; end $$;

-- Cliente e fatura de teste (sempre dentro da subtransação que se desfaz).
create or replace function public.selftest_client(_name text, _receiver text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare _id uuid := gen_random_uuid();
begin
  insert into public.clients (id, name, source, synced_at, is_active, is_lost, legacy_created_at, billing_receiver)
  values (_id, 'SELFTEST ' || _name || ' ' || left(_id::text, 6), 'app', now(), true, false, now(), _receiver);
  insert into public.client_contracts (client_id, contract_type, billing_day, start_date) values (_id, 'recurring', 30, current_date - 90);
  return _id;
end $$;

create or replace function public.selftest_invoice(_client uuid, _unit text, _amount numeric, _due date, _source text default 'manual') returns uuid
language plpgsql security definer set search_path = '' as $$
declare _id uuid;
begin
  insert into public.invoices (client_id, unit, description, amount, due_date, source, ref)
  values (_client, _unit, 'SELFTEST fatura ' || _amount, _amount, _due, _source, 'selftest:' || gen_random_uuid())
  returning id into _id;
  return _id;
end $$;

create or replace function public.selftest_case(_n text)
returns void language plpgsql security definer set search_path = '' as $function$
declare
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  _c uuid; _c2 uuid; _a uuid; _b uuid; _e uuid; _r jsonb; _txt text; _n2 int; _v numeric;
begin
  perform set_config('pf.selftest', '1', true);
  perform set_config('request.jwt.claims', json_build_object('sub', (select user_id from public.user_roles where role = 'admin' limit 1), 'role', 'authenticated')::text, true);
  update public.billing_settings set merge_monthly = false, reminders_enabled = false where id;

  if _n = '01_desfazer_pagamento_concilia_de_novo' then
    _c := public.selftest_client('desfazer'); _a := public.selftest_invoice(_c, 'peformake', 777.71, _today);
    perform public.invoice_paid_matched(_a, 'extrato:ST-A', _today, 777.71, 'teste');
    perform public.invoice_undo_paid(_a);
    if (select paid_ref from public.invoices where id = _a) is not null then perform public.selftest_fail('paid_ref ficou depois de desfazer'); end if;
    _r := public.fin_import('peformake', jsonb_build_array(jsonb_build_object('amount', 777.71, 'date', _today, 'description', 'PIX SELFTEST', 'external_id', 'ST-B')));
    if (select status from public.invoices where id = _a) <> 'pago' then perform public.selftest_fail('novo pagamento não casou: ' || _r::text); end if;

  elsif _n = '02_caixa_desfaz_cobranca_junta_inteira' then
    _c := public.selftest_client('junta'); _a := public.selftest_invoice(_c, 'peformake', 1000, _today + 10); _b := public.selftest_invoice(_c, 'ellcazo', 500, _today + 10);
    perform public.invoice_group_build(_c, array[_a, _b], false);
    update public.fin_entries set status = 'pago', paid_at = _today where id = (select fin_entry_id from public.invoices where id = _a);
    if (select count(*) from public.invoices where id in (_a, _b) and status = 'pago') <> 2 then perform public.selftest_fail('baixa do grupo pelo Caixa não quitou as duas'); end if;
    update public.fin_entries set status = 'pendente', paid_at = null where id = (select fin_entry_id from public.invoices where id = _a);
    if exists (select 1 from public.invoices where id in (_a, _b) and status = 'pago') then perform public.selftest_fail('desfazer pelo Caixa deixou parte paga'); end if;
    if (select status from public.fin_entries where id = (select fin_entry_id from public.invoices where id = _b)) <> 'pendente' then perform public.selftest_fail('Caixa da Ellcazo ficou pago'); end if;

  elsif _n = '03_pagamento_parcial_deixa_saldo' then
    _c := public.selftest_client('parcial'); _a := public.selftest_invoice(_c, 'peformake', 777.77, _today);
    perform public.invoice_set_paid(_a, _today, 400);
    if (select status from public.invoices where id = _a) not in ('pendente', 'vencido') then perform public.selftest_fail('parcial quitou a fatura'); end if;
    if (select amount from public.fin_entries where id = (select fin_entry_id from public.invoices where id = _a)) <> 377.77 then perform public.selftest_fail('saldo no Caixa errado'); end if;
    perform public.invoice_set_paid(_a, _today, null);
    select sum(amount) into _v from public.fin_entries where client_id = _c and kind = 'entrada' and status = 'pago';
    if _v <> 777.77 then perform public.selftest_fail('total recebido ' || _v || ' em vez de 777,77'); end if;

  elsif _n = '04_extrato_nao_duplica_conta_fixa_e_manual' then
    insert into public.fin_entries (unit, kind, description, amount, due_date, status, source, external_id)
    values ('peformake', 'saida', 'SELFTEST aluguel', 1234.56, _today, 'pendente', 'manual', 'rec:selftest:' || _today) returning id into _e;
    perform public.fin_import('peformake', jsonb_build_array(jsonb_build_object('amount', -1234.56, 'date', _today, 'description', 'PAGAMENTO ALUGUEL', 'external_id', 'ST-C')));
    if (select status from public.fin_entries where id = _e) <> 'pago' then perform public.selftest_fail('conta fixa não recebeu a baixa'); end if;
    if exists (select 1 from public.fin_entries where source = 'extrato' and external_id = 'ST-C') then perform public.selftest_fail('extrato criou saída repetida'); end if;
    insert into public.fin_entries (unit, kind, description, amount, due_date, paid_at, status, source)
    values ('peformake', 'entrada', 'SELFTEST manual', 250.53, _today, _today, 'pago', 'manual') returning id into _e;
    perform public.fin_import('peformake', jsonb_build_array(jsonb_build_object('amount', 250.53, 'date', _today, 'description', 'PIX RECEBIDO', 'external_id', 'ST-D')));
    if exists (select 1 from public.fin_entries where source = 'extrato' and external_id = 'ST-D') then perform public.selftest_fail('extrato criou entrada repetida'); end if;

  elsif _n = '05_pagamento_atrasado_casa_e_duvida_fica_a_conferir' then
    _c := public.selftest_client('atrasado'); _a := public.selftest_invoice(_c, 'peformake', 333.37, _today - 6);
    perform public.fin_import('peformake', jsonb_build_array(jsonb_build_object('amount', 333.37, 'date', _today, 'description', 'PIX', 'external_id', 'ST-E')));
    if (select status from public.invoices where id = _a) <> 'pago' then perform public.selftest_fail('pagamento 6 dias depois não casou'); end if;
    _c := public.selftest_client('duvida1'); _c2 := public.selftest_client('duvida2');
    _a := public.selftest_invoice(_c, 'peformake', 444.47, _today); _b := public.selftest_invoice(_c2, 'peformake', 444.47, _today);
    perform public.fin_import('peformake', jsonb_build_array(jsonb_build_object('amount', 444.47, 'date', _today, 'description', 'PIX', 'external_id', 'ST-F')));
    if exists (select 1 from public.invoices where id in (_a, _b) and status = 'pago') then perform public.selftest_fail('escolheu sozinho entre duas faturas iguais'); end if;
    select id into _e from public.fin_entries where source = 'extrato' and external_id = 'ST-F';
    if (select review_status from public.fin_entries where id = _e) is distinct from 'a_revisar' then perform public.selftest_fail('dúvida não ficou "A conferir"'); end if;
    perform public.fin_entry_invoice_confirm(_e, null);
    if (select count(*) from public.invoices where id in (_a, _b) and status = 'pago') <> 1 then perform public.selftest_fail('"É essa" não deu baixa'); end if;
    if (select status from public.fin_entries where id = _e) <> 'cancelado' then perform public.selftest_fail('"É essa" deixou a entrada em dobro'); end if;

  elsif _n = '06_dia_de_cobranca_nao_vai_para_o_passado' then
    if extract(day from _today) = 1 then return; end if;
    _c := public.selftest_client('dia');
    _a := public.selftest_invoice(_c, 'peformake', 99.91, (date_trunc('month', _today) + interval '1 month - 1 day')::date, 'mensalidade');
    update public.client_contracts set billing_day = 1 where client_id = _c;
    if (select due_date from public.invoices where id = _a) < _today then perform public.selftest_fail('vencimento foi para o passado'); end if;

  elsif _n = '07_juntar_so_mesma_empresa' then
    update public.billing_settings set merge_monthly = true where id;
    _c := public.selftest_client('juntar');
    _a := public.selftest_invoice(_c, 'peformake', 100, _today + 20); _b := public.selftest_invoice(_c, 'ellcazo', 50, _today + 20);
    perform public.invoice_group_auto();
    if exists (select 1 from public.invoices where id in (_a, _b) and group_id is not null) then perform public.selftest_fail('juntou Peformake com Ellcazo'); end if;
    _b := public.selftest_invoice(_c, 'peformake', 60, _today + 22);
    perform public.invoice_group_auto();
    if (select count(distinct group_id) from public.invoices where id in (_a, _b) and group_id is not null) <> 1 then perform public.selftest_fail('não juntou duas da Peformake'); end if;
    if (select due_date from public.invoices where id = _b) <> _today + 20 then perform public.selftest_fail('vencimento não foi o mais cedo'); end if;

  elsif _n = '08_quem_recebe_tudo_gera_repasse' then
    update public.billing_settings set merge_monthly = true where id;
    _c := public.selftest_client('recebe', 'peformake');
    _a := public.selftest_invoice(_c, 'peformake', 100, _today + 20); _b := public.selftest_invoice(_c, 'ellcazo', 50, _today + 20);
    perform public.invoice_group_auto();
    if (select count(distinct group_id) from public.invoices where id in (_a, _b) and group_id is not null) <> 1 then perform public.selftest_fail('não juntou as duas empresas com "Peformake recebe tudo"'); end if;
    perform public.invoice_set_paid(_a, _today, null);
    if (select coalesce(sum(amount), 0) from public.interco_transfers where invoice_id = _b and status = 'pendente' and to_unit = 'ellcazo') <> 50 then perform public.selftest_fail('repasse para a Ellcazo não nasceu'); end if;
    perform public.invoice_undo_paid(_a);
    if exists (select 1 from public.interco_transfers where invoice_id = _b and status = 'pendente') then perform public.selftest_fail('desfazer não cancelou o repasse'); end if;

  elsif _n = '09_desconto_maior_que_a_fatura' then
    _c := public.selftest_client('desconto'); _a := public.selftest_invoice(_c, 'peformake', 777.77, _today + 10, 'mensalidade');
    insert into public.delivery_credits (client_id, unit, service, month, qty, status, discount) values (_c, 'peformake', 'SELFTEST', date_trunc('month', _today)::date, 1, 'aprovado', 900) returning id into _e;
    if not public.delivery_credit_apply(_e) then perform public.selftest_fail('desconto não entrou'); end if;
    if (select status from public.invoices where id = _a) <> 'cancelado' then perform public.selftest_fail('fatura coberta pelo desconto não foi zerada'); end if;
    if (select discount from public.delivery_credits where id = _e) <> 122.23 then perform public.selftest_fail('sobra do desconto errada'); end if;

  elsif _n = '10_cancelada_e_paga_no_asaas' then
    _c := public.selftest_client('cancelada'); _a := public.selftest_invoice(_c, 'peformake', 88.81, _today);
    update public.invoices set gateway = 'asaas', gateway_id = 'SELFTEST-' || _a, status = 'cancelado' where id = _a;
    perform public.invoice_paid_by_gateway('asaas', 'SELFTEST-' || _a, 88.81, _today);
    if (select status || coalesce(gateway_close, '') from public.invoices where id = _a) <> 'pago' then perform public.selftest_fail('ficou com pedido de cancelar no Asaas'); end if;

  elsif _n = '11_caixa_nao_muda_data_de_fatura' then
    _c := public.selftest_client('data'); _a := public.selftest_invoice(_c, 'peformake', 55.51, _today + 5);
    select fin_entry_id into _e from public.invoices where id = _a;
    begin
      perform public.fin_entry_save(_e, jsonb_build_object('unit', 'peformake', 'kind', 'entrada', 'amount', 55.51, 'description', 'x', 'due_date', _today + 30, 'status', 'pendente'));
      perform public.selftest_fail('Caixa mudou a data de uma fatura');
    exception when sqlstate 'PF010' then null;
    end;

  elsif _n = '12_permissoes_sem_login' then
    select string_agg(f, ', ') into _txt from unnest(array[
      'public.fin_wa_process(uuid,boolean)', 'public.fin_wa_command(uuid,text,numeric)', 'public.fin_wa_undo(uuid)', 'public.fin_wa_reply(uuid,text)',
      'public.fin_wa_link_pending()', 'public.contract_reminders_run()', 'public.fin_recurring_generate(date)', 'public.invoice_set_paid(uuid,date,numeric)',
      'public.invoice_undo_paid(uuid)', 'public.fin_entry_save(uuid,jsonb)', 'public.fin_import(text,jsonb)', 'public.invoice_generate_month(date)']) f
    where has_function_privilege('anon', f, 'execute');
    if _txt is not null then perform public.selftest_fail('sem login pode chamar: ' || _txt); end if;
    select string_agg(f, ', ') into _txt from unnest(array['public.fin_wa_process(uuid,boolean)', 'public.contract_reminders_run()', 'public.fin_recurring_generate(date)']) f
    where has_function_privilege('authenticated', f, 'execute');
    if _txt is not null then perform public.selftest_fail('qualquer logado pode chamar: ' || _txt); end if;

  elsif _n = '13_atrasados_manuais_intactos' then
    if exists (select 1 from public.invoices where ref like 'atraso:%' and (group_id is not null or gateway_id is not null or not no_merge)) then
      perform public.selftest_fail('fatura de atraso foi juntada ou mandada ao Asaas');
    end if;

  elsif _n = '14_dados_conferem' then
    select count(*) into _n2 from public.invoices where paid_ref is not null and status <> 'pago';
    if _n2 > 0 then perform public.selftest_fail(_n2 || ' fatura(s) não paga(s) com marca de conciliação'); end if;
    select count(*) into _n2 from public.invoices i join public.fin_entries e on e.id = i.fin_entry_id
      where (i.status = 'pago') <> (e.status = 'pago') or (i.status = 'cancelado') <> (e.status = 'cancelado');
    if _n2 > 0 then perform public.selftest_fail(_n2 || ' fatura(s) com status diferente do Caixa'); end if;
    select count(*) into _n2 from public.invoices i where i.source = 'mensalidade' and i.status <> 'cancelado'
      and abs(coalesce((select sum(amount) from public.invoice_items ii where ii.invoice_id = i.id), 0) - i.amount) >= 0.01
      and not exists (select 1 from public.billing_events be where be.invoice_id = i.id and be.kind = 'valor_manual');
    if _n2 > 0 then perform public.selftest_fail(_n2 || ' mensalidade(s) com soma dos itens diferente do valor'); end if;

  elsif _n = '15_desempenho_mes' then
    _v := extract(epoch from clock_timestamp());
    perform public.invoice_generate_month(_today);
    if extract(epoch from clock_timestamp()) - _v > 2 then perform public.selftest_fail('gerar o mês levou mais de 2 s'); end if;
  else
    perform public.selftest_fail('cenário desconhecido');
  end if;
end $function$;

create or replace function public.selftest_run()
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare _run uuid := gen_random_uuid(); _s text; _t0 timestamptz; _ok boolean; _detail text; _fail int := 0; _total int := 0;
begin
  if (select auth.uid()) is not null and not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  foreach _s in array array['01_desfazer_pagamento_concilia_de_novo', '02_caixa_desfaz_cobranca_junta_inteira', '03_pagamento_parcial_deixa_saldo',
    '04_extrato_nao_duplica_conta_fixa_e_manual', '05_pagamento_atrasado_casa_e_duvida_fica_a_conferir', '06_dia_de_cobranca_nao_vai_para_o_passado',
    '07_juntar_so_mesma_empresa', '08_quem_recebe_tudo_gera_repasse', '09_desconto_maior_que_a_fatura', '10_cancelada_e_paga_no_asaas',
    '11_caixa_nao_muda_data_de_fatura', '12_permissoes_sem_login', '13_atrasados_manuais_intactos', '14_dados_conferem', '15_desempenho_mes'] loop
    _t0 := clock_timestamp(); _ok := false; _detail := null;
    begin
      perform public.selftest_case(_s);
      raise exception 'selftest_rollback';
    exception when others then
      if sqlerrm = 'selftest_rollback' then _ok := true;
      elsif sqlerrm like 'FALHOU:%' then _detail := substring(sqlerrm from 9);
      else _detail := 'erro: ' || sqlerrm; end if;
    end;
    insert into public.selftest_runs (run_id, scenario, ok, detail, ms) values (_run, _s, _ok, left(_detail, 500), (extract(epoch from clock_timestamp() - _t0) * 1000)::int);
    _total := _total + 1; if not _ok then _fail := _fail + 1; end if;
  end loop;
  if _fail > 0 then
    perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'selftest_fail',
      'Autoteste: ' || _fail || ' de ' || _total || ' falharam', 'Veja em Configurações → Automações → Autoteste.', '/configuracoes/automacoes', null);
  end if;
  return jsonb_build_object('run_id', _run, 'total', _total, 'falhas', _fail);
end $function$;

create or replace function public.selftest_last()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.has_role('admin') then (
    select jsonb_build_object('ran_at', max(r.ran_at), 'total', count(*), 'ok', count(*) filter (where r.ok),
      'falhas', coalesce(jsonb_agg(jsonb_build_object('scenario', r.scenario, 'detail', r.detail)) filter (where not r.ok), '[]'::jsonb))
    from public.selftest_runs r where r.run_id = (select run_id from public.selftest_runs order by ran_at desc limit 1)) end
$$;

revoke execute on function public.selftest_run(), public.selftest_case(text), public.selftest_client(text, text),
  public.selftest_invoice(uuid, text, numeric, date, text), public.selftest_fail(text) from public, anon, authenticated;
grant execute on function public.selftest_run() to service_role;
revoke execute on function public.selftest_last() from public, anon;
grant execute on function public.selftest_last() to authenticated;

-- Sem agendamento (decisão do Italo, 10/11): roda só sob demanda. Se existir um agendamento antigo, desliga.
do $$ begin
  if exists (select 1 from cron.job where jobname = 'selftest-weekly') then perform cron.unschedule('selftest-weekly'); end if;
end $$;
