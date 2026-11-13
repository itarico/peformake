# Estudo do perfil @aslaniedits (Milad Aslani) — o sistema de estilo

Feito em 10/11/2026. Foco: **gramática transferível** (o que se repete e com que números), não o assunto dos vídeos.
Complementa `breakdowns/E14_milad_DfWvqYMM7uA.md` e a receita **E14** de `receitas_estilos.md`.

**Material lido:** 41 reels em `D:\PEFORMAKE\REFERENCIAS\_perfis\aslaniedits\Instagram\72757508324\<id>\` mais
`DfWvqYMM7uA` (`_estilos`) e `DfZivEts0Fz` (`_tutoriais`), ou seja, 43 vídeos. Todos foram vistos pela
`sequencia_densa.jpg` (1 fps) e pelos dados de `analise.md`/`transcricao.txt`. Os 16 mais representativos têm
folha densa com carimbo de tempo (`seq8fps_*.jpg` a 8 fps, `seq10fps.jpg` a 10 fps) e recortes em resolução cheia
(`recorte_*.jpg`). Treze deles têm também espectrograma + forma de onda (`audio.png`), áudio mono 22 kHz (`a.wav`) e
lista de ataques (`onsets.txt`):
`DKj2cIHT6m9 DLw_JtTzhz0 DaIq2aZTlln Dc8YWxAMwwT DcZCi4Pzqg4 Dcf4I_dzZHv DcigZUDzKhj Dcs61-6Mu81 Dd055P_Mv1P
DdYnM7ZMhwB Ddtgn8cs3sZ De9DKKssi7a DdjDl5ksSfD DdM5y4KMuq4 DfZivEts0Fz DfWvqYMM7uA`.
O andamento (BPM) e o brilho espectral foram estimados com um script próprio de autocorrelação do fluxo espectral
(scratchpad `bpm.py`), e as cores foram amostradas em pixels (`cor.py`).

---

## 1. Visão geral do perfil

| Item | Valor medido |
|---|---|
| Vídeos | 43 (fev/2025 → nov/2026; 38 deles entre jun e nov/2026) |
| Duração | **mediana 8,9 s**, média 11,0 s, quartis 7,1–14,5 s; 27 de 43 (63 %) têm **≤ 10 s**; o maior tem 28 s |
| Formato | 9:16 em 40 de 43 (1080×1920; os antigos são 720×1280); 16:9 em 3 (comerciais de carro e academia) |
| Quadros/s | **30 fps** em quase todos (um em 60 fps) |
| Loudness | **−14 LUFS** cravado (−13,7 a −14,7) em 36 de 43; pico até −0,1 dBTP (ele masteriza para o Reels) |
| Cortes | 22 de 43 têm **1 plano só** (tudo acontece por animação dentro do plano); nos outros, 0,1–0,6 corte/s; só os comerciais 16:9 chegam a 1,2 corte/s |
| Fala | Só **6 de 43 (14 %)** usam a voz como trilha (locução ou podcast: `DKj2`, `DLw_`, `DaVs`, `DcZC`, `DcigZ`, `DaQy`). Nos vídeos de "pessoa falando para a câmera", **ele tira a voz e põe música**: a pessoa mexe a boca, mas o que se ouve é a trilha. O vídeo vende a edição, não o conteúdo |
| Legenda do post | curtíssima, de 1 a 8 palavras ("Before → After", "Why?", "Need edits like these?"), muitas vezes só "." |

**Formatos do perfil (embalagem):** (a) peça de motion inteira (≈ 12); (b) **comentário → antes/depois** (≈ 9);
(c) vitrine com o monitor filmado pelo celular (≈ 7); (d) grade/colagem de vários trabalhos com o selo "A" (≈ 8);
(e) bastidor de processo com etiquetas "Bg & shape → Camera movements → Effects → Result" (≈ 4);
(f) comercial cinematográfico 16:9 (≈ 3).

---

## 2. O sistema de estilo (o que se repete)

### 2.1 Composição e cenário
- **Fundo de estúdio limpo e sem horizonte**, em três tipos: (1) cinza-claro em degradê radial (#eae5eb no centro,
  #989699 nos cantos), (2) fundo escuro de uma cor (azul-marinho #081935, oliva #2e2f1f, petróleo #101d25), (3) fundo
  chapado de cor de marca (amarelo, vermelho, lima).
- **Pessoa inteira, pequena e centralizada, sentada** (poltrona, banqueta, cubo), ocupando **35–45 % da altura**,
  com os pés no terço inferior. O **terço superior fica livre para o texto**. Quase nunca há close de rosto.
- **Eixo central rígido:** texto, pessoa e elementos ficam no eixo vertical do meio. As exceções (cartões, fotos,
  ícones) entram **pelas laterais na altura do peito** e ficam inclinados de 8 a 15°.
- **Camadas em profundidade (texto atrás da pessoa):** a palavra gigante fica *atrás* do recorte da pessoa ou do
  objeto ("Aslani" atrás do carro, "sell" atrás da cabeça, "GYMS" atrás do rosto, celular-moldura atrás do homem
  em `De9DK`). Isso exige recorte (rotoscopia ou máscara de IA) e é a principal pista de "foi feito no After".
- **Margem de segurança:** o texto fica entre 8 % e 92 % da largura. A palavra-chave larga chega a **70–85 % da
  largura**.

### 2.2 Cor
- **Regra 1: um matiz por cena, e a cena inteira obedece.** A gradação puxa pele, roupa e fundo para o mesmo tom da
  palavra-destaque. Em `Dcf4I` a legenda muda de "Golden Hour" para "Fresh Green" e "Violet Dream", e **a imagem
  inteira muda junto** (o tom dourado vira verde e depois violeta, um a cada 1,35 s, ou seja, a cada 2 tempos a
  89 BPM).
- **Regra 2: neutro + 1 acento.** Base preto/branco/cinza e uma única cor saturada: vermelho #aa0001–#d0021b
  (`DdjDl`, `Ddtgn`, `DKj2`), lima #deff0f (`DfZiv`), ciano #7fe6f5 (`Dd055`), amarelo #f2b705 (`DaIq`), laranja
  terracota #d9734e (`DfWv`). A segunda cor só aparece no clímax ou no logo.
- **Regra 3: o "cru" é dessaturado e chapado; o "editado" tem contraste alto, preto profundo e cor dominante.** No
  formato antes/depois, essa diferença é o próprio produto.
- **Brilho (glow) é a cor-acento emitindo luz:** palavras, cartões e pixels têm halo de 20–60 px na cor do acento
  (bloom). Os brancos dos gráficos são chapados (#fefefe), sem degradê.
- **Vinheta** elíptica de −30 a −60 % nos cantos, em quase tudo que é escuro.

### 2.3 Textura e acabamento
- **Imagem limpa, quase sem grão de filme.** O acabamento vem de: (1) vinheta, (2) bloom/glow, (3) desfoque de
  movimento forte nas entradas e (4) a **estética de pixel** (blocos quadrados, letras pixeladas e mosaico na saída).
- **Fase antiga (2025, `DKj2`, `DLw_`):** P&B com sombra de janela projetada (gobo), poeira e pétalas, respingos de
  tinta e mancha de nanquim como transição, e acento vermelho. Nessa fase havia textura de papel e partículas.
- **Fase atual (set–nov/2026):** digital limpo, com UI de vidro (glassmorphism: cartão translúcido com borda clara
  de 2–4 px, cantos de 40–60 px e brilho interno) e blocos de pixel.

### 2.4 Tipografia
**Sistema de 3 a 4 vozes, sempre combinadas:**
| Voz | Fonte provável | Tamanho relativo (altura da letra / altura do quadro) | Uso |
|---|---|---|---|
| **Palavra-chave** | grotesca **ultracondensada e alta** (tipo Six Caps / Tusker Grotesk / Compacta / Antonio Bold) **ou** grotesca preta muito pesada (Inter Black / Helvetica Now Display Black) | **7–12 %** | 1 palavra: "GYMS", "mistake", "Scripts", "sell", "Aslani", "+15M" |
| **Linha de apoio** | sans geométrica média (Poppins / Inter / Satoshi Medium) | **1,3–2,2 %** | frase curta acima da palavra-chave ("You can't miss these insane", "Make … better") |
| **Assinatura** | manuscrita de pincel ou caneta (tipo Amsterdam / Holimount / Signatie) | 3–5 %, inclinada | 1 palavra emocional cruzando a palavra-chave ("California", "Edits", "Pro", "Brain") |
| **Etiqueta / técnica** | pixel (Silkscreen / Pixelify Sans), mono de máquina de escrever (Courier, "The hardest") ou sans dentro de pílula | 1–1,5 % | rótulo, número, hex de cor, "Raw/Edited" |

- **Hierarquia típica (de cima para baixo):** linha de apoio pequena → **palavra gigante** → palavra manuscrita ou
  pílula, com recuo lateral. A relação de tamanho entre a palavra-chave e o apoio fica entre **5:1 e 7:1**.
- **Caixa:** a palavra-chave aparece em minúsculas ("mistake", "sell", "matters") ou em maiúsculas condensadas
  ("GYMS"); o apoio fica em caixa de frase.
- **Entradas** (ver catálogo): (1) desfoque forte + escala 110→100 % em 4–6 quadros; (2) **montagem por blocos de
  pixel** na cor do acento em 6–9 quadros; (3) **embaralhamento de letras** (caracteres aleatórios que "decodificam"
  em 6–7 quadros, `DfZiv`); (4) letra por letra (máquina de escrever, ~2 quadros por letra); (5) deslize curto
  com rastro horizontal (E14).
- **Trocas:** a palavra é substituída **no mesmo lugar** com corte seco, ~0,13–0,4 s por palavra, sincronizada a um
  clique.
- **Saídas:** pixelização (mosaico crescente) ou desfoque + queda de opacidade em 3–4 quadros. Outra saída comum é
  o desfoque de câmera do quadro inteiro quando a cena empurra para o próximo bloco.
- **Detalhes recorrentes:** letra final em **contorno** (a última letra de "mistake" vira só traço),
  **degradê dentro da letra** ("+15M" indo de preto a azul), **marca-texto inclinado** sob uma palavra (pílula lima
  em −8°), **colchetes de canto ⌐ ⌙** e **losangos ou quadrados vazados** de 1–2 % nos dois lados da palavra-chave.

### 2.5 Elementos gráficos recorrentes
1. **Blocos de pixel** (quadrados de 40–60 px em 1080 de largura, cheios, na cor do acento, com brilho) que
   **constroem e desmontam** a palavra. É a assinatura atual dele (`Dcf4I`, `Dcs6`, `DdjDl`, `DfZiv`, `De9DK`).
2. **Cartão de comentário do Instagram** (retângulo branco com cantos de 24 px, avatar cinza e 2 linhas) no topo,
   a 8–15 % de altura, como gancho.
3. **Cartões de vidro / app** (ícone arredondado, celular, botão em pílula com seta ↗, selo de verificado) flutuando
   ao redor da pessoa.
4. **Pílulas/etiquetas** (`Raw`/`Edited`, `Intro`, `Bg & shape`, "Progress bar 63 %") com uma barra de linha do
   tempo e um cursor que corre.
5. **HUD fino:** traço "—", cantoneiras, quadradinhos de canto e anel de lente (círculo de brilho fino).
6. **Um elemento-guia** (ponto de luz, quadrado ou cometa) que conduz o olhar e vira a transição (E14, `DaIq`).
7. **Raios de luz e riscos brancos** (light streak, arco de raio) como corte entre blocos.
8. **Partículas** (pétalas, poeira, faíscas) só na fase antiga e nas peças épicas.

### 2.6 Transições (resumo; detalhes no catálogo)
Em ordem de frequência: **flash de 1 quadro (branco) ou "negativo" de 2 quadros** → **zoom/escala com desfoque de
movimento** → **forma que cresce e cobre a tela** → **risco de luz / arco** varrendo → **cartão encolhe e vira
"adesivo"** (quadro dentro do quadro) → **pixelização** → **nanquim/tinta** (fase antiga) → **corte seco no tempo da
música**. Ele **nunca** usa transição pronta de "deslizar" ou "girar cubo".

### 2.7 Câmera
- **Toda a câmera é digital** (escala, posição e rotação keyframadas no editor) com **desfoque de movimento ligado**
  (obturador de 180–360°). As cenas são planos fixos de estúdio.
- **Entrada com estalo:** escala 115–250 % → 100 % em 4–9 quadros, com curva expo de saída (E14, `Dc8Y` 2,1 s,
  `Dd055` 2,25 s).
- **Respiração:** aproximação lenta e constante de +5 a +12 % ao longo do bloco (1,5–3 s).
- **Recuo para revelar:** a pessoa encolhe (escala 100 → 70 %) enquanto o texto cresce acima dela (`Ddtgn` 3,4 s).
- **3D/2,5D:** cartões e ícones têm rotação Y/X de 10–25° e perspectiva; nos ícones de app há uma leve órbita. O
  "3D" é de camadas no After (câmera 3D com profundidade), não cena 3D renderizada, exceto objetos de produto
  (frasco, haltere, carro) que são PNG/3D com sombra projetada.
- **Chicote (whip) de produto:** o objeto entra cruzando a tela com desfoque direcional forte (`DcigZ` 7,1–7,6 s;
  9,0–9,5 s).

### 2.8 Tempo e ritmo
| Medida | Valor |
|---|---|
| Gancho (cartão de comentário parado) | **2,0–2,25 s** (60–67 quadros) em todos os antes/depois |
| Transição de revelação | **1–2 quadros** de flash + **3–4 quadros** de escala com desfoque |
| Palavra-chave entrando | 4–9 quadros (0,13–0,3 s) |
| Troca de palavra no mesmo lugar | 0,13–0,4 s (um clique cada) |
| Bloco de texto (frase completa na tela) | 1,0–1,6 s |
| "Cena" (um cartão, cor ou ideia) | **1,3–2,0 s** (2 tempos em 89 BPM = 1,35 s; 4 tempos em 143 BPM = 1,67 s) |
| Alternância cru/editado no fecho | **a cada 0,21–0,375 s** (colcheia da música), durante 2–3 s |
| Duração total | 6–9 s nos ganchos e anúncios; 15–20 s nas peças com locução |

### 2.9 Som
- **Dois regimes:**
  1. **Música com batida** (trap/drill/phonk/pop, BPM medido entre **89 e 152**, mais comum **123–144**): é
     usada em todo antes/depois. **No trecho cru (0–2 s) a música está abafada** (filtro passa-baixa; o
     espectrograma de `Dd055` e `Ddtgn` não tem graves e tem buracos acima de 6 kHz). **No flash da revelação
     entra o grave cheio** (o drop): em `Dd055` em 2,28 s e em `Ddtgn` em 1,9–2,1 s. O antes/depois é feito também no
     áudio.
  2. **Pad/drone sem batida + cliques de interface** (E14 `DfWv`, `De9DK`): linhas tonais horizontais contínuas,
     **subida (riser)** visível como linhas diagonais (`De9DK` 0–1,6 s), **rajadas de cliques** espaçados de 0,07 a
     0,13 s quando vários elementos entram, e **whoosh de ruído largo** em cada transição (`De9DK` 2,1 s, 3,5–3,8 s e
     5,3–5,5 s).
- **SFX por evento** (mesmo dicionário de `sound_design.md`): palavra ou pixel = clique curto (centróide de
  1,5–2,5 kHz, ataque instantâneo); transição de câmera = whoosh do tamanho do movimento; flash = impacto curto ou
  "shutter"; revelação de logo = impacto com cauda; cartão de UI = tique agudo (4–6 kHz).
- **Mix:** total em −14 LUFS; cliques ≈ −18 a −22 dB RMS; música alta sob os cliques (não abaixa). Quando há
  locução, a música cai uns 8 dB.

### 2.10 Estrutura de cada vídeo
- **Abre:** em um quadro, ou com um **problema escrito** (cartão de comentário, pergunta), ou com um **estalo de
  câmera** (escala grande + desfoque). Nunca com logo.
- **Vira:** **uma única revelação forte** em 2,0–2,3 s (flash + drop + gradação nova + palavra gigante). Nos
  minimalistas, a virada é o corte para preto ou a inversão do fundo para branco.
- **Desenvolve:** 2–4 blocos de 1,3–2 s, cada um com **uma palavra-chave e uma cor**.
- **Fecha:** com (a) a **alternância cru/editado no tempo da música**, que dá vontade de rever, (b) o **logo
  "aslani / edits"** (condensada + manuscrita ou marca-texto lima) sobre fundo chapado, ou (c) volta à pessoa com
  colchetes de canto. Não há chamada falada; a chamada fica na legenda do post.

### 2.11 Assinatura de marca
- Logotipo **"Aslani"** em grotesca ultracondensada + **"Edits"** manuscrito sobreposto em diagonal. Na fase atual,
  a versão é "aslani" em minúsculas + "edits" numa etiqueta lima inclinada.
- **Selo circular "A"** (monograma em círculo) sobre a junção de colagens.
- Marca d'água "AslaniEdits" com espaçamento largo (rastreio de +400), pequena, embaixo, a 1 % de altura.
- O "carro amarelo visto de cima com marca de pneu" (`DaIq`, `Dbde`, `Daqd`, `Dbqp`) funciona como mascote do
  portfólio.

---

## 3. Variações — os 6 sub-estilos

### V1. "Comentário → antes/depois" (o carro-chefe atual)
**Ids:** `Dc8YWxAMwwT`, `Dcs61-6Mu81`, `Dd055P_Mv1P`, `DdYnM7ZMhwB`, `Ddtgn8cs3sZ`, `DdjDl5ksSfD`, `DdM5y4KMuq4`,
`Dc0fP_HsxUm`; compilações em `DeC-xCeMrS6` (pares Raw/Edited), `DdO3WCKsH24` e `Dew85IgsLQg`.
**Gramática:**
1. 0–2,0/2,25 s: plano cru da pessoa (gradação chapada) + cartão de comentário provocando ("you can't make a good
   edit with just white", "Bro what are you gonna do with this"). Música abafada.
2. Revelação: 1 quadro branco **ou** 2 quadros pretos com a silhueta em negativo/luma → estalo de escala com
   desfoque → gradação nova monocromática na cor da palavra.
3. Legenda em 3 vozes (apoio + palavra gigante + manuscrita ou pílula), montada por blocos de pixel ou desfoque, com
   2–3 elementos laterais (cartões, ícones, fotos) inclinados.
4. Uma segunda frase entra empurrando a primeira (o "quadro dentro do quadro" encolhe para um adesivo à esquerda).
5. Fecho: alternância cru/editado em colcheias por 2–3 s (sem crédito).

### V2. "Fio condutor mínimo" (E14)
**Ids:** `DfWvqYMM7uA`, `DfZivEts0Fz`, `DaIq2aZTlln`/`Dbde32ZNy_B`/`DaqdWstTiix`, `Db1BsQYz6Fi`, `Dax55qVzyAv`.
**Gramática:** um fundo monocromático (vinho, branco puro, preto/amarelo, preto/violeta) e **um elemento que nunca
some** (quadrado, ponto de luz, partícula) e conduz tudo. Texto fino, pequeno e por palavra. Em `DfZiv`, o texto
decodifica a partir de letras aleatórias, há etiqueta lima e uma lista que rola como roleta ("value / difference /
advantage / uniqueness"). Pad + cliques. Fecho no logo. Em `DaIq`: ponto de luz que escreve a frase → barras
verticais com texto girado 90° → fundo amarelo com o carro e "Aslani" atrás dele.

### V3. "B2B de vidro" (interface e dados)
**Ids:** `De9DKKssi7a`, `DcZCi4Pzqg4`, `DcigZUDzKhj`, `DaVsaAFzEd1`, `DZ550QyTO8W`.
**Gramática:** pessoa ou produto + **cartões de app translúcidos** (celular-moldura atrás da pessoa, ícone com seta
↗/↘, barra de progresso, estrelas de avaliação, número gigante "99°", "+15M", "+6M"). O fundo muda de cor por bloco
(azul → vermelho → verde → violeta), cada um com **uma onda/fita de luz** em neon passando atrás do cartão. A
transição é feita por cone de luz (um polígono branco que gira a partir de um ponto, `DcigZ` 2,25–5,0 s) ou por um
risco de luz. Números com degradê e contagem. Locução ou música + cliques.

### V4. "Pôster editorial" (fase 2025 e portfólio pessoal)
**Ids:** `DKj2cIHT6m9`, `DLw_JtTzhz0`, `DbnsjQNMF11`, `DbqpG6tTXQ4`, `DaIq2aZTlln` (fim).
**Gramática:** cada quadro é um cartaz: P&B + vermelho (ou amarelo chapado), luz de janela projetada, objeto
recortado (samurai, cérebro, carro) com sombra, condensada + manuscrita, **texto atrás do objeto**. Transições por
tinta/nanquim, arco de raio (risco branco diagonal) e objeto que cai ou gira 3D. Locução cinematográfica grave. O
cliente é transformado em silhueta (homem sem rosto, cabeça de rabisco).

### V5. "Vitrine de portfólio" (embalagem para vender o serviço)
**Ids:** monitor filmado — `Dd6Crg6sC80`, `Ddv6S5VsxrL`, `De9DgdfsGQL`, `DeOuD_xMFYZ`, `DepQyLJsDZg`,
`DfVYqBlMP99`, `DaQyebBTsx-`; grade/colagem — `DSz5fQtkwcM`, `DdGzvYQseOn`, `Ddgax1nMt52`, `DcTsz-DTDL_`,
`DGSMiOiM9ri`, `DaBDvuNzxMc`; processo — `DbnsjQNMF11`, `DbqpG6tTXQ4`.
**Gramática:** (a) o monitor com o Premiere/After aberto, filmado pelo celular num quarto com luz de PC verde-lima,
com legenda curta em cima e o medidor de áudio pulsando (prova de que é "feito à mão"); (b) **pares de telas
lado a lado** (Before pequeno + After grande, com cantos de 30 px e sombra) e uma **pílula de etapa com cursor que
corre** ("Intro", "Bg & shape", "Camera movements", "Effects", "Result"), sobre fundo cinza #e5e5e5; (c) colagem de
2 telas por coluna com o selo "A" na junção.

### V6. "Comercial cinematográfico" (16:9 e academia)
**Ids:** `DcB4NxETLjU`, `DdBhL7zMSSC`, trecho final de `DaQyebBTsx-`.
**Gramática:** 0,6–1,2 corte/s no tempo, gradação teal & orange ou creme/verde de filme, quadros de flash branco
superexposto, espelhamento caleidoscópico de 2–4 quadros, rastro (echo), raio de luz, desfoque de lente e logo
manuscrito "Aslani edits" no fim.

---

## 4. Catálogo de técnicas

Convenção: 30 fps, quadro 1080×1920. "Q" = quadros. Cores aproximadas, amostradas.

**T1. Cartão de comentário como gancho.** Retângulo branco #ffffff, cantos de 24 px, largura de 60–70 %, no topo
(y = 8–15 %), com avatar cinza de 40 px e 2 linhas (pergunta em semibold de 30 px + resposta cinza de 22 px). Fica
parado por 60–67 Q.
*Remotion/HyperFrames:* componente `<CommentCard>` com entrada de opacidade 0→1 em 4 Q. *AE/Premiere:* MOGRT de
texto + forma. *SFX:* nenhum (deixa a música abafada falar) ou um "pop" de notificação a −24 dB.

**T2. Revelação por flash.** 1 Q branco #ffffff (ou 2 Q pretos com a pessoa em negativo/luma) → no Q seguinte,
plano novo a 108–115 % de escala com desfoque de movimento → 100 % em 3–4 Q (expo de saída).
*Remotion:* `<Sequence>` de 1 Q `AbsoluteFill` branco + `interpolate(f,[0,4],[1.12,1],{easing:Easing.out(Easing.exp)})`
na escala + blur de 12→0 px. *AE:* camada sólida de 1 Q + Transform com obturador de 360°. *Premiere:* "Transform"
com obturador + cor sólida de 1 Q. *SFX:* impacto curto (sub + estalo) **exatamente** no Q do flash + drop da
música.

**T3. Áudio antes/depois (filtro → drop).** Música com passa-baixa de ~800 Hz e −6 dB no trecho cru; filtro
aberto e grave cheio no Q da revelação.
*FFmpeg:* `lowpass=f=800` no trecho 0–2,0 s e cruzamento de 2 Q. *Premiere:* Lowpass com keyframe. *SFX:* a própria
música.

**T4. Gradação monocromática ligada à palavra.** Cena inteira puxada para um matiz (pele incluída): saturação global
−30 %, matiz seletivo, sombras tingidas com a cor do acento, contraste alto, vinheta de −40 %.
*FFmpeg:* `colorbalance` + `hue` + `curves` + `vignette`. *Premiere:* Lumetri (rodas + HSL secundária). *Remotion:*
overlay da cor em `mix-blend-mode: color` a 35–50 % sobre o vídeo. *SFX:* —

**T5. Legenda em 3 vozes.** Apoio de 1,3–2,2 % de altura em sans média + palavra-chave de 7–12 % (condensada ou black)
+ manuscrita a 3–5 % sobreposta em −8°. Proporção de 5:1 a 7:1 e eixo central.
*Remotion:* componente `<TriadTitle support keyword script accent>`. *AE:* 3 camadas de texto parentadas. *SFX:* 1
clique por voz (3 cliques em 0,1–0,2 s).

**T6. Montagem por blocos de pixel.** 6–12 quadrados de 40–60 px na cor do acento, com glow de 30 px, surgem em
grade ao redor da palavra (a 0–2 Q uns dos outros), a palavra aparece "dentro" deles, e os blocos se dispersam ou
apagam em 6–9 Q. Também desmontam a palavra na saída.
*Remotion:* array de quadrados com `delay = random(seed)*6`, opacidade e escala 0→1→0, posição em grade de 50 px.
*AE:* Card Dance/Shatter, ou forma com repetidor e expressão `wiggle` + Posterize Time. *SFX:* rajada de 4–8 cliques
de 8 bits (centróide de 2–4 kHz) espaçados de 2 Q.

**T7. Entrada com desfoque e escala.** A palavra entra a 115 % com blur de 20–30 px e opacidade 0 → 100 %, blur 0 e
opacidade 1 em 4–6 Q, com glow vermelho espalhado na entrada (`DdjDl` 2,75–3,1 s).
*Remotion:* `filter: blur()` + `scale` interpolados. *AE:* Fast Box Blur + Scale. *SFX:* "swish" curto de 0,15 s.

**T8. Texto que decodifica (scramble).** Letras aleatórias trocam a cada Q por 6–7 Q e se fixam da esquerda para a
direita na palavra certa (`DfZiv` 0–0,7 s).
*Remotion:* `useCurrentFrame` → para cada caractere `i`, se `f < i*1+3` mostra um caractere aleatório com seed `f`.
*AE:* Text Animator > Character Offset com Randomize. *SFX:* trilha de "data/teclado" de 0,6 s ou cliques rápidos.

**T9. Máquina de escrever.** Uma letra a cada 2 Q, com cursor "|" piscando (`DfZiv` "matters", `DdYn` "The
hardest" em mono).
*Remotion:* `text.slice(0, f/2)`. *SFX:* tique por letra a −26 dB.

**T10. Troca de palavra no mesmo lugar.** Corte seco da palavra a cada 4–12 Q, no tempo dos cliques (E14).
*Remotion:* array de palavras indexado por `Math.floor(f/step)`. *SFX:* 1 clique por troca.

**T11. Texto atrás da pessoa ou do objeto.** Palavra gigante entre o fundo e o recorte da pessoa (a cabeça cobre
10–30 % das letras).
*Aqui:* recorte com `recortar.py` (fundo removido) → pilha [fundo] [texto] [pessoa recortada] [UI da frente].
*AE:* Rotobrush. *Premiere:* Máscara de objeto (2025). *SFX:* —

**T12. Detalhes tipográficos.** Última letra em contorno (stroke de 2 px, sem preenchimento), degradê vertical na
palavra (preto → acento), marca-texto em pílula inclinada (lima #deff0f a −8°), losangos ou quadrados vazados de
28 px nas laterais, colchetes de canto ⌐ ⌙ que deslizam 30 px e travam em 5 Q.
*Remotion/CSS:* `-webkit-text-stroke`, `background-clip:text`, `transform: rotate(-8deg)`. *SFX:* clique ao
travar os colchetes.

**T13. Cartões de vidro.** Retângulo com cantos de 40–60 px, fundo da cor do acento a 15–25 % com blur de fundo de
20 px, borda de 2–4 px a 60 % de branco e brilho interno. Entra com escala 0,8→1, rotação Y de 20°→0 e desfoque
em 6–8 Q. Flutua ±6 px em 2 s.
*Remotion:* `backdrop-filter: blur(20px)` + `perspective`. *AE:* forma + CC Glass/Bevel + câmera 3D. *SFX:* tique
de UI agudo (4–6 kHz) + "pop".

**T14. Quadro dentro do quadro (adesivo).** A cena atual encolhe para 35–45 %, ganha uma borda branca de 8–12 px e
cantos de 40 px, gira 8–12° e vai para a lateral enquanto a nova cena entra por trás (`Dd055` 4,6–5,0 s).
*Remotion:* duas camadas; a de cima com `scale` 1→0,4, `rotate` 0→10°, `translateX` +30 %, em 8 Q com expo.
*SFX:* whoosh de 0,25 s + "flip" de papel.

**T15. Estalo de câmera (entrada).** Escala de 150–250 % → 100 % e posição de cima ao centro em 6–9 Q, expo de
saída e desfoque de movimento (E14, `De9DK` 0–0,3 s).
*SFX:* whoosh de ruído largo de 0,4–0,6 s.

**T16. Respiração de câmera.** Escala +5–12 % linear ao longo do bloco.
*SFX:* — (o pad sustenta).

**T17. Recuo que revela.** A pessoa encolhe 100 → 65–75 % e desce, abrindo o terço superior para um bloco gráfico
maior (`Ddtgn` 3,3–3,8 s), com desfoque de profundidade no fundo.
*SFX:* "whoosh reverso" curto.

**T18. Chicote de produto.** Um objeto 3D/PNG cruza a tela com desfoque direcional de 40–60 px em 3–5 Q e assenta
com rotação residual de 5° (`DcigZ`).
*Remotion:* `translateX` −120 % → 0 com blur direcional via SVG `feGaussianBlur stdDeviation="40 0"`.
*SFX:* whoosh + impacto leve.

**T19. Cone ou polígono de luz.** Um triângulo branco nasce de um ponto (círculo de 12 px no vértice), gira e
cresce até cobrir a tela, trocando o fundo (`DcigZ` 2,25–5,6 s).
*Remotion:* `clip-path: polygon()` animado. *AE:* forma com caminho animado. *SFX:* "swell" de ar + whoosh longo.

**T20. Forma que cresce e cobre (E14).** Um quadrado branco do canto cresce até a tela inteira e vira o novo fundo.
*SFX:* rajada de cliques + whoosh.

**T21. Elemento-guia contínuo.** Ponto de luz amarelo com glow (cometa) que "escreve" a frase e se transforma em
barra (`DaIq` 0–2,6 s), ou um quadrado que vira pontos, raios e o logo (E14).
*Remotion:* o mesmo componente durante o vídeo todo, com props morfando. *SFX:* drone + cliques a cada mudança.

**T22. Risco ou arco de luz.** Linha branca brilhante (3–6 px com bloom) que corta o quadro em 2–4 Q, na diagonal
ou em arco, e serve de corte (`DKj2` 8,5 s, `De9DK` 1,9–2,1 s, `DdYn` 4,25 s em fundo de raios).
*SFX:* "zap" elétrico curto.

**T23. Pixelização de saída.** Mosaico crescente 1→40 px em 3 Q + opacidade 0.
*FFmpeg:* `pixelize`/`scale` baixo + `neighbor`. *Remotion:* canvas em baixa resolução ampliado com
`image-rendering: pixelated`. *SFX:* "glitch" de 0,1 s.

**T24. Alternância cru/editado no fecho.** A partir de ~5 s, corta entre a versão crua e a editada **a cada colcheia
da música** (0,21–0,375 s) por 2–3 s; cada retorno ao "editado" reinicia a animação da legenda.
*Remotion:* `const raw = Math.floor((f-start)/step)%2===0`. *Premiere:* marcadores de batida + corte (ferramenta
`detect_beats`). *SFX:* a batida faz o trabalho; no máximo um "tape stop" no fim.

**T25. Bastidor com etiqueta de etapa.** Tela do vídeo em cartão (cantos de 30 px) sobre cinza #e5e5e5 e, embaixo,
uma pílula cinza com o nome da etapa e um cursor vertical que corre como a agulha da timeline. Na última etapa, a
pílula fica na cor do acento ("Result").
*Remotion:* `<StageLabel name progress>`. *SFX:* clique a cada troca de etapa.

**T26. Antes/depois lado a lado.** "Before" pequeno (40 % da largura) atrás à esquerda, "After" grande (55 %) à
frente à direita, com sombra de 30 px e etiquetas de 1 % em cima.
*SFX:* —

**T27. Paleta como HUD.** Bolinhas da paleta com o código hex escrito em mono, num arco acima da cabeça, que mudam
junto com a gradação (`Dcf4I`).
*SFX:* "blip" por bolinha.

**T28. Tinta/nanquim (fase antiga).** Mancha preta que se expande do centro com bordas orgânicas em 6–10 Q (luma
matte de tinta) e revela o fundo preto do fecho (`DKj2` 12,2–12,9 s).
*AE:* matte de tinta (stock) como Track Matte. *SFX:* "splash" grave + reverb.

**T29. Monitor filmado (vitrine).** Gravar a tela com o celular, num ambiente escuro com luz RGB de PC na cor da
marca, e colocar a legenda curta em sans condensada branca centralizada no topo, com "👀".
*SFX:* a música do próprio vídeo, saindo da caixa.

**T30. Logo de fecho.** Palavra condensada (ou sans) + segunda palavra manuscrita ou em etiqueta de acento,
sobreposta em diagonal, em fundo chapado, montada por máquina de escrever ou desfoque em 0,5–1 s e parada por
≥ 1 s.
*SFX:* impacto com cauda de 1 s ou só o último acorde.

---

## 5. Plano para replicar aqui

### 5.1 Componentes a construir (ordem de prioridade)
1. **`RevealFlash`** (T2 + T3): flash de 1 Q, estalo de escala com blur e troca de LUT, com o par de áudio
   (filtro no cru → drop). É o que mais "vende" e é simples de fazer.
2. **`TriadTitle`** (T5 + T7 + T12): legenda em 3 vozes com entrada de desfoque e escala, marca-texto e contorno. Fontes
   livres equivalentes: **Antonio / Six Caps / Bebas Neue** (condensada), **Inter Black** (pesada),
   **Inter/Poppins** (apoio), **Mrs Saint Delafield / Allura** (manuscrita), **Silkscreen** (pixel),
   **Courier Prime** (mono).
3. **`PixelBuild`** (T6 + T23): blocos de pixel com glow que montam e desmontam qualquer camada.
4. **`MonoGrade`** (T4): preset de gradação de matiz único (FFmpeg + Lumetri `.cube`) por cor de marca.
5. **`CommentCard`** (T1) e **`RawEditToggle`** (T24, lendo as batidas da música).
6. **`DepthText`** (T11): pilha fundo/texto/pessoa recortada (usar `recortar.py`).
7. **`GlassCard`** (T13) e **`StickerShrink`** (T14).
8. **`ScrambleText`** (T8), **`Typewriter`** (T9) e **`WordSwap`** (T10).
9. **`LightCone`** (T19), **`LightStreak`** (T22) e **`ProductWhip`** (T18).
10. **Pacote de SFX** (skill `sound-effects`): cliques de UI em 3–4 variações, rajada de 8 bits, whoosh curto e
    longo, impacto com sub, "zap", flash/shutter; e um modelo de mixagem a −14 LUFS.

### 5.2 Vídeo-teste sugerido — Ellcazo, 8 s (V1 "antes/depois" com acabamento V2)
Ideia: mostrar o que a Ellcazo faz com um vídeo comum. Pessoa sentada em fundo cinza-claro (gravação própria ou
banco de imagens), 1080×1920, 30 fps, música de 128–140 BPM, master a −14 LUFS.

| Tempo | Imagem | Texto | Som |
|---|---|---|---|
| 0,00–2,10 | Plano cru: pessoa pequena e centralizada, gradação chapada | Cartão de comentário no topo: "Meu vídeo tá sem graça 😕" / resposta cinza "deixa comigo" (T1) | Música abafada (passa-baixa de 800 Hz) |
| 2,10–2,13 | **Flash branco** de 1 Q (T2) | — | Impacto + **drop** (filtro abre) |
| 2,13–2,26 | Estalo 112 → 100 % com desfoque; gradação monocromática na **cor da Ellcazo** (T4) | — | whoosh curto |
| 2,26–3,60 | Respiração +6 % (T16) | Apoio "Seu vídeo merece" → palavra gigante **"atenção"** atrás da cabeça (T11), montada por blocos de pixel na cor da marca (T6) | rajada de 6 cliques |
| 3,60–4,30 | — | Manuscrita "de verdade" cruzando a palavra em −8° + 2 losangos laterais (T12) | 1 clique + "swish" |
| 4,30–5,10 | A cena encolhe para um adesivo à esquerda (T14); um cartão de vidro com "+3x retenção" entra à direita (T13) | número com degradê | whoosh + tique de UI |
| 5,10–7,00 | **Alternância cru/editado em colcheias** (T24) | a legenda reinicia a cada retorno | só a batida |
| 7,00–8,00 | Fundo chapado na cor da marca | Logo **"ellcazo"** + etiqueta "edita." em marca-texto (T30), entrando por máquina de escrever (T9) | impacto com cauda |

**Critério de aceite:** gancho de 2,0–2,25 s, revelação em ≤ 5 Q, 1 cor de acento só, cada evento com um som,
nenhum texto acima de 3 linhas, −14 LUFS ± 0,5.

**Armadilhas (o que NÃO copiar):** cor diferente por palavra sem trocar a gradação junto; texto cobrindo o rosto;
mais de uma fonte "de efeito" na mesma cena; usar a voz do cliente por baixo da música do antes/depois em peça
de cliente (no portfólio dele funciona, mas num anúncio o cliente precisa ser ouvido; aí aplicar o sistema só nos
inserts de motion).
