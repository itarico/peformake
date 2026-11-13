# Estudo visual completo — referências de EDIÇÃO (08/11/2026)

Base: 38 vídeos salvos em `D:\PEFORMAKE\REFERENCIAS\_salvos\edicao\Instagram\` (a seção "Estudo visual" de cada um
está no fim do `analise.md` da pasta). Método: 16 quadros espaçados por vídeo (`sequencia.jpg`) + legenda + transcrição.
Complementa o `04_estudo_visual_referencias_edicao.md` e segue `C:\Users\intal\peformake\video-tools\NARRATIVA.md`.

**Objetivo deste arquivo:** virar SKILL permanente de edição. Cada estilo e cada técnica está escrito como RECEITA
genérica e reproduzível: quando usar, parâmetros concretos e como implementar com o que já temos:
- **Remotion**: kit `video-tools/remotion/src/pro/` (`TituloCinetico`, `LegendaPro`, `LowerThirdPro`, `Transicoes`,
  `GrainOverlay`, `fx/texto.tsx → AnimadorTexto`, `fx/composicao.tsx → TextoAtrasDaPessoa / SeguirPonto / VideoBase`,
  `fx/camera.tsx → Cena3D / Camada / chaves`, `fx/traco.tsx → TracoAnimado`, `fx/shader.tsx`, molas em `anim.ts`:
  `MOLA.firme {damping 200, stiffness 180, mass 0.9}`, `MOLA.pop {12, 220, 0.6}`, `MOLA.pesada {26, 90, 1.4}`,
  curvas `expoOut = bezier(0.16,1,0.3,1)`, `expoIn = bezier(0.7,0,0.84,0)`, `suave = bezier(0.45,0,0.55,1)`).
- **HyperFrames** (HTML + GSAP): mesma lógica com `gsap.timeline()`; equivalências de easing: expoOut ≈ `"expo.out"`,
  expoIn ≈ `"expo.in"`, suave ≈ `"sine.inOut"`, MOLA.pop ≈ `"back.out(1.7)"`, MOLA.firme ≈ `"power3.out"`.
- **FFmpeg** (9.0.2 instalado): filtros citados em cada receita.
- **Recorte de pessoa**: `video-tools/scripts/recortar.py fundo entrada.mp4 pessoa.mov` (rembg `u2net_human_seg` →
  ProRes 4444 com alpha). Rastreamento: `scripts/rastrear.py` → JSON para `SeguirPonto`.
- **Premiere**: montar FCP XML (xmeml) com trilhas empilhadas e importar via MCP `import_fcp_xml` (esqueleto no fim).

Convenções: tudo a **30 fps** (1 s = 30 f). Tamanhos de fonte em **% da altura do quadro** (9:16 = 1920 px → 1 % ≈ 19 px).
"Zona segura" do Instagram 9:16: evitar 0–12 % do topo, 0–20 % da base e a faixa de 12 % da direita (botões).

---

## 1. Tabela dos vídeos (ordenada por curtidas)

| # | id | autor | estilo | curtidas | técnica principal |
|---|---|---|---|---|---|
| 1 | DecOTJJuFyQ | Ignacio Vásconez | Tutorial + colagem de papel (Vox) | 33.733 | Legenda em letra manual coerente com a estética de papel; personagem em plongée |
| 2 | DfSrDF-Riau | Shaan Johari | Antes/depois em card editorial | 14.198 | "RAW × EDITED BY AI" lado a lado, 9 s em loop |
| 3 | DeJ_gTHs-FB | Sanjar Nai-Chien | Colagem Vox + talking head de podcast | 12.476 | Retrato P&B recortado + tarja amarela + papel de jornal; mesma colagem refeita 3 vezes |
| 4 | DcjsyZRSkuA | Victor ZK | Tutorial com assinatura (fisheye) | 12.435 | Identidade repetível: lente olho-de-peixe + fundo azul + peças laranja 3D |
| 5 | DePNgrmToh9 | Ashok Reddy S | Colagem Vox + podcast | 9.656 | Tríptico "dado em serifada + foto P&B"; legenda mono em caixa preta |
| 6 | DfG3B45x5nR | Adrian Razén | Motion abstrato (catálogo de SFX) | 9.563 | Playhead + forma de onda: a imagem é o som |
| 7 | DfM8Y32IQUY | Melika Zaghari | Vitrine de efeitos noir (16:9) | 7.791 | Match cut de pose com tratamentos diferentes; script + sans |
| 8 | DdrD7WQpYK7 | Jo Mendes | Flash-cut (antes/depois) | 7.022 | Flash de 2–3 quadros de outro tratamento no pico da ação |
| 9 | Dc4Bnn0vCQj | Vaisakh | Antes/depois "$5 × $30" | 7.013 | B-roll e cor que correspondem à palavra dita |
| 10 | De9lNMuRYmy | Giullya Becker | Talking head contido (carro) + inserts de filme | 6.916 | Legenda mono discreta + 2 palavras gigantes em 2 min |
| 11 | DeuXePGPcQ5 | Leonardo Boehme | Vlog de rua + troca de cenário por IA | 6.781 | Gancho absurdo → revelação; walk-and-talk grande-angular |
| 12 | DdcN3ZfNPgV | Victor ZK | Tutorial com assinatura | 4.736 | Telas de produto remontadas em 3D com textura; humor visual |
| 13 | DfPosIRAut_ | Gabriel Adamuchi | Antes/depois sincronizado (tela dividida) | 4.075 | Mesmo gesto em 2 versões; legenda amarela no meio |
| 14 | Dbvg-nZT6XL | Barsol Media | Talking head cinético de marca | 4.042 | Texto atrás da pessoa, "FOR MONTHS" de nuvem, fecho mínimo com glow |
| 15 | DeEoDBASC5R | Kanishya | Micro-documentário ilustrado + moldura de reação | 3.298 | Capítulos visuais com paleta vintage; capa de livro |
| 16–20 | DfC7tUMCC0P, DfC7thaiMI4, DfC7toJiEPZ, DfC7tyniFmR, DfC7t4YCPzA | DiegoCuts | Carrossel animado (slides em loop) | 2.250 | Layout editorial fixo + janela de vídeo em loop |
| 21 | DfICNPPt_gh | Deborah Folloni | Antes/depois (IA × original) | 2.131 | Rótulo em faixa marca-texto amarela |
| 22 | DeXKaEXNm1Y | tapewarp | Colagem Vox em tela cheia | 1.793 | Legenda em tira de papel; 3 cores + papel |
| 23 | DfCs7OyCasp | motionnikhil | Pôster editorial premium | 1.274 | Creme + preto + laranja; objeto-metáfora recortado; serifada Didone |
| 24 | DfPbRFWu-JU | EarnEdits | Retrô-documentário cinematográfico | 1.199 | Manchete 2 linhas branco+amarelo; data como capítulo; push-in contínuo |
| 25 | Deq3DdTu9d4 | Sahil Verma | Tutorial em série (16:9) + colagem | 1.018 | Desfocar o rosto para dar palco ao texto; cartão de capítulo de cor sólida |
| 26 | DfFo9D0IZM0 | Metros | Portfólio de talking heads cinéticos (2x2) | 961 | Texto ocupando o espaço da cena com perspectiva |
| 27 | DfAE8n5ovTR | Reverse Team | Talking head cinético com cenário gerado | 947 | Etiquetas em profundidade nomeando partes (e excesso a evitar) |
| 28 | DfQNycSzvkm | wintage | Tutorial de acabamento documental | 796 | Look de 3 camadas: borda desfocada + vinheta + textura em Screen |
| 29 | DfZoBRQuHwq | EarnEdits | Retrô-documentário cinematográfico | 719 | Texto que pertence à superfície (gravado na rocha, projetado); rack focus |
| 30 | Ddn42dGOwnB | EarnEdits | Retrô-documentário de notícia | 589 | Número gigante atrás do retrato; "mesa de detetive" 2,5D |
| 31 | DewmEbNOvlP | Calebe | Tela dividida: rosto + UI animada | 581 | UI redesenhada ilustrando cada frase; monocromia + 1 acento |
| 32 | DfNpcidka9R | Hudson Brendon | Tela dividida: rosto + cards de UI | 438 | Palco claro com sombra de janela; serifada itálica × sans |
| 33 | De9u3-QRJ3_ | Altra Labs | Selfie + tela filmada | 327 | Filmar a tela em ângulo, com ambiente |
| 34 | DfTO5--RYWl | Emerson e Rebeca (Recife) | Documental mínimo | 127 | Tese em 3 níveis no topo; depois só palavras-chave |
| 35 | DfMhcgtRnbX | Shaan Johari | Talking head cinético premium | 108 | Legenda que muda de estilo pelo sentido; contorno tracejado no corpo |
| 36 | DfLJHz4i4gS | Andrhé Alves | Pôster suíço animado | 44 | Círculo vermelho atrás do objeto; legenda que ganha nitidez (e "cara de IA") |
| 37 | DetnXQUE5ri | Pramod | Tutorial de som (gancho) | 3* | Micro-planos de 0,7 s com whip + whoosh |
| 38 | DeluPBnOv5k | Marvix Motion | Vitrine de templates (Alight Motion) | 3* | Serifada + 1 palavra laranja + palavra gigante cortada na borda |
| — | DfC7vkaCFEr | DiegoCuts | **Fora do escopo** — é o post-pai do carrossel (só `video.info.json`, sem vídeo); os 5 slides estão acima | — | — |

\* Curtidas ocultas (milhares de comentários: 7.801 e 3.318).
Nenhum dos 38 foi marcado como fora do escopo: todos são de edição ou motion. Ressalva: DfICNPPt_gh, DfPosIRAut_,
DeuXePGPcQ5 e DfM8Y32IQUY são demonstrações de ferramenta de IA; o que vale neles é a estrutura (antes/depois,
tela dividida), não o efeito gerado.

**Leitura dos números:** o topo é dominado por (a) **colagem de papel estilo Vox**, (b) **antes/depois** e
(c) **assinatura visual forte** (fisheye do Victor ZK). O pior desempenho (44 curtidas) é a peça mais
"template de IA" (robô cromado, cérebro mecânico). O documental mínimo local (127) tem bom gosto, mas não tem
gancho. Moral: **gosto + prova + identidade** vencem o "efeito".

---

## 2. Estilos encontrados — receitas

Cada estilo: **quando usar → estrutura e tempos → parâmetros → implementação → exemplos de aplicação**.
Os estilos podem e devem ser **mesclados** (ver "mesclas" no fim da seção).

### E1. Talking head cinético de marca (Barsol, Metros, Shaan, Reverse)
- **Quando:** vídeo de autoridade ou posicionamento com 1 pessoa falando um texto forte e roteirizado; objetivo de
  marca ou venda; emoção de energia/confiança. 20–35 s. **Não** para depoimento espontâneo nem para tema sensível.
- **Estrutura:** frase-tese (0–3 s) → custo/tensão (3–10 s) → contraste (10–15 s) → virada (15–20 s) → assinatura e fecho mínimo (2 s).
- **Parâmetros:**
  - Plano: pessoa sentada ou em pé, cenário real escuro e quente, luz dura de cima e um contraluz. Vídeo base com
    push-in contínuo de 1,00 → 1,06 na duração do trecho (linear suave) e punch-in de +4 % em 3 quadros nas palavras-chave.
  - Tipografia: 2 vozes. (a) frase de apoio em sans bold branca, 3,5–4,5 % da altura, em arco ou reta; (b) palavra-pico
    em condensada black na cor da marca, 18–30 % da altura (atrás da pessoa) ou 8–12 % (na frente). No máximo 1
    palavra-pico a cada 4–6 s.
  - Entrada por palavra: 6–8 f, translateY 30 % da altura da letra → 0, opacidade 0 → 1, desfoque 8 px → 0, `expoOut`;
    palavra-pico com `MOLA.pop` (overshoot ≤ 6 %). Saída: 4–5 f com `expoIn` (sempre mais rápida que a entrada).
  - Cor: 1 cor de marca + branco + pretos profundos; grading quente (sombras levemente teal, pele âmbar). Grão leve
    (`GrainOverlay` intensidade ≈ 0,05; FFmpeg `noise=alls=6:allf=t`).
  - Transição de capítulo: whip/rasgo na cor da marca, 6–8 f, com desfoque de movimento (`TransicaoWhip`).
  - Fecho: preto, logo pequeno (≈ 4 % da altura) com glow 20–30 px, 45–60 f. Ou fechar na imagem de prova.
- **Implementação:**
  - Remotion: `VideoBase` (push-in) + `TextoAtrasDaPessoa` (vídeo + `pessoa.mov` do `recortar.py fundo` + `TituloCinetico`
    como filho) + `AnimadorTexto` para a frase de apoio + `TransicaoWhip` + `GrainOverlay`.
  - HyperFrames: 3 camadas `<video>` (fundo) / `<div class="texto">` / `<video>` com alpha (pessoa) e
    `gsap.from(".pico", {yPercent:30, opacity:0, filter:"blur(8px)", duration:0.25, ease:"expo.out"})`.
  - FFmpeg (pré): `recortar.py fundo` para a pessoa; empilhar com `overlay` na ordem fundo → texto (PNG/MOV alpha) → pessoa.
  - Premiere: V1 vídeo, V2 texto (MOV ProRes 4444 do Remotion), V3 pessoa recortada (alpha), V4 grão em Overlay.
- **Exemplos de aplicação:** prestador de serviço técnico (palavra-pico "PARADA", "GARANTIA" na cor de destaque);
  empresa de tecnologia em evento; na marca premium, só 1 momento por vídeo.

### E2. Documental mínimo / talking head contido (Giullya, Emerson e Rebeca, metade de cima do Calebe)
- **Quando:** depoimento real, fala espontânea, liderança, comunidade, cliente satisfeito; emoção de verdade,
  confiança, afeto. 30–90 s. É o **padrão** quando a pessoa e o lugar já contam a história.
- **Estrutura:** gancho com sentido completo (frase que se entende sozinha) → história → prova (B-roll do que é dito)
  → respiro → fecho na frase que resolve.
- **Parâmetros:**
  - Plano real e bonito (luz de janela, local identificável), **2 tamanhos de plano** alternados (médio e close,
    punch-in digital de 1,25× se for câmera única) a cada 6–12 s para não monotonizar.
  - Tese no topo nos primeiros 150–210 f: 3 níveis (linha pequena 2,2 % espaçada +8 % / linha forte 3,5 % bold na cor
    de destaque / linha pequena 2,2 %). Depois, só palavras-chave soltas em sans fina 2,5–3 %, no espaço vazio do
    quadro (céu, parede), 60–90 f cada, entrada por fade + 10 px de subida em 8 f.
  - Ou legenda contínua discreta: mono ou sans 3–3,5 %, 2–4 palavras, cor creme/amarelo-claro, sem caixa e sem
    contorno pesado (sombra 2 px a 40 %), centralizada a 72–78 % da altura.
  - Palavra gigante só nos picos (máximo 1 por 45–60 s): condensada black 12–16 % da altura, cor de destaque, entra
    com `MOLA.pop` e some em 4 f; enquanto ela está, a legenda some.
  - Cor: correção natural, pretos levemente levantados (look filme: FFmpeg `curves=all='0/0.04 1/0.97'`), sem grão ou grão 0,03.
- **Implementação:** Remotion `LegendaPro` (lê o `.captions.json` do `transcrever.py`) + `AnimadorTexto` para as
  palavras-chave; Premiere: cortes e B-roll no XML, legendas como MOV alpha; FFmpeg `drawtext` serve para rascunho.
- **Exemplos:** depoimento de morador em ação comunitária; chef cliente falando do fornecedor; dono da empresa no
  carro ou no galpão entre uma tarefa e outra.

### E3. Tela dividida explicativa: rosto + painel (Calebe, Hudson, Sanjar, Ashok, Adamuchi)
- **Quando:** explicar um processo, um sistema, uma ferramenta, um dado; público que precisa entender "como funciona".
  40–80 s. Emoção: clareza e competência.
- **Estrutura:** tese → problema → demonstração (painel ilustra cada frase) → caso real → fecho com série ou CTA.
- **Parâmetros:**
  - Divisão 50/50 (ou 55 % painel em cima / 45 % rosto embaixo). Rosto em close/médio, fundo neutro.
  - Painel: **UI redesenhada para o vídeo** (nunca print cru): cards com cantos de 24–32 px, sombra difusa
    (0 20 60 rgba(0,0,0,.25)), sobre um "palco" — escuro #141414–#1c1c1c (técnico) ou claro #f2f0ec com **sombra de
    janela projetada** (gradiente diagonal 8–12 % de opacidade) para tirar o ar digital.
  - Cada card entra em 10–14 f com `MOLA.firme` (scale 0,92 → 1, y +40 px → 0); itens de grade entram em cascata de
    2 f entre itens; contadores sobem em 20–30 f com `expoOut`; cursor se move com `suave`.
  - Monocromia + **1 acento** (a cor da marca) só no elemento que importa naquele momento.
  - Legenda karaoke sutil: a palavra seguinte em cinza 45 % e acende em branco quando falada (transição de 3 f).
  - Alternância tipográfica para palavras-chave: serifada itálica caixa alta (palavra-chave) × sans bold minúscula (resto).
- **Implementação:** Remotion `Cena3D` + `Camada` para os cards (profundidade z de 0 a −300 px, leve parallax),
  `AnimadorTexto` (range por palavra) para o karaoke; HyperFrames é o mais rápido para UI (HTML/CSS real + `gsap.from`
  com `stagger:0.066`); composição final: FFmpeg `vstack` (`[painel][rosto]vstack=inputs=2`) ou Premiere com 2 trilhas
  escaladas e posicionadas.
- **Exemplos:** empresa de software mostrando o fluxo do pedido; distribuidora mostrando como monta a rota; oficina
  com a metade de baixo em macro da bancada (em vez de UI).

### E4. Colagem editorial de papel / estilo Vox (Sanjar, Ashok, tapewarp, Ignacio, Sahil, DiegoCuts)
- **Quando:** explicativo, história de origem, dado curioso, conceito abstrato; sem rosto ou com rosto em parte.
  30–45 s. Emoção: curiosidade e inteligência. Funciona muito bem para "conteúdo que ensina".
- **Estrutura:** gancho com a imagem mais estranha ou bonita (0–2 s) → fato → desenvolvimento em 5–8 "pranchas" → fecho reflexivo ou CTA.
- **Parâmetros:**
  - Fundo: papel com textura (creme #efe6d2, kraft, ou cor chapada **com mancha de papel/aquarela** — ultramar #2a2fa0,
    mostarda #e3b23c); nunca cor lisa digital. Textura em Multiply 60–80 %.
  - Imagens: fotos **P&B** recortadas (contorno branco de 4–8 px opcional), meio-tom (halftone) em algumas, sombra
    de recorte 0 6 14 rgba(0,0,0,.35); **1 cor de destaque** (amarelo, vermelho ou laranja) em tarjas, diagramas, setas.
  - Tipografia: serifada slab ou Didone para títulos (10–14 % da altura), mono ou sans condensada para etiquetas
    (2,5–3,5 %); legenda como **tira de papel** (retângulo branco levemente torto ±2°, sombra) com a palavra-chave numa
    tira de cor.
  - Movimento: cada elemento entra em 8–12 f com rotação −4° → 0° e `MOLA.pop` leve ("papel colado"); câmera 2,5D com
    3 planos (fundo 0,98 → 1,02, meio 1,0 → 1,05, frente 1,0 → 1,10) em 60–90 f; páginas viram; rack focus
    (desfoque 12 px → 0 em 15 f) para revelar a prancha. Tempo por prancha: 2–3 s.
  - Grão 0,06–0,10; vinheta leve.
- **Implementação:** Remotion `Cena3D`/`Camada` (cada recorte uma camada PNG com alpha) + `AnimadorTexto` + `GrainOverlay`;
  recortes com rembg (`rembg i foto.jpg foto.png`); meio-tom: FFmpeg ou Pillow (threshold/dither) ou filtro SVG;
  HyperFrames: cada prancha um `<section>` com `gsap.timeline` e `rotation:-4 → 0`.
  Ferramentas vistas: Claude + Higgsfield MCP (skill "vox-motion-graphics") e Claude + InVideo MCP
  (`mcp-v2.invideo.io/mcp`, timeline editável) — opcionais, pagas.
- **Exemplos:** de onde vem um produto (mapa de papel, foto do produtor, data carimbada); história do bairro com fotos
  reais de acervo; "como o pedido viaja" explicado em papel.

### E5. Retrô-documentário cinematográfico (EarnEdits ×3, receita do wintage)
- **Quando:** história com tempo e lugar (origem, trajetória, caso, marco histórico, notícia), narração em off;
  emoção de mistério, peso, memória, orgulho. 30–45 s.
- **Estrutura:** frase-resumo como gancho ("ele sequestrou um avião… e sumiu para sempre") → data/lugar → fatos em
  ordem cronológica (1 frase = 1 imagem) → virada → fecho reflexivo.
- **Parâmetros:**
  - Imagem: fotos/planos com **push-in contínuo** (Ken Burns 1,00 → 1,08 em 70–90 f), separação 2,5D quando possível.
  - **Look de 3 camadas** (receita do DfQNycSzvkm): (1) desfoque só nas bordas, raio máximo ≈ 58 px num mapa radial
    (centro nítido em 45–55 % da altura); (2) vinheta forte (CC Vignette Amount ≈ 29, ângulo ≈ 45°); (3) textura de papel
    ou poeira em **Screen** com Levels puxando os pretos (só as fibras claras aparecem), opacidade 25–40 %. Grão 0,10–0,18.
  - Paleta: fria dessaturada (teal/cinza) para mistério; âmbar/sépia para memória.
  - Tipografia de manchete: sans extra-black caixa alta, **2 linhas: branca + cor de destaque** (amarelo-limão #e7f000
    ou a cor da marca), 7–10 % da altura, com a palavra **parcialmente atrás** do objeto/pessoa. Data como capítulo:
    linha pequena 3 % + ano gigante 14–18 %.
  - **Texto que pertence à superfície**: gravado na rocha/metal (sombra interna + textura da superfície em Multiply),
    carimbado no papel, projetado na parede (Screen + leve desfoque + keystone), pregado no quadro.
  - Abertura com **rack focus**: tudo desfocado (16–20 px) por 30–45 f e foco em 20 f.
  - Transição: desfoque/névoa cruzada 10–15 f; nada de wipe de software.
- **Implementação:**
  - FFmpeg (look de 3 camadas, 9:16):
    ```
    # passo 1 (uma vez): máscara radial — preto = nítido, branco = desfocado
    ffmpeg -f lavfi -i "color=black:s=1080x1920,format=gray,geq=lum='255*min(1,max(0,(hypot(X-W/2,Y-H/2)/(H*0.5)-0.35)/0.45))'" -frames:v 1 mascara.png
    # passo 2: borda desfocada + vinheta + textura em Screen + grão
    ffmpeg -i in.mp4 -loop 1 -i mascara.png -loop 1 -i papel.jpg -filter_complex "
    [0:v]scale=1080:1920,fps=30,format=yuv420p,split[a][b];[b]gblur=sigma=14,format=yuva420p[bl];
    [1:v]format=gray,scale=1080:1920[m];
    [bl][m]alphamerge[bla];[a][bla]overlay=shortest=1,vignette=angle=PI/4,format=yuv420p[v];
    [2:v]scale=1080:1920,fps=30,format=gray,eq=contrast=1.8:brightness=-0.3,format=yuv420p[tx];
    [v][tx]blend=all_mode=screen:all_opacity=0.35:shortest=1,noise=alls=12:allf=t+u,format=yuv420p[out]" -map "[out]" -map 0:a? -c:a copy out.mp4
    ```
    (Sintaxe validada no FFmpeg 9.0.2 em 08/11/2026; a máscara é gerada uma vez porque o `geq` por quadro é lento. `sigma` do gblur ≈ raio/4 do Compound Blur; a máscara deixa
    nítidos os 35 % centrais e chega ao desfoque total a 80 % do raio.)
  - FFmpeg (Ken Burns 2,7 s em foto): `scale=2160:-1,zoompan=z='min(zoom+0.0009,1.08)':d=81:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30`
    (escalar 2× antes evita tremor).
  - Remotion: `Camada` com `chaves` para o push-in, `GrainOverlay` (poeira + vinheta + flicker), `ShaderCamada`
    (neblina/Fractal Noise) para névoa, `TextoAtrasDaPessoa` para a manchete atrás do objeto.
  - Premiere: adjustment layer com Gaussian Blur + máscara invertida com feather 400 px, Vignette, textura em Screen.
- **Exemplos:** história de origem de uma empresa ("DESDE / 20XX"), linha do tempo de uma ação comunitária com fotos
  reais, "o conserto mais difícil do ano".

### E6. Pôster editorial premium animado (motionnikhil, Marvix, Andrhé)
- **Quando:** peça de conceito, campanha, abertura, frase de posicionamento; marca premium; 8–15 s; pouca fala.
- **Parâmetros:**
  - Paleta de 3: papel creme #efe6d2 + preto + 1 cor (laranja-vermelho #e8452c ou a cor da marca). Grão de papel 0,05, vinheta leve.
  - Composição de cartaz: **objeto real recortado** (fotografado, não banco de imagem) com sombra suave; escala
    humana minúscula contra objeto grande; círculo de cor atrás do objeto (40–55 % da largura); número gigante cortado
    pela borda (25–35 % da altura) em cinza 20 %; microtextos, grid fino, código de barras como textura de cartaz.
  - Tipografia: serifada Didone/Playfair black para a palavra (10–16 %), script manuscrito pequeno por cima (3–4 %),
    etiqueta em retângulo de cor (2,5 %). Troca de palavra no mesmo lugar por máscara (8 f sai, 8 f entra).
  - Ritmo: 0,5–0,8 s por estado; legenda que **ganha nitidez quando falada** (desfoque 6 px e cinza 40 % → nítido em 4 f).
- **Implementação:** Remotion `AnimadorTexto` (máscara por palavra) + `Camada`; HyperFrames ideal (layout de cartaz em
  CSS grid); objetos: foto do produto + `rembg`.
- **Cuidado:** é o estilo que mais vira "template de IA" quando usa robô, cérebro, lâmpada, espartano, cabeça de
  caixa. Sempre objeto **do cliente**.
- **Exemplos:** "Frescor não espera" com o produto recortado; cartela de abertura de série técnica com a ferramenta real.
- **Variante E6b — "P&B + círculo vermelho narrado"** (Andrhé Alves, `DfLJHz4i4gS`, 33 s, pedido do Italo 08/11/2026;
  estudo em `D:\PEFORMAKE\REFERENCIAS\_perfis\giubeckers\Instagram\53929664397\DfLJHz4i4gS\sequencia_densa.jpg`):
  - **Locução contínua** (voz off) e **cada frase vira um cartaz**: a imagem é a metáfora literal da palavra dita
    ("100% editado" → cérebro; "você acreditaria?" → Terra; "cada movimento" → máquina de escrever vira bailarina;
    "madrugada" → homem com pedra na cabeça + relógio 03:43; "pedir" → homem no pedestal; "IA" → robô).
  - **Paleta:** fotos **P&B** (dessaturadas, contraste alto) + **um vermelho** (#c8102e) só no círculo/ponto/etiqueta;
    fundo cinza-claro em degradê (#d6d6d6 → #f2f2f2) e **cenas pretas** para a virada/pergunta ("não, né?",
    "foi uma IA", "você que sabe"). Alternar claro/escuro marca a mudança de tom.
  - **Texto:** sans geométrica (Inter/Manrope); frase pequena em cinza 60 % + **palavra-chave grande** em preto
    bold logo abaixo; a palavra **entra desfocada e cinza e fica nítida** quando é falada (4–6 f); a anterior some em
    desfoque. 1–4 palavras por vez, no terço superior.
  - **Fundo tipográfico:** palavra ou número **gigante** (≈30 % da altura) cortado na base, desfocado/cinza
    ("100%", "MOV", "03:43", "PEDIR"), atrás do objeto. Dá profundidade 2,5D.
  - **Detalhes de cartaz (HUD):** QR code, código de barras, microtextos de 2 linhas nos cantos, círculo pontilhado,
    etiqueta "EDIÇÃO 100% IA", asterisco. Ficam parados, criando um "sistema" que se repete em todas as cenas.
  - **Movimento:** quase nada de corte seco: objeto **transforma** em outro (morph/troca no mesmo lugar),
    empurrão lento de 2–4 %, giro leve. Ritmo de 1–1,5 s por palavra-chave.
  - **Fecho:** cena preta com a frase de escolha ("ou continuar editando de madrugada… você que sabe.") e, por último,
    o cartão da marca/CTA.
  - **Para nós:** troque robô/cérebro/Terra por **objetos e fotos do cliente** recortados em P&B, e o vermelho pela
    cor da marca (Disalp, MF etc.). Funciona muito bem para anúncio narrado de 20–40 s.

### E7. Micro-documentário ilustrado em capítulos (Kanishya)
- **Quando:** história de um produto, ingrediente ou ideia com 8–15 fatos; narração; 45–60 s. Emoção: encanto,
  curiosidade.
- **Parâmetros:** cada frase = um "cartão" com direção de arte própria (cor de capítulo diferente, sempre da mesma
  família vintage: verde-oliva, azul-marinho, creme, mostarda), título em serifada clássica como capa de livro,
  legenda serifada pequena amarela na base (2,5 %); padrões repetidos (estampa do produto) e "dano" animado para
  conflito; troca de cartão em 3–4 s com dissolve de 8 f. Moldura humana opcional: a pessoa real reagindo ao lado
  (prova de que há gente por trás).
- **Implementação:** HyperFrames ou Remotion (um componente "Cartao" por capítulo com props cor/título/imagem); narração
  pode ser a voz real ou `scripts/narrar.py` (Kokoro) se o cliente aprovar.
- **Exemplos:** "Breve história do tomate italiano"; "Por que a rúcula amarga"; "1.500 variedades de banana".

### E8. Antes e depois / bruto × editado (Vaisakh, Shaan DfSrDF, Deborah, Adamuchi, Jo Mendes, Melika)
- **Quando:** provar transformação (serviço, conserto, reforma, edição), vender o serviço da própria agência; 9–27 s,
  feito para loop.
- **Variantes e parâmetros:**
  - **Cards lado a lado** (Vaisakh, Shaan): fundo neutro com textura (grade de papel milimetrado 4 % ou papel escuro),
    título editorial em sans fina espaçada (tracking +20 %, 2 %) com data; 2 cards de cantos 28 px, etiquetas
    "ANTES/RAW" (branca) e "DEPOIS/EDITADO" (cor de destaque); os dois vídeos **sincronizados** no mesmo tempo.
  - **Empilhado** (Adamuchi, Deborah): quadro 16:9 em cima e embaixo, legenda amarela condensada bold 3 % entre eles,
    rótulos em faixa marca-texto.
  - **Match cut de pose** (Melika): mesmo enquadramento e pose, tratamentos diferentes trocando a cada 8–12 f.
  - **Flash-cut** (Jo Mendes): 2–3 quadros de outro tratamento inseridos no pico de uma ação.
- **Implementação:** FFmpeg `hstack`/`vstack` com `pad` e `drawbox` para os cards; ou Remotion com dois `OffthreadVideo`
  (mesmo `startFrom`) dentro de cards. Para antes/depois de verdade: **tripé no mesmo lugar, marca no chão, mesma luz**.
- **Exemplos:** ferramenta chegando × entregue; vídeo bruto × entregue (venda da agência); caixa comum × caixa selecionada.

### E9. Tutorial com assinatura visual (Victor ZK, Ignacio, Sahil)
- **Quando:** conteúdo recorrente/série; quando a pessoa é a marca. Duração livre.
- **Parâmetros:** escolher **1 enquadramento + 1 fundo + 1 cor + 1 família tipográfica** e repetir em todos os
  episódios (ex.: lente olho-de-peixe com vinheta circular; câmera em plongée grande-angular). Telas explicativas
  com fundo de marca **texturizado** (tecido, papel milimetrado), janelas de software flutuando em 3D, elementos com
  física (caem, quicam). Vinheta de série de 1–1,5 s ("EP-01"). Para dar palco ao texto: **desfocar o fundo/rosto**
  (desfoque 0 → 18 px em 6 f) em vez de cortar.
- **Implementação:** Remotion `Cena3D` + `impacto()`/`MOLA.pesada` para física; fisheye em FFmpeg:
  `lenscorrection=k1=0.5:k2=0.5` (aproximação) + `vignette`.
- **Exemplos:** quadro fixo semanal ("Diagnóstico da semana EP-01"), "Tela do dia" de um software.

### E10. Motion de interface / abstrato com som (Adrian Razén, Pramod)
- **Quando:** demonstrar produto digital, catálogo, abertura de 2–3 s de gancho.
- **Parâmetros:** uma metáfora visual única (playhead + forma de onda; janela; cursor), 2 cores, fundo com textura
  física (concreto, papel). **Um SFX por evento visual** (aparecer, clicar, deslizar), cada um ≤ 0,5 s, com o corte
  caindo no transiente. Gancho de micro-planos: 4–6 planos de 20–22 f com whip na direção do movimento + whoosh;
  contraste de cor no último plano marca a virada.
- **Implementação:** skill `sound-effects` (cue list, batidas, −16 LUFS, pico < −4 dBFS); Remotion `TransicaoWhip`.

### E11. Carrossel animado (DiegoCuts)
- **Quando:** conteúdo educativo em passos (5 passos, 5 sinais); alcance por salvamento.
- **Parâmetros:** 1080×1350, 6–8 s em loop, sem áudio. Layout fixo em todos os slides: cabeçalho mono minúsculo (1,2 %),
  rótulo "Passo 1" amarelo (1,8 %), título serifada condensada de jornal (5–6 %), corpo sans 1,9 % com negritos, tags
  em retângulo de cor; **só a "janela de vídeo" se mexe** (loop com rack focus ou troca de colagem). Fundo com
  gradiente radial + grade de "+".
- **Implementação:** HyperFrames ou Remotion com uma composição por slide e props; export com loop perfeito (último
  quadro = primeiro).

### Mesclas recomendadas (o "nada é regra")
- **E2 + 1 técnica de E1**: documental mínimo com UMA palavra atrás da pessoa no momento mais forte (premium, B2B).
- **E3 + E4**: tela dividida em que o painel é colagem de papel em vez de UI (explicar processo físico).
- **E5 + E2**: depoimento real intercalado com fotos de acervo tratadas no look de 3 camadas (memória, comunidade).
- **E8 + E1**: antes/depois em que a versão "depois" é o talking head cinético (vender o serviço da agência).
- **E6 como abertura (2–3 s) + E2 como corpo**: cartaz de conceito abrindo um depoimento.

---

### E12. Lista explicada por avatar + cartões de dados (João Pedro Amorim `DfTIAPVRKX-`, 36 s, 1.917 comentários)
Estudo: `D:\PEFORMAKE\REFERENCIAS\_estilos\Instagram\56849520487\DfTIAPVRKX-\` (pedido do Italo 08/11/2026).
- **Quando:** lista de ferramentas/dicas/números ("9 trocas", "5 erros"), conteúdo de autoridade sem gravar rosto;
  ótimo para série diária. Gera muito comentário (CTA de palavra-chave).
- **Estrutura (36 s):** gancho com número concreto ("vai te fazer economizar mais de R$ 1.400/mês") + **prova**
  visual (recibo/nota com a soma, carimbo "GRÁTIS" e total zerando) → 9 trocas em ~2 s cada ("X → Y") → soma final
  ("350 mil estrelas") → dica extra ("antes de assinar, procure o repo") → CTA ("comenta REPO") → "segue pra mais".
- **Visual:** **avatar cartoon do próprio criador** fixo no canto inferior direito, gesticulando/apontando para o card
  (dá rosto e personalidade sem filmar); cards limpos de interface no terço superior: ícone + nome + preço em etiqueta
  amarela; a troca é **o nome antigo riscado com traço amarelo** e o card novo deslizando por cima com selo "US$ 0" e
  estrelas do GitHub; contadores que sobem (349,3 mil → 350,0 mil); barra de busca digitando; card de checklist.
- **Sistema gráfico fixo:** cabeçalho mono pequeno "// troca 3 · #03 / 09" (progresso visível), fundos alternando
  azul-marinho escuro e off-white a cada item (ritmo sem corte), amarelo-mostarda como único destaque.
- **Texto:** legenda palavra a palavra no topo-esquerda: sans bold branca + **palavra de ênfase em serifada
  itálica** ("e *quatrocentos*", "é um *clone*", "de *graça*"). Mistura sans + serifada itálica = sofisticação.
- **Áudio:** voz (clone da própria voz, assumido no vídeo como prova: "essa voz é um clone") + SFX de UI em cada
  card (pop, swipe, risco, contador).
- **Implementação:** Remotion/HyperFrames (cards em React/CSS, contadores, risco animado), avatar = ilustração do
  cliente animada em 2–3 poses (ou vídeo do próprio cliente recortado). **Voz/avatar clonado só com autorização
  escrita do cliente** e avisando no vídeo.
- **Para nós:** Performake/Ellcazo (ferramentas, dicas de marketing), MF Máquinas ("5 ferramentas que substituem…"
  com cards de produto e preço), Disalp (comparativos de rendimento com contador).

### E13. Manifesto de metáforas 3D em cor chapada ("Stay irreplaceable") — FAVORITO DO ITALO
Ref.: Prath `DfMzGyNBdUH` (12,8 s, 25 fps, 3.969 curtidas) — breakdown lado a lado **storyboard × vídeo final**.
Estudo: `D:\PEFORMAKE\REFERENCIAS\_tutoriais\Instagram\77071789875\DfMzGyNBdUH\` (`sequencia_densa.jpg`, `detalhe.jpg`).
**A gramática (vale para qualquer assunto — o vídeo do Prath é só um exemplo dela):**
1. **Uma ideia = uma imagem.** Cada frase/batida do roteiro vira **uma única imagem-símbolo** que *mostra* a ideia em
   vez de ilustrá-la com texto. Como achar o símbolo: pegue o **verbo ou o substantivo central** da frase e torne-o
   literal e físico (escolher → uma mão erguendo uma coisa entre muitas; excesso → enxame de objetos; fragilidade →
   algo quebrando; vitória → troféu). Concreto > abstrato; objeto do cliente > objeto genérico.
2. **Composição de "herói único":** um objeto principal no centro (≈40–60 % do quadro), nada competindo; fundo
   **chapado** com vinheta/gradiente suave; profundidade de campo curta; luz de estúdio com contraluz (rim light)
   separando o objeto do fundo. Material "bonito" (vidro, metal, pele, papel) bem iluminado = sensação premium.
3. **Cor como ritmo:** cada batida ganha **outra cor de fundo saturada** (paleta de 3–4 cores fortes + preto). A troca
   de cor marca a passagem de ideia sem precisar de transição; o objeto em tom neutro/translúcido contrasta com tudo.
   Para cliente: as cores da marca viram a paleta de batidas.
4. **Câmera sempre viva:** nunca quadro parado — aproximação lenta (2–5 % de escala por segundo), leve órbita/paralaxe,
   objetos entrando da profundidade com desfoque de movimento. **Corte seco na batida** da música; no clímax, **um**
   evento físico (quebra, explosão, queda) e depois o fecho calmo.
5. **Tipografia como sussurro:** o texto é secundário — no máximo 1–2 palavras por cena, pequenas, em itálico fino
   (serifada) ou num acento de estilo (ex.: fonte pixel/retrô) no espaço vazio; a imagem carrega o sentido. Uma
   fonte "de acento" usada só 2–3 vezes cria assinatura.
6. **Tempo:** 1,5–2 s por batida, 6–8 batidas, 10–20 s no total; locução curta e seca (ou só texto + música).
7. **Som:** um efeito físico por evento visual (whoosh no voo, impacto na entrada, vidro no clímax, assinatura sonora
   no fecho) — ver `sound_design.md`.
8. **Processo:** **storyboard desenhado primeiro** (rascunho simples de cada batida) → aprovação → produção. O
   storyboard é onde se escolhem as metáforas; a produção só executa.

**Onde aplicar (não só manifesto):** abertura de qualquer vídeo de marca; vinheta de 5–8 s entre blocos de um
depoimento; anúncio de produto (o produto é o herói, cada benefício é uma batida de cor); fecho de campanha;
carrossel animado (uma batida por slide). Mesclas: talking head (E1/E2) + 2–3 batidas E13 nas frases mais fortes.
**Como fazer aqui (grátis):** objetos 3D simples em three.js + Remotion (vidro/metal/luz de estúdio), fotos do
cliente recortadas (`recortar.py`) com sombra e luz, cenas em HTML/CSS (HyperFrames), fundo chapado + vinheta + grão.
**Armadilhas:** metáfora genérica de IA (robô, cérebro, lâmpada), muitas palavras na tela, fundo com textura
competindo com o objeto, câmera parada, trocar de cor sem trocar de ideia.

### E14. Fio condutor de uma forma (Milad Aslani — `DfWvqYMM7uA` 6,8 s e `DfZivEts0Fz` 9 s)
**A gramática:**
1. **Um elemento gráfico mínimo é o protagonista** (um quadrado branco + alguns pontos). Ele nunca some: cresce,
   cobre a tela, vira os "três pontinhos" de carregando, explode em constelação, liga-se em raios e **se transforma
   no símbolo da marca** — a transição É a forma mudando, não um efeito entre cenas.
2. **Monocromia de um matiz só** (ex.: vinho) — o cenário real da pessoa, as roupas neutras e os fundos gráficos
   compartilham o mesmo tom; o branco é a luz. A **única cor nova** aparece só no símbolo da marca (ex.: laranja) e,
   no momento da revelação, o fundo **inverte para branco**. Cor guardada para o clímax.
3. **Pessoa real como âncora**: plano aberto, cenário limpo, pessoa parada no centro (sentada num cubo, de roupa
   neutra); o motion acontece em volta e entre as falas — no começo e no fim é ela, no meio é só a forma.
4. **Texto palavra por palavra grande** (sans fina/semipixelada, branca) no lugar da cabeça/terço superior, com
   **colchetes de canto** `⌐ ⌙` enquadrando a frase final; a pergunta em texto pequeno centralizado no vazio preto.
5. **Ritmo curtíssimo** (7–9 s): entrada com desfoque de movimento forte, ~0,3–0,5 s por palavra, corte em preto
   para a virada, revelação de marca em ~1 s, volta para a pessoa no fecho.
6. **Som de interface/glitch** em cada transformação da forma.
**Onde aplicar:** vinheta de abertura ou fecho de marca (Ellcazo/Performake), "chamada" de 7–10 s para anúncio,
revelação de logo do cliente, transição entre blocos de um vídeo maior. Funciona com qualquer pessoa num fundo
limpo + a cor da marca como matiz. Combina com a skill `motion-broll` (um elemento contínuo que transforma).
**Como fazer aqui:** pessoa recortada ou gravada em fundo limpo + color grade monocromático (FFmpeg/Premiere,
`cor-sony`); forma e texto em Remotion/HyperFrames (quadrado → pontos → raios → logo do cliente em SVG).
**Armadilhas:** mais de uma forma protagonista, cores demais antes da revelação, cenário poluído atrás da pessoa.
**Breakdown técnico completo** (linha do tempo, câmera, texto, transições, cor, música e SFX medidos):
`estilos/breakdowns/E14_milad_DfWvqYMM7uA.md`.

## 3. As 15 técnicas mais valiosas (em ordem)

Cada uma: **o que é → quando → parâmetros (30 fps) → como implementar**.

1. **Texto atrás do sujeito (profundidade)** — Barsol, Metros, Shaan, EarnEdits.
   Quando: 1 palavra-chave por cena, no pico de sentido. Parâmetros: palavra 18–30 % da altura, condensada black,
   cor da marca; cobre 30–60 % do corpo na vertical, cabeça sempre visível; entra 8–10 f (`MOLA.pop`) quando a palavra é
   dita (2 f antes), fica 20–40 f, sai 5 f. Implementação: `recortar.py fundo` → `pessoa.mov`; Remotion
   `<TextoAtrasDaPessoa video pessoa><TituloCinetico/></TextoAtrasDaPessoa>`; FFmpeg `[fundo][texto]overlay[t];[t][pessoa]overlay`;
   Premiere V1 vídeo / V2 texto / V3 pessoa. Cabelo e bordas: feather de 1–2 px no alpha (`alphaextract,gblur=sigma=1`).

2. **Legenda discreta + palavra-pico rara** — Giullya, Emerson e Rebeca.
   Quando: qualquer vídeo falado. Parâmetros: legenda 3–3,5 %, 2–4 palavras, sem caixa, sombra 2 px a 40 %, a 72–78 % da
   altura; palavra-pico 12–16 %, no máximo 1 a cada 45–60 s em documental (1 a cada 4–6 s em cinético). Implementação:
   `LegendaPro` (destaques = lista de palavras-pico) + `TituloCinetico` no pico.

3. **Imagem = palavra dita** — Vaisakh, Calebe, Barsol ("FOR MONTHS" de nuvem).
   Quando: sempre que houver B-roll ou ilustração. Parâmetros: o corte para o B-roll cai **na sílaba tônica** da
   palavra (tolerância ±3 f), o B-roll dura até o fim da ideia (no mínimo 45 f), o áudio do B-roll fica mudo ou como
   ambiente a −24 dB. Implementação: `transcrever.py` (tempos por palavra) → lista de cortes → XML do Premiere ou
   `montar.py`; checar plano a plano (NARRATIVA §11b).

4. **Texto que pertence à superfície** — EarnEdits DfZoBRQuHwq.
   Quando: documental, institucional premium, marca com espaço físico. Parâmetros: texto em perspectiva da superfície
   (corner pin), Multiply ou Overlay 70–90 %, sombra interna 2–4 px, textura da superfície por cima a 20 %; projetado =
   Screen + desfoque 1,5 px + keystone. Implementação: Remotion `Camada` com `transform: perspective() rotateX/Y` ou
   `SeguirPonto` com track de 4 cantos (`rastrear.py`); Premiere com Corner Pin.

5. **Paleta restrita: neutro + 1 cor de marca** — todos os bons.
   Parâmetros: 70 % neutros (preto, creme, cinza), 20 % imagem, ≤ 10 % cor de destaque, usada só no que importa.
   Implementação: tokens em `remotion/src/pro/marca.ts`; LUT/curvas por cliente (`scripts/corrigir_cor.py`).

6. **Câmera sempre viva (push-in / 2,5D)** — EarnEdits, Barsol, Vox.
   Parâmetros: push-in de 1,00 → 1,06 por plano de fala, 1,00 → 1,08 por foto; parallax em 3 planos (0,98–1,02 / 1,0–1,05 /
   1,0–1,10); nada parado por mais de 60 f, salvo respiro intencional. Implementação: `VideoBase zoomAte`, `Cena3D`;
   FFmpeg `zoompan` (receita E5).

7. **Look de 3 camadas (borda desfocada + vinheta + textura)** — wintage.
   Parâmetros e FFmpeg completos em E5. Intensidade baixa: o "antes/depois" deve ser sutil.

8. **Duas vozes tipográficas** — Hudson, Melika, Shaan.
   Parâmetros: serifada itálica (Playfair/Instrument Serif/Cormorant) para a palavra-chave ou a emoção; sans (Inter/Archivo)
   para o resto; razão de tamanho 1,6–2,2×; nunca mais de 2 famílias + 1 mono de etiqueta. Implementação: `AnimadorTexto`
   com estilo por palavra; fonte local (Archivo já em `remotion/public/fonts/`).

9. **Tela dividida com UI redesenhada (não print)** — Calebe, Hudson.
   Parâmetros: E3. Palco claro com sombra de janela ou escuro monocromático; cards em cascata de 2 f; cada card ilustra a
   frase daquele instante. Implementação: HyperFrames (HTML real) ou `Cena3D`.

10. **Antes/depois sincronizado** — Shaan, Vaisakh, Adamuchi.
    Parâmetros: E8; 9–15 s para loop; mesma ação nos dois lados, mesmo tempo. Implementação: `hstack`/`vstack` ou dois vídeos no Remotion.

11. **Manchete de 2 linhas (branca + cor) e data como capítulo** — EarnEdits DfPbRFWu-JU.
    Parâmetros: extra-black caixa alta, linha 1 branca 7 %, linha 2 cor 9–10 %, entra linha a linha com 4 f de intervalo,
    subida de 20 % + desfoque 6 → 0 px, `expoOut` 8 f; data: linha 3 % + ano 14–18 %. Implementação: `TituloCinetico`
    (linhas + destaques).

12. **Contorno tracejado / etiquetas em profundidade** — Shaan DfMhcgtRnbX, Reverse.
    Quando: nomear partes de um objeto ou destacar a pessoa. Parâmetros: traço branco 3–4 px, tracejado 10/8, desenha em
    18–24 f (`expoOut`); frase curvada seguindo a silhueta a 2,5 %; etiquetas de papel branco 2 % com fio até o ponto,
    entrando em cascata de 4 f, com profundidade (algumas atrás do objeto). Implementação: `TracoAnimado` (trim paths) sobre
    o contorno extraído do alpha do rembg (OpenCV `findContours` → path SVG); etiquetas com `SeguirPonto`.

13. **A palavra vira o mundo (transporte de cena)** — Barsol ("FOR MONTHS" de nuvem), Metros.
    Quando: 1 vez por vídeo, na frase de tempo, lugar ou sonho. Parâmetros: corte seco ou whip de 6 f para a cena-metáfora,
    45–75 f, volta para a pessoa. Implementação: B-roll real (céu, estrada, campo) + texto com textura da cena
    (máscara de nuvem/fumaça via `ShaderCamada` Fractal Noise).

14. **Fecho mínimo ou fecho em imagem** — Barsol, NARRATIVA §9.
    Parâmetros: logo ≈ 4 % da altura, glow 20–30 px a 50 %, sobre preto ou sobre o último plano escurecido 60 %; 45–60 f;
    a música resolve 6–10 f depois da última palavra. Ou fechar no plano de prova (rosto, gesto, produto). Nunca cartela de texto.

15. **Som motivado: 1 SFX por evento + whip/flash só em ação** — Adrian, Pramod, Jo Mendes.
    Parâmetros: SFX ≤ 0,5 s, −18 a −12 dB sob a voz, transiente no quadro do corte; whip 6–8 f na direção do gesto;
    flash-frame 2–3 f só no pico de movimento. Implementação: skill `sound-effects`; Remotion `TransicaoWhip`/`impacto()`.

**Menções que quase entraram:** rack focus de abertura (16–20 px → 0 em 20 f); desfocar o rosto em vez de cortar para
entrar texto; filmar a tela com câmera real, em ângulo; tese em 3 níveis no topo por 5–7 s; série com vinheta própria.

---

## 4. Erros de "cara de IA" que esses profissionais evitam

1. **Metáfora de banco de imagem**: robô cromado, cérebro mecânico, lâmpada, espartano, cabeça de caixa, ampulheta genérica
   (DfLJHz4i4gS teve 44 curtidas). Eles usam objeto real e específico ou foto de arquivo P&B.
2. **Muitas fontes e estilos de legenda sem motivo** (Reverse: 4–5 estilos em 13 s). Os bons usam 2 vozes; quando variam
   (Shaan), cada variação ilustra o que a frase diz.
3. **Texto "colado por cima"**: sem profundidade, sem perspectiva, sem luz da cena. Os bons põem o texto atrás, na
   superfície ou com a luz e o grão da cena.
4. **Legenda gigante com contorno grosso o tempo todo**. Os bons: legenda pequena e elegante + palavra-pico rara.
5. **Cor lisa digital** (gradiente perfeito, fundo chapado). Os bons sempre têm textura: papel, concreto, tecido, grão, sombra de janela.
6. **Print de tela cru**. Os bons redesenham a UI ou filmam a tela com câmera, em ângulo, com ambiente.
7. **Movimento linear e uniforme**: tudo entra igual, mesma velocidade. Os bons: `expoOut` na entrada, saída mais rápida,
   mola só na palavra-chave, câmera sempre viva mas lenta.
8. **Troca de imagem a cada 2 s sem respiro** e tudo com a mesma energia. Os bons alternam ritmo (micro-planos no gancho,
   planos longos na fala forte) e deixam o rosto quando a fala é forte.
9. **Imagem gerada com erros visíveis**: texto ilegível em papel, objeto surreal sem motivo (carro capotado), iluminação
   perfeita demais no objeto inserido, rosto que muda entre ângulos. Com pessoa e lugar reais de cliente: não gerar.
10. **Paleta que quebra no fim** (fecho com logo neon numa peça P&B). Os bons mantêm a paleta até o último quadro.
11. **Erro de digitação e frase sem contexto** ("Artifical"; começar em "e quando a gente fala…"). Os bons revisam o texto
    da tela e começam com frase que se entende sozinha (NARRATIVA §11b).
12. **Transições de software** (cubo, página virando digital, zoom genérico). Os bons: corte seco; whip, rasgo, rack focus ou
    flash só quando há motivo.
13. **Música e SFX sem curva**: loop do início ao fim, "beep" em toda palavra. Os bons: 1 som por evento, silêncio antes da
    frase forte, música resolvendo depois da última palavra.
14. **Falta de identidade**: cada vídeo de um jeito. Os maiores do lote (Victor ZK, EarnEdits, Vox) repetem o mesmo sistema
    visual — o público reconhece em 1 s.

Checklist rápido antes de entregar: (1) há algum objeto genérico de banco? (2) quantas famílias de fonte? (≤ 2 + mono)
(3) o texto tem profundidade, superfície ou luz da cena? (4) há textura em todo fundo? (5) as entradas usam curva e
as saídas são mais rápidas? (6) existe pelo menos 1 respiro sem texto e sem música alta? (7) cada B-roll corresponde à
palavra dita? (8) a paleta se mantém até o fim?

---

## 5. Recomendação por cliente (exemplos de aplicação das receitas)

| Cliente | Estilo base | Mesclar com | Técnicas-chave | Evitar |
|---|---|---|---|---|
| **Disalp** (distribuidora B2B de hortifrúti premium, Recife; técnico e elegante) | **E2 documental mínimo** (chef cliente, operação real de madrugada) | **E7 micro-doc em capítulos** ou **E4 colagem de papel** para história de produto; **E6 pôster** como abertura de campanha | Duas vozes (serifada itálica + sans) na cor da marca; texto que pertence à superfície (data carimbada na caixa); número gigante atrás do retrato do chef ("06:00"); tríptico "dado em serifada + foto P&B" ("38 restaurantes. Toda manhã."); look de 3 camadas suave para origem | Talking head cinético carregado, flash-cut, cores múltiplas, metáforas genéricas |
| **MF Máquinas** (assistência técnica de ferramentas; azul royal + laranja, energia) | **E1 talking head cinético** com o técnico na bancada | **E8 antes/depois** (ferramenta chegou × entregue, tripé fixo) e **E9 série com assinatura** ("Diagnóstico da semana") | Texto atrás do técnico (azul) + palavra-pico laranja; contorno tracejado e etiquetas nomeando partes (escovas, induzido, rolamento); gancho de micro-planos da oficina com whip + som real de motor; flash-frame 2–3 f quando a máquina liga; stop motion de desmontagem | Colagem de papel delicada, serifadas finas, cenário gerado |
| **3LM** (tecnologia/sistemas para restaurantes, evento) | **E3 tela dividida** (fala + fluxo do sistema redesenhado) | **E1** para o vídeo de evento (palavras sobre o palco/telão) e **E10** para demos curtas com SFX de UI | UI em cards sobre palco claro com sombra de janela; filmar o sistema rodando no tablet do salão; "se não tem vídeo, o evento não aconteceu" (lógica Barsol); fecho mínimo com glow | Print de tela cru, excesso de efeitos de "tech" |
| **Natália de Menudo** (vereadora do Recife; eventos comunitários; documental e afetivo) | **E2 documental mínimo** (a régua é o corte manual do Italo de 07/11) | **E5 em versão memória** só com fotos reais da comunidade (look de 3 camadas sépia suave), e no máximo 1 palavra afetiva em letra manual (lógica do Ignacio) | Tese em 3 níveis no topo; walk-and-talk no bairro; texto pintado no muro com sutileza; fecho em imagem de prova (rosto, rua cheia) | Grafismo cinético, texto atrás da pessoa, qualquer imagem gerada, cartela final |
| **Ellcazo/Performake** (a própria agência) | **E8 antes/depois** "bruto × entregue" em card editorial (9–15 s, loop) | **E9 série** com assinatura própria | Conteúdo de venda do serviço com material real autorizado dos clientes | — |

**Ordem de decisão em qualquer vídeo novo** (vale para clientes futuros): (1) frase-alma e emoção (NARRATIVA §1–2) →
(2) é fala real/espontânea? então E2 é a base; é roteiro de autoridade? E1; é processo? E3; é história? E5/E7; é
conceito? E4/E6; é prova? E8 → (3) escolher no máximo 3 técnicas da seção 3 que sirvam à emoção → (4) checklist de
"cara de IA" → (5) corte bruto sem grafismo aprovado antes do acabamento.

---

## Anexo — esqueleto de FCP XML (Premiere) para empilhar "texto atrás da pessoa"

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
 <sequence><name>TEXTO_ATRAS</name><duration>900</duration>
  <rate><timebase>30</timebase><ntsc>FALSE</ntsc></rate>
  <media><video>
   <format><samplecharacteristics><width>1080</width><height>1920</height></samplecharacteristics></format>
   <track><!-- V1: vídeo base -->
    <clipitem id="base"><name>base</name><start>0</start><end>900</end><in>0</in><out>900</out>
     <file id="f1"><pathurl>file:///D:/PROJETO/base.mp4</pathurl></file></clipitem></track>
   <track><!-- V2: texto (MOV ProRes 4444 do Remotion) -->
    <clipitem id="txt"><name>titulo</name><start>120</start><end>180</end><in>0</in><out>60</out>
     <file id="f2"><pathurl>file:///D:/PROJETO/MOTION/titulo.mov</pathurl></file></clipitem></track>
   <track><!-- V3: pessoa recortada (recortar.py fundo) no MESMO trecho do base -->
    <clipitem id="pes"><name>pessoa</name><start>120</start><end>180</end><in>120</in><out>180</out>
     <file id="f3"><pathurl>file:///D:/PROJETO/MOTION/pessoa.mov</pathurl></file></clipitem></track>
   <track><!-- V4: grão em Overlay (opcional) --></track>
  </video></media>
 </sequence>
</xmeml>
```
Importar com o MCP do Premiere (`import_fcp_xml`). Regra: o `in/out` da pessoa = o `start/end` do trecho do vídeo base,
para o recorte casar quadro a quadro.
