---
name: "performake-content-agent"
description: "Rotina diária de conteúdo e vendas da Performake — para clientes da agência ou para a marca própria. Lê a ficha do cliente no Drive, pesquisa trends e vídeos em alta do nicho em TODAS as redes (Instagram, TikTok, YouTube/Shorts, Meta Ad Library), e entrega: ideias de arte, roteiros de vídeo, campanha, oferta do dia, criativo de tráfego pronto, DIY, captação de material, copy de DM e o bloco \"o que a agência faz × o que o cliente faz\". Desde a v6.0 acrescenta ainda: banco de referências acumulativo por nicho, estudo de região/mercado/concorrência, playbook rotativo de métodos comprovados de venda com plano de ação, métrica do dia e semáforo de conta travada. Sai em duas versões (interna + cliente). Use SEMPRE que disser \"gera o conteúdo do dia para [cliente]\", \"roda a rotina diária\", \"briefing do dia\", \"roda o agente de conteúdo\", \"conteúdo da Performake\", \"plano de ação pra vender mais\", \"estratégia pra dia fraco\" ou qualquer variação."
---

# 📺 PERFORMAKE CONTENT AGENT — ROTINA DIÁRIA

Rotina diária de conteúdo **orientada a venda**. Roda para clientes da agência ou para a marca própria.

> **Dona única** dos triggers de conteúdo diário/briefing. A antiga `redator-conteudo-diario-agencia` foi absorvida aqui.
> Roteiro autoral profundo → `mdd`. Calendário editorial mensal → `redator-audiovisual-agencia`. Estratégia do mês → `estrategia-360-agencia`. Esta aqui é o **operacional do dia**.

> **📌 NOTA DE VERSÃO — v6.0 é aditiva.** Nada da v5.0 foi removido, renumerado ou reescrito. Os blocos **3.0 a 3.9 continuam com o mesmo número e o mesmo conteúdo**. O que a v6.0 faz é **acrescentar**: ETAPA 0 (checagem de sessão), o sub-bloco **3.0.1** (banco de referências acumulativo com semente real), os blocos novos **3.10 a 3.13**, o anexo de compliance, linhas novas no cabeçalho do brief e regras novas de 16 a 20. Tudo que já era usado continua valendo exatamente igual.

---

## 🎯 QUANDO USAR

"gera o conteúdo do dia para [CLIENTE]" · "roda a rotina diária" · "briefing do dia" · "roda o agente de conteúdo" · "conteúdo da Performake" · qualquer variação.

*(v6.0 acrescenta os gatilhos:)* "plano de ação pra vender mais" · "estratégia pra dia fraco" · "como aumentar o faturamento do cliente X" · "estuda a concorrência de [cliente]".

**Primeira pergunta sempre:** qual frente — `[CLIENTE]` ou `PERFORMAKE`?

---

## 🧭 PRINCÍPIO QUE GOVERNA TUDO

**Todo bloco existe para gerar venda.** Credibilidade, alcance e engajamento são meios, nunca o fim. Se uma ideia não responde *"como isso vira dinheiro?"* em uma frase, não entra.

Prioridade em caso de conflito: **vender > gerar desejo > construir credibilidade > alcançar.**

*(v6.0 acrescenta:)* E uma regra de honestidade que vale mais que qualquer entrega: **é melhor declarar uma lacuna do que preencher com invenção.** Link inventado, número inventado ou concorrente inventado destrói a confiança do brief inteiro.

---

## 🏢 FRENTE PERFORMAKE — FICHA DA MARCA PRÓPRIA

**Nome:** Performake · **Site:** peformake.com
*(o domínio é grafado sem o "r" — a marca é "Performake", o domínio é "peformake.com". Nunca "corrija" um pelo outro em peça publicada.)*

**Localização:** Recife, Pernambuco
**Posicionamento:** Assessoria de marketing orientada a resultado. Não vende serviço isolado — entrega posicionamento, crescimento e resultado mensurável.

**Serviços:** tráfego pago (Meta/Google) · social media · design gráfico · **audiovisual (principal diferencial)** · posicionamento de marca do zero · sites, LPs e sistemas · cardápio digital para gastronomia

**Nicho prioritário:** Gastronomia · **Secundário:** PMEs no Recife/Nordeste

**Tom de voz:** Direto, confiante, didático. Nordestino sem forçar. Informal mas profissional. Fala de resultado, não de processo.

**Concorrentes locais:** BG9 Recife · Maracatu Digital · Recify · Assucar Comunicação · Agência Ópera · Jazzz Agência Digital
**Referências nacionais:** Pedro Sobral · Lucas Renault · Tiago Tessmann · Alexandre Broggio · V4 Company

---

## ➕ ETAPA 0 — CHECAGEM DE SESSÃO *(NOVO na v6.0 — 30 segundos, antes de tudo)*

Antes de qualquer pesquisa, confirmar se as redes verticais estão acessíveis. **Isso define a qualidade de todo o bloco 3.0.**

1. `mcp__claude-in-chrome__list_connected_browsers` — a extensão está conectada?
2. Navegar para `instagram.com` — carrega o feed ou redireciona para `/accounts/login/`?
3. Navegar para `tiktok.com/foryou` ou uma página de hashtag — renderiza conteúdo?

**Se estiver deslogado:** **NÃO fazer login.** A rotina nunca insere credenciais. Registrar no cabeçalho do brief e seguir com as redes disponíveis. Abrir o resumo final com o pedido: *"deixar a sessão do Chrome logada no Instagram e no TikTok antes das 7h — resolve a lacuna de Reels em toda a carteira."*

**Se estiver logado:** o bloco 3.0 passa a ter referência vertical real, com perfil, data e desempenho visível.

---

## ETAPA 1 — CARREGAR CONTEXTO

**Frente CLIENTE** — ler no Drive:
```
📂 Performake Agência / 🗄️ CRM — Clientes / [CLIENTE] / 📄 Ficha Completa
```
Extrair: nicho, localização, site/Instagram, produtos e ticket médio, público-alvo, tom de voz, diferencial, objetivo do contrato.

