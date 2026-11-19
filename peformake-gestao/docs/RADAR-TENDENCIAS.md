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
Trend aprovada entra pelo **protocolo "trend como gancho"** (`MOTOR-ROTEIRO.md`): só o gatilho de reconhecimento
abre o vídeo; o resto é conteúdo do cliente que converte. Assunto grande (lançamento, final, evento) passa pela
**análise de hype** (§7).

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

## 7. Análise de hype do momento (matriz)

Protocolo completo em `MOTOR-ROTEIRO.md`. A matriz roda **uma vez por hype** para a carteira inteira (modelo leve) e
grava em `client_scan` (`source`='hype', um registro por cliente candidato). Notas 0–5:

| Critério | Pergunta | Peso |
|---|---|---|
| Público | a persona do cliente está no público do hype? | 2 |
| Ponte | existe frase natural que liga o hype à dor/oferta? | 2 |
| Benefício | traz alcance, identificação, autoridade ou venda para a meta do mês? | 1 |
| Janela | dá para produzir antes do pico passar? | 1 |
| Risco | marca, direito, classificação etária, imagem (5 = sem risco) | 1 |
Nota = soma ponderada ÷ 3,5 (vai a 0–10). **Fazer ≥ 8 · Adaptar 6,5–7,9 · Não fazer < 6,5.** Risco ≤ 2 elimina.
Ponte = 0 elimina (hype sem ponte vira "trend crua").

### Exemplo resolvido: lançamento do GTA 6 (19/11/2026)
1. **O que é e por que está em alta:** *Grand Theft Auto VI*, da Rockstar, com lançamento marcado para 19/11/2026
   (data anunciada em 06/11/2025, depois de dois adiamentos; só PS5 e Xbox Series no lançamento). É o jogo mais
   esperado da década: 13 anos depois do GTA V, cenário inspirado em Miami ("Vice City"), dupla de protagonistas em
   estilo "Bonnie e Clyde", estética neon rosa/ciano e anos 80. Fontes: TechRadar e GamesRadar (§31 do ESTUDO).
2. **Público do hype:** núcleo de homens 16–40 que jogam; anel amplo de quem consome cultura pop e memes (a "semana
   em que ninguém sai de casa", o amigo que sumiu, a namorada "viúva de GTA"). Classificação 18 anos.
3. **Clientes candidatos** (carteira ativa em 19/11/2026, cruzando `clients.target_audience`):

| Cliente (nicho) | Persona × hype | Ponte com a oferta | Nota | Decisão |
|---|---|---|---|---|
| **Brio Burguer** (delivery, 18–35, jovem) | núcleo do hype | "noite de lançamento ninguém cozinha nem sai do sofá" = pedido de delivery | **9,0** | **Fazer** |
| **Peformake** (donos de PME) | anel amplo | caso famoso → princípio: 13 anos sem lançar e o mundo esperando; como criar espera para o seu negócio (S44) | 7,8 | Adaptar (autoridade, sem vender) |
| **Cajá Limão / Tardezinha** (bar, 25–45, grupos de amigos) | anel amplo | "o amigo que sumiu desde o lançamento": missão de tirar o grupo do sofá para o happy hour | 7,4 | Adaptar (fim de semana 28–30/11) |
| **Will Motos** (motos, quem quer autonomia) | núcleo parcial | linguagem de "missão" para a 1ª moto própria, sem fuga, racha ou direção perigosa | 6,9 | Adaptar (só story/celular; risco de trânsito) |
| **Auto Nunes** (automotivo) | [a confirmar: persona vazia] | "no jogo o carro conserta em 2 s; na vida real, revisão" | 6,6 | Adaptar só se o portão confirmar público jovem |
| Raph Modas, MD Prime Moda, F5 Multimarcas (moda) | [a confirmar] | a **estética** Vice City (neon, anos 80, Miami) sem citar o jogo | 6,0 | Não fazer o hype; a estética pode entrar como tendência perene |
| 3LM (tecnologia) | [a confirmar: o que vende] | só se vender PC/console/conserto | — | Pendente (portão) |
| Fornario (pizzaria premium, 26–55) | fraco | ponte forçada; posicionamento premium | 5,0 | Não fazer |
| Restaurante do Vando, APM/CMR (famílias, escola) | público com crianças | jogo 18+ em marca de família e escola | risco 1 | Não fazer |
| Saúde e estética (Dra. Andrea, Dr. Luís Henrique, Dra. Acácia), Disalp, SN, Fuctura, LEAZI, MF Máquinas, Guararapes, Transpetro, CIA Coffe, óticas e demais | fora do público | sem ponte natural | < 5 | Não fazer |

4. **Benefício (Brio):** venda direta no delivery (pico de pedidos nas noites 19–23/11 e no fim de semana) +
   identificação com o público 18–35. **Peformake:** autoridade.
5. **Comunicação (Brio), 1 frase:** "Hoje a missão é zerar o jogo; o hambúrguer chega até você."
6. **Formato e gancho (Brio):** S78 trend como gancho + S74 exagero da dor, celular, 20–25 s. Gatilho de
   reconhecimento: tela de "missão" em neon rosa/ciano (estética, não a arte do jogo) + a frase falada "primeiro dia de
   lançamento". Ponte: ninguém levanta do sofá → o pedido chega. Conteúdo que converte: o hambúrguer saindo da chapa,
   embalagem fechando, entregador chegando, o combo na mesa do jogador (só produto real). CTA: "pede pelo [canal
   confirmado]". Ganchos: (1) "Primeiro dia de lançamento: ninguém aqui vai cozinhar." (2) "Missão de hoje: não pausar
   o jogo pra comer." (3) "Seu controle não larga, seu hambúrguer chega." Combo ou preço só se confirmado; se houver
   condição de Black Friday (27/11), ela fecha o vídeo.
7. **Risco de imagem e direito:** **não** usar o logo GTA/Rockstar, a fonte do logo, capa, arte, personagens,
   gameplay, trailer ou trilha (marca registrada e direito autoral, Leis 9.279/1996 e 9.610/1998). Citar o nome "GTA 6"
   como referência informativa na fala ou legenda é aceitável no orgânico; **no anúncio pago, tirar o nome** (a
   plataforma pode reprovar por propriedade intelectual, e parece parceria). Nada de arma, crime, polícia ou
   perseguição, mesmo de brincadeira; nada que associe o jogo 18+ a criança. Will Motos: nada de empinar, fuga ou
   velocidade (trânsito e Conar).
8. **Janela:** pico de 19/11 a ~07/12 (lançamento + 2 fins de semana + Black Friday). Produção de celular em 24–48 h:
   gravar 20/11, publicar até 21/11 (sexta à noite). Cinemático Ellcazo não cabe.
9. **Vale a pena?** **Brio Burguer: 9,0, fazer** (vídeo + 2 derivados: story com enquete "pausa ou não pausa pra
   comer?" e anúncio de 15 s sem o nome do jogo). **Peformake: 7,8, adaptar** (talking head S44, sem urgência; vale até
   dezembro). **Tardezinha 7,4 e Will Motos 6,9: adaptar** em story. **Demais: não fazer.** Tudo como sugestão; a equipe
   aprova.
