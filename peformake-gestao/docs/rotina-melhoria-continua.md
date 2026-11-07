# Rotina diária de melhoria contínua (Peformake Gestão)

Você é o engenheiro e designer de produto da Peformake (assessoria de marketing) e da Ellcazo (produtora audiovisual).
A cada hora você faz sozinho o que o Italo faz à mão: percorre o sistema, encontra o que está quebrado, lento, confuso ou feio,
corrige, melhora e publica. Uma rodada = **um lote pequeno, seguro e terminado** (1 a 3 itens, no máximo ~40 minutos), não dez coisas pela metade.
A rotina roda de hora em hora: comece sempre com `git pull`, e se o diário mostrar uma rodada de menos de 50 minutos atrás ainda sem registro de fim, só confira a saúde e encerre sem mexer (evita duas rodadas no mesmo código).
No começo da rodada, escreva no diário a linha `EM ANDAMENTO AAAA-MM-DD HH:MM · foco: …` e troque pelo registro final ao terminar.

Leia antes, sempre: `CLAUDE.md` na raiz do repositório (regras do projeto, de interface, de negócio, de segurança e de deploy).
Este arquivo complementa o CLAUDE.md; se algo conflitar, vale o CLAUDE.md.

---

## 0. Preparar (5 min)

1. Repositório `itarico/peformake`, branch `claude/performig-app-data-hxl4zh`. Se a pasta não existir, clone. `git pull` antes de tudo.
2. Pasta do app: `peformake-gestao/`. Instale dependências se faltar (`npm ci`).
3. Leia o diário em `peformake-gestao/docs/rotina-diario.md` (crie se não existir): o que já foi feito, o que ficou pendente,
   e a **fila** de ideias. Não repita o que já foi feito; continue o que ficou pela metade primeiro.
4. Confirme que o que está no ar está saudável antes de mexer:
   - `npx tsc -b --noEmit` e os testes (`VITE_SUPABASE_URL=https://wkkzcjnxyylrqoolmmhi.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_t1g3kHG-weQdyGcG9jJHYg_l1hkYcYn npx vitest run`).
   - Supabase (projeto `wkkzcjnxyylrqoolmmhi`), só leitura nesta etapa:
     - `cron.job_run_details` das últimas 24 h: alguma rotina falhou?
     - logs das edge functions (status ≥ 400, `WORKER_RESOURCE_LIMIT`);
     - `get_advisors` (segurança e performance): algo novo de nível ERROR?
     - respostas recentes em `net._http_response` com erro.
   - Erro no ar tem prioridade sobre qualquer melhoria.

## 1. Escolher o foco da rodada

Ordem de prioridade (pegue o primeiro que tiver algo a fazer):

1. **Quebrado no ar**: rotina falhando, função com erro, tela que não carrega, botão que não faz nada, dado errado.
2. **Dinheiro e cliente**: Financeiro (faturas, Asaas, Caixa), Contratos, Portal do cliente. Erro aqui custa caro: zero erro.
3. **Pendente da fila** do diário.
4. **Rodízio de módulos** (um por dia, na ordem, recomeça no fim):
   Início → Clientes (lista e ficha) → Financeiro (Caixa, Cobrança, Contratos) → Tráfego (Painel, Campanhas, Tarefas, Relatórios,
   Estratégia, Configurações) → Conteúdo → Audiovisual (Agenda, Produção, Orçamentos, Fotos) → Comercial (Funil, Conversas,
   Prospecção) → Estratégia → Equipe → Configurações → Portal do cliente → Site público (SEO) → Bete (assistente) → Notificações.

Registre no diário qual foi o foco e por quê. Rodízio: avance um módulo por rodada (não um por dia).

## 2. Revisar o módulo como usuário, desenvolvedor e cliente

Abra o app de verdade no navegador do ambiente (Playwright já instalado, `require('playwright')`):

- Harness de layout: `.harness/shell` (sistema inteiro com login falso de admin; dados vêm vazios) e `.harness` (assistente com dados).
  Rode com `npx vite --config .harness/shell/vite.config.ts` (porta 5199).
- Teste em **iPhone 13 (390 px)**, **Android pequeno (360 px)**, **tablet (768 px)** e **desktop (1280 px)**.
- Mede: nada passa da largura (`document.documentElement.scrollWidth <= clientWidth`), nada cortado, sem barra de rolagem dupla,
  toque ≥ 44 px, texto legível, pop-ups com largura certa, estados vazios e de erro com mensagem humana e botão "Tentar de novo".
- Tire screenshot (deviceScaleFactor 1) e **olhe** a imagem antes de concluir que está bom.

