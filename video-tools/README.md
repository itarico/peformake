# video-tools — edição de vídeo da Performake

Ferramentas usadas pelas skills `decupagem-video`, `motion-remotion` e `tratamento-video`
(em `.claude/skills/`). Ficam separadas do app web: o Vite e o ESLint não as compilam.

| Pasta / arquivo | O que faz |
|---|---|
| `scripts/decupar.py` | Decupagem → `decupagem_premiere.xml` (FCP7 XML, importável no Premiere) + `decupagem.json`; planilha só com `--planilha` |
| `scripts/transcrever.py` | Transcrição pt-BR (faster-whisper) → `.srt`, `.captions.json` (Remotion), `.transcricao.json` |
| `scripts/estabilizar.py` | Estabilização com vid.stab (arquivo inteiro ou só um trecho) |
| `scripts/montar.py` | Timeline única: V1 falas, V2 apoio estabilizado, espaço entre vídeos, marcadores, SRT |
| `bin/vpy` | Atalho que roda o Python certo em Windows (Git Bash), Linux e macOS |
| `clientes/` | Regras de edição por cliente (ex.: `disalp.md`) |
| `scripts/recortar.py` | `reframe` (16:9 → 9:16 seguindo o rosto), `fundo` (remove fundo por IA), `chroma` (chroma key) |
| `remotion/` | Motion graphics: `Reel` (legenda animada), `LowerThird` (transparente), `TituloAnimado` |

## Instalação no Windows (PC do editor)

1. Instale o **app Claude para desktop** e o **Git for Windows** (o Claude Code usa o Git Bash).
2. No app, abra a aba **Claude Code** e abra o repositório `peformake`, no branch onde estão estas ferramentas.
3. No **PowerShell**, dentro da pasta do repositório, rode uma vez:
   ```powershell
   powershell -ExecutionPolicy Bypass -File video-tools\install.ps1
   ```
   Ele instala pelo winget o que faltar (Python 3.12, Node.js LTS e o FFmpeg completo, com estabilização) e
   cria o ambiente Python em `%USERPROFILE%\.video-venv`. Leva de 5 a 15 minutos na primeira vez
   (baixa cerca de 1 GB de pacotes). Se ele pedir, feche e abra o PowerShell e rode de novo.
4. No Claude Code, peça: *"edita os vídeos da Disalp em C:\Users\intal\Desktop\DISALP"*.

Na primeira transcrição o modelo de voz (cerca de 500 MB) é baixado uma vez. A transcrição roda na CPU
por padrão. Com placa NVIDIA e CUDA/cuDNN instalados, defina `VIDEO_WHISPER_DEVICE=cuda` para acelerar.

## Instalação no Linux/macOS


```bash
bash video-tools/install.sh
```
Requisitos: Python 3.10+, Node 18+, FFmpeg com vid.stab. O ambiente Python fica em `/opt/video-venv`
(se `/opt` não for gravável, em `~/.video-venv`; mude com `VIDEO_VENV=/outro/caminho`).
