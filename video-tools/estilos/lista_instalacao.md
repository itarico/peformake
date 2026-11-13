# Lista final de instalação: skills e repositórios (10/11/2026)

**Para que serve:** a lista do que instalar para deixar o "programa de edição" (Claude Code + skills) o mais completo possível, só com o que é grátis, roda neste notebook e permite uso comercial.
**Máquina:** Windows 11, 8 GB de RAM, sem GPU forte, internet lenta. Já tem Node 26, Python 3.12, FFmpeg 9 (Gyan, **com `drawtext`**: conferido hoje), Remotion (projeto + plugin `remotion:*`), Kokoro, faster-whisper, yt-dlp e Claude Code desktop.
**Como foi feito:** **nada foi instalado.**
- Licença, estrelas e último push saíram da API pública do GitHub em 10/11/2026.
- Os comandos de instalação saíram do README oficial de cada repositório.
- A base é `ferramentas_citadas.md`; os itens novos foram verificados hoje.
- Estrelas mudam rápido; servem só para dar ideia do tamanho.

**Já instalado ou baixado (conferido hoje):**
- **Em `%USERPROFILE%\.claude\skills`:**
  - 9 `ffmpeg-*`: animation-timing, color-grading, effects-scripts, glitch, karaoke, kinetic-captions, shapes, transitions e waveforms;
  - 3 `viral-video-*`: animated-captions, hook-templates e platform-specs;
  - `motion-broll` e `sound-effects`: as duas vêm de `Barty-Bart/motion-graphics` (MIT);
  - `real-sfx` (Clipwing).
