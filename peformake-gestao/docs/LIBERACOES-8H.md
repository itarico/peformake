# O que liberar às 8h (na ordem)

Tudo foi implementado, testado e está em commits na branch `trafego-completo` (último: veja `git log -1`).
Nada foi aplicado no banco nem publicado durante a noite: o modo automático bloqueou essas ações.
As 14 migrações novas foram testadas recriando o banco do zero num Postgres local (70 de 70 rodaram, e as funções foram chamadas uma a uma).

## 1. Deixar o Claude aplicar e publicar (2 minutos)

No computador, num terminal com `claude`, rode `/permissions` e libere:
- `mcp__supabase__apply_migration`
- `mcp__supabase__deploy_edge_function`
- o comando `npx vercel deploy --prod --yes --scope peformake`

Ou desligue o modo automático nesta sessão: aí cada ação vira um pedido de aprovação.
Depois é só me dizer "pode aplicar tudo" que eu faço os passos 2, 3 e 5.

## 2. Migrações (eu aplico, nesta ordem)

1. `20261105180000_access_invites.sql`: convites de acesso e nível por área. Muda a criação de conta nova: testado.
2. `20261105190000_finance_core.sql`: Financeiro (Peformake e Ellcazo), lançamentos, extrato, fechamento.
3. `20261105200000_billing.sql`: cobrança, régua D-1 a D+7, sinal e entrega Ellcazo, repasse Pix. Também padroniza 4 descontos em % importados.
4. `20261105210000_team.sql`: Equipe, Meus leads, comissões, sociedade, metas, cargo Parceiro.
5. `20261105220000_contracts_portal.sql`: contratos (Assinafy) e portal completo.
6. `20261105230000_prospecting.sql`: prospecção pelo Google Maps.
7. `20261105240000_site.sql`: formulário e vitrine da página inicial.
8. `20261105250000_finance_whatsapp.sql`: lançar gasto pelo WhatsApp.
9. `20261105260000_goals_team_overview.sql`: metas do tráfego com progresso, resumo da equipe e destaque do mês.
10. `20261105270000_social_media.sql`: área de Social Media (quadro, novidades, sugestões, contas, estratégia e relatório).
11. `20261105280000_wa_contacts_profile.sql`: foto, nome verificado e recado dos contatos; registro das respostas pelo sistema.
12. `20261105290000_prospect_enrich.sql`: lead quente (WhatsApp, pixel, Instagram) e envio automático para Meus leads.
13. `20261105300000_strategy_frameworks.sql`: biblioteca de 47 frameworks e base do cliente.
14. `20261105310000_methodology.sql`: metodologia por nicho, estudo trimestral, rotina de retenção e página de venda por nicho.

Tudo de automático nasce DESLIGADO (cobrança, lembretes, repasse, assinatura, prospecção diária).

## 3. Funções do servidor (eu publico)

| Função | Precisa de login? |
|---|---|
| `billing-gateway` | sim (o código confere admin ou o segredo do agendador) |
| `billing-webhook` | **não** (verify_jwt desligado; confere o token do gateway) |
| `contract-sign` | sim |
| `contract-webhook` | **não** (verify_jwt desligado; confere o segredo na URL) |
| `prospect-run` | sim (o código confere cargo ou o segredo do agendador) |
| `prospect-enrich` | sim (o código confere cargo ou o segredo do agendador) |
| `wa-enrich` | sim (o código confere cargo ou o segredo do agendador) |
| `wa-send` | sim (só comercial; cada envio é um clique de uma pessoa e fica registrado) |

Rotinas do agente na nuvem que ainda precisam ser criadas (com seu ok): `social-media-agente` (toda segunda), `estrategia-frameworks` (quando houver pedido) e `estudo-nicho-trimestral` (1º dia do trimestre). As instruções estão em `.claude/skills/`.

## 4. Chaves que só você coloca (Supabase > Edge Functions > Secrets)

Nunca me mande a chave no chat: cole direto no Supabase.

