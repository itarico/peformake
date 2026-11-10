# Estudo: aba Resumo do Financeiro (10/11/2026)

Só estudo, nada construído. Pedido do Italo: uma aba **Resumo** no Financeiro, como nos outros módulos, com métricas, KPIs e gráficos para ver a saúde financeira. Ela tem de cruzar dados com o resto do sistema, ser inteligente e funcionar sozinha.

## 1. Onde fica e quem vê

- Primeira aba do Financeiro: **Resumo** · Caixa · Cobrança · Contratos (`financeTabs.ts`). `/financeiro` abre o Resumo; o Caixa vai para `/financeiro/caixa`, e o endereço antigo do Caixa ganha `MovedTo`.
- Só administradores, porque mostra valores em dinheiro.
- Filtro no topo: **Juntas · Peformake · Ellcazo**. As empresas são separadas; "Juntas" só soma as duas para leitura.
- Mês escolhido por setas (‹ nov/2026 ›). O padrão é o mês atual.

## 2. Tela (regra de ouro: decidir em 10 segundos)

**Faixa 1: 4 cartões**

| Cartão | Mostra | Detalhe pequeno |
|---|---|---|
| Recebido no mês | R$ que entrou | vs mês passado (▲▼ %) |
| A receber | R$ em aberto até o fim do mês | nº de faturas |
| Em atraso | R$ vencido | nº de clientes · maior atraso em dias |
| Resultado do mês | entradas − saídas | margem % |

**Faixa 2: "O que fazer agora"** (no máximo 3 itens, já ordenados por dinheiro em risco, cada um com botão)
- "CM Prime: R$ 2.550 em atraso há 70 dias" → **Gerar mensagem de cobrança** (pop-up com o texto pronto, como os que fizemos hoje; envio sempre por humano).
- "3 créditos para revisar" → abre Cobrança `?revisar=1`.
- "Pagamentos da equipe dia 30: R$ X" → abre Equipe.
- "Extrato não importado há 9 dias" → abre a importação.
- "2 clientes sem CPF/CNPJ" → copia o link /pagar.

**Faixa 3: gráficos** (2 visíveis, o resto em "Ver mais gráficos")
1. **Receita 12 meses**: barras de recebido × previsto, com cor por empresa.
2. **Caixa projetado 90 dias**: linha do saldo esperado (a receber − a pagar − fixas). Fica vermelha onde fica negativa.
3. Receita por área (Social, Design, Tráfego, Audiovisual, Consultoria, CRM): rosca.
4. Concentração: % da receita nos 5 maiores clientes.
5. Inadimplência por mês: % do faturado que atrasou.
6. Entradas × saídas por categoria (fixas, equipe, ferramentas, impostos).

**Ver detalhes: tabela por cliente** (ordenável): mensalidade, pago nos últimos 3 meses, em atraso, dias de atraso, serviços entregues no mês (✓/✗), saúde/NPS, risco.

## 3. Dicionário de métricas

| Métrica | Fórmula | Fonte no sistema | Sinal |
|---|---|---|---|
| **Receita recorrente (MRR)** | soma das mensalidades ativas | `client_services` + `client_service_price` / `invoice_items` (mensalidade) | cresce = bom |
| Recebido no mês | faturas pagas + entradas do Caixa no mês | `fin_entries` (entrada, pago) | — |
| A receber | faturas pendentes até o fim do mês | `invoices` pendente/vencido | — |
| **Em atraso** | faturas vencidas e não pagas | `invoices` due_date < hoje | > 0 alerta |
| **Inadimplência** | atraso ÷ faturado no mês | `invoices` | > 10% ruim |
| Prazo médio de recebimento | média (pago_em − vencimento) | `invoices.paid_at` | ≤ 3 dias bom |
| Ticket médio | MRR ÷ clientes ativos | `client_services` | — |
| Clientes ativos / novos / perdidos | por contrato ativo no mês | `clients`, `client_services` | — |
| **Churn de receita** | MRR perdido no mês ÷ MRR do início | histórico mensal (snapshot) | > 5% ruim |
| Expansão | MRR novo de clientes que já eram clientes (upsell, "Lançar serviço") | snapshot + `sale_service_launch` | — |
| **Concentração** | receita do maior cliente e dos 5 maiores ÷ total | `invoices` | maior > 20% risco |
| Custo de equipe | contas a pagar de membros (fixo + avulso liberado) | `fin_entries` saída equipe, `service_jobs` | — |
| Despesas fixas | recorrentes de saída | `fin_recurring` | — |
| **Resultado (lucro)** | entradas − saídas pagas | `fin_entries` | — |
| Margem | resultado ÷ recebido | — | ≥ 30% saudável |
| Ponto de equilíbrio | despesas fixas ÷ margem de contribuição | — | MRR acima = ok |
| **Fôlego de caixa** | saldo ÷ média de saídas dos últimos 3 meses | saldo informado + `fin_entries` | < 2 meses alerta |
| Previsão 30/60/90 | a receber + MRR futuro − a pagar − fixas | invoices + recorrentes | negativo alerta |
| Receita por área | itens da fatura por serviço | `invoice_items` | — |
| Peformake × Ellcazo | tudo acima por `unit` | `unit` | — |
| Custo de qualidade | créditos/descontos por entrega nossa que faltou | `delivery_credits` | sobe = problema na operação |
| Margem por cliente (fase 3) | mensalidade − (horas × custo hora) − avulsos | tempo por cliente (ainda não existe) | negativa = rever preço |
| LTV | ticket × meses médios de permanência | histórico | — |