- **Plugins:** `remotion:*` e `anthropic-skills:*`. O `anthropic-skills:*` já inclui o **skill-creator**.
- **Em `D:\PEFORMAKE\_ferramentas\`:**
  - `earshot` (em instalação);
  - `clipwing-skills` (inclui `hyperframes-to-after-effects`);
  - `hand-drawn-video`: **baixado, mas ainda não está na pasta de skills**.

**Atenção sobre os comandos:**
- O comando `claude` **não está no PATH** deste PC (só o app desktop está instalado). Por isso, os comandos de plugin abaixo estão no formato de barra, para digitar **dentro do Claude Code**: `/plugin marketplace add …` e `/plugin install …`.
- `claude plugin …` só funciona no terminal se o CLI for instalado.

---

## 0. Pré-requisitos (antes do item 1)

| O quê | Comando (PowerShell) | Por quê |
|---|---|---|
| **uv** (não está instalado) | `winget install --id=astral-sh.uv -e` | Usado pelo SkillSpector, Get B-Rolls e RTK. Preferir o winget ao `irm … \| iex` do site |
| Git for Windows (Git Bash) | `git --version` (se faltar: `winget install --id Git.Git -e`) | lemo-opuscar, Context Mode e scripts `.sh` rodam pelo Git Bash |
| Telemetria do CLI `skills` desligada | `setx DISABLE_TELEMETRY 1` (e abrir um terminal novo) | O `npx skills` (Vercel) coleta telemetria anônima por padrão |
| Pasta de quarentena | `mkdir D:\PEFORMAKE\_quarentena` | Tudo é baixado aqui primeiro, passa pelo SkillSpector e só depois vai para `.claude\skills` |

**Regra para todos os itens:**
1. `git clone` para `_quarentena`.
2. `skillspector scan <pasta> --no-llm --format json --output <nome>.json`.
3. Ler o relatório e os arquivos da coluna "Revisar".
4. Só então instalar.
5. Registrar em `skills_instaladas.md`.

---

## 1. INSTALAR (ordem recomendada)

Todos são grátis, rodam aqui e têm licença que permite uso comercial.

| # | Nome | URL | Licença | O que faz para nós | Requisitos / roda aqui? | Riscos | Comando oficial (Windows) | Revisar antes |
|---|---|---|---|---|---|---|---|---|
| 1 | **SkillSpector** (NVIDIA) | github.com/NVIDIA/SkillSpector (25,2 mil ★, push 10/11) | Apache-2.0 | Escaneia skills, plugins e MCPs antes de instalar: 71 padrões de prompt injection, exfiltração etc. É a 1ª etapa obrigatória para todo o resto | Python 3.12+ e uv. **sim** | O modo com LLM manda o conteúdo da skill para OpenAI/Anthropic: usar sempre `--no-llm`. Consulta o OSV.dev (só nomes de pacotes; tem modo offline) | `uv tool install git+https://github.com/NVIDIA/skillspector.git` · uso: `skillspector scan <pasta> --no-llm` | `pyproject.toml` (dependências); confirmar que sem chave ele não chama API |
| 2 | **HyperFrames** (HeyGen) | github.com/heygen-com/hyperframes (82,3 mil ★, push 11/11) | Apache-2.0 | **Núcleo de vídeo:** motion e vídeo em HTML/CSS/JS renderizado em MP4. É a base dos explicadores, do molde viral e de hand-drawn-video, Get B-Rolls, kinetic etc. App Studio para Windows | Node + Chrome headless + FFmpeg. **sim**, mas lento: no teste da lista awesome, um filme de 15 s levou 23,5 min | Não verifiquei se o CLI do HyperFrames tem telemetria. A `/media-use` baixa mídia da internet | Plugin: `/plugin marketplace add heygen-com/hyperframes` → `/plugin install hyperframes@hyperframes`. Ou: `npx hyperframes skills update` (instala o núcleo pela tag da versão). **Evitar `--all`** | `SKILL.md` do núcleo (`/hyperframes`, `/hyperframes-cli`, `/hyperframes-registry`, `/media-use`, `/reverse-any-video`, `/style-sampling`); os scripts da `/media-use` |
| 3 | **Find Skills / CLI `skills`** (Vercel) | github.com/vercel-labs/skills (38,9 mil ★) | MIT | Instalador padrão (`npx skills add …`) usado por Anatomy, Lottie, ElevenLabs etc.; `npx skills find` busca skills | Node 22.20+. **sim** | Telemetria anônima ligada por padrão (desligar no passo 0). Instala de qualquer repositório: só usar depois do SkillSpector | Não precisa instalar: `npx skills find <termo>` / `npx skills add <dono/repo> -g -a claude-code` | O que o `add` grava e onde (`npx skills list`) |
| 4 | **Claude Code Setup** (oficial da Anthropic) | github.com/anthropics/claude-plugins-official, pasta `plugins/claude-code-setup` (46,8 mil ★) | Apache-2.0 | Analisa a pasta do projeto (ex.: `peformake\video-tools`) e recomenda hooks, skills, MCPs e subagentes. **Só lê, não altera nada** | **sim** | Baixo (é oficial). As recomendações dele também têm de passar pelo SkillSpector | `/plugin install claude-code-setup@claude-plugins-official` (o marketplace oficial já vem no Claude Code) | Conferir que veio de `anthropics/…`: há forks com o mesmo nome em outros donos |
| 5 | **Get B-Rolls 2.6** | github.com/engenheirodevideo/get-brolls (235 ★, push 09/11) | MIT | B-roll por trecho do roteiro, com storyboard `review.html` e a origem e licença de cada clipe. Tem ponte oficial para o HyperFrames | Python 3.11+, FFmpeg com drawtext (ok), Node 22+, yt-dlp e Playwright. **sim** | **Direitos autorais:** usar só NASA, Wikimedia, Pexels e Pixabay; YouTube, IG e TikTok só como referência (ver `ferramentas_citadas.md` §2.4). O `review.html` não tem senha. As chaves grátis do Pexels e do Pixabay não podem ir para pasta compartilhada | `/plugin marketplace add engenheirodevideo/get-brolls` → `/plugin install get-brolls@engenheirodevideo` → `/get-brolls:get-brolls-setup` → `getbrolls doctor` | `scripts/install.ps1`, `scripts/gb.py`, pasta `plugins/`, `SKILL.md` |
| 6 | **lemo-opuscar** | github.com/lemomo-ai/lemo-opuscar (14,5 mil ★, push 10/11) | MIT (código); CC BY 4.0 (demos) | 66 estilos de filme em código (roteiro, quadros, trilha, mix); voz Kokoro local; **sem API paga**. Na lista awesome, a nota de segurança é SAFE | Node 20+, FFmpeg 7+, Python 3.11+. **sim nos 2D**, pesado nos 3D/WebGL | Downloads grandes (~0,55 GB de voz + 70–400 MB por biblioteca de samples): baixar só uma. Um filme leva 30–60 min e gasta muitos tokens. As 6 narrações de demo não podem ser reusadas | `/plugin marketplace add lemomo-ai/lemo-opuscar` → `/plugin install lemo-opuscar@lemolab` → `/lemo-opuscar:lemo-opuscar`. Rodar os `.sh` pelo Git Bash. Vertical: `--size 1080x1920` | `plugin.json`, hooks, `setup.sh`, `tools/fetch.sh` (o que baixa e de onde); se lê `.env` |
| 7 | **hand-drawn-video** | github.com/ouerf-man/hand-drawn-video (**2 ★**, push 04/11) | MIT | Animação "desenhada à mão" (lápis, carvão, aquarela, giz) com p5.brush **dentro do HyperFrames**: explicador, história e "redesenhar vídeo real". Contra a cara de IA (Disalp, Natália, aberturas) | Node 18+, Python 3.10–3.12 em venv próprio. **sim**; o redraw usa TensorFlow (pesado) | Repositório novo e **quase sem estrelas**: o SkillSpector é obrigatório. O `brushlib.py` baixa o p5.brush (~110 KB); o redraw baixa 2 modelos de rosto (~4 MB) | Já baixado em `D:\PEFORMAKE\_ferramentas\hand-drawn-video`. Copiar a pasta para `%USERPROFILE%\.claude\skills\hand-drawn-video`, depois `py -3.12 -m venv %USERPROFILE%\.cache\hand-drawn-video\venv` → `…\venv\Scripts\python.exe scripts\brushlib.py`. **Pular o `requirements.txt`** (TensorFlow) até precisar do redraw | `scripts/brushlib.py` (URL do download), `requirements.txt`, `usecases/redraw-video/drawify.py` |
| 8 | **Anatomy** (animações isométricas) | github.com/wheresryan22/anatomy (26,5 mil ★, push 18/10) | MIT | Figuras isométricas animadas: uma "máquina" cujo funcionamento explica o conceito (SVG sombreado, WebGL opcional). Para explicadores da MF (máquina em isométrico) | Node 20.10+; **zero dependências**, sem chave. **sim**; o modo 3D é beta | Baixo: só usa módulos internos do Node | `npx skills add wheresryan22/anatomy -g -a claude-code` (ou `git clone https://github.com/wheresryan22/anatomy.git %USERPROFILE%\.claude\skills\anatomy`) | Os scripts do kit (procurar `fetch`/`http`); o `SKILL.md` |
| 9 | **claude-video-effects** | github.com/Vibha-Ramprakash/claude-video-effects (851 ★, push 09/11) | MIT (o arquivo LICENSE confirma; a API não detecta) | 51 efeitos para talking head (`/effects orbit`): rastreio de rosto, **texto atrás da pessoa**, recorte. É a gramática E1/E16 que o Italo quer | Python + FFmpeg; OpenCV YuNet e MediaPipe rodam em CPU. **sim** (lento em clipe longo) | Na 1ª execução ele mesmo instala o que falta: rodar em venv e não deixar mexer no Python do sistema | `git clone https://github.com/Vibha-Ramprakash/claude-video-effects $HOME\.claude\skills\effects` | O script de setup (o que instala com pip e de onde baixa os modelos) |
| 10 | **explainroo** | github.com/vincentsch/explainroo (1,2 mil ★, push 10/11) | MIT | Explicador ou demo de produto em ~2 min. Foi o **1º colocado** no teste da lista awesome: voz Kokoro local, tempo por palavra com Whisper, renderizador canvas. **Sem telemetria** | Node via `npx`; espeak-ng para alguns idiomas. **sim** | ElevenLabs e Cartesia são opcionais (pagos). `formats add` clona repositório de terceiros: só com SkillSpector | `npx --yes explainroo docs` (o agente segue o que ele imprime) · `npx --yes explainroo doctor --fetch` | O que o `doctor --fetch` baixa; testar se o Kokoro dele aceita pt-BR (`--language pt`) |
| 11 | **Rhubarb Lip Sync** | github.com/DanielSWolf/rhubarb-lip-sync (2,8 mil ★) | MIT | Boca de mascote ou personagem sincronizada com o áudio, em CPU, em segundos (formato "mascote da marca falando") | Binário de linha de comando. **sim** | Baixo: conferir se o zip veio dos Releases oficiais e passar no Defender | Baixar o zip para Windows em `github.com/DanielSWolf/rhubarb-lip-sync/releases` → `D:\PEFORMAKE\_ferramentas\rhubarb` → `rhubarb -f json audio.wav` | Só a origem do zip |
| 12 | **Cap** | github.com/CapSoftware/Cap (24,8 mil ★); cap.so/download | AGPL-3.0 (uso interno livre) | Gravação de tela e câmera local, sem marca d'água (substitui o Loom). Para tutorial e aprovação com cliente | App nativo para Windows. **sim** | O Cap Cloud envia o vídeo para os servidores deles: usar só o modo local. Olhar telemetria e conta na 1ª abertura | Instalador em cap.so/download ou nos Releases do GitHub | Configurações de envio e conta |
| 13 | **RTK** (economia de tokens no terminal) | github.com/rtk-ai/rtk (86,1 mil ★, push 10/11) | CLI Apache-2.0 + engine BUSL-1.1 (o README diz: **"uso em produção é grátis"**; só não pode revender como serviço) | Resume a saída de comandos (ffmpeg, npm, testes) antes de o Claude ler: "até 90 %", número do fabricante. Economiza o plano nos estudos e renders | Binário; winget oficial. **sim** | **Telemetria desligada por padrão.** O hook reescreve comandos de shell: se um comando parar de mostrar o que precisa, desativar. **Não ativar** o `rtk-proxy`/`rtk claude` (fica no meio do tráfego com a API) nem o "arquivo grande para modelo mais barato" (pede outra chave) | `winget install rtk-ai.rtk` → `rtk init -g` → medir com `rtk gain` | O que o `rtk init -g` grava no `settings.json` (hook); recusar a oferta do proxy |
| 14 | **Impeccable** (opcional: só para LP/site de cliente) | github.com/pbakaus/impeccable (107,6 mil ★) | Apache-2.0 | Skill de design de UI + **detector de "cara de IA"** em páginas, com 62 regras sem LLM (`npx impeccable detect <url>`). Útil nas LPs da agência; não serve para vídeo | Node. **sim** | Ao iniciar um design, busca direções no catálogo impeccable.style (rede); a telemetria anônima pode ser desligada. O instalador oferece um **hook** de design: aceitar só no projeto de LP, não no global | `/plugin marketplace add pbakaus/impeccable` → `/plugin` → instalar. Ou `npx impeccable install` (escolher "projeto") | O hook que ele escreve; o que o `detect` envia |

