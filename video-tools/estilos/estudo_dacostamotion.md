# Estudo — @dacostamotion (José Emanuel "Dacosta" · motion designer · "Transformamos marcas com movimento") — 10/11/2026

Pedido do Italo: "estilo de edição, efeitos, tudo, principalmente o motion". Regras seguidas: (a) extrair a
**gramática transferível** com parâmetros, não o assunto (as marcas dos clientes); (b) quando o post ENSINA ou mostra
bastidor, registrar **o que ensina**.

**Base:** pasta `D:\PEFORMAKE\REFERENCIAS\_perfis\dacostamotion\Instagram\47908411852\<id>\` = **~45 posts**, a maioria
carrosséis: **103 arquivos de vídeo** (cada slide do carrossel é um `<id>`), + 13 pastas só de foto (ignoradas) e
`49375995003/Dd7WDYXnA-a` (colab). Período: mai/2022 → nov/2026. Todas as legendas lidas; transcrições onde há fala
(`DQ358`, `DS2l`, `DTGm`, `Dai-d`, `DaxsL`) + 4 bastidores `Dak4*` transcritos aqui. `sequencia_densa.jpg` aberta em **16 vídeos** (todos os que a têm) +
`folha.jpg` em 6 (logos antigos, `DfPdK9`, `Dak4`, `DDvBA8`, `DNnq5`). Medições com FFmpeg 9.0.2: **detecção de
cena a 0,18 em 21 vídeos-chave** e taxa de quadros real. **Folhas densas com carimbo de tempo** geradas em 5 vídeos
(`seq_*.jpg`), **recortes em resolução cheia** (`recorte_<t>.jpg`) em 3 e **ataques/BPM** (`a.wav`, `onsets.txt`)
em 3 — ver §2.0. Vocabulário: E1–E37 (`catalogo_estilos.md` + estudos @rabbits, @omarcosvianna, @earn.edits),
T1–T30 (`estudo_aslaniedits.md`), EE1–EE28 (`estudo_earnedits.md`). **Novos aqui: E38–E39 e DC1–DC24.**

---

## 1. Visão geral

| Item | Valor medido |
|---|---|
| Quem é | motion designer brasileiro (fala português nos bastidores, legenda bilíngue PT/EN), trabalha para estúdios (Oddside, @ofeliperufino, @socoloff_alex) e direto para marcas; foi top 2 num desafio da @escolamotioninsider |
| O que posta | **o próprio trabalho de cliente** — "brandmotion" (filme de marca 16:9 de 20–95 s), animação de logo (2–15 s), vinheta de app, showreel/demoreel, e 2 bastidores (processo Realure, unboxing) |
| Fases | **2022–2025:** carrossel de animações de logo **sem som**, 720×900 / 1280×720, 5–10 s cada (São José, Golden Chicken, KAO, Emilia, Matemagicando…) → **2025–2026:** filmes de marca com sound design próprio, 1920×1080 a 60 fps, e a partir de jul/2026 a **embalagem 9:16 "monitor na mesa"** em 1440×2560 |
| Engajamento | logos antigos: 38–138 curtidas · filmes 16:9: 122–1.338 · **9:16 "monitor na mesa": 1,6–8,1 mil** (CleverMove 8.087, Realure 5.431, Idea.ai 2.657, Aport 2.754, WorkflowStudio 2.020) → a embalagem multiplicou o alcance em ~10× sem mudar o trabalho |
| Duração | logos 2–15 s; filmes de marca **mediana ≈ 52 s** (21–96 s) |
| Quadros/s | **60 fps** em todos os 9:16 recentes e nos 16:9 de 2026; 30 fps antes |
| Cortes (cena 0,18) | **quase nenhum**: Cingu 3 em 96 s, Idea.ai 9:16 3 em 54 s, BoldBoss 9:16 3 em 55 s, CleverMove 8 em 21 s. Exceções: `DWR1` BoldBoss 16:9 (60 em 57 s, por causa dos flashes de cor) e `DfPdK9` (36 em 41 s, tipografia gigante passando). **Tudo se transforma dentro do plano.** |
| Loudness | −14 LUFS (−13,8 a −15,8) nos que têm som; logos antigos mudos |
| Fala | só nos filmes com manifesto (locução feminina/masculina em off) e nos 2 bastidores |

**Resumo em uma frase:** é **motion de marca "de estúdio"** — fundo chapado (branco, preto ou cor da marca), tipografia
pequena e elegante, o logo nasce de uma forma ou de linhas de construção, cada ideia vira um movimento contínuo sem
corte, e no fim o filme vira um **brand book em movimento** (paleta, fonte, mockups). Para o Instagram, ele **filma/
compõe esse filme 16:9 num monitor sobre uma mesa** e publica em 9:16.

---

## 2. O sistema de estilo

### 2.0 Arquivos gerados (pasta de cada vídeo)
| Vídeo | Gerado | Para quê |
|---|---|---|
| `DeuHrRSiMBT` (Idea.ai 16:9) | `seq_0-16s_5fps.jpg` | colagem de gravura → pixel → símbolo em pixel → logo; cards com brilho |
| `DQ358r_jpJd` (Cingu, 96 s) | `seq_0-32s_3fps.jpg`, `recorte_{6.0,23.5}.jpg` | símbolo como janela, pílulas orbitando, linha → onda → linhas de construção → logo |
| `DWR1yvMj5G1` (BoldBoss 16:9) | `seq_0-12s_6fps.jpg`, `recorte_{7.0,13.0}.jpg`, `a.wav`, `onsets.txt` | palavra por palavra + foto em squircle, flashes de cor no tempo |
| `DchQ4uzPqre` (CleverMove 9:16) | `seq_0-8s_6fps.jpg`, `recorte_3.0.jpg`, `a.wav`, `onsets.txt` | embalagem monitor; cavalo real → símbolo → logotipo |
| `DfPdK9tCGuy` (Work From Within) | `seq_0-14s_5fps.jpg` | frase serifada minúscula, círculos-letra que se embaralham, tipografia gigante passando |
| `DaxsL0yoxFY` (Realure 9:16) | `a.wav`, `onsets.txt` | ritmo da trilha (129 BPM) |

**Linha do tempo medida — `DQ358r_jpJd` (Cingu) 0–32 s, um único "plano":**
| Tempo | O que acontece | Movimento |
|---|---|---|
| 0,0–2,7 | "Cingu é singular." em sans pequena ao lado do símbolo, letra a letra | tipo máquina, 1 letra / 2 Q |
| 2,7–3,7 | Texto some, símbolo fica sozinho e cresce 100→140 % | ease-in-out 1 s |
| 4,0–7,7 | **O símbolo vira janela**: dentro da forma passam trabalhos (papelaria, camiseta, embalagem) **a cada ≈ 0,33 s**, com um arco fino girando em volta | troca no tempo da trilha |
| 8,0–11,3 | Forma preta (blob) parada; **3 pílulas coloridas** ("Imagem", "Conteúdo", "Ação") nascem de trás e orbitam; zoom forte até a forma preencher a tela | órbita + zoom-through 0,6 s |
| 11,7–13,0 | Fundo preto; "Comunicação / que impacta" com **letras caindo e quicando no lugar** + uma **estrela de 4 pontas** que gira | defasagem 1 Q por letra |
| 14,0–15,7 | Uma **barra branca** varre da esquerda, vira **linha** e a linha vira **onda em zigue-zague** | path morph |
| 16,0–19,3 | A onda pulsa (amplitude cai) até virar linha reta | 3,3 s de decaimento |
| 19,7–23,7 | A linha se divide em **linhas de construção** (verticais, horizontais, arcos) que **desenham o logotipo** "cingu" em contorno | trim paths, 4 s |
| 24,0–25,0 | Logotipo em contorno com as guias; câmera afasta | — |
| 25,3 | **Inversão** para fundo branco, logotipo sólido preto | corte por inversão (o único "corte") |
| 26,3–27,7 | Variações coloridas do símbolo surgem em volta (roxo, vermelho, ciano) | pop escalonado |
| 28,0–31,7 | Fundo roxo #6c6cf2: **8 pontos** em anel que giram e se ligam por um **arco que se fecha** | órbita + trim path |

### 2.1 Composição
- **Fundo chapado** em ~80 % do tempo: branco #f7f7f5, preto #0f0f0f ou a cor da marca. O elemento ocupa **5–25 % da
  largura** no centro — muito ar em volta (o oposto do earn.edits).
- **Eixo central absoluto.** A tagline aparece **ao lado** do símbolo (símbolo à esquerda, texto à direita, alinhados
  na linha média) ou **abaixo-à esquerda sobre o vídeo** (terço inferior, margem 6–8 %).
- **Imagem de banco/IA em tela cheia** como "respiro" entre blocos gráficos (pessoas treinando, mãos, cidade),
  quase sempre com a tagline pequena em cima.
- **Fecho de brand book:** mockups (papelaria, outdoor, sacola, boné, anel, celular, fachada) em sequência, depois o
  logo sozinho.

### 2.2 Cor e textura
- **Paleta = a da marca, em blocos inteiros.** A cor não é acento, é **o fundo inteiro** que troca (lima → rosa →
  azul-bebê em BoldBoss; roxo → vermelho em Cingu; laranja-terracota em Idea.ai).
- **Imagem limpa**, sem grão nem textura de papel; profundidade por **luz suave/degradê radial** (Idea.ai: gradientes
  rosa-laranja-lilás; CleverMove: branco com vinheta cinza) e por **brilho (glow)** em cards e no símbolo.
- **Um gesto "material" por filme** no máximo: gravura P&B e papel envelhecido (Realure, Idea.ai), papel rasgado
  (Idea.ai 15,6 s), relevo 3D do símbolo (CleverMove 6,7 s).

### 2.3 Tipografia
| Voz | Fonte provável | Tamanho (altura / quadro 1080) | Uso |
|---|---|---|---|
| **Tagline** | sans geométrica média (tipo Inter / Aspekta / Helvetica Neue) **ou serifada clássica** pequena (tipo Times/Garamond: "Great brands are built from within.", "Intencional. À frente.") | **1,2–2,5 %** (!) | frase-conceito, 2–6 palavras |
| **Palavra-chave** | a mesma família em **bold** ou na cor da marca, ou itálico | mesmo tamanho | "A marca de quem **domina** o jogo.", "Desempenho **sem limites**." |
| **Display gigante** | serifada ou grotesca **cortada pelas bordas** passando rápido | 25–60 % (sangra) | 1–2 s de "pancada" tipográfica (`DfPdK9` 5,6–7,0 s) |
| **Espécime** | a fonte da marca com nome escrito ("Helvetica Neue", "Olá, eu sou a Aspekta Font!") | 4–6 % + alfabeto pequeno | apresentar a tipografia da identidade |

- **Pequeno é a regra:** a tagline raramente passa de 2,5 % da altura — elegância por escala, legibilidade garantida
  pelo fundo chapado e pelo tempo de tela (1,5–3 s parada).
- **Entradas:** letra a letra (máquina, 1 letra / 2 Q), palavra a palavra (cada palavra empurra a anterior), letras
  caindo e quicando, **glow passando pela última palavra** ("from **within**." acende e apaga, `DfPdK9` 1,0 s),
  palavras alternativas empilhadas em itálico ("moderna / ousada / autêntica").

### 2.4 Transições
1. **Morfologia de forma** (a dominante): ponto → linha → onda → linhas de construção → logo; barra que vira linha;
   blob que cresce e vira fundo. **Sem corte.**
2. **Zoom-through:** a câmera atravessa o símbolo/forma até ele virar o fundo da próxima cena (0,4–0,7 s, expo).
3. **Máscara de forma da marca:** a foto aparece dentro do squircle/símbolo e a máscara cresce até a tela inteira
   (BoldBoss 10,8–11,3 s).
4. **Pixelização** entre cenas (Idea.ai 3,2 s; símbolo em pixel que se monta).
5. **Flash de cor chapada** de 4–6 Q em sequência (lima/rosa/azul/branco) no tempo das batidas.
6. **Inversão** branco↔preto (o "corte" do filme).
7. **Papel rasgado** revelando a próxima imagem (raro).

### 2.5 Câmera 2D/3D
- **Câmera quase sempre 2D**, com escala lenta contínua (100 → 104–110 % por bloco) e **órbitas** de elementos em
  volta do centro.
- 3D pontual: **cards flutuando em profundidade com glow** (Idea.ai 13–15 s), telas de app inclinadas em perspectiva
  (Bikkoo), símbolo em relevo (CleverMove).
- **Na embalagem 9:16:** câmera "na mão" levíssima (deriva de 1–2 % em vários segundos) apontada para o monitor;
  a luz da tela derrama na mesa e muda de cor com o filme.

### 2.6 Tempo
- **60 fps** e curvas com **ease muito suave** (sem ultrapassagem/mola exagerada, exceto nas letras que quicam).
- **Uma ideia por 2–4 s**, mas **nada fica parado**: sempre há uma órbita, uma escala lenta ou um brilho correndo.
- **Trocas sincronizadas à grade da trilha:** BoldBoss troca o fundo de cor exatamente nos ataques 6,79 / 8,29 /
  9,80 / 11,30 s (**a cada 1,50 s = 2 tempos a 80 BPM**) e a rajada de flashes 4,0–4,8 s tem um ataque por flash
  (4,02 / 4,11 / 4,25 / 4,34 / 4,47 / 4,68 s). Realure: ataques regulares a cada 0,50 s (129 BPM). CleverMove:
  grade de ≈ 0,4 s (75 BPM em colcheias).

### 2.7 Som
- **Ele faz o sound design.** No Realure (legenda de `Dai-d`): em vez de trilha pronta + efeitos separados, **desmontou
  a própria música (bateria, baixo, piano) e extraiu cada SFX de dentro das camadas** — "todo o universo sonoro do
  filme nasceu de um único som". Resultado: os efeitos ficam no mesmo tom e timbre da música (nada destoa).
- Densidade baixa: BoldBoss 205 ataques em 57 s (3,6/s, mas concentrados nos flashes), CleverMove 50 em 21 s
  (2,4/s). Sons de UI suaves, "swells" de ar nas transições, impacto grave só no logo final.

---

## 3. Variações

### T29 / "monitor filmado" → (técnica DC1) — a embalagem que viralizou
Não é um estilo de edição novo, é **a vitrine**: o filme 16:9 roda num monitor sobre uma mesa de madeira, num quarto
escuro com quadros na parede (pôster "Surreal") ou num quarto vermelho com teclado RGB; 1440×2560, 60 fps. Mesma
ideia do Aslani (T29), mas **sem legenda nem texto por cima** e com a **luz da tela iluminando a mesa**.

### E38 (novo). Brandmotion / brand book em movimento — ≈ 15 filmes · carro-chefe
- **Composição:** fundo chapado + elemento pequeno no centro → logo nasce de forma ou de construção → tagline pequena
  ao lado → imagens de pessoas em tela cheia com tagline embaixo à esquerda → paleta (fundos inteiros) → espécime
  tipográfico → símbolo em ícone arredondado → mockups → logo.
- **Cor/textura:** paleta da marca em blocos inteiros, imagem limpa, glow e degradê radial suaves.
- **Tipografia:** tagline de 1,2–2,5 %, palavra-chave em bold/cor, 1 momento de tipografia gigante sangrando.
- **Ritmo:** 40–60 s, uma ideia a cada 2–4 s, **0–3 cortes**, trocas de cor no tempo da trilha.
- **Câmera/som:** 2D com órbitas e zoom-through; sound design derivado da trilha.
- Ex.: `DWR1yvMj5G1`/`DcJhc2SOKSd` BoldBoss, `DQ358r_jpJd` Cingu, `DeuHrRSiMBT`/`DeZZ7UIOWcl` Idea.ai,
  `DfPdK9tCGuy`/`DcygNrjOYUa` Workflow, `Dd1PQrDiMwE`/`Ddv2M4RIUZu` Fonzi, `DchQ4uzPqre` CleverMove,
  `DaxsL0yoxFY`/`Dai-dfYvGiu` Realure, `Db3cquJOyBO` Aport, `DH8itG-R7CF` Teixeira & Franzen, `DDvBA8TRVid` Impulse,
  `DAlZ2H6OFYI` Over TV.

### E39 (novo). Manifesto de arquivo científico (colagem de gravura em branco) — `Dai-dfYvGiu`, `DaxsL0yoxFY`
- **Composição:** fundo branco-gelo com vinheta cinza; a locução vira **texto minúsculo serifado no centro** (1,2 %,
  uma frase por vez, ~2–3 s); entre as frases, **colagens de gravura científica** (célula, anatomia, botânica) e
  pinturas clássicas recortadas que entram como papéis sobrepostos.
- **Cor:** P&B + creme envelhecido + 1 tom de pele quente; o logo (roseta de 8 círculos) em cinza claro.
- **Ritmo:** lento (90 s), 129 BPM marcando as entradas de papel a cada 0,5 s.
- **Uso:** manifesto de marca de saúde/beleza/ciência; "a ciência por trás do produto".

### E15. Demo narrada em UI — (já existe) · variante clara
`DS2l_WOjpOZ` (Bikkoo): fundo azul-royal #1440a8, telas de app **claras** (creme) em perspectiva 3D que inclinam e
rolam, cards que saem da tela (o pedido "José Fernandes ★4,95" vira um cartão solto), toques indicados por um
**ponto azul** que pulsa, título de 2 linhas em sans branca ("gerencie suas / **oportunidades**"). 58 s, 3 cortes.

### Logos curtos mudos (fase 2022–2025) — E14 aplicado a logo
5–10 s, sem som, 720×900: forma simples que se move e vira o símbolo (cavalo, galinha, folhas, losangos). Ver DC3.

---

## 4. Catálogo de técnicas novas (DC1–DC24)

Convenção: 1920×1080, 60 fps (filmes) ou 1440×2560 (embalagem). "Q" = quadros a 60 fps.

**DC1. Monitor na mesa (embalagem 9:16).** (= T29 com outros parâmetros.) Quadro 9:16 com o monitor 16:9 ocupando
**≈ 92 % da largura** na faixa de 30–55 % da altura; parede escura com 2 quadros acima, mesa de madeira e teclado
embaixo; **sem texto por cima**. A luz da tela tinge a mesa (lima vira mesa esverdeada). Câmera parada ou deriva
de 1–2 %. Abertura: os primeiros 0,5 s já mostram a tela acesa.
*Para nós:* gravar o monitor do estúdio com o celular em 4K vertical, quarto escuro + 1 abajur quente, ou compor
num mockup (tela = vídeo 16:9 com `perspective` leve + camada de "luz derramada": o próprio vídeo desfocado 80 px em
`screen` a 30 % sobre a mesa). *Remotion:* `<MonitorShowcase src room="dark|red">`. *SFX:* a trilha do filme.

**DC2. Logotipo desenhado por linhas de construção.** Linhas-guia finas (1–2 px, branco 60 %) entram como uma grade
(verticais, horizontais, arcos de círculo) e **"desenham" o contorno** das letras; os nós aparecem como **pontos
quadrados** nos vértices; depois o contorno vira sólido (ou inverte o fundo). 3–4 s (`DQ358` 19,7–25,3 s; `DfPdK9`
7,2–8,6 s com a palavra gigante em contorno passando).
*AE:* Trim Paths nas camadas de forma das guias + do contorno (offset 2–4 Q entre traços). *Remotion:* SVG com
`strokeDasharray/strokeDashoffset` por path, `delay = i*3`. *SFX:* "pen scratch" muito baixo + swell.

**DC3. Ponto → linha → forma (logo mudo).** Um ponto de 8–12 px surge, estica em linha (6–10 Q), a linha vira a forma
base (círculo que cresce e cobre metade da tela, triângulo com raios de luz) e a forma se resolve no símbolo; o
logotipo entra por último (`DNnq5` — o próprio logo dele: bola preta → ponto → "▶" amarelo com raios → "D•S").
*Remotion:* um componente com estados interpolados (`d` do path com `flubber`/`interpolatePath`). *SFX:* tick +
"zip" na esticada + impacto no símbolo.

**DC4. Linha → onda (pulso) → linha.** Uma barra branca varre a tela, afina em linha e vira **onda em zigue-zague**
de 5–7 picos que pulsa e decai até reta em ~3 s (`DQ358` 14–19 s). Metáfora de "impacto", "batimento", "sinal".
*Remotion:* path com amplitude `A = A0 * exp(-t/τ)` e fase correndo. *SFX:* o pulso é um grave ritmado ou o
"blip" de monitor cardíaco.

**DC5. Símbolo como janela.** A forma do símbolo vira **máscara** e dentro dela passam imagens (portfólio, produtos,
pessoas) **a cada 0,33 s (20 Q)**, com um **arco fino girando** em volta da forma (`DQ358` 4,0–7,7 s).
*AE:* Track Matte com a forma; precomp de imagens com corte a cada 20 Q. *Remotion:* `clipPath` do SVG do símbolo +
`<Series>` de imagens. *SFX:* obturador/clique por imagem.

**DC6. Pílulas que orbitam a forma.** Três pílulas coloridas (cantos 50 %, ícone + palavra, 2 % de altura) nascem de
trás de uma forma central e **orbitam** em elipse; zoom forte até a forma preencher a tela (`DQ358` 8–11,3 s).
*Remotion:* `x = cx + rx*cos(θ+φi)`, `y = cy + ry*sin(...)`, `zIndex` muda quando passa atrás. *SFX:* "whoosh"
leve por pílula.

**DC7. Tagline lateral ao símbolo.** Símbolo à esquerda + tagline em sans 1,5–2 % à direita na mesma linha média,
digitada letra a letra (1 letra / 2 Q) e apagada da direita para a esquerda antes de o símbolo crescer.
*Remotion:* `<SymbolTagline>`. *SFX:* tique de tecla baixíssimo.

**DC8. Tagline sobre vídeo com palavra-chave em bold/cor.** Frase de 4–8 palavras **no terço inferior à esquerda**
(x ≈ 8 %, y ≈ 70–75 %), sans 2–2,5 %, peso regular + **1–2 palavras em bold e/ou na cor da marca** ("A marca de
quem **domina** o jogo."; lima #d4ff3a no BoldBoss), entrando palavra a palavra com deslize de 10 px e opacidade
em 8 Q. Fica 2–3 s sobre o vídeo.
*Remotion:* `<LowerTagline text highlight={["domina"]} color>`. *SFX:* nenhum (respiro).

**DC9. Palavras alternativas empilhadas.** "Uma marca" à esquerda + coluna à direita com **3 adjetivos em itálico**
("moderna / ousada / autêntica") que sobem em cascata e depois diminuem de 6 % para 2 % (o bloco recua e vira
assinatura) enquanto o fundo troca de cor (`DWR1` 6,0–10,8 s).
*Remotion:* lista com `stagger 6 Q` + escala do grupo. *SFX:* 3 "ticks" de UI.

**DC10. Fundo de cor que troca no tempo.** A cor do fundo inteiro muda a cada 2 tempos (1,5 s a 80 BPM) sem mexer no
conteúdo, e há **rajadas de flashes de 4–6 Q** (lima/rosa/azul/branco) com um ataque por flash (`DWR1` 4,0–4,8 s e
6,8–11,3 s, medido em `onsets.txt`).
*Remotion:* `const i = Math.floor((frame-start)/beatFrames)%palette.length`. *Premiere:* sólidos de cor cortados
nos marcadores de batida (`detect_beats`). *SFX:* "click"/"snap" por flash; nas trocas lentas, só a batida.

**DC11. Logotipo que muda de peso/glifo.** As letras do logotipo trocam de peso (light → bold) ou de glifo (o "o"
vira coroa, o "x" vira símbolo) durante 0,5–1 s antes de assentar (`DWR1` 3,8–5,8 s "B✕ld Boss").
*AE:* Text Animator com Font Weight (variable font) ou troca de camadas a cada 4 Q. *Remotion:* `fontVariationSettings
'wght'` interpolado. *SFX:* rajada de cliques.

**DC12. Foto em squircle que abre espaço no texto.** No meio de uma frase gigante ("BE BOLD. ___ BE THE BOSS."), uma
**foto dentro de um quadrado super-elíptico** (cantos 30–35 %) cresce de 0 a 25 % da largura e **empurra as palavras**
para os lados; no fim encolhe e a frase toda diminui (`DWR1` 0,8–3,0 s). Depois a mesma forma vira máscara que
cresce até a tela inteira e revela o vídeo (10,8–11,3 s).
*Remotion:* flexbox com a largura do slot da foto animada (o texto se reposiciona sozinho) + `clip-path: path()` do
squircle. *SFX:* "pop" macio + whoosh na abertura da máscara.

**DC13. Símbolo em ícone arredondado trocando de fundo.** O símbolo da marca dentro de um ícone (squircle branco ou da
cor) que troca de cor de fundo a cada batida (lima → azul → preto) e encolhe para o canto (`DWR1` 18–20 s).
*SFX:* tick por troca.

**DC14. Espécime tipográfico animado.** Nome da fonte em 4–6 % ("Helvetica Neue", "Olá, eu sou a Aspekta Font!") +
alfabeto e pesos em 1 % à direita + **a palavra gigante em contorno ao fundo** saindo do quadro; dura 2–3 s.
*Remotion:* `<TypeSpecimen family weights>`. *SFX:* digitação.

**DC15. Sequência de mockups (brand book).** 5–10 aplicações (papelaria, outdoor em prédio, sacola, boné, celular,
anel, fachada) de 1,2–2 s cada, todas com **leve push 100→104 %** e na mesma luz; transição por máscara ou corte no
tempo. *Para nós:* gerar mockups com IA/Photoshop a partir do logo do cliente. *SFX:* ambiente do lugar (rua, loja)
bem baixo — dá "realidade".

**DC16. Cavalo real → símbolo (imagem real que vira logo).** Um vídeo real com **desfoque de movimento forte** (cavalo
correndo, 1,1–1,6 s) é congelado/limpo até virar a **silhueta do símbolo** sobre branco; o símbolo salta e o
logotipo **cresce para os dois lados a partir dele** ("en✓Mo" → "Clever✓Move", 2,8–3,2 s) (`DchQ`).
*AE:* Directional Blur + Levels até silhueta, depois troca pela vetorial; texto com máscara que abre do centro.
*Remotion:* `clipPath inset(0 50% 0 50%)` → `inset(0 0 0 0)` no logotipo. *SFX:* galope/whoosh → impacto seco.

**DC17. Símbolo em pixel que se monta.** O símbolo surge **pixelado** (blocos de 6–10 % do tamanho do símbolo, ~40
blocos) que se reorganizam em 0,3–0,5 s; depois os blocos ficam como "listras" e o símbolo vira a versão final ao
lado do nome (`DeuHr` 4,8–7,6 s). (Parente do T6 do Aslani, mas aplicado ao logo e em P&B.)
*Remotion:* grade de quadrados com posição inicial aleatória (seed) → posição final do bitmap do símbolo.
*SFX:* rajada de cliques 8-bit.

**DC18. Cards de imagem flutuando com brilho.** Fundo quase preto #120d0a; 4–6 imagens quadradas pequenas (8–12 % da
largura) **flutuam em profundidade** com **halo branco 20–40 px**, uma palavra central pequena ("SAY THE IDEA.")
e saem em espiral (`DeuHr` 13–15,4 s). *Remotion:* `translateZ` com `perspective: 1200px` + `box-shadow` branco.
*SFX:* "shimmer" agudo.

**DC19. Círculos-letra que se embaralham.** O monograma em 3 círculos com letras (W, F, W) **gira e troca de posição**
entre si (cada troca 10–15 Q), encolhe e volta (`DfPdK9` 2,2–5,4 s). Serve para qualquer sigla.
*Remotion:* 3 itens trocando `x,y` por permutação a cada N quadros, ease in-out. *SFX:* "tick" por troca.

**DC20. Pancada tipográfica gigante.** 3–4 palavras em **serifada gigante (25–60 % da altura) cortadas pelas bordas**
passam em 0,2–0,4 s cada (deslizam lateralmente com desfoque), sobre fundo preto texturizado, quebrando o ritmo
calmo do filme (`DfPdK9` 5,6–7,0 s: "Work From 2025", "Independent Creative Studio", "Designed for Recognition").
*Remotion:* `<GiantTypeSweep words>` com `translateX` −20 % → +20 %. *SFX:* whooshes curtos em sequência + um
impacto no fim.

**DC21. Brilho que passa pela palavra final.** A última palavra da frase ("within.") ganha um **glow branco 15–25 px**
por 10–15 Q e apaga, como uma luz passando (`DfPdK9` 1,0–1,4 s). *Remotion:* `textShadow` interpolado. *SFX:*
"shimmer" curto.

**DC22. Pontos em anel que se ligam.** 6–12 pontos (ou estrelas) dispostos em anel giram lentamente, se reorganizam
e **um arco fino desenha a circunferência** ligando-os (`DQ358` 28–32 s; estrelas em `DfPdK9` 11–11,8 s). Metáfora
de "comunidade", "ciclo", "fases" (Realure: "Phase by phase, the cycle reorganizes").
*Remotion:* pontos em `θi = θ0 + i*2π/n` + `strokeDashoffset` do círculo. *SFX:* um "ding" suave quando fecha.

**DC23. Telas de app soltando cards.** Celular sem moldura (só a tela creme com cantos de 8 %) inclinado em 3D
(rotY 15–25°, rotX 8°) que rola; um elemento da tela (cartão de pedido, mapa, chat) **se destaca e sai da tela**
em direção à câmera; toque marcado por um **ponto azul** que pulsa (`DS2l`). *Remotion:* `<PhoneScreen tilt>` +
camada duplicada do card com `translateZ`. *SFX:* toque de UI + whoosh do card.

**DC24. Sound design extraído da trilha.** (O que ele ensina — §5.) Separar a música em stems (bateria, baixo, piano)
e usar **fatias dessas próprias camadas** como SFX (um ataque de piano vira o "pop" do logo, um prato vira o
whoosh, o grave vira o impacto), afinados no tom da música.
*Aqui:* separar stems com uma ferramenta local já instalada (se houver; não instalar nada sem pedir) ou recortar
ataques isolados da própria trilha com o `onsets.py` (pegar 0,1–0,6 s a partir de cada ataque forte, aplicar
fade e reverb) → banco de SFX "da casa" para aquele vídeo. *Premiere:* Remix + Essential Sound. *Regra:* SFX
no mesmo tom da música e −18 a −24 LUFS.

**Reaproveitados de T/EE:** monitor filmado (T29 → DC1), blocos de pixel (T6 → DC17), máquina de escrever (T9) nas
taglines, quadro dentro do quadro (T14) nos mockups, letras que caem e quicam (EE28) em "Comunicação que impacta",
papel rasgado como revelação (Idea.ai 15,6 s).

---

## 5. O que ensina / mostra de processo

1. **Sound design nasce da música** (`Dai-dfYvGiu`, legenda): desmontar a trilha (bateria, baixo, piano) e extrair
   cada SFX das próprias camadas, para que "todo o universo sonoro nasça de um único som". → DC24.
2. **Movimento com significado** (Realure): "cada textura, cada movimento, cada elemento gráfico precisava parecer que
   respira, orbita, se reorganiza fase por fase" — o verbo do conceito da marca vira o verbo do motion (órbita,
   reorganização, respiração). Regra transferível: **escolha 2–3 verbos da marca e só use movimentos desses verbos.**
3. **Bastidor do Realure** (`Dak4YK8iHAM`, `Dak4aFeiITg`, `Dak4anPiFn5`, `Dak4cWYCDF8`, 448×358, ~3 min no total):
   ele de frente para a câmera (talking head em quarto escuro) intercalado com os trechos do filme, explicando
   "como os efeitos sonoros foram criados". Transcrito com `transcrever.py` (faster-whisper small) → `video.srt` /
   `video.transcricao.json` em cada pasta `Dak4*`. O que ele diz:
   - **Receita do som (`Dak4YK8iHAM`):** pegou a parte principal da trilha do manifesto e **separou em 3 camadas —
     baixo, piano e a batida** ("o beat que segura o trio"). De cada camada tirou pedaços: um toque isolado do piano, um
     ataque específico da batida, trechos do baixo; **alongou uns, encurtou outros** e com isso conseguiu até
     **glitches**. Esses recortes viraram todos os SFX do filme. → DC24.
   - **Processo de equipe (`Dak4anPiFn5`):** ficou mais fácil porque o time já entendia de motion: **ele entregou
     storyboard primeiro e os materiais separados** (camadas/arquivos independentes). Lição: com cliente/equipe que
     entende o processo, aprovar storyboard antes de animar e receber assets separados poupa retrabalho.
   - `Dak4aFeiITg` e `Dak4cWYCDF8` são trechos do próprio manifesto (locução + filme), sem explicação técnica.
4. **Conceito antes do motion** (`DQ358`, Cingu): ele desenvolveu o conceito visual a partir do material da agência
   ("mesmo não sendo minha especialidade"), aprovado de primeira, e só depois animou — o motion vende melhor quando
   o designer participa do conceito.
5. **Embalagem importa mais que o trabalho para o alcance:** o mesmo filme 16:9 teve 1,3 mil curtidas (Idea.ai 16:9) e
   2,7 mil no 9:16 de monitor; CleverMove chegou a 8,1 mil. Para portfólio de motion no Instagram, **publicar o
   filme dentro de um monitor num ambiente bonito, vertical, 60 fps**.

---

## 6. Ideias de aplicação

**Disalp (distribuidora B2B de hortifrúti) — E38, vinheta de marca 20–30 s + kit de aberturas.**
Ponto verde → linha → **onda que vira a curva de uma folha** (DC3/DC4) → símbolo Disalp. Tagline lateral "Do campo à
sua cozinha, **no horário**." (DC7/DC8). O símbolo vira janela (DC5) mostrando caixas, caminhão, cozinha de
restaurante a cada 0,33 s. Paleta em blocos inteiros (verde-folha / laranja-cenoura / creme) trocando no tempo
(DC10). Fecho brand book: caixa com logo, caminhão adesivado, nota/pedido no WhatsApp (DC15). A mesma vinheta corta
em 3–5 s para abrir todos os reels.

**MF Máquinas — E38 com DC16 "real → símbolo".**
Máquina real trabalhando com desfoque de movimento forte (martelete, betoneira) → congela → vira silhueta → logo MF
cresce para os lados a partir dela (DC16). Espécime de produto: ficha técnica animada como espécime tipográfico
(DC14 aplicado a "potência / peso / rpm"). Fecho com mockups: caminhão, loja, uniforme.

**3LM (eventos) — DC1 + E38 para vender o próprio serviço.**
(a) Portfólio: publicar as aberturas/telões que a 3LM faz **dentro de um monitor/telão filmado no local do evento**
(DC1 — o telão do palco é o "monitor"). (b) Vinheta do evento do cliente: pontos em anel que se ligam (DC22 =
"comunidade") → logo do evento; pílulas orbitando com "Palco / Luz / Som" (DC6); trilha do evento recortada em SFX
(DC24) — o som da abertura combina com a música do evento.

**Natália (vereadora) — E38 sóbrio para assinatura de mandato.**
Vinheta de 6–8 s: símbolo/monograma "N" construído por linhas-guia (DC2) → tagline lateral pequena "Trabalho que
**aparece**." (DC7/DC8). Nos vídeos de prestação de contas, usar só DC8 (tagline com palavra-chave em cor) sobre as
imagens reais das obras e DC10 (troca de fundo na cor do mandato) como separador de tema. Evitar pancada tipográfica
(DC20) e brilho (DC18): o tom deve ser institucional.

**Regras para trazer o estilo:**
1. **Pequeno e com ar:** tagline 1,5–2,5 % da altura sobre fundo chapado; nada de legenda gigante neste estilo.
2. **0–3 cortes por minuto:** toda passagem é forma, máscara, zoom-through ou inversão.
3. **Cor da marca = fundo inteiro**, trocando no tempo da trilha (marcar batidas com `onsets.py`).
4. **60 fps, ease suave**, SFX derivados da própria trilha, −14 LUFS.
5. Para publicar portfólio da Ellcazo/Performake: versão 9:16 "monitor na mesa" (DC1) de cada filme 16:9.
