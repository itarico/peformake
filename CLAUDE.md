# Peformake: regras do projeto

Memória permanente do projeto. Vale para qualquer sessão do Claude, em qualquer computador ou na nuvem.
O histórico completo das decisões até 06/11/2026 está em `peformake-gestao/docs/` (planos e liberações).

## O que é

- `peformake-gestao/`: o sistema da Peformake (assessoria de marketing) e da Ellcazo (produtora). Site público em `/`, botão **Entrar** leva ao `/login` (equipe e, depois, clientes). Vite + React 19 + TypeScript + Tailwind v4 + TanStack Query + React Router 7.
- Backend: Supabase `peformake-app` (ref `wkkzcjnxyylrqoolmmhi`, sa-east-1). O código das edge functions e as migrações antigas estão no próprio Supabase; migrações novas ficam em `peformake-gestao/supabase/migrations/`.
- No ar: https://peformake-gestao.vercel.app (Vercel, time `peformake`, projeto `peformake-gestao`).
- `peformake-site/`: cópia do site institucional antigo (já incorporado ao sistema). A raiz do repositório ainda tem o app antigo da Lovable, só como referência.

## Como trabalhar com o Italo

- Tudo em português do Brasil, sem jargão. Ele escreve rápido e por voz: interprete a intenção.
- Autonomia total para implementar e publicar: **toda alteração vai para o ar logo depois de salva** (commit, push e deploy). Não peça permissão para isso.
- Sempre diga o que foi publicado e o link.
- Peça confirmação só para: excluir dados, mandar mensagem para cliente, gastar dinheiro, ou mexer em segredos.

## Onde se trabalha e como sincronizar (PC, celular e nuvem)

- **Sessão principal: a do PC do Italo**, pasta `C:\Users\intal\Desktop\APP PEFORMAKE`. Pelo celular ele usa **essa mesma sessão** pelo Controle Remoto (roda no PC).
- **Sessão na nuvem: só reserva**, para quando o PC estiver desligado. A rotina de melhoria contínua também roda na nuvem.
- Nunca duas sessões mexendo no código ao mesmo tempo. Ao voltar para uma, a outra para.
- **Automático:** ao abrir qualquer sessão, o gancho `.claude/hooks/session-start.sh` já faz o `git pull` e mostra as últimas entradas do diário. Se ele avisar que o pull falhou, resolva antes de mexer.
- **Ao começar qualquer pedido:** `git pull` na branch `claude/performig-app-data-hxl4zh` (outra sessão ou a rotina pode ter enviado algo).
- **Ao terminar:** commit, **push** (nunca publicar na Vercel sem antes enviar o código ao GitHub, senão a próxima publicação de outro lugar apaga a mudança) e uma linha no topo de `peformake-gestao/docs/rotina-diario.md` com o que foi feito e o que ficou pela metade.
- Decisão combinada com o Italo numa conversa e que não está aqui nem nos docs: anote no diário (ou neste arquivo, se for regra), porque a outra sessão não vê a conversa.
- **Economia de créditos:** um chat novo por assunto (conversa longa relê tudo a cada resposta e custa muito mais). Não usar a sessão da rotina da Meta para conversar. Rotinas leves no modelo Haiku.
- Publicação no PC: a CLI da Vercel não tem login; publique pela integração da Vercel (deploy do commit já enviado ao GitHub, `rootDirectory` = `peformake-gestao`).

## Fase atual: testes antes do lançamento

- O sistema ainda **não está em uso real**: está em teste até ir ao ar com domínio próprio (a Vercel é só ambiente de teste). Dados incompletos e equipe sem login são esperados agora; o foco é achar e corrigir erros e gargalos.
- Módulos mais perto de concluídos: **Clientes** e **Financeiro** (revisar e testar primeiro).

## Regra de ouro (vale acima de todas): o sistema existe para poupar tempo

Tudo o que for feito tem que **facilitar o trabalho** de quem usa. Antes de publicar, passe por este teste:

1. **Tempo:** a tarefa ficou mais rápida que antes? Se ficou igual ou mais lenta, não está certo: refaça.
   Meta: o que é do dia a dia se resolve em **até 3 toques** e em **menos de 10 segundos** a partir do Início ou da Bete.
2. **Informação:** cada tela mostra **só o que leva a uma decisão ou ação agora**. O resto fica atrás de "Ver detalhes".
   Se a pessoa precisa ler um parágrafo para saber o que fazer, está errado.
3. **Digitação:** se o sistema já sabe a informação (ou consegue deduzir), ele preenche sozinho. Pedir de novo é erro.
4. **Atenção:** chamar atenção só quando importa. Só pisca/vibra/notifica o que é **urgente** (dinheiro em risco,
   cliente insatisfeito, algo parado). Novidade comum aparece sem alarde. Nunca cobrir conteúdo nem atrapalhar o uso.
5. **Gosto de usar:** bonito, leve e direto, para a equipe e o cliente **quererem** abrir e alimentar o sistema.
   Visual interessante, mas nunca mais importante que o trabalho.

Se uma ideia não passa nesse teste, ela não entra, por mais bonita que seja.

