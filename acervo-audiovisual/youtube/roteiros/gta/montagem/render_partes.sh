#!/bin/sh
# Render do projeto em partes de 70 s, com o temporário no G: (o C: tem pouco espaço).
# Uso: sh render_partes.sh <projeto> <saida_dir> [pasta_tmp]
P="$1"; O="$2"; T="${3:-/g/lucas/tmp_gta}"; mkdir -p "$O" "$T"; HF=~/.claude/mcp/openmotion/node_modules/.bin/hyperframes
export TEMP="$(cygpath -w "$T")" TMP="$(cygpath -w "$T")"
DUR=$(python -c "import json;print(json.load(open(r'$(cygpath -w "$P")\eventos.json',encoding='utf-8'))['dur'])")
cd "$P"
i=0; a=0
while python -c "import sys;sys.exit(0 if $a < $DUR - 0.01 else 1)"; do
  b=$(python -c "print(round(min($a+70,$DUR),6))")
  [ -s "$O/parte$i.mp4" ] || $HF render --start $a --end $b -o "$O/parte$i.mp4" -q looks > "$O/log$i.txt" 2>&1 || echo "FALHOU parte $i"
  echo "parte $i $a-$b ok"
  i=$((i+1)); a=$b
done