**Também a fazer (já iniciado hoje):**
- **earshot:** terminar a instalação em `D:\PEFORMAKE\_ferramentas\earshot`, num venv próprio, e passar o SkillSpector.
- **clipwing `hyperframes-to-after-effects`:** só instalar se o Italo usar After Effects (transforma o HyperFrames em projeto editável).

---

## 2. PRECISA DE PAGAMENTO OU CHAVE

| Nome | URL | Licença | O que faria | Custo | Riscos | Alternativa grátis (já temos ou está acima) |
|---|---|---|---|---|---|---|
| **Skills oficiais da ElevenLabs** | github.com/elevenlabs/skills (550 ★, push 10/11) | MIT (as skills) | Text-to-speech, efeitos sonoros, música, transcrição e agentes de voz; `npx skills add elevenlabs/skills` | **Todas exigem `ELEVENLABS_API_KEY`.** O uso é cobrado por crédito do plano. O plano grátis da ElevenLabs historicamente **não dá licença comercial** (conferir em elevenlabs.io/pricing antes de usar em cliente) | A skill `onboarding` grava a chave no `.env` do projeto: nunca em pasta compartilhada | Voz: **Kokoro** (local). SFX: **real-sfx + sound-effects + earshot**. Transcrição: **faster-whisper** |
| **video-use** (Browser Use) | github.com/browser-use/video-use (30,9 mil ★) | MIT | Edição conversando, que confere o próprio corte até 3× | Grátis, mas **exige chave da ElevenLabs** (Scribe, pago depois da cota). O README usa `brew` (macOS) | Pede a chave dentro do chat ("cole aqui"): não colar chave no chat | Copiar só a lógica de autoconferência para a nossa skill de edição, com faster-whisper |
| **Higgsfield MCP** | conector `https://mcp.higgsfield.ai/mcp` (OAuth, sem chave) | proprietário | Vídeo e imagem gerados por IA para cenas que não dá para filmar | **Plano pago obrigatório.** Cada geração pelo MCP gasta crédito, mesmo nos planos "ilimitados" do site. Preços divergem entre as fontes: Starter ~US$ 19/mês (270 créditos), Plus ~US$ 39–49/mês (1.000 créditos), ~60 créditos por clipe de 5 s em 1080p. O teste de 3 dias pede cartão e **renova sozinho como Plus**. A própria Higgsfield recomenda o CLI no lugar do MCP para o Claude Code | Uso de rosto e voz só com autorização escrita | Motion por código (HyperFrames, lemo-opuscar, hand-drawn-video); banco grátis (Pexels/Pixabay via Get B-Rolls). Usar a Higgsfield **só por projeto, cobrada no orçamento do cliente**, com o "guarda-créditos" (`estudo_maestros_ia.md` item 14) |
| Hypit (modo IA) | github.com/hypit-ai/hypit | Apache-2.0 modificada (proíbe SaaS e revenda) | Troca de rosto, voz e vídeo gerado | API paga (exemplo do README: US$ 1,09 por vídeo) | Autorização de imagem | O modo "renderizado por código" é grátis: TESTAR depois do núcleo |
| OpenSEO | github.com/every-app/open-seo | MIT | SEO com MCP | Chave paga da DataForSEO (por consulta) | — | Google Search Console (ver `ferramentas_citadas.md` §3) |
| motionmaxxing (voz e som) | github.com/Tejashmakwana/motionmaxxing (1,5 mil ★) | Apache-2.0 (o GSAP embutido tem licença própria, não aberta) | "Tira a cara de IA" de motion | O vídeo sai grátis; voz, SFX e música pedem ElevenLabs | — | Sem chave ele faz filme mudo; som com real-sfx |

