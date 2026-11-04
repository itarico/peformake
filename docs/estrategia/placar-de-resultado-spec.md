# Placar de Resultado — especificação (v0.1, 04/11/2026)

Objetivo: para cada cliente, cruzar automaticamente **investimento → atenção →
conversas → vendas → R$** e separar o aumento **direto** (atribuído a um anúncio
ou ação específica) do **indireto** (crescimento acima da linha de base que não
tem etiqueta). É a Camada 1 da tese "Marketing com Recibo".

Princípio de arquitetura: **o dado é do cliente e da Peformake, não de uma tela.**
Tudo entra num modelo de dados aberto (Supabase/Postgres) por conectores
trocáveis; qualquer sistema (o app peformake-gestao, planilha, BI, IA) lê dali.

---

## 1. O que o banco do sistema novo já tem (verificado em 04/11/2026)

| Peça | Tabela | Situação |
|---|---|---|
| Conta de anúncio ligada ao cliente | `ad_accounts.client_id` | ✅ existe |
| Investimento, impressões, cliques, resultados por dia | `traffic_daily_metrics`, `traffic_entity_daily` | ✅ existe (Meta) |
| Campanhas/anúncios e objetivo | `traffic_entities` (`objective`, `campaign_id`) | ✅ existe |
| WhatsApp conectado por cliente | `whatsapp_accounts.client_id` | ✅ estrutura existe (hoje 1 conta) |
| Contato novo e data da 1ª mensagem | `wa_contacts.first_message_at`, `account_id` | ✅ existe |
| Mensagem bruta do provedor | `whatsapp_messages.raw` (jsonb) | ✅ existe — pode conter a referência do anúncio de clique-para-WhatsApp (verificar) |
| Intenção/resumo do contato por IA | `wa_contacts.ai_intent`, `ai_summary` | ✅ existe |
| Venda ligada a contato e cliente, com trecho da conversa e revisão humana | `crm_sales` (`client_id`, `contact_id`, `value_cents`, `source`, `excerpt`, `reviewed_by`) | ✅ estrutura existe (0 registros) |

**Verificação no banco (04/11/2026, somente leitura):**
- MF Máquinas: conta Meta ligada ao cliente; 8 dias de dados (26/10–02/11):
  R$ 74,47 investidos, 499 cliques (≈ R$ 0,15/clique); campanhas/objetivo ainda
  não sincronizados em `traffic_entities`; nenhuma conversão registrada como resultado.
- 12 clientes têm conta de anúncio ligada.
- WhatsApp: só 1 conta conectada (provedor Wasender, status "novo"), **sem
  cliente vinculado** — é a da agência. Nenhum WhatsApp de cliente conectado ainda.
- Das 2.619 mensagens, 3 trazem os campos `conversionSource`/`entryPointConversion`
  no `raw` — o provedor **entrega o sinal de origem** de conversas vindas de
  anúncio/ponto de entrada. Atribuição direta por anúncio é viável (confirmar o
  conteúdo exato num caso real de anúncio de clique-para-WhatsApp).

**Falta:** (a) origem de cada contato (de qual anúncio/canal veio), (b) visitas
ao perfil e dados orgânicos, (c) linha de base, (d) tabela de fatos diária, (e) o
cálculo direto × indireto, (f) telas e relatório.

---

## 2. Funil medido (por cliente, por dia)

```
INVESTIMENTO  →  ATENÇÃO            →  INTERESSE           →  CONVERSA          →  VENDA
spend (Meta,     impressões, alcance,  cliques, visitas ao   contatos novos no    vendas (qtd, R$),
Google)          views de vídeo        perfil, cliques no     WhatsApp do cliente  ticket, recompra
                                       link, rotas no Google  (1ª mensagem)
```

Taxas que o placar mostra: custo por visita ao perfil · custo por conversa nova ·
conversa → venda · custo por venda · ROAS (R$ vendido ÷ R$ investido) · ROI.

---

## 3. Atribuição: direto × indireto

### Direto (tem etiqueta)
Uma conversa/venda é **direta** quando conseguimos provar a origem por pelo menos
um destes sinais, em ordem de força:
1. **Referência do anúncio de clique-para-WhatsApp** na mensagem recebida
   (o WhatsApp envia o identificador do anúncio quando a conversa nasce de um
   anúncio de mensagem — confirmar se o provedor atual entrega isso em `raw`).
2. **Código na mensagem pré-preenchida** do link (`wa.me/55...?text=Oi! Vim pelo
   Instagram #MF01`) — um código por campanha/canal (bio, anúncio, QR do balcão).
