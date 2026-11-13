# Catálogo: ferramentas citadas nos vídeos de conteúdo aplicável (08/11/2026)

**Para que serve:** juntar num lugar só as ferramentas, skills, repositórios, MCPs e plugins que os vídeos mandam instalar (tipo b, "fazer o que o vídeo diz"), conferidas na fonte oficial.
**Máquina alvo:** notebook Windows 11, 8 GB de RAM, sem GPU forte, internet lenta.
**O que já existe nela:** Python 3.12.10, Node v26.13.0, FFmpeg 9.0.2 (gyan.dev), Remotion, faster-whisper, Kokoro, yt-dlp, Claude Code desktop e MCP do Premiere.
**Como foi feito:** nada foi instalado nem executado.
- Os dados dos repositórios saíram da API pública do GitHub em 08/11/2026: licença, estrelas, último push e se está arquivado.
- Os requisitos saíram do README oficial de cada um.
- "Não verificado" quer dizer que não achei a fonte oficial ou que não li o README.
- Estrelas e preços mudam rápido.

**Fontes (id do post/vídeo):**
- **JPA** = João Pedro Amorim `DfTIAPVRKX-` (as 9 trocas de assinatura)
- **Juan** = `DfU15waS65m` (as mesmas 9 trocas)
- **Andreia** = Andreia Schneider `DfXLk9dlHgR` (lemo-opuscar)
- **Augusto** = `DfGjbeHNdTZ` (Hypit, HyperFrames, Rhubarb)
- **Vini** = `DfMyjdCAQ8L` (Get B-Rolls) e `_tutoriais/.../DfZyB-lKUqY` (anúncio do Get B-rolls 2.6, Bruno Moreira)
- **Igor H. (WhatsApp)** = `_tutoriais/.../DfcZQtkt599` (fluxo do Claude in Chrome no WhatsApp Web)
- **Gabriel** = `De9lLWSsJAj` (SupoClip)
- **Igor H.** = `DfQtz48tThx` (Graphify) e `DfGTf2fO0Q4` (xtool)
- **Pedro** = `DfDWbpugC2T` e **Felipe T.** = `DeP5nEBCCh0` (find-skills, Grill Me, Agent Browser)
- **Dev2** = Dev em dobro `DfHnBYqhCyq` (lista de 35 ferramentas)
- **Santinello** = `DfFU8OHiVZa` (OpenField)
- **Henrique** = `DfCXg0VPOiw` (MiniMax H3)
- **Manoel** = `DfAI_ZaRJWm` (VoiceStudio)
- **Copfy** = `DfDDIHCDadw` (Kapso), `DfGgIh-DyiK` (scraper do Maps + Evolution API) e `DfcNUfKRpZ6` (Higgsfield MCP)
- **Lucas P.** = `DeRyI-tM_0U` e `DfLAmABCC7c` (MCP de carrossel)
- **Renan** = `DfYF7QvR9_K` (FrameSpeed)
- **Igor M.** = `DfHXuayxxaK` (captação de leads)
- **Maestros** = `estudo_maestros_ia.md`
- **YT** = `estudo_youtube.md`
- **P03** = `_pesquisa/03_ferramentas_ia_ligadas_ao_claude.md`

**Legenda das colunas:**
- "Roda aqui?": **sim** = roda local no notebook; **pesado** = roda, mas devagar, ocupando muita RAM ou baixando muita coisa; **não** = exige GPU, servidor ou outro sistema.
- "Utilidade": de 1 (nenhuma) a 5 (central para a agência).

---

## 1. Tabela principal

### 1a. As 9 trocas de assinatura (JPA e Juan)