⚠️ **Se a ficha não existir ou o nicho estiver "A definir":** não invente. Gere o brief no que der e abra o documento com um alerta: *"Ficha incompleta — campos faltando: [lista]. Rodar `diagnostico-cliente-agencia` antes do próximo brief."*

**Frente PERFORMAKE** — usar a ficha acima.

**Sempre — anti-repetição:** ler os **últimos 7 briefs** da frente. Nenhum tema se repete em 14 dias. Tema forte que volta = ângulo novo, declarado: *"variação do tema X de [data], ângulo novo: Y"*.

### ➕ 1.1 — ANTI-REPETIÇÃO EM TRÊS CAMADAS *(NOVO na v6.0 — soma-se à regra acima)*

| Camada | O que checar | Janela |
|---|---|---|
| **Tema** | ganchos, títulos e eixos já usados *(regra original, mantida)* | 14 dias |
| **Método de venda** | qual play do Playbook (3.11) já foi aplicado | **30 dias** |
| **Referência** | quais vídeos do banco 3.0.1 já viraram peça | permanente — marcar como usada, não descartar |

**Se um brief anterior não puder ser aberto**, declarar no topo com transparência de método — nunca fingir que a checagem foi feita:
> *"O brief de [data] existe nesta pasta e não foi reaberto nesta rodada. A checagem foi feita sobre o eixo declarado daquela rodada ([eixo]), que está integralmente evitado aqui. Conferir manualmente antes de publicar."*

### ➕ 1.2 — LER O RESULTADO DA RODADA ANTERIOR *(NOVO na v6.0)*

Abrir o brief do dia anterior e localizar o bloco de métrica (3.12). Registrar no topo do brief de hoje: o que foi publicado de fato · o número prometido foi atingido · o que o cliente executou e o que não executou.

Sem esse loop, a rotina produz volume e não aprende nada. Se não houver dado, escrever *"sem leitura de resultado — pedir ao cliente"* e cobrar no bloco 3.9.

---

## ETAPA 2 — RADAR (pesquisa real)

- **Trend do nicho:** "trend [nicho] TikTok Instagram [MÊS/ANO]" · "[categoria] viral Brasil [MÊS/ANO]"
- **Formato/áudio em alta:** "áudio viral Instagram Reels Brasil [MÊS/ANO]" · "trending TikTok sounds [MÊS/ANO]"
- **Marketing em pauta:** "tráfego pago Meta Ads novidade [MÊS/ANO]"
- **Local:** "[cidade/estado] negócios economia [DATA]"
- **Concorrência:** site e blog do concorrente · **Meta Ad Library** (anúncios ativos — fonte mais rica) · notícias, prêmios, cases · LinkedIn

*(v6.0 acrescenta uma fonte:)*
- **Setorial:** entidade do setor (Abrasel, Fecomércio, Sindioptica, Abihpec, sindicato local). É onde estão os números reais que dão autoridade ao conteúdo.

---

## ETAPA 3 — BLOCOS DO DIA

Dez blocos. Volume calibrado para ser **executado**, não arquivado.
*(v6.0 acrescenta os blocos 3.10 a 3.13 — os dez originais seguem idênticos.)*

### 3.0 — 🎥 VÍDEOS EM ALTA DO NICHO — TODAS AS REDES (5 referências reais)

**Roda antes dos roteiros** — as referências alimentam o bloco 3.2.

#### ⚠️ A REGRA DE OURO DESTE BLOCO

**Instagram e TikTok NÃO são indexados por busca web.** Buscar `"[marca] instagram"` no WebSearch devolve lixo, perfis de terceiros e páginas de agregador — nunca o vídeo real. Se você tentar "pesquisar" Reels ou TikToks com WebSearch, vai inventar link ou inventar número de views. **Isso é falha grave e destrói a confiança do brief inteiro.**

Cada rede tem UM método que funciona. Use o método certo ou declare honestamente que não achou.

#### 🔧 MÉTODO POR REDE

| Rede | Ferramenta correta | Como fazer |
|---|---|---|
| **Instagram / Reels** | **Claude in Chrome** (`mcp__claude-in-chrome__*`) | `navigate` para `instagram.com/explore/tags/[hashtag]/` ou para o perfil do concorrente → `get_page_text` / `read_page`. O Chrome renderiza o JS e enxerga o conteúdo real. WebSearch não. |
| **TikTok** | **Claude in Chrome** | `navigate` para `tiktok.com/tag/[hashtag]` ou `tiktok.com/discover` → `get_page_text`. Alternativa indexada: `tokchart.com` para sons em alta. |
| **YouTube Shorts** | **WebSearch funciona** | Buscar com `allowed_domains: ["youtube.com"]` e termos do nicho + "shorts". URLs de Short têm o formato `youtube.com/shorts/[id]`. |
| **YouTube longo** | **WebSearch funciona** | `site:youtube.com [nicho] [cidade]`. Priorizar últimos 60 dias. |
| **Meta Ad Library** | **Claude in Chrome** | `navigate` para `facebook.com/ads/library` com busca por país BR + nome do concorrente → `get_page_text`. É a fonte que mostra **o que está de fato sendo vendido com dinheiro por trás**. |
| **Pinterest** | Chrome ou WebSearch | Útil só para nichos visuais (moda, estética, gastronomia de apresentação). |

**Se o Chrome MCP não estiver conectado:** diga isso no brief em uma linha — *"Instagram e TikTok não inspecionados: extensão do Chrome não conectada nesta rodada."* — e complete as referências com YouTube/Shorts + Meta Ad Library. **Nunca preencher a lacuna com link inventado.**

> ➕ *(v6.0 acrescenta duas notas de execução, sem alterar a tabela acima:)*
> **Meta Ad Library exige espera.** Use a URL completa `facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=[termo]&search_type=keyword_unordered&media_type=all`, **espere 3 segundos** e só então chame `get_page_text`. Sem a espera, a página volta vazia. Não exige login — é a fonte mais confiável e sempre disponível.
> **Longevidade como indicador.** A biblioteca não mostra métrica, mas mostra **desde quando o anúncio está no ar**. Anúncio rodando há 6 meses ou mais é anúncio que dá retorno. Sempre registrar a data de início e usá-la como prova indireta de performance.

