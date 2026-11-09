# Estudo (rascunho para aprimorar): WhatsApp central e diagnóstico automático (10/11/2026)

Pedido do Italo. Nada construído. Vai ser aprimorado junto com o estudo do hub de estratégia
(`ESTUDO-HUB-ESTRATEGIA-E-CICLO.md`) e depois virar um mapa/questionário do sistema.

## A. WhatsApp

**Hoje:** o WhatsApp já é área própria (Conversas, Pedidos dos clientes, Sugestões da IA, Satisfação). Outras partes
ligadas a ele estão espalhadas: contas em Configurações → WhatsApp, remetentes do Financeiro, "WhatsApp vira tarefa"
e caixa de mensagens no Tráfego, pedidos de arte do Design, avisos (fila notify-send).
Números: 36 tarefas de tráfego vieram do WhatsApp nos últimos 7 dias; pedidos roteados: audiovisual 5, design 2,
tráfego 2, comercial 1. A rotina "inbox" (caixa de mensagens do Tráfego) nunca rodou: falta ROUTINE_TOKEN_INBOX.

**Proposta inicial:**
- WhatsApp = a porta de entrada: toda mensagem (cliente, grupo, lead) chega lá; cada pedido mostra para qual área
  foi e em que pé está. Configuração das contas continua em Configurações.
- A execução fica na área (tarefa de tráfego no Tráfego, arte no Design...), com link de volta para a conversa. Nada de tela duplicada.
- Fluxo do exemplo (Matheus, grupo da F5, "sobe esse criativo numa campanha"): mensagem → agente entende → tarefa no
  Tráfego com a ação pronta (campanha montada com a mídia do WhatsApp) → se o cliente/ação estiver marcado como
  "executar sozinho", a campanha é criada **pausada** na Meta → aviso ao Italo "pronto, é só ativar" com botão
  Ativar → resposta ao cliente sugerida (enviada só com confirmação). Nunca liga gasto sozinho.
- O que falta para isso funcionar: escrita na Meta liberada por conta (hoje só leitura e a API do servidor estava
  bloqueada desde 05/11); token da rotina inbox; leitura e execução (crons traffic-read-hourly e traffic-execute
  estão desligados); corrigir o filtro que transforma aprovação de post e envio de vídeo em tarefa de tráfego (auditoria de 07/11).

## B. Diagnóstico e estratégia automáticos (frameworks)

**Hoje:** 47 frameworks no menu Estratégia, nenhum preenchido; parecem formulários para preencher à mão. Já existem
peças de agente: framework_request, framework_agent_fill, agent_context_client, agent_client_snapshot,
niche_agent_study (1 pedido feito até hoje).

**Proposta inicial:** os frameworks viram a "receita" do agente, não formulários. Três rodadas:
1. **Diagnóstico de entrada** (ao ativar o cliente novo): SWOT, Pesquisa de nicho, Análise de concorrentes e anúncios,
   5 Forças, Persona, ICP, Jornada, Canvas de proposta de valor, Equação de valor, STP, Arquétipo e tom de voz,
   Análise de métricas. Saída: 1 página de decisões, estratégias por área, primeiro passo e próximos 30 dias, riscos,
   o que falta do cliente.
2. **Revisão do mês** (dia 15): Foco do mês, Onde está e para onde quer ir, Sazonalidade, Análise de métricas,
   Unit economics, Funil, Estratégia de tráfego, Planejamento de social/design/audiovisual, 5W2H.
3. **Plano trimestral**: OKR do trimestre, Métrica norte, Ansoff, BCG, Oceano azul, Flywheel, revisão de SWOT,
   nicho e concorrência.
- O agente cruza: cadastro, serviços e contrato, conversas do WhatsApp, resultados do tráfego, entregas, notas do
  cliente, Instagram e site públicos, Biblioteca de Anúncios (concorrentes), Google e Reclame Aqui.
- O mínimo que a equipe preenche: os 4 campos do cliente novo, Instagram/site e o objetivo. O resto o agente procura;
  o que não achar vira uma lista curta de "falta do cliente" (pode ir ao portal).
- Os frameworks preenchidos ficam como anexo/fonte do documento, consultáveis, não como tela de preenchimento.
- Vira uma skill (prompt) escrita junto com o Italo antes de construir.