| Ferramenta | Substitui | URL | Licença | Requisitos | Roda aqui? | Utilidade | Fonte | Recomendação |
|---|---|---|---|---|---|---|---|---|
| Open Higgsfield | Higgsfield | github.com/wide-trace/open-higgsfield (5,5 mil estrelas, push 17/09/2026); há um clone parecido: ClabstreamTeam/Open-Higgsfield-AI | **nenhuma declarada** (sem LICENSE: todos os direitos reservados) | Next.js + pnpm; **cada geração é paga** com a sua chave de plataforma (`id:secret`, pelo formato parece fal.ai, não confirmado); versão hospedada em openhiggsfield.ai | sim (só a interface) | 2 | JPA, Juan | **NÃO** |
| VoiceStudio | ElevenLabs | github.com/debpalash/VoiceStudio (104 mil estrelas, push 08/11/2026) | AGPL-3.0; existe um plano "Pro" de código fechado para "trabalho pago para cliente em mais de uma máquina" | app Electron com backend Python; .exe para Windows com CPU, CUDA ou ROCm; você baixa só os modelos que vai usar; instalador oficial `irm voicestudio.sh/install.ps1 \| iex` | pesado (clonagem em CPU com 8 GB é lenta; o tamanho dos modelos não foi verificado) | 3 | JPA, Juan, Manoel, Maestros | **TESTAR** (só com autorização escrita do dono da voz) |
| OpenSEO | Semrush/Ahrefs | github.com/every-app/open-seo (26,8 mil estrelas, push 07/11/2026) | MIT | **chave paga da DataForSEO** (paga por consulta); hospedar em Docker ou no Cloudflare (plano grátis); tem MCP para Claude; a versão hospedada cobra 28% a mais sobre a DataForSEO | pesado (Docker) / nuvem grátis (Cloudflare) | 4 | JPA, Juan | **TESTAR** (no Cloudflare; ver §3) |
| AppFlowy | Notion | github.com/AppFlowy-IO/AppFlowy (78 mil estrelas, ativo) | AGPL-3.0 | app desktop para Windows (Releases); funciona local; nuvem opcional | sim | 2 | JPA, Juan | **SÓ SE PRECISAR** |
| OpenWhispr | Wispr Flow | github.com/OpenWhispr/openwhispr (11 mil estrelas, ativo) | MIT | .exe para Windows; local (Whisper/Parakeet) ou nuvem com a sua chave; README diz "sem telemetria" | sim (modelo pequeno) | 3 | JPA, Juan | **TESTAR** |
| OpenProject | Asana | github.com/opf/openproject (17 mil estrelas, ativo) | GPL-3.0 | servidor (Docker ou pacote Linux) com Postgres; consumo de RAM não conferido nesta pesquisa | não (servidor) | 2 | JPA, Juan | **SÓ SE PRECISAR** (§3) |
| Cal.com → **Cal.diy** | Calendly | `calcom/cal.com` agora redireciona para github.com/calcom/cal.diy (49,8 mil estrelas, ativo) | MIT | auto-hospedado (Docker + Postgres). O README avisa: "uso pessoal, não para produção"; para uso comercial a própria empresa indica o Cal.com hospedado | não (servidor) | 3 | JPA, Juan | **SÓ SE PRECISAR** (§3) |
| Chatwoot | Intercom | github.com/chatwoot/chatwoot (39 mil estrelas, ativo) | MIT, exceto a pasta `enterprise/` (licença própria) | servidor (Rails, Postgres, Redis; Docker) | não (servidor) | 3 | JPA, Juan | **SÓ SE PRECISAR** (§3) |
| Cap | Loom | github.com/CapSoftware/Cap (24,6 mil estrelas, ativo); download em cap.so/download | AGPL-3.0 (alguns crates MIT) | app desktop nativo (Rust) para Windows; grava local; Cap Cloud ou servidor próprio são opcionais | sim | 4 | JPA, Juan | **INSTALAR AGORA** |

### 1b. Vídeo, motion, voz e legenda