#### 🎯 DISTRIBUIÇÃO OBRIGATÓRIA DAS 5 REFERÊNCIAS

Buscar cobertura de rede, não 5 vídeos da mesma fonte:

- **Mínimo 1** de Instagram Reels ou TikTok (o formato que o cliente vai de fato replicar)
- **Mínimo 1** de YouTube Shorts ou YouTube longo
- **Mínimo 1** de Meta Ad Library (é o que prova o que vende)
- As 2 restantes: onde tiver o melhor material

Se uma rede não rendeu, **declare a rede e o motivo** — não substitua em silêncio.

#### FORMATO DE CADA REFERÊNCIA

```
VÍDEO DE REFERÊNCIA [n]
LINK: [URL real — ou "não confirmado"]
REDE: [Instagram Reels / TikTok / YouTube Shorts / YouTube / Meta Ad Library / Pinterest]
COMO FOI OBTIDO: [Chrome / WebSearch / Meta Ad Library]
DE QUEM: [perfil/marca]  ·  QUANDO: [data aproximada]
DESEMPENHO: [views/curtidas/comentários, se visíveis — senão "não visível"]

POR QUE FUNCIONA (o mecanismo, não a superfície):
[o que exatamente prende — o gancho? o corte? a promessa? o conflito?]

O QUE DÁ PARA ROUBAR:
ESTRUTURA: [o esqueleto reaproveitável]
NÃO COPIAR: [o que é específico daquela marca e ficaria falso aqui]
ADAPTAÇÃO PARA [FRENTE]: [como vira vídeo nosso]
FORMATO NATIVO: [o que muda ao levar da rede de origem para a rede do cliente]
```

**Nota sobre FORMATO NATIVO:** um TikTok que funciona com corte seco e texto grande não funciona igual no Reels, e muito menos no Shorts. Sempre declarar o que precisa mudar na adaptação — duração, ritmo de corte, presença de legenda, uso de áudio original vs. trilha.

**Regra:** copie **estrutura**, nunca conteúdo. Reproduzir o vídeo do concorrente trocando a logo gera peça genérica e risco de cópia. O valor está em entender *por que* funcionou.

---

### ➕ 3.0.1 — BANCO DE REFERÊNCIAS ACUMULATIVO *(NOVO na v6.0 — anexo ao 3.0, não substitui nada dele)*

As 5 referências novas do dia (formato acima) continuam saindo igual. O que muda é que elas **não morrem no brief do dia**: cada uma entra num banco que vive dentro do brief interno de cada cliente e **cresce a cada rodada, sem nunca ser apagado**.

**Ao fim do bloco 3.0, sempre incluir a tabela acumulada:**

| # | Referência | Rede | Link/ID | Mecanismo em 5 palavras | Já usada em |
|---|---|---|---|---|---|

**Regras do banco:** nunca remover linha · marcar *"já usada em [data — peça]"* quando virar produção · referência já usada continua no banco, porque estrutura boa se reaproveita com ângulo novo.

#### 📚 BANCO SEMENTE POR NICHO — coletado em 11/08/2026

Toda rodada **começa desta tabela** e acrescenta o que encontrar. Todos os IDs abrem em `facebook.com/ads/library/` buscando pelo número.

**GASTRONOMIA** *(bar, restaurante, pizzaria, cafeteria)*

| Referência | Rede | Link/ID | Mecanismo | No ar desde |
|---|---|---|---|---|
| Cascata Pizzas Franca | Ad Library | `1585367455887249` | Um produto, um preço único (R$55), zero storytelling, WhatsApp | 09/04/2026 |
| Cascata — aniversário | Ad Library | `2066623694077226` | Aniversariante grátis trazendo 10 pagantes: CAC quase zero | 27/10/2025 |
| Malice Pizzaria | Ad Library | `1484748866106848` | Cupom em reais (R$15) restrito à 1ª compra, protege margem do recorrente | 24/09/2025 |
| Bráz | Ad Library | `1011249778032385` | Prova externa (ranking) no lugar de autoelogio | 29/05/2026 |
| Parla Deli (Recife) | Ad Library | `1514670676350595` | Institucional de horário/unidades — padrão local, serve de contraexemplo | 29/10/2025 |
| Pizzaria Pastelburg | Ad Library | `995607476157000` | Rodízio grátis pro aniversariante com 4 pagantes | 08/05/2026 |
| Pratos baratinhos, bar famoso Recife | YouTube | youtube.com/watch?v=iK21zcKhyzE | Preço baixo + casa famosa: resolve objeção sem se defender | — |
| Bar temático em Recife | YouTube Shorts | youtube.com/watch?v=aJBBifOupGs | O ambiente é o conteúdo | — |
| 24 Horas em Recife | YouTube | youtube.com/watch?v=B-39yBAMKvw | Conteúdo organizado por **hora do dia**, não por produto | ~jul/2026 |
| Melhores bares e restaurantes de Recife | YouTube | youtube.com/watch?v=aFfhqy_7NKY | Lista: formato mais salvo e compartilhado | — |
| Bar do Cuscuz (Boa Viagem) | YouTube Shorts | m.youtube.com/shorts/5us2NbnNbwo | Registro cru de casa cheia | — |

**ÓTICA**

| Referência | Rede | Link/ID | Mecanismo | No ar desde |
|---|---|---|---|---|
| Vizo Ótica (Sinop-MT) | Ad Library | `1508749497526369` | **Nome da cidade dentro da oferta** + exame como isca | 12/05/2026 |
| Óticas Prevent | Ad Library | `884826511265842` | Verbaliza a desconfiança ("esperava só o básico") + preço em parcela | 14/04/2026 |
| Ótica Atacadão Caucaia | Ad Library | `1770699846863087` | O número é o criativo: "óculos completo 189,90" | 22/12/2025 |
| Ótica Dr. Óculos UTI | Ad Library | `481821170882893` | **Serviço (conserto) como porta de entrada** — 2 anos no ar | 22/06/2024 |
| Bella Ótica | Ad Library | `1449936662815505` | "Não tem exame? Agendamos pra você" — remove o passo anterior | 09/08/2025 |
| Inami Ótica | Ad Library | `1730227831330432` | Aniversário de marca convertido em doação | 06/07/2026 |
| Ótica Gesú Chiesa | Ad Library | `30922043334109296` | Kit completo com preço fechado em 10x | 22/08/2025 |
| Vitrine para ótica — Optidados | YouTube | youtube.com/watch?v=mzjWPNFqKLw | Vitrine responde por ~80% da decisão de compra | — |
| Atendimento para vendedores de ótica | YouTube | youtube.com/watch?v=8ccqAHpG0RQ | Vende saúde e confiança, não armação | — |

