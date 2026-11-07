#!/usr/bin/env bash
# Instala as ferramentas de vídeo da agência (decupagem, motion, estabilização, recorte).
# Uso: bash video-tools/install.sh        (Linux/macOS; no Windows use install.ps1)
# Requisitos: python3 (3.10+), node 18+, ffmpeg com vid.stab.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "${VIDEO_VENV:-}" ]; then VENV="$VIDEO_VENV"
elif [ -w /opt ] || [ -x /opt/video-venv/bin/python ]; then VENV=/opt/video-venv
else VENV="$HOME/.video-venv"; fi

command -v ffmpeg >/dev/null || { echo "ffmpeg não encontrado: instale (apt install ffmpeg / brew install ffmpeg)"; exit 1; }
FILTROS="$(ffmpeg -hide_banner -filters 2>/dev/null)"
grep -q vidstabdetect <<<"$FILTROS" || echo "Aviso: ffmpeg sem vid.stab; a estabilização não vai funcionar."

if [ ! -x "$VENV/bin/python" ]; then python3 -m venv "$VENV"; fi
"$VENV/bin/pip" install -q --upgrade pip
"$VENV/bin/pip" install -q -r "$DIR/requirements.txt"

(cd "$DIR/remotion" && npm install --no-audit --no-fund --silent)
echo "Ferramentas de vídeo instaladas. Python: $VENV/bin/python"