| Segredo | De onde vem | Libera |
|---|---|---|
| `ASAAS_API_KEY` | Asaas > Integrações > Chave de API (comece pela do sandbox) | Cobrança com link e repasse |
| `ASAAS_WEBHOOK_TOKEN` | Você inventa um texto longo e cola no Asaas também | Aviso de pagamento |
| `MP_ACCESS_TOKEN` | Mercado Pago > Credenciais (opcional) | Gateway alternativo |
| `ASSINAFY_API_KEY` e `ASSINAFY_ACCOUNT_ID` | Assinafy > Configurações > API | Contrato com assinatura |
| `CONTRACT_WEBHOOK_SECRET` | Você inventa um texto longo | Aviso de assinatura |
| `GOOGLE_PLACES_API_KEY` | Google Cloud > APIs > Places API (New) | Prospecção |
| `RESEND_API_KEY` | Resend (e verificar o domínio do remetente) | E-mails e convites |
| `WASENDER_PAT` | Wasender > Personal Access Token | WhatsApp do cliente pelo portal |

## 5. Publicar o site e o sistema (eu publico)

`npx vercel deploy --prod --yes --scope peformake`. Isso coloca no ar:
- tela Operação, Financeiro e Cobrança;
- Equipe;
- Prospecção;
- página inicial pública;
- portal novo;
- carregamento mais rápido.

## 6. Cadastros nos painéis de fora (você)

- **Asaas > Webhooks**: URL `https://wkkzcjnxyylrqoolmmhi.supabase.co/functions/v1/billing-webhook?g=asaas`, token igual ao `ASAAS_WEBHOOK_TOKEN`, eventos de cobrança (pagamento recebido e confirmado).
- **Assinafy > Webhooks**: URL `https://wkkzcjnxyylrqoolmmhi.supabase.co/functions/v1/contract-webhook?k=<CONTRACT_WEBHOOK_SECRET>`, eventos `signer_signed_document` e `document_ready`.
- **Mercado Pago** (se usar): o aviso já vai no link de cada cobrança.

## 7. Ligar o que quiser (no sistema)

- **Financeiro > Cobrança > Configurar**:
  - gateway e ambiente;
  - gerar mensalidades sozinho;
  - criar link sozinho;
  - lembretes no WhatsApp;
  - repasse Ellcazo (chave Pix e percentual).
- **Integrações > Contratos**: ligar, quem assina pela Peformake, modelos.
- **Equipe > Regras do time**: percentuais de comissão, receita mínima da sociedade, metas.
- **Financeiro > Lançar pelo WhatsApp**: números autorizados.
- **Comercial > Prospecção**: criar as buscas (ex.: "ótica em Recife").
- **Clientes**: marcar "mostrar no site" nos clientes que autorizaram aparecer na página inicial.

## 8. Testar em 5 minutos depois de publicar

1. Abra `/` sem login: deve aparecer o site. Mande um pedido de teste pelo formulário. Ele cai em Comercial > Prospecção.
2. Em Financeiro > Cobrança, clique em "Gerar mensalidades do mês" e confira os valores.
3. Com o Asaas em sandbox, crie um link de pagamento numa fatura e pague no sandbox. A fatura deve virar "Pago" sozinha.
4. Em Acessos, convide um e-mail seu de teste. Ao entrar com ele, a conta já deve estar liberada.

## 9. Quando tiver o domínio

- Trocar no `index.html` o `noindex, nofollow` por `index, follow`.
- Definir `VITE_SITE_INDEXABLE=true` e `VITE_SITE_WHATSAPP=55819...` (número do botão do site) na Vercel.
- Trocar o `public/robots.txt` para liberar o site e bloquear só as áreas internas.

## 10. Decisões que ainda são suas

- Percentual da comissão por trazer cliente (começa em 5% por 12 meses, como no estudo) e regra da sociedade (começa em R$ 5 mil/mês por 3 meses).
- Modelo de parceria da Tiffany (cargo "Parceiro" já existe).
- Quem pode lançar gasto pelo WhatsApp.
- Banco da Peformake (o extrato OFX/CSV já importa).
- Logo da Ellcazo.
- App nas lojas (Capacitor): quando quiser começar.
