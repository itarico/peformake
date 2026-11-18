# Radar do momento + calendário + inteligência de mercado (desenho técnico)

18/11/2026. Estudo e especificação. **Implementação de banco e rotina = fase 2** (abaixo, o que já dá para usar hoje).
Liga-se ao `PROMPT-ROTEIRO-MASTER.md` (etapas 1 e 2) e ao estudo `ESTUDO-ROTEIRO-AUDIOVISUAL.md` §12.

## 1. Fontes do "o que chama atenção agora" (por nicho do cliente)

| Fonte | O que traz | Como puxar hoje | Dá? |
|---|---|---|---|
| **TikTok Creative Center** (hashtags, músicas, criadores e anúncios em alta por país/setor; Top Ads) | formatos e sons subindo; anúncios que rodam | Firecrawl (scrape da página pública; pode exigir login para filtros) | parcial |
| **Google Trends** (região Pernambuco/Recife, assuntos relacionados) | buscas em alta, sazonalidade | Firecrawl scrape de trends.google.com (sem API oficial); provedores do Alexandria quando houver | parcial |
| **Instagram Reels** (áudios e formatos em alta) | sons e formatos | sem API pública de tendências; Firecrawl/scrapecreators (`instagram/search-reels`, `user-posts`) já usados na coleta | parcial |
| **YouTube em alta / Shorts** | temas e formatos | Firecrawl + YouTube Data API (se houver chave) | sim |
| **Biblioteca de Anúncios da Meta** dos concorrentes (anúncios ativos, tempo no ar, variações, ofertas) | o que dá dinheiro (anúncio ativo há 30+ dias = lucrativo, MDD) | conector Meta Ads `ads_library_search` (leitura) + Firecrawl em facebook.com/ads/library | sim |
| **Notícias do setor** | gatilhos de newsjacking (janela 48 h) | `firecrawl_search` com `sources:["news"]` | sim |
| **Reddit / fóruns / grupos** | dores e linguagem real | Firecrawl search (Reddit, fóruns de obra/saúde etc.); grupos fechados não | parcial |
| **Reclame Aqui** | reclamações do nicho e dos concorrentes | Firecrawl scrape | sim |
| **Comentários** dos perfis do cliente e dos concorrentes | perguntas e objeções reais | scrapecreators/Firecrawl (`client_scan`) | sim |
| **WhatsApp do sistema** | perguntas que estão crescendo (cliente final) | `whatsapp_messages` via `whatsapp_accounts.client_id` (contar termos por semana) | sim, quando o cliente tem número conectado |
| **Dados próprios** | o que performa no cliente | `traffic_entity_daily`, `social_metrics_daily` | sim |

Não dá hoje: API oficial de tendências do Instagram; filtros logados do Creative Center sem conta; grupos privados.

## 2. Calendário (antecipar com tempo de produção)
**O sistema já tem:** `seasonal_dates` (39 datas: chave, nome, mês/dia ou regra, nichos, ideia, `lead_days`),
`client_dates` (datas do cliente), `seasonal_skips` e a função `seasonal_board(_days, _client_id)` (tela Conteúdo →
Datas, `SeasonalPage`). As "Novidades" de redes (`social_news`) hoje vão para a Bete (tela desligada desde 12/11).
**Reaproveitar:** o motor lê `seasonal_board(120, cliente)` (ou `seasonal_dates` + `client_dates` direto quando
rodar sem login) e usa `lead_days` + o tempo de produção do formato:

| Formato | Antecedência para gravar (antes da publicação) |
|---|---|
| Celular / trend / react | 1–3 dias |
| Talking head, tutorial, esquete simples | 7–10 dias |
| Diária Ellcazo (cinemático, mini-doc, entrevista) | 15–30 dias (estratégia pronta até o dia 15 do mês anterior) |

