# Registro de evolução do copiloto-CEO

## Ciclo 1 — 2026-11-04

**Inventário inicial (o que já existia)**
- Lente pessoal: `italo`.
- Marketing/agência: `diagnostico-cliente-agencia`, `estrategia-360-agencia`,
  `frameworks-marketing-agencia`, `crm-clientes-agencia`, `mdd`,
  `performake-content-agent`, `performake-visual-output`, `redator-*`, `copy-lp-vendas`.
- E-commerce: `shopee-market-analyst`, `trend-hunter-moda`, `branding-private-label-strategist`.
- Plugins: marketing, design, human-resources, pdf-viewer, zoom, peformake-agencia.

**Mapa de cobertura (antes → depois)**

| Função de CEO | Antes | Depois |
|---|---|---|
| Estratégia corporativa / roteamento | falta | `ceo-estrategista` (+ plugin strategy-frameworks sugerido) |
| Finanças, preço, unit economics | falta | `ceo-financas` (+ plugin Small Business sugerido) |
| Vendas / receita | parcial (só marketing) | `ceo-receita-vendas` (+ plugin Sales sugerido) |
| Retenção / CS | falta | `ceo-retencao` (+ plugin Customer Success sugerido) |
| Operação / pessoas | parcial (HR) | `ceo-operacao-pessoas` (+ plugin Operations sugerido) |
| Portfólio de frentes / capital | parcial (`italo`) | `ceo-portfolio-frentes` |
| Tecnologia / produto / segurança | falta | `ceo-tecnologia-produto` (+ plugin Product Management sugerido) |
| Posicionamento / GTM | parcial | plugin Positioning & GTM sugerido |
| Jurídico / contratos | falta | plugin Small Business (`contract-review`) sugerido — PENDENTE |
| Autoaprimoramento | falta | `ceo-autoanalise` |

**Patches aplicados neste ciclo**
- Patch 1: a primeira versão da suíte não tinha dono para segurança/tecnologia do
  sistema — o diagnóstico revelou risco real (funções sem autenticação, senhas em
  texto puro, RLS aberta). Criada `ceo-tecnologia-produto`.
- Patch 2: o schema do repositório e o do projeto Supabase conectado divergem —
  documentado em `ceo-financas/references/consultas-sql.md` para nenhuma análise
  futura consultar o projeto errado.

**Testes de qualidade (3 perguntas reais)**
1. "Onde estou perdendo dinheiro?" → respondido com MRR em risco, preço de pacote
   abaixo da tabela, churn — com número e fonte. OK.
2. "Contrato mais um social media?" → regra de capacidade + receita por pessoa
   (R$ ~3,6k, abaixo da meta) → resposta: não, primeiro preço. OK.
3. "Foco no Gastromake agora?" → regra de aposta com marco de corte e entrevistas
   na base de restaurantes. OK.

**Pendências para o ciclo 2**
- Preencher custos reais (folha, sócios, ferramentas) para margem por cliente.
- Confirmar quais plugins o Italo instalou (`ListPlugins`) e ajustar o roteamento.
- Skill de jurídico/contratos se o plugin não for instalado.

## Ciclo 2 — 2026-11-04 (mesmo dia, pedido do Italo)

**Gatilho:** "não quero ficar preso só à Peformake; aplicar o CEO na empresa dos
clientes; uma IA que questione tudo até não sobrar dúvida e se auto-evolua".

**Furos encontrados na suíte do ciclo 1**
- Patch 3: todas as skills assumiam a Peformake como a empresa analisada. Criada
  `ceo-de-clientes` (mesmo método, contexto do cliente, tabela por modelo de
  negócio, entrega em 2 versões) e passo 0 "qual empresa?" no `ceo-estrategista`.
- Patch 4: não existia etapa obrigatória de contestação antes de entregar plano.
  Criada `ceo-questionador` (Livro de Dúvidas, 13 perguntas, critério Dúvida
  Zero) e passo 6 no `ceo-estrategista`.
- Patch 5: a auto-evolução dependia de alguém pedir. Agora toda dúvida sem dono
  vira registro abaixo; 2 ocorrências = patch obrigatório.
- Patch 6: a análise inicial misturou sistema antigo (Lovable) e novo
  (peformake-gestao). Corrigido em `ceo-tecnologia-produto` e no diagnóstico.

**Catálogo analisado:** ver `docs/estrategia/catalogo-skills-plugins.md`
(7 🟢, 9 🟡, ~15 🔴).

## Ciclo 3 — 2026-11-04

**Gatilho:** "conhecimento total de marketing, neuromarketing, vendas, operação,
jurídico, RH — como gerir uma empresa da melhor forma".

- Patch 7: as skills `ceo-*` decidiam bem, mas não tinham base técnica por área,
  e os plugins de jurídico/RH do catálogo usam lei americana. Criada
  `ceo-conhecimento` (índice + 7 módulos: marketing 360°, neuromarketing,
  vendas, operação, finanças/tributos BR, jurídico BR, RH BR), cada um dividido
  em ESTÁVEL × ROTATIVO, com regra de verificar lei, alíquota e regra de
  plataforma na fonte primária antes de afirmar.
- Teste de qualidade: "posso contratar o editor como PJ?" → módulo RH aponta
  risco de vínculo + quando faz sentido + chamar contador. OK.
  "Como usar neuromarketing na proposta?" → ancoragem, chamariz, enquadramento,
  com limite ético. OK.

**Pendências:** revisar trimestralmente a parte ROTATIVA (reforma tributária em
transição a partir de 2026; regras de WhatsApp Business; políticas de anúncio).

## Dúvidas sem dono (alimentado pelo `ceo-questionador`)

| Data | Dúvida | Frente/cliente | Skill que deveria saber | Ocorrências |
|---|---|---|---|---|
| 2026-11-04 | Custo real da folha e dos sócios por entidade | Peformake/Ellcazo | ceo-financas (falta dado) | 1 |
| 2026-11-04 | Datas de início de contrato são reais ou da migração? | Peformake | ceo-financas | 1 |
| 2026-11-04 | Qual skill de "simulação de empresa" o Italo viu? | — | ceo-autoanalise | 1 |

**Próxima revisão:** 2027-02-04 (fim do plano de 90 dias) ou antes, se o MRR
cair mais de 10%.
