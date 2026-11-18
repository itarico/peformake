# Pesquisa 6: ferramentas e workflows dos 28 vídeos salvos sobre Claude (08/11/2026)

Fonte: `D:\PEFORMAKE\REFERENCIAS\_salvos\claude\Instagram\` (28 reels, 23 perfis). Cada `analise.md` tem a seção "## Estudo (08/11/2026)" com o detalhe por vídeo.
Método: transcrição (todas existiam) + legenda + `sequencia.jpg` (16 quadros). Nada foi instalado nem renderizado.
Contexto da máquina: i7, 8 GB de RAM, sem GPU boa. Já temos: Remotion, HyperFrames (a instalar), Kokoro TTS, yt-dlp, instaloader, faster-whisper, FFmpeg, skills de legenda e de efeitos sonoros, MCP do Premiere.
Objetivo: transformar o que os vídeos mostram em **skills e workflows permanentes da agência**, não só para os clientes atuais.

Avisos gerais:
- Quase todos os posts escondem o link na DM ("comenta X"). Nomes e links abaixo são só o que aparece na tela, no áudio ou na legenda. "(confirmar)" quer dizer que a grafia ou a URL estavam pouco legíveis.
- Estrelas e preços foram lidos na tela na data do post e mudam rápido.
- Nota de prioridade: 5 = testar já; 4 = testar em breve; 3 = avaliar; 2 = só referência; 1 = evitar.

---

## 1. Tabela consolidada de ferramentas

| Ferramenta | Para que serve | Link (como apareceu) | Grátis/pago | Local/nuvem | Vídeos | Nota |
|---|---|---|---|---|---|---|
| Claude Code | base de tudo | — | plano Claude | local | 15+ | já temos |
| HyperFrames | vídeo animado por código (render) | skill da HeyGen (pesquisa 03) | grátis | local, CPU | 3 | 5 (já no plano) |
| Get B-Rolls (skill) | acha B-roll por trecho e monta storyboard para aprovar | repo `.../get-b-rolls` no GitHub, autor Bruno Moreira (confirmar) | grátis | local (busca na web) | 1 | 5 |
| Hypit | copia o formato (cenas, ritmo, telas) de um viral e monta o molde | `github.com/hypit-ai/hypit` (~23 mil estrelas) | grátis | local | 1 | 5 |
| Rhubarb Lip Sync | boca do mascote sincronizada com o áudio | open source (GitHub) | grátis | local, CPU | 1 | 5 |
| find-skills | procura e instala skills pelo que você quer fazer | ecossistema skills.sh (Vercel) | grátis | local | 2 | 5 (com auditoria) |
| skills.sh | ranking de skills mais instaladas | skills.sh | grátis | nuvem | 1 | 4 |
| Snyk (estudo de skills) | alerta: 36,8% de 3.984 skills com falha; 76 maliciosas | snyk.io | — | — | 1 | regra obrigatória |
| Grill Me | interroga um plano até achar furos | `mattpocock/skills` (grill-me) | grátis | local | 1 | 4 |
| Agent Browser | navegador próprio para o Claude mexer em sites | `vercel-labs/agent-browser` | grátis | local | 1 | 3 |
| SupoClip | cortes verticais de vídeo longo com legenda, nota de viralidade, rosto no centro | `github.com/FujiwaraChoki/supoclip` (AGPL-3.0) | grátis | local (Docker + Whisper + Ollama) | 1 | 4 (copiar a lógica; Docker pesa) |
| OpusClip | cortes automáticos (o pago que o SupoClip imita) | opus.pro | pago | nuvem | 1 | 2 |
| Graphify | mapa (knowledge graph) do código para gastar menos tokens | `github.com/Graphify-Labs/graphify` (MIT) | grátis | local | 1 | 4 |
| Humanizer (skill) | deixa texto de IA mais natural | lista "35 ferramentas" (confirmar repo) | grátis | local | 1 | 4 |
| OpenMontage | montagem de vídeo por agente | lista "35 ferramentas" (confirmar) | grátis | local | 1 | 3 |
| OpenCut | editor de vídeo aberto | lista "35 ferramentas" | grátis | local | 1 | 3 |
| Claude-Mem / Mem0 | memória persistente entre sessões | lista "35 ferramentas" | grátis (Mem0 tem nuvem paga) | local | 1 | 3 |
| Outras da lista "35 ferramentas" (Superpowers, Agent Skills, Karpathy Skills, gstack, Agency Agents, wshobson Agents, UI UX Pro Max, Taste Skill, Impeccable, Frontend Slides, Anthropic Skills, MarkItDown, Docling, Marketing Skills, Claude SEO, Social Media Skills, Agent Reach, Last30Days, Playwright MCP, Notion MCP, GitHub MCP, Awesome Claude Skills, Claude Skills) | engenharia, design, documentos, marketing, pesquisa, catálogos | por DM | maioria grátis | local | 1 | 2–3 |
| Kapso + skills `gokapso/agent-skills` | atendente do Claude no WhatsApp pela API oficial | `kapso.com`, `app.kapso.ai`; `npx skills add gokapso/agent-skills` | grátis até 2 mil msgs/mês; Meta cobra conversa iniciada pela empresa | nuvem | 1 | 3 (serviço) |
| Google Perfil da Empresa + Claude | SEO local: categorias, descrição, respostas a avaliações | business.google.com | grátis | nuvem | 1 | 5 (serviço vendável) |
| Cap | gravar tela (alternativa ao Loom) | `CapSoftware/Cap` | grátis | local | 1 | 4 |
| Cal.diy / Cal.com | agendamento (alternativa ao Calendly) | `cal.com/cal.diy` | grátis | auto-hospedado ou nuvem | 1 | 3 |
| AppFlowy | notas/wiki (alternativa ao Notion) | GitHub AppFlowy | grátis | local | 1 | 2 |
| OpenWhispr | ditado por voz | GitHub | grátis | local | 1 | 2 |
| OpenProject / Chatwoot | gestão de projetos / atendimento | GitHub | grátis | servidor (Docker) | 1 | 2 (pesado aqui) |
| OpenSEO | pesquisa de palavra-chave e backlink | GitHub | grátis + paga os dados | local + API | 1 | 2 |
| Voice Studio | clonar voz local | GitHub (confirmar repo) | grátis | local | 2 | 3 (testar em CPU; Kokoro é a base) |
| Higgsfield (MCP oficial / Shorts Studio) | gera vídeo/imagem; "shorts" com foto + voz + vídeo de referência | conector MCP no Claude | pago (créditos) | nuvem | 4 | 3 (testar por projeto) |
| OpenHiggsfield | interface aberta do Higgsfield | GitHub (~5 mil estrelas) | estúdio grátis, gerações pagas com a sua chave | local + API | 1 | 2 |
| Seedance 2.5 | modelo de vídeo usado no prompt do Higgsfield | via Higgsfield | pago | nuvem | 1 | 2 |
| OpenField (ComfyUI) | "Higgsfield aberto": vídeo, imagem, 3D, 28 movimentos de câmera | GitHub "openfield"; ComfyUI | grátis | local, **GPU 24 GB** | 1 | 1 (sem GPU) |
| MiniMax H3 / Hailuo | modelo aberto de vídeo com áudio e lip sync | `hailuoai.video` | aberto; site por créditos | local exige GPU 8 GB | 1 | 2 (só pelo site) |
| CarrosselA | carrossel por MCP no Claude | `carrosseia.com.br` (confirmar) | pago (créditos) | nuvem | 2 | 2 |
| Skill de carrossel (Skool Scaling) | reel vencedor → carrossel | por DM | isca de comunidade | Claude | 1 | 3 (fazer a nossa) |
| Plataforma de prompts de sites ("Desbloqueie o designer que existe na sua IA") | biblioteca de prompts de landing page | nome ilegível (logo "P") | ? | nuvem + Claude Code | 3 | 2 |
| xtool | app iOS com Claude Code sem Xcode | `github.com/xtool-org/xtool` (MIT) | grátis | local | 1 | 1 (fora do escopo) |
| FrameSpeed | plugin DaVinci: transcreve, corta silêncio, melhor take, legenda | por DM | pago | local (DaVinci) | 1 | 1 |
| After Effects (Roughen Edges, Path Options, Difference) | texto correndo pelo contorno do corpo | — | pago | local | 1 | 2 (refazer em código) |
| google-maps-scraper-kit | lista empresas do Maps com e-mail e telefone | GitHub (~2 mil estrelas; dono a confirmar) | grátis | local (Docker) | 1 | 2 (termos do Google) |
| Evolution API | WhatsApp não oficial por API | `evolution-api` | grátis | servidor | 1 | 1 (risco de ban) |
| Claude Leads | raspa comentários de reels para leads | `claudeleads.lovable.app` (confirmar) | ? | nuvem | 1 | 1 (termos + LGPD) |
| Docker | roda SupoClip, scraper etc. | — | grátis | local | 2 | 2 (pesa em 8 GB) |
| Ollama | LLM local | ollama.com | grátis | local | 1 | 2 (só modelos ~3B em 8 GB) |
| Whisper | transcrição | — | grátis | local | 1 | já temos (faster-whisper) |
| Memória do Claude | prompts de autoconhecimento | app Claude | plano | nuvem | 1 | 2 |

---

## 2. Workflows mostrados, escritos como skills reproduzíveis

Formato de cada um: **entrada → etapas → ferramentas → saída → verificação**, e se vira skill nossa (nome sugerido) e o que instalar.

### W1. B-roll com storyboard aprovado (vídeo: Vini Parizotto / Get B-Rolls)
- **Entrada:** vídeo do cliente ou roteiro; transcrição com tempos (`transcricao.txt`); briefing do cliente (marca, o que pode e não pode).
- **Etapas:**
  1. Transcrever com faster-whisper (se ainda não houver).
  2. Quebrar a fala em trechos de 2–6 s e marcar quais pedem apoio visual (nome próprio, produto, número, lugar, ação).
  3. Para cada trecho: buscar primeiro no material do próprio cliente, depois em fonte licenciada (banco gratuito com licença comercial), por último a fonte original do fato citado (notícia, site oficial), sempre guardando autor e licença.
  4. Montar um storyboard HTML local: um cartão por trecho com tempo, frase, prévia, motivo da escolha, fonte e licença, e botões Aprovar / Ajustar / Reprovar.
  5. Só baixar o aprovado (yt-dlp para vídeo com permissão, download direto para imagem).
  6. Gerar a lista de inserção (tempo de entrada/saída por clipe) e aplicar no Premiere pelo MCP ou no Remotion/HyperFrames.
- **Ferramentas:** faster-whisper, Claude Code (busca web), yt-dlp, FFmpeg (aparar), MCP do Premiere ou Remotion/HyperFrames.
- **Saída:** `storyboard.html`, pasta `broll/` com os aprovados, `broll.csv` (tempo, arquivo, fonte, licença), sequência com os B-rolls.
- **Verificação:** todo trecho marcado tem B-roll ou justificativa; todo arquivo tem fonte e licença no CSV; nenhum B-roll cobre o rosto em fala importante; exportar 5 quadros dos pontos de inserção para conferir.
- **Vira skill nossa:** `broll-storyboard`. Instalar: testar o Get B-Rolls original primeiro (comparar), depois escrever a nossa em português, com regra de licença.

### W2. Clonar o FORMATO de um viral para o cliente (vídeo: Augusto Gobatto / Hypit)
- **Entrada:** link do reel de referência; roteiro ou tema do cliente; marca (cores, fontes, logo, mascote se houver); áudio (voz do cliente gravada no celular ou Kokoro).
- **Etapas:**
  1. Baixar a referência (yt-dlp/instaloader) e gerar `sequencia.jpg`, `cortes.csv` e transcrição (o nosso pipeline de `_salvos` já faz isso).
  2. Extrair o "molde": número de cenas, duração de cada uma, tipo de cena (título, cartão de UI, número grande, CTA), posição da legenda, paleta, ritmo de fala (palavras/s).
  3. Escrever o roteiro do cliente encaixado no molde (mesma estrutura, conteúdo 100% do cliente).
  4. Gerar o áudio (gravação do cliente ou Kokoro) e transcrever para ter os tempos das palavras.
  5. Montar as cenas em HyperFrames (ou Remotion) com a marca do cliente, sincronizadas aos tempos.
  6. Mascote: gerar a boca com Rhubarb Lip Sync a partir do áudio.
  7. Passar a skill de efeitos sonoros e renderizar.
- **Ferramentas:** yt-dlp, FFmpeg, faster-whisper, Claude Code, HyperFrames, Kokoro, Rhubarb Lip Sync, skill `sound-effects`.
- **Saída:** `molde.json` (cenas e tempos), MP4 final 1080x1920, e o comparativo lado a lado com a referência.
- **Verificação:** duração e número de cenas dentro de ±15% do molde; nenhuma imagem, frase ou áudio da referência no resultado; LUFS -14 a -16; legendas dentro da área segura; conferir 5 quadros.
- **Vira skill nossa:** `molde-viral` (copia estrutura, nunca conteúdo). Instalar: HyperFrames (já no plano), Rhubarb Lip Sync, testar o Hypit para comparar.

### W3. Cortes de vídeo longo (podcast, live, aula) (vídeo: Gabriel Gouvea / SupoClip)
- **Entrada:** vídeo longo do cliente ou link; estilo de legenda da marca; quantos cortes.
- **Etapas:**
  1. Transcrever com faster-whisper (modelo small/medium em CPU; deixar rodando).
  2. O Claude lê a transcrição e propõe 3–7 cortes de 20–60 s, cada um com: começo e fim exatos, título-gancho, nota de 0 a 10 e motivo.
  3. Aprovar a lista (humano).
  4. Recortar com FFmpeg e reenquadrar para 9:16 com o rosto no centro (detecção de rosto leve em CPU, ou reenquadramento manual por corte).
  5. Legenda palavra a palavra com a skill de legenda; título-gancho nos 3 s iniciais.
  6. Som (skill de efeitos) e render.
- **Ferramentas:** faster-whisper, Claude Code, FFmpeg, OpenCV ou MediaPipe (CPU) para rosto, skills de legenda e som; opcional MCP do Premiere (`rank_short_form_candidates`, `auto_reframe_sequence`).
- **Saída:** `cortes.json` (tempos, título, nota), N MP4 verticais, capa de cada um.
- **Verificação:** corte começa e termina em frase completa; rosto dentro do quadro em 100% do tempo (conferir quadros a cada 2 s); legenda sem erro de nome próprio; nada de marca d'água.
- **Vira skill nossa:** `cortes-verticais`. Instalar: nada pesado; evitar Docker + Ollama do SupoClip em 8 GB (usar o próprio Claude para escolher os cortes). Instalar OpenCV ou MediaPipe para o rosto.

### W4. Explicador em motion sem rosto (formato de Juan, IA no Fácil, Gabriel Gouvea, Copfy, Igor Henrique, Santinello)
- **Entrada:** tema (ferramenta, notícia, processo do cliente); fatos com fonte; marca; CTA.
- **Etapas:**
  1. Roteiro de 30–70 s: gancho com objeto concreto (preço riscado, número gigante, print polêmico) → 3 a 9 "trocas" ou passos numerados → alerta "o que ninguém conta" → regra final → CTA.
  2. Narração (Kokoro ou voz do cliente) e transcrição com tempos.
  3. Uma cena por frase: cartão de UI, ícone, número grande, contador "3/9", campo de busca digitando, comentário com palavra do CTA.
  4. Legenda palavra a palavra com 1 palavra-chave destacada por frase (cor da marca).
  5. Som e render.
- **Ferramentas:** Claude Code, Kokoro, faster-whisper, HyperFrames ou Remotion, skills de legenda e som.
- **Saída:** MP4 9:16 e uma variação 16:9 (como a Copfy faz).
- **Verificação:** todo número ou preço com fonte anotada; gancho visual no quadro 0; nenhuma cena parada mais de 3 s; CTA aparece escrito e falado.
- **Vira skill nossa:** `explicador-motion` (templates: "achado/troca", "passo a passo numerado", "top N com contagem regressiva").

### W5. Pipeline de produção com painel e aprovação (vídeo: IA no Fácil / "Pipeline Canal Dark")
- **Entrada:** pauta do cliente (lista de temas), marca, calendário.
- **Etapas:** pauta → roteiro → narração → cenas → montagem → cortes curtos e capa → **revisão humana** → agenda. Cada etapa grava um arquivo de status numa pasta do cliente; um painel HTML local lista as colunas Produção / Revisão / Aprovado.
- **Ferramentas:** Claude Code, Kokoro, faster-whisper, HyperFrames/Remotion, skills de legenda e som; agendamento manual ou pelo Meta Business Suite.
- **Saída:** pasta por peça com roteiro, áudio, MP4, capa e status; painel HTML.
- **Verificação:** nada sai sem status "aprovado" assinado; checagem de LUFS e área segura automática antes de ir para revisão.
- **Vira skill nossa:** `fabrica-cliente` (orquestra W2, W3, W4 e W6). Instalar: nada novo.

### W6. Carrossel a partir do reel que funcionou (vídeos: Mateo Jiménez; Lucas Pinheiro)
- **Entrada:** 1 a 5 reels do cliente com melhor desempenho (ou link de referência), problema do público, contexto da marca.
- **Etapas:** transcrever o reel → extrair a ideia central, o gancho e os argumentos → escrever 6–10 slides (capa com gancho, corpo, CTA) → renderizar em HTML 1080x1350 com a marca → exportar PNG.
- **Ferramentas:** faster-whisper, Claude Code, HTML/CSS renderizado por Chrome headless (o mesmo motor do HyperFrames) ou Remotion `renderStill`.
- **Saída:** pasta com PNGs numerados e a legenda do post.
- **Verificação:** texto legível no celular (corpo mínimo ~32 px em 1080), contraste, ortografia, marca correta, CTA no último slide.
- **Vira skill nossa:** `carrossel-de-reel`. Instalar: nada (não depende do CarrosselA pago).

### W7. SEO local no Perfil da Empresa no Google (vídeo: Marina Braz)
- **Entrada:** acesso do cliente ao Perfil da Empresa; lista de serviços; bairros atendidos; avaliações atuais.
- **Etapas:** (1) levantar as buscas que importam ("[serviço] em Recife/[bairro]") e ver quem está em 1º; (2) categorias principal e secundárias que correspondem ao que o cliente faz; (3) descrição completa (até 750 caracteres) com serviços e bairros; (4) serviços/produtos com descrição; (5) resposta personalizada a cada avaliação; (6) fotos atuais; (7) medir posição após 5, 15 e 30 dias.
- **Ferramentas:** Claude (redação), Google Perfil da Empresa, Google Maps.
- **Saída:** checklist preenchido, textos aprovados, print de posição antes/depois.
- **Verificação:** humano confere cada campo antes de salvar (o próprio vídeo mostra o Claude errando a categoria: "shooting" virou "área de tiro"); nada de avaliação falsa.
- **Vira skill nossa:** `perfil-google-local` (serviço vendável para clientes do Recife). Instalar: nada.

### W8. Achar e instalar skills com segurança (vídeos: Pedro Augusto, Felipe Tâmbara)
- **Entrada:** a tarefa ("tô editando vídeo, preciso de legenda animada").
- **Etapas:** find-skills sugere opções → para cada uma: autor conhecido? instalações? data da última atualização? → ler o SKILL.md e os scripts inteiros → procurar comandos que enviam dados para fora, leem `.env`, chaves, `curl | sh`, código ofuscado → conferir a análise de segurança na página do skills.sh → instalar só no projeto, nunca global, e testar numa pasta de teste.
- **Ferramentas:** find-skills, skills.sh, leitura manual.
- **Saída:** registro em `skills_instaladas.md` (nome, autor, versão, data, quem revisou).
- **Verificação:** nenhuma skill sem revisão registrada.
- **Vira skill nossa:** `auditor-skills`. Instalar: find-skills.

### W9. Atendente no WhatsApp (vídeo: Copfy / Kapso)
- **Entrada:** número (WhatsApp Business ou chip dedicado), agenda do cliente, FAQ.
- **Etapas:** criar conta Kapso e conectar número → `npx skills add gokapso/agent-skills` → pedir ao Claude o agente (responder FAQ, marcar horário) → testar com 10 conversas reais simuladas → ligar.
- **Saída:** agente ativo, roteiro de respostas, regras de escalar para humano.
- **Verificação:** responde só o que está no FAQ; passa para humano em reclamação; custos da Meta previstos.
- **Vira skill nossa:** possível serviço futuro (`atendente-whatsapp`), baixa prioridade para a edição.

### W10. Prospecção local (vídeo: Copfy / Google Maps)
- Fluxo mostrado: scraper do Maps em Docker → planilha (nome, telefone, e-mail, site, nota) → conferir → mensagem individual pelo WhatsApp (Evolution API).
- Para nós: fazer a versão segura: lista montada à mão ou com poucas buscas, conferência humana, contato individual pelo WhatsApp normal ou e-mail. **Não vira skill** por enquanto (termos do Google, risco no WhatsApp).

### W11. Automação "6 reels por dia" com avatar (vídeo: Manoel Thiago)
- Fluxo mostrado: buscar 30 virais do TikTok → baixar o mais forte → transcrever → reescrever roteiro → voz clonada (Voice Studio) → avatar → agendar em 3 redes.
- Para nós: as etapas 1–4 já estão em W2/W4. **Não automatizar a publicação nem o avatar** (ver seção 4).

### W12. Técnicas de motion vistas nos vídeos (viram componentes, não skills)
- Texto correndo pelo contorno do corpo + modo Difference (Jammal, After Effects) → componente Remotion/HyperFrames com SVG `textPath` sobre o contorno de recorte (respeitando: nada sobre o rosto).
- Crachá pendurado trocando por item + contador "2/35" (Dev em dobro).
- Velocímetro caindo, grafo se montando, campo de busca digitando, comentário com palavra do CTA (Igor Henrique, Juan).
- Uma palavra gigante em serifa por vez sobre o peito (Vini Parizotto, Marina Braz).
- Adicionar como componentes na skill `motion-broll` / biblioteca de HyperFrames.

### Resumo: skills nossas sugeridas
| Skill | O que faz | Precisa instalar | Prioridade |
|---|---|---|---|
| `broll-storyboard` | B-roll por trecho com fonte e licença, storyboard para aprovar | (testar Get B-Rolls) | 1 |
| `molde-viral` | copia estrutura e ritmo de uma referência, conteúdo do cliente | HyperFrames, Rhubarb Lip Sync | 2 |
| `cortes-verticais` | 3–7 cortes de vídeo longo, rosto centralizado, legenda | OpenCV ou MediaPipe (CPU) | 3 |
| `explicador-motion` | explicador sem rosto em templates | HyperFrames | 4 |
| `carrossel-de-reel` | reel vencedor vira carrossel PNG | nada | 5 |
| `perfil-google-local` | checklist e textos de SEO local | nada | 6 |
| `auditor-skills` | revisão de segurança antes de instalar skill | find-skills | 7 |
| `fabrica-cliente` | orquestra as anteriores com painel e aprovação | nada | 8 (depois das outras) |

---

## 3. Top 10 para avaliar e instalar

1. **HyperFrames** (já no plano): aparece em 3 vídeos, é a base de W2, W4, W5. Grátis, CPU.
2. **Get B-Rolls**: resolve a maior dor de edição (B-roll) com storyboard de aprovação; leve. Comparar e depois fazer a `broll-storyboard`.
3. **Rhubarb Lip Sync**: boca de mascote a partir do áudio, CPU, grátis. Abre o formato "mascote da marca falando" para clientes.
4. **Hypit**: estudar como extrai o molde de um viral; pode encurtar a `molde-viral`. Testar num projeto de teste.
5. **find-skills** (+ regra do W8): acha skills de legenda, corte e efeito sem garimpo manual. Só com auditoria.
6. **Graphify**: menos tokens nos projetos Remotion/HyperFrames e no app; grátis e leve. Medir antes e depois.
7. **SupoClip, só a lógica** (W3): nossa versão sem Docker/Ollama, com faster-whisper + Claude + FFmpeg; ler o código do repositório para copiar a pontuação de viralidade e o reenquadramento.
8. **Humanizer**: legendas de post e roteiros com menos cara de IA.
9. **Cap**: gravar tela para tutorial e aprovação com cliente, substitui Loom de graça.
10. **Grill Me**: revisar briefing e roteiro de cliente antes de produzir (pega furos cedo).
- Reserva: OpenMontage e OpenCut (avaliar se ajudam na montagem); Higgsfield MCP (testar um projeto pago, por crédito, quando o cliente pedir vídeo gerado); Kapso (se surgir serviço de atendimento).

---

## 4. O que evitar

- **Exige GPU que não temos:** OpenField/ComfyUI (comentários falam em 24 GB de VRAM), MiniMax H3 local (8 GB de VRAM). Só pelo site (Hailuo) ou GPU alugada, por projeto.
- **Pesado para 8 GB de RAM:** Docker + Ollama + Whisper juntos (SupoClip como vem), Chatwoot e OpenProject auto-hospedados, scraper em Docker. Preferir versões sem Docker.
- **Pago e redundante:** FrameSpeed (pago e exige DaVinci; já cobrimos com Premiere MCP + faster-whisper + skills), CarrosselA (créditos; a `carrossel-de-reel` faz igual), OpusClip, PDF de R$ 47 do "piloto automático", ManyChat.
- **Termos ruins ou risco legal:**
  - Claude Leads (raspa comentários e perfis do Instagram e coleta telefone: termos do Instagram + LGPD).
  - Raspagem do Google Maps em volume (termos do Google, bloqueio de acesso) e Evolution API para disparo (WhatsApp não oficial, risco de banimento do número).
  - Publicação automática de 6 vídeos/dia com avatar e roteiro de viral alheio (conteúdo repetitivo, risco de desmonetização e de cópia).
  - B-roll tirado de redes de terceiros para cliente sem licença; "clonar viral" copiando imagens ou falas em vez de só a estrutura.
  - Vídeo/voz gerados de uma pessoa real (Higgsfield Shorts, avatar, clonagem de voz) sem autorização escrita do cliente.
  - "Review" de produto que não existe (vídeo do Tesla): propaganda enganosa se usado para cliente sem aviso.
  - Licenças: SupoClip é AGPL (uso interno ok; virar serviço web para terceiros obriga abrir o código). Remotion pago a partir de 4 pessoas (pesquisa 03). Conferir licença comercial de modelos de vídeo abertos.
- **Skills de origem desconhecida:** estudo da Snyk citado no vídeo: 36,8% de 3.984 skills com falha, 76 maliciosas (roubo de chaves). Seguir o W8 sempre.
- **Posts "comenta X" sem nome na tela:** o nome real só vai por DM; não vale correr atrás de "Pipeline Canal Dark", da plataforma de prompts de sites ou do carro "Tesla" sem saber o que é.

---

## Anexo: padrões de formato que funcionaram (para os nossos próprios posts)
- Mais curtido: realismo + curiosidade (carro trocado por IA, selfie sem edição, 35 mil curtidas) e engenharia reversa polêmica (SupoClip, 10,9 mil).
- Mais comentados: CTA "comenta X" desde o primeiro quadro (Leonardo Bortolazzi 4,4 mil; Manoel Thiago 5,8 mil; Felipe Tâmbara 5,1 mil).
- Mesmo roteiro republicado com outro gancho ou outro exemplo visual muda muito o resultado (Bortolazzi: 131 → 2.767 curtidas; Lucas: 1.050 → 463). Vale testar 2–3 ganchos por roteiro.
- Motion sem rosto (HyperFrames) domina os perfis de ferramenta; talking head com palavra gigante por vez domina os de autoridade.
- A detecção de cortes (`cortes.csv`) marca 1 plano na maioria desses vídeos porque não há corte seco, só transições animadas: para motion, medir ritmo por troca de cena, não por corte.