**BARBEARIA**

| Referência | Rede | Link/ID | Mecanismo | No ar desde |
|---|---|---|---|---|
| Barbearia Spazio | Ad Library | `3264504147063462` | **Nega a solução óbvia e renomeia o problema** + método com nome. Melhor copy do banco | 22/12/2025 |
| Barbearia Las Vegas | Ad Library | `932633832530155` | Vende **assinatura**, comunica novidade para quem já é membro | 03/02/2026 |
| Espaçolaser | Ad Library | `1590550319524288` | Ancoragem em gasto cotidiano ("R$99 vai embora rápido"), 18s | 11/05/2026 |
| Taggy Contact | Ad Library | `1251308259890914` | Remove o atrito de pedir avaliação no Google — 14 meses no ar | 13/06/2025 |
| Barbearia Santo7 | Ad Library | `646358148092555` | Storytelling de origem e expansão | 04/09/2025 |
| Feel King | Ad Library | `968308766156581` | Posicionamento e identidade acima de serviço | 05/05/2026 |
| Mentoria "O Sócio" | Ad Library | `727127293631145` | Expõe comportamento, dá nome ("crença limitante"), qualifica por faturamento | 30/07/2025 |

**SAÚDE / ESTÉTICA / FISIOTERAPIA**

| Referência | Rede | Link/ID | Mecanismo | No ar desde |
|---|---|---|---|---|
| Dr. Rafael Cavallini | Ad Library | `1483841130159923` | Lista tudo que a pessoa já tentou e falhou, antes de oferecer. ⚠️ **infoproduto — copiar só a estrutura, nunca a promessa** | 27/06/2026 |
| Mova — Movimento Absoluto | Ad Library | `2717701631931729` | Analogia física (engrenagens) explica por que a dor aparece longe da causa. ⚠️ **infoproduto** | 29/05/2026 |
| Shopvita | Ad Library | `905921770868831` | Mesma peça replicada com o nome da cidade trocado — 2 anos | 14/10/2024 |
| ISP Saúde | Ad Library | `610264181385366` | Idem, replicação geográfica em escala | 14/01/2025 |

**INDUSTRIAL / B2B / ASSISTÊNCIA TÉCNICA**

| Referência | Rede | Link/ID | Mecanismo | No ar desde |
|---|---|---|---|---|
| Citerol Uniformes | Ad Library | `526873683572873` | **Educativo técnico puro**, sem oferta, sustentando 2 anos de anúncio | 02/11/2024 |
| D.H.OSTER | Ad Library | `1386481516830581` | Copy de uma linha + especificação + WhatsApp | 24/04/2026 |
| Mundo dos Barbeiros | Ad Library | `1502840681147603` | E-commerce técnico: parcelamento e PIX como argumento | 05/08/2025 |
| Usinagem de campo | YouTube Shorts | youtube.com/shorts/5eZl0FWD0s4 | Trabalho técnico em close, vertical, **sem locução** | — |
| Operações com torno | YouTube Shorts | youtube.com/shorts/Ee8jy36bB2o | Uma operação completa, começo ao fim | — |
| Visita à Compasso Manutenção | YouTube | youtube.com/watch?v=wx_MoYn7PBw | Percurso pela oficina = visita técnica em vídeo | — |
| 8 dicas para mecânico iniciante | YouTube | youtube.com/watch?v=U0qhU3Y43O8 | Lista numerada para público técnico | — |

**AGÊNCIA / MARCA PRÓPRIA**

| Referência | Rede | Link/ID | Mecanismo | No ar desde |
|---|---|---|---|---|
| Alpha Assessoria | Ad Library | `1001263235730227` | Nomeia o cargo no gancho ("Dono de Restaurante") — concorrente direto no nicho | 03/06/2026 |
| Mentoria "O Sócio" | Ad Library | `727127293631145` | Qualifica público por faturamento, afasta quem não tem porte | 30/07/2025 |
| Barbearia Spazio | Ad Library | `3264504147063462` | Estrutura de copy universal: negar → renomear → nomear método | 22/12/2025 |
| Taggy Contact | Ad Library | `1251308259890914` | Mapa de dor de pequeno negócio local | 13/06/2025 |

---

### 3.1 — 🎨 IDEIAS DE ARTE (5)
```
ARTE [n]
FORMATO: [feed 4:5 / story 9:16 / banner site / encarte / capa]
OBJETIVO: [vender X / gerar desejo / provar credibilidade]
TÍTULO NA PEÇA: "[máx 8 palavras]"
APOIO: "[subtítulo ou bullet]"
CTA NA PEÇA: "[texto]"
DIREÇÃO VISUAL: [cor dominante, tipo de imagem, hierarquia, referência]
ELEMENTO OBRIGATÓRIO: [preço / selo / logo / foto do produto]
```

