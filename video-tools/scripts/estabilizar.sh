#!/usr/bin/env bash
# Estabiliza vídeo tremido com vid.stab (2 passadas) via FFmpeg.
# Uso: estabilizar.sh entrada.mp4 [saida.mp4] [suavidade=15] [zoom=0]
#   suavidade: 10 (leve) a 40 (bem travado). zoom: % extra para esconder bordas (ex.: 5).
set -euo pipefail
IN="$1"
OUT="${2:-${IN%.*}_estabilizado.mp4}"
SMOOTH="${3:-15}"
ZOOM="${4:-0}"
TRF="$(mktemp -d)/transforms.trf"

ffmpeg -hide_banner -loglevel error -y -i "$IN" \
  -vf "vidstabdetect=shakiness=6:accuracy=15:result=$TRF" -f null -
ffmpeg -hide_banner -loglevel error -y -i "$IN" \
  -vf "vidstabtransform=input=$TRF:smoothing=$SMOOTH:zoom=$ZOOM:optzoom=1:interpol=bicubic,unsharp=5:5:0.8:3:3:0.4" \
  -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a copy "$OUT"
echo "Estabilizado -> $OUT"
