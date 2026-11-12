# Social media e design: como deve funcionar (pedido do Italo, 12/11/2026)

Foco agora: **artes/postagens (design)**. Responder comentários, stories etc. ficam para depois.

## 1. Pacote define a entrega
- No cadastro do cliente (serviços), o pacote de social media/design diz **quantas artes** entrega e **por semana ou por mês** (ex.: 5 artes por semana, ou 12 no mês).
- O sistema calcula sozinho quantas artes faltam para cada cliente no período.

## 2. Tela inicial da social media: resumo
- Gráfico de pizza: **clientes pendentes** (faltam briefings), **em produção** (com o design) e **aprovados** (tudo entregue/aprovado).
- Botão **Ver todos os clientes**: lista com cada cliente e a quantidade de artes a fazer (contratadas × já com briefing × prontas).
- Tocar num cliente abre a aba **Briefing** desse cliente.

## 3. Aba Briefing (por cliente)
- Já aparecem os **briefings pré-criados** das artes pendentes do pacote: é só abrir e preencher (ficha por etapas, pelo tipo).
- Botão **Arte extra** (briefing fora do pacote, marcado como extra).
- **Link do Drive do cliente** (pasta da Ellcazo) em destaque, para buscar fotos e referências.
- **Sugestões** (aprovar com 1 toque, editar antes se quiser):
  - **Datas sazonais** do dia em que se está planejando até o fim do mês seguinte (ex.: planejando em 5/10 → datas de 5/10 a 30/11), já com ideia de texto baseada na estratégia do cliente.
  - **Estratégias** (mensal/Consultoria e tráfego): criativos com copy e informações prontas.
  - Ao tocar, o briefing já abre preenchido no formato certo: carrossel com a copy de cada slide; post normal; **arte para tráfego** marcada "é para anúncio, não para postar". Falta só pôr as referências e escolher o designer (pela foto).
  - Aprovar a sugestão cria o briefing pronto para conferir e **Mandar para o design** (ou revisar antes).
- Item aprovado na própria página da estratégia de tráfego entra direto para o design (não precisa passar aqui de novo).

## 4. Design
- Aba Design (em construção): fila com cronômetro, **Baixar referências**; ao baixar/abrir, marca **Em produção** e começa a contar o tempo.
- **Configuração do prazo de entrega** das artes (ex.: 24 h, 48 h), em Configurações; esse prazo vira a **meta do designer** (entregou no prazo conta na meta dele).
- **Entregar arte** → vai direto ao portal do cliente **e** avisa no WhatsApp o **cliente** e a **social media**. Ajuste pedido pelo cliente volta para o designer.

## 5. Organização da área (proposta aceita como direção)
Trocar as 7 abas atuais por poucas: **Resumo/Hoje** (o que fazer agora e o gráfico), **Briefing** (por cliente, com sugestões), **Calendário/Mês**, **Design** (do designer) e **Contas**. Quadro completo com todas as colunas fica atrás de "Ver tudo" para o gestor. Números do gestor vão para o Início.

## 6. Kanban mais enxuto (pedido do Italo, 12/11)
Só 4 colunas, nesta ordem:
1. **Tarefas**: tarefas da social media (tabela social_tasks), que nascem de **pedido do cliente** (WhatsApp/portal) ou da **estratégia** (mensal, Consultoria, tráfego). Hoje ficam escondidas em "Redes sociais → Tarefas das redes"; passam a ser a primeira coluna.
2. **Briefings**: peças com briefing escrito, esperando ir para o design.
3. **Produção**: com o design (a fazer, fazendo e ajuste pedido juntos, com selo de qual).
4. **Aprovado**: com o cliente e aprovadas (selo "com o cliente" / "aprovada"); publicadas somem depois de alguns dias.
No celular, uma coluna por vez com abas no topo (sem rolar para o lado).

## 7. Piloto automático do design ("Pedidos de arte"), decisão de 12/11
Mesmo processo de sempre, só que a IA faz quando ninguém pega:
1. Pedido de arte (cliente no WhatsApp/portal, tarefa ou estratégia) → a IA preenche o briefing; se o cliente mandou foto no WhatsApp, a foto vai para o briefing; se não, busca no Drive do cliente.
2. **Piloto automático** (liga/desliga + tempo configurável, ex.: 5 ou 10 min): se nenhum designer tocar em "Começar" nesse tempo, o card avança sozinho para **Em produção** com o selo **"Feito por IA"**.
3. A IA escolhe o **melhor template pronto** (biblioteca de templates da Peformake, com cores, fontes e logo do cliente) e encaixa texto e foto. Sem template que sirva, monta por conta própria no mesmo padrão visual.
4. **Controle de qualidade antes de enviar:** a IA olha a arte pronta (texto cortado, contraste, foto ruim, erro de português, logo). Reprovou → volta para o designer com o motivo, não vai ao cliente.
5. Aprovada no controle → sobe a arte, avança para **Com o cliente** e dispara o WhatsApp para o cliente **com o link para ver e aprovar** (hoje o aviso sai sem link: corrigir), avisando também a social media (e o grupo, se for o caso).
6. Ajuste pedido pelo cliente volta para o designer humano.

## 8. Tudo que nasce das estratégias passa por "Aprovar" e cai na área certa (lembrete do Italo, 12/11)
- Toda tarefa gerada por **diagnóstico (Consultoria: plano de ação)**, **estratégia mensal**, **estratégia de tráfego** e futuras **estratégias por área** aparece com o botão **Aprovar / Recusar** (e editar antes).
- Aprovou:
  - O que é de **Instagram/redes** (postagem, stories, bio, destaques, responder, etc.) → vira **tarefa da social media** (coluna Tarefas do quadro de Conteúdo).
  - O que é **arte** → vira peça com briefing para o design; se nenhum designer começar no tempo configurado, o piloto automático inicia (seção 7).
  - Tráfego → tarefa de tráfego; audiovisual → projeto com roteiro.
- **Avisos à social media responsável pelo cliente** (client_team, papel social_media; se não houver, head): ao chegar tarefa de estratégia, pedido do cliente (WhatsApp/portal) ou novidade/notificação relacionada ao cliente. O aviso abre o item exato.
- Falta hoje: o **plano de ação do diagnóstico** não tem Aprovar (só as decisões internas viram tarefa); a estratégia mensal já tem. Unificar no mesmo componente de aprovação.

## 9. Card com imagem (pedido do Italo, 12/11)
- Todo card de peça (quadro, aba Briefing, aba Design) parece uma postagenzinha com a área da imagem no formato do tipo (quadrado no post, vertical no story/reels, 1ª página no carrossel).
- **Sem nada ainda** (briefing pré-criado pelo pacote ou tarefa de design): ícone padrão de imagem, convidando a preencher.
- **Com referência enviada:** mostra a primeira imagem de referência (selo pequeno "referência").
- **Com arte do designer (ou da IA):** mostra a arte final (selo "arte" ou "Feito por IA").
- Ao abrir a peça, a imagem vem **em cima, grande**, antes de qualquer campo (toque para ampliar; carrossel desliza entre as páginas).
- Miniaturas leves (não baixar o arquivo original no quadro).