| Ferramenta | Substitui | URL | Licença | Requisitos | Roda aqui? | Utilidade | Fonte | Recomendação |
|---|---|---|---|---|---|---|---|---|
| **lemo-opuscar** (plugin) | motion designer / filme de estilo | github.com/lemomo-ai/lemo-opuscar (13,6 mil estrelas, push 08/11/2026). **Existe e bate com o post** | código e docs MIT; filmes de demonstração CC BY 4.0; 6 narrações de demo não podem ser reusadas | Node 20+, FFmpeg 7+, Python 3.11+ (a máquina tem todos). **Não usa Remotion nem HyperFrames**: renderizador próprio (página canvas/WebGL com `render(t)` capturada quadro a quadro por Chrome headless). Voz: Kokoro local. Música: bibliotecas de samples grátis + síntese. **Sem API paga, sem vídeo generativo.** Windows via Git Bash. Estilos 3D/shader "querem GPU". Um filme leva 30–60 min e "muitos tokens". Saída padrão 1920x1080 a 24 fps (`--size 1080x1920` para vertical). Downloads: ~0,55 GB de voz + 70–400 MB por biblioteca de samples | sim nos estilos 2D; pesado nos 3D | **5** | Andreia, P03 | **INSTALAR AGORA** |
| HyperFrames | motion por código | github.com/heygen-com/hyperframes (80,8 mil estrelas, ativo) | Apache-2.0 | Node + Chrome headless + FFmpeg; skill `npx skills add heygen-com/hyperframes` ou `npx hyperframes skills update`; app Studio para Windows | sim | 5 | Augusto, Pedro, P03, Maestros | **INSTALAR AGORA** |
| Get B-Rolls 2.6 | pesquisa de B-roll | github.com/engenheirodevideo/get-brolls (222 estrelas, push 08/11/2026, tag v2.6.2; autor Bruno Moreira, @zbrunomoreira). **É público e grátis no GitHub**: o "comenta BROLL" só manda o link | MIT (as dependências têm licença própria, em THIRD_PARTY_NOTICES.md) | Python 3.11+, FFmpeg com libfreetype, Node 22+, yt-dlp e Playwright (instalados pelo `setup`); Windows e macOS. Fontes: YouTube e TikTok via yt-dlp, sem chave; Instagram pelo navegador (Playwright); Wikimedia Commons e NASA sem chave; Pexels e Pixabay com chave grátis do banco. Não edita nem renderiza: entrega clipes por beat, com `ORIGEM.md` e condições de uso, e tem ponte oficial para o HyperFrames. Storyboard `review.html` sem autenticação. Transcrição local | sim | 5 | Vini, tutorial `DfZyB-lKUqY` | **INSTALAR AGORA** (só fontes livres; ver §2.4) |
| Rhubarb Lip Sync | animador de boca | github.com/DanielSWolf/rhubarb-lip-sync (2,7 mil estrelas, push 16/06/2026) | MIT | binário de linha de comando (Releases), CPU | sim | 4 | Augusto | **INSTALAR AGORA** |
| Hypit | "clonar formato de viral" | github.com/hypit-ai/hypit (28,5 mil estrelas, ativo) | **Apache-2.0 modificada**: uso comercial próprio e para clientes liberado; proibido SaaS multiusuário e revenda; não pode tirar o logo dos relatórios | Node 22.15+; `npx skills add hypit-ai/hypit -g`. Modo "renderizado por código" sem API; troca de rosto, voz e vídeo gerado usam APIs pagas (HypiHub recomendado; exemplo do README: US$ 1,09 por vídeo). README cheio de patrocinadores de API | sim (modo código) / pago (modo IA) | 4 | Augusto | **TESTAR** |
| OpenMontage | montagem por agente | github.com/OpenMontageInc/OpenMontage (78 mil estrelas, ativo; o nome antigo calesthio/OpenMontage redireciona) | AGPL-3.0 | Python 3.10+ e Remotion (npm); narração grátis com piper-tts; chaves pagas opcionais (ElevenLabs, OpenAI, fal); GPU opcional para vídeo local | pesado | 4 | Dev2, Maestros | **TESTAR** (ler a estrutura dos pipelines) |
| video-use (Browser Use) | editor que confere o próprio corte | github.com/browser-use/video-use (30,7 mil estrelas, push 08/10/2026) | MIT | uv + FFmpeg; **exige chave da ElevenLabs** (transcrição Scribe, paga depois da cota) | sim, mas pago | 3 | Maestros | **SÓ SE PRECISAR** (copiar a lógica de autoconferência) |
| SupoClip | OpusClip | github.com/FujiwaraChoki/supoclip (2,7 mil estrelas, ativo) | AGPL-3.0 | Docker Compose + chave da AssemblyAI + chave de LLM; o modo 100% local (Whisper + Ollama) também roda em Docker | pesado demais para 8 GB | 3 | Gabriel | **NÃO** como vem (copiar a lógica para a `cortes-verticais`) |
| OpenCut | CapCut | github.com/OpenCut-app/OpenCut (97,7 mil estrelas, push 24/09/2026) | MIT | editor web (Bun/Next); requisitos não lidos | não verificado | 2 | Dev2 | **SÓ SE PRECISAR** (já temos Premiere) |
| WhisperX | transcrição palavra a palavra | github.com/m-bain/whisperX (25 mil estrelas, ativo) | BSD-2-Clause | PyTorch; pesado em CPU | pesado | 2 | YT | **SÓ SE PRECISAR** (o faster-whisper já dá tempo por palavra) |
| Higgsfield MCP (oficial) / Shorts Studio | gerador de vídeo | conector MCP da Higgsfield (P03); não reconferido hoje | proprietário | créditos pagos, nuvem | sim (nuvem) | 3 | Copfy, Maestros | **SÓ SE PRECISAR** (por projeto pago pelo cliente) |
| OpenField (ComfyUI) | Higgsfield | github.com/wexloops/openfield (192 estrelas); README diz MIT, a API não detecta licença | MIT (segundo o README) | **GPU com 24 GB de VRAM** para vídeo (12–16 GB só imagem); ComfyUI, Node 22+, Python 3.10–3.12 | não | 1 | Santinello | **NÃO** |
| MiniMax H3 | Veo/Kling | huggingface.co/MiniMaxAI/MiniMax-H3 (existe; licença "other"); quantizações GGUF da unsloth | "other" (uso comercial não conferido) | mesmo quantizado exige GPU ou muita memória (a versão MLX 8-bit ocupa 21,5 GB) | não | 2 | Henrique | **NÃO** local (usar o site Hailuo por projeto) |
| Kokoro, faster-whisper, yt-dlp, Remotion | — | — | — | — | sim | 5 | vários | **já instalados** |

### 1c. Skills e utilitários para o Claude Code

