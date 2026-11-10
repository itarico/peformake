# Avaliação e teste de estresse: Clientes e Financeiro

Data: 10/11/2026 (nuvem). Fase de testes, antes do domínio próprio.
Nada foi alterado no código nem no banco: todo teste de escrita rodou dentro de `begin … rollback` (dados de teste com nome "TESTE …", apagados ao final de cada cenário). Nenhum serviço externo foi chamado (Asaas, Wasender, edge functions).

## Como foi feito (honestidade sobre o que foi testado)

| Parte | Como | Situação |
|---|---|---|
| Funções do banco (cobrança, caixa, extrato, juntar, baixa, fechamento, avulso de membro, permissões) | **Testado de verdade** no banco em rollback, agindo como admin e como usuário sem papel | 9 cenários, ~45 verificações |
| Tempo das funções principais | **Medido** (relógio antes/depois, em rollback) | ok |
| Interface (Clientes, ficha, Financeiro: Caixa, Cobrança, Contratos) | **Testado** com Playwright no app de teste (`.harness/shell`, login falso de admin) com **dados falsos** interceptados no navegador (60 clientes, 180 faturas, 180 lançamentos), desktop 1366×800 e iPhone 13 | telas abrem, medidas de rolagem e capturas |
| Interface com dados reais, cliques que gravam, pop-ups de pagamento | **Só leitura do código** (sem sessão real o banco devolve vazio) | parcial |
| Multa/juros, link de pagamento, repasse da Ellcazo (edge function `billing-gateway`) | **Só leitura** (chama Asaas) | não testado |
| Testes automáticos existentes | `npx vitest run`: **45 arquivos, 304 testes, todos passaram**. `npx tsc -b --noEmit`: **sem erros** | ok |
| Lançamentos pelo WhatsApp (outro agente construindo) | Só olhei permissões das funções `fin_wa_*` | ver erro 18 |

Capturas: `/tmp/claude-0/-home-user-peformake/aee204d9-a263-5dcb-b721-376614d4cc42/scratchpad/avaliacao/` (`m-desk-*.png`, `m-iphone-*.png`). Scripts: `ui2.cjs` (interface com dados falsos) na mesma pasta.

## Notas

| Módulo / aba | Nota | Por quê |
|---|---|---|
| **Clientes (geral)** | **7,5** | Cadastro em 4 campos, Próximos passos e links `?passo=` funcionam; regras de valor só para admin respeitadas na tela. Perde por: contato principal salvo sem checar erro, cliente novo gera fatura dia 30 antes do passo Cobrança, excluir cliente apaga histórico financeiro, valor de dívida vazando pela API. |
| Lista e Resumo | 8 | Rápida, filtros claros. Um erro de dado no Resumo derruba a tela inteira (sem proteção de erro). |
| Novo cliente (4 campos, PF) | 7 | Validação boa (testada no navegador). Segunda gravação (contato) ignora erro; avatar de PF com símbolo vira "J(". |
| Ficha: Visão geral | 8 | "O que fazer agora" bom. |
| Ficha: Entregas e equipe | 8 | Só leitura de código + captura. |
| Ficha: Financeiro/Contrato | 6,5 | Mostra faturas e totais, mas não deixa agir (copiar link, dar baixa, mudar data): obriga ir ao Financeiro e buscar. |
| Ficha: Arquivos/Acessos/Sobre o negócio | 7,5 | Só leitura de código. |
| Próximos passos | 8 | Passos corretos, abre pop-up; dica "dia 10, 20 ou 30" não bate com o campo (1 a 31). |
| **Financeiro (geral)** | **5,5** | A base é boa (trava PF010, baixa do grupo, conciliação, fechamento que nunca desconta sozinho), mas há 6 caminhos testados em que **o dinheiro fica errado** (dobrado, sumido ou cobrado de novo). Precisa corrigir antes de usar com cliente real. |
| Caixa | 5 | Extrato duplica conta fixa e lançamento manual; pagamento atrasado >3 dias vira receita solta; desfazer no Caixa desfaz meia cobrança junta. |
| Cobrança | 5,5 | Pagamento parcial vira "pago"; desfazer pagamento deixa a fatura "travada" para conciliação; mudar dia de cobrança pode jogar fatura no passado; juntar automático muda vencimento e mistura empresas. |
| Fechamento do mês / créditos | 6,5 | Lógica boa e segura (sugere, admin aprova). Desconto maior que a fatura trava a aprovação e a rotina inteira. |
| Contratos | 7,5 | Painel e aceite protegidos (aceite exige CPF/CNPJ igual + token). Lembrete de assinatura pode ser disparado por qualquer um sem login. |
| Avulso de membro (25%) | 7 | Cálculo certo (1000 → membro 750, paga dia 30). Aceita membro ganhando mais que o cliente paga. |
| Automações do financeiro | 6 | Central diz "Lembretes desligado", mas a rotina roda (alerta D+3, marca vencido D+7). "Mensalidade" promete atualizar valor e não atualiza. Falta "Aplicar descontos aprovados" na central. |

