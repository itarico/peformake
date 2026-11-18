# Referência — earn.edits (DfZoBRQuHwq)

- **Link:** https://www.instagram.com/reel/DfZoBRQuHwq/  · **Publicado:** 2026-11-06
- **Métricas visíveis:** 716 curtidas · 12 comentários · — views (o Instagram nem sempre expõe views sem login)
- **Legenda do post:** 🧊 A glacier melted... and revealed a murder scene 5,300 years old 😳  📼 This retro-style motion piece tells the story of Ötzi. In September 1991, two hikers found a body emerging from melting ice in the Ötztal Alps, near the Austria–Italy border. At first they thought it was a recently deceased mountaineer. The truth was far more extraordinary: he had lived around 3300 BCE 🏔️  🔬 The glacier had preserved his clothing, leather footwear, tools, weapons, and even traces of his last meals, giving scientists an unmatched look at life in the Copper Age 🪓  🏹 But then came the disturbing part. An arrow
- **Arquivos (fora do git):** `D:\FERRAMENTAS\ig_teste\earn.edits_DfZoBRQuHwq.mp4` · folha de contato `D:\FERRAMENTAS\referencias\earn.edits_DfZoBRQuHwq\folha_contato.jpg`

## Números (medidos)
| Métrica | Valor |
|---|---|
| Duração | 37.06 s · 1080x1920 · 16.0 fps |
| Cortes | 9 (14.6/min) |
| Plano médio / mais curto / mais longo | 3.71 s / 1.19 s / 5.44 s |
| Cortes nos 3 s iniciais | 1 (1º corte em 1.188 s) |
| Volume integrado | -14.3 LUFS |
| Transientes de áudio (SFX/batidas) | 58 · cortes que caem num pico: 6 (67%) |
| Fala | 91 palavras · 2.46 pal/s · fala em 89% do tempo · idioma en |

**Gancho (0–3 s, fala):** A glacier revealed a death scene older than almost anything

Cortes (s): 1.19, 3.00, 5.38, 10.81, 16.12, 20.19, 22.94, 26.81, 31.94

Transientes de áudio (s): 0.03, 0.18, 0.80, 1.02, 1.16, 1.58, 1.93, 2.29, 2.48, 2.95, 4.09, 4.58, 5.33, 6.84, 7.64, 10.07, 11.17, 11.45, 11.87, 12.34, 12.50, 12.65, 13.22, 14.38, 14.97, 15.62, 16.10, 17.48, 17.72, 18.31, 18.45, 18.75, 19.08, 20.15, 20.49, 21.74, 22.02, 22.88, 23.86, 24.10, 24.37, 24.68, 25.28, 25.91, 28.15, 30.21, 30.74, 32.62, 32.89, 33.12, 33.32, 34.38, 34.78, 35.52, 35.80, 36.36, 36.59, 36.91

## Transcrição
- `  0.00s` A glacier revealed a death scene older than almost anything humans had ever investigated.
- `  5.42s` In 1991, hikers discovered a human body emerging from melting ice in the Alps.
- ` 10.92s` Scientists identified him as Bootsy, a man who lived around 3300 BCE.
- ` 16.18s` His body, clothes and tools survived for thousands of years, but an arrow wound revealed a violent
- ` 22.28s` death.
- ` 22.94s` Even today, scientists continue investigating his final hours.
- ` 26.50s` A man frozen in time, carrying secrets from the dawn of civilization.
- ` 31.76s` Editors learn faster inside a real project file.
- ` 34.76s` Grab yours on earnedits.com.

## Análise qualitativa (Claude, 07/11/2026, a partir da folha de contato e da transcrição)
- **Gancho (0–3 s):** a narração começa no frame 0 com a frase-mistério ("A glacier revealed a death scene…").
  Na tela, só 2 palavras grandes ("A GLACIER" / "REVEALED") em extrusão 3D branca com sombra, entrando por
  desfoque/distorção dentro da neblina; o fundo (gelo visto de cima) tem zoom lento. 1º corte em 1,2 s.
- **Ritmo e cortes:** 9 cortes em 37 s (plano médio 3,7 s), mas a câmera NUNCA para: push-in/dolly contínuo em
  cada plano, e as passagens são por neblina, flash de luz (3,0 s) e "câmera atravessando" — quase nenhum corte seco.
  67% dos cortes caem num pico de áudio (whoosh/impacto). Um plano por frase de narração.
- **Tipografia:** sans bold larga/condensada em CAIXA ALTA, branca, extrudada (relevo 3D) com sombra projetada
  e profundidade de campo (o texto fica fora de foco quando a câmera passa). Só palavras-chave na tela
  ("ÖTZI", "CONTINUE", "SECRETS"), centralizadas, nunca a frase inteira. Textos às vezes "gravados" no cenário
  (SECRETS em baixo-relevo na neve).
- **Textura e cor:** paleta fria dessaturada (cinza-azulado/teal) com papéis envelhecidos (mapa, ficha com
  foto) como cartas físicas; grão, partículas de neve/poeira, vinheta forte. Visual de mesa de investigação.
- **Som:** narração grave e calma (-14,3 LUFS no total), trilha atmosférica, ~58 transientes = SFX a cada
  ~0,6 s (whoosh, papel, impactos). Narração ocupa 89% do tempo — não há respiro sem voz.
- **Como foi feito:** After Effects (o próprio vídeo termina vendendo o .AEP). Câmera 3D + camadas 2,5D
  (fotos/papéis recortados em planos de profundidade) + texto extrudado + DOF. Dá para chegar perto no
  Remotion com camadas em profundidade (parallax), `@remotion/three` para o texto extrudado e o kit `pro/`.
- **O que levar para os clientes:**
  1. Gancho com 2 palavras ENORMES centralizadas + narração-mistério no frame 0 (Disalp: "QUEIJO" / "DE VERDADE";
     MF: "FURADEIRA" / "PAROU?") — nas cores/fonte da marca, com o `TituloCinetico` do kit pro.
  2. Câmera sempre em movimento lento (zoom 100→108% por plano) + transições por luz/neblina (`TransicaoLightLeak`)
     no lugar do corte seco; SFX em cada passagem.
  3. Grão + vinheta leves (`GrainOverlay`) como camada separada, e "objetos físicos" com a marca (etiqueta,
     nota fiscal, catálogo) como cartas que entram na tela em vez de caixas de texto chapadas.