| Ferramenta | Substitui | URL | Licença | Requisitos | Roda aqui? | Utilidade | Fonte | Recomendação |
|---|---|---|---|---|---|---|---|---|
| **SkillSpector** (NVIDIA; os vídeos falam "Skill Spectre") | auditoria manual de skill | github.com/NVIDIA/SkillSpector (24,9 mil estrelas, ativo) | Apache-2.0 | Python 3.12+; `uv tool install git+https://github.com/NVIDIA/skillspector.git`; modo `--no-llm` só com análise estática; consulta o OSV.dev (com modo offline) | sim | 5 | Maestros, Pedro (alerta da Snyk) | **INSTALAR AGORA** (primeiro de todos) |
| find-skills / CLI `skills` (skills.sh) | garimpo de skills | github.com/vercel-labs/skills (38,6 mil estrelas, ativo) | MIT | `npx skills`; **coleta telemetria anônima por padrão** (desliga com `DISABLE_TELEMETRY=1`); a pasta exata da skill find-skills não foi conferida | sim | 4 | Pedro, Felipe T. | **TESTAR** (sempre passando pelo SkillSpector) |
| Grill Me | revisão de briefing | github.com/mattpocock/skills (318 mil estrelas) | MIT | skill de texto | sim | 4 | Pedro, Maestros | **TESTAR** |
| Humanizer | texto com "cara de IA" | github.com/blader/humanizer (66 mil estrelas, ativo) | MIT | `/plugin install humanizer@humanizer` ou `npx skills add blader/humanizer` | sim | 4 | Dev2 | **TESTAR** |
| Graphify | ler o código inteiro a cada sessão | github.com/Graphify-Labs/graphify (144 mil estrelas, ativo) | Apache-2.0 | Python 3.10+; `pip install graphifyy` (com dois "y", é o nome oficial no README) + `graphify install`; local, sem servidor | sim | 3 | Igor H. | **TESTAR** (nos projetos Remotion/HyperFrames) |
| Agent Browser | navegador do agente | github.com/vercel-labs/agent-browser (47 mil estrelas) | Apache-2.0 | CLI | sim | 2 | Pedro | **SÓ SE PRECISAR** (o Claude in Chrome e o navegador embutido já cobrem) |
| Playwright MCP | navegador do agente | github.com/microsoft/playwright-mcp (39 mil estrelas) | Apache-2.0 | Node | sim | 2 | Dev2, Maestros | **SÓ SE PRECISAR** |
| claude-mem | memória entre sessões | github.com/thedotmack/claude-mem (115 mil estrelas) | Apache-2.0 | grava tudo o que o agente faz (pode guardar chaves e dados de cliente) | sim | 2 | Dev2 | **SÓ SE PRECISAR** |
| Mem0 | memória | github.com/mem0ai/mem0 (68,6 mil estrelas) | Apache-2.0 | biblioteca; nuvem paga opcional | sim | 1 | Dev2 | **NÃO** (não serve para a agência) |
| Open Design | designer de LP | github.com/nexu-io/open-design (106 mil estrelas) | Apache-2.0 | app local; requisitos não lidos | não verificado | 3 | Maestros | **TESTAR** (LP de cliente) |
| Taste Skill | direção de arte web | github.com/Leonxlnx/taste-skill (112 mil estrelas) | MIT | skill | sim | 3 | Dev2, Maestros | **TESTAR** |
| UI UX Pro Max | design de UI | github.com/nextlevelbuilder/ui-ux-pro-max-skill (147 mil estrelas) | MIT | skill | sim | 2 | Dev2, Maestros | **SÓ SE PRECISAR** (no teste dos Maestros, "não impressiona") |
| Impeccable | design de UI | github.com/pbakaus/impeccable (106 mil estrelas) | Apache-2.0 | skill | sim | 2 | Dev2 | **SÓ SE PRECISAR** |
| Frontend Slides | slides | github.com/zarazhangrui/frontend-slides (32 mil estrelas, push 23/06/2026) | MIT | skill | sim | 2 | Dev2 | **SÓ SE PRECISAR** |
| Marketing Skills | consultor de marketing | github.com/coreyhaines31/marketingskills (59 mil estrelas) | MIT | skills (CRO, copy, SEO) | sim | 3 | Dev2 | **TESTAR** (comparar com as skills da agência) |
| Claude SEO | auditoria de SEO | github.com/AgriciDaniel/claude-seo (27 mil estrelas) | MIT | requisitos e APIs não verificados | não verificado | 3 | Dev2 | **TESTAR** (junto com o OpenSEO) |
| last30days | pesquisa de tendência | github.com/mvanhorn/last30days-skill (67 mil estrelas) | MIT | pode exigir chaves de API (não verificado) | não verificado | 3 | Dev2 | **TESTAR** (pauta de cliente) |
| Agent Reach | leitura de redes | github.com/Panniantong/Agent-Reach (110 mil estrelas) | MIT | lê Twitter, Reddit etc. (provável uso de cookies e risco de termos de uso; não verificado) | não verificado | 2 | Dev2 | **SÓ SE PRECISAR** |
| MarkItDown | conversor de documento | github.com/microsoft/markitdown (194 mil estrelas) | MIT | `pip` | sim | 3 | Dev2 | **TESTAR** (briefing em PDF/PPT) |
| Docling | conversor de documento | github.com/docling-project/docling (70 mil estrelas) | MIT | PyTorch (pesado) | pesado | 2 | Dev2 | **SÓ SE PRECISAR** (usar o MarkItDown) |
| Superpowers | método de programação | github.com/obra/superpowers (314 mil estrelas) | MIT | skills | sim | 1 | Dev2, Maestros | **SÓ SE PRECISAR** (é para programação) |
| gstack | setup de dev | github.com/garrytan/gstack (141 mil estrelas) | MIT | skills | sim | 1 | Dev2 | **NÃO** (fora do escopo) |
| Agency Agents | "equipe" de agentes | github.com/msitarzewski/agency-agents (167 mil estrelas) | MIT | arquivos de agente | sim | 2 | Dev2 | **SÓ SE PRECISAR** (ler como referência) |
| Karpathy Skills | CLAUDE.md | o repo forrestchang/... foi para github.com/multica-ai/andrej-karpathy-skills (231 mil estrelas, **push 20/04/2026**) | **nenhuma declarada** | 1 arquivo CLAUDE.md | sim | 1 | Dev2 | **NÃO** (sem licença e parado; só ler) |
| Paperclip | orquestrar agentes | github.com/paperclipai/paperclip (112 mil estrelas) | MIT | app | não verificado | 1 | Maestros | **NÃO** por enquanto |
| Anthropic Skills | — | github.com/anthropics/skills | a API não detecta licença | — | sim | — | Dev2 | **já temos** (anthropic-skills) |
| Awesome Claude Skills | catálogo | github.com/ComposioHQ/awesome-claude-skills | nenhuma declarada (é uma lista) | — | — | 2 | Dev2 | só referência |
| Gemini Notebook, "Ocean MCP", "Cloud Man", "Man Zero", "Bobson Agents" | — | **não verificado** (nomes ditos rápido na lista "35 ferramentas"; transcrição ilegível) | — | — | — | — | Dev2 | **NÃO** sem o nome real |