## Erros encontrados (do mais grave para o menos grave)

Legenda: **[T]** = testado de verdade no banco/navegador; **[C]** = visto lendo o código.

### A. Dinheiro errado

1. **Desfazer pagamento deixa a fatura "marcada" e o próximo pagamento vira receita solta (pode contar em dobro)** [T]
   - Onde: `invoice_undo_paid` (também `invoice_set_status` → pendente e `fin_entry_sync_invoice` quando sai de pago).
   - Reproduzir: fatura quitada pelo extrato → "Desfazer pagamento" → importar outra linha de pagamento do mesmo valor.
   - Efeito: `paid_ref` continua preenchido; `fin_match_open_invoice` não acha mais a fatura; o pagamento entra como "entrada sem categoria" e a fatura segue em aberto (régua e Asaas continuam cobrando). Se alguém der baixa à mão depois, a receita conta duas vezes.
   - Correção: em `invoice_undo_paid`, zerar `paid_ref` (e tirar o `[extrato …]` das notas do lançamento); mesma coisa nos outros caminhos que tiram do "pago".

2. **Desfazer no Caixa um lançamento de cobrança junta desfaz só metade** [T]
   - Onde: `fin_entry_sync_invoice` (só aplica o grupo quando o status novo é "pago").
   - Reproduzir: cobrança junta Peformake R$ 1.000 + Ellcazo R$ 500; no Caixa marcar pago (os dois ficam pagos, certo) e depois voltar para "pendente".
   - Efeito: Peformake volta a pendente, **Ellcazo continua paga**. Saldo da Ellcazo errado.
   - Correção: usar `invoice_group_ids` também ao voltar para pendente (ou bloquear com mensagem "desfaça pela Cobrança", como o PF008 faz para cancelar).

3. **Pagamento parcial vira "pago" e o resto some** [T]
   - Onde: `invoice_set_paid` (fatura sozinha: marca pago com R$ 400 de R$ 777,77; em grupo ignora o valor e grava o total), `invoice_paid_by_gateway` (valor menor também quita). A tela não tem "recebi outro valor".
   - Efeito: R$ 377,77 desaparecem; nenhum saldo fica cobrando. O avulso do membro é liberado inteiro (R$ 750 com o cliente pagando R$ 10).
   - Correção: se o valor pago for menor que o devido, manter a fatura aberta com o saldo (ou criar fatura do saldo) e mostrar "Parcial: falta R$ X"; liberar avulso de membro só com quitação total.

4. **Extrato duplica conta fixa e lançamento manual** [T]
   - Onde: `fin_import` (só confere duplicidade de **entradas** vindas de `contrato`/`asaas`).
   - Reproduzir: conta fixa "Aluguel R$ 1.200 dia 5" + extrato com "PAGAMENTO ALUGUEL -1.200 em 05/12" → **2 saídas, R$ 2.400**. Entrada manual de R$ 250,50 + mesma linha no extrato → 2 entradas.
   - Correção: antes de inserir, procurar lançamento do mesmo valor (±3 dias) de qualquer origem (`manual`, `rec:`, `whatsapp`) ainda não conferido; se pendente, dar baixa nele; se pago, só marcar "conferido no banco".