---

## 3. NÃO RODA NESTE PC (GPU ou servidor)

| Nome | URL | Por que não roda | Alternativa |
|---|---|---|---|
| **LTX Trainer** (treinar modelo próprio de vídeo) | github.com/Lightricks/LTX-2 (pacote `ltx-trainer`, Apache-2.0); o antigo LTX-Video-Trainer está parado desde 01/2026 | O README pede **GPU NVIDIA com 80 GB+ de VRAM**, ou 32 GB no modo de pouca VRAM (ex.: RTX 5090) | Consistência de estilo por "style prompt" + estilos do lemo-opuscar e a gramática do `receitas_estilos.md`. Se um cliente pagar, alugar GPU por hora (Modal ou RunPod) só para aquele projeto |
| claude-shorts | github.com/AgriciDaniel/claude-shorts (MIT) | No Windows exige **WSL 2**; GPU NVIDIA recomendada (CUDA/NVENC) | Nossa `cortes-verticais` (faster-whisper + Claude + FFmpeg) |
| claude-code-video-toolkit (digitalsamba) | github.com/digitalsamba/claude-code-video-toolkit (MIT) | Os modelos (Qwen3-TTS, FLUX.2, ACE-Step) rodam em **GPU na nuvem** (Modal/RunPod). O Modal dá US$ 30/mês grátis, mas exige conta e cartão | Kokoro + HyperFrames local. A busca de SFX CC0 dele pode ser lida como ideia |
| ltx2-vidgen-skill | github.com/patraxo/ltx2-vidgen-skill | LTX-2.3 (22B) numa GPU do Modal | Igual ao LTX Trainer |
| OpenField / MiniMax H3 / ComfyUI | ver `ferramentas_citadas.md` | GPU de 24 GB ou mais de 20 GB de memória | Higgsfield por crédito, cobrado do cliente |
| SupoClip | github.com/FujiwaraChoki/supoclip | Docker + AssemblyAI ou Ollama: pesado demais para 8 GB | `cortes-verticais` |
| OpenProject, Chatwoot, Cal.diy | ver `ferramentas_citadas.md` §3 | Servidor com Postgres | Versões hospedadas, só se precisar |

