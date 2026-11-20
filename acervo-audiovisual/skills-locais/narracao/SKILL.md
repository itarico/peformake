---
name: narracao
description: Transforma um roteiro em narração de voz (grátis, local) para vídeos de YouTube, Shorts e Reels. Narra em pedaços, respeita [pausa], gera áudio por bloco, o arquivo completo, a legenda .srt e os tempos de cada frase (para sincronizar cenas na edição). Motores edge-tts (vozes neurais pt-BR, rápido) e Chatterbox (local na GPU, com clone de voz autorizada). Use quando o usuário pedir narração, locução, voz, "narrar o roteiro", TTS, voz off, voz de IA, "gerar o áudio do vídeo", ou depois da roteiro-retencao.
---

# Narração de roteiro (TTS local)

Script: `~/.claude/skills/narracao/scripts/narrar_roteiro.py`
Python: `D:\ITALO\CLAUDE\IA-LOCAL\venv-voz\Scripts\python.exe` (edge-tts, Chatterbox multilíngue, torch com CUDA).
Saída padrão: `D:\ITALO\CLAUDE\SHOPPE\canal-youtube\roteiros\<slug>\narracao\`

## Rodar
```bash
cd /d/ITALO/CLAUDE/IA-LOCAL && PYTHONIOENCODING=utf-8 venv-voz/Scripts/python ~/.claude/skills/narracao/scripts/narrar_roteiro.py "<roteiro.md>" --saida "<pasta>" --motor edge --voz pt-BR-AntonioNeural
```
- **Entrada:** o `.md` da `roteiro-retencao` (o script lê só o texto depois de cada `**Fala:**`, até a tabela) ou um `.txt` com blocos separados por linha em branco.
- `[pausa]` vira 0,7 s de silêncio. `**negrito**` sai do texto falado. Outras marcas entre colchetes, como [CONFIRMAR], são removidas. Resolva-as antes de narrar.
- **Teste de voz primeiro:** `--blocos 1` narra só a abertura. Mostre ao usuário antes de narrar 15 min.
- Vídeo longo: rode em segundo plano.

## Motores

| Motor | Quando usar | Opções |
|---|---|---|
| `edge` (padrão) | Rápido (cerca de 3 s por frase), voz neural estável. Usa o serviço online da Microsoft. | `--voz pt-BR-AntonioNeural` (masc.), `pt-BR-FranciscaNeural` ou `pt-BR-ThalitaMultilingualNeural` (fem.); `--velocidade=-5%` para documentário mais calmo (use com `=`: valor negativo sem `=` vira erro) |
| `chatterbox` | Totalmente local, mais expressivo, aceita clone de voz. Lento na GTX 1650: meça com `--blocos 1` antes. | `--ref voz.wav` (10 a 20 s de voz limpa), `--exag 0.3-0.8` (emoção), `--cfg 0.3` (mais pausado) |

Clone de voz: só a voz do próprio Italo ou de quem autorizou por escrito. Nunca a de pessoa pública ou de outro canal.

## Saída
- `narracao.wav`: completo, normalizado.
- `blocos/bloco-NN.wav`: um por bloco do roteiro, para regravar só o bloco que mudou.
- `tempos.json`: início e fim de cada frase. A `edicao-story` usa isso para trocar a cena na frase certa, e a `shorts-do-longo` para achar os cortes.
- `narracao.srt`: legenda pronta. Revise nomes próprios.

Depois: `audio-video` para trilha (ACE-Step), ducking e -14 LUFS.

## Qualidade
- Ouça a abertura inteira. Se uma palavra sair errada (nome chinês, sigla), reescreva-a como se fala ("Lao Tsé", "dinastia Tâng") e narre de novo só aquele bloco.
- Frases acima de 240 caracteres são quebradas sozinhas. Frase muito longa no roteiro já é problema de fala (Módulo 09 do MDD).
- Canal monetizado com voz de IA é permitido, mas o conteúdo precisa de valor próprio (roteiro original, pesquisa, edição). Voz de IA lendo texto copiado cai na regra de conteúdo inautêntico.
