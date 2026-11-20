# Estudo: ciclo do cliente sincronizado (cadastro → serviço → esteira → cobrança)

20/11/2026. Junta e atualiza `ESTUDO-VENDAS-E-CICLO-DO-CLIENTE.md` (06/11) e `ESTUDO-VENDA-OPERACAO.md` (12/11, parado).
Mapa feito lendo o código e o banco (só leitura). **Nada aplicado ainda: precisa do OK do Italo nos pontos marcados ✋.**

## 1. Como está hoje (resumo do mapa)

**Duas portas de cadastro, comportamentos diferentes**

| | Clientes (Novo cliente) | Comercial (Nova venda) |
|---|---|---|
| Serviço e preço | depois, à mão (aba Operação) | na hora |
| Fatura avulsa | não | na hora (`sale_apply`) |
| `contract_model` | preenchido | vazio |
| Transação única | não (`client_create` não existe no banco; cai em 2 passos) | sim |
| Nome repetido | não confere | bloqueia |

**Depois do serviço lançado, nada vira trabalho.** Só nascem fatura e (se for Consultoria) o diagnóstico.
Audiovisual não ganha captações a agendar (o `av_ensure_month` foi desligado em 15/11 para o quadro não encher de vazio),
Social/Design não ganha plano do mês, Tráfego não ganha tarefa, contrato não é gerado. A falta só aparece no fechamento
do dia 26 (`month_close_run`), já como desconto. Hoje: 3 clientes com plano de visitas sem projeto no mês; 2 com social/design sem plano.

**Bugs achados (mais grave primeiro)**
1. Venda mensal cobra no mês errado: `sale_apply` grava `billing_month` = mês seguinte, mas `invoice_generate_month` ignora e fatura o mês corrente; sem `billing_day` vence dia 30.
2. Tipo do cliente em 3 lugares que divergem (`clients.client_type`, `client_contracts.contract_type/model`, itens da venda). Hoje 3 clientes ativos `one-off` com contrato `recurring/MRR`: a tela mostra avulso e a mensalidade não é gerada.
3. Venda pendente/recusada deixa cliente "fantasma" ativo (cobrado no Início e na Bete).
4. Desfazer venda mensal só desliga serviços; contrato e tipo ficam como fixo.
5. Entrega avulsa já faturada pela venda dispara "Entrega avulsa sem valor".
6. `client_create` não existe no banco (porta Clientes grava em 2 passos sem transação).
7. Passo "Cobrança" fica pendente no avulso vendido (venda não grava `start_date`).
8. `sale_apply` não confere serviço já ativo → mensalidade em dobro se vender o mesmo serviço de novo.
9. Itens de pacote todos com quantidade 1; "Social Mídia" sem `delivery_qty`.
10. Licitação é anexo do cliente (aba contrato), não um tipo; o link "É licitação?" aponta para `aba=contrato`.

## 2. O ciclo novo (proposta)

### 2.1 Tipos de cliente (ficha e venda)
`Fixo mensal` · `Avulso` · **`Outro ▸`** (aba pequena) → por enquanto só **`Licitação`**. (O `Por execução` do estudo de 06/11, caso Partem, entra aqui também se o Italo quiser ✋.)
- **Uma fonte da verdade**: `clients.client_type` (`recurring` | `one-off` | `other`) + `clients.client_subtype` (`licitacao` …).
  O contrato herda; a venda só muda o tipo por função única (`client_set_type`), nunca direto. Corrige o bug 2 e os 3 clientes divergentes.
- **Licitação**: cadastro pede órgão, número do processo/edital, vigência e itens da ata (o que já existe em `bids`/`bid_items`);
  a operação nasce das **Ordens de Serviço** (`bid_orders`), não de mensalidade; cobrança por OS (já existe `bid_invoice_make`).
  Ficha do cliente de licitação: abas Licitação (ata, saldo por item, OS) · Entregas · Financeiro · Arquivos. Sem passo "Contrato Assinafy" (o contrato é a ata).

### 2.2 Uma porta só por dentro, duas por fora
Clientes e Comercial continuam como entradas, mas **gravam pela mesma função** (`client_onboard`), numa transação:
cliente + contato + tipo + (se vier) serviços com preço + venda. Assim os dois caminhos ficam idênticos (nome repetido, contrato, datas).
- Venda **pendente** cria o cliente como **rascunho** (não aparece no Início/Bete); confirmada → ativo; recusada → some (corrige bug 3).

