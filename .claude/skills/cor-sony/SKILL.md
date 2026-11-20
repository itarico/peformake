---
name: cor-sony
description: Correção de cor dos brutos das câmeras Sony (e outras) na Performake. Detecta sozinho se o material é normal (Rec.709), Log (S-Log3, imagem lavada) ou HLG, aplica a LUT certa ou a conversão, e gera prévia antes|depois para aprovação. Use quando o usuário pedir "corrige a cor", "a imagem está lavada", "aplica a LUT", "S-Log", "color", "deixa a cor bonita", "padroniza a cor dos vídeos" ou ao receber brutos de câmera Sony/mirrorless.
---

# Cor dos brutos (Sony)

Script: `video-tools/scripts/corrigir_cor.py` (via `bash video-tools/bin/vpy`). Nunca sobrescreva o bruto.

## 1. Detectar (sempre primeiro)
```bash
bash video-tools/bin/vpy video-tools/scripts/corrigir_cor.py detectar <brutos>/*.MP4
```
- **NORMAL**: já está em Rec.709 (Sony com Picture Profile desligado / S-Cinetone). Não precisa LUT.
  Ex.: brutos da Disalp de 07/11/2026 (`color_transfer=iec61966-2-4`, contraste normal).
- **LOG**: imagem lavada (pretos altos, pouca saturação). Precisa da LUT de conversão.
  Peça ao usuário a LUT oficial da Sony "S-Log3/S-Gamut3.Cine → 709" (.cube) ou a LUT da agência.
- **HLG**: convertido para 709 automaticamente.

## 2. Prévia para aprovar
```bash
bash video-tools/bin/vpy video-tools/scripts/corrigir_cor.py previa bruto.MP4 [--lut x.cube] [--realce 1]
```
Gera `<nome>_cor_antes_depois.png`. Abra a imagem (Read) e mostre ao usuário antes de processar em lote.

## 3. Aplicar
```bash
bash video-tools/bin/vpy video-tools/scripts/corrigir_cor.py aplicar bruto.MP4 <trabalho>/COR/bruto_cor.mp4 [--lut x.cube] [--realce 1] [--inicio S --dur S]
```
- `--realce` 0 a 2: contraste e saturação leves (1 = toque sutil para Reels). Use igual em todos os vídeos da mesma peça.
- Em material longo, aplique só nos trechos usados (`--inicio/--dur`), como na estabilização.

## Alternativa no Premiere
Para o editor ajustar depois, prefira entregar o XML com os brutos e indicar a LUT no relatório:
Lumetri Color > Básico > LUT de entrada. A correção pelo script serve para prévias, cenas de apoio
e entregas rápidas fora do Premiere.