**A completar em `seasonal_dates` (fase 2, só cadastro):** construção (Dia do Engenheiro 11/12 e do Arquiteto 15/12 já
existem; faltam Dia do Pedreiro, Dia do Encanador, Dia da Construção Civil, chuvas de inverno em Recife abr–jul, verão
e falta d'água dez–fev, fim de obra antes das férias coletivas em dezembro, volta em janeiro); saúde (meses coloridos:
Janeiro Branco, Março Lilás, Abril Azul, Maio Amarelo, Junho Vermelho, Agosto Dourado, Setembro Amarelo, Outubro
Rosa, Novembro Azul); Recife/PE (Carnaval, São João, Réveillon, aniversário do Recife 12/03, Data Magna de PE 06/03);
varejo (Dia do Consumidor, Mães, Namorados, Pais, Crianças, Black Friday, Natal).

## 3. Critérios para uma tendência virar ideia de roteiro (nota 0–5 cada)
1. **Aderência** à persona e à marca (peso 2).
2. **Janela de vida** × **tempo de produção** (trend de dias só com celular; evergreen dura meses).
3. **Risco de imagem** (brand safety: política, tragédia, polêmica de tribo = 0).
4. **Potencial** alcance × conversão para o objetivo do mês.
5. **Originalidade da adaptação** (nunca a trend crua).
Nota = (2×aderência + resto) ÷ 3. **Mínimo 7**; risco de imagem ≤ 2 elimina. Cada ideia diz se é **do momento**
(com validade em dias) ou **perene**.

## 4. Inteligência de performance e mercado
- **Tráfego próprio:** por anúncio (`traffic_entities` nível `ad` + `traffic_entity_daily`): custo por resultado,
  CTR, frequência (impressões ÷ alcance), gasto sem resultado, tendência das últimas 2 semanas × anteriores (fadiga =
  CTR caindo e frequência subindo). Classificar em **mais / menos / nenhum resultado**. Ruim ou cansado →
  **criativo substituto** com roteiro pronto (pipeline completo, 3–5 ganchos) e diagnóstico (gancho fraco = hook rate
  baixo; promessa não cumprida = hold baixo; oferta = CTR bom e conversão ruim; público = custo alto com criativo
  bom). Vai como **sugestão** (Estratégia/Tráfego); nada muda na Meta sem aprovação.
- **Concorrência em camadas** (Recife, PE, Brasil, mundo): Biblioteca de Anúncios (ativos, tempo no ar, variações,
  ofertas: preço, condição, garantia, bônus), Creative Center Top Ads, perfis e sites. **Engenharia reversa** de cada
  boa referência: gancho, batidas, prova, oferta, CTA, linguagem, mecanismo psicológico → **adaptar, nunca copiar**.
- **Sair da bolha:** ≥ 1 referência por mês de fora do nicho e de outra rede (YouTube, TikTok, Pinterest, X,
  LinkedIn, Kwai, publicidade premiada como Cannes Lions, campanhas virais), com a pergunta "o que a marca X de outro
  setor fez que funcionaria para este cliente?" e a explicação de por que funciona com o público local.

## 5. Rotina (fase 2)
- **Semanal (quinta, modelo leve):** por nicho ativo, varrer as fontes da §1 (até N buscas por nicho, com cache em
  `trend_cache`, que já existe: `capability`, `query`, `month`, `data`, `credits`), pontuar pela §3 e gravar um
  **radar por cliente** com itens pontuados e validade. Proposta de tabela: `client_radar(id, client_id, week,
  kind: tendencia|data|concorrente|performance|pergunta, title, summary, source_url, score, valid_until,
  status: novo|usado|descartado)`.
- A geração de estratégia/roteiro lê o radar do mês + o calendário (etapa 1 do prompt mestre).
- **Relâmpago (newsjacking, janela 48 h):** vira **sugestão** para o Italo aprovar (aviso sem alarde, regra de
  ouro: só urgente pisca), nunca publica sozinho.
- Entrada em `automation_catalog` quando a rotina existir (regra do CLAUDE.md).

## 6. O que já dá para usar hoje (sem código novo)
`seasonal_board`, `client_scan`, `trend_cache`, conector Meta Ads (`ads_library_search`, leitura), Firecrawl
(search, scrape, news), consultas da etapa 0 do prompt mestre. O agente da rotina faz o radar "na mão" a cada geração
(até 5 buscas, como já está na rotina dos cards) e grava em `client_scan` com `source`='radar'.
