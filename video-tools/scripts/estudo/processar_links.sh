# Uso: OUT=D:/pasta bash processar_links.sh URL [URL...]
# Para cada reel: baixa e mede (referencia_reel.py), gera folha densa 1 fps e transcreve. Um por vez; pula transcritos.
cd /c/Users/intal/peformake
FF=$(ls -d /c/Users/intal/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg*/ffmpeg-*/bin | head -1); export PATH="$PATH:$FF"
O=${OUT:-/d/PEFORMAKE/REFERENCIAS/_tutoriais}; E=video-tools/scripts/estudo
for u in "$@"; do
  id=$(echo "$u" | sed -E 's#.*/(reel|p)/([^/?]+).*#\2#')
  ls $O/Instagram/*/$id/transcricao.txt >/dev/null 2>&1 && { echo "JA $id"; continue; }
  bash video-tools/bin/vpy video-tools/scripts/referencia_reel.py "https://www.instagram.com/reel/$id/" --out $O 2>&1 | tail -1
  D=$(ls -d $O/Instagram/*/$id 2>/dev/null | head -1); [ -f "$D/video.mp4" ] || { echo "FALHOU $id"; continue; }
  ffmpeg -nostdin -v error -y -i $D/video.mp4 -vf "fps=1,scale=180:-2,tile=8x6" -frames:v 1 $D/sequencia_densa.jpg
  bash video-tools/bin/vpy $E/transcrever_lote.py $D/video.mp4 2>&1 | grep -v -i warn
  echo "PRONTO $D"; sleep 3
done
echo "FIM LOTE"
