# Plano: cobrança completa com o Asaas

Objetivo: do contrato assinado ao dinheiro no caixa sem planilha. Cada cliente tem as cobranças certas no dia certo, o cliente paga pelo link (Pix, boleto ou cartão), o sistema dá baixa sozinho, avisa quem precisa e mostra tudo no Financeiro, na ficha do cliente e no portal.

## 1. O que já existe (estudo de 06/11/2026)

| Peça | Situação |
|---|---|
| `invoices` (faturas) | Pronta. Status `pendente`, `pago`, `vencido`, `cancelado`; origem `mensalidade`, `avulso`, `sinal`, `manual`; empresa `peformake` ou `ellcazo`. Hoje: **0 faturas**. |
| `invoice_generate_month` | Gera a mensalidade de cada cliente recorrente ativo, uma por empresa, no dia de vencimento do contrato. Cron diário às 06:15, **desligado** (`monthly_generate = false`). |
| `billing-gateway` | Cria a cobrança no Asaas (cliente pelo CPF/CNPJ, `billingType UNDEFINED` = Pix, boleto ou cartão, avisos do Asaas desligados). Cron de hora em hora. Também faz `sync` (traz recebimentos do Asaas para o caixa) e `sweep` (Pix diário da parte da Ellcazo). |
| `billing-webhook` | Recebe "pagamento recebido/confirmado" do Asaas e marca a fatura como paga. |
| `billing_reminders_run` | Régua no WhatsApp: D-1, D0, D+1 para o cliente; D+3 alerta o admin; D+7 para e vira conversa humana. Cron 12h, **desligado** (`reminders_enabled = false`). |
| Sinal e entrega do audiovisual | Proposta aceita gera sinal (50%); entrega gera o restante. |
| Caixa | Fatura paga vira entrada no caixa da empresa certa. |
| Portal | Mostra faturas com botão Pagar. |
| `billing_settings` | `gateway = asaas`, `gateway_env = sandbox`, tudo automático desligado. |

### Furos encontrados
1. **A criação no Asaas não respeita o "automático desligado"**: o cron de hora em hora cria no Asaas qualquer fatura pendente sem link. Hoje não há faturas, então nada aconteceu, mas precisa obedecer a `auto_charge` antes de ligar a geração do mês.
2. TCV (valor total fechado) é tratado como mensalidade: não existe parcelamento nem "à vista".
3. Avulso da Peformake (fora do audiovisual) não gera cobrança sozinho.
4. Taxa de implantação não vira cobrança.
5. A primeira cobrança não espera o contrato assinado.
6. Sem multa, juros, desconto de pontualidade, nota fiscal, reajuste anual nem cancelamento no Asaas quando a fatura é cancelada aqui.
7. Atraso não chega à equipe do cliente (só ao admin).

## 2. Regras fixas

1. **A fatura do sistema é a verdade.** O Asaas só cobra e avisa que recebeu. Nada é cobrado sem existir antes como fatura aqui.
2. **Uma cobrança por empresa** (Peformake e Ellcazo separadas), mesmo CNPJ. Cliente misto pode pagar um link só, e a parte da Ellcazo é repassada por Pix (repasse diário, opcional).
3. **Começa só com contrato assinado** (ou proposta aceita, no avulso).
4. **Tudo automático nasce desligado** e liga por chave em Financeiro → Cobrança.
5. **Avisos do próprio Asaas desligados**: o cliente recebe só os nossos (WhatsApp e e-mail com a cara da Peformake).
6. Serviço não entregue no mês gera aviso interno, **não** desconto automático.

## 3. Como cada tipo de cliente é cobrado

| Tipo | Quando nasce a cobrança | Como |
|---|---|---|
| **Recorrente (MRR)** | Todo mês, X dias antes do vencimento (padrão 5) | Mensalidade = soma dos serviços ativos com desconto, por empresa. A primeira só depois do contrato assinado; mês de entrada proporcional (opcional). |
| **TCV** | Na assinatura | Valor total do contrato em **parcelas** (1x à vista ou Nx mensais, escolhido no contrato). As parcelas são criadas todas de uma vez e aparecem no portal. |
| **Avulso / projeto** | Proposta aceita ou serviço avulso adicionado | Sinal (padrão 50%) na aceitação e o restante na entrega. Serviço avulso da Peformake: cobrança única ao adicionar, com vencimento escolhido. |
| **Taxa de implantação** | Na assinatura | Cobrança única junto com a primeira mensalidade (ou separada). |
| **Extras do mês** | Quando a equipe lança | Ex.: diária extra, deslocamento. Entra como item na mensalidade seguinte ou cobrança avulsa. |