### 3.2 — 🎬 ROTEIROS DE VÍDEO (5)
Distribuição: **2** produto/oferta · **1** educativo · **1** prova social ou bastidor · **1** hot take.
Ao menos **2 dos 5** devem citar qual referência do bloco 3.0 inspirou a estrutura.
```
VÍDEO [n]
TÍTULO INTERNO: [...]  ·  FORMATO: [...]  ·  DURAÇÃO: [30s/45s/60s]
REDE PRINCIPAL: [Reels / TikTok / Shorts]  ·  REAPROVEITA EM: [...]
INSPIRADO EM: [referência 3.0, se houver]
GANCHO (0–3s, fala em câmera): "[texto exato]"
ROTEIRO:
  0–3s:   [gancho, direto no olho]
  3–8s:   [problema/contexto]
  8–[X]s: [desenvolvimento: 3 pontos ou 1 demonstração]
  final 3s: [CTA]
LEGENDA NA TELA: [3–5 palavras]  ·  HASHTAGS: [5–8]
ÁUDIO: [trilha em alta identificada no 3.0 / áudio original / som ambiente]
PRODUÇÃO: [cenário, luz, áudio, edição]
QUEM GRAVA: [cliente / equipe Performake]
```
> ➕ *(v6.0 acrescenta uma regra de viabilidade:)* em conta com histórico de não-execução, **pelo menos 2 dos 5 roteiros não podem exigir rosto nem fala** — só mãos, produto ou ambiente. Roteiro que não é gravado não existe.

### 3.3 — 📅 DATA SAZONAL *(condicional)*
**Só aparece com data dentro de 21 dias.** Sem data na janela: *"Sem data sazonal em D-21."*
```
DATA: [nome] — faltam [N] dias
JANELA: [D-21 aquecimento / D-14 construção / D-7 conversão / D-0 execução]
O QUE FAZER AGORA: [ação da janela]
OFERTA POSSÍVEL: [...]  ·  MATERIAL A PRODUZIR JÁ: [...]
```
Datas de peso no Nordeste: Carnaval · **São João (o maior — começar em maio)** · Mães · Namorados · Pais · Crianças · Black Friday · Natal. Somar datas do nicho.

> ➕ *(v6.0 acrescenta:)* **Contam também as datas da própria casa** — sorteio, aniversário da loja, inauguração, fim de campanha. Essas são as mais fortes, porque ninguém mais disputa. E quando não houver data em D-21, **explicar por que a ausência é oportunidade**: janela sem competição de atenção é o melhor período para construir recorrência.
> **Segundo semestre:** Dia do Cliente (15/09) · Crianças (12/10) · Black Friday (última sexta de nov) · Natal. Somar as do nicho — volta às aulas para ótica, Dia Mundial da Visão em outubro, e assim por diante.

### 3.4 — 📣 CAMPANHA
```
NOME: [...]  ·  STATUS: [nova / em andamento — dia X de Y]
OBJETIVO DE VENDA: [número concreto]
PROMESSA CENTRAL: "[uma frase]"  ·  PÚBLICO: [...]
PEÇAS QUE COMPÕEM: [quais artes/vídeos deste brief entram]
DURAÇÃO: [...]  ·  ONDE RODA: [orgânico / pago / os dois]
```

### 3.5 — 💰 OFERTA DO DIA/SEMANA
**Sem este bloco preenchido, o brief não é entregue.**
```
OFERTA: [combo / isca / upsell / condição / lançamento]
O QUE É: [1 frase]  ·  PREÇO OU CONDIÇÃO: [...]
POR QUE AGORA: [gatilho — sazonal, estoque, trend, dia da semana]
ISCA DE ENTRADA: [o que traz o primeiro contato]
CAMINHO ATÉ A VENDA: [conteúdo → direct/zap → fechamento]
```
> ➕ *(v6.0 acrescenta:)* a oferta deve ser **a materialização do método escolhido em 3.11**. E regra de preço: se a ficha não traz ticket médio nem margem, sugerir **faixa** e marcar *"preço final a confirmar com o cliente antes de publicar"*. Nunca publicar preço inventado.

### 3.6 — 🚀 CRIATIVO DE TRÁFEGO PRONTO
```
CRIATIVO: [imagem / vídeo — o que aparece]
COPY PRINCIPAL: "[3–5 linhas: dor → solução → prova → CTA]"
TÍTULO: "[máx 40 caracteres]"  ·  DESCRIÇÃO: "[máx 30 caracteres]"
CTA DO BOTÃO: [Enviar mensagem / Saiba mais / Comprar]
PÚBLICO: [localização, idade, interesses, ou lookalike/remarketing]
ORÇAMENTO/DIA: [R$]  ·  OBJETIVO: [mensagens / conversão / alcance]
VARIAÇÃO A/B: [o que muda na versão B]
```
> ➕ *(v6.0 acrescenta um checklist de plataforma — estado em agosto/2026, confirmar se ainda vale antes de subir:)*
> - **Advantage+ é padrão** em campanhas novas.
> - **O Advantage+ reescreve texto embutido na imagem do criativo.** Toda peça com preço, data ou registro profissional dentro da arte exige **preencher as informações de Branding ou desativar a reescrita por criativo**. Em peça de sorteio, isso é risco de regulamento, não estético.
> - **Advantage+ Leads liberado globalmente** — alternativa ao WhatsApp puro; cria base própria e permite medir ROI.
> - **Conjuntos de categoria especial dão erro** sem a flag explícita de público Advantage+.
> - **"Anúncios Automáticos" serão descontinuados.**

### 3.7 — 🤝 AGÊNCIA FAZ × CLIENTE FAZ
**Regra do corte:**
- **Cliente faz** o que exige **presença, rosto e rotina** — o que a agência não consegue fazer no lugar dele.
- **Agência faz** o que exige **técnica, ferramenta e escala**.

Nunca liste como tarefa da agência algo que o cliente resolveria em 5 minutos, nem empurre ao cliente algo que exige domínio técnico.
```
🎯 OBJETIVO DA SEMANA: [vender mais X / aumentar ticket / recuperar clientes]

O QUE A PERFORMAKE FAZ
1. [ação] → [resultado esperado]
2. [ação] → [resultado esperado]
3. [ação] → [resultado esperado]

O QUE VOCÊ (CLIENTE) FAZ
1. [ação] → [por que só você consegue fazer isso]
2. [ação] → [por que só você consegue fazer isso]
3. [ação] → [por que só você consegue fazer isso]

JUNTOS ISSO GERA: [conexão explícita com venda]
```

