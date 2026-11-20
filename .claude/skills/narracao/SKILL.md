---
name: narracao
description: Narração realista em pt-BR, local e grátis (Kokoro-82M na CPU, sem crédito e sem internet). Gera WAV 48 kHz de um texto ou roteiro, com voz feminina ou masculina, velocidade e pronúncia ajustáveis, pronto para o Premiere. Use quando o usuário pedir "narração", "locução", "voz off", "VO", "lê esse roteiro", "voz de IA", "TTS", "narra o vídeo" ou precisar de uma voz guia para montar antes da locução real.
---

# Narração local (Kokoro-82M)

**Motor:** Kokoro-82M (pesos Apache 2.0) via `kokoro-onnx` (MIT) + espeak-ng/phonemizer (GPL-3, usados
localmente — o áudio gerado é seu, uso comercial em cliente liberado). Roda na CPU, offline.
Modelo em `D:\FERRAMENTAS\kokoro\` (`kokoro-v1.0.int8.onnx` 88 MB + `voices-v1.0.bin`). Mude com `KOKORO_DIR`.

## Vozes pt-BR
| voz | tipo | uso sugerido |
|---|---|---|
| `pf_dora` | feminina, clara | institucional, Disalp, tutoriais |
| `pm_alex` | masculina, média | anúncios, MF Máquinas, 3LM |
| `pm_santa` | masculina, grave | mistério/documentário (ref. @earn.edits), trailers |
Misturar: `-v "pm_alex:0.7,pm_santa:0.3"` (timbre intermediário).

## Como usar
```bash
bash video-tools/bin/vpy video-tools/scripts/narrar.py -f roteiro.txt -v pm_alex -s 1.05 -o VO_01.wav
bash video-tools/bin/vpy video-tools/scripts/narrar.py "Frase curta de teste." -v pf_dora -o teste.wav --lufs -16
```
- `-s` velocidade: 0.9 calmo/documentário · 1.0 padrão · 1.1–1.15 Reels de anúncio.
- `--lufs -16` só quando o WAV vai direto para o vídeo; se for mixar com música no Premiere, deixe sem e
  mixe a voz em -16 LUFS / música 18–22 dB abaixo (skill `limpeza-audio` mede).
- Saída: WAV mono 48 kHz 24 bits, com 0,15 s de respiro no começo/fim.

## Roteiro que soa bem
1. Uma frase por linha; frases curtas (até ~15 palavras). Linha em branco = pausa de parágrafo (0,85 s).
2. `...` no fim = pausa dramática (0,7 s). `?` e `!` dão pausa um pouco maior.
3. Escreva números, siglas, preços e telefones como devem soar: "oitenta e um, quatro um um seis…",
   "três éle eme", "R$ 49,90" → "quarenta e nove e noventa".
4. Pronúncia errada: `--troca "Makita=Makíta" --troca "Garthen=Gárten"` ou um arquivo `--trocas pronuncia.txt`.
   Guarde as trocas de cada cliente em `video-tools/clientes/<cliente>_pronuncia.txt`.
5. Sempre ouça (ou transcreva com Whisper para conferir) antes de entregar. Kokoro em português é bom para
   voz guia, VO de anúncio e explicativos; para campanha principal de marca, a locução humana ainda ganha.

## Regras
- Narração de IA em vídeo de cliente: avise o Italo; não imitar voz de pessoa real; não dizer que é
  locutor humano.
- Não usar XTTS-v2, F5-TTS (pesos não comerciais) nem Edge-TTS (serviço online da Microsoft, termos não
  cobrem uso comercial) — ver `video-tools/FERRAMENTAS.md`.
- Piper (alternativa leve) não está instalado: as vozes pt-BR (`faber`, `cadu`, `jeff` — só masculinas)
  têm dataset CC0, mas foram treinadas a partir da voz inglesa `lessac` (dataset Blizzard com licença
  restrita/não comercial), então a cadeia de licença não é limpa; `edresson` (CC BY 4.0) é "low" e soa
  robótica. O Kokoro já cobre feminina + masculina com qualidade melhor.
- Pronúncia por cliente: `video-tools/clientes/mf-maquinas_pronuncia.txt` (ex.: Camaragibe=Camaragíbi).
- Teste de 07/11/2026: as 3 vozes transcritas de volta pelo Whisper com ~100% das palavras certas;
  ~2 s de processamento por segundo de áudio na CPU (int8).