## Tudo é conectado: mudou um lugar, ajuste todos

O sistema é um só: cliente, financeiro, tráfego, conteúdo, audiovisual, portal, Bete e avisos se alimentam uns dos outros.
Qualquer mudança (nome de tela, caminho/rota, aba, campo, status, regra) tem que ser propagada **na mesma entrega** para tudo que depende dela:

- **Caminhos e abas:** links da Bete (`features/goals/coach.ts`, `chatNotices.ts`, `GoalsChat.tsx`, `BeteToday`), atalhos do Início,
  menu, `MovedTo` de rotas antigas, e os links gravados no banco (`notify(...)` em funções SQL, `action` de `client_deliveries`,
  `link` em `notifications`). Rota antiga ganha `MovedTo` para nada quebrar.
- **Automações:** rotina nova, removida ou com horário novo (pg_cron, tarefa da IA ou chave de configuração) entra em `automation_catalog` (central em Configurações → Automações).
- **Campos e status:** telas, filtros, CSV, portal do cliente, relatórios, funções e gatilhos SQL, e os textos das rotinas automáticas
  (`docs/rotina-melhoria-continua.md`, prompts das tarefas agendadas, `agent_instructions`).
- Antes de publicar, procure (`grep`) o nome antigo no código **e** nas funções do banco, e confira que cada link da Bete abre
  o ponto exato da ação. Se algo ficou para trás, a entrega não está pronta.

## Regras de interface (valem para todo o sistema)

1. **Editar ou preencher abre em pop-up** (`Dialog`). Nunca expandir formulário dentro da página.
2. **Nenhum pop-up pode ter rolagem interna (computador e celular).** Formulário com muita informação é por etapas
   (abas ou passo a passo com barra de progresso, `components/ui/DialogTabs`); o opcional fica em "Mais opções", noutra etapa.
   Medir antes de publicar: `PORT=5199 node e2e/popups.cjs` (iPhone 13 e 1366x800; corpo do pop-up com scrollHeight <= clientHeight).
   Campo de escolha com lista longa usa `components/ui/SearchSelect` (busca sem acento, + Adicionar), nunca `<datalist>`.
3. Compacto, poucos cliques, sem poluição visual, cartões resumidos com "Ver detalhes", gráficos em vez de blocos de texto.
4. 100% responsivo; nada de barra de rolagem dupla; o menu lateral cabe na tela.
5. Escolha de pessoas por foto (como em Editar equipe), não por lista seca.

## Regras de negócio

- A Peformake é **assessoria**, nunca "agência".
- Faturamento separado Peformake × Ellcazo.
- Identidade visual dos documentos e apresentações (diagnóstico, estratégia, plano, guia da marca, relatórios): **Peformake** (ciano #1FC8DB, petróleo #056F84, azul-escuro #0B3C44, branco). Só o que é do **audiovisual** (roteiro, orçamento, galeria) usa a **Ellcazo** (logo + verde-limão e preto). Decisão do Italo, 13/11/2026.
- Relatórios (tráfego e redes): sempre no estilo do Reportei (capa; visão geral com cartões de métricas e variação % vs período anterior; seção por rede com gráfico diário, tabela de campanhas e melhores anúncios/posts com miniatura; análise e próximos passos curtos), identidade Peformake. Decisão do Italo, 12/11/2026.
- Contratos: Assinafy (10/mês grátis) para recorrente novo; aceite eletrônico no portal para avulso e regularização. Tudo dentro do sistema; o PDF fica salvo.
- Valores em dinheiro só para administradores.
- Nunca vilanizar o tráfego pago (o vilão é o marketing "no automático").
- Meta Ads: só leitura, salvo aprovação. Vínculo conta↔cliente é só sugestão.
- Envios de WhatsApp para cliente: sempre confirmados por um humano; automações nascem desligadas.
- Exceção aprovada pelo Italo em 12/11/2026: arte entregue pelo design vai direto ao portal e avisa o cliente no WhatsApp automaticamente (desligável em Configurações → Automações).
- IA no sistema (Claude pela API, funções do Supabase): sem limite por dia (decisão do Italo em 11/11; cada geração fica registrada em ai_generations), teto de gasto do mês em Configurações → Automações (ai_settings, padrão US$ 90) e cada chamada registrada em ai_usage_log. Direcionamento da equipe por cliente/área fica em client_directions e tem prioridade sobre a pesquisa automática.
- Exceção aprovada pelo Italo em 12/11/2026: vídeo entregue pela edição vai direto ao cliente e avisa no WhatsApp automaticamente (desligável em Configurações → Automações)

## Segurança

- Nunca peça, mostre ou digite chaves, tokens e senhas. O Italo cola segredos direto no Supabase (Edge Functions → Secrets).
- Não entrar no sistema com a senha de ninguém.

## Deploy

Na pasta `peformake-gestao`: `npx tsc -b --noEmit`, commit, push, e `npx vercel deploy --prod --yes` (no ambiente da nuvem o token da Vercel é injetado pelo proxy).

**Limite da Vercel (plano grátis): 100 publicações por dia.** Publicar em lotes (juntar várias mudanças), não a cada commit. Commit e push continuam a cada mudança.