5. **Pagamento fora da janela de ±3 dias, ou ambíguo, vira receita solta e a fatura continua cobrando** [T]
   - Onde: `fin_match_open_invoice` (janela fixa de 3 dias do vencimento; com 2 faturas iguais não escolhe nenhuma) + `fin_import`.
   - Reproduzir: fatura vence 01/12, cliente paga 06/12 → "1 lançamento novo, sem categoria", fatura pendente. Duas faturas de R$ 777,77 no mesmo dia + dois Pix iguais → 2 entradas soltas, as 2 faturas abertas.
   - Efeito: cliente que já pagou recebe lembrete/fica "devendo"; se baixarem à mão, receita dobra.
   - Correção: aceitar pagamento até ~30 dias depois do vencimento (e 3 antes); quando ficar em dúvida, gravar como "A conferir: parece a fatura X de Fulano" (`review_status='a_revisar'`) com botão "É essa" no Caixa, e não como receita normal.

6. **Mudar o dia de cobrança pode jogar a fatura do mês para o passado** [T]
   - Onde: gatilho `client_contract_billing_day_sync`.
   - Reproduzir: hoje 10/11, fatura vence 30/11; mudar o dia para 5 → a fatura passa a vencer **05/11** (já vencida), sem nenhum lembrete; no D+7 a régua marca "vencido" e avisa "cobrança parou: falar com o cliente".
   - Correção: se a nova data cair antes de hoje, manter a data deste mês (vale a partir do próximo) ou jogar para o mês seguinte; mostrar isso no pop-up.

7. **Juntar automático muda o vencimento sem avisar e mistura Peformake com Ellcazo** [T]
   - Onde: `invoice_group_auto`/`invoice_group_build` (roda ao criar qualquer fatura e de hora em hora); `billing_gateway_queue` manda o grupo como `unit = 'peformake'`.
   - Reproduzir: avulso Ellcazo vencendo 01/12 + avulso Peformake vencendo 10/12 do mesmo cliente → os dois passam a vencer 10/12, numa cobrança só.
   - Efeito: dinheiro da Ellcazo entra na conta da Peformake (repasse automático `sweep_enabled` está **desligado**), contra a regra "faturamento separado"; datas combinadas com o cliente mudam sozinhas.
   - Correção: decidir com o Italo: (a) juntar só faturas da mesma empresa, ou (b) manter junto mas exigir o repasse ligado e mostrar "Ellcazo: R$ X a repassar". Nunca mudar vencimento sem mostrar na tela.

8. **Desconto de entrega maior que a fatura trava a aprovação e a rotina** [T]
   - Onde: `delivery_credit_apply` (`amount - desconto` pode dar 0 e viola `invoices_amount_check`); `delivery_credits_apply_pending` não protege cada item.
   - Reproduzir: crédito sugerido R$ 900, fatura R$ 777,77 → "Descontar" dá erro 23514.
   - Efeito: admin não consegue aprovar; a rotina das 09:20 para no primeiro erro e nenhum outro desconto aprovado entra.
   - Correção: limitar o desconto ao valor da fatura e levar a sobra para a próxima; envolver cada item da rotina em `begin … exception`.

9. **Fatura cancelada e depois paga pelo Asaas continua marcada para cancelar no Asaas** [T]
   - Onde: `invoice_paid_by_gateway` não limpa `gateway_close='cancel'`.
   - Efeito: a rotina de baixa (`billing_gateway_close_queue`) tenta cancelar uma cobrança já recebida, dá erro e repete a cada 6 h.
   - Correção: ao marcar pago pelo gateway, `gateway_close = null` (e registrar evento "pago depois de cancelado" para o admin ver).

