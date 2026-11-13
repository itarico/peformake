# Estudo — @earn.edits (EarnEdits.com · "The #1 Marketplace for After Effects project files" · 55 mil) — 10/11/2026

Pedido do Italo: "estilo de edição, efeitos, tudo, principalmente o motion". Regras seguidas: (a) extrair a
**gramática transferível** com parâmetros, não o assunto (Buffett, Munch, escova de dente…); (b) quando o vídeo
ENSINA (tutorial, venda de template/plugin), registrar também **o que ensina**.

**Base:** 50 vídeos em `D:\PEFORMAKE\REFERENCIAS\_perfis\earn.edits\Instagram\{36613080382,79951307195}\<id>\` + 3 antigos
em `_salvos\edicao\Instagram\*\{Ddn42dGOwnB,DfPbRFWu-JU,DfZoBRQuHwq}` (já classificados como E5) = **53**. Todas as
legendas e transcrições lidas; `sequencia_densa.jpg` (1 fps) aberta em **20 vídeos** (`DYURMKHoayc`, `De6bR-1OtGX`,
`Dd08TpPONpx`, `DeT0eHIOsF5`, `DejCY9oON_K`, `Db2uSdmoVU0`, `DeL6ofYO53w`, `De35LSAOxYG`, `DdTLN94OGKB`, `Deo4vvkISxi`,
`DdtaQr_O7w7`, `DcaqrJkOiD3`, `Dc0KeKyOQZE`, `DfCOvq7ucAv`, `DcJM47zIj-t`, `DetbkyuOUL8`, `DfUdhZJuXUv` e os 3 antigos
via catálogo). Medições com FFmpeg 9.0.2: **detecção de cena a 0,18 nos 53** (o `cortes.csv` original subestima) e
taxa de quadros real de cada arquivo. **Folhas densas com carimbo de tempo** (`seq_*.jpg`) + **recortes em
resolução cheia** (`recorte_<t>.jpg`) + ataques (`onsets.txt`, `a.wav`) gerados em 5 vídeos-chave — ver §2.0.
Vocabulário: E1–E26 (`catalogo_estilos.md`), T1–T30 (`estudo_aslaniedits.md`), E27–E34 (`estudo_rabbits.md` /
`estudo_omarcosvianna.md`). **Novos aqui: E35–E37 e EE1–EE28.** (O @dacostamotion continua em E38+ / DC1+.)

---

## 1. Visão geral

| Item | Valor medido |
|---|---|
| Vídeos | 53 (os 50 do perfil vão de 14/05 a 04/11/2026) |
| Duração | **mediana 32,6 s** (quartis 27–40 s); tutoriais longos 68 s e 96 s; vitrines de brinde 10–22 s |
| Formato | **31 em 9:16** (1080×1920) · **17 em 16:9** (1916×1078, quase todos publis de IA/SaaS e comerciais) · 1 quadrado · 1 4:3 |
| Quadros/s | 24 de 50 em 30 fps, mas **16 de 50 exportados a 15, 16 ou 18 fps** — é o "posterize time" que eles próprios ensinam (§5): o movimento fica "em degraus", cara de stop-motion/documentário de recorte |
| Loudness | **−14 LUFS cravado** (−14,0 a −15,2) em todos; pico até +3,9 dBTP em alguns 16:9 (clipam — não copiar) |
| Eventos de imagem (cena 0,18) | mediana **0,45/s**; documentários 0,6–1,6/s; tutoriais 2,2–2,4/s (`DeT0` 152 em 68 s, `DejC` 119 em 49 s); vitrines 0–0,3/s |
| Fala | locução em off em ~44 de 50 (inglês, voz masculina grave de "documentário", 2,5–3 palavras/s); só música nas vitrines |
| Legenda do post | longa, com emoji em todo parágrafo, e termina sempre em "Full project file inside EarnEdits 🔗" ou "Comment X" |

**Formatos do perfil (embalagem):**
1. **Mini-documentário narrado (≈ 22)** — história de 30–45 s (finanças, invenções, arte, mistério) feita no estilo que
   eles vendem. É **o anúncio do produto**: o vídeo é o template, e o fecho diz "Editors, grab the project file".
2. **Publi de IA/SaaS em 16:9 (≈ 12)** — InVideo, Higgsfield/Claude, Blink, Base44: desktop com wallpaper, janela de
   app e "Comment X". Feitas para o patrocinador; estilo genérico (E15).
3. **Tutorial (≈ 6)** — parallax 2,5D (`DeT0`), "contraste" (`DejC`), plugin de grade (`DfCO`), "base 44"/ideias.
4. **Isca de comentário (≈ 8)** — presets, SFX pack, plugin grátis, "JOKER" (`Deo4`, mostra *assets × animation* com a
   timeline embaixo), Discord, Frame War (concurso de US$ 250).
5. **Comercial de produto 16:9 (3)** — Durex `Db2u`, MouthPad `Db7v`, "extend scene" `DeE9`.

**Resumo em uma frase:** é uma **fábrica de mini-documentários de colagem 2,5D** — fundo de mesa/parede real, objetos e
pessoas recortados como adesivos, uma imagem por frase, tipografia que muda de família conforme a "época" do assunto,
movimento em 15–16 fps e um **fecho-CTA diegético** que é sempre o mesmo esqueleto.

---

## 2. O sistema de estilo (o que se repete)

### 2.0 Arquivos gerados (pasta de cada vídeo)
| Vídeo | Gerado | Para quê |
|---|---|---|
| `DYURMKHoayc` (Buffett, 12,9 mil curtidas, 16 fps) | `seq_0-12s_8fps.jpg`, `seq_36-47s_4fps.jpg`, `recorte_{2.5,9.5,11.5,40.5}.jpg`, `a.wav`, `onsets.txt` | gancho de números em placas, mesa top-down, contador, CTA |
| `De6bR-1OtGX` (laboratório) | `seq_0-10s_8fps.jpg`, `recorte_{1.4,7.6,9.8}.jpg` | cena gerada por IA + caixão (transição por objeto), data digitada, pílula de nome |
| `DejCY9oON_K` (contraste) | `seq_0-12s_8fps.jpg`, `recorte_{1.8,8.8}.jpg`, `a.wav`, `onsets.txt` | tutorial de conceito, 2,4 eventos/s |
| `DeT0eHIOsF5` (parallax) | `seq_0-8s_6fps.jpg`, `recorte_{30,45}.jpg` | tutorial na bancada verde |
| `DcaqrJkOiD3` (Dyson) | `seq_0-10s_6fps.jpg`, `recorte_7.6.jpg` | isolamento de cor que acende na palavra + legenda serifada no centro |

**Linha do tempo medida — `DYURMKHoayc` 0–12 s (o gancho-modelo do perfil):**
| Tempo | Imagem | Texto | Som (`onsets.txt`) |
|---|---|---|---|
| 0,00–1,06 | Mesa de quadriculado (top-down) com tablet; no tablet, Buffett-caricatura (cabeça grande) num gramado; balão de fala | legenda "Warren Buffett has" (sans branca bold, caixa preta a 50 %, y ≈ 76 %) | ataques 0,31 / 0,50 / 0,87 / 0,95 s (cliques de UI + papel) |
| 1,06–1,25 | **Corte para o recorte** do Buffett sobre branco; em 2 quadros, **camadas de feltro vermelho em contorno concêntrico** "crescem" à volta dele (alvo/ondas) | — | 1,16 / 1,30 s (impacto + whoosh) |
| 1,25–2,40 | Placa de papel branca com **"300"** sob os pés; em 2,00–2,40 um **remendo de papel vermelho "81"** sobe e cobre os dois zeros → "381" | "$381 billion in" | 1,83 / 1,94 / 2,17 s (papel) |
| 3,00–3,90 | Mesmo plano | **manuscrita amarela** "Billion dollars" se escreve no topo (1 letra ≈ 2 Q) | 2,93 / 3,31 / 3,40 s |
| 3,90–5,10 | Leque de notas de US$ 100 girando (transição por objeto) | "cash." | 4,10 s (impacto) |
| 5,10–7,40 | Mesa com **bandeira da Grécia** como toalha, moedas e canetas nas bordas | manchete branca **empilhando 1 palavra a cada ≈ 0,25 s** ("THEN / THE / WHOLE / COUNTRY / OF / GREECE") | 1 ataque por palavra (5,62 / 5,77 / 6,25 / 6,56 / 6,93 s) |
| 7,40–8,60 | **Cartão com o mapa** desliza da esquerda em 3 Q e cobre a manchete | "makes." | 7,24 s |
| 8,60–10,25 | Foto real do Buffett em estúdio; manchete **amarela** sobe palavra por palavra com desfoque de entrada | "BUT HE IS NOT / SPENDING IT" | — |
| 10,25–11,00 | **Contador em cartela**: "one/1" (fundo vermelho) → "two/2" (preto) → "three/3" (preto), **0,25 s cada, o fundo troca a cada número** | numeral black gigante + palavra pequena acima + mini-grade de quadradinhos | 1 clique por número |
| 11,00–12,00 | Fundo branco; **"1 3 2"** com o 3 vermelho na frente (dígitos sobrepostos) + "THREE YEARS" | — | — |
Densidade: **193 ataques em 47 s (≈ 4/s)** — há um som (papel, clique, whoosh, impacto) em quase todo evento;
andamento da trilha ≈ 85 BPM. Em `DejCY9oON_K`, 193 ataques em 49 s, ≈ 98 BPM.

### 2.1 Composição e cenário
- **Palco = superfície física.** Em quase todo documentário a cena é (a) **mesa vista de cima** (tapete de corte verde
  com grade, papel quadriculado, madeira, feltro verde de cassino, couro) com objetos reais nas bordas (canetas, moedas,
  teclado, relógio, prancheta, fone, câmera Polaroid) ou (b) **parede de "estúdio"** (lambri de museu com arandela,
  parede de tijolo, quadro-negro, papel kraft com spot de luz). O centro (35–75 % da altura) fica para o "herói" do
  plano; os props ocupam as **bordas** e cortam para fora do quadro.
- **Um herói por frase**, recortado (pessoa, objeto, jornal, foto), com **borda branca de adesivo** ou moldura de
  polaroid e **sombra projetada** (deslocamento 8–20 px para baixo-direita, desfoque 20–40 px, 35–50 %).
- **Personagem histórico = cena gerada por IA** fotorrealista (Munch no ateliê, Addis na cela, cientista no
  laboratório, Dyson em P&B) e o **real (arquivo) só no fim**, como prova (`Dcaq` 30–34 s: entrevista real do Dyson).
- **Escala lúdica:** pessoa de corpo inteiro **pequena** (25–40 % da altura) em cima de fotos de dinheiro, sobre um
  mapa, dentro de um alvo; ou cabeça gigante (fisheye "bobblehead" do Musk em `DfUd`).
- **Eixo central** para a manchete; a legenda de fala fica na base (y ≈ 72–76 %); o topo fica livre para o título.

### 2.2 Cor, textura e grão
- **Paleta por assunto, não por marca:** sépia/âmbar + vermelho-tijolo para 1850–1920 (`DcJM`, `Detb`); azul-royal +
  verde-feltro + vermelho para finanças (`DYUR`); creme + vermelho pop + teal para "retro-futuro" (`DfUd`); frio
  azul-cinza + vermelho de alerta para mistério (`De6b`); P&B + **um objeto em cor** (amarelo) para biografia (`Dcaq`).
- **Textura sempre:** papel envelhecido, quadriculado, poeira; ruído ~10 % (eles ensinam "noise at 10 %"); **vinheta
  oval forte** (o centro iluminado como spot, cantos −40 a −60 %) — às vezes vira literalmente um foco de luz (`DcJM`).
- **Movimento em 15–16 fps** (posterize time) em boa parte do perfil: junto com a textura, tira a "cara de software".
- **Sem grading de cinema sofisticado:** o "look" vem da direção de arte (props, papel, luz de spot) e não de LUT.

### 2.3 Tipografia
| Voz | Fonte provável | Tamanho (altura da letra / altura do quadro) | Uso |
|---|---|---|---|
| **Manchete** | grotesca black condensada (tipo Anton / Bebas Neue / Druk) ou **slab de máquina de escrever** (tipo Courier Prime Bold / Special Elite) nos temas antigos; **serifada Didone itálica** (tipo Playfair Italic) nos temas de arte | 4–9 % | 1–4 palavras: "WENT UP **80%**", "THE SCREAM", "1893", "Still nobody cared." |
| **Destaque** | a mesma da manchete em **cor de destaque** (vermelho #e3001b, amarelo #f5c400, verde-lima) ou **número** em placas/LED | 8–15 % | número ou palavra-pico |
| **Legenda de fala** | sans pequena branca (Helvetica/Inter Bold) sem caixa ou em **caixa preta a 50 %** (`DYUR`); ou **serifada itálica centralizada** palavra-grupo por palavra-grupo (`Dcaq`, `Detb`) | 1,4–2,2 % | a fala inteira, 1–4 palavras por vez |
| **Etiqueta** | sans ou slab em **tarja de papel**, fita, placa de nome, polaroid | 1,5–2,5 % | nome de pessoa, data, rótulo |

- **A família tipográfica muda por vídeo** conforme a época/tema (direção de arte por assunto — EE15), mas a
  **hierarquia é fixa**: manchete grande no topo ou no centro + legenda de fala pequena embaixo.
- **Manchete em 2 linhas com troca de cor** ("BUT HE IS NOT / SPENDING IT" amarelo sobre preto; "THAT'S / VERY HIGH"
  amarelo sobre vermelho) e **palavra-pico entrando por último**, maior.
- Animações de texto: palavra a palavra com pop (escala 80→100 % em 3–4 Q), **digitação** (slab), letras que "caem"
  em papel, palavras espalhadas que viram traços (`DejC` "it became a symbol of fear").

### 2.4 Transições (em ordem de frequência)
1. **Objeto-transição:** um objeto da cena cresce/atravessa e cobre a tela (a mão que entra com dinheiro, o jornal
   que gira para a câmera, o caixão que se fecha sobre a cientista e vira uma cova vista de cima — `De6b` 0–3 s).
2. **Íris / binóculo / fechadura:** máscara circular preta que fecha no detalhe ou abre a próxima cena (`DYUR` 15–18 s,
   `De6b` 33 s).
3. **Push-in contínuo + corte seco na fala** (E5 clássico).
4. **Nuvem/névoa cruzada** (`Dcaq` 4 s, `Dd08` 0 s) e **desfoque de rack** na entrada.
5. **Pan de câmera sobre a mesa** (a câmera "anda" da prancheta ao teclado — um único plano 2,5D com vários
   heróis).
- Nada de transição pronta de software (cubo, zoom-blur genérico).

### 2.5 Câmera 2D/3D
- **2,5D de verdade** (ensinado em `DeT0`): camadas 3D no After Effects separadas em Z, **câmera 3D ligada a um
  null** que anda devagar (push 3–8 % por plano + leve deriva lateral), Puppet Pin no personagem para respirar.
- **Plongée zenital** na mesa (objetos com sombra coerente vinda de cima-esquerda).
- **Leve inclinação de câmera** (2–6°) em jornais e cartões, que endireitam em 6–10 Q.
- **Empurrões curtos** no início de cada frase (escala 104→100 % em 6 Q) dão o "pulso" da narração.

### 2.6 Tempo e ritmo
- **1 frase = 1 cena-herói**, 2–4 s cada; dentro da cena, **1 evento a cada 0,5–1,0 s** (palavra que entra, número
  que troca, mão que mexe). Por isso a detecção dá 0,6–1,6 eventos/s nos documentários.
- **Arco fixo (≈ 40 s):** gancho-paradoxo 0–3 s ("Most great inventions come from labs. This one came from a jail
  cell.") → data/nome 3–8 s → fatos em ordem 8–28 s → virada/pergunta 28–35 s → **CTA "Editors…" 35–45 s**.
- **CTA sempre nos últimos 4–8 s**, com a mesma frase-modelo: "Editors, grab the After Effects project file on
  earnedits.com" / "Some editors rewatch this. Others open the project file" / "Editors, stop reverse engineering it".

### 2.7 Som
- Locução grave seca em primeiro plano; **trilha de documentário** (pulso de cordas/sintetizador, 90–110 BPM) a −8
  a −12 dB sob a voz; **SFX de papel, carimbo, obturador, máquina de escrever, whoosh curto** em cada entrada de
  herói (dicionário do `sound_design.md` aplicado à risca).
- **Impacto grave + respiro** antes da virada ("Why?"), e a música **sobe 3–4 dB** no CTA.
- Os 16:9 de publi usam trilha corporativa e cliques de UI.

---

## 3. Variações (famílias)

### E5. Retrô-documentário cinematográfico — (já existe) · `Ddn42`, `DfPb`, `DfZo`, `De6b`, `Dd08`, `DfIJ`
Quando o assunto é mistério/arte e as cenas são **ambientes gerados** (não mesa): push-in contínuo, névoa, texto que
pertence à superfície, data como capítulo. No perfil atual, o E5 é uma das quatro "peles" do E35.

### E35 (novo). Documentário de mesa 2,5D (colagem tátil) — ≈ 22 vídeos · carro-chefe
- **Composição:** superfície física como palco (mesa top-down ou parede de estúdio) + 1 herói recortado por frase
  (adesivo com borda branca e sombra) + props reais nas bordas + **mãos reais** que entram e mexem.
- **Cor/textura:** paleta por época; papel, poeira, ruído 10 %, vinheta-spot; movimento em 15–16 fps.
- **Tipografia:** manchete condensada/slab/Didone conforme a época + destaque colorido + legenda branca pequena.
- **Ritmo:** 1 frase = 1 cena (2–4 s), 1 evento a cada 0,5–1 s; transição por objeto ou íris.
- **Câmera/som:** câmera 3D lenta sobre camadas; papel/carimbo/obturador em cada entrada; CTA diegético no fim.
- **Peles (mesmo esqueleto):** (a) arquivo sépia `DcJM`, `Detb`; (b) finanças pop azul-verde `DYUR`, `DcsZ`;
  (c) retro-futuro saturado `DfUd`, `DeG9`; (d) biografia P&B com 1 cor `Dcaq`, `Del7`; (e) mistério frio = E5.
- Ex.: `DYURMKHoayc`, `DcJM47zIj-t`, `DetbkyuOUL8`, `DcaqrJkOiD3`, `DdtaQr_O7w7`, `DfUdhZJuXUv`, `De_bWY8uVPJ`,
  `DcszHOXuFU6`, `DeG9eYVOknN`, `Del7Vohuw9D`, `DeB2BnjOvHp`, `DcijzMlOiKS`, `DdlOmjlOR0b`, `De1Y1irudTh`.

### E36 (novo). Tutorial de bancada (a interface vira objeto) — 4 vídeos
- **Composição:** o mesmo **tapete de corte verde** com grade e vinheta como fundo fixo; as janelas do After Effects,
  pastas, PNGs e o celular-composição aparecem como **cartões físicos** com borda clara e sombra, entrando e saindo
  da mesa; nunca a tela crua em tela cheia.
- **Cor:** verde-tapete #2e7d4f–#1f5f3a + branco + **um** acento (amarelo-pasta, laranja de título, verde-lima com
  glow); títulos de passo em condensada com contorno ("ASSETS", "CLOUDS", "FLARE EFFECT").
- **Tipografia:** rótulo de passo condensado 4–6 % no topo do cartão + frase pequena de apoio.
- **Ritmo:** **2,2–2,4 eventos/s** — um passo a cada 1,5–3 s, e cada passo tem 3–5 micro-eventos (cartão entra,
  zoom no menu, clique, resultado).
- **Câmera/som:** câmera que mergulha na janela (zoom 100→180 % no menu certo) e volta; **anel de clique brilhante**
  no cursor; clique de mouse + whoosh por evento.
- Ex.: `DeT0eHIOsF5`, `DfCOvq7ucAv`, `DezENZFuBDN`, `DeYxPaYuPeU`.

### E37 (novo). Ensaio de conceito encenado (a imagem é a explicação) — `DejCY9oON_K` (+ trechos de `DeB2`)
- **Composição:** cada palavra-conceito ganha uma **demonstração visual literal**: "size" = carro pequeno × grande;
  "color" = tudo cinza e um olho vermelho; "speed" = foguetes lentos × rápido; "density" = globo cheio × vazio.
- **Cor:** cada bloco tem fundo próprio (quadriculado claro → azul-royal → preto → verde-tapete), sempre com recortes
  de papel e colagem de jornal.
- **Tipografia:** condensada com contorno + recortes de letras ("LACK", "CONTRAST" em azul em caixa vazada).
- **Ritmo:** 2,4 eventos/s; o vídeo é denso de propósito, mas **cada bloco tem um único foco** (é a própria lição).
- Uso: explicar um princípio (o "porquê" de algo) sem rosto.

### E15. Demo narrada em UI escura — (já existe) · publis 16:9
`DeL6`, `Deg0`, `Ddqc`, `Ddyb`, `DcveO`, `Dd3i`, `DeQ6`, `DeeJ`, `DfMf`, `Dclf`, `Dd6J`: wallpaper de paisagem (macOS),
dock, janela do app escura, prompt digitado, laranja como acento, logo do produto no fim sobre mosaico desfocado.
**Variante "keynote claro"** (`De35` Blink, `Db2u` Durex) → técnica EE21.

### E20. Breakdown com processo exposto — (já existe) · iscas de project file
`Deo4vvkISxi`/`DdWIFsYui3_`: tela dividida **"Assets" (colunas de PNGs com fundo verde-croma) | "Animation"** em cima e
a **timeline real do After** rolando embaixo, com o CTA gigante "COMMENT 'JOKER'" fixo por cima. 28,8 s, 0 cortes,
15–16 fps.

---

## 4. Catálogo de técnicas novas (EE1–EE28)

Convenção: 1080×1920, 30 fps (ou 15/16 quando indicado). "Q" = quadros. Quando a técnica já existe, aponto o T.

**EE1. Exportar "em degraus" (posterize time 15–16 fps) + ruído 10 %.** O movimento é animado a 30 fps mas
renderizado a 15–16 fps (ou Posterize Time 16–17 numa camada de ajuste); por cima, ruído monocromático 10 %.
*Ensinado por eles em `DeT0` 0:49–0:58.* *AE:* camada de ajuste com Noise 10 % + Posterize Time 16. *Remotion:*
`const f = Math.floor(frame/2)*2` antes de todo `interpolate` (stepped) + overlay de ruído (SVG `feTurbulence` com
seed por quadro, `opacity .1`). *FFmpeg:* `fps=16,noise=alls=10:allf=t` (ou manter 30 fps com `framestep=2,
fps=30`). *Premiere:* Posterize Time no clipe aninhado. *SFX:* —.

**EE2. Mesa top-down como palco fixo.** Um fundo de superfície (tapete de corte verde, quadriculado, madeira, feltro)
fotografado/gerado de cima, com 4–7 props reais nas bordas (cortados pela moldura, nunca inteiros). O herói da frase
entra no centro. A mesa fica a mesma por 3–5 frases e muda na virada.
*Remotion:* `<Desk bg props={[...]} >` com props em `position:absolute` nas bordas e sombra comum `drop-shadow(12px
16px 24px rgba(0,0,0,.45))`. *AE/Premiere:* comp de mesa reaproveitada (precomp). *Aqui:* gerar o fundo por IA com
prompt "top-down flat lay, empty center" + props recortados com `recortar.py`. *SFX:* ambiente de sala baixo.

**EE3. Recorte-adesivo (sticker).** Herói recortado com **borda branca de 6–12 px**, cantos levemente arredondados,
sombra projetada 10–20 px e às vezes um "levantar" (rotação 3–6°, escala 0,92→1 em 6 Q com ultrapassagem de 3 %).
*Remotion:* `filter: drop-shadow(0 0 0 #fff)` não funciona para borda — usar contorno por `feMorphology dilate
radius=8` + `feFlood #fff` no SVG. *AE:* Stroke em Layer Styles ou "Simple Choker" negativo + Fill branco. *SFX:*
"paper flick" curto.

**EE4. Mãos reais em stop-motion.** Mãos (fotos recortadas ou vídeo croma) entram pela borda e **fazem a ação da
frase**: deslizam notas, escrevem o ano com caneta, seguram o jornal, colocam os ícones .AEP, raspam o osso.
Entrada em 6–8 Q, ficam 0,6–1,2 s, saem em 4–6 Q. Em 15–16 fps parecem animação de recorte.
*Remotion:* PNG de mão com `translate` a partir da borda + 1–2 quadros de pose alternada. *AE:* Puppet Pin no PNG.
*Aqui:* filmar mãos sobre fundo verde com o celular de cima. *SFX:* papel/deslize + o som do objeto.

**EE5. Etiqueta de papel no corpo e polaroid com nome.** O nome da pessoa vem em **duas tiras de papel creme**
coladas no peito ("Elias" / "Howe"), entrando uma de cada vez (5 Q cada, levemente tortas −4°/+3°), ou numa
**polaroid** inclinada 8–15° com o nome escrito na margem em sans condensada.
*Remotion:* `<PaperTag text rotate>` com textura de papel em `background-image` e sombra curta. *SFX:* "stick"
(fita adesiva) por tira.

**EE6. Número em placas que trocam (contador físico).** O número é montado em **placas/azulejos** (cada dígito numa
peça branca ou vermelha) que trocam com rolagem ("3 → 381", "1 → 132") ou em **dígitos de LED/pixel** com contorno
("230 PERCENT") e às vezes em um **carimbo** por cima (selo "US").
*Remotion:* `<FlipDigits value from to>` — cada dígito com `translateY` de −100 %→0 em 4 Q, defasagem de 2 Q entre
dígitos. *AE:* Numbers + Posterize. *SFX:* clique mecânico por dígito; tique de relógio no LED.

**EE7. Íris / binóculo / fechadura.** Máscara preta com 1 ou 2 círculos (binóculo) que fecha sobre um detalhe
(mão com dinheiro) e abre a cena seguinte; bordas com desfoque 10–20 px. Fechar 8–10 Q, segurar 4–6 Q, abrir 8 Q.
*Remotion:* `clip-path: circle(r at x y)` animado; binóculo = duas máscaras unidas. *FFmpeg:* `geq` com hipot
(gerar máscara uma vez). *SFX:* "shutter" lento ou whoosh grave.

**EE8. Isolamento de cor (P&B + 1 objeto) que acende na palavra.** Cena em P&B de alto contraste e **um único
objeto em cor saturada** (aspirador e pasta amarelos #e6e04a, a fita vermelha), que é o assunto da frase. Medido em
`Dcaq`: o aspirador fica cinza de 6,0 a 7,2 s e **ganha a cor em 2 Q exatamente quando a locução diz "vacuum"**
(7,33 s) — a cor é a "legenda" da palavra.
*AE:* Leave Color / Hue-Sat com máscara. *Remotion:* duas camadas (P&B `filter:grayscale(1) contrast(1.2)` + o
objeto recortado colorido por cima). *FFmpeg:* `hue=s=0` + overlay do recorte. *SFX:* —.

**EE9. Legenda serifada itálica no centro do plano.** A fala aparece **no meio da imagem** (y ≈ 45–55 %), em serifada
itálica branca 3–4 % com sombra difusa (20 px, 60 %), 1–4 palavras por vez, trocando no tempo da fala; às vezes as
palavras ficam **em cascata diagonal** (uma por linha, deslocadas 8–12 % para a direita: "There / has / to / be / a /
better / way").
*Remotion:* `<CenterCaption words style="italicSerif" layout="cascade|inline">` a partir do `captions.json` do
`transcrever.py`. *SFX:* nenhum (a voz basta).

**EE10. Manchete de jornal fabricada.** Um jornal (prop gerado) com manchete do fato, **marca-texto** amarelo/verde
em uma linha e **círculo vermelho** à mão no número-chave; entra girando de 15° para 0° e com leve "zoom de
leitura" até a manchete. Também como **mesa de detetive**: fotos P&B pregadas com tachinha e barbante.
*Remotion:* componente `<Newspaper headline highlight circleOn>` (layout HTML de jornal + textura). *SFX:* papel
amassando + "pen scribble" no círculo.

**EE11. Tela de TV/CRT como moldura de texto.** Moldura de tela arredondada (com borda costurada, chiado) sobre
fundo escuro; a frase entra **linha por linha, cada linha numa cor** (branco, azul, vermelho, verde, amarelo) com
brilho de fósforo 10–20 px.
*Remotion:* `border-radius: 18%/12%`, `box-shadow inset`, `text-shadow` na cor da linha. *SFX:* "TV on" + zumbido.

**EE12. Palavras espalhadas que viram traços.** As palavras da frase aparecem **soltas em posições aleatórias**
(sans pequena), e ao fim se reduzem a **pequenos traços/pílulas** brancos que flutuam (como se a frase se
desfizesse) — transição para o próximo bloco (`DejC` 40–42 s; `Dd08` 32–34 s).
*Remotion:* cada palavra com `scaleX` → 0,3 e `scaleY` → 0,15 em 6 Q + `borderRadius`. *SFX:* "whisper" de ar.

**EE13. Fita/tarja com texto.** Fita de papel colorida (vermelha) ou **fita de isolamento** ("THE IDEA" repetido,
amarela/azul) que cruza a tela ou embrulha o objeto, com a frase escrita nela.
*Remotion:* `<Tape text repeat angle>` (texto repetido em `background` + `rotate`). *SFX:* fita sendo puxada.

**EE14. CTA diegético de esqueleto fixo.** Últimos 5–8 s, sempre: (1) palavra **"EDITORS"** grande (slab/condensada,
às vezes 3D extrudada) **dentro do mundo do vídeo** (no livro que abre, na mesa, sobre o céu com nuvens);
(2) **ícones .AEP físicos** (cartas roxas do After Effects) colocados por mãos ou caindo; (3) **barra de busca
digitando** "EarnEdits.com" (1 letra / 2 Q); (4) **celular** com o site; (5) em alguns, a **timeline do After em
escada colorida** como imagem. Ou seja: o CTA é uma cena do próprio documentário, não uma cartela colada.
*Para nós:* o fecho com logo do cliente + "busca digitando" + celular com o WhatsApp/site, montado com os props do
próprio vídeo. *Remotion:* `<DiegeticCTA world="desk|book|sky" items>` reutilizável. *SFX:* teclado + "pop" por
ícone + subida da música.

**EE15. Direção de arte por época.** Para cada vídeo escolhe-se um **pacote fechado**: fundo + 2 fontes + 3 cores +
1 tipo de prop. Ex.: 1890 = papel kraft, slab de máquina de escrever, sépia/tijolo, envelope com lacre; finanças =
feltro verde/azul-royal, grotesca black, notas de dólar; arte = lambri marrom com arandela, Didone itálica.
*Para nós:* montar 4 pacotes (`pacotes_arte.json`) e o roteiro escolhe o pacote pelo tema. *SFX:* combinar (máquina
de escrever só no pacote antigo).

**EE16. Interface como cartão físico + anel de clique.** Janelas do software recortadas como cartões com borda clara
e sombra sobre o tapete verde; o cursor é um **anel brilhante** (círculo de 40–60 px, verde-lima #b6ff3b com glow
30 px) que pulsa (escala 0,8→1,2, opacidade 1→0 em 10 Q) a cada clique.
*Remotion:* `<ClickRing x y at>`; janelas com `perspective` leve. *SFX:* clique de mouse real.

**EE17. Parallax 2,5D com câmera ligada a null.** *(É o que `DeT0` ensina — ver §5.)* Fundo de cor sólida (céu
azul), prédios, nuvens, personagem e chamas em camadas 3D separadas em Z (ex.: −2000 / −800 / 0 / +300); câmera 3D
filha de um null que se move 200–400 px em 3–5 s; Puppet Pin no personagem; texto 3D também em Z.
*Remotion:* `<ParallaxStack layers={[{src,z}]}>` com `translate = camX * (1 - z/zMax)` e escala por profundidade
(usar `@remotion/three` só se precisar de rotação real). *FFmpeg:* não. *SFX:* whoosh longo de ar.

**EE18. Conceito demonstrado pela imagem.** Para cada palavra abstrata, um par visual que **mostra** a palavra
(pequeno × grande, cinza × uma cor, lento × rápido, cheio × vazio). Regra deles: "Good motion design doesn't make
everything interesting. It makes the right thing interesting."
*Para nós:* pauta de explicação de serviço (ex.: "o que é logística fria") com 3–5 pares. *SFX:* um som diferente
por par (o "lento" com whoosh longo, o "rápido" com whip).

**EE19. Texto 3D extrudado com sombra longa.** Palavra em grotesca black amarela com 20–40 camadas de extrusão em
tom mais escuro e sombra longa na diagonal ("SOME EDITORS REWATCH THIS"); entra com rotação Y de 25°→0 em 8 Q.
*Remotion:* `text-shadow` empilhado (1px, 2px … 30px) ou `@remotion/three` Text3D. *AE:* Cinema 4D renderer ou
"Extrude" do Classic 3D. *SFX:* impacto metálico curto.

**EE20. Vitrine "Assets | Animation" com timeline.** (= T25/E20 com layout próprio.) Duas colunas no topo
(insumos à esquerda, resultado à direita) e a **timeline colorida rolando** no terço de baixo; CTA fixo gigante por
cima. Sem corte, 25–30 s.
*Remotion:* `<AssetsVsResult assets result timelineImg>` com a timeline em `translateX` contínuo. *SFX:* a trilha do
resultado.

**EE21. Tipografia de keynote em fundo claro.** Fundo branco/gelo; frase em sans média preta 3–4 %, com **uma
palavra em cor com glow forte** (vermelho "Risk", azul "Simple", 20–40 px de brilho); **pílulas coloridas** que
empilham (SaaS / Mobile / Chrome / AI agents, cada uma numa cor pastel, entrando de baixo a cada 0,5 s);
**tambor de palavras** (lista vertical em cinza que rola e a palavra ativa fica preta com colchetes); barra
"Less ▬ Time / More ▬ Time" que encolhe/cresce.
*Remotion:* `<WordDrum items activeIndex>`, `<PillStack>`. *SFX:* tique de UI por pílula, "tick" de catraca no tambor.

**EE22. Transição pelo próprio objeto da cena.** Um objeto da frase atual faz a passagem. Medido em `De6b`:
0,00–0,25 s rack focus do laboratório vazio → a cientista **entra com desfoque e escala 115→100 %** (0,25–0,40 s) →
1,00–1,25 s um **caixão sobe por trás dela** como recorte → 1,50 s **círculo de terra** (máscara) a envolve →
1,63 s corte para a **cova vista de cima** em P&B/negativo, a tampa fecha e a câmera recua até o caixão ficar
pequeno (até 2,9 s). Outros: o jornal que gira em direção à câmera; o leque de notas que gira e troca a cena
(`DYUR` 3,9 s); nuvens que sobem e apagam o plano (`Dcaq` 4,0–4,4 s). Duração 8–14 Q.
*Remotion:* duas cenas + objeto recortado em camada superior que escala/gira até cobrir 100 % da tela. *SFX:* o som
físico do objeto (madeira, papel) + whoosh.

**EE23. Rótulo de nome em pílula vermelha.** Nome da pessoa em pílula vermelha #d81e2c com texto branco bold 2 %,
que **cresce da esquerda** (largura 0→100 % em 6 Q) ao lado do corpo, na altura da cintura (`De6b` 9–10 s).
*Remotion:* `<NameChip>`. *SFX:* tique.

**EE24. Fundo de grade que deforma (fisheye) no fecho.** Papel quadriculado com **distorção barril** forte (as linhas
curvam para fora) atrás do texto do CTA — dá volume sem 3D (`DfUd` 32–37 s).
*FFmpeg:* `lenscorrection=k1=0.3:k2=0.1` sobre a grade. *Remotion:* SVG com `feDisplacementMap` ou grade desenhada
já curva. *SFX:* —.

**EE25. Remendo de papel no número.** Em vez de trocar o número inteiro, um **pedaço de papel de outra cor** com os
dígitos novos sobe e é "colado" por cima dos antigos ("300" → remendo vermelho "81" → "381"; `DYUR` 2,0–2,4 s),
levemente torto (3–5°) e com sombra curta. Vale para preço, data, percentual ("era 12 dias, agora 1").
*Remotion:* `<PatchNumber base="300" patch="81" at>` (translateY 40 px → 0 em 6 Q, rotate 4°). *SFX:* papel + "stick".

**EE26. Contador em cartelas com fundo alternado.** Contagem de 1 a N (anos, passos, dias) em cartelas de 0,25 s:
numeral black gigante (14–18 % da altura), palavra por extenso pequena acima entre fios ("— two —") e mini-grade de
quadradinhos que enche; **a cor de fundo troca a cada número** (vermelho → preto → preto → branco) e no fim os
dígitos se sobrepõem ("1 3 2" com o atual em vermelho na frente). *Remotion:* `<CountCards n=3 step=8>` (8 Q por
número a 30 fps). *SFX:* clique seco por número + impacto no último.

**EE27. Data digitada com sublinhado.** Fundo preto texturizado (poeira, riscos); a data em condensada branca 2,5 %
**aparece letra por letra (≈ 1 letra / 4 Q)** com cursor e um **sublinhado vermelho** que cresce junto; o bloco
sobe devagar (deriva de 3 % em 2 s) e sai com o próximo plano subindo por baixo (`De6b` 6,5–8,8 s).
*Remotion:* `Typewriter` (T9) + `<Underline color="#d81e2c" grow>`. *SFX:* teclas de máquina de escrever a −22 dB.

**EE28. Letras que caem e quicam.** Palavra-título em condensada com contorno; **cada letra cai de cima** com 1–2 Q de
defasagem e quica (ultrapassagem 8 %, assenta em 5 Q) — "BORING" em `DejC` 1,4–1,9 s; sai apagando para a
direita. *Remotion:* `spring({damping:12})` por letra com `delay=i*2`. *SFX:* "tic" de madeira por letra (pitch
variando ±2 semitons).

**Reaproveitados de T:** push-in contínuo (T16), flash de 1 Q (T2) em poucos cortes, texto atrás do objeto (T11) em
manchetes, máquina de escrever (T9) na busca do CTA, antes/depois lado a lado (T26) na publi do Claude Motion
(`Deg0`: gravação crua em cima × vídeo pronto embaixo).

---

## 5. O que ensinam

1. **Parallax/"estilo Vox" em After Effects (`DeT0eHIOsF5`, 68 s):** (1) juntar os insumos — PNG do personagem,
   chamas, prédios, nuvens, flare (Pinterest); (2) sólido preto → azul-céu; (3) **câmera 3D**; (4) importar,
   ligar 3D e **separar em camadas de profundidade**; (5) **Puppet Pin** para micro-movimento do personagem;
   (6) **null** ligado à câmera e animar a posição do null (é isso que gera o parallax); (7) **texto 3D** que acompanha
   a câmera; (8) camada de ajuste com **Noise 10 %** e **Posterize Time 16–17 fps** "para o look de documentário
   estilizado". → É exatamente a receita de EE1 + EE17.
2. **Contraste é o que deixa motion interessante (`DejCY9oON_K`):** "seu motion pode estar chato não por falta de
   efeito, mas por falta de contraste". Contraste = diferença entre duas coisas: **tamanho** (hierarquia),
   **cor** (tudo apagado e um elemento brilha), **velocidade**, **forma**, **densidade** (cheio × vazio). Erro comum:
   achar que "mais interessante = adicionar mais". Antes de pôr outro efeito, **aumente o contraste**.
3. **Grade inteligente em menos de 1 minuto (`DfCOvq7ucAv`, plugin grátis "Grid Plugin V2"):** compor → importar a
   mídia → "Create Grid" (quantidade de mídias, formato, linhas, colunas, duração, fps — **60 fps para ficar suave**)
   → "Choose Layout" → clicar nos blocos e "Add Media" → ajustar altura/largura de cada bloco. Substitui camadas,
   keyframes e expressões de uma grade animada estilo "base 44".
4. **Ideias para viralizar (`DezENZFuBDN`, tutorial grátis por comentário):** achar boas fontes de inspiração →
   alimentar a IA para ela montar o conceito → levar ao After Effects com motion "que adiciona a mágica".
5. **Copiar um efeito visto com IA (`DdybibTOZps`, `Ddqc7jjNJH3` — publis InVideo):** mandar o clipe de referência ao
   agente, ele estuda o tempo (ex.: quadrados piscando), monta com shape layers e você ajusta piscada, tamanho e
   contraste no chat. Útil como **ideia de fluxo** (referência → agente → timeline editável), não como ferramenta.
6. **Modelo de negócio (não técnica):** o vídeo de conteúdo **é** o produto à venda; o fecho converte para o site;
   iscas "Comment X" geram 1–2,7 mil comentários (presets, plugin, SFX); concurso mensal "Frame War" (US$ 250 por
   13 s de edição) e Discord criam comunidade.

---

## 6. Ideias de aplicação

**Disalp (distribuidora B2B de hortifrúti) — E35 pele "finanças pop" + EE6 + EE14, 35–40 s, locução.**
"Por que o tomate do seu restaurante custa 30 % a mais em dezembro?" — mesa top-down de caixa de feira (madeira,
balança, notas fiscais, caneta) (EE2); cada fato é um herói-adesivo (tomate, caminhão, termômetro) (EE3); o preço
entra em **placas que trocam** (EE6); mão real empurrando a caixa (EE4); "a rota de entrega" vista pela íris (EE7).
Fecho diegético: a nota fiscal vira o cartão "Disalp — peça pelo WhatsApp" com a busca digitando (EE14). Série
"Entenda o preço" (1 por semana).

**MF Máquinas — E35 pele "arquivo sépia" ou E37, 30–40 s.**
"A máquina que mudou a obra: a história do martelete" — linha do tempo com anos em slab de máquina de escrever,
patente antiga em papel, polaroid com nome do inventor (EE5), isolamento de cor no produto MF (P&B + a máquina
amarela — EE8). Variante E37 para explicar especificação: "potência" = 2 máquinas lado a lado (pequena × grande),
"vibração" = linha tremendo × parada (EE18).

**3LM (eventos) — E36 + EE16, bastidor didático, 30–45 s.**
"Como montamos um palco em 6 horas": o tapete de corte vira **planta do evento**; cada etapa (estrutura, luz, som,
decoração) entra como cartão físico com foto real da equipe e o anel de clique "marca" o passo (EE16); contador de
horas em placas (EE6); fecho com o cartão de orçamento no mundo do vídeo (EE14). Também serve para vender
"aniversário de empresa" em formato E35 sépia (história da empresa contratante).

**Natália (vereadora) — E35 pele "jornal" + EE10 + EE9, 40 s, prestação de contas.**
"O que aconteceu com o projeto da praça?" — mesa de gabinete top-down (documentos, carimbo, caneta); a lei aprovada
como **manchete fabricada** com marca-texto e círculo no número (EE10); fotos reais da obra pregadas como mesa de
detetive; legenda serifada no centro (EE9); fecho com "acompanhe no Instagram" diegético. **Cuidado:** usar só fatos
e documentos verdadeiros, nada de "jornal fake" com marca de veículo real (usar layout genérico sem nome de jornal).

**Regras para trazer o estilo sem ficar "cópia de template":**
1. Escolher **um pacote de arte** por vídeo (EE15) e não misturar peles.
2. Herói gerado por IA só para o que não existe em foto; **o real (cliente, equipe, produto) sempre aparece**, de
   preferência como prova no fim (como o arquivo do Dyson).
3. 15–16 fps só nas camadas de motion; a fala/imagem real de pessoas fica a 30 fps.
4. −14 LUFS, pico ≤ −1 dBTP (eles clipam em alguns 16:9 — não repetir).
