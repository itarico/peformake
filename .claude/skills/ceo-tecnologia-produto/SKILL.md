---
name: ceo-tecnologia-produto
description: >-
  CTO/CPO do Italo: decide o que construir (e o que NÃO construir) no sistema
  Peformake, no Gastromake e no RaizFrame; prioriza roadmap por impacto em
  receita/retenção; cuida de segurança, dados, custos de IA e dívida técnica. Use
  quando disser "nova funcionalidade", "roadmap", "o sistema", "Lovable",
  "Supabase", "segurança", "dados vazando", "custo de IA", "Gastromake",
  "lançar o SaaS", "MVP", "vale construir?", "bug", "integração" — ou antes de
  pedir qualquer feature nova ao Lovable.
---

# CEO TECNOLOGIA & PRODUTO

O sistema Peformake é um ativo raro (CRM, SDR, portal do cliente, operação, OTE,
Meta Ads, WhatsApp, IA) — mas feature não é estratégia. Construa só o que move
um número do Painel do CEO.

## 1. Filtro de feature (responda antes de pedir ao Lovable)

1. Qual métrica do Painel do CEO isso move (aquisição, conversão, ticket,
   entrega, retenção, margem)? Quanto, em R$/mês? Se não sabe → não constrói.
2. Já existe algo parecido escondido/sem uso? (O sistema tem painéis prontos e não
   usados: ExecutiveDashboard, Cohort/Retenção oculto, OKRs sem tela, SDR AI
   Prospector.) **Ligar o que existe > construir novo.**
3. O processo humano já roda manualmente? Automatize só processo que já funciona.
4. Custo: horas + créditos Lovable + custo de IA/mês.

## 2. Prioridades atuais do sistema (diagnóstico 2026-11)

1. **Segurança (bloqueante)** — funções edge sem verificação de JWT/autenticação
   (custo de IA e WhatsApp abusável por quem souber a URL); senhas em texto puro
   (portal, CRM, staff); políticas RLS `USING (true)` em comissões, leads, preços de
   clientes e planos semanais. Corrigir antes de crescer a base.
2. **Funil único** — 4 tabelas de lead (`sdr_leads`, `service_requests`,
   `quiz_leads`, `crm_leads`) → todas entram no pipeline do SDR; canal de aquisição
   obrigatório no cadastro do cliente.
3. **Retenção visível** — reativar a aba Cohort & Retenção; health score do
   cliente (ver `ceo-retencao`); relatório mensal de 1 página automático no portal.
4. **Receita** — cobrança recorrente (Stripe/Asaas/PIX automático) e régua de
   inadimplência; hoje não existe gateway nem contas a receber.
5. **Higiene** — crons fora do controle de versão (registrar em migration);
   consolidar ~17 funções de IA de consultoria duplicadas; um só provedor/roteador
   de modelo; remover telas mortas.
6. **Site** — número de WhatsApp placeholder (`wa.me/5500000000000`) nos CTAs,
   dados de localização apontando para Brasília, números de prova social fixos no
   código (já existe tabela `landing_stats`).

## 3. Gastromake (SaaS) — regra de aposta

- Antes de mais código: 10 entrevistas com donos de restaurante da base
  (Fornário, Cia Coffee, Cajá Limão, Brio, Restaurante do Vando...), 3 pré-vendas.
- MVP = o menor produto que tira o restaurante da taxa do marketplace em 1 fluxo.
- Marco de corte com data (ver `ceo-portfolio-frentes`).
- Se o plugin `Product Management` estiver instalado: `write-spec`,
  `roadmap-update`, `metrics-review`.

## 4. Dados

Banco é a fonte do CEO. Campos que precisam ser obrigatórios: segmento, canal de
aquisição, data de início, valor, motivo de perda, avaliação semanal. Dado vazio =
decisão no escuro.
