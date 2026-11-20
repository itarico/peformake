---
name: limpeza-audio
description: Limpeza de áudio de fala na Performake, local e gratuita (FFmpeg). Tira ruído de fundo (vento, motor, ar-condicionado, Ceasa), corta grave, comprime e deixa no volume padrão de Reels/YouTube (-14 LUFS). Também mede o áudio (volume, pico, estouro) para escolher o melhor take. Use quando o usuário pedir "limpa o áudio", "tira o ruído", "áudio ruim", "normaliza o volume", "deixa no volume do Instagram", "o áudio estourou", "mede o áudio" ou antes de entregar qualquer vídeo com fala.
---

# Limpeza de áudio (local)

Script: `video-tools/scripts/limpar_audio.py` (Python via `bash video-tools/bin/vpy`; FFmpeg precisa estar no PATH).
Nunca sobrescreva o bruto: a saída vai para a pasta de trabalho do cliente.

## 1. Medir antes (escolha de take e diagnóstico)

```bash
bash video-tools/bin/vpy video-tools/scripts/limpar_audio.py bruto.mp4 --medir [--inicio S --dur S]
```
Mostra volume (LUFS), pico (dBTP) e avisa estouro (pico > -0,5 dB) ou áudio baixo (< -30 LUFS).
Em takes empatados na decupagem, prefira o de pico abaixo de -1 dB e volume entre -30 e -18 LUFS.

## 2. Limpar

```bash
# vídeo com áudio tratado (vídeo copiado sem recodificar)
bash video-tools/bin/vpy video-tools/scripts/limpar_audio.py bruto.mp4 <trabalho>/AUDIO/bruto_limpo.mp4 --alvo reels
# só o áudio em WAV 48 kHz/24 bits, para trocar na timeline do Premiere
bash video-tools/bin/vpy video-tools/scripts/limpar_audio.py bruto.mp4 <trabalho>/AUDIO/bruto.wav --so-audio
```
- `--reducao`: 6 leve · 12 padrão · 20 forte (ambiente muito barulhento). Acima de 20 a voz fica metálica.
- `--alvo`: reels/youtube = -14 LUFS · podcast = -16 LUFS.
- Faça um teste de 10 s (`--inicio S --dur 10`) e peça para o usuário ouvir antes de processar tudo.

## 3. Quando o local não basta
Ruído muito forte ou duas vozes sobrepostas: ofereça o "Enhance Speech" do conector Adobe
(`media_enhance_speech`) ou o plugin de limpeza de voz por IA, avisando que o áudio sobe para um serviço externo.

## No Premiere
Importe o `.wav`, coloque em A1 sincronizado (mesmo início do clipe) e silencie o áudio original.
A legenda/SRT continua valendo, pois o tempo não muda.
