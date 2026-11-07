#!/usr/bin/env bash
# Atalho compatível: estabilizar.sh entrada.mp4 [saida.mp4] [suavidade=15] [zoom=0]
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IN="$1"; OUT="${2:-${IN%.*}_estabilizado.mp4}"
exec bash "$DIR/../bin/vpy" "$DIR/estabilizar.py" "$IN" "$OUT" --suavidade "${3:-15}" --zoom "${4:-0}"
