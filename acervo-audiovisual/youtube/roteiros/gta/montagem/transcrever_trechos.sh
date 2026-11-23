#!/bin/sh
# Transcreve um áudio longo em trechos de ~50 s cortados em silêncio (o Whisper estoura a memória com o áudio inteiro).
# Uso: sh transcrever_trechos.sh <audio> <sufixo>
A="$1"; S="$2"; M=$(dirname "$0")/transcrever.py
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$A")
SIL=$(ffmpeg -i "$A" -af silencedetect=n=-35dB:d=0.25 -f null - 2>&1 | sed -n 's/.*silence_end: \([0-9.]*\).*duration: \([0-9.]*\).*/\1 \2/p' | awk '{printf "%.2f\n", $1-$2/2}')
CORTES=$(echo "$SIL" | awk -v d="$DUR" 'BEGIN{alvo=50;ult=0} {if($1-ult>=alvo){print $1; ult=$1}} END{}')
INI=0; i=0
for C in $CORTES "$DUR"; do
  DURA=$(awk -v a="$C" -v b="$INI" 'BEGIN{print a-b}')
  OUT=. SRC="$A" INI=$INI DURA=$DURA SUF="${S}_$i" python "$M" small >> "log${S}.txt" 2>&1 || echo "falhou trecho $i"
  INI=$C; i=$((i+1))
done
echo fim
