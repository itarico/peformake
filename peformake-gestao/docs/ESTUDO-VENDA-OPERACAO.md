# Estudo: venda não cria a operação da área (PENDENTE)

Estudo de 12/11/2026, parado a pedido do Italo. **Nada foi aplicado no banco nem publicado.**

## Caso real: Grelina (fe50610e-a2e3-4a85-b780-538ce7a06f36)

- Venda `e14370d9…` (avulsa, Ellcazo, confirmada em 11/11, item "Produção Audiovisual" R$ 700) → `sale_apply` criou só a fatura `fe9efc55…` (venc. 20/11, pendente).
- Às 22:06 do mesmo dia alguém cadastrou à mão em Clientes o serviço "Captação com câmera" (`client_services 7b034aa9…`, quantidade 1, sem `deliver_qty`).
- Não existe nenhum `av_projects` dela. A gravação já foi feita (informação do Italo; não há dado no banco que mostre isso).
- Existe também uma venda do agente (`57ae78a5…`, "700 combinado na conversa") recusada: era a mesma venda, não conta.

## Causa confirmada

Lidas no banco: `sale_create`, `sale_save`, `sale_complete`, `sale_apply`, `sale_line`, `sale_service_launch`, `service_job_save`.

- `sale_create` / `sale_complete` gravam `crm_sales`; o lançamento real é `sale_apply` (chamado pelo gatilho de status ou por `sale_complete`).
- `sale_apply` **avulso**: cria `invoices` + `invoice_items` (ref `sale:<id>`) e nada mais — nem `client_services`, nem operação.
- `sale_apply` **recorrente**: cria `client_services` + `client_service_prices` + contrato; também não cria operação.
- `sale_service_launch` (lançar serviço avulso direto no cliente): só fatura.
- `service_job_save`: só fatura + pagamento do freelancer (`service_jobs`).
- A única coisa que criava projeto de audiovisual era `av_ensure_month`, desligada pela migração `20261115100000_av_sem_projeto_vazio.sql` (retorna 0) para o quadro só mostrar projetos agendados.
- `client_in_area` só olha `client_services` ativos. Por isso, venda **avulsa** nem coloca o cliente na área (não cria `client_services`); a Grelina só entrou porque o serviço foi cadastrado à mão.

## O que falta fazer (por área)

1. **Audiovisual**: em `sale_apply` (avulso e recorrente) e `sale_service_launch`, para item com `services.area = 'audiovisual'`, criar `av_projects` do cliente com status inicial "a agendar" (`script` sem `shoot_at`, que cai em "N sem data" com Agendar no `AvBoard.tsx`), responsável pelo `client_team`/videomaker e `notify` com link que abre o projeto. Chave de idempotência: `sale:<venda>:<service_id>:<n>` (avulso: quantidade do item; recorrente: um por ciclo seguindo `deliver_qty`, criado só no ciclo, nunca em massa). Cancelar a venda/fatura cancela o projeto ainda não iniciado.
   - Conferir antes: colunas de `av_projects` (há coluna de origem/chave? se não, criar `source_ref text unique`), `av_project_save`, `av_schedule`, `av_auto_assign`, gatilhos `av_stage_*`.
2. **Venda avulsa e `client_in_area`**: decidir se avulso cria `client_services` (com `billing_month` só do mês) ou se `client_in_area` passa a considerar operação aberta (`av_projects` não concluído) — sem isso o cliente avulso não aparece nas áreas.
3. **Social/Design**: conferir se o pacote gera briefings/`content_items` ao entrar na área; ligar a venda a isso (não inventar fluxo).
4. **Tráfego**: cliente entra em Tráfego; criar tarefa "Configurar conta/campanhas" se não houver conta ligada.
5. **Consultoria**: entra em Estratégia/Consultoria pelo `client_in_area` (outro agente está mexendo em consultoria; alinhar antes).
6. Bete/Início: "Agendar gravação de <cliente>" apontando para o projeto.

## Clientes ativos com serviço de audiovisual e sem nenhum av_projects (12/11)

3LM, APM, Auto Nunes (Plano Mobile Semanal), Brio Burguer, Cajá Limão, Chef Leandro, CIA COFFE, Disalp, Dr. Luís Henrique, Dra. Andrea Diniz, Fornario, **Grelina** (Captação com câmera), GUARARAPES CORRETORA, Jogada Criativa, Natalia de Menudo, Ótica CM Prime, ÓTICA MD PRIME, Partem, Raph Modas, Restaurante do Vando, Sn Distribuidora, Sol e Sorvete, VOVINA, Will motos (Visita mobile).

Os demais são "Produção Audiovisual" antigos (sem data de cadastro, vindos da importação). Antes de corrigir o passado, confirmar com o Italo quais estão de fato em produção — criar projeto para todos encheria o "sem data" de pendências falsas. Social/design, tráfego e consultoria não foram levantados.

## Migração

Nenhum rascunho escrito.