### 3.8 — 🛠️ DIY DO CLIENTE (3)
```
DIY [n]
O QUE É: [...]  ·  PARA QUÊ: [objetivo de venda]
CUSTO: [R$ 0 / valor]  ·  TEMPO: [minutos]
PASSO A PASSO: [numerado, simples, sem jargão]
RESULTADO ESPERADO: [...]
```
> ➕ *(v6.0 acrescenta:)* **pelo menos 1 dos 3 tem que custar menos de 10 minutos.** DIY longo não é feito.

### 3.9 — 📥 CAPTAÇÃO + COPY DE ATENDIMENTO
```
MATERIAL A PEDIR AO CLIENTE HOJE
- [ ] [foto/vídeo/depoimento específico] — para: [qual peça]
MENSAGEM PRONTA PARA PEDIR: "[texto curto para o zap]"

COPY DE DIRECT / WHATSAPP
Abertura (quem chegou pelo conteúdo): "[...]"
Resposta a "quanto custa?": "[...]"
Resposta a "vou pensar": "[...]"
Fechamento: "[...]"
```
> ➕ *(v6.0 acrescenta:)* quando o método do dia pedir, incluir também a **mensagem específica do play** — recuperação de cliente, convite de retorno, pedido de indicação, oferta de assinatura.

---

### ➕ 3.10 — 🔬 ESTUDO DE REGIÃO, MERCADO E CONCORRÊNCIA *(NOVO na v6.0)*

**Cadência:** estudo **completo 1× por mês**; nas rodadas diárias, **1 atualização incremental** — aprofundar **um** concorrente ou **um** ângulo por dia. Estudo completo todo dia vira relatório que ninguém lê.

```
📍 A REGIÃO
[população e perfil socioeconômico do bairro/cidade · fluxo de pessoas · hábito de compra
 local (compra no bairro ou se desloca? decide por preço, indicação ou conveniência?) ·
 ciclo de dinheiro (dias de pagamento, quinzena) · distância até o centro/capital]

📊 O MERCADO
[maturidade do nicho na região · onde está a margem de verdade (quase nunca no produto
 que o cliente mais anuncia) · janela sazonal do setor · o que mudou na plataforma
 que afeta este setor especificamente]

⚔️ MAPA DE CONCORRENTES — tabela acumulativa, 1 linha aprofundada por rodada
| Concorrente | Distância | Tempo de mercado | Preço/oferta | Avaliações Google | Anuncia? | Última checagem |

🔍 APROFUNDAMENTO DE HOJE: [nome]
[o que ele faz bem · o que ele não cobre · o que dá pra tirar dele]

⬜ O ESPAÇO EM BRANCO
"O que ninguém está ocupando aqui é ______."
```

**Como checar cada coluna:**
- **Avaliações no Google** — buscar nome + cidade. Número e nota são o placar público da disputa, e quase sempre é onde o cliente perde sem saber.
- **Anuncia?** — Meta Ad Library via Chrome, país BR. Se anuncia, ver **desde quando** (anúncio velho = anúncio que funciona) e qual a oferta. **Se não anuncia, essa é a informação mais valiosa do dia:** o espaço pago está livre.
- **Preço** — cardápio online, site, iFood, perfil ou o próprio anúncio.

---

### ➕ 3.11 — 💡 PLAYBOOK DE VENDAS DO DIA + PLANO DE AÇÃO *(NOVO na v6.0)*

**Este é o bloco que responde "como isso vira dinheiro".** Um método por rodada, aplicado ao caso concreto. **Nenhum método se repete na mesma frente em 30 dias.**

```
🎯 ALAVANCA ESCOLHIDA: [mais clientes / mais frequência / maior ticket / recuperação]
🧩 MÉTODO DO DIA: [nome do play]
📖 POR QUE ELE: [por que este método, para este cliente, agora — 2 frases ligadas ao 3.10]
📈 O NÚMERO QUE ELE MOVE: [métrica específica]

PLANO DE AÇÃO — 7 DIAS
D1 (hoje): [ação · responsável · resultado esperado]
D2–D3:     [ação · responsável · resultado esperado]
D4–D5:     [ação · responsável · resultado esperado]
D6–D7:     [medir · o que olhar · o que fazer com o resultado]

🚧 O QUE PODE DAR ERRADO: [1 risco real e como mitigar]
🔁 MÉTODOS JÁ USADOS NESTA FRENTE (30 dias): [lista — nenhum pode se repetir]
```

#### 📚 BIBLIOTECA DE MÉTODOS COMPROVADOS

Escolher **um** por rodada. A alavanca vem primeiro; o método sai da alavanca.

**A) MAIS FREQUÊNCIA** *(o mais barato — cliente que já conhece)*
1. **Oferta de dia fraco** — preço/combo exclusivo no dia de menor movimento. Não é desconto: é ocupar capacidade ociosa cujo custo fixo já correu. *Argumento honesto que vende sozinho: "é o melhor dia pra vir — sem fila, sem espera".*
2. **Ritual de dia da semana** — a oferta vira hábito nomeado ("Terça da Casa"), sempre no mesmo dia. Depois de 4 semanas o cliente lembra sem anúncio.
3. **Hora morta** — mesma lógica, aplicada a um intervalo de horas.
4. **Clube / assinatura** — pacote mensal recorrente. Transforma capacidade em receita previsível. **Ideal para negócio com teto operacional baixo** (barbearia, clínica, estúdio).
5. **Gatilho de retorno agendado** — no fim do atendimento, já marcar o próximo. Serviço com ciclo conhecido desperdiça isso todo dia.
6. **Cartão de fidelidade com o primeiro carimbo dado** — começar em 1 de 10, não em 0. Progresso já iniciado eleva muito a adesão.

**B) MAIOR TICKET**
7. **Combo ancorado** — preço fechado sempre ao lado da soma dos avulsos.
8. **Upsell no momento do sim** — o adicional depois do cliente já ter decidido comprar, nunca antes.
9. **Cross-sell por complemento óbvio** — o item que quem compra A quase sempre precisa.
10. **Decoy** — três opções, sendo a do meio a que se quer vender. A mais cara existe pra fazer a do meio parecer sensata.
11. **Preço em parcela ou unidade pequena** — "10x de R$14,90", "menos de R$2 por dia".
12. **Versão premium visível** — um item caro que quase ninguém leva, mas que faz o resto parecer barato.

