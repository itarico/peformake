# Padrão de venda (Etapa 3.4)

A venda fecha o caminho que a estratégia abriu. Sai dos dados reais de conversa, nunca de suposição.

## Fontes (Supabase, só leitura)
- Conversas: `whatsapp_messages` e `client_messages` do cliente (perguntas e objeções do público; mensagens curtas recebidas).
- Comercial: `crm_deals` (etapas, motivo de perda), `crm_events`, `crm_sales` (o que vendeu), `crm_nps`, `site_leads`.
- Resultado de anúncio que leva à conversa: `traffic_daily_metrics` (conversas por dia).
Agrupe as mensagens por assunto (preço/pagamento, prazo/entrega, produto, localização/horário, confiança) e conte. As 5 mais frequentes viram as objeções.

## Entrega
1. **Mensagem de entrada pronta** (o que a pessoa manda ao clicar), por oferta.
2. **Primeira resposta** em até [x] min, com nome e pergunta de qualificação.
3. **Qualificação** (2 a 3 perguntas) e **oferta** (a da estratégia, com condição e prazo).
4. **Fechamento**: forma de pagamento/agenda/pedido em 1 passo.
5. **As 5 objeções reais** com resposta curta (prova > argumento) e quem usa (atendente/dono).
6. **Retorno (follow-up)**: 24 h, 3 dias e 7 dias, texto pronto, sem insistência chata.
7. **Recompra e indicação**: mensagem pós-venda, pedido de avaliação, pedido de indicação com motivo.
8. **Medidas**: conversas → orçamentos → vendas, tempo de resposta; tudo com origem no Comercial.
Nunca enviar nada: o documento só entrega os textos prontos; o envio é sempre de um humano.
