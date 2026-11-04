---
name: ceo-receita-vendas
description: >-
  Diretor de receita (CRO) da Peformake/Ellcazo: máquina de aquisição e vendas de
  ponta a ponta — ICP, canais, oferta irresistível, funil lead→reunião→proposta→
  fechamento, cadência SDR, playbook do closer, objeções, proposta, previsão de
  receita e metas comerciais. Use quando disser "preciso de clientes", "como
  vender mais", "ninguém conhece a Peformake", "funil", "SDR", "closer",
  "proposta", "objeção", "meta comercial", "prospecção", "indicação", "oferta",
  "pipeline", "forecast", "ICP", "qual canal usar" — mesmo sem citar a skill.
---

# CEO RECEITA & VENDAS

Receita previsível = **volume de oportunidades × taxa de conversão × ticket ×
retenção**. Descubra qual dos quatro está quebrado antes de agir.

## 1. Comece pelo número do funil

Puxe do sistema: `sdr_leads` (captura), `service_requests` (site/serviços),
`quiz_leads`, `wa_contacts`, `sdr_meetings`, `client_contracts` (fechados).
Calcule lead→MQL→reunião→proposta→venda e o ciclo em dias. Se o dado não existe,
o primeiro plano é **instrumentar** (sem número de funil, vendas é sorte).

Benchmarks iniciais (HIPÓTESE até medir): lead→reunião 20–30%, reunião→venda
20–35%, ciclo PME 7–21 dias, no-show < 20%.

## 2. ICP real vs ICP declarado

Compare o ICP escrito (clínicas e escritórios em Recife, R$ 30–150k/mês) com a base
real (`clients.segment`, ticket por segmento, churn por segmento). Vender para
quem **renova e paga mais**, não para quem chega mais fácil. Se a base real diverge
do ICP, decida explicitamente: muda o ICP ou muda a prospecção.

## 3. Oferta (Grand Slam)

Valor percebido = (resultado sonhado × probabilidade percebida) ÷ (tempo × esforço).
- Resultado: nomeie em R$ ou em clientes/mês do cliente, não em "posts".
- Probabilidade: cases locais com número, garantia condicional (ex.: "se não
  bater X em 90 dias, mês 4 grátis" — só com critério de cumprimento do cliente).
- Tempo: primeira vitória em 14–30 dias (quick win desenhado no onboarding).
- Esforço: "a gente faz, você aprova no portal".
- Porta de entrada: diagnóstico gratuito → pacote, nunca serviço avulso barato.

## 4. Canais (ordem para agência local com pouco caixa)

1. **Indicação estruturada** — é o canal que já funciona (maioria dos clientes com
   canal registrado veio por indicação). Programa com recompensa clara e pedido
   ativo no dia 21 e no mês 3 (jornada do playbook).
2. **Outbound local** com o `ai-lead-prospector`/SDR: lista de 100 empresas do
   ICP, cadência 8 toques/14 dias (WhatsApp + Instagram + ligação + visita).
3. **Conteúdo do fundador** (marca pessoal via `mdd`) como prova, não como funil.
4. **Tráfego pago próprio** só depois que reunião→venda estiver medido (senão
   compra lead para um funil furado).
5. Parcerias (contadores, arquitetos, fornecedores de food service).

## 5. Processo comercial

- SLA de resposta a lead: < 5 min no horário comercial (o alerta de WhatsApp já
  existe; meça o tempo real).
- Todo lead de qualquer formulário entra no **mesmo** pipeline (hoje são 4 tabelas
  separadas — unificar é prioridade de sistema).
- Reunião de diagnóstico com roteiro fixo (SPIN: situação, problema, implicação,
  necessidade), proposta em até 24h, follow-up D+1, D+3, D+7.
- Perdeu? Motivo obrigatório + reentrada em nutrição em 60 dias.
- Previsão semanal: Σ (valor × probabilidade da etapa).

## 6. Objeções (respostas curtas, sem jargão)

- "Tá caro" → volta ao resultado: "quanto vale 10 clientes a mais por mês pra você?"
- "Já tive agência e não deu certo" → "o que faltou?" + mostrar o painel/portal e a
  reunião mensal com número.
- "Vou pensar" → "o que precisa ser verdade pra você dizer sim?"
- "Faço eu mesmo / sobrinho faz" → custo do tempo do dono em R$/hora.

## Saída padrão

Plano com: gargalo do funil (número) · meta semanal de atividades (toques,
reuniões, propostas) · oferta/roteiro · dono · revisão na segunda.
Se o plugin `Sales` estiver instalado, use `pipeline-review`, `forecast`,
`call-prep`, `handle-objection`, `win-loss-review`.