**C) MAIS CLIENTES**
13. **Isca de serviço gratuito** — ajuste, avaliação, diagnóstico, exame. Só funciona com a pergunta de conversão no fim (play 14).
14. **A pergunta do balcão** — uma frase ao fim do serviço grátis que abre a venda sem empurrar. Ex: *"seu grau é de quando?"*.
15. **Indicação com recompensa mútua** — quem indica e quem é indicado ganham. Recompensa unilateral converte muito menos.
16. **Parceria de vizinhança** — negócio não-concorrente, mesmo público, mesma rua. Custo zero.
17. **Prova social sistematizada** — pedir avaliação no Google **na hora**, com o celular na mão. Nunca por link depois.
18. **Geolocalização no criativo** — bairro ou cidade escrita e falada no anúncio. Em negócio local converte mais que segmentação de interesse.
19. **Conteúdo de utilidade salvável** — lista numerada que resolve problema real. Feito pra ser salvo e mandado em grupo.

**D) RECUPERAÇÃO E BASE**
20. **Janela de 72h pós-data** — quem comprou numa data comemorativa está quente por 3 dias. **A ação mais rentável do calendário e a que quase ninguém faz.**
21. **Win-back de inativos** — lista de quem não compra há X meses, mensagem individual com nome.
22. **Recuperação de conversa parada** — varrer directs, solicitações de mensagem e comentários sem resposta.
23. **Aniversário do cliente** — benefício no mês. Exige só uma data no cadastro.
24. **Segmentação RFM simples** — comprou recente · comprou muito · sumiu. Mensagem diferente pra cada.

**E) OPERAÇÃO COMO MARKETING**
25. **Escoamento de estoque como oferta** — o parado vira combo, não vira encalhe.
26. **Escassez real** — vaga limitada de verdade por capacidade. **Nunca inventar escassez** — em saúde é problema ético, não só de marketing.
27. **Transparência de bastidor** — mostrar o processo justifica o preço sem defendê-lo.
28. **Honestidade que vende** — dizer quando *não* vale a pena comprar. Ex: *"se não compensar consertar, a gente fala."*

**F) FRAMEWORKS DE APOIO** *(para estruturar, não como play do dia)*
**PAS** (Problema · Agitação · Solução) · **AIDA** · **3 alavancas** (mais clientes × mais frequência × maior ticket) · **LTV : CAC** (define teto de verba) · **Ponto de equilíbrio** (quantas vendas pagam o dia) · **Curva ABC** (anunciar o A, não o que sobrou) · **Jobs To Be Done** (que trabalho o cliente contrata esse produto pra fazer?).

---

### ➕ 3.12 — 📊 MÉTRICA DO DIA *(NOVO na v6.0)*

**Um número, um lugar, uma data.** Sem isso a rotina não aprende.
```
O QUE MEDIR: [1 número — mesas, agendamentos, exames, orçamentos, assinantes, leads]
ONDE OLHAR: [caderno de reservas, AppBarber, Gerenciador, WhatsApp, planilha]
META: [número]
QUANDO CONFERIR: [data]
QUEM CONFERE: [cliente ou agência]
```

---

### ➕ 3.13 — ✅ PENDÊNCIAS E SEMÁFORO DE CONTA TRAVADA *(NOVO na v6.0)*

Tabela viva, carregada de brief em brief, com **data de abertura** e dias em aberto.

| Tempo em aberto | Ação |
|---|---|
| até 7 dias | segue no brief como pendência normal |
| 8 a 14 dias | vira alerta destacado no topo do brief |
| **+14 dias** | 🔴 **conta travada** — para de receber brief novo e passa a receber **ligação**. Registrar no resumo final e escalar para o Italo |

**Mais brief não resolve falta de execução.** Quando uma frente acumula três entregas não executadas, a conversa muda de figura: ou a Performake assume a captação (com ajuste de escopo), ou o conteúdo não vai existir. Tratar isso de frente é mais útil do que entregar um quarto pacote.

---

## ETAPA 4 — DUAS VERSÕES DE SAÍDA

### 📕 `BRIEF INTERNO — [FRENTE] — [DATA]`
Tudo, cru: blocos 3.0 a 3.9 + radar + concorrência + notas de anti-repetição.
*(v6.0: incluir também 3.0.1 e os blocos 3.10 a 3.13.)*

Abre com:
```
══════════════════════════════════════
[FRENTE] — BRIEF INTERNO · [DATA]
══════════════════════════════════════
🔥 TREND DO DIA: [1–2 frases]
🎥 REFERÊNCIA MAIS FORTE: [1 vídeo do 3.0 + rede + por quê]
📡 COBERTURA DE REDES HOJE: [quais redes renderam / quais não e por quê]
💰 OFERTA EM FOCO: [...]
🎯 PRIORIDADE ABSOLUTA HOJE: [1 ação]
📊 CONCORRÊNCIA: [2–3 frases ou "sem movimento detectável"]
⚠️ EVITAR HOJE: [1 coisa]
🔁 TEMAS EVITADOS (últimos 7 briefs): [lista]
── ➕ linhas acrescentadas na v6.0 ──
📈 RESULTADO DA RODADA ANTERIOR: [o que saiu, o número que deu, o que não saiu]
💡 MÉTODO DE VENDA DE HOJE: [nome do play + alavanca]
🚦 PENDÊNCIAS TRAVADAS (+14 dias): [lista ou "nenhuma"]
🔁 MÉTODOS JÁ USADOS (30 dias): [lista]
══════════════════════════════════════
```

### 📗 `PLANO DO DIA — [CLIENTE] — [DATA]`
Apresentável. Sem jargão interno, sem concorrente nominal, sem custo/margem da agência.
*(v6.0: sem o semáforo de conta travada — esse é só interno.)*

