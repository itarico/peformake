# Estudo: prospecção automática no Comercial

20/11/2026. Só leitura e pesquisa; nada alterado. Base: código, edge functions, banco e skills `captacao-clientes-trafego` e `varredura-nicho`.

## 1. O que já existe (pronto, mas nunca rodou)
- Tela `src/features/commercial/ProspectingPage.tsx` (buscas salvas, "Buscar agora", "Completar dados", quente/morno/frio, exportar, virar lead; "rodar todo dia" e "virar lead sozinho").
- Edge `prospect-run`: Google Places (New) Text Search, 20 por página, nota de oportunidade (sem site, poucas avaliações, nota < 4,2).
- Edge `prospect-enrich`: confere WhatsApp (Wasender `/api/on-whatsapp`), lê o site (pixel Meta, tag Google, botão WhatsApp, @Instagram), temperatura; quente + `auto_lead` → vira lead.
- Crons `prospect-daily` (7h Recife) e `prospect-enrich` (de hora em hora) ativos, mas há 1 busca ("Óticas"), 0 empresas.
- Funil: `member_lead_save` / `member_lead_convert` com `sourced_by` (comissão).
- Diagnóstico com IA (`consult-diagnosis`) só para cliente com Consultoria, não para prospect.
- **Pela metade**: busca sem cidade (`regionCode: 'BR'` → traria óticas do Brasil todo); não confirmado se o segredo `GOOGLE_PLACES_API_KEY` existe; sem anúncio ativo, Instagram ou CNPJ; sem fila de abordagem nem mensagem pronta; duas notas diferentes (busca × enriquecimento).
- App antigo (`src/components/sdr/SDRAIProspector.tsx`, raiz): pedia empresas ao GPT (dados podiam ser inventados). Não reaproveitar.
- Skill `captacao-clientes-trafego`: ICP, meta 400 contatos/mês (20/dia útil), Raio-X de 1 página, cadência de 14 dias com 7 toques, **nunca enviar sem aprovação, máx. 30 novos/dia por número**.

## 2. Fontes
| Fonte | O que dá | Custo |
|---|---|---|
| Google Places (New) | nome, telefone, site, nota, avaliações | 1.000 chamadas/mês grátis (≈ R$ 0 no volume) [preços](https://developers.google.com/maps/billing-and-pricing/pricing) |
| Meta `ads_library_search` (MCP já autorizado) | quem anuncia ativo = sinal de compra | grátis |
| Firecrawl/Alexandria (`firecrawl-maps` reviews/rating_trend, `adyntel` anúncios, `reclameaqui-com-br`, `scrapecreators` posts) | avaliações e taxa de resposta do dono, anúncios por domínio, reputação, frequência de posts | 2–10 créditos por consulta |
| CNPJ aberto ([Receita](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos), [BrasilAPI](https://brasilapi.com.br), [cnpj-sqlite](https://github.com/rictom/cnpj-sqlite)) | empresas novas por CNAE e cidade; conferir 1 CNPJ | grátis (carregar fora do Supabase) |
| Instagram Business Discovery (Graph API, conta da Peformake) | seguidores, nº de posts de conta comercial | grátis [limite não confirmado] |
Raspadores do Maps (ex.: gosom/google-maps-scraper, MIT) ferem os termos do Google: só plano B.

## 3. Automático × humano
- **Automático**: achar, enriquecer, pontuar, deduplicar, Raio-X, escrever mensagem e cadência, lembrar o próximo toque.
- **Humano**: o **envio** (regra do projeto). Limite 30 novos/dia por número, texto variado, sem link/preço na 1ª, saída "se não fizer sentido, me avisa". API oficial do WhatsApp não serve para abordagem fria (opt-in/template). Instagram: DM fria manual e pouca.
- **LGPD**: dado público de empresa com legítimo interesse; guardar a origem (`maps_url`); opt-out apaga; não cruzar sócios/pessoa física.
- **E-mail frio** (fase 3): domínio separado, SPF/DKIM/DMARC, aquecimento 2–4 semanas, 30–50/dia, descadastro em 1 clique.

## 4. Proposta
1. **Busca** nicho + bairro/cidade (corrigir `prospect-run` com `locationRestriction` ou cidade na consulta).
2. **Enriquecimento** + anúncio ativo (Meta/Adyntel) + Instagram + avaliações (só quentes).
3. **Nota única "chance de fechar" (0–100)**: ICP +20 · já anuncia +20 · anúncio parado +10 · sem pixel/sem site/nota < 4,2 +10 cada · tem WhatsApp +15 · Instagram parado +5 · sem telefone −30.
4. **Raio-X automático** (3 problemas, 3 ações, 1 número vs. concorrente do bairro) só para quentes.
5. **Fila de abordagem** (`prospect_outreach`): card com Raio-X + mensagem editável; SDR clica Enviar (Wasender), limite diário travado no servidor; cadência de 14 dias com aprovação a cada toque; opt-out = `nao_contatar`.
6. **Funil**: resposta → lead → negócio, com `sourced_by` (comissão). Painel: achados → quentes → abordados → responderam → reunião → fechados.
Rotinas: 7h busca · de hora em hora enriquecimento · 8h Raio-X · 8h30 fila do dia.
**Custo extra estimado < R$ 150/mês** para 400 contatos (Google ≈ 0; Firecrawl ≈ 2.250 créditos; IA ≈ US$ 8).

**Fases**: MVP 1–2 semanas (cidade na busca, nota única, anúncio ativo, fila com envio em 1 clique e limite, piloto óticas de Recife 20/dia) · Fase 2 Raio-X em PDF, cadência, painel · Fase 3 CNPJ novo por CNAE, Instagram, e-mail frio.

## Precisa do Italo ✋
1. Conferir/colar o segredo `GOOGLE_PLACES_API_KEY` no Supabase.
2. Qual número faz a prospecção (um separado protege o principal)?
3. Raio-X em PDF ou texto na conversa?
4. Envio um por um ou lote aprovado de uma vez (sempre com o limite de 30/dia)?
5. Nicho e bairro do piloto.