---

## 4. NÃO INSTALAR

| Nome | URL | Motivo |
|---|---|---|
| **Headroom** (compressão de contexto) | github.com/chopratejas/headroom → hoje **headroomlabs-ai/headroom** (Apache-2.0, 79 mil ★) | O `headroom wrap claude` coloca um **proxy entre o Claude Code e a API**: todo o tráfego e a credencial passam por ele. Pede Python 3.13 para o CLI (temos 3.12). Faz o mesmo que o RTK. Reavaliar só se o RTK não bastar, e no modo biblioteca, nunca como proxy |
| **Context Mode** | github.com/mksglu/context-mode (33,8 mil ★) | A licença é **Elastic License 2.0** (fonte disponível: uso interno liberado, revenda como serviço proibida), então pode. Mas instala hooks que interceptam **todas** as ferramentas (Read, WebFetch, curl, Bash) e tem uma parte opcional de assinatura (Gateway). Faz o mesmo que o RTK. **Não instalar junto com o RTK**: escolher um. Se um dia trocar: `/plugin marketplace add mksglu/context-mode` → `/plugin install context-mode@context-mode` (Node 24.15+, ok) |
| **Clipify** | github.com/louisedesadeleer/clipify (MIT, 640 ★) | Feito para **macOS**: usa a flag `-hwaccel videotoolbox` e o `openai-whisper` (PyTorch, pesado em CPU). Faz o mesmo que a nossa `cortes-verticais`. Copiar só a ideia ("achar momentos engraçados + reenquadrar 9:16 pelo rosto + legenda") |
| **Skill Creator** (Anthropic) | `anthropics/skills` e `claude-plugins-official/plugins/skill-creator` | **Já temos** (`anthropic-skills:skill-creator`) |
| **Skills oficiais do Remotion** | github.com/remotion-dev/skills | **Já temos** o plugin `remotion:*`. O repositório não declara licença; o Remotion exige licença paga para empresa com mais de 3 pessoas (ver `/remotion-license`) |
| **"Instagram Skills" (reel do Murilo Abreu)** | **não identificado**: nenhum repositório com 9 skills de Instagram ligado a esse nome | Instalar "pelo nome aproximado" é como se cai em skill maliciosa. O mais próximo: CreatorFlow (creatorflow.so/pt/skills: **8** skills, MIT, em zip, sem repositório no GitHub) e `coreyhaines31/marketingskills --skill social` (MIT). As nossas `mdd`, `redator-*`, `carrossel-de-reel` e `performake-content-agent` já cobrem legenda, carrossel, pauta e "tirar cara de IA". Pedir o link exato ao Italo se ainda quiser |
| **onetake** | github.com/feitangyuan/onetake (4 mil ★) | Licença **PolyForm Noncommercial**: proíbe uso comercial (a versão comercial é paga, "onetake Pro"). Nosso `motion-broll` já faz o estilo "uma forma que nunca corta" |
| OpenMontage | github.com/OpenMontageInc/OpenMontage | Nota **CAUTION** na lista awesome; AGPL; Python + Remotion + 700 arquivos; pesado. Só ler a estrutura dos pipelines |
| Open Higgsfield | github.com/wide-trace/open-higgsfield | Sem licença; cada geração é paga ("pago disfarçado") |
| ClaudeAnimationBase | github.com/JohnHeibel/ClaudeAnimationBase (MIT) | O README avisa que, sem GPU, a aquarela do p5.brush leva segundos por quadro. Faz o mesmo que o hand-drawn-video, que já usa p5.brush + HyperFrames |
| anidoodle | github.com/alexgreensh/anidoodle (Apache-2.0, 1,6 mil ★) | Bom e mais maduro que o hand-drawn-video, mas faz a mesma coisa. **Fica de reserva:** se o hand-drawn-video reprovar no SkillSpector ou no teste, instalar este (`/plugin marketplace add alexgreensh/anidoodle` → `/plugin install anidoodle@alexgreensh-anidoodle`) |
| Evolution API, Google Maps Scraper, Karpathy Skills, MCP de carrossel, FrameSpeed | ver `ferramentas_citadas.md` §4 | Termos de uso/LGPD, sem licença ou pagos e não verificáveis |

