# Estudo: MCPs e APIs para a Peformake

Atualizado em 05/11/2026. "MCP" é conector para o Claude trabalhar direto na ferramenta. "API" é integração do próprio sistema (roda sozinha, sem o Claude).
Preços e limites mudam: confira no site de cada um antes de contratar.

## 1. Já conectado e funcionando

| Ferramenta | Tipo | Para que usamos |
|---|---|---|
| Meta Ads (3 contas: principal, F5, Acácia) | MCP oficial | Ler campanhas, relatórios, estratégia. Mudanças só com aprovação no quadro. |
| TikTok Ads | MCP oficial | Leitura de campanhas TikTok. |
| Supabase | MCP | Banco, funções e migrações do sistema. |
| Vercel | MCP | Publicar o sistema e ver erros em produção. |
| Wasender | MCP + API | WhatsApp por QR code (agente, régua de cobrança, CRM do cliente). Não oficial: confirmar cada envio manual. |
| Reportei | MCP | Relatórios de clientes que ainda usam Reportei. |
| Instagram (orgânico) | MCP | Publicações e métricas por API oficial. |
| Google Drive, Agenda, Gmail, Planilhas | MCP | Pastas de clientes, agenda de gravação, e-mails. |
| Firecrawl | MCP | Pesquisa e leitura de sites (varredura de nicho, concorrentes). |
| Canva, Figma, Gamma | MCP | Criativos, design e apresentações. |
| Stripe | MCP | Disponível, mas não é o gateway principal (Asaas é). |

## 2. APIs que o sistema já tem pronto (falta só a chave)

| API | Grátis? | O que libera | Segredo no Supabase |
|---|---|---|---|
| Asaas | Sem mensalidade; paga por cobrança recebida. Pix para terceiros com cota grátis mensal para PJ | Cobrança com link (Pix, boleto, cartão), aviso de pagamento, repasse diário Ellcazo | `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` |
| Mercado Pago | Sem mensalidade; taxa por venda | Gateway alternativo (troca em Financeiro > Cobrança) | `MP_ACCESS_TOKEN` |
| Assinafy | 10 documentos/mês grátis, depois R$ 1 cada | Contrato com assinatura eletrônica | `ASSINAFY_API_KEY`, `ASSINAFY_ACCOUNT_ID`, `CONTRACT_WEBHOOK_SECRET` |
| Resend | 3.000 e-mails/mês grátis (100/dia) | E-mail de aviso e convite de acesso | `RESEND_API_KEY` + domínio verificado |
| Google Places (Maps) | Cota mensal grátis do Google Maps Platform; depois cobra por busca | Prospecção diária de empresas | `GOOGLE_PLACES_API_KEY` |
| Wasender (token pessoal) | Plano por sessão | Cliente conecta o WhatsApp dele pelo portal | `WASENDER_PAT` |

## 3. Vale conectar (por ordem de impacto)

1. **Google Ads API (oficial)** – precisa de developer token aprovado (conta MCC). Destrava relatório e estratégia de Google igual ao da Meta. A skill `google-ads-api-mcp-setup` já está instalada para guiar.
2. **Google Analytics 4 (Data API)** – grátis. Mostra no relatório o que acontece depois do clique (site, conversão).
3. **Meta Conversions API (CAPI)** – grátis. Manda para a Meta as vendas confirmadas no sistema (crm_sales e faturas pagas), o que melhora a otimização dos anúncios. Muito recomendado.
4. **WhatsApp Business oficial (Cloud API)** – a Meta cobra por conversa, mas não bloqueia número. Indicado para o número principal da Peformake e para a régua de cobrança. O MCP "WhatsApp Business" já aparece disponível.
5. **Google Business Profile API** – avaliações e postagens do Google Meu Negócio dos clientes (serviço vendável: "gestão de perfil no Google").
6. **Cloudflare R2** – 10 GB grátis, sem custo de saída. Hospedar os vídeos para revisão por minutagem dentro do portal (hoje o portal abre o link do vídeo).
7. **Cora** – só com o plano CoraPro (R$ 44,90/mês) e certificado. Hoje o Pix para a Cora sai pelo Asaas, então não é urgente.
8. **Banco da Peformake (Open Finance ou extrato OFX)** – o sistema já importa OFX/CSV. Automação total depende do banco (Asaas e Cora têm API de extrato).
9. **YouTube Data API** – grátis com cota. Para clientes com canal (o projeto do canal YouTube também usa).
10. **Pinterest e LinkedIn Ads** – só se entrar cliente que anuncia lá.

## 4. MCPs que valem instalar no Claude

| MCP | Para que | Observação |
|---|---|---|
| Google Ads (oficial) | Ler e propor mudanças no Google Ads | Depende do developer token. |
| GA4 / Search Console | SEO e site dos clientes | Grátis. |
| Notion ou Linear | Não precisa: o sistema já tem quadro e tarefas | Evitar ferramenta duplicada. |
| Supermetrics / Windsor | Não usar: decisão sua de não depender de Windsor | Os dados vêm direto dos MCPs oficiais. |
| GTM (Google Tag Manager) | Conferir pixel e tags dos clientes | Já aparece na lista, precisa autorizar em /mcp. |
| Metricool | Agenda de posts | Já aparece na lista, precisa autorizar em /mcp. |

## 5. App de verdade (além do PWA)

- **Capacitor (Ionic)**: transforma este mesmo sistema em app Android e iPhone, publicável nas lojas, com notificação no celular e câmera. Não reescreve as telas. Skill `capacitor-best-practices` instalada.
- **Tauri**: app para Windows e Mac (opcional). Skill `tauri-v2` instalada.
- Precisa: Android Studio (Android), Mac com Xcode (iPhone), conta Google Play (US$ 25 uma vez) e Apple Developer (US$ 99/ano).

## 6. Cuidados

- Nenhuma chave fica no código: tudo em Segredos do Supabase.
- WhatsApp não oficial (Wasender) pode ser bloqueado: usar número novo para automação.
- Prospecção: só dados públicos de empresa (Google Maps). Nada de raspar comentários de pessoas físicas (LGPD).