### 2.3 A esteira (o que nasce sozinho quando o serviço é CONFIRMADO)
Gatilho único quando um `client_services` fica ativo **com venda confirmada** (ou lançado por admin na ficha). Tudo idempotente
(chave `cs:<client_service>:<mês>:<n>`), sem duplicar se rodar de novo.

| Área do serviço | Nasce na hora | Todo mês (recorrente) |
|---|---|---|
| **Audiovisual** | N captações **"a agendar"** (N = `visits_per_month` × quantidade; avulso = quantidade vendida), com responsável do `client_team`, aviso ao videomaker/gestor e na Bete "Agendar 4 captações da X" | no dia 20, as N do mês seguinte (não enche o quadro: ficam numa faixa "A agendar" compacta, não como cartões vazios) |
| **Social / Design** | plano do mês (`content_plan_ensure`) + aviso ao social media "Montar o planejamento de X" | plano do mês seguinte no dia 20 (já liga com a Estratégia do dia 15) |
| **Tráfego** | tarefa "Ligar conta de anúncio e fazer a 1ª estratégia" para o gestor | relatório semanal/mensal (já existe) |
| **Consultoria** | diagnóstico na fila (já existe) | — |
| **Fixo mensal (qualquer área)** | **contrato em rascunho** gerado com os serviços e valores (não envia ✋) + passo "Enviar contrato" | — |
| **Avulso** | fatura (já existe) + `start_date` gravado (corrige bug 7) | — |
| **Licitação** | nada até a OS; cada OS cria a entrega da área e a fatura | — |

**Pacotes padronizados ✋**: no catálogo, cada pacote/serviço diz o que gera (ex.: "Mobile 4 captações/mês" = 4 captações + 16 vídeos).
Corrigir os dados atuais (itens com quantidade 1, Social Mídia sem `delivery_qty`) numa tela de revisão do catálogo.

### 2.4 Passo a passo do cliente (o "próximo passo" sempre visível)
O `setupSteps` vira o ciclo inteiro, por tipo:
- **Fixo**: Empresa → Serviços → Contrato (rascunho → enviado → assinado) → Cobrança (dia) → Esteira ok (captações agendadas, plano aberto, conta de anúncio) → Acessos.
- **Avulso**: Serviço → Fatura/sinal → Agendar → Entrega → Pagamento final.
- **Licitação**: Ata → 1ª OS → Entrega → NF → Pagamento.
Sem limite de 60 dias para o que trava dinheiro ou entrega (hoje some sozinho). Um cartão "Agora" no topo do cliente e na Bete com a 1 ação.

### 2.5 Cruzamentos para pegar erro (rotina diária, só avisa)
- Serviço ativo sem preço · fixo sem contrato enviado em 7 dias · fixo sem `billing_day` · tipo do cliente ≠ contrato
- Captação do mês não agendada até dia 10 · plano do mês sem peças até dia 5 · tráfego sem conta ligada
- Venda confirmada sem serviço/fatura · fatura sem cliente ativo · serviço duplicado
Aparece numa lista "Conferência" em Configurações e, o que for urgente, na Bete.

## 3. Ordem de implementação (cada etapa publicada e testada)
1. **Correções de dinheiro e tipo** (bugs 1, 2, 4, 7, 8) + `client_set_type` + conferência dos 3 clientes divergentes.
2. **`client_onboard`** (porta única) + rascunho para venda pendente (bugs 3, 6).
3. **Esteira** por área (audiovisual "a agendar", plano social/design, tarefa tráfego, contrato rascunho) + catálogo revisado.
4. **Tipo Outro ▸ Licitação** com ficha própria.
5. **Passo a passo por tipo** + **Conferência diária**.
6. **Teste de força**: as duas portas × 3 tipos × 4 áreas, confirmar/recusar/desfazer venda, mês virando, e o e2e do ciclo.

## 4. Precisa do OK do Italo ✋
1. Captações "a agendar" nascem sozinhas ao confirmar o serviço (numa faixa compacta, não como cartões vazios)?
2. Contrato do fixo nasce em **rascunho** sozinho (você confere e envia)?
3. Venda pendente cria cliente como rascunho (some se recusada)?
4. "Outro" começa só com Licitação, ou já entra "Por execução" (Partem)?
5. Corrigir os 3 clientes avulsos com contrato de fixo: viram fixo (passam a gerar mensalidade) ou continuam avulsos (ajusto o contrato)? Lista na conferência antes de mudar.
6. Venda mensal: a 1ª mensalidade é do mês da venda ou do mês seguinte?
