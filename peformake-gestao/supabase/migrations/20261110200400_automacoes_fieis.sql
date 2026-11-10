-- Central de Automações fiel ao que roda (item 6 do escopo e itens 11 e 23 do relatório).

update public.automation_catalog set
  how = 'Roda todo dia e cria a fatura uma vez por mês. Cliente novo: só com dia de cobrança e data de início, e a 1ª sai no mês seguinte ao início (sem proporcional). Se o preço mudou e a fatura ainda não tem link nem pagamento parcial (e ninguém mudou o valor à mão), atualiza itens e valor.'
where key = 'fin_mensalidade';

update public.automation_catalog set cron_job = 'billing-gateway', schedule = 'A cada hora, aos 20 min',
  what = 'Gera o boleto/Pix das faturas que vencem nos próximos 5 dias e fecha no Asaas o que foi cancelado ou pago por fora.',
  how = 'Cliente sem CPF/CNPJ não recebe cobrança: a fatura fica com erro até completar o cadastro. A cobrança sai da conta de quem recebe; Ellcazo fica manual (Cora) até ligar o Asaas dela.'
where key = 'fin_cobranca';

update public.automation_catalog set cron_job = 'billing-asaas-sync', schedule = 'Todo dia, 07:00', flag_table = null, flag_column = null,
  what = 'Confere no Asaas quem pagou nos últimos 5 dias e dá baixa (o aviso do Asaas também dá baixa na hora).'
where key = 'fin_baixa';

update public.automation_catalog set
  what = 'Manda ao cliente o lembrete um dia antes, no dia e um dia depois do vencimento.',
  how = 'Desligado: nenhum lembrete vai para o cliente. O aviso interno de atraso continua (linha "Atraso: aviso à equipe").'
where key = 'fin_lembretes';

update public.automation_catalog set
  what = 'Junta as faturas do mesmo cliente no mês numa cobrança só: só da mesma empresa e com vencimentos até 5 dias de diferença (vale o mais cedo, registrado na fatura). Com "Quem recebe" escolhido no cliente, junta as duas empresas na conta de quem recebe.',
  how = 'Separar à mão em Cobrança impede de juntar de novo. Faturas de atraso lançadas à mão nunca são juntadas.'
where key = 'fin_juntar';

update public.automation_catalog set
  how = 'Desligado e substituído pelo "Repasse entre empresas". Move dinheiro: só ligue com a chave Pix e a porcentagem certas.'
where key = 'fin_conferencia';

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job, flag_table, flag_column) values
  ('fin_atraso', 'financeiro', 6, 'Atraso: aviso à equipe', 'Avisa a equipe com 3 dias de atraso e marca "vencido" com 7 dias (a régua para e vira conversa humana).',
    'Interno, nada vai para o cliente.', 'Todo dia, 09:00', false, 'baixo', 'billing-reminders', null, null),
  ('fin_descontos', 'financeiro', 21, 'Aplicar descontos aprovados', 'Coloca na próxima fatura em aberto os descontos de entrega que o admin aprovou. Desconto maior que a fatura zera a fatura e a sobra vai para a seguinte.',
    'Só o que o admin aprovou em Cobrança → Para revisar.', 'Todo dia, 09:20', false, 'medio', 'delivery-credits-apply', null, null),
  ('fin_repasse', 'financeiro', 22, 'Repasse entre empresas', 'Quando uma empresa recebe a parte da outra ("Quem recebe" no cliente), anota "a repassar R$ X" no Caixa e avisa só se passar de 7 dias.',
    'Nada sai sozinho: o repasse é marcado como feito com 1 toque. Pix automático só com a chave ligada e o OK do admin.', 'Na hora do pagamento; aviso todo dia, 08:50', false, 'medio', 'interco-overdue', 'billing_settings', 'interco_pix_enabled'),
  ('cfg_autoteste', 'configuracoes', 90, 'Autoteste semanal', 'Testa as regras de cobrança, Caixa, extrato e permissões com dados de teste que se desfazem sozinhos. Só o resultado fica guardado.',
    'Sem IA e sem serviço externo (custo zero). Falhou algo: um aviso normal para o admin.', 'Domingo, 06:00', false, 'baixo', 'selftest-weekly', null, null)
on conflict (key) do update set what = excluded.what, how = excluded.how, schedule = excluded.schedule, cron_job = excluded.cron_job,
  flag_table = excluded.flag_table, flag_column = excluded.flag_column;
