# OpenMotion no Claude Code

OpenMotion (`nexu-io/openmotion`, Apache-2.0) é um estúdio de vídeo com agente, open-source (alternativa ao Claude Motion e ao CapCut).
Ele recria um vídeo de referência com a nossa marca, adapta templates editáveis em HTML, usa Motion.md e exporta MP4 para Reels, Shorts e TikTok.
Instalado em 20/11/2026.

## Instalar num PC
```powershell
powershell -ExecutionPolicy Bypass -File acervo-audiovisual\ferramentas\openmotion\instalar-openmotion.ps1
```
O script:
1. Clona o repositório em `%USERPROFILE%\.claude\mcp\openmotion`, na versão testada (`c3e1ecf`). Com `-Ultima`, usa a main.
2. Roda `npm ci` e `npm run build:studio`.
3. Copia as 8 skills para `%USERPROFILE%\.claude\skills\`.
4. Registra o MCP `openmotion` no escopo do usuário, com os projetos em `%USERPROFILE%\.claude\mcp\openmotion-data`.

Requisitos: git, Node.js 22.18 ou mais novo (o ideal é 24.15 ou mais novo, porque com 24.13 aparece um aviso), ffmpeg no PATH, Google Chrome e o comando `claude`.

**Depois de instalar, abra uma sessão nova.** Sessões que já estavam abertas não enxergam o MCP novo.

## Skills (cópia em `skills-locais/openmotion*`)
| Skill | Para quê |
|---|---|
| `openmotion` | Entrada principal: configura e direciona para a skill certa |
| `openmotion-director` | Vídeo original (explicativo, demo, institucional), planejamento e revisão criativa |
| `openmotion-recreate` | Recriar um vídeo de referência ("faz um igual a este") com a marca do cliente |
| `openmotion-template-to-video` | Vídeo a partir de um template do catálogo |
| `openmotion-video-to-template` | Transformar uma referência em template reutilizável |
| `openmotion-production` | Ajustes, troca de mídia e áudio, prévia e exportação de projeto existente |
| `openmotion-media` | Gerar imagem, vídeo, voz ou música (precisa de chave Atlas Cloud, fal.ai, WaveSpeedAI ou OpenDesign) |
| `openmotion-design` | Projetos HTML do Design Studio (protótipos, slides, documentos) |

## Atualizar
No repositório instalado: `git pull`, `npm ci`, `npm run build:studio`, e copie de novo `skills/*`. Ou rode o script com `-Ultima`.