---

## 5. Duplicados e sobreposições com o que já temos

| Área | O que se sobrepõe | Decisão |
|---|---|---|
| **Som** | `sound-effects` (Barty-Bart: biblioteca CC0 embutida, mix a −16 LUFS) × `real-sfx` (Clipwing: suas bibliotecas + uisfx, nunca sintetiza) × `earshot` ("ouvidos": descreve, mede e escolhe sons) × ElevenLabs SFX (pago) | Ficar com os três grátis, cada um no seu papel: o `real-sfx` **coloca** sons reais, o `earshot` **escuta e confere**, e o `sound-effects` fica para quando não houver biblioteca própria (já traz CC0). Não instalar o SFX da ElevenLabs |
| **Motion** | `motion-broll` (motor próprio `motion.js`/`render.js`, estilo "uma forma") × HyperFrames × lemo-opuscar × explainroo × Remotion | O **HyperFrames é o núcleo** (é o que Get B-Rolls, hand-drawn-video e kinetic usam). O `motion-broll` continua para B-roll de talking head no estilo "uma forma"; ele **não depende** do HyperFrames. lemo-opuscar = biblioteca de estilos de filme; explainroo = explicador rápido; Remotion = quando precisar de React ou de projeto já existente |
| **Legenda** | `viral-video-animated-captions`, `ffmpeg-kinetic-captions` e `ffmpeg-karaoke-animated-text` (ASS/FFmpeg) × `remotion:remotion-captions` × legendas do HyperFrames e do claude-video-effects | Manter: as de FFmpeg são as mais leves (render rápido em 8 GB). Usar a do HyperFrames ou do Remotion só quando a legenda fizer parte do motion |
| **Desenho à mão** | hand-drawn-video × anidoodle × ClaudeAnimationBase | Instalar **só o hand-drawn-video** (já baixado, roda dentro do HyperFrames). anidoodle de reserva |
| **Tokens** | RTK × Context Mode × Headroom | **Só o RTK** (hook simples, telemetria desligada, sem proxy) |
| **Achar e organizar skills** | Find Skills (`npx skills find`) × Claude Code Setup × lista awesome-claude-video-skills | Os dois primeiros se completam: um busca skills na internet, o outro recomenda para o projeto. A lista awesome serve de catálogo (o teste com 16 skills está em github.com/zhuyansen/agent-skills-hub/blob/main/ops/video-runs/RESULTS.md) |
| **Criar skill** | Skill Creator (oficial) × `npx skills init` | Já temos o Skill Creator: não instalar nada |
| **B-roll e mídia** | Get B-Rolls × `/media-use` do HyperFrames | O Get B-Rolls registra a licença de cada clipe (`ORIGEM.md`). A `/media-use` baixa mídia sem esse controle: em vídeo de cliente, preferir o Get B-Rolls |
| **Gravação de tela** | Cap × Tella (US$ 13/mês) × Loom | Cap (grátis, local) |
| **Edição com autoconferência** | video-use × nossa skill de edição | Copiar a lógica, sem a ElevenLabs |
| **Corte vertical** | Clipify × SupoClip × claude-shorts × `cortes-verticais` | Manter a nossa `cortes-verticais` |

