---
name: capa-thumbnail
description: Gera capa de Reels (9:16) e thumbnail de YouTube (16:9) a partir do melhor quadro do vídeo — escolhe sozinho o quadro mais nítido com rosto e olhos abertos, recorta no rosto e escreve o título da série com o logo do cliente. Use quando o usuário pedir "faz a capa", "thumbnail", "thumb", "capa do reels", "capa dos vídeos", "imagem de capa" ou ao fechar a entrega de uma montagem.
---

# Capa e thumbnail

Script: `video-tools/scripts/capa.py` (via `bash video-tools/bin/vpy`). Usa OpenCV + Pillow (já instalados).

## Gerar
```bash
bash video-tools/bin/vpy video-tools/scripts/capa.py video.mp4 --titulo "Folha de shissô" \
  --serie "Você sabia que a Disalp tem…?" --logo <logo.png> --out <entrega>/CAPAS
```
Saída: `_capa_9x16.jpg`, `_thumb_16x9.jpg` e `_candidatos.jpg` (6 melhores quadros, numerados com o segundo).

1. Abra `_candidatos.jpg` (Read) e confira o quadro escolhido: olhos abertos, boca fechada ou sorrindo, sem borrão.
2. Se outro for melhor, rode de novo com `--em <segundo>`.
3. Abra a capa final (Read) antes de entregar. Título com no máximo ~6 palavras.

## Regras
- Título = gancho do vídeo, não o roteiro inteiro. Série no topo do bloco de texto (`--serie`), na cor da marca (`--cor`).
- Logo e cores: pegue da ficha do cliente/Drive. Sem logo, gere sem e avise.
- Use a mesma `--cor` e o mesmo estilo em todas as capas de uma série (o feed fica padronizado).
- Para capa com recorte da pessoa sobre fundo de cor, combine com `recortar.py fundo` (skill `tratamento-video`).
