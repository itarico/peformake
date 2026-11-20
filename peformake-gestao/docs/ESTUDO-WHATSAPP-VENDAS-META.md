# Estudo: ler o WhatsApp do cliente, achar a venda do anúncio e devolver para a Meta

20/11/2026. Pesquisa na doc do Wasender (só leitura, via MCP), da Meta e do WhatsApp. Nada conectado nem alterado.
Objetivo: cliente com tráfego ativo → ler o WhatsApp dele (sem disparo) → saber de qual anúncio veio a conversa →
marcar a venda (e o valor) → devolver para a Meta otimizar → CRM só leitura no portal.

## Resumo
| Caminho | Custo/cliente | Dado do anúncio | Devolver venda à Meta | Risco |
|---|---|---|---|---|
| **Wasender** (o que já usamos) | US$ 4,50–6 (~R$ 25–33) no plano Business (10 sessões US$ 45) | provável, no objeto bruto `message...contextInfo.externalAdReply` (**testar**) | só pelo "atalho do pixel" (não oficial) | ban do número (não oficial) |
| **Própria (Evolution/WAHA/Baileys na nossa VPS)** | US$ 5–20/mês para todos (estimativa) | sim (`externalAdReply`: `sourceId`, `ctwaClid`) | só atalho | mesmo do Wasender + a operação é nossa |
| **Oficial: Cloud API com coexistência** | R$ 0 para ler | sim, documentado (`referral.source_id`, `ctwa_clid`) | **sim, oficial (CAPI Business Messaging, `Purchase` com valor)** | baixo; exige aprovação da Meta |

**Recomendação**: Fase 1 com o Wasender (já temos, QR dentro do sistema) para começar a ler e marcar vendas; Fase 2 migrar
para a coexistência oficial (custo zero e devolução oficial). Conexão própria só compensa com 15–20+ clientes e não resolve a devolução oficial.

## Wasender (o que dá para fazer já)
- **QR dentro do sistema: sim.** `POST /api/whatsapp-sessions` (cria; `read_incoming_messages=false`, `webhook_url`) →
  `POST /api/whatsapp-sessions/{id}/connect` → `GET /api/whatsapp-sessions/{id}/qrcode` (texto; o sistema desenha o QR).
  Webhooks `qrcode.updated` e `session.status`. [Create](https://wasenderapi.com/api-docs/sessions/create-whatsapp-session) ·
  [QR](https://wasenderapi.com/api-docs/sessions/get-whatsapp-session-qr-code) · [Connect](https://wasenderapi.com/api-docs/sessions/connect-whatsapp-session)
- **Dado do anúncio**: o exemplo oficial de `messages.received` não mostra; o campo `message` parece o objeto bruto do WhatsApp Web,
  onde fica `contextInfo.externalAdReply` (`sourceId` = anúncio, `ctwaClid`, `sourceUrl`). **Testar com 1 clique real num anúncio.**
  Hoje nosso código não lê esses campos.
- Preço: Basic US$ 6 (1 sessão) · Pro 15 (3) · Plus 30 (6) · Business 45 (10). Sem plano só de leitura. [pricing](https://wasenderapi.com/pricing)

## Oficial: coexistência (destino)
- O número continua no **app WhatsApp Business** e as conversas sincronizam com a API; histórico de até 6 meses (pedir em 24 h).
  Exige a Peformake como **Tech Provider**, conexão do cliente pelo **Embedded Signup v4**, app 2.24.17+.
  [doc](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users.md)
- Receber mensagem não é cobrado ([pricing](https://developers.facebook.com/docs/whatsapp/pricing)).
- Webhook traz `referral` com `source_id`, `ctwa_clid`, `headline` ([referência](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/text.md)).
- Não passam: grupos, ligações, catálogo. Brasil na coexistência: [não confirmado].

## Devolver a venda (Conversions API para Business Messaging)
- Evento `Purchase` com `action_source=business_messaging`, `messaging_channel=whatsapp`, `user_data.ctwa_clid` e
  `whatsapp_business_account_id`, valor e moeda em `custom_data`. [doc](https://developers.facebook.com/docs/marketing-api/conversions-api/business-messaging)
- Exige dataset ligado à WABA e permissões `whatsapp_business_management` + `whatsapp_business_manage_events` (App Review).
  **Número só no Wasender/Evolution não tem WABA** → só o "atalho do pixel" (`ctwa_clid` para `/{PIXEL_ID}/events`), não documentado pela Meta.
- Otimização por compra vale para anúncios **Clique para WhatsApp/Messenger**. Mandar até 7 dias após a venda; nós evitamos duplicar.

## Como vai funcionar no sistema (proposta)
1. Portal do cliente → "Conectar WhatsApp" → QR na tela (Wasender), aceite LGPD (só leitura, sem disparo).
2. Cada conversa nova guarda a origem: anúncio (ID, campanha, `ctwa_clid`) ou orgânico; casa o ID com `traffic_entities` (já lemos a Meta).
3. Venda: botão "Vendeu" (valor) para o atendente + sugestão automática quando a conversa tem pix/comprovante/"fechado" (confirmação humana).
4. Envio da venda à Meta (fase 1: atalho do pixel, como experimento; fase 2: CAPI oficial).
5. CRM do cliente (portal): conversas por origem, vendas, valor, taxa de fechamento, anúncios que mais vendem.
6. Relatório de tráfego passa a mostrar "vendas pelo WhatsApp" por campanha.

## Precisa do Italo ✋
1. OK para a Fase 1 com o Wasender (≈ R$ 25–33/cliente/mês no plano Business) e qual cliente-piloto.
2. Fazer 1 clique real num anúncio Clique-para-WhatsApp do piloto para confirmarmos que o Wasender traz o anúncio de origem.
3. Começar o processo da Meta (Tech Provider + App Review) para a Fase 2.
4. Texto do aceite LGPD no contrato/portal.
5. Venda: só botão, ou botão + sugestão automática?