## 4. Cruzamentos com o resto do sistema

- **Clientes / saúde:** atraso + NPS baixo + entrega atrasada = cliente em risco. O selo aparece na ficha e no Resumo.
- **Entregas (`client_service_status`):** serviço que faltou vira crédito e desconto (Fase 1, já existe). O Resumo mostra quanto isso custou no mês.
- **Comercial:** funil ponderado (valor × chance da etapa) vira "receita nova prevista" na projeção de 90 dias. O "Lançar serviço" entra como avulso previsto.
- **Contratos:** contrato vencendo em 30 dias aparece como "renovação: R$ X em jogo".
- **Equipe:** pagamentos do dia 30 e avulsos aguardando o cliente pagar (`my_payables.waiting`) entram na projeção.
- **Tráfego:** a verba é do cliente e não entra no faturamento. Mas cliente com saldo de anúncio zerado ou verba caindo vira sinal de risco de cancelar.
- **Bete:** um aviso só quando é urgente (atraso de mais de 5 dias, caixa projetado negativo). Na segunda, uma linha de resumo da semana.
- **Portal do cliente:** não mostra nada disso. O cliente só vê as próprias faturas.

## 5. Automático, sem ninguém alimentar

- Uma função `fin_dashboard(_unit, _month)` devolve tudo numa chamada. É calculada na hora, sem rotina e sem custo de IA.
- Fotografia do mês (`fin_month_snapshots`), gravada pelo pg_cron no dia 1: MRR, clientes, atraso e resultado. Serve para churn, expansão e o gráfico de 12 meses. Entra no `automation_catalog`.
- Alertas calculados pela função (sem cron extra): atraso > 5 dias, inadimplência > 10%, maior cliente > 20% da receita, caixa projetado negativo em 30 dias, despesa do mês 30% acima da média.
- Resumo escrito pela IA uma vez por mês, no dia 1, no modelo Haiku (barato): 3 frases dizendo o que melhorou, o que piorou e o que fazer. É opcional.

## 6. Problema principal: falta histórico

O Caixa só tem lançamentos desde 06/11 (36 lançamentos e 34 faturas). Sem histórico, os gráficos de 12 meses, o churn e a inadimplência ficam vazios. Antes ou junto da Fase 1, o histórico pode vir de três fontes:
1. Importar os extratos de janeiro a outubro da Peformake e da Ellcazo. A importação já existe e não duplica.
2. Rodar o sync do Asaas com 400 dias (`sync`, `days: 400`).
3. Lançar os atrasados que estão fora do sistema: CM Prime (R$ 2.550) e Fuctura (R$ 4.200).
4. Cadastrar as despesas fixas como recorrentes (aluguel, ferramentas, pró-labore etc.).

## 9. Inteligência: previsão, gargalos e dicas (pedido do Italo, 10/11)

Regra: **os números vêm sempre do banco** (funções SQL). A IA só escreve a frase em cima de números prontos, nunca calcula. Cada aviso mostra: o número, de onde veio, e um botão de ação. No máximo 3 aparecem de uma vez, os de mais dinheiro em jogo.

**Previsão de crescimento (3 cenários para os próximos 3 meses)**
- Base: tendência da receita recorrente dos últimos 6 meses (e sazonalidade quando houver 12 meses).
- Soma: funil do Comercial ponderado (valor × chance da etapa) e renovações de contrato.
- Subtrai: churn esperado = mensalidade dos clientes em risco (atraso + NPS baixo + entrega atrasada).
- Mostra pessimista / realista / otimista e "para bater a meta de R$ X faltam N clientes do ticket médio".

**Gargalos (onde trava o crescimento)**
- Operação: área com mais serviços "faltou" ou "em andamento" depois do dia 25 (`client_service_status`) = falta gente ou processo ali.
- Capacidade: entregas contratadas × entregues por área nos últimos 3 meses; acima de 90% de ocupação = não dá para vender mais daquela área sem contratar.
- Comercial: etapa do funil onde mais negócios param (conversão por etapa).
- Cobrança: prazo médio de recebimento subindo, ou o mesmo cliente atrasando 2 meses seguidos.
- Risco: maior cliente acima de 20% da receita.