3. **Resposta do bot/atendente** à pergunta "como nos conheceu?" (`ai_intent` /
   campo de origem).
4. **Cupom/código** usado na venda.

### Indireto (crescimento sem etiqueta)
Muitos clientes veem o anúncio, visitam o perfil e chamam dias depois **sem**
código — é exatamente o caso de campanha de **tráfego/visita ao perfil**, como a
da MF Máquinas. Para isso:

```
linha de base   = média de contatos novos (e vendas) por dia da semana nas
                  4–8 semanas ANTES da campanha (ou nos dias sem anúncio)
incremento total = realizado − linha de base
direto           = conversas/vendas com etiqueta (seção acima)
indireto         = max(0, incremento total − direto)
```

Validações (para não se enganar):
- **Correlação com defasagem:** investimento do dia D × contatos novos em D, D+1,
  D+2. Se não há relação, o "indireto" é provavelmente sazonalidade.
- **Controle de sazonalidade:** comparar com o mesmo período do ano/mês anterior
  e com datas comemorativas.
- **Teste de pausa (padrão ouro):** a cada trimestre, pausar 7 dias ou alternar
  semanas liga/desliga e medir a diferença. Combinar com o cliente antes.
- Sempre exibir **intervalo** ("entre R$ 4 mil e R$ 7 mil de aumento indireto"),
  nunca um número falso de precisão.

Etiqueta de confiança em cada número: **DIRETO-CONFIRMADO** (etiqueta) ·
**INDIRETO-ESTIMADO** (modelo) · **SEM DADO**.

---

## 4. Exemplo: MF Máquinas (ilustrativo — números HIPOTÉTICOS)

Situação: campanha com objetivo **tráfego para o perfil**; WhatsApp do cliente
ainda não conectado.

| Semana | Investimento | Visitas ao perfil | Contatos novos no WhatsApp | Com código #MF | Vendas | R$ vendas |
|---|---|---|---|---|---|---|
| Base (média 4 sem. antes) | R$ 0 | 120 | 18 | — | 4 | R$ 9.600 |
| Campanha | R$ 700 | 940 | 41 | 9 | 9 | R$ 21.300 |