### 1d. Atendimento, prospecção e outros

| Ferramenta | Substitui | URL | Licença | Requisitos | Roda aqui? | Utilidade | Fonte | Recomendação |
|---|---|---|---|---|---|---|---|---|
| Kapso + `gokapso/agent-skills` | atendente de WhatsApp | github.com/gokapso/agent-skills (199 estrelas); serviço kapso.ai | **nenhuma declarada** nas skills; o serviço é proprietário | API oficial do WhatsApp; plano grátis de 2 mil mensagens/mês (dito no vídeo, **não verificado**) | nuvem | 3 | Copfy | **SÓ SE PRECISAR** (se a agência vender atendimento) |
| Evolution API | API do WhatsApp | github.com/evolution-foundation/evolution-api (10 mil estrelas) | não declarada claramente (NOASSERTION) | servidor; **WhatsApp não oficial** | não | 1 | Copfy | **NÃO** |
| Google Maps Scraper Kit | lista de leads | github.com/Mahanaicoach/google-maps-scraper-kit (2,3 mil estrelas, MIT, Python sem Docker); motor parecido: gosom/google-maps-scraper (MIT) | MIT | Python | sim | 2 | Copfy | **NÃO** (termos do Google e LGPD) |
| xtool | Xcode | github.com/xtool-org/xtool (14,9 mil estrelas) | MIT | conta de desenvolvedor Apple | sim | 1 | Igor H. | **NÃO** (fora do escopo) |
| MCP de carrossel ("CarrosselA") | designer de carrossel | **não verificado** (link só por DM) | — | créditos pagos | nuvem | 2 | Lucas P. | **NÃO** (a nossa `carrossel-de-reel` faz igual) |
| FrameSpeed | plugin do DaVinci | **não verificado** (por DM) | pago | DaVinci Resolve | — | 1 | Renan | **NÃO** |
| "Claude Leads" / Miya (raspagem de comentários) | prospecção | **não verificado** | — | — | nuvem | 1 | Igor M. | **NÃO** |

---

## 2. Instalar agora (6)

Ordem sugerida: o SkillSpector primeiro, para escanear os outros antes de instalar. Instale cada um numa pasta de teste, não no global, e registre a instalação em `skills_instaladas.md` (W8 de `ferramentas_e_workflows.md`).

**Antes de tudo, nesta máquina:**
- O `uv` não aparece entre os já instalados. Instale pelo site oficial (astral.sh) ou use `pipx` no lugar.
- Rode `ffmpeg -filters | findstr drawtext` para confirmar se o FFmpeg tem `drawtext` (o Get B-Rolls precisa).