**"Gastando muito com…"**
- Categoria de despesa 30% acima da média dos últimos 3 meses.
- Custo de equipe acima de 50% do recebido.
- Descontos e créditos por erro nosso, por área (custo de qualidade).
- Ferramenta recorrente sem cliente ou área ligada.

**"Lucrando muito com…"**
- Área/serviço com maior sobra (receita da área − custo da equipe da área).
- Serviço que mais cresceu em receita no trimestre.
- Cliente mais rentável (precisa do tempo por cliente; até lá, usa receita × entregas).

**"Faturamento bom ou ruim?"**
- Ritmo do mês: recebido até hoje × o esperado até hoje pelo calendário de vencimentos.
- Comparação com a meta, com o mês passado e com o mesmo mês do ano anterior.

**Dicas (cada uma vira um botão)**
- Contrato com mais de 12 meses sem reajuste → "sugerir IPCA" (já previsto no desenho).
- Cliente com bom NPS que só tem 1 área → oferta de outra área (upsell) no Comercial.
- Cliente que atrasa todo mês → passar para pré-pago ou cartão recorrente.
- Preço abaixo da tabela de Serviços e pacotes → revisar na renovação.
- Receita concentrada → prospectar o segmento dos melhores clientes.
- Caixa projetado negativo → antecipar cobranças ou adiar despesa.

Resumo semanal na Bete (segunda) e resumo mensal escrito pela IA (Haiku, dia 1), ambos a partir desses mesmos números.

## 10. Anti-falha (para os números serem confiáveis)

1. **Uma fonte de verdade:** tela, Bete, IA e PDF leem a mesma função (`fin_dashboard`). Nada recalcula por conta própria.
2. **Conferência automática todo dia:** recebido no Resumo = entradas do extrato; faturas pagas = pagamentos do Asaas; receita recorrente = soma dos itens. Diferença acima de R$ 1 → selo "conferir" com o motivo, e o lucro não é mostrado até resolver.
3. **Selo de confiança dos dados:** "Dados 92% completos: falta importar o extrato desde 03/11" (extrato em dia, despesas fixas cadastradas, todo cliente ativo com fatura, nenhum pagamento sem cliente). Abaixo de 80%, os gráficos ficam cinza com o aviso.
4. **Nunca em dobro:** chave única cliente + serviço + mês (já existe), importações idempotentes, fotografia mensal que não muda depois de gravada.
5. **IA vigiada:** o texto da IA é conferido; se citar um número que não está no resultado do banco, o texto é descartado.
6. **Testes automáticos:** cada fórmula com um teste de dados fictícios (vitest + SQL desfeito com rollback). A rotina de melhoria contínua roda a conferência e anota no diário.
7. **Histórico de mudanças:** quem alterou valor, data ou status de um lançamento ou fatura fica registrado.
8. **Rotina que falha aparece:** fotografia mensal e conferência entram no `automation_catalog`; falhou, fica vermelho na central e avisa o admin.
9. **Regras únicas:** horário de Brasília, centavos exatos (numeric), atraso pela data de vencimento.
10. **Cópia de segurança:** exportar CSV do mês e a fotografia mensal guardada.

## 11. Fases atualizadas

- **Fase A:** dados em dia (lista de clientes sem fatura, extratos, despesas fixas, atrasados) + selo de confiança + conferência automática.
- **Fase B:** aba Resumo (cartões, "O que fazer agora", receita 12 meses, caixa 90 dias) + fotografia mensal.
- **Fase C:** inteligência (previsão em 3 cenários, gargalos, "gastando/lucrando com", dicas) + Bete.
- **Fase D:** margem por cliente com o tempo por cliente + resumo mensal da IA.

## 7. Fases (primeira versão, substituída pela seção 11)

- **Fase A (rápida):** aba Resumo com os 4 cartões, "O que fazer agora", receita 12 meses e caixa 90 dias; mais a importação do histórico.
- **Fase B:** dicionário completo, tabela por cliente, fotografia mensal, receita por área e concentração.
- **Fase C:** alertas na Bete, resumo mensal da IA, margem por cliente (depende do tempo por cliente).

## 8. Decisões do Italo

1. Meta de faturamento por mês (para a barra de progresso no "Recebido")? Um valor por empresa?
2. Padrão do filtro: Juntas, ou Peformake primeiro?
3. Saldo do banco: informar à mão uma vez e o sistema seguir pelo extrato, ou só pelo extrato?
4. Pró-labore e impostos entram como despesa fixa (para o lucro ser real)?
5. Quem além do Italo vê o Resumo (só admin, conforme a regra atual)?