10. **Cliente novo recebe mensalidade antes do passo "Cobrança"** [T]
    - Onde: `invoice_generate_month` (dia de cobrança vazio vira 30; não olha data de início; mês cheio, sem proporcional). A rotina roda todo dia para o mês atual.
    - Reproduzir: Novo cliente (sem dia de cobrança) + serviço de R$ 2.000 → fatura de R$ 2.000 vencendo 30/11 no mesmo dia. Com "Cobrança automática" ligada, o link sai 5 dias antes.
    - Correção: pular cliente sem `billing_day` ou sem `start_date`; começar no mês da data de início (com proporcional ou a partir do mês seguinte, a decidir).

11. **Mudou o preço depois de gerar a mensalidade: a fatura do mês não muda** [T]
    - Onde: `invoice_generate_month` (pula serviço que já tem item no mês). O texto da central de Automações diz o contrário ("atualiza o valor").
    - Correção: se a fatura ainda não tem link, recalcular itens e valor; ou corrigir o texto em `automation_catalog` (`fin_mensalidade`) e avisar na tela de preço.

12. **Caixa deixa mudar a data de um lançamento que veio de fatura** [T]
    - Onde: `fin_entry_save` (a trava PF010 cobre valor, empresa e tipo, não a data).
    - Efeito: Caixa diz vence 01/01, Cobrança diz 10/03.
    - Correção: incluir `due_date` na trava (ou repassar para `invoice_set_due`).

13. **Avulso de membro aceita pagar ao membro mais do que o cliente paga** [T] — `service_job_save` aceitou membro R$ 900 com cliente R$ 100. Correção: bloquear (ou pedir confirmação do admin) quando `staff_amount > client_amount`.

14. **Membro já pago e o cliente desfaz o pagamento: ninguém é avisado** [T] — `service_job_on_invoice` só cancela se o repasse ainda está pendente. Correção: avisar o admin.

### B. Dado perdido

15. **Excluir cliente apaga faturas pagas, itens e contrato** [C] — `invoices.client_id … ON DELETE CASCADE`; `client_delete` só pede o nome. O Caixa fica com lançamentos sem cliente e a Cobrança perde o histórico. Correção: bloquear exclusão de cliente com fatura (oferecer "Perdido/Pausado").
16. **Novo cliente: o contato principal pode não ser salvo e ninguém fica sabendo** [C] — `NewClientDialog.tsx`: `await rpc('client_contact_save', …)` sem olhar o `error`; são duas gravações separadas. Se a 2ª falhar, o cliente fica sem contato (sem lembrete, sem contrato por WhatsApp). Correção: checar o erro e, melhor, uma função só no banco (`client_create`) que grava os dois juntos.
17. **Marcar cliente como perdido não cancela faturas futuras já geradas** [C] — `client_set_status`. Com cobrança automática, o Asaas cobra quem saiu. Correção: perguntar "cancelar as faturas em aberto a partir de hoje?" no pop-up de perda.

### C. Permissão

18. **Funções do Lançamento pelo WhatsApp liberadas para quem não tem login** [T no catálogo de permissões] — `fin_wa_command`, `fin_wa_undo`, `fin_wa_reply`, `fin_wa_process` (e `fin_wa_link_pending`, sem trava) podem ser chamadas pela chave pública; a checagem `auth.uid() is not null and not admin` deixa passar quem está sem login. Precisa do id do item (difícil de adivinhar), mas é furo. Correção (para o agente do WhatsApp): `revoke execute … from anon, authenticated` nas funções de rotina e trocar a checagem por "admin ou chamada interna".
19. **Lembrete de assinatura pode ser disparado por qualquer pessoa sem login** [C] — `contract_reminders_run` sem trava e liberada para `anon`. Hoje o WhatsApp ao cliente está desligado nas regras, mas os alertas internos disparam. Correção: revogar `anon`/`authenticated`.
20. **Qualquer usuário logado pode gerar as contas fixas de qualquer mês** [T] — `fin_recurring_generate` passou com usuário sem papel. Correção: trava de financeiro ou revogar.
21. **Valor da dívida do cliente vaza pela API para quem não é admin** [C] — `client_intel` devolve `devendo_valor` para gestor de marketing, tráfego e social media (a tela esconde, a API mostra). Correção: devolver só a contagem para não-admin.
22. **Gestor de marketing (não admin) muda dia de cobrança e datas do contrato** [C] — `client_save` só exige `can_manage_clients`; o gatilho move as faturas. Decidir: só admin mexe em cobrança.
23. **Chave "Lembretes" da central não desliga a rotina** [T] — `billing_settings.reminders_enabled = false`, mas o cron `billing-reminders` chama `billing_reminders_run()` sem olhar a chave (alerta D+3 e "vencido" D+7 continuam). Correção: `… where (select reminders_enabled …)` no comando do cron, ou separar "lembrete ao cliente" de "marcar vencido".
- Bom: usuário sem papel não vê faturas, caixa, preços nem clientes; `fin_entry_save`, `invoice_set_paid`, `invoice_generate_month`, `month_close_run`, `fin_import`, `contracts_overview`, `client_billing_save` barram (testado). `invoice_paid_by_gateway`, `invoice_paid_matched`, `service_job_release` não são chamáveis de fora.

