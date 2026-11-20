#!/usr/bin/env bash
# Render de uma composição do kit pro em ProRes 4444 COM ALPHA (para pôr em trilha própria no Premiere).
# Uso: bash render-pro.sh Pro-TituloCinetico "D:/saida/titulo.mov" [--props='{"cliente":"mf","linhas":["A","B"]}']
# Confira a RAM antes (8 GB no PC): não renderize junto com outra sessão.
set -euo pipefail
cd "$(dirname "$0")"
ID="$1"; SAIDA="$2"; shift 2
export PATH="$PATH:/c/Program Files/nodejs"
npx remotion render src/pro/index.ts "$ID" "$SAIDA" \
  --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png \
  --gl=angle --concurrency=1 "$@"
