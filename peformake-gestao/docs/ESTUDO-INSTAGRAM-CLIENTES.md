# Estudo: ler o Instagram de cada cliente

20/11/2026. Pesquisa nas fontes oficiais da Meta (links abaixo). Nada conectado nem alterado. Itens "[não confirmado]" pedem teste com 1 cliente.

## Resumo
- **Biblioteca de Anúncios não serve para o orgânico.** Só traz anúncios; no Brasil, anúncio comercial vem **sem** métricas (só UE/Reino Unido ou política). Fica como radar de criativos (rotina "coleta das redes"). [ads_archive](https://developers.facebook.com/docs/graph-api/reference/ads_archive/) · [Ad Library API](https://www.facebook.com/ads/library/api)
- **Recomendado: acesso de parceiro + System User (API oficial, custo zero).** O cliente compartilha o Instagram/Página com o Business Manager da Peformake; o sistema lê com um token que não expira e grava todo dia em `social_accounts` / `social_metrics_daily`.
- **Plano B rápido: Windsor.ai Standard (US$ 118/mês)** com destino PostgreSQL (direto no Supabase). Sem App Review; custo recorrente e dependência de terceiro.
- **"Conectar Instagram" no portal (OAuth)**: só depois; exige App Review + Verificação da Empresa e renovação do token a cada 60 dias.

## API oficial (o que importa)
| | Facebook Login | Instagram Login |
|---|---|---|
| Básico | `instagram_basic`, `pages_show_list` | `instagram_business_basic` |
| Insights | `instagram_manage_insights`, `pages_read_engagement` | `instagram_business_manage_insights` |
| DM | `instagram_manage_messages` | `instagram_business_manage_messages` |
Fontes: [visão geral](https://developers.facebook.com/docs/instagram-platform/overview) · [Insights](https://developers.facebook.com/docs/instagram-platform/insights)
- Conta precisa ser profissional (Empresa/Criador). Algumas métricas somem com < 100 seguidores.
- A API guarda só 90 dias: o sistema precisa gravar diariamente; stories lidos antes de 24h.
- `impressions` saiu em 21/04/2025; usar **visualizações (`views`)** nos relatórios. [changelog v22](https://developers.facebook.com/docs/graph-api/changelog/version22.0)

## Acesso de parceiro (passo a passo do cliente, ~6–8 cliques)
1. business.facebook.com → Configurações → Usuários → Parceiros → Adicionar → "Dar a um parceiro acesso aos seus ativos".
2. Colar o ID do Business Manager da Peformake.
3. Escolher o Instagram (e a Página) e marcar insights (e mensagens, se for usar).
Pré-requisito: o cliente ter portfólio próprio. Do lado da Peformake: atribuir o ativo ao System User.
- App tipo Business tem Standard Access ([access levels](https://developers.facebook.com/docs/graph-api/overview/access-levels)); cobre contas que a empresa "possui ou gerencia". **Ativo compartilhado como parceiro conta como "gerenciado"? [não confirmado] → testar com 1 cliente.** Se não, pedir Advanced Access + Verificação da Empresa.
- Token de System User pode ser "Never" (não expira) ([autenticação](https://developers.facebook.com/docs/marketing-api/get-started/authentication)); aparece uma vez só (vai para os segredos do Supabase).

## Terceiros
| | Preço | API/MCP |
|---|---|---|
| Reportei | planos de 5 projetos (preço atual [não confirmado]) | API v2 + MCP (já disponível aqui) |
| Windsor.ai | US$ 23 / 118 / 299 por mês ([pricing](https://windsor.ai/pricing/)) | MCP + destino PostgreSQL |
| Metricool | €29 (10 marcas) a €130 (50) ([pricing](https://metricool.com/pricing/)) | API só no Advanced; MCP |

## Plano proposto
1. Criar o app Business da Peformake e o System User; testar com **1 cliente** (o próprio Instagram da Peformake, depois um cliente).
2. Edge function de coleta diária → `social_metrics_daily`; religar a tela de Redes.
3. Guia com prints para o cliente compartilhar o acesso (no portal, passo "Conectar Instagram").
4. Se o teste do passo 1 falhar: Windsor.ai enquanto sai o Advanced Access.
**Precisa do Italo ✋**: criar o app na Meta (conta dele) e colar o token nos segredos do Supabase; escolher o cliente-piloto.
