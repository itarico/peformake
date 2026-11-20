---
name: motion-remotion
description: Animação e motion graphics em vídeo com Remotion (React) na Performake. Reels 9:16 com legenda animada palavra por palavra, títulos animados, lower thirds (nome/cargo) com fundo transparente para o Premiere, CTAs, vinhetas e criativos em lote a partir de planilha. Use quando o usuário pedir "anima", "motion", "legenda animada", "reels com legenda", "lower third", "vinheta", "abertura", "CTA animado", "criativos em lote", "template de vídeo" ou citar Remotion.
---

# Motion graphics com Remotion

Projeto em `video-tools/remotion/`. Se `node_modules` não existir: `bash video-tools/install.sh`.
Licença: o Remotion é grátis para pessoas físicas e empresas com até 3 funcionários. Acima disso,
a agência precisa da licença de empresa (remotion.pro). Avise isso na primeira vez.

## Composições prontas (`src/Root.tsx`)

| ID | Formato | Props principais |
|---|---|---|
| `Reel` | 1080×1920 | `videoSrc`, `captions`, `startFromSec`, `durationSec`, `logoSrc`, `brand` |
| `LowerThird` | 1920×1080, transparente | `nome`, `cargo`, `brand` |
| `TituloAnimado` | 1080×1920 | `titulo`, `subtitulo`, `brand` |

`brand` = `{primary, secondary, text, highlight, font}` (cores hex). Pergunte as cores da marca do
cliente ou extraia do logo; o padrão fica em `src/brand.ts`.

## Fluxo: Reel com legenda animada

1. Copie o vídeo (já cortado ou o bruto) para `video-tools/remotion/public/`.
2. Gere as legendas: `bash video-tools/bin/vpy video-tools/scripts/transcrever.py public/video.mp4 --out public`
   → `public/video.captions.json`. Se o vídeo veio da decupagem, reaproveite o `.captions.json` dela
   e use `startFromSec` para começar no trecho escolhido (subtraia o início das legendas).
3. Renderize (rode dentro de `video-tools/remotion`):
   ```bash
   npx remotion render src/index.ts Reel out/reel.mp4 \
     --props="$(node -e 'console.log(JSON.stringify({videoSrc:"video.mp4",logoSrc:"logo.png",captions:require("./public/video.captions.json")}))')"
   ```
4. Confira um frame antes de entregar: `ffmpeg -ss 2 -i out/reel.mp4 -frames:v 1 out/check.png` e abra a imagem.

## Lower third transparente (para usar como camada no Premiere)

```bash
npx remotion render src/index.ts LowerThird out/lt.mov --codec=prores --prores-profile=4444 \
  --image-format=png --pixel-format=yuva444p10le --props='{"nome":"Ana Souza","cargo":"CEO • Performake"}'
```

## Criativos em lote

Para N variações (textos, preços, clientes), monte a lista de props a partir da planilha ou Google
Sheets e rode um `npx remotion render` por linha, nomeando cada arquivo de saída. Entregue a pasta no Drive.

## Novas animações

Crie a composição em `src/compositions/`, registre em `src/Root.tsx` e rode `npx tsc -p .` antes de
renderizar. Anime só com `useCurrentFrame()`, `interpolate()` e `spring()` (nunca CSS transitions
ou setTimeout, que não renderizam). Para o studio visual no PC: `npm run studio`.

## Google Flow (Veo)

Clipes gerados no Google Flow entram aqui como `videoSrc`: o usuário baixa do Flow para o Drive,
você traz o arquivo para `public/` e aplica a legenda, o logo e o CTA por cima.
