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

## Regras de interface (valem para todo o sistema)

1. **Editar ou preencher abre em pop-up** (`Dialog`). Nunca expandir formulário dentro da página.
2. **Formulário com muita informação é por etapas** (abas ou passo a passo com progresso), sem barra de rolagem.
3. Compacto, poucos cliques, sem poluição visual, cartões resumidos com "Ver detalhes", gráficos em vez de blocos de texto.
4. 100% responsivo; nada de barra de rolagem dupla; o menu lateral cabe na tela.
5. Escolha de pessoas por foto (como em Editar equipe), não por lista seca.

## Regras de negócio

- A Peformake é **assessoria**, nunca "agência".
- Faturamento separado Peformake × Ellcazo.
- Contratos: Assinafy (10/mês grátis) para recorrente novo; aceite eletrônico no portal para avulso e regularização. Tudo dentro do sistema; o PDF fica salvo.
- Valores em dinheiro só para administradores.
- Nunca vilanizar o tráfego pago (o vilão é o marketing "no automático").
- Meta Ads: só leitura, salvo aprovação. Vínculo conta↔cliente é só sugestão.
- Envios de WhatsApp para cliente: sempre confirmados por um humano; automações nascem desligadas.

## Segurança

- Nunca peça, mostre ou digite chaves, tokens e senhas. O Italo cola segredos direto no Supabase (Edge Functions → Secrets).
- Não entrar no sistema com a senha de ninguém.

## Deploy

Na pasta `peformake-gestao`: `npx tsc -b --noEmit`, commit, push, e `npx vercel deploy --prod --yes` (no ambiente da nuvem o token da Vercel é injetado pelo proxy).