---

## 6. O que olhamos na lista awesome-claude-video-skills e ficou de fora

Fonte: github.com/zhuyansen/awesome-claude-video-skills (1,9 mil ★, push 10/11; hoje com 469 repositórios e nota de segurança da Agent Skills Hub).
- **Entraram:** HyperFrames, lemo-opuscar, explainroo e claude-video-effects.
- **Ficaram de fora:**
  - `diffusionstudio/lottie` (MIT): Lottie serve mais para app e web do que para Reels;
  - `Barty-Bart/motion-graphics`: é a origem do nosso `sound-effects` e do `motion-broll`. Se quiser as outras skills do pacote: `npx skills add Barty-Bart/motion-graphics`, escolhendo uma por uma;
  - `adithya-s-k/manim_skill` (MIT): o Manim exige LaTeX e Cairo, pesado para o que ganhamos;
  - `bangtutorial/bang-motion` e `iart-ai/motion-skills`: fazem o mesmo que o HyperFrames.
- **Ressalva:** a nota "SAFE" da lista é dada por um modelo que lê o README. **Não substitui o SkillSpector.**

---

## ✅ INSTALADO (10/11/2026) — onde está e como usar
Código revisado + SkillSpector (`C:\Users\intal\.local\bin\skillspector.exe scan <pasta> --no-llm`) antes de cada um;
alertas revisados à mão (falsos positivos documentados na conversa). Clones de origem em `D:\PEFORMAKE\_ferramentas\`.
| Ferramenta | Onde | Observação |
|---|---|---|
| uv | winget | instalador de ferramentas Python |
| SkillSpector | `~\.local\bin\skillspector.exe` | verificador de segurança de skills |
| HyperFrames 0.9.31 (CLI) + skills hyperframes, -cli, -registry, media-use, reverse-any-video, style-sampling, remotion-to-hyperframes | npm global + `~\.claude\skills\` | versão fixa; telemetria desligada; figma/slideshow não instalados |
| hand-drawn-video | `~\.claude\skills\hand-drawn-video` + venv `~\.cache\hand-drawn-video\venv` | p5.brush 3.0.0 baixado e conferido |
| Real SFX | `~\.claude\skills\real-sfx` | biblioteca: 109 sons de `sound-effects` + 78 UI |
| Earshot 0.4.1 | `D:\PEFORMAKE\_ferramentas\earshot\.venv` + MCP `earshot` em `~\.claude.json` | modelos (~1,1 GB) baixados; ativa na próxima sessão |
| Openverse | `video-tools\scripts\openverse_audio.py` | busca direta na API pública |
| Anatomy | `~\.claude\skills\anatomy` | isométricos explicativos |
| video-effects (claude-video-effects) | `~\.claude\skills\video-effects` | 51 efeitos de talking head |
| lemo-opuscar | `~\.claude\skills\lemo-opuscar` + biblioteca `~\lemo-opuscar` | rodar `setup.sh deps` no 1º uso |
| Get B-rolls | `~\.claude\skills\get-brolls` | 1º uso: `python scripts\gb.py setup` e `doctor`; clientes: só fontes livres |
| Claude Code Setup (claude-automation-recommender) | `~\.claude\skills\` | recomenda automações |
| Rhubarb Lip Sync 1.14.0 | `D:\PEFORMAKE\_ferramentas\rhubarb\Rhubarb-Lip-Sync-1.14.0-Windows\rhubarb.exe` | boca de mascote |
| RTK | winget | **instalado, mas `rtk init -g` NÃO rodado** (mudaria a saída de todo comando do terminal — decidir com o Italo) |
| Cap | winget | gravador de tela (modo local) |
Não instalados de propósito: ver tabelas acima (pagos, GPU, licença, duplicados).
| Get B-rolls runtime | `gb.py setup` + `doctor` ok (11/11) | yt-dlp + Playwright no runtime da skill |
| lemo-opuscar núcleo | `setup.sh deps` ok (11/11) | voz e música só quando um filme pedir (`setup.sh deps voice music`) |
| Demucs 4.1.0 | `D:\PEFORMAKE\_ferramentas\demucs\.venv` | separar voz/bateria/baixo/outros de uma trilha (técnica DC24) |
| auto-editor | **bloqueado pelo Controle de Aplicativo do Windows** (binário sem assinatura) | não mexer na segurança do Windows; usar `decupar.py` + FFmpeg `silencedetect` para corte de silêncios |
