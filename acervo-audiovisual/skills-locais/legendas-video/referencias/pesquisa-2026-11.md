# Pesquisa: legenda queimada animada em vídeo vertical curto (2025-2026)

Acervo Peformake. Uso: gerar legendas em PNG/MOV via Python (Pillow + ffmpeg) e colocar no Premiere.
Pesquisa feita em 27/11/2026. Quadro de referência: 1080x1920, 30 fps (1 quadro = 33,3 ms).

Convenções deste documento:
- [CONFIRMAR] = não achei fonte que sustente o dado; é recomendação de partida ou dado com fontes em conflito.
- "Fonte" aponta a página onde o dado foi lido. Sites de ferramentas de legenda (Filmscribe, StoryCut, Ascynd etc.) são recriações do estilo, não declarações oficiais dos criadores.
- Nenhum criador (Hormozi, MrBeast, Ali Abdaal) publicou oficialmente a fonte que usa. O que existe é consenso de quem recria o estilo.

---

## Bloco 1. Estilos de legenda em alta

### 1.1 Estilos de criadores (os três de referência)

| Estilo | Visual (fonte, cor, contorno/sombra, caixa) | Palavras por tela | Posição | Quando usar | Fonte |
|---|---|---|---|---|---|
| Hormozi (clássico) | Montserrat Black 900 em caixa alta, branco, contorno preto grosso (Filmscribe usa 9 px e sombra 3 px; corpo 92 px em 1080x1920). Uma palavra-chave por frase em amarelo; verde (#39FF14 ou #A6FF00) é variação; vermelho para erro ou alerta. Contorno tem que ser preto puro, cinza some na compressão. Montserrat Bold (700) não serve: o estilo pede o peso 900. | 2 a 3 palavras, até 2 linhas | Centralizado, logo abaixo do queixo | Negócios, vendas, educação direta, anúncio com fala | https://filmscribe.ai/en/caption-styles/hormozi ; https://ascynd.io/en/blog/hormozi-captions ; https://www.videotto.com/blog/how-to-make-bold-hormozi-style-captions |
| Hormozi (variações de fonte) | Mesmo esquema com Anton, Bebas Neue ou The Bold Font (condensadas, cabem mais letras na largura). Montserrat Black é larga: 3 palavras podem estourar 1080 px. StoryCut tem versões em Montserrat (V1, destaque laranja e emoji) e em Anton (2026 B, D, E). CaptionBolt: Hormozi Glow e Hormozi Pill em Anton. | 1 a 3 | Centro baixo | Quando a frase em português tem palavras longas | https://www.storycut.com/features/hormozi-captions ; https://captionbolt.com/answers/alex-hormozi-caption-font ; https://echowave.io/tools/hormozi-style-captions/ |
| MrBeast | Fonte de quadrinho pesada em caixa alta, branco, contorno preto muito grosso (Filmscribe: 11 px, corpo 96 px), palavras-chave em amarelo e vermelho, "pop" em cada frase, às vezes tremor de tela. Fonte em conflito: Komika Axis (StoryCut, Kapwing, VideoCaptions), Luckiest Guy (Filmscribe), Bangers (comentário no Reddit). Kapwing cita azul #08B0D5 como cor característica. | 1 a 2, até 2 linhas | Centro | Entretenimento, desafio, humor, público jovem, energia alta | https://www.storycut.com/features/mrbeast-captions ; https://filmscribe.ai/en/caption-styles/mrbeast ; https://www.kapwing.com/explore/mr-beast-subtites-template ; https://www.reddit.com/r/MrBeast/comments/18tfutb/mrbeast_font/ |
| Ali Abdaal (clean) | Sem contorno, sem sombra, sem bounce. Filmscribe: Inter Bold 700, 78 px, caixa normal (não maiúscula); a palavra acende quando é dita. CaptionRich: pílula branca com revelação em dois tons (palavra seguinte sai de cinza para preto). Fonte em conflito: Inter (Filmscribe), Montserrat (EditBuddy), manuscrita com destaque amarelo (Choppity). | 4 por linha, até 2 linhas | Centro baixo | Educação calma, produtividade, conteúdo premium, B2B | https://filmscribe.ai/en/caption-styles/ali-abdaal ; https://captionrich.com/features/caption-styles ; https://editbuddy.app/blog/ali-abdaal-style-captions-premiere-pro ; https://www.choppity.com/tools/recreate-video-editing-style/ali-abdaal/ |

### 1.2 Estilos genéricos e presets de apps

| # | Estilo | Visual | Palavras por tela | Posição | Quando usar | Fonte |
|---|---|---|---|---|---|---|
| 1 | Karaokê (preenchimento) | Linha inteira visível; a palavra falada muda de cor ou cresce. Variação "fill": a cor preenche a palavra no ritmo da fala. | 3 a 6 (linha inteira) | Centro baixo | Talking head, música, letra | https://captionrich.com/features/caption-styles ; https://www.captioncraft.studio/guides/caption-styles-for-videos ; https://kino.ai/templates/captions |
| 2 | Caixa na palavra (block highlight / moving pill) | Palavra ativa dentro de um retângulo ou pílula de cor sólida que pula de palavra em palavra. | 3 a 5 | Centro baixo | Reels e TikTok de alta retenção, tutorial | https://captionrich.com/features/caption-styles ; https://kino.ai/templates/captions |
| 3 | Uma palavra por vez (smash / focus) | Uma palavra grande e pesada; Focus usa fundo de vidro sutil. | 1 | Centro | Gancho, punchline, ritmo rápido | https://www.captioncraft.studio/guides/caption-styles-for-videos ; https://captionrich.com/features/caption-styles |
| 4 | Palavra gigante intercalada (Homelander) | Uma palavra domina a tela, palavras de contexto menores acima e abaixo. | 1 grande + 2 a 4 pequenas | Centro | Ênfase em número, nome ou promessa | https://captionrich.com/features/caption-styles |
| 5 | Ênfase por duração (Emphasis) | Tamanho da palavra depende de quanto tempo ela é segurada na fala. | 2 a 4 | Centro | Fala com pausas dramáticas | https://captionrich.com/features/caption-styles |
| 6 | Clean em placa (Simplest / Background) | Texto branco em placa preta sólida, sem animação. | Cerca de 5 por linha | Base da zona segura | Acessibilidade, entrevista, institucional | https://captionrich.com/features/caption-styles ; https://www.captioncraft.studio/guides/caption-styles-for-videos |
| 7 | Emoji junto | Emoji automático ao lado da palavra-chave (StoryCut Hormozi V1). | 2 a 3 | Centro | Lifestyle, humor, público jovem | https://www.storycut.com/features/hormozi-captions ; https://filmscribe.ai/en/caption-styles |
| 8 | 3D extrudada (Chunky Depth / Voltage) | Letras grossas com extrusão 3D e contorno duro; Voltage com borda ciano e brilho elétrico. | 1 por batida | Centro | Hype, games, esporte | https://captionrich.com/features/caption-styles |
| 9 | Bloco com degrau (Block Drop) | Fonte display grossa com degrau deslocado duro e sombra suave. | 2 a 3 | Centro | Varejo, promoção | https://captionrich.com/features/caption-styles |
| 10 | Gradiente | Preenchimento em degradê; CapCut cita fundos em degradê radial. | 2 a 4 | Centro | Beleza, moda, marca colorida | https://kino.ai/templates/captions ; https://www.capcut.com/resource/caption-style |
| 11 | Glow néon (Soft Neon / Neon Hype) | Itálico leve com halo colorido suave (Soft Neon) ou néon ciano com rastro (Neon Hype). | 2 a 4 | Centro | Noite, música, tech, esporte | https://captionrich.com/features/caption-styles ; https://kino.ai/templates/captions |
| 12 | Deep Glow | Caixa alta sans pesada, halos empilhados e zoom contínuo (look do plugin Deep Glow do After Effects). | 1 a 3 | Centro | Trailer, hype, edits | https://captionrich.com/features/caption-styles |
| 13 | Brilho quente (Golden Glow / Inferno) | Dourado com halo difuso; Inferno com chama tremulando em cada palavra. | 2 a 4 | Centro | Luxo, storytelling | https://captionrich.com/features/caption-styles |
| 14 | Sublinhado/marcação desenhada (Doodle) | Legenda branca limpa; marcador à mão (círculo, sublinhado, marca-texto, seta) desenhado sobre a palavra-chave. | 3 a 5 | Centro baixo | Educação, explicação, review | https://captionrich.com/features/caption-styles |
| 15 | Máquina de escrever | Monoespaçada, cursor piscando, textura de papel opcional. | Frase | Centro ou topo | Investigação, dossiê, curiosidade | https://captionrich.com/features/caption-styles |
| 16 | Vidro fosco (Apple Glass / Glass) | Fundo de vidro fosco e texto com gradiente metálico. | 3 a 5 | Centro baixo | Tech, premium | https://captionrich.com/features/caption-styles ; https://kino.ai/templates/captions |
| 17 | Knockout (texto vazado) | Texto transparente que "fura" uma caixa sólida (Dynamic Knockout) ou palavra enorme como janela para o vídeo (Transparent Knockout / See-Through). | 1 a 2 | Centro | Agência, moda, abertura | https://captionrich.com/features/caption-styles |
| 18 | Glitch / cromático | Aberração cromática, fatias deslocadas, brilho interno. | 1 a 3 | Centro | Games, tech, mistério | https://captionrich.com/features/caption-styles |
| 19 | Matriz de pontos (Dot Matrix) | Fonte de painel LED com brilho em container de alto contraste. | 2 a 4 | Topo ou centro | Retrô, placar, dados | https://captionrich.com/features/caption-styles |
| 20 | Recorte de papel (Paper Cut-Out / Paper Ink) | Fontes misturadas, papel rasgado, quadros "posterizados" com tremor (stop motion). | 1 a 3 | Livre | Arte, storytelling, documentário | https://captionrich.com/features/caption-styles ; https://www.captioncraft.studio/guides/caption-styles-for-videos |
| 21 | Serifada editorial (Editorial / Pop Snap) | Serifa em negrito, contorno grosso no Pop Snap; Editorial mais limpo. | 2 a 4 | Centro baixo | Revista, moda, reflexão | https://kino.ai/templates/captions ; https://captionrich.com/features/caption-styles |
| 22 | Contorno só (Outline) | Letra vazada com traço, sem preenchimento. | 1 a 3 | Centro | Destaque secundário, segunda voz | https://kino.ai/templates/captions ; https://www.captioncraft.studio/guides/caption-styles-for-videos |
| 23 | Color Pop rotativo | Branco com contorno fino e sombra suave; uma palavra por linha ganha cor, e a cor muda a cada legenda. | 3 a 5 | Centro | Storytelling longo sem cansar | https://captionrich.com/features/caption-styles |
| 24 | Gancho com bloco (Viral Hook) | Bloco de fundo vibrante, tipografia de impacto, pop agressivo com leve inclinação. | 2 a 4 | Topo da zona segura | Primeiros 3 segundos | https://captionrich.com/features/caption-styles |
| 25 | Texto que flutua rastreado (Motion Tracked) | Texto 3D flutuante que balança e cai com motion blur forte e luz de fundo. | 1 a 3 | Preso a objeto da cena | Estética, lifestyle | https://captionrich.com/features/caption-styles |
| 26 | Respiração (Glow Breath) | Halo suave, fade-in e pulso contínuo. | 3 a 5 | Centro | Storytime calmo, relato | https://captionrich.com/features/caption-styles |

### 1.3 Nomes de presets por app (para comparar ou pedir ao cliente)

| App | Presets citados | Fonte |
|---|---|---|
| Submagic | Sara, Daniel, Dan 2, Hormozi 1 a 5, Dan, Devin, Tayo, Ella, Tracy, Luke, Leila, Joseph, William, Leon, Ali, Beast, Maya, Karl, Iman. A API aceita `templateName` (ex.: "Hormozi 2"). | https://care.submagic.co/en/article/what-are-themes-and-themes-categories-1pv8wvz/ ; https://docs.submagic.co/api-reference/templates |
| Captions.ai | Million, Cove, Energy, M81, Arion Pink, Quintessence, Bellatrix, Prism, Freshly, Thuban, Mars, Runway, Grace, Copernicus, Aldebaran, Nova, Alycone Blue, Travel, Andromeda, Cassiopeia; destaque: Minima, Flair, Dimidium, Garnet, Drive, Helios, Magazine, Eclipse, Hustle, Medusa, Script. Filtros: Viral, Chaotic, Attention, Active, Hype, Simple, Retro. | https://captions.ai/help/web/captions/choosing-a-template |
| Opus Clip | "Deep Diver" citado como estilo preferido em post do LinkedIn. Lista completa dos presets: [CONFIRMAR]. | https://www.linkedin.com/posts/ruben-hassid_how-to-add-captions-to-your-video-with-ai-activity-7358451744151953408-Wr_A |
| ZapCap | "26+ templates personalizáveis"; nomes não listados na página. [CONFIRMAR] | https://zapcap.ai/ |
| CapCut | Categorias "Glow", "Highlight", "Aesthetic"; artigo de 2025 cita estilos com Lora em azul sobre fundo preto radial. | https://www.capcut.com/resource/caption-style |
| CaptionCraft | Classic, Elegant, Thin & Bold, Background, Highlight, Box, Push, Action, Glow, Karaoke, Prompter, Smash, Ogre, Outline, Paper Ink, Storytelling. | https://www.captioncraft.studio/guides/caption-styles-for-videos |
| Veed | Não pesquisado nesta rodada. [CONFIRMAR] | |
| Legendas Master (Premiere) | Não achei página pública do pacote com esse nome. Achei plugins equivalentes: Premiere Copilot Smart Captions, AutoCut AutoCaptions, Caption Flow. [CONFIRMAR] | https://www.premierecopilot.com/en/smart-captions ; https://www.autocut.com/en/autocaptions/ ; https://www.instagram.com/reel/DW1JSuIEeHG/?hl=en |

---

## Bloco 2. Animações de entrada/saída e velocidade

### 2.1 Curvas de referência (valores exatos)

Valores CSS tirados do código-fonte do easings.net (arquivo `src/easings.yml`). Back, Elastic e Bounce usam as constantes do arquivo `easingsFunctions.ts`: c1 = 1.70158, c2 = c1 x 1.525, c3 = c1 + 1, c4 = 2π/3, c5 = 2π/4.5; bounce n1 = 7.5625, d1 = 2.75. Fonte: https://github.com/ai/easings.net (src/easings.yml e src/easings/easingsFunctions.ts) e https://easings.net/

| Curva | cubic-bezier | Sensação |
|---|---|---|
| easeOutSine | (0.61, 1, 0.88, 1) | Suave, discreta |
| easeOutQuad | (0.5, 1, 0.89, 1) | Neutra |
| easeOutCubic | (0.33, 1, 0.68, 1) | Uso geral de entrada |
| easeOutQuart | (0.25, 1, 0.5, 1) | Entrada firme |
| easeOutQuint | (0.22, 1, 0.36, 1) | Entrada rápida, para macio |
| easeOutExpo | (0.16, 1, 0.3, 1) | Chega quase instantânea, frena longo |
| easeOutCirc | (0, 0.55, 0.45, 1) | Sensação de massa |
| easeOutBack | (0.34, 1.56, 0.64, 1) | Passa do alvo e volta (overshoot) |
| easeInBack | (0.36, 0, 0.66, -0.56) | Recua antes de sair |
| easeInOutBack | (0.68, -0.6, 0.32, 1.6) | Expressiva nas duas pontas |
| easeInCubic | (0.32, 0, 0.67, 0) | Saída |
| easeInOutCubic | (0.65, 0, 0.35, 1) | Movimento que fica na tela |
| easeOutElastic / easeOutBounce | sem cubic-bezier (função) | Brinquedo, exagero |

Material Design 3 (tokens): standard (0.2, 0, 0, 1); emphasized decelerate, para entrada, (0.05, 0.7, 0.1, 1); emphasized accelerate, para saída, (0.3, 0, 0.8, 0.15); durações short 50 a 200 ms, medium 250 a 400 ms, long 450 a 600 ms. Regra do resumo: saída com cerca de metade da duração da entrada. Fontes: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs ; https://www.unfairly.ai/steal/google-material-motion

GSAP: elastic.out(1, 0.3) para exagero de brinquedo; back.out para gesto de marca; regra: ease-out na entrada, ease-in na saída, ease-in-out no movimento longo, linear no que é mecânico. Fonte: https://nonsense-that-works-despite-all-known-laws-of-logic.mango-media.eu/en/blog/the-science-of-easing-in-motion-design

Mola (spring) do Remotion, padrão: mass 1, damping 10, stiffness 100, overshootClamping false; aumentar damping tira o quique (damping 200 = sem quique). Fonte: https://www.remotion.dev/docs/spring

Conversão: a 30 fps, 200 ms = 6 quadros; 220 ms = 6,6 quadros (arredondar para 7); 300 ms = 9; 400 ms = 12; 500 ms = 15.

### 2.2 Catálogo de animações

Legenda das colunas: "Duração" em quadros a 30 fps. Quando a fonte só traz a curva, o número é marcado [CONFIRMAR] e vale como ponto de partida para teste.

| # | Animação | Duração (30 fps) | Easing | Valores | Stagger | Quando usar | Fonte |
|---|---|---|---|---|---|---|---|
| 1 | Pop (escala com overshoot) | 6 a 8 quadros | easeOutBack ou mola | Escala 80% (q0), 110% (q4), 100% (q8). Filmscribe: pop de 200 ms (Hormozi) e 220 ms (MrBeast). | Por bloco de 2 a 3 palavras, não por palavra | Padrão Hormozi/MrBeast | https://kreateflo.com/blog/using-bounce-and-pulse-animations-to-highlight-key-video-words ; https://filmscribe.ai/en/caption-styles/hormozi |
| 2 | Bounce (quique) | 15 a 25 quadros no total | easeOutBounce ou mola com damping baixo | Overshoot cerca de 110%, amortece até 100%. 40 a 50 quadros fica "boiando" (erro citado). | Só palavra-chave | Humor, infantil, varejo | https://kreateflo.com/blog/using-bounce-and-pulse-animations-to-highlight-key-video-words ; https://easings.net/ |
| 3 | Pulse (pulso de ênfase) | 6 a 12 quadros | easeOutBack (ida), easeInOutCubic (volta) | 100% para 115% a 120% e volta a 100%; pico do pulso cravado no transiente da sílaba tônica (P, T, K, B). | Só substantivo, verbo de ação, número | Palavra que carrega o sentido | https://kreateflo.com/blog/using-bounce-and-pulse-animations-to-highlight-key-video-words |
| 4 | Fade (opacidade) | 3 a 5 quadros | linear ou easeOutQuad | 0% para 100% | 0 a 2 quadros | Estilo clean, Ali Abdaal | https://kreateflo.com/blog/using-bounce-and-pulse-animations-to-highlight-key-video-words ; https://filmscribe.ai/en/caption-styles/ali-abdaal |
| 5 | Slide up (sobe e assenta) | 6 a 9 quadros [CONFIRMAR] | easeOutCubic ou emphasized decelerate | Deslocamento 20 a 40 px + fade [CONFIRMAR] | 2 quadros por palavra [CONFIRMAR] | Storytelling, educação | https://m3.material.io/styles/motion/easing-and-duration/tokens-specs |
| 6 | Slide down | 6 a 9 quadros [CONFIRMAR] | easeOutCubic | -20 a -40 px + fade [CONFIRMAR] | 2 quadros | Título caindo, contagem | https://easings.net/ |
| 7 | Slide lateral (Slide Snap) | 6 a 10 quadros [CONFIRMAR] | easeOutExpo | Entra da esquerda em opacidade baixa e "encaixa" | 2 a 3 quadros | Storytelling | https://captionrich.com/features/caption-styles |
| 8 | Blur Slide (desliza com motion blur) | 5 a 8 quadros [CONFIRMAR] | easeOutExpo | Deslocamento horizontal curto com desfoque de movimento | Palavra a palavra | Hype, palavra de impacto em néon | https://captionrich.com/features/caption-styles |
| 9 | Blur-in (desfoque para foco) | 6 a 10 quadros [CONFIRMAR] | easeOutQuart | Desfoque gaussiano de 10 a 20 px para 0, com fade [CONFIRMAR] | 2 quadros | Premium, cinematográfico | https://easings.net/ |
| 10 | Typewriter (máquina de escrever) | 1 a 2 quadros por letra [CONFIRMAR] | steps / linear | Letras aparecem em degrau, cursor piscando | Por letra | Dossiê, investigação | https://captionrich.com/features/caption-styles ; https://filmit.io/blog/eye-catching-text-animation-examples-for-creators/ |
| 11 | Letra a letra (char reveal) | 4 a 8 quadros por letra, sobrepostas [CONFIRMAR] | easeOutCubic | Cada letra sobe e aparece com halo branco suave | 1 quadro por letra [CONFIRMAR] | Título, abertura | https://captionrich.com/features/caption-styles ; https://trydemotion.com/blog/kinetic-typography-4 |
| 12 | Palavra a palavra | Entrada de cada palavra no seu timestamp | easeOutBack (pop) ou easeOutCubic (fade) | Precisa de timestamp por palavra (Whisper com word timestamps) | Definido pela fala, não fixo | Padrão de Reels/TikTok | https://voicecreator.pro/blog/word-by-word-animated-captions |
| 13 | Karaokê highlight | Troca de cor em 1 a 3 quadros [CONFIRMAR] | linear (troca seca) ou easeOutQuad | Palavra falada muda de cor e pode crescer (Kinetic: brilha e cresce) | Pela fala | Talking head | https://captionrich.com/features/caption-styles ; https://www.captioncraft.studio/guides/caption-styles-for-videos |
| 14 | Caixa de destaque crescendo | 4 a 6 quadros [CONFIRMAR] | easeOutQuint | Retângulo de fundo cresce de largura 0 até a palavra; Dynamic Knockout redimensiona a caixa a cada palavra | Pela fala | Block highlight, pílula | https://captionrich.com/features/caption-styles |
| 15 | Sublinhado desenhando | 6 a 10 quadros [CONFIRMAR] | easeInOutCubic | Traço cresce da esquerda para a direita sob a palavra | Só palavra-chave | Educação, Doodle, Prestige | https://captionrich.com/features/caption-styles |
| 16 | Shake / tremor | 4 a 8 quadros [CONFIRMAR] | aleatório (wiggle) amortecido | Deslocamento de 4 a 12 px, rotação 1 a 3 graus [CONFIRMAR] | Só no clímax | Estilo Beast (screen shake) | https://captionrich.com/features/caption-styles |
| 17 | Jiggle (pop e treme leve) | Pop de 6 quadros + tremor contínuo [CONFIRMAR] | easeOutBack + seno | Fonte arredondada com contorno grosso | Por bloco | Humor, infantil | https://captionrich.com/features/caption-styles |
| 18 | Wave (onda) | Ciclo de 20 a 30 quadros [CONFIRMAR] | easeInOutSine | Deslocamento vertical senoidal de 6 a 12 px por letra [CONFIRMAR] | Fase de 2 quadros por letra [CONFIRMAR] | Música, festa | https://easings.net/ |
| 19 | Rotate-in | 6 a 9 quadros [CONFIRMAR] | easeOutBack | Rotação de -8 a -15 graus até 0 + pop [CONFIRMAR]; Viral Hook usa "leve inclinação" | Por bloco | Gancho | https://captionrich.com/features/caption-styles |
| 20 | Flip 3D | 8 a 12 quadros [CONFIRMAR] | easeOutCubic | Rotação em X de 90 graus para 0 com perspectiva (Prestige: revelação de caracteres girando) | 1 a 2 quadros por letra | Premium, After Effects | https://captionrich.com/features/caption-styles |
| 21 | Elastic | 15 a 24 quadros [CONFIRMAR] | easeOutElastic ou elastic.out(1, 0.3) | Escala 0 para 100% com várias oscilações | Só palavra-chave | Brinquedo, exagero deliberado | https://easings.net/ ; https://nonsense-that-works-despite-all-known-laws-of-logic.mango-media.eu/en/blog/the-science-of-easing-in-motion-design |
| 22 | Squash and stretch | 6 a 10 quadros [CONFIRMAR] | easeOutBack | Escala X 120% / Y 80% no impacto, volta a 100/100 mantendo volume [CONFIRMAR] | Só palavra-chave | Estilo cartoon, MrBeast | https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation |
| 23 | Glitch | 3 a 6 quadros [CONFIRMAR] | degraus (sem curva) | Aberração cromática RGB de 4 a 10 px e fatias deslocadas [CONFIRMAR] | Irregular | Games, tech, mistério | https://captionrich.com/features/caption-styles |
| 24 | Zoom punch | 3 a 5 quadros [CONFIRMAR] | easeOutExpo | Escala 130% a 150% para 100% de uma vez [CONFIRMAR]; Fluid Expansion: palavra "estoura" do próprio centro | Uma palavra | Batida, número forte | https://captionrich.com/features/caption-styles |
| 25 | Stagger por palavra | Cada palavra 3 a 6 quadros após a anterior [CONFIRMAR] | Mesma curva para todas | Flow: entradas escalonadas com hierarquia de escala | 2 a 4 quadros [CONFIRMAR] | Frase de impacto escrita na tela | https://captionrich.com/features/caption-styles |
| 26 | Stagger por letra | 1 quadro por letra [CONFIRMAR] | easeOutCubic | Range Selector com offset no After Effects | 1 quadro | Títulos curtos | https://trydemotion.com/blog/kinetic-typography-4 ; https://helpx.adobe.com/after-effects/using/animating-text.html |
| 27 | Mask reveal / wipe | 6 a 10 quadros [CONFIRMAR] | easeOutQuart | Mask Slide: cada letra sobe de trás de uma linha de corte invisível (look keynote Apple / Linear) | 1 a 2 quadros por letra | Institucional, premium | https://captionrich.com/features/caption-styles |
| 28 | Tracking (espaçamento abrindo) | 15 a 30 quadros [CONFIRMAR] | easeOutQuart | Espaçamento de letras cresce (ex.: 0 para 200 em unidades de tracking) junto com fade [CONFIRMAR] | Não | Título cinematográfico, abertura | https://trydemotion.com/blog/kinetic-typography-4 |
| 29 | Block Drop (levanta e assenta) | 6 a 9 quadros [CONFIRMAR] | easeOutBack | Sobe e escala até o lugar por segmento | Por segmento | Varejo | https://captionrich.com/features/caption-styles |
| 30 | Saída (qualquer) | Cerca de metade da entrada (3 a 4 quadros para entrada de 6 a 8) | easeIn (ex.: easeInCubic ou emphasized accelerate) | Corte seco também vale quando a próxima legenda entra no mesmo quadro | Não | Sempre | https://www.unfairly.ai/steal/google-material-motion ; https://m3.material.io/styles/motion/easing-and-duration |

### 2.3 Regras de ritmo e sincronia

| Regra | Valor | Fonte |
|---|---|---|
| Velocidade de leitura pt-BR (legenda convencional) | Até 17 caracteres por segundo para adulto, 13 para infantil (Netflix pt-BR). Guia antigo da Netflix cita 200 palavras por minuto para 17 cps. | https://partnerhelp.netflixstudios.com/hc/en-us/articles/215600497-Portuguese-Brazil-Timed-Text-Style-Guide ; https://www.scribd.com/document/590832898/MANUAL-DE-LEGENDAGEM-NETFLIX |
| Duração mínima de uma legenda na tela | 5/6 de segundo (25 quadros a 30 fps); máxima 7 s | https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements |
| Intervalo entre legendas | Mínimo de 2 quadros entre eventos, em qualquer taxa de quadros | https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines |
| Aplicação ao palavra a palavra | Conta derivada: 17 cps com palavra média de 5 a 6 letras + espaço dá cerca de 2,5 a 3 palavras por segundo. Bloco de 2 a 3 palavras deve ficar cerca de 1 s. O estilo palavra a palavra quebra a regra de 5/6 s por evento de propósito; segure ao menos o bloco inteiro 25 quadros. [CONFIRMAR em teste] | Derivado das fontes Netflix acima |
| Duração da animação de entrada | 15 a 25 quadros para o movimento completo; fala rápida (cerca de 180 palavras por minuto) pede entrada e saída abaixo de 12 quadros | https://kreateflo.com/blog/using-bounce-and-pulse-animations-to-highlight-key-video-words |
| Pico no transiente | O pico do overshoot cai no ataque da consoante tônica do áudio, não só no movimento da boca | https://kreateflo.com/blog/using-bounce-and-pulse-animations-to-highlight-key-video-words |
| Entrar 1 a 2 quadros antes da fala | Não achei fonte. Raciocínio: o pop leva 2 a 4 quadros até ficar legível, então antecipar 1 a 2 quadros faz o pico coincidir com a sílaba. [CONFIRMAR em teste de 60 s] | Sem fonte |
| Não animar tudo | Conectivos ("e", "o", "em", "com") ficam estáticos ou apagados; pulso só em substantivo, verbo de ação e número. No máximo 1 ou 2 linhas na tela. | https://kreateflo.com/blog/using-bounce-and-pulse-animations-to-highlight-key-video-words |
| Pop usado em tudo perde o sinal | Guarde o pop para linhas que merecem ênfase | https://shortzly.com/blog/animated-captions-style-guide-short-form-video |
| Uma cor de destaque por legenda | No máximo uma palavra colorida por bloco no estilo Hormozi | https://www.videotto.com/blog/how-to-make-bold-hormozi-style-captions ; https://ascynd.io/en/blog/hormozi-captions |
| Zona segura Reels 1080x1920 | Fora do topo 14% (269 px), da base 35% (672 px) e das laterais 6% (65 px). Anúncio com aviso: base 40% (768 px). Área útil cerca de 950 x 979 px. | https://www.socialync.io/tools/safe-zones/instagram-reels ; https://www.captioncraft.studio/tools/instagram-reels-safe-zone |
| Entrada e saída | Ease-out na entrada, ease-in na saída; saída com metade da duração; durações em múltiplos de 50 ms | https://www.unfairly.ai/steal/google-material-motion ; https://nonsense-that-works-despite-all-known-laws-of-logic.mango-media.eu/en/blog/the-science-of-easing-in-motion-design |
| Movimento acessível | Respeitar movimento reduzido trocando deslocamento por fade curto (regra de interface; em vídeo queimado vale para versões acessíveis) | https://www.unfairly.ai/steal/google-material-motion |

### 2.4 Notas para o gerador em Python (Pillow + ffmpeg)

- Curvas: implementar as funções do easings.net direto (são poucas linhas; constantes acima). Para cubic-bezier, resolver t por Newton ou bisseção.
- Pop recomendado de partida para o padrão Hormozi: 7 quadros, escala 0,80 a 1,00 com easeOutBack (pico cerca de 1,10 por volta do quadro 4), opacidade 0 a 1 nos primeiros 3 quadros. Bate com o par Kreateflo (80/110/100 em 8 quadros) e Filmscribe (200 ms). [CONFIRMAR em teste]
- Contorno grosso no Pillow: `stroke_width` e `stroke_fill` em `ImageDraw.text`; 9 a 11 px em corpo 92 a 96 px reproduz Hormozi e MrBeast (valores do Filmscribe).
- Para MOV com alfa: ffmpeg com `-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le` ou `qtrle`. [CONFIRMAR flags na versão instalada]

---

## Bloco 3. Fontes para legenda

Pesos, itálico e subconjuntos dos itens Google Fonts lidos do arquivo `METADATA.pb` de cada família no repositório oficial https://github.com/google/fonts (pasta `ofl/<nome>` ou `apache/<nome>`). Licença OFL e Apache 2.0 permitem uso comercial, inclusive em vídeo. Acentos pt-BR: o subconjunto "latin" do Google Fonts cobre Latin-1 (á, à, â, ã, é, ê, í, ó, ô, õ, ú, ç); todas as famílias Google abaixo têm "latin". Mesmo assim, teste a frase "AÇÃO ÁGUA CORAÇÃO PÊSSEGO ÓTIMO" antes de fechar o padrão, porque fontes display antigas podem ter acento mal desenhado.

Colunas: Pesos (o que existe; "var" = variável com faixa); Itálico (sim/não, segundo o METADATA); Uso em legenda; Quem usa (só onde há fonte).

### 3.1 Gratuitas Google Fonts (OFL ou Apache)

| # | Fonte | Categoria | Pesos | Licença / onde baixar | Itálico | pt-BR | Estilo de legenda | Quem usa (fonte) |
|---|---|---|---|---|---|---|---|---|
| 1 | Montserrat | Sans geométrica larga | var 100 a 900 (usar 800/900) | OFL, https://fonts.google.com/specimen/Montserrat | Sim | Sim (latin, latin-ext) | Hormozi clássico, pop | Recriações Hormozi (Filmscribe, Ascynd, StoryCut V1, CaptionBolt) |
| 2 | Anton | Sans condensada pesada | 400 (único, já é pesado) | OFL, https://fonts.google.com/specimen/Anton | Não | Sim | Hormozi condensado, frases longas | StoryCut Hormozi 2026, CaptionBolt Glow/Pill, Submagic segundo StoryCut |
| 3 | Bebas Neue | Display condensada só maiúsculas | 400 | OFL, https://fonts.google.com/specimen/Bebas+Neue | Não | Sim | Títulos, palavra gigante | Citada como alternativa Hormozi (Ascynd, EchoWave) |
| 4 | Oswald | Sans condensada | var 200 a 700 | OFL, https://fonts.google.com/specimen/Oswald | Não | Sim | Notícia, esporte | CaptionBolt renderiza Hormozi em Oswald |
| 5 | Archivo Black | Sans grotesca pesada | 400 (Black) | OFL, https://fonts.google.com/specimen/Archivo+Black | Não | Sim | Impacto, varejo | [CONFIRMAR] |
| 6 | Poppins | Sans geométrica | 100 a 900 estáticos | OFL, https://fonts.google.com/specimen/Poppins | Sim (9) | Sim | Clean, karaokê, caixa na palavra | [CONFIRMAR] |
| 7 | Inter | Sans neo-grotesca | var 100 a 900 (eixo óptico 14 a 32) | OFL, https://fonts.google.com/specimen/Inter | Sim | Sim | Ali Abdaal, clean, B2B | Recriação Ali Abdaal (Filmscribe: Inter Bold 700) |
| 8 | Luckiest Guy | Display cartoon | 400 | Apache 2.0, https://fonts.google.com/specimen/Luckiest+Guy | Não | Só "latin" (testar acentos) | MrBeast, humor | Recriação MrBeast (Filmscribe) |
| 9 | Bangers | Display quadrinho | 400 | OFL, https://fonts.google.com/specimen/Bangers | Não | Sim | MrBeast, cartoon | Citada como "fonte MrBeast" em comentário Reddit |
| 10 | Lilita One | Display arredondada pesada | 400 | OFL, https://fonts.google.com/specimen/Lilita+One | Não | Sim | Jiggle, infantil, games | [CONFIRMAR] |
| 11 | Titan One | Display arredondada | 400 | OFL, https://fonts.google.com/specimen/Titan+One | Não | Sim | Cartoon, promoção | [CONFIRMAR] |
| 12 | Rubik | Sans arredondada | var 300 a 900 | OFL, https://fonts.google.com/specimen/Rubik | Sim | Sim | Amigável, karaokê | [CONFIRMAR] |
| 13 | Space Grotesk | Grotesca com traço tech | var 300 a 700 | OFL, https://fonts.google.com/specimen/Space+Grotesk | Não | Sim | Tech, startup | [CONFIRMAR] |
| 14 | DM Serif Display | Serifa display | 400 | OFL, https://fonts.google.com/specimen/DM+Serif+Display | Sim | Sim | Editorial, Pop Snap serifado | [CONFIRMAR] |
| 15 | Playfair Display | Serifa de alto contraste | var 400 a 900 | OFL, https://fonts.google.com/specimen/Playfair+Display | Sim | Sim | Luxo, moda, reflexão | [CONFIRMAR] |
| 16 | Instrument Serif | Serifa condensada elegante | 400 | OFL, https://fonts.google.com/specimen/Instrument+Serif | Sim | Sim | Editorial, see-through, citação | [CONFIRMAR] |
| 17 | Fraunces | Serifa "soft" variável | var 100 a 900 (eixos SOFT, WONK, opsz) | OFL, https://fonts.google.com/specimen/Fraunces | Sim | Sim | Storytelling, marca acolhedora | [CONFIRMAR] |
| 18 | Caveat | Manuscrita | var 400 a 700 | OFL, https://fonts.google.com/specimen/Caveat | Não | Sim | Nota à mão, Doodle, palavra extra | [CONFIRMAR] |
| 19 | Permanent Marker | Marcador | 400 | Apache 2.0, https://fonts.google.com/specimen/Permanent+Marker | Não | Só "latin" (testar acentos) | Anotação, palavra-chave rabiscada | [CONFIRMAR] |
| 20 | JetBrains Mono | Mono | var 100 a 800 | OFL, https://fonts.google.com/specimen/JetBrains+Mono | Sim | Sim | Typewriter, dados, tech | [CONFIRMAR] |
| 21 | IBM Plex Mono | Mono | 100 a 700 estáticos | OFL, https://fonts.google.com/specimen/IBM+Plex+Mono | Sim (7) | Sim | Typewriter, dossiê | [CONFIRMAR] |
| 22 | Space Mono | Mono display | 400, 700 | OFL, https://fonts.google.com/specimen/Space+Mono | Sim | Sim | Retrô, Dot Matrix aproximado | [CONFIRMAR] |
| 23 | Barlow Condensed | Sans condensada | 100 a 900 estáticos | OFL, https://fonts.google.com/specimen/Barlow+Condensed | Sim (9) | Sim | Esporte, frase longa em maiúscula | [CONFIRMAR] |
| 24 | League Spartan | Sans geométrica pesada | var 100 a 900 | OFL, https://fonts.google.com/specimen/League+Spartan | Não | Sim | Alternativa à Montserrat, mais estreita | [CONFIRMAR] |
| 25 | League Gothic | Sans condensada estreita | 400 (eixo largura 75 a 100) | OFL, https://fonts.google.com/specimen/League+Gothic | Não | Sim | Palavra gigante, cartaz | [CONFIRMAR] |
| 26 | Unbounded | Display larga | var 200 a 900 | OFL, https://fonts.google.com/specimen/Unbounded | Não | Sim | Hype, 3D extrudado | [CONFIRMAR] |
| 27 | Bricolage Grotesque | Grotesca expressiva | var 200 a 800 (eixos largura e opsz) | OFL, https://fonts.google.com/specimen/Bricolage+Grotesque | Não | Sim | Marca jovem, editorial | [CONFIRMAR] |
| 28 | Plus Jakarta Sans | Sans geométrica moderna | var 200 a 800 | OFL, https://fonts.google.com/specimen/Plus+Jakarta+Sans | Sim | Sim | Clean premium | [CONFIRMAR] |
| 29 | Figtree | Sans geométrica amigável | var 300 a 900 | OFL, https://fonts.google.com/specimen/Figtree | Sim | Sim | Clean, karaokê | [CONFIRMAR] |
| 30 | Outfit | Sans geométrica | var 100 a 900 | OFL, https://fonts.google.com/specimen/Outfit (também listada no Fontshare) | Não | Sim | Clean, caixa na palavra | [CONFIRMAR] |
| 31 | DM Sans | Sans geométrica | var 100 a 1000 (opsz 9 a 40) | OFL, https://fonts.google.com/specimen/DM+Sans | Sim | Sim | Clean, institucional | [CONFIRMAR] |
| 32 | Manrope | Sans moderna | var 200 a 800 | OFL, https://fonts.google.com/specimen/Manrope | Não | Sim | Tech, finanças | [CONFIRMAR] |
| 33 | Sora | Sans geométrica | var 100 a 800 | OFL, https://fonts.google.com/specimen/Sora | Não | Sim | Tech, cripto | [CONFIRMAR] |
| 34 | Roboto Condensed | Sans condensada | var 100 a 900 | OFL, https://fonts.google.com/specimen/Roboto+Condensed | Sim | Sim | Notícia, legenda longa | [CONFIRMAR] |
| 35 | Kanit | Sans pesada levemente quadrada | 100 a 900 estáticos | OFL, https://fonts.google.com/specimen/Kanit | Sim (9) | Sim | Games, esporte, itálico de impacto | [CONFIRMAR] |
| 36 | Fredoka | Arredondada | var 300 a 700 (eixo largura) | OFL, https://fonts.google.com/specimen/Fredoka | Não | Sim | Infantil, fofo | [CONFIRMAR] |
| 37 | Nunito | Sans arredondada | var 200 a 1000 | OFL, https://fonts.google.com/specimen/Nunito | Sim | Sim | Saúde, educação leve | [CONFIRMAR] |
| 38 | Passion One | Display pesada | 400, 700, 900 | OFL, https://fonts.google.com/specimen/Passion+One | Não | Sim | Promoção, varejo | [CONFIRMAR] |
| 39 | Bowlby One SC | Display ultrapesada versalete | 400 | OFL, https://fonts.google.com/specimen/Bowlby+One+SC | Não | Sim | Impacto extremo | [CONFIRMAR] |
| 40 | Russo One | Display tech | 400 | OFL, https://fonts.google.com/specimen/Russo+One | Não | Sim | Games, automotivo | [CONFIRMAR] |
| 41 | Teko | Condensada tech | var 300 a 700 | OFL, https://fonts.google.com/specimen/Teko | Não | Sim | Esporte, placar | [CONFIRMAR] |

### 3.2 Gratuitas fora do Google (Fontshare, DaFont)

| # | Fonte | Categoria | Pesos | Licença / onde baixar | Itálico | pt-BR | Estilo de legenda | Quem usa (fonte) |
|---|---|---|---|---|---|---|---|---|
| 42 | Satoshi | Sans geométrica | Light a Black (variável) | ITF Free Font License: uso pessoal e comercial, sem atribuição. https://www.fontshare.com/fonts/satoshi | Sim | [CONFIRMAR] | Clean premium, Ali Abdaal | Família mais vista do Fontshare (FontAlternatives) |
| 43 | General Sans | Sans neo-grotesca | Extralight a Bold (variável, 14 estilos) | ITF Free Font License (mesma do Fontshare) [CONFIRMAR página da família]. https://www.fontshare.com/fonts/general-sans | Sim | [CONFIRMAR] | Clean, institucional | [CONFIRMAR] |
| 44 | Clash Display | Display grotesca | Extralight a Bold (variável, 7 estilos) | ITF Free Font License [CONFIRMAR página da família]. https://www.fontshare.com/fonts/clash-display | Não | [CONFIRMAR] | Palavra gigante, título | [CONFIRMAR] |
| 45 | Cabinet Grotesk | Grotesca display | Thin a Black (variável, 9 estilos) | ITF Free Font License [CONFIRMAR página da família]. https://www.fontshare.com/fonts/cabinet-grotesk | Não | [CONFIRMAR] | Marca jovem, editorial | [CONFIRMAR] |
| 46 | The Bold Font | Sans ultrapesada | Um peso; versão grátis só com maiúsculas (121 glifos); versão PRO tem minúsculas e mais glifos | DaFont marca "100% Free", autor Sven Pels. https://www.dafont.com/the-bold-font.font ; PRO em https://www.the-bold-font.com | Não | [CONFIRMAR] (página não diz se tem acentos; testar Ç e Ã) | Hormozi | Citada como fonte Hormozi (EchoWave, StoryCut, Reddit r/SmallYoutubers) |
| 47 | Komika Axis | Display quadrinho inclinada | Um peso | DaFont: "Free for personal use". Uso comercial exige licença do autor. [CONFIRMAR custo/autor] https://www.dafont.com/komika-axis.font | Já é inclinada | [CONFIRMAR] | MrBeast | Recriação MrBeast (StoryCut, Kapwing, VideoCaptions) |
| 48 | Gilroy (Light e ExtraBold) | Sans geométrica | Só Light e ExtraBold grátis; família completa paga | Conflito: o site do autor diz "dois fontes grátis para uso pessoal e comercial" (https://www.tinkov.info/gilroy.html) e FontsArena confirma; outros sites dizem só pessoal. Vale o site do autor, mas guarde o print. | Não nas grátis | Latin Extended (FontsArena) | Clean premium | [CONFIRMAR] |

### 3.3 Pagas (referência)

| # | Fonte | Categoria | Licença / onde comprar | Itálico | Estilo de legenda | Observação |
|---|---|---|---|---|---|---|
| 49 | Proxima Nova | Sans geométrica | Paga, Mark Simonson Studio, a partir de US$ 39,99 por estilo; família de 16 estilos a partir de US$ 359,99. https://www.marksimonson.com/fonts/view/proxima-nova/ ; https://www.marksimonson.com/licensing/ | Sim | Clean, institucional | O estúdio cobra uso sem licença (relatos em https://mattmazur.com/2023/08/18/dont-self-host-unlicensed-proxima-nova-fonts/). Disponibilidade no Adobe Fonts para quem tem Creative Cloud: [CONFIRMAR] |
| 50 | TT Commons | Sans geométrica | Paga, TypeType. Preço e licença de vídeo: [CONFIRMAR] em https://typetype.org | [CONFIRMAR] | Clean | Não pesquisado a fundo |
| 51 | Gilroy (família completa) | Sans geométrica | Paga, Radomir Tinkov; um site cita cerca de US$ 180 pela família [CONFIRMAR] | Sim | Clean | https://fontchase.com/gilroy-font-family-1765894016 |

### 3.4 Combinações sugeridas por estilo (derivadas das tabelas acima)

| Estilo | Fonte gratuita principal | Alternativa | Observação |
|---|---|---|---|
| Hormozi | Montserrat 900 | Anton (frase longa) | Montserrat Bold 700 não reproduz o estilo |
| MrBeast | Luckiest Guy (Apache) ou Bangers (OFL) | Komika Axis só com licença comercial | Testar acentos na Luckiest Guy |
| Ali Abdaal | Inter 700 | Satoshi, Plus Jakarta Sans | Sem contorno, caixa normal |
| Palavra gigante | Bebas Neue, League Gothic | Clash Display | Condensada cabe mais |
| Editorial/serifa | Instrument Serif, DM Serif Display | Playfair Display, Fraunces | Contorno fino ou nenhum |
| Typewriter | IBM Plex Mono, JetBrains Mono | Space Mono | |
| Manuscrita de apoio | Caveat | Permanent Marker | Só para palavra extra, nunca para legenda inteira |
| Cartoon arredondado | Lilita One, Titan One | Fredoka | Contorno grosso |

---

## Lacunas desta rodada

- Presets de Veed, Opus Clip e ZapCap por nome: não levantados.
- "Legendas Master" não foi achado como produto público; confirmar com quem usa o nome.
- Antecipar 1 a 2 quadros antes da fala: sem fonte, testar.
- Licença de uso comercial da Komika Axis e acentos de The Bold Font, Komika Axis e das fontes Fontshare: conferir no arquivo da fonte (abrir o glifo Ã e Ç) e no EULA.
- A maioria dos números de deslocamento, rotação e stagger da tabela 2.2 é ponto de partida, não dado medido.
