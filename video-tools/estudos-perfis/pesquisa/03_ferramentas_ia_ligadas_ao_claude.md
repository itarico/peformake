# Pesquisa 3 — Ferramentas de vídeo com IA ligáveis ao Claude (07/11/2026)
Fonte: agente de pesquisa (WebSearch; Firecrawl sem créditos). Preços/licenças "não confirmados" devem ser checados no site oficial.

## Destaques
- **HyperFrames (HeyGen)** — skill `npx skills add heygen-com/hyperframes`, Apache 2.0, roda local (Chrome headless + ffmpeg), sem API paga. Base da maioria dos vídeos virais "feitos com Claude". **Prioridade nº 1.**
- **Remotion** — já temos. Licença: grátis só para equipes de até 3 pessoas; 4+ pessoas = licença de empresa (US$25/assento/mês ou US$0,01/render, mín. US$100/mês). **Confirmar tamanho da equipe Performake/Ellcazo.**
- Galeria de referência com prompts abertos: https://motion-graphics.org/ · lista: https://github.com/zhuyansen/awesome-claude-video-skills
- Repos abertos para estudar: claude-video-2 (HyperFrames+GSAP, MIT), lemo-opuscar (66 estilos de filme), PDoomVideo, Remotion prompts (remotion.dev/prompts).

## Por categoria (resumo)
| Área | Grátis/local e comercial OK | Pago (melhor qualidade) | Evitar com cliente |
|---|---|---|---|
| Motion | HyperFrames, Remotion (≤3 pessoas), Blender MCP (MIT), Lottie MCP (freemium) | After Effects MCP (assinatura Adobe) | — |
| Voz | Kokoro (Apache, CPU) — já instalado | ElevenLabs MCP oficial (Starter ~US$5–6/mês, comercial) | ElevenLabs grátis (NC) |
| Música | Mixkit (já usamos), ACE-Step 1.5 (Apache, precisa GPU → Colab), Stable Audio Open (<US$1M) | MiniMax music | MusicGen (NC), Suno grátis/wrappers |
| Vídeo gerado | Wan 2.2 (Apache, só GPU forte → Colab) | Higgsfield MCP oficial, fal MCP, Replicate MCP, Veo 3.1 (~US$0,10/s Fast) | Kling grátis (marca d'água/NC) |
| Imagem | FLUX schnell (Apache) via Colab/fal | Nano Banana (API Gemini) | FLUX dev (NC) |
| Cortes | claude-shorts, SeeCut, SupoClip (AGPL, Docker pesado, precisa AssemblyAI) | OpusClip MCP oficial (plano Pro) | CapCut por script (viola termos) |
| Edição | Premiere MCP (já instalado) | Descript MCP | DaVinci MCP exige Studio (pago) |
| Legenda | faster-whisper + skills de legenda (já temos) | — | — |

## Top 5 integrações recomendadas
1. HyperFrames (grátis) · 2. ElevenLabs MCP (Kokoro como reserva grátis) · 3. fal MCP ou Higgsfield MCP (B-roll gerado, pago por uso) · 4. Whisper + skills de legenda (grátis, já temos) · 5. OpusClip MCP (pago) ou SupoClip (grátis).