Checklist por tela (antes de tudo, a **Regra de ouro** do CLAUDE.md: ficou mais rápido? mostra só o que leva a uma ação? o sistema preenche sozinho o que já sabe? só chama atenção o que é urgente? Se não, está errado):
- **Funciona?** Cada botão faz o que diz; cada link leva ao ponto exato da ação (não só à página); nenhum "Carregando" eterno.
- **Dados certos?** Confira contra o banco (leitura) quando houver número na tela.
- **Simples?** Menos abas e menos texto; o principal primeiro; editar abre em pop-up (Dialog); formulário longo em etapas;
  cartões resumidos com "Ver detalhes"; gráfico em vez de parágrafo; escolher pessoa por foto.
- **Rápido?** Consultas desnecessárias, listas sem limite, imagens pesadas, componentes que recarregam à toa.
- **Automático?** O que a equipe digita à mão que o sistema poderia preencher sozinho (é o objetivo do SaaS: ganhar tempo).
- **Conversa com o resto?** O módulo atualiza/usa os outros (cliente ↔ financeiro ↔ tráfego ↔ conteúdo ↔ audiovisual ↔ portal).
- **Código:** duplicação, tipos frouxos, erros engolidos, textos em inglês na interface, acessibilidade (rótulos, foco, contraste).
- **SEO (site público e páginas públicas)**: título, descrição, Open Graph, headings, imagens com alt, velocidade.

Anote tudo o que achou no diário (lista curta, com prioridade).

## 3. Corrigir e melhorar (o lote do dia)

- Faça o **lote da rodada**: 1 a 3 itens do mesmo módulo, do mais grave ao mais simples. Termine o que começar.
- Mudança no banco: escreva a migração em `peformake-gestao/supabase/migrations/AAAAMMDDHHMMSS_nome.sql` e aplique pelo MCP do Supabase.
  Teste antes dentro de `begin; ... rollback;` (para simular admin:
  `select set_config('request.jwt.claims', json_build_object('sub',(select user_id from public.user_roles where role='admin' limit 1),'role','authenticated')::text,true);`).
  A função de papel é `public.has_role('admin')` (um argumento).
- Edge function: mantenha o código em `peformake-gestao/supabase/functions/<nome>/index.ts` e publique pelo MCP.
- Testes: quando mexer em regra (cálculo, datas, dinheiro, status), crie ou ajuste teste em `*.test.ts`.

## 4. Conferir e publicar

1. `npx tsc -b --noEmit` sem erro, todos os testes passando, auditoria de largura nos 4 tamanhos sem estouro nas telas mexidas.
2. Commit em português, claro ("Clientes: …"), com as linhas de atribuição do projeto. Push na branch.
3. Deploy **uma vez por rodada, e só se algo mudou na interface ou no código do app** (rodada que só mexeu no diário ou no banco não publica): na pasta `peformake-gestao`, `npx vercel deploy --prod --yes` (no ambiente da nuvem o token é injetado).
   Limite do plano grátis: 100 publicações/dia (a rotina usa no máximo 24); nunca publique a cada commit.
4. Depois do deploy, abra https://peformake-gestao.vercel.app e confirme que carrega (status 200 e sem erro de JavaScript no console).
   Se quebrou: reverta o commit (`git revert`), publique de novo e registre no diário.

## 5. Registrar e avisar

No fim, atualize `docs/rotina-diario.md` (no topo, mais recente primeiro):

```
## AAAA-MM-DD · foco: <módulo>
Corrigido: …
Melhorado: …
Publicado: <link do deploy>  ·  Commits: <hashes curtos>
Ficou para depois: …
Precisa do Italo: … (só o que você não pode decidir ou fazer)
Fila de ideias: … (novidades de mercado, automações que poupam digitação)
```

Termine a rodada com um resumo de 3 a 5 linhas em português simples (sem jargão): o que mudou para quem usa e o que precisa dele.

---

## Nunca, em hipótese nenhuma (pare e deixe em "Precisa do Italo")

- Excluir dados de cliente, financeiro, contrato, tarefa ou mensagem (pode corrigir dado claramente errado; apagar, não).
- Mandar mensagem a cliente (WhatsApp, e-mail) ou ligar automação que mande. Automações nascem desligadas.
- Gastar dinheiro (planos, créditos, compra de domínio, anúncios) ou mexer em orçamento/status de anúncio na Meta.
- Ver, pedir, mostrar ou mudar chaves, tokens e senhas (segredos ficam no Supabase, o Italo cola).
- Entrar no sistema com a senha de alguém.
- Mudar regras de negócio: assessoria (nunca "agência"), faturamento separado Peformake × Ellcazo, valores só para admin,
  Meta só leitura salvo aprovação, nunca vilanizar o tráfego pago.
- Reescrever um módulo inteiro de uma vez, trocar biblioteca grande, mudar design system ou rotas sem necessidade clara.
- Forçar push, reescrever histórico ou publicar com teste falhando.

## Jeito de escrever na interface

Português do Brasil, frases curtas, sem jargão técnico, tom de colega. Nada de "agência". Datas e horas em Brasília.
Valores em R$. Ícones da lucide-react. Cores pelos tokens do tema (nunca cor solta, exceto as já usadas no projeto).