Leitura do placar:
- Incremento total: +23 contatos, +5 vendas, **+R$ 11.700**.
- Direto (código #MF): 9 contatos → 2 vendas → R$ 4.800.
- Indireto estimado: 14 contatos → 3 vendas → **≈ R$ 6.900** (faixa conforme
  validação).
- Custo por contato novo incremental: R$ 30 · ROAS incremental: 16,7×.

Recomendações que o placar já gera para a MF:
1. Conectar o WhatsApp da MF no sistema (pré-requisito).
2. Colocar o link com código na bio e nos stories (#MF-BIO) e criar uma campanha
   pequena de **mensagem** (#MF-ADS) ao lado da de tráfego, para ter atribuição
   direta e comparar custo por conversa.
3. Registrar venda: a IA lê a conversa, sugere "venda de R$ X" em `crm_sales`
   com o trecho, e o atendente da MF confirma com um toque (status `reviewed`).
   Para vendas no balcão/telefone: lançamento rápido pelo portal ou planilha.

---

## 5. Modelo de dados proposto (rascunho — NÃO aplicado no banco)

```sql
-- 1) Origem de cada contato (direto)
alter table wa_contacts
  add column if not exists origin_channel text,      -- ads_ctwa | ads_code | bio | qr | organic | referral | unknown
  add column if not exists origin_ref text,          -- ad_id, código (#MF01), etc.
  add column if not exists origin_confidence text;   -- confirmed | declared | inferred

-- 2) Códigos de rastreio por cliente/campanha
create table if not exists tracking_codes (
  code text primary key,                 -- 'MF01'
  client_id uuid not null references clients(id),
  channel text not null,                 -- ads | bio | qr | partner | event
  campaign_id text,                      -- traffic_entities.campaign_id (opcional)
  created_at timestamptz default now()
);

-- 3) Fontes externas além da Meta (visitas ao perfil, Google, GA4...)
create table if not exists client_channel_daily (
  client_id uuid not null references clients(id),
  day date not null,
  source text not null,                  -- instagram_organic | google_business | ga4 | google_ads | tiktok
  metric text not null,                  -- profile_visits | website_clicks | calls | directions | sessions | spend_cents
  value numeric not null,
  primary key (client_id, day, source, metric)
);

-- 4) Linha de base por cliente
create table if not exists client_baselines (
  client_id uuid not null references clients(id),
  metric text not null,                  -- new_contacts | sales_count | sales_value_cents
  weekday int not null,                  -- 0..6
  value numeric not null,
  window_start date, window_end date,
  primary key (client_id, metric, weekday)
);

-- 5) Fatos diários do placar
create or replace view client_scoreboard_daily as
with spend as (
  select a.client_id, m.day, sum(m.spend_cents) spend_cents,
         sum(m.impressions) impressions, sum(m.clicks) clicks
  from traffic_daily_metrics m join ad_accounts a on a.id = m.account_id
  where a.client_id is not null group by 1,2
), contacts as (
  select w.client_id, (c.first_message_at at time zone 'America/Recife')::date day,
         count(*) new_contacts,
         count(*) filter (where c.origin_confidence = 'confirmed') new_contacts_direct
  from wa_contacts c join whatsapp_accounts w on w.id = c.account_id
  where not c.is_group and w.client_id is not null group by 1,2
), sales as (
  select client_id, sale_date day, count(*) sales_count, sum(value_cents) sales_value_cents
  from crm_sales where status in ('confirmed','reviewed') group by 1,2
)
select coalesce(s.client_id, c.client_id, v.client_id) client_id,
       coalesce(s.day, c.day, v.day) day,
       s.spend_cents, s.impressions, s.clicks,
       c.new_contacts, c.new_contacts_direct,
       v.sales_count, v.sales_value_cents
from spend s
full join contacts c on c.client_id = s.client_id and c.day = s.day
full join sales v on v.client_id = coalesce(s.client_id, c.client_id)
                 and v.day = coalesce(s.day, c.day);
```

Notas: confirmar valores reais de `crm_sales.status` e o formato de
`whatsapp_messages.raw` antes de aplicar; aplicar via migration no repositório
do sistema novo, com revisão de RLS (só staff do cliente/admin lê).

---

## 6. Conectores (para não ficar preso a um sistema)

| Fonte | Como entra | Situação |
|---|---|---|
| Meta Ads | sync atual (`traffic_*`) | ✅ |
| WhatsApp do cliente | provedor atual por `whatsapp_accounts` | ✅ estrutura; conectar por cliente |
| Instagram orgânico (visitas ao perfil, cliques no link) | Windsor.ai (`instagram`) ou Graph API → `client_channel_daily` | a fazer |
| Google Meu Negócio (ligações, rotas, cliques no site) | Windsor.ai (`google_my_business`) → `client_channel_daily` | a fazer |
| Google Ads / GA4 | Windsor.ai → `client_channel_daily` | a fazer |
| Vendas fora do WhatsApp (PDV, iFood, planilha) | Google Sheets / importação CSV / webhook → `crm_sales` (`source`) | a fazer |
| Gastromake (pedidos diretos) | webhook → `crm_sales` (`source = gastromake`) | futuro |
| Saída | view `client_scoreboard_daily` → portal, relatório WhatsApp, IA, planilha/BI | a fazer |

---

## 7. Entregas para o cliente

- **Portal:** placar do mês com o funil, direto × indireto (com faixa), melhor
  anúncio/criativo, comparação com a linha de base.
- **WhatsApp toda segunda:** 4 linhas — investido, conversas novas, vendas, R$,
  e 1 recomendação.
- **Reunião mensal:** o placar é a pauta (alimenta `ceo-retencao` e a Camada 2
  de remuneração variável).

---

## 8. Plano de implementação (sistema novo)

| Fase | O quê | Pronto quando |
|---|---|---|
| 0 (1 sem.) | Conectar WhatsApp de 3 clientes piloto (MF Máquinas + 2 de gastronomia); criar códigos de rastreio; medir linha de base | 3 clientes com contatos novos entrando por `account_id` |
| 1 (2–3 sem.) | Colunas de origem + `tracking_codes` + leitura do código/referência de anúncio na mensagem | ≥ 60% dos contatos novos com origem |
| 2 (2 sem.) | IA sugere venda a partir da conversa → `crm_sales` com revisão de 1 toque | ≥ 80% das vendas do WhatsApp registradas |
| 3 (2 sem.) | View do placar + cálculo direto × indireto + tela no portal | placar visível para os 3 pilotos |
| 4 (2 sem.) | Windsor.ai: Instagram orgânico + Google Meu Negócio | visitas ao perfil no placar |
| 5 | Relatório semanal automático no WhatsApp; expandir para todos os clientes | 100% dos recorrentes com placar |

Riscos: o provedor de WhatsApp não entregar a referência do anúncio (mitigação:
código na mensagem); equipe do cliente não confirmar vendas (mitigação: IA sugere
e lembra; meta de 80% antes de usar em remuneração); LGPD (contrato de operador
com o cliente, dados de conversa só para finalidade de atendimento e mensuração).
