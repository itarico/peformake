# Arquitetura única de tarefas (proposta, 24/11/2026)

Pedido do Italo: comercial, WhatsApp, tráfego, social media, design e audiovisual simples, práticos e iguais entre si,
sem encher de tarefas, e tudo sincronizado com estratégia, cliente e financeiro. **Aguardando o "pode fazer" dele.**

## O problema hoje
- Cada área guarda tarefa num lugar e com um texto diferente: `social_tasks` (social), tarefas do tráfego (`TasksPage`),
  pedidos do WhatsApp (`client_requests_feed`), audiovisual (projetos) e o design sem tarefa nenhuma (só a fila de artes).
- Tarefa e produção se misturavam. Em 24/11 o Social Media já foi separado: **Artes** (produção) e **Tarefas** (quadro próprio).

## A regra: tarefa é uma coisa, produção é outra
| | Tarefa | Produção |
|---|---|---|
| O que é | Um pedido ou lembrete que precisa de uma decisão | O trabalho em si, com etapas e entrega |
| Exemplos | "Cliente pediu story", "data sazonal em 10 dias", "anúncio caro" | Arte, vídeo, campanha |
| Onde fica | Aba **Tarefas** de cada área | Artes, Design, Produção do audiovisual, Campanhas |
| Como termina | Concluir, descartar ou **virar produção** com 1 toque | Entregue e aprovada |

## Um cartão igual em todas as áreas
1. **Origem** (3 só): `Cliente pediu` · `Sistema sugeriu` · `Minha`.
2. **O que fazer**, sempre começando com verbo, até 80 letras (o sistema reescreve o pedido do cliente nesse formato).
3. **Cliente** e **prazo**.
4. **Solução pronta**: o sistema já deixa preenchido o que vai acontecer; a pessoa só aprova.
5. Botões, sempre os mesmos: **Aprovar** (faz a ação) · **Não serve** (some) · abrir para ajustar.

Colunas iguais em todas as áreas: **A fazer · Fazendo · Feito** (feito some em 7 dias).

## O que "aprovar" faz em cada área
| Área | Tarefa chega de | Aprovar faz |
|---|---|---|
| Social media | pedido do cliente (WhatsApp/portal), estratégia aprovada, data sazonal | abre "Nova arte" já preenchido e manda ao design |
| Design | pedido do cliente, sistema, a própria pessoa | vira arte na fila dela |
| Tráfego | alerta do sistema (anúncio caro, sem saldo), pedido do cliente | executa o ajuste na Meta (já existe: `traffic-execute`) |
| Audiovisual | pedido do cliente, estratégia do mês | cria o projeto de vídeo com o roteiro-base |
| Comercial | conversa parada, lead novo | abre a conversa com a resposta sugerida |

## Para não encher de tarefas
- Sistema só cria tarefa quando existe uma **ação pronta** para aprovar. Informação sem ação vira aviso, não tarefa.
- Uma tarefa por assunto por cliente: pedido repetido junta na que já existe.
- Sugestão do sistema que ninguém toca em 7 dias some sozinha (fica no histórico).
- Limite por área à vista: mais de 10 em "A fazer" acende um aviso para o gestor, não para a equipe.

## Como construir (em ordem)
1. **Banco**: uma tabela `tasks` (área, origem, cliente, título, prazo, etapa, ação pronta em JSON, de onde veio) e migrar
   `social_tasks` e as tarefas do tráfego para ela, com visão por papel (designer só vê as dele).
2. **Um componente** de quadro e de cartão, usado por todas as áreas (o de Social Media de 24/11 é o modelo: `TasksBoard`).
3. **Entradas**: pedido do cliente no WhatsApp e no portal, estratégia aprovada, datas sazonais (hoje em "Mais → Datas sazonais"),
   alertas do tráfego. Cada uma já grava a ação pronta.
4. **Área por área**: Design → Tráfego → Audiovisual → Comercial/WhatsApp.
5. **Sincronia**: cada tarefa e cada entrega ficam ligadas ao cliente; a ficha do cliente e o Início mostram o mesmo número.

## Decisões que são do Italo
1. Pode trocar as tabelas de tarefa atuais por uma só (migra os dados, nada se perde)?
2. Sugestão do sistema sem resposta em 7 dias some sozinha, ou fica até alguém decidir?
3. No tráfego, aprovar já executa na Meta (como hoje) para todo tipo de ajuste, ou orçamento continua pedindo um segundo "sim"?
4. Ordem das áreas: Design, Tráfego, Audiovisual, Comercial/WhatsApp serve?
