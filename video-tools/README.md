# video-tools — edição de vídeo da Performake

Ferramentas usadas pelas skills `decupagem-video`, `motion-remotion` e `tratamento-video`
(em `.claude/skills/`). Ficam separadas do app web: o Vite e o ESLint não as compilam.

| Pasta / arquivo | O que faz |
|---|---|
| `scripts/decupar.py` | Decupagem → `decupagem_premiere.xml` (FCP7 XML, importável no Premiere) + `decupagem.json`; planilha só com `--planilha` |
| `scripts/transcrever.py` | Transcrição pt-BR (faster-whisper) → `.srt`, `.captions.json` (Remotion), `.transcricao.json` |
| `scripts/estabilizar.sh` | Estabilização com vid.stab |
| `scripts/recortar.py` | `reframe` (16:9 → 9:16 seguindo o rosto), `fundo` (remove fundo por IA), `chroma` (chroma key) |
| `remotion/` | Motion graphics: `Reel` (legenda animada), `LowerThird` (transparente), `TituloAnimado` |

## Instalação

```bash
bash video-tools/install.sh
```
Requisitos: Python 3.10+, Node 18+, FFmpeg com vid.stab. O ambiente Python fica em `/opt/video-venv`
(mude com `VIDEO_VENV=/outro/caminho`). No Windows, rode no WSL ou ajuste os caminhos.
