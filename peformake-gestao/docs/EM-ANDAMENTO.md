# Em andamento (passagem de bastão entre PC e nuvem)

Este arquivo aparece sozinho ao abrir qualquer sessão. Quem parar no meio de uma tarefa escreve aqui
o próximo passo exato, faz commit e push. Quem terminar a tarefa apaga o item.

## Pendências técnicas (dossiê, campos do roteiro, telas, domínio)
- Onde parou: só levantamento, nada alterado no código nem no banco (nuvem, 19/11).
- Próximo passo: seguir `peformake-gestao/docs/PROMPT-PENDENCIAS-TECNICAS.md` do item 1 ao 4.
- Domínio: em 19/11 o peformake.com ainda apontava para a Lovable. Não trocar links antes de conferir.

## Pendente pequeno (20/11)
- `strategy-cards` (API) NÃO publicar: regra de 20/11, gerar só pelo agente do Claude.
- Testar o briefing em conversa no Claude (botão Conversar) com um cliente real e ajustar `agent_instructions(briefing-conversa)`.

## Pedidos do Italo em 20/11 ainda NÃO começados
1. **Lista da Consultoria funcional e compacta** (`ConsultoriaPage.tsx`, lista de clientes): hoje só serve para abrir; o botão "Revisar" não funciona. Mostrar o passo da vez de cada cliente (bolinhas do passo a passo) e a ação certa em 1 toque (Preencher briefing, Enviar perguntas, Criar diagnóstico, Abrir estratégia).
2. **Portal do cliente com Briefing e Perguntas para ele responder** (`features/portal/`). Todo mês entram perguntas novas no portal e o cliente é avisado no WhatsApp. ATENÇÃO à regra: WhatsApp para cliente nasce DESLIGADO e precisa de aprovação do Italo para virar automático (Configurações → Automações).
3. **Motor das perguntas sob medida:** ler o CNPJ no cadastro (natureza jurídica + CNAE da Receita → tipo de negócio automático); o agente do Claude (sem API) gera as perguntas do mês por cliente; a conversa do cliente roda no sistema sem IA; o diagnóstico cria perguntas novas quando falta algo. Aguardando o "pode fazer" do Italo.
4. **FEITO 20/11 (trilhas fixas por tipo; falta o agente escrever trilhas sob medida por cliente)** Perguntas em profundidade: cada tema vira uma sequência de sub-perguntas até o fundo (ex.: Automotivo → motos ou carros → novos ou usados → marcas → ticket → como vende...). Cada pergunta aceita áudio, texto ou documento; tudo fica salvo para ver e o sistema/agente SEMPRE lê antes de gerar qualquer coisa. Entra junto do item 3 (roteiro por cliente preparado pelo agente, conduzido pelo sistema sem IA).