### 1. SkillSpector (NVIDIA)
- **Por quê:** o alerta mais repetido nos vídeos é o de skills maliciosas (o estudo da Snyk achou 76 de propósito). Ele vira a 1ª etapa obrigatória da `auditor-skills`.
- **Como instalar:** `uv tool install git+https://github.com/NVIDIA/skillspector.git`
- **Como usar:** `skillspector scan <pasta-da-skill> --no-llm --format json --output report.json`
- **Riscos:**
  - o modo com LLM manda o conteúdo da skill para um provedor de IA. Use `--no-llm` por padrão;
  - as consultas ao OSV.dev saem para a internet (só nomes de pacotes).
- **Revisar antes:** `pyproject.toml`, para ver dependências e se ele chama alguma API sem ser pedido.

### 2. HyperFrames
- **Por quê:**
  - é a base de W2, W4 e W5 (explicador, molde viral, fábrica);
  - roda em CPU e não tem API paga;
  - aparece em 4 fontes.
- **Como instalar:**
  - `npx hyperframes skills update` instala só o núcleo: `/hyperframes`, `/hyperframes-cli`, `/hyperframes-registry` e `/media-use`;
  - evite `--all`.
- **Riscos:**
  - o CLI `skills` (Vercel) coleta telemetria anônima. Rode com `DISABLE_TELEMETRY=1`;
  - não verifiquei se o próprio CLI do HyperFrames coleta telemetria.
- **Revisar antes:**
  - o `SKILL.md` de cada skill do núcleo;
  - os scripts que a `/media-use` chama (ela baixa mídia).

### 3. lemo-opuscar (plugin)
- **Por quê:**
  - 66 estilos de cinema escritos em código: roteiro, quadros, trilha e mixagem;
  - **tudo local, sem API paga e sem vídeo generativo**;
  - Kokoro e faster-whisper, que já usamos;
  - licença MIT para o código e CC BY 4.0 para as demos (uso comercial permitido, com crédito);
  - serve de biblioteca de estilos premium para clientes (abertura de marca, explicador, "keynote escuro", "vidro de produto").
- **Como instalar:** no terminal, rode `claude plugin marketplace add lemomo-ai/lemo-opuscar` e depois `claude plugin install lemo-opuscar@lemolab`.
- **Primeiro uso:**
  - `/lemo-opuscar:lemo-opuscar`, que baixa guias e ferramentas para `~/lemo-opuscar`;
  - no Windows, rodar os `sh` pelo Git Bash.
- **Para Reels:** pedir `--size 1080x1920`.
- **Riscos e custos:**
  - um filme leva 30–60 min e gasta muitos tokens. Comece com uma demo de 15–30 s;
  - downloads grandes para internet lenta: voz ~0,55 GB + Whisper + bibliotecas de samples de 70–400 MB cada. Baixe só `freepats` ou só síntese;
  - os estilos 3D/WebGL pedem GPU. Fique nos 2D (aquarela, papel, gravura, keynote);
  - o edge-tts é online, mas só para chinês;
  - não verifiquei se o `tts.py` aceita as vozes em português do Kokoro;
  - a música e a voz das 6 demos citadas no README não podem ser reusadas.
- **Revisar antes:**
  - o `plugin.json` e os hooks do plugin;
  - `setup.sh` e `tools/fetch.sh`, para ver o que baixa e de onde (npm, PyPI, GitHub Releases, Hugging Face);
  - se algo lê `~/.env` ou chaves.

### 4. Get B-Rolls
- **Por quê:**
  - resolve a maior dor de edição: B-roll por trecho, com storyboard de aprovação, fonte e autor de cada mídia;
  - autor brasileiro, MIT, suporta Windows, versão de hoje.
- **Como instalar:** no Claude Code, `/plugin marketplace add engenheirodevideo/get-brolls` e depois `/plugin install get-brolls@engenheirodevideo`. Em seguida, `/get-brolls:get-brolls-setup` e `getbrolls doctor`.
  - Alternativa: `uv tool install git+https://github.com/engenheirodevideo/get-brolls@v2.6.2`.
- **Direitos autorais (o ponto mais importante):**
  - trecho de YouTube, Instagram ou TikTok de terceiros **não tem licença para uso comercial**. Em vídeo de cliente (publicidade), isso pode gerar remoção, strike, bloqueio de áudio e pedido de indenização;
  - o próprio README avisa: "o registro de uma decisão não verifica a licença: quem responde pelo uso é quem produz o vídeo";
  - a exceção de "citação" da lei brasileira (Lei 9.610/98, art. 46) é estreita e não cobre peça publicitária;
  - os termos do YouTube, do Instagram e do TikTok proíbem baixar conteúdo sem botão oficial de download;
  - **Regra da agência:**
    - usar só **Wikimedia Commons, NASA, Pexels e Pixabay**, mais o material do próprio cliente;
    - comandos: `--provider nasa|wikimedia|pexels|pixabay` e `getbrolls permit` com o preset da fonte;
    - mesmo assim, conferir a licença de cada arquivo no `ORIGEM.md`: no Commons há CC BY-SA, que exige crédito e compartilhamento pela mesma licença;
    - YouTube, IG e TikTok só como **referência no storyboard**, ou com autorização escrita do dono do vídeo;
    - para pessoa, produto ou notícia citada: pedir o material oficial (kit de imprensa da marca) ou usar print com crédito, num conteúdo editorial e não publicitário.