### D. Interface e uso

24. **Sem proteção de erro na tela** [T] — não existe `ErrorBoundary` no app: um dado fora do formato deixa a tela branca (aconteceu com o Resumo de Clientes e o Caixa nos testes). Correção: um `ErrorBoundary` por página com "Tentar de novo".
25. **Celular: Caixa e Cobrança sem ação na primeira tela e listas enormes** [T] — no iPhone a primeira tela é só título, seletor de empresa, mês e cartões; com 180 faturas a página passa de 16.000 px, sem paginação nem agrupamento. Correção: botão fixo "Lançar"/"Nova cobrança", lista por cliente (cobrança junta numa linha) e "ver mais".
26. **Ficha → Financeiro não deixa agir** [T] — mostra faturas mas sem "Copiar link", "Recebi", "Mudar data". Hoje: ficha → Financeiro → Cobrança → buscar → menu (5+ toques). Correção: mesmo menu "…" da Cobrança em cada fatura da ficha.
27. **Botão "voltar ao topo" cobre o cartão "Vencido" no celular** [T].
28. **Avatar de pessoa física com símbolo** [T] — "João … (PF)" vira "J(". Iniciais devem pular o que não é letra/número (`ClientAvatar`).
29. **Dica do passo Cobrança diz "10, 20 ou 30"**, campo aceita 1 a 31 [C] (31 em fevereiro vira 28: testado e certo).
30. **Avisos de pagamento/atraso abrem a Cobrança genérica** [C] — `notify(… '/financeiro/cobranca')` em `invoice_paid_by_gateway`, `invoice_paid_matched`, `billing_reminders_run`. Regra da casa: link abre o ponto exato. Correção: `/financeiro/cobranca?fatura=<id>` (e a tela abrir o item).
31. **Motivo de perda duplicado**: "Fim de contrato" e "Fim do contrato" aparecem separados no Resumo [T].
32. `client_intel` usa `current_date` (horário UTC): depois das 21h conta atraso um dia antes [C].
33. **28 dos 31 clientes ativos estão sem CPF/CNPJ válido** [T] — o Asaas não gera link para eles. Maior bloqueio prático do lançamento (o link "pede CPF" ajuda, mas o cadastro precisa ser completado).

## Gargalos

Desempenho (medido em rollback, banco atual):
- `invoice_generate_month`: 31 faturas em 255 ms; com 81 clientes, 77 faturas em 189 ms. Bom.
- `invoice_group_auto` < 1 ms sem pendências; `billing_reminders_run` 2 ms; `fin_import` de 1 a 2 linhas: instantâneo.
- Telas com 180 faturas/lançamentos falsos: abrem em ~3 s no harness (inclui espera fixa de 1,5 s); no iPhone a Cobrança renderiza 314 botões e 2.886 palavras de uma vez.
- Índices que vão faltar com volume (hoje são 34 faturas e 36 lançamentos, não pesa):
  - `fin_entries(external_id)`: `fin_import` atualiza `where external_id = 'inv:…'` sem empresa/origem, o índice existente não serve.
  - `invoices(gateway, gateway_id)` completo: o atual só cobre fatura fora de grupo; a baixa de cobrança junta varre a tabela.
  - `fin_entries(unit, kind, amount, paid_at)` para a conferência de duplicidade do extrato.
  - `invoices(fin_entry_id)`, `service_jobs(invoice_id)`, `delivery_credits(invoice_id)` (chaves sem índice).
