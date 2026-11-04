# Catálogo de skills e plugins — análise para o CEO-copiloto (04/11/2026)

Critério: serve para **Peformake e para a empresa dos clientes** (PMEs locais no
Brasil)? Funciona sem ferramentas que vocês não usam (Salesforce, NetSuite…)?
Plugins são instalados pelo Italo no cartão de instalação do Claude (clique) — a
IA não instala sozinha.

Legenda: 🟢 instalar agora · 🟡 instalar quando a necessidade aparecer · 🔴 não instalar

## Já ativos

marketing · design · human-resources · pdf-viewer · zoom (com erro de token) ·
peformake-agencia · skills próprias (`italo`, `mdd`, `diagnostico-cliente-agencia`,
`estrategia-360-agencia`, `frameworks-marketing-agencia`, `crm-clientes-agencia`,
`performake-content-agent`, Shopee…) · **suíte CEO deste repo** (10 skills).

## 🟢 Instalar agora (núcleo do CEO)

| Plugin | Autor | Para quê | Peformake | Clientes |
|---|---|---|---|---|
| **Sales** | Anthropic | pipeline, forecast, call prep, objeção, win-loss, renovação | ✅ | ✅ (B2B, distribuidoras) |
| **Small Business** | Anthropic | business pulse, fluxo de caixa, fechamento do mês, propostas, cobrança, reputação, lead finder | ✅ | ✅✅ feito para PME |
| **strategy-frameworks** | comunidade | 47 frameworks com roteador `/think` (Porter, Blue Ocean, BCG, OKR, cenários, teoria dos jogos) | ✅ | ✅ |
| **Customer Success: Churn & QBRs** | comunidade | health check, plano de resgate, QBR, upsell | ✅✅ (gargalo nº 1) | ✅ |
| **management-consulting** | comunidade | análise estratégica, modelagem financeira, precificação de projeto, org design, workshop, entregáveis executivos | ✅ | ✅✅ vira o produto "Consultoria Estratégica" |
| **Research Desk** | comunidade | matriz de decisão ponderada, "conselho de IAs" (segunda opinião julgada), checagem de fonte | ✅ | ✅ — alimenta o `ceo-questionador` |
| **Customer Research Kit** | comunidade | por que clientes cancelam (dito × evidenciado), ICP marcado "comprovado/suposto", guia de entrevista | ✅✅ | ✅ |

## 🟡 Instalar quando precisar

| Plugin | Quando |
|---|---|
| **Operations** (Anthropic) | ao escrever processos/playbooks e plano de capacidade |
| **Product Management** (Anthropic) | quando o Gastromake voltar a ter desenvolvimento ativo |
| **Positioning & GTM** | ao reposicionar a Peformake (nicho gastronomia) ou lançar o Gastromake |
| **Finance** (Anthropic) | se houver contador/rotina de fechamento contábil (é mais contábil que gerencial) |
| **Legal** / **commercial-legal** (Anthropic) | revisão de contrato de cliente e de fornecedor, renovações. Atenção: base jurídica dos EUA — sempre validar com advogado brasileiro |
| **Brand Voice** | padronizar tom de voz por cliente nos conteúdos gerados por IA |
| **HarborRank SEO** | SEO local / Google Maps para clientes (tem custo após 7 dias de teste) |
| **B2B Research** | pesquisa de contas para outbound e checagem de fatos de cases |
| **EASE OS** | organização do workspace + "sparring-partner" de pensamento crítico |

## 🔴 Não instalar (não serve ao contexto)

NetSuite Finance Analyst, Datarails, TRES (cripto), corporate-legal (M&A),
litigation-legal, ip-legal, privacy-legal (GDPR/EUA — LGPD pede outra base),
Compliance ES (Espanha), regai (Vietnã), cashflow/Sprout (bancos via Plaid, EUA),
análise de ações/cripto, plugins de engenharia (Agent Smith, SDLC Kit, virtual-team).

## Conectores que já existem e o CEO deve usar

Supabase (dados do sistema) · Google Drive/Docs/Sheets (fichas de cliente) ·
Gmail · Google Calendar · **Windsor.ai** (Meta Ads, Google Ads, GA4, Instagram
de clientes — leitura e, com confirmação, escrita) · Canva · Gamma (apresentações)
· Figma · Stripe · Vercel · Lovable.
Precisam de autorização no claude.ai: HubSpot, Notion, Slack, Ahrefs,
Similarweb, Klaviyo, Supermetrics, Amplitude. Zoom está com token inválido.

## O que não existe no catálogo (e foi escrito aqui)

| Necessidade | Skill própria |
|---|---|
| Questionar até não sobrar dúvida | `ceo-questionador` |
| CEO aplicado à empresa do cliente | `ceo-de-clientes` |
| Portfólio de frentes do Italo | `ceo-portfolio-frentes` |
| Unit economics de agência + consultas no banco | `ceo-financas` |
| Auto-evolução do sistema | `ceo-autoanalise` |
| Simulação da empresa (cenários) | pendente — aguardando decisão do Italo |