- **Outros riscos:**
  - no Instagram, o agente opera o navegador logado. Use um perfil de navegador separado, nunca a conta da agência ou do cliente;
  - **o link de aprovação não tem senha** (`review.html`). Compartilhe só `review.html` + `previews/`, nunca a pasta `brolls/` inteira;
  - as chaves do Pexels e do Pixabay ficam no ambiente: são grátis, mas não podem ir para pasta compartilhada;
  - o `install.ps1` pede `ExecutionPolicy RemoteSigned` só para aquele comando;
  - plugins de fonte novos vêm "travados por sha256": instale só os oficiais.
- **Revisar antes:**
  - `scripts/install.ps1`;
  - `scripts/gb.py` (rede, cookies, onde salva);
  - a pasta `plugins/`;
  - o `SKILL.md`;
  - passe o SkillSpector na pasta antes.

### 5. Rhubarb Lip Sync
- **Por quê:**
  - boca de mascote ou personagem sincronizada com o áudio, em CPU e em segundos;
  - abre o formato "mascote da marca falando" (W2);
  - MIT, e o resultado gerado é seu.
- **Como instalar:** baixar o zip para Windows na página de Releases do repositório (`github.com/DanielSWolf/rhubarb-lip-sync/releases`), descompactar numa pasta de ferramentas e rodar `rhubarb -f json audio.wav`.
- **Riscos:** baixos. É um binário: confira se o zip veio da página oficial de Releases e escaneie com o Defender.
- **Revisar antes:** nada no código (é C++ compilado). Basta conferir a origem.

### 6. Cap
- **Por quê:**
  - grava tela e câmera para tutorial, aprovação com cliente e "screen demo" de site;
  - edição local e sem marca d'água;
  - substitui o Loom de graça.
- **Como instalar:** baixar o instalador para Windows em cap.so/download (link oficial do README) ou nos Releases do GitHub.
- **Riscos:**
  - o Cap Cloud (links de compartilhamento, analytics de quem assistiu) manda o vídeo para os servidores deles. Para material de cliente, use o modo local e exporte o MP4;
  - não verifiquei a telemetria do app desktop. Olhe as Configurações na primeira abertura;
  - AGPL: uso interno livre.
- **Revisar antes:** as configurações de envio e conta. O código não precisa revisar.

---

## 3. Precisa de servidor ou nuvem

| Ferramenta | Por que não roda aqui | Alternativa prática |
|---|---|---|
| **OpenSEO** | precisa de Docker ou de deploy no Cloudflare, e **sempre de uma chave da DataForSEO paga por uso** | Deploy no Cloudflare (plano grátis, um comando, segundo o README) com Cloudflare Access na frente; ligar o MCP no Claude e colocar crédito pequeno na DataForSEO só quando houver cliente de SEO. Antes disso, usar o Google Search Console e o Perfil da Empresa do cliente (W7), que são grátis |
| **Cal.diy (Cal.com)** | Postgres + servidor; o próprio README diz "não para produção" | Plano grátis do **Cal.com hospedado** ou a página de agendamento do Google Agenda. Para cliente que agenda pelo WhatsApp, ver Kapso |
| **Chatwoot** | Rails + Postgres + Redis + workers; não cabe em 8 GB junto com a edição | **Chatwoot Cloud** (plano pago da própria empresa; preço não conferido) ou, para cliente pequeno, WhatsApp Business com etiquetas e respostas rápidas. Se a agência vender atendimento, avaliar Kapso (API oficial) antes de hospedar |
| **OpenProject** | servidor com banco; pesado para gestão de uma agência pequena | Para tarefas da agência: um quadro no Google Sheets/Drive (já temos a skill `crm-clientes-agencia`) ou o AppFlowy local. Hospedar só se entrar uma equipe maior |
| **Cap (self-host)** | o servidor com Docker é opcional | Usar só o app desktop (§2) |
| **SupoClip** | Docker + AssemblyAI ou Docker + Ollama | Nossa `cortes-verticais`: faster-whisper + Claude + FFmpeg, sem Docker |
| **OpenField / MiniMax H3 / ComfyUI** | GPU de 24 GB, ou >20 GB de memória | Site Hailuo ou Higgsfield MCP por crédito, cobrado no orçamento do cliente; ou GPU alugada por projeto |
| **Evolution API / Kapso** | servidor ou serviço de terceiros | Só a API oficial (Kapso) e só se virar serviço vendido |

