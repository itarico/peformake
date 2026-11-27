# Envato Elements: fontes e animações de texto para legenda (levantamento 27/11/2026)

Escolhidos pelo nome, descrição e dados da página. As prévias em vídeo não foram assistidas: abrir o link e ver antes de baixar.
Licença: registrar o projeto do cliente no download. Fonte: depois de instalar, rodar `legendas.py` com a fonte e conferir `AÇÃO ÁGUA CORAÇÃO PÊSSEGO ÓTIMO` (a página quase nunca diz se tem português).

## 1. Fontes

| Fonte | Tipo | Confirmado na página | Para | Link |
|---|---|---|---|---|
| **Zyravelle** | serifada display alto contraste | Regular + Italic, OTF/TTF (Indotype) | pico de `lm_serif` e `lm_ouro` | https://elements.envato.com/zyravelle-elegant-serif-display-FZ9HTVD |
| **Bralge** | serifada display moderna | só Italic, 20 ligaduras e 64 alternativas | pico serifado com floreio | https://elements.envato.com/bralge-modern-display-serif-font-3LAZKT3 |
| Mirage | serifada alto contraste | 1 estilo (itálico não citado) | título luxo | https://elements.envato.com/mirage-high-contrast-serif-font-N5SYEWE |
| **Mealtone** | script assinatura | 1 estilo; **português listado** (Typebae) | palavra de luxo, `lm_ouro` | https://elements.envato.com/mealtone-signature-script-font-8ZQZ2SC |
| Ellisa Snowly, Fragmentix, Melvio Play | script assinatura | "100+ idiomas" (português não citado pelo nome) | alternativas de script | https://elements.envato.com/ellisa-snowly-signature-script-font-NU6DMJA |
| **Black Pro** | sans geométrica família | vários pesos com itálico; "multilingual" (CreateBigSupply) | pico de `lm_viral` (troca da Poppins Black Italic) | https://elements.envato.com/black-pro-geometric-sans-serif-font-family-9BESDTC |
| Melvick | sans família (12 estilos) | aparece na lista de sans itálicas | apoio e pico, uma família só | https://elements.envato.com/melvick-font-family-QG7VNEA |
| **Rivertone** | condensada bold display | 1 estilo, "multilingual" (Arthatype) | `lm_condensada`, `lm_vermelho` | https://elements.envato.com/rivertone-bold-condensed-display-font-MNKD9RR |
| Colland, Anque | condensada bold display | 1 estilo, idioma não informado | idem | https://elements.envato.com/colland-modern-bold-condensed-display-font-CSPJZ5L |

Da sua busca "Go..." (vistas pela capa, sem página conferida):
- **Gordan**: condensada pesada, cara de pico vermelho (`lm_vermelho`).
- **Gosans Condensed**: condensada limpa (`lm_condensada`).
- **Goruts**: sans arredondada pesada, para food ou varejo.
- **Golane, Gonce, Gormica**: geométricas limpas, para o apoio ou para `lm_apple`.

Evitar para legenda corrida: as brush (Gorock, Gosber), as decorativas (Goblen, Goggle, Gokil) e as pixel ou techno. Ficam para cartela, não para legenda.

## 2. Animações de texto e legenda (templates para Premiere, .mogrt)

A ponte `premiere-pro` usa .mogrt: `invoke_tool add_text_overlay` com `mogrtPath` (até 4 campos de texto: `text`, `text2`, `text3`, `text4`) ou `import_mogrt`. Assim o pacote baixado pode ser aplicado por script, legenda por legenda, a partir do `plano.json`. Testar 1 mogrt antes, porque cada pacote nomeia os campos de um jeito.

| Pacote | Autor | Por que | Link |
|---|---|---|---|
| **Hook & Captions for Social Media - Mogrt** | 142videos | gancho + legenda para Reels, direto no nosso uso | https://elements.envato.com/hook-captions-for-social-media-mogrt-BEQ96TA |
| **Kinetic Text Animation** | YouGn | tipografia cinética (palavra-pico) | https://elements.envato.com/kinetic-text-animation-F88NBQQ |
| **Stretched Titles Animation Pack Vertical** | kalinichev | título esticado vertical, nível Viral | https://elements.envato.com/stretched-titles-animation-pack-vertical-premiere--BB25KS9 |
| **Vertical Text Tools for Premiere Pro** | nitrozme | kit de títulos, tipografia e call-outs para Reels | https://elements.envato.com/vertical-text-tools-for-premiere-pro-titles-typogr-L2VYL5D |
| Shorts Text Animation | MotionTores | texto para Shorts/Reels | https://elements.envato.com/shorts-text-animation-Z4B5YBA |
| Vertical Gradient Typography | starlight_motion | casa com `lm_gradiente` | https://elements.envato.com/vertical-gradient-typography-B8VQHST |
| Big Animated Text Titles | creative9fx | palavra gigante | https://elements.envato.com/big-animated-text-titles-338WZZ2 |
| **Abstract Scribble Animations** | MisterFlashAnimation | rabisco, sublinhado e círculo desenhados (o que o gerador não faz) | https://elements.envato.com/abstract-scribble-animations-premiere-pro-mogrt-VNYCPUE |
| Punctuation Pack Scribble Elements (32) | xFxDesigns | doodles de ênfase (seta, exclamação) | https://elements.envato.com/punctuation-pack-scribble-elements-32-doodle-anima-D8AXUUW |
| Vertical Text Transitions | FlashFXbox | transição entre blocos de texto | https://elements.envato.com/vertical-text-transitions-premiere-pro-mogrt-6MUAPG6 |

Páginas para garimpar mais:
- Legenda animada para Premiere: https://elements.envato.com/video-templates/elements/animated+captions/compatible-with-premiere-pro
- Texto vertical: https://elements.envato.com/video-templates/text+animation+vertical/compatible-with-premiere-pro
- Tipografia cinética: https://elements.envato.com/video-templates/kinetic+typography/compatible-with-premiere-pro

## Ordem sugerida para baixar
1. Zyravelle e Mealtone: sobem `lm_serif` e `lm_ouro` de nível.
2. Black Pro e Rivertone: trocam o pico de `lm_viral` e `lm_condensada`.
3. Hook & Captions, Stretched Titles e Abstract Scribble: cobrem gancho, pico esticado e rabisco à mão.

Guardar em `G:\lucas\_RECURSOS\ENVATO\` (fontes) e `G:\lucas\_RECURSOS\ENVATO\MOGRT\`. Avisar a sessão para instalar, testar acentos e virar preset.
