---
name: tratamento-video
description: Tratamento técnico de vídeo na Performake. Estabilização de imagem tremida, reenquadramento automático 16:9 → 9:16 seguindo o rosto, recorte (remoção de fundo por IA ou chroma key) com fundo transparente, além de cortes, junção, compressão e conversão com FFmpeg. Use quando o usuário pedir "estabiliza", "tira o tremido", "deixa vertical", "reenquadra pra reels", "recorta a pessoa", "tira o fundo", "chroma key", "fundo verde", "corta de X a Y", "junta os vídeos", "comprime" ou "converte".
---

# Tratamento de vídeo

Scripts em `video-tools/scripts/`. Python: `bash video-tools/bin/vpy` (se acusar que não está instalado: Windows `powershell -ExecutionPolicy Bypass -File video-tools\install.ps1`; Linux/macOS `bash video-tools/install.sh`).
Trabalhe sempre em cópias: nunca sobrescreva o bruto original.

## Estabilização (vid.stab, 2 passadas)

```bash
bash video-tools/bin/vpy video-tools/scripts/estabilizar.py entrada.mp4 saida.mp4 [--suavidade 15] [--zoom 0] [--inicio S --dur S]
```
Suavidade 10 = leve, 30 a 40 = bem travado. Se aparecerem bordas pretas, use zoom 3 a 6.
Gere um comparativo lado a lado para o usuário aprovar:
`ffmpeg -i entrada.mp4 -i saida.mp4 -filter_complex hstack -t 8 comparativo.mp4`

## Reenquadrar para 9:16 (segue o rosto)

```bash
bash video-tools/bin/vpy video-tools/scripts/recortar.py reframe entrada.mp4 vertical.mp4 [--formato 9:16|4:5|1:1] [--suavidade 0.08]
```
Saída em 1080 px de largura. Sem rosto detectado, mantém o centro. Suavidade menor = câmera mais lenta.

## Recorte / remover fundo

- **Fundo comum (IA):** `bash video-tools/bin/vpy video-tools/scripts/recortar.py fundo entrada.mp4 saida.mov [--modelo u2net_human_seg]`.
  É lento sem placa de vídeo (cerca de 1 a 2 quadros por segundo): use em trechos curtos.
- **Fundo verde/azul:** `bash video-tools/bin/vpy video-tools/scripts/recortar.py chroma entrada.mp4 saida.mov [--cor 0x00FF00] [--similaridade 0.15]`.
Ambos geram `.mov` ProRes 4444 com transparência, para usar como camada no Premiere ou After Effects.
Confira a máscara: `ffmpeg -i saida.mov -vf alphaextract -frames:v 1 mascara.png`.

## FFmpeg rápido

- Cortar sem recodificar: `ffmpeg -ss 00:00:15 -to 00:00:45 -i in.mp4 -c copy out.mp4`
- Juntar: crie `lista.txt` com linhas `file 'a.mp4'` e rode `ffmpeg -f concat -safe 0 -i lista.txt -c copy out.mp4`
- Comprimir para WhatsApp/anúncio: `ffmpeg -i in.mp4 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k out.mp4`
- Normalizar áudio: `ffmpeg -i in.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:v copy out.mp4`
- Legenda na imagem: `ffmpeg -i in.mp4 -vf "subtitles=legenda.srt:force_style='Fontsize=18,Outline=2'" out.mp4`

Para legenda animada ou motion, use a skill `motion-remotion`. Para decupagem, a skill `decupagem-video`.