- `listClients` lê 8 tabelas inteiras a cada abertura da lista (todas as avaliações, equipe, serviços). Ok até algumas centenas de clientes.

Uso (cliques e informação):
- Dar baixa/copiar link a partir da ficha do cliente: 5+ toques (meta da casa: 3).
- Pagamento que não casou com fatura: hoje vira "sem categoria" e some no meio do Caixa; deveria aparecer no topo como "Isto é da fatura de Fulano?" (1 toque).
- Cobrança no celular: título + filtros ocupam a tela toda; a ação principal fica escondida.

## O que falta para cada módulo ficar "100% concluído"

Clientes:
1. Gravação do cliente novo numa função só (cliente + contato), com erro mostrado.
2. Não gerar fatura antes do passo Cobrança; Próximos passos pendentes aparecerem no Início e na Bete (já anotado no diário como pendente).
3. Exclusão segura (sem apagar financeiro); perda com opção de cancelar faturas futuras.
4. Aba Financeiro da ficha com as mesmas ações da Cobrança.
5. `client_intel` sem valores para não-admin; regra de quem mexe no dia de cobrança.
6. Completar CPF/CNPJ dos 28 clientes ativos (tarefa de dados, não de código).

Financeiro:
1. Corrigir os erros 1 a 12 (são os que deixam dinheiro errado). Prioridade: 1, 2, 4, 5, 6, 3.
2. Pagamento parcial (saldo em aberto) e "recebi outro valor" na tela.
3. Conciliação com "A conferir" (sugestão de fatura) em vez de receita solta.
4. Decisão do Italo sobre cobrança junta Peformake + Ellcazo (separar ou repasse ligado).
5. Central de Automações fiel ao que roda (lembretes, mensalidade, "Aplicar descontos aprovados" que hoje não aparece).
6. Travas de permissão das rotinas (erros 18 a 20) e `ErrorBoundary`.
7. Fases A–D do Resumo (estudo já feito) e histórico de extratos jan–out.

## Autoteste semanal (desenho, sem IA e sem deixar dados)

### Parte 1: cenários no próprio banco (custo zero)

- Tabela `selftest_runs (id, ran_at, scenario, ok boolean, detail text, ms int)`; leitura só admin.
- Função `selftest_run()` (security definer, sem `anon`/`authenticated`) que, para cada cenário, faz:
  ```sql
  begin
    perform selftest_<cenario>();        -- cria clientes "SELFTEST", executa e confere
    raise exception 'selftest_rollback'; -- desfaz tudo o que o cenário gravou
  exception when others then
    if sqlerrm = 'selftest_rollback' then ok := true
    elsif sqlerrm like 'FALHOU:%' then ok := false   -- o cenário avisa o que deu errado
    else ok := false; end if;
  end;
  insert into selftest_runs ...;          -- só o resultado fica gravado
  ```
  O bloco `begin … exception` do PL/pgSQL é uma subtransação: tudo que o cenário fez volta atrás, só a linha de resultado fica.