Contém só:
1. Objetivo da semana (1 frase, em dinheiro)
2. **Agência faz × Você faz** (3.7)
3. Oferta em foco (3.5, em linguagem de cliente)
4. O que vamos publicar — resumo das peças, sem roteiro cru
5. DIY (3.8)
6. O que precisamos de você (3.9, só a captação)
7. ➕ *(v6.0)* **A estratégia de hoje e o plano de ação** — o método de 3.11 traduzido em linguagem de dono de negócio, com o que acontece em cada dia da semana. **Posicionar logo depois do item 1**, porque é o que dá sentido a todo o resto.

Tom consultivo e confiante. O cliente termina a leitura sabendo **exatamente o que fazer hoje** *(v6.0: e por que aquilo vai gerar venda)*.

---

## 📊 REGRAS DE QUALIDADE

1. **Nada entra sem responder "como isso vira venda?"**
2. **Reels funcionam sem som** — legenda nos 3 primeiros segundos.
3. **Gancho direto** — nunca "Olá" ou "Ei pessoal".
4. **Dados reais** — número concreto só se a pesquisa deu. Não invente.
5. **Link real ou nenhum link.** URL inventada é falha grave. Vale para todas as redes.
6. **Ferramenta certa por rede** — Instagram e TikTok só via Chrome MCP. WebSearch neles é proibido como fonte de referência.
7. **Cobertura de redes declarada** — o brief diz quais redes renderam e quais não, sempre.
8. **Tom regional** sem forçar sotaque.
9. **Um objetivo por peça.**
10. **9:16** vídeo e story · **4:5** feed.
11. **Anti-repetição** — nada em 14 dias; ângulo novo declarado.
12. **Blocos 3.5 (Oferta) e 3.7 (Agência × Cliente) são obrigatórios.**
13. **Sazonal só em D-21.**
14. **DIY realmente executável** pelo cliente sozinho, hoje.
15. **Referência: copiar estrutura, nunca conteúdo.** E declarar o que muda ao trocar de rede.

➕ *Acrescentadas na v6.0:*

16. **Anti-repetição também de método** — 30 dias para o play do Playbook, além dos 14 dias de tema.
17. **Blocos 3.11 (Playbook) e 3.12 (Métrica) também são obrigatórios**, junto com 3.5 e 3.7.
18. **Toda pendência tem data de abertura.** Pendência sem data vira pendência eterna.
19. **Método novo a cada rodada.** "Sempre com novidade" não é estilo — é regra de execução.
20. **Nenhuma referência do banco é apagada.** Usada, marca-se como usada.

---

## ➕ ANEXO — GUARDRAILS DE COMPLIANCE POR SETOR *(NOVO na v6.0)*

Checar antes de publicar. Errar aqui custa mais do que qualquer campanha rende.

| Setor | Cuidado |
|---|---|
| **Saúde, fisioterapia, estética** | Sem promessa de cura, resultado garantido ou prazo. Sem diagnóstico por mensagem. Registro profissional visível. Antes/depois tem restrição em vários conselhos — checar o conselho da categoria. Cuidado com escassez em conteúdo de saúde. |
| **Odontologia** | Código de Ética do CFO restringe escassez, promoção e antes/depois. Mais rígido que a média. |
| **Sorteio e promoção comercial** | Sorteio com distribuição gratuita de prêmio **exige autorização prévia** (Lei 5.768/71, hoje via SPA/Ministério da Fazenda). Sortear sem registro é infração. **Confirmar com o contador do cliente antes de anunciar.** Regulamento e data têm que ser únicos e públicos. |
| **Alimentos e bebidas** | Sem alegação de saúde não comprovada. Bebida alcoólica tem restrição de horário e de público em mídia paga. |
| **Ótica** | Grau e exame envolvem prescrição — não prometer resultado clínico nem substituir consulta oftalmológica. |
| **Preço em qualquer setor** | Preço anunciado tem que ser praticado. Condição limitada precisa estar visível na peça, não só na letra miúda. |
| **Imagem de pessoas** | Autorização de uso de imagem sempre, e por escrito quando for cliente final ou criança. |

---

## 💾 ENTREGA

Salvar as duas versões em:
```
📂 Performake Agência / 🗄️ CRM — Clientes / [FRENTE] / 📺 Briefs Diários /
```
E criar **Artifact** no Cowork da versão interna (skill `performake-visual-output`).

> ➕ *(v6.0 acrescenta:)* **verificar sempre depois de salvar** — buscar os documentos criados no Drive e confirmar que o conteúdo foi gravado. O retorno de criação pode reportar tamanho zerado mesmo com o arquivo cheio. Conferir pela busca e checar se não houve duplicata.

---

## ⏰ AGENDAMENTO

```
Cron: 0 7 * * 1-5   (dias úteis às 7h)
1. Ler 📊 VISÃO GERAL — Todos os Clientes
2. Filtrar status ATIVO
3. Para cada frente (+ PERFORMAKE): ficha → últimos 7 briefs → Etapas 2 a 4
4. Salvar as duas versões · criar Artifacts
5. Notificar: "✅ Rotina pronta para X frentes"
```

➕ *(v6.0 acrescenta antes e depois, sem alterar os 5 passos acima:)*
```
0. Checar sessão do Chrome (Instagram e TikTok logados?) — ETAPA 0
6. Verificar os documentos no Drive e conferir duplicatas
7. Resumo final em texto: frentes rodadas · links · oferta de cada uma ·
   método aplicado em cada uma · redes que renderam e que não ·
   fichas incompletas · contas travadas há +14 dias
```

---

**Versão:** 6.0 — **aditiva sobre a 5.0.** Acrescenta ETAPA 0 (checagem de sessão), 1.1 e 1.2 (anti-repetição em camadas e leitura de resultado), 3.0.1 (banco de referências acumulativo com semente real por nicho), 3.10 (estudo de região, mercado e concorrência), 3.11 (playbook de vendas com 28 métodos e plano de ação de 7 dias), 3.12 (métrica do dia), 3.13 (semáforo de conta travada), anexo de compliance, linhas novas no cabeçalho e regras 16 a 20. **Nada da 5.0 foi removido ou renumerado.**
**Versão anterior:** 5.0 — radar multi-rede (Instagram, TikTok, Shorts, YouTube, Meta Ad Library) com método correto por plataforma
**Para:** Performake Agência — Recife, PE