## 4. Ciclo de vida da fatura

```
gerada (pendente, sem link)
  → link criado no Asaas (Pix/boleto/cartão)
  → aviso ao cliente (WhatsApp/e-mail) e no portal
  → pago (webhook)  → entra no caixa → recibo ao cliente → equipe avisada
  → atrasou: D-1, D0, D+1 cliente · D+3 admin e responsável do cliente · D+7 para, vira tarefa humana
  → cancelada aqui → cancelada no Asaas
```

## 5. Notificações

| Para quem | Quando | Canal |
|---|---|---|
| Cliente | Fatura nova, D-1, D0, D+1, pagamento confirmado (recibo) | WhatsApp (Wasender) e e-mail (Resend); portal sempre |
| Admin | D+3 e D+7, pagamento recebido, falha ao criar cobrança | Sininho e WhatsApp interno |
| Equipe do cliente (head, social, tráfego) | Cliente com atraso acima de 7 dias | Sininho, sem valores |
| Financeiro | Resumo diário: recebido hoje, a vencer na semana, atrasados | WhatsApp interno |

Tom gentil, horário comercial, nada sai sem a chave ligada.

## 6. Onde aparece

- **Financeiro → Cobrança:** faturas do mês por situação, gerar o mês, criar link, marcar pago à mão, régua.
- **Financeiro → Caixa:** recebido x previsto por empresa; inadimplência do mês.
- **Financeiro → Contratos:** valor coberto por contrato e o que falta.
- **Ficha do cliente → Financeiro:** histórico de faturas, recebido, em aberto, atrasos.
- **Portal:** faturas com Pagar, recibos e o contrato.
- **Início (admin):** previsto x recebido no mês e atrasados.

## 7. Fases

| Fase | Entrega | Depende de |
|---|---|---|
| **1. Ligar com segurança** | Chave e webhook no ar; Financeiro → Cobrança mostra "conectado à conta X"; a criação no Asaas passa a obedecer a `auto_charge`; cancelar fatura cancela no Asaas; teste com 1 fatura de R$ 5,00 em produção. | Chave do Asaas (feito pelo Italo) |
| **2. Recorrente pelo contrato** | Mensalidade só para quem tem contrato assinado; geração X dias antes do vencimento; primeiro mês proporcional (opcional); taxa de implantação na primeira cobrança. | Fase 1 |
| **3. TCV e avulso** | Parcelamento do TCV (1x a Nx) definido no contrato; cobrança de serviço avulso ao adicionar; sinal e entrega já existentes revisados. | Fase 2 |
| **4. Avisos** | Fatura nova, recibo de pagamento, régua D-1 a D+7 por WhatsApp e e-mail, resumo diário do financeiro, aviso à equipe do cliente em atraso. | Chaves do Wasender e do Resend |
| **5. Regras de dinheiro** | Multa e juros de atraso, desconto de pontualidade, reajuste anual (IPCA) na renovação, nota fiscal pelo Asaas (opcional). | Decisões do Italo |
| **6. Repasse Ellcazo** | Pix diário da parte da Ellcazo para a conta dela (já pronto, só ligar com a chave Pix). | Chave Pix da Ellcazo |

## 8. Decisões pendentes (Italo)

1. Chave do Asaas é de **produção** ou de teste?
2. Gerar a mensalidade **quantos dias antes** do vencimento? (sugestão: 5)
3. Primeiro mês **proporcional** aos dias ou cheio?
4. TCV: à vista com desconto, parcelado, ou os dois?
5. Multa e juros de atraso? (padrão de mercado: 2% de multa + 1% ao mês)
6. Desconto para quem paga até o vencimento? Quanto?
7. Emitir **nota fiscal** pelo Asaas? (precisa da configuração fiscal da empresa no Asaas)
8. Cliente que paga Peformake e Ellcazo: **um link só** com repasse, ou **dois links**?
9. Novembro/2026: confirmar que **não** gera as faturas de novembro (12 nasceriam atrasadas) e começa em dezembro.
