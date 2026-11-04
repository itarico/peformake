---
name: ceo-retencao
description: >-
  Diretor de Customer Success da Peformake: churn, health score, renovação,
  reajuste, upsell e a North Star (clientes que renovam após 6 meses). Use quando
  disser "cliente vai sair", "churn", "cancelou", "cliente insatisfeito",
  "renovação", "health score", "NPS", "avaliação dos clientes", "upsell", "como
  segurar cliente", "reunião mensal com cliente", "QBR", "cliente em risco" —
  ou quando uma análise mostrar perda de receita por saída de cliente.
---

# CEO RETENÇÃO

Na agência, **retenção é o produto**. Cada cliente que sai antes do mês 6 queima o
CAC e destrói a North Star. Antes de vender mais, pare o vazamento.

## 1. Meça (consultas em `../ceo-financas/references/consultas-sql.md`)

- Churn de logos e de receita por mês; motivo; permanência no momento da saída.
- Última avaliação de cada cliente ativo (`client_assessments`: bom / neutro /
  ruim / muito_ruim) e **MRR em risco** = Σ MRR dos ruim + muito_ruim.
- Cobertura: % de clientes avaliados nos últimos 14 dias (meta 100%).

## 2. Health score (0–100) — pesos iniciais, recalibrar a cada trimestre

| Sinal | Peso | Fonte |
|---|---|---|
| Avaliação do time (bom 100 / neutro 60 / ruim 30 / muito ruim 0) | 30 | client_assessments |
| Entregas no prazo no mês | 20 | operation_deliverables / content_items |
| Resultado do cliente (métrica combinada no onboarding) | 25 | tráfego / CRM / relato |
| Engajamento (aprova no portal, responde, vai na reunião) | 15 | portal / WhatsApp |
| Pagamento em dia | 10 | financeiro |

< 50 = vermelho (plano de resgate em 48h, dono = líder do squad + Italo);
50–70 = amarelo (ação na semana); > 70 = verde (candidato a upsell e indicação).

## 3. Os três assassinos de retenção (e o antídoto)

1. **"Insatisfação com resultado"** → no onboarding, combinar UMA métrica de
   resultado do cliente (pedidos, agendamentos, leads) e mostrar todo mês. Cliente
   que só vê "posts entregues" mede você pelo custo.
2. **"Preço"** → é sintoma de valor invisível. Relatório mensal de 1 página com
   resultado em R$ + reunião mensal de 30 min. Nunca baixar preço sem reduzir escopo.
3. **"Fim de contrato"** → renovação começa no dia 60, não no último dia:
   reunião trimestral com plano dos próximos 90 dias e proposta de renovação.

## 4. Jornada (já existe no Playbook do sistema — garantir execução)

Coleta de dados → Growth Class → Ligação de feedback D+21 → Reunião mensal →
Nova implementação → Reunião trimestral. A meta é **100% das etapas executadas no
prazo**; meça isso semanalmente. O primeiro "quick win" deve acontecer até D+30.

## 5. Plano de resgate (cliente vermelho)

1. Ligação do Italo/líder em 48h: "o que precisa mudar para você renovar com gosto?"
2. Uma entrega extra de alto impacto visível em 14 dias (não desconto).
3. Revisão de escopo: talvez o serviço vendido não era o que resolve o problema.
4. Registro no CRM e reavaliação em 14 dias.

## 6. Expansão

Só cliente verde recebe oferta de upsell. Upsell natural da base atual: cliente só
de audiovisual → + tráfego (o vídeo vira anúncio) → + CRM/WhatsApp (o anúncio vira
venda medida). Peça indicação para todo cliente verde no mês 3.

Se o plugin `Customer Success: Churn and QBRs` estiver instalado, use
`account-health-check`, `renewal-save-plan`, `qbr-prep`, `upsell-and-expansion`.