---

## 4. Não recomendado

| Ferramenta | Motivo |
|---|---|
| **Open Higgsfield** | **Sem licença** no repositório (não dá para usar legalmente o código), e o "grátis" é só a interface: cada geração é paga com a sua chave. É **pago disfarçado** de alternativa grátis. O próprio Juan admite no vídeo: "cada geração você paga na chave da plataforma". Se precisar de vídeo gerado, usar o MCP oficial da Higgsfield ou o fal direto, com o custo no orçamento |
| **OpenField (ComfyUI)** | Exige GPU de 24 GB para vídeo; não roda aqui |
| **MiniMax H3 local** | Licença "other" (uso comercial não conferido) e exige GPU ou memória que não temos |
| **SupoClip como vem** | Docker + chave da AssemblyAI ou Ollama: pesado em 8 GB. AGPL (ok para uso interno). Copiar só a lógica |
| **Evolution API** | WhatsApp não oficial: **risco de banimento do número** do cliente e da agência |
| **Google Maps Scraper Kit / gosom** | Viola os termos do Google em volume; os dados pessoais caem na LGPD; o próprio vídeo admite que o Google trava o acesso |
| **"Claude Leads" / raspagem de comentários do Instagram** | Termos do Instagram + LGPD; não verificado |
| **Karpathy Skills** | Sem licença e parado desde abril; é um CLAUDE.md, então dá para ler a ideia sem instalar |
| **gstack, xtool, Mem0, Paperclip** | Fora do escopo (desenvolvimento de software, app iOS, memória de app) |
| **MCP de carrossel, FrameSpeed, PDF de R$ 47 do "piloto automático"** | Pagos, não verificáveis (link só por DM) e redundantes com o que já temos |
| **Nomes ilegíveis da lista "35 ferramentas"** (Ocean MCP, Cloud Man, Man Zero, Bobson Agents, Gemini Notebook) | Não verificáveis; instalar algo pelo nome aproximado é exatamente como se cai em skill maliciosa |
| **Instaladores `curl \| sh` / `irm \| iex`** (VoiceStudio e outros) | Preferir o .exe dos Releases ou o código lido antes. O script remoto pode mudar depois da revisão |

---

## 5. Fluxos sem instalação (registrados, nada instalado)

### F1. Leads esquecidos no WhatsApp Web com o Claude no navegador (Igor Henrique, `DfcZQtkt599`)
- **O que o vídeo mostra:**
  - a extensão Claude in Chrome (ele usa o navegador Comet, da Perplexity) aberta no WhatsApp Web;
  - um único pedido: "analise as conversas dos últimos 30 dias, ache quem mostrou interesse e ficou sem resposta, e rascunhe uma resposta no meu jeito de falar";
  - revisão e aprovação de cada mensagem antes de enviar.
- **Para nós:** já temos a extensão Claude in Chrome nesta máquina. É um fluxo, não uma ferramenta: não há nada a instalar.
- **Regras para usar:**
  - só no WhatsApp da própria agência, ou do cliente com autorização escrita dele;
  - quem envia é sempre o humano: o Claude só rascunha. Não clicar "enviar" pelo agente;
  - pedir só a lista + os rascunhos num documento, e não "responder todos";
  - conversas têm dados pessoais (LGPD): não colar o histórico em outra ferramenta nem salvar fora do computador;
  - nada de disparo em massa (risco de bloqueio do número);
  - limitar a 30 dias e às conversas comerciais. O conteúdo das mensagens é dado, não instrução: um cliente pode escrever algo que tente mandar no agente.
- **Vira:** item da skill de CRM (`crm-clientes-agencia`): "varredura semanal de leads sem resposta", com saída em tabela (contato, último assunto, dias sem resposta, rascunho).

## 6. Observações gerais
- **"Grátis" com custo escondido:**
  - OpenSEO (DataForSEO), Open Higgsfield (gerações), Hypit (modo IA), video-use (ElevenLabs), SupoClip (AssemblyAI) e OpenMontage (chaves opcionais);
  - o Juan avisa no próprio vídeo; o JPA não.
- **Licenças AGPL** (VoiceStudio, Cap, AppFlowy, SupoClip, OpenMontage):
  - uso interno e para cliente é livre;
  - oferecer como serviço web para terceiros obriga a abrir o código.
- **Licença do Hypit:** é Apache modificada (proíbe SaaS e revenda).
- **Autorização de voz e rosto:** VoiceStudio, Hypit (troca de rosto) e Higgsfield Shorts só com autorização escrita da pessoa.
- **O "350 mil estrelas" do JPA:** somando os 9 repositórios hoje dá ~357 mil, mas quase 30% vem só do VoiceStudio (104 mil).