- Antes de rodar, desligar efeitos externos dentro da subtransação: `set_config('pf.selftest','1', true)` e fazer `notify`, `notify_client_private` e as filas do gateway/WhatsApp ignorarem quando essa chave estiver ligada (mesmo que tudo volte atrás, isso evita qualquer risco com `pg_net`).
- pg_cron: `selftest-weekly`, domingo 05:10 (fora do horário de uso); registrar em `automation_catalog` (módulo Configurações, `uses_ai=false`, risco baixo) e mostrar na central de Automações: "Última rodada: 18 de 19 passaram · ver falhas". Falhou algo: um aviso normal para o admin (sem alarde, não é urgente).
- Cenários (os da seção C, cada um com o resultado esperado):
  1. Geração mensal: dia 31 em fevereiro vence dia 28; rodar duas vezes não duplica; Peformake e Ellcazo em faturas separadas; centavos e desconto % corretos.
  2. Cliente sem dia de cobrança não recebe fatura (erro 10).
  3. Mudar dia de cobrança não joga fatura para o passado (erro 6).
  4. Baixa pelo Caixa de cobrança junta quita todas; desfazer desfaz todas (erro 2).
  5. Extrato: soma do grupo quita a cobrança junta; importar o mesmo extrato duas vezes não duplica.
  6. Desfazer pagamento e importar de novo: a fatura volta a ser conciliada (erro 1).
  7. Dois pagamentos iguais no mesmo dia para duas faturas iguais: nada vira receita normal sem conferência (erro 5).
  8. Pagamento 5 dias atrasado casa com a fatura (erro 5).
  9. Data trocada no extrato (dd/mm × mm/dd): não quita fatura errada.
  10. Conta fixa + extrato da mesma conta: uma saída só (erro 4); lançamento manual + extrato: uma entrada só.
  11. Pagamento parcial deixa saldo em aberto (erro 3).
  12. Cancelada e depois paga pelo gateway: fica paga e sem pedido de cancelamento (erro 9).
  13. `invoice_paid_by_gateway` com data: grava 12:00 de Brasília.
  14. Trava PF010: mudar valor/data no Caixa de lançamento de fatura é barrado (erro 12).
  15. Crédito de entrega maior que a fatura não quebra (erro 8); rotina de descontos segue para o próximo.
  16. Avulso de membro: 25% certo; liberado só quando o cliente paga; membro não ganha mais que o cliente.
  17. Permissões: com `sub` aleatório e `set local role authenticated`, nenhuma fatura/preço visível e `fin_entry_save`, `invoice_set_paid`, `invoice_generate_month`, `month_close_run`, `fin_recurring_generate`, `fin_wa_*` barram; `has_function_privilege('anon', …)` falso para todas as funções que gravam.
  18. Desempenho: gerar 50 clientes falsos e o mês em menos de 2 s (grava o tempo para ver tendência).
  19. Conferência de dados reais (só leitura): toda fatura tem lançamento no Caixa com o mesmo status; soma dos itens = valor da fatura; nenhuma fatura "pendente" com vencimento passado há mais de 7 dias; nenhum `paid_ref` em fatura não paga.

### Parte 2: interface no GitHub Actions (custo zero dentro do limite grátis)

- Workflow `.github/workflows/autoteste.yml`, `schedule: cron '30 8 * * 0'` (domingo) + botão manual.
- Passos: `npm ci` → `npx tsc -b --noEmit` → `npx vitest run` → subir o app de teste (`.harness/shell`, login falso de admin) → Playwright com o interceptador de dados falsos (`ui2.cjs` vira `e2e/finance.spec.ts`): desktop 1366×800 e iPhone 13.
- Verificações: cada tela de Clientes e Financeiro abre sem erro e sem rolagem lateral; "Novo cliente" valida os 4 campos; Próximos passos abre o passo certo por `?passo=`; botões principais visíveis na primeira tela do celular; links da Bete (`?aba=`, `?passo=`, `?acao=`) abrem o ponto certo; captura guardada como artefato.
- Nada toca o banco de verdade (dados falsos no navegador), então não precisa de segredo.
- Custo: repositório privado tem 2.000 min/mês grátis; esta rotina usa ~6 min por semana (~25 min/mês). Precisa só: Actions habilitado no repositório e o cache do navegador do Playwright (`npx playwright install --with-deps chromium`).
- Resultado: o próprio Actions manda e-mail ao dono do repositório quando falha. Opcional (precisa de segredo): gravar o resultado na `selftest_runs` via função com chave própria; o Italo colaria o segredo no GitHub (Settings → Secrets), nunca no chat.
