---
name: ceo-placar-resultado
description: >-
  Cruza os dados de um cliente de ponta a ponta — investimento em anúncio,
  cliques, visitas ao perfil, conversas novas no WhatsApp, vendas e R$ — e
  calcula o aumento DIRETO (atribuído) e INDIRETO (acima da linha de base), com
  faixa de confiança. Use quando disser "quanto o tráfego trouxe", "cruza os
  dados do cliente", "quantas mensagens vieram do anúncio", "placar do
  cliente", "ROI do cliente", "resultado direto e indireto", "relatório de
  resultado", "o anúncio está vendendo?", ou para preparar reunião mensal e a
  remuneração por resultado.
---

# CEO PLACAR DE RESULTADO

Especificação completa (modelo de dados, conectores, fases):
`docs/estrategia/placar-de-resultado-spec.md`.

## Como calcular para um cliente (passo a passo)

1. **Identifique as fontes do cliente** no banco do sistema novo
   (`peformake-app`): `ad_accounts.client_id`, `whatsapp_accounts.client_id`,
   `crm_sales.client_id`. Se o WhatsApp do cliente não estiver conectado, diga
   isso primeiro — sem ele não há placar, só métrica de anúncio.
2. **Período e linha de base:** período analisado + 4–8 semanas anteriores
   (ou dias sem anúncio) para a base, por dia da semana.
3. **Puxe o funil por dia:** investimento, impressões, cliques
   (`traffic_daily_metrics`); contatos novos (`wa_contacts.first_message_at`
   pelo `account_id` do WhatsApp do cliente; ignore grupos); vendas
   (`crm_sales` confirmadas); fontes extras (`client_channel_daily`, se existir,
   ou Windsor.ai para Instagram orgânico / Google Meu Negócio / GA4).
4. **Direto:** contatos/vendas com origem confirmada (referência do anúncio,
   código na mensagem, resposta "como nos conheceu", cupom).
5. **Indireto:** `max(0, realizado − base − direto)`. Valide com correlação
   investimento × contatos (D, D+1, D+2) e sazonalidade. Apresente em **faixa**.
6. **Taxas:** custo por contato novo, conversa → venda, custo por venda, ROAS.
7. **Questione** (`ceo-questionador`): houve data comemorativa, promoção, mudança
   de preço, outro canal ligado no período? Se sim, ajuste ou declare.

## Saída

```
📊 PLACAR — [cliente] — [período] (base: [janela])
Investido R$ … · Visitas/cliques … · Contatos novos … (base …) · Vendas … · R$ …
Aumento total: +R$ …   ├ Direto (confirmado): R$ …   └ Indireto (estimado): R$ … a R$ …
Custo por contato novo R$ … · Conversa→venda …% · ROAS …×
O que funcionou: … · O que mudar: … · Próximo teste: …
Confiança: [DIRETO-CONFIRMADO / INDIRETO-ESTIMADO / SEM DADO] e por quê
```

## Regras

- Nunca apresente indireto como certeza; nunca some indireto ao direto sem rótulo.
- Campanha de **tráfego/visita ao perfil** quase não gera atribuição direta —
  recomende código na bio/stories e uma campanha pequena de mensagens ao lado.
- Dado de conversa é pessoal (LGPD): use só agregado no relatório do cliente.
- Leitura no banco é somente SELECT; mudanças de estrutura só por migration
  revisada no repositório do sistema novo.
