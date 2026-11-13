# Pesquisa 8 — Estudo dos tutoriais do YouTube (08/11/2026)

Fonte: `D:\PEFORMAKE\REFERENCIAS\_youtube\yt_*\transcricao.txt` (22 pastas, 19 com transcrição) + `LABS\kypx1ETm4KY`. Título e canal vêm do `audio.info.json`. Sem transcrição (ignorados): `yt_J-S1JqGaY1s`, `yt_R3n0-gmhQtk`, `yt_fqaEZqPzKZs`.
Método: só leitura das transcrições. Nada foi instalado nem baixado. Tudo que está aqui foi dito no vídeo. Onde o nome de uma ferramenta saiu estranho na transcrição automática, aparece "(como dito)". Preços e tempos são os do vídeo, na data dele.
Não repete o que já está em `NARRATIVA.md`, `ferramentas_e_workflows.md`, `licoes_profissionais.md` nem as lições já tiradas de LABS/Wesley/kaye/Kaz.

---

## 1. Tabela dos vídeos

| id | título | canal | tema | nota |
|---|---|---|---|---|
| CLnS22LHdkw | Edit Like a Documentary Filmmaker, Not a Videographer | Mark Johansson | ofício documental: paper edit, assembly só de áudio, cenas, "porquê" | 5 |
| gwyneGrX9Jw | Watch Me Edit: Building a Cinematic Documentary Opening | Inside The Edit (Paddy Bird) | refaz uma abertura ruim: reter informação, ritmo, camadas de som | 5 |
| bwz-jLZz2w8 | How To Edit Documentaries like James Jani | The Editing Podcast | estrutura não linear, motivos visuais, contagem regressiva, direção de motion | 5 |
| IjMVme1aDWg | How I Edit Documentary Video LIKE Johnny Harris in Capcut (Part 1) | byl | receita passo a passo (CapCut) de 7 dos 18 planos de uma cena | 4 |
| REAOFI534lk | I taught Claude how to edit videos and it's INSANE | Duncan Rogoff | 6 trabalhos separados, QA a 10 fps, custo em tokens | 5 |
| W7E7Ln0z6aY | Como eu edito meus vídeos com Claude Code (fluxo completo) | Lucas Leite | 8 etapas/skills + skill mestre, "motion map", arquivo de aprendizados | 5 |
| ep4psgAFOqc | How I Get Claude To Edit My Videos (Step-By-Step) | Matt Wolfe | fluxo short-form: pesquisa (vidIQ) → roteiro → corte → B-roll; loop mensal | 5 |
| OtbLL6OBNE4 | How to Make Viral Animated Shorts Using Claude (Full Workflow) | Mr omi | clonar estilo medindo (32 mil quadros), 12 agentes, Three.js + Remotion | 5 |
| D5qpBbEWTxo | How I Make $880/Day with AI Motion Design (Claude Motion) | Sanji Nai-Chien | regras de motion de lançamento SaaS + como achar cliente no Upwork | 5 |
| HzXD4GVqXwM | I Fully Automated My Video Editing Using Claude Code | Christian Peverelli | "equipe" de 7 ferramentas, skill de 1.400 linhas, custo por vídeo | 4 |
| Ct5_C2xC-oo | Claude Edited This Video (And I'll Teach You How) | 100x Engineers | 6 passos com testes de estilo antes do vídeo; skill AE Builder | 4 |
| U-AdnIz1jIk | Automate Your CapCut Editing With Claude (Step by Step + Free Skill) | Matt Loui | Claude escreve o projeto do CapCut direto; reanalisa seus ajustes | 4 |
| IY08-3TS2o8 | Claude Code Can Now Clip ANY Video (Free Skill) | Eddie \| AI | skill de cortes: critérios de gancho, nota, zoom, legenda | 4 |
| WfEB0uoMVm8 | A verdade sobre EDITAR VÍDEOS com Claude Code | Davi Lops | limitações honestas do corte por transcrição; backup de cartão | 4 |
| XeTAlZiIWHE | How I Fully Automated My Video Editing (Claude Code) | Jason Cooperson | 7 estágios, 3 presets de formato, re-render parcial | 3 |
| 16kTqBUh8mM | How To Master Text Animation In After Effects (Under 1 Minutes) | Marketing Demons | animação de texto palavra a palavra (valores exatos) | 3 |
| AsvN_feasyY | How To Make Insane Motion Graphics With Opus 5.5 (Claude Motion) | kaye.creatives | (já estudado) Claude Motion × motion designer | 3 |
| kypx1ETm4KY (LABS) | Automatizei 100% a Edição dos Meus Vídeos com Claude Code | LABS | (já estudado) colagem + OpenArt, mistura 3D | 3 |
| 1IuB9IRyOCs | Como Eu Crio e Edito Meus Vídeos com o Claude Opus 5.5 | Matheus Fonseca | 3 testes de 1 prompt (edição, motion, 3D) com HyperFrames | 2 |
| 5HwmrSwNY-Y | CRIEI UMA FÁBRICA DE VÍDEOS COM IA EM 10 MINUTOS | LABS | shorts 3D de curiosidade: personagem, 2 modelos de roteiro | 2 |
| _ifTU7vk4rE | ISSO TRANSFORMA O CLAUDE EM UM GÊNIO DA EDIÇÃO DE VÍDEO POR R$0 | Felipe Borges - Fala IA! | "Photocraft/Filmcraft", PIP sobre motion | 2 |
| 68Gzq9DiZRY | Clonei um vídeo viral com o Claude | oWesleysanja | (já estudado) clonar estilo de um viral | 2 |
| 3tpaWHaiLQ8 | I Made VIRAL Animation Videos Using Claude Code (FREE Plugin) | Grow With Kaz | (já estudado) Three.js + Remotion | 2 |

---

## 2. Ofício de edição documental

### 2.1 Processo antes da timeline
- **Não começar pela timeline.** Transcrever todas as entrevistas e montar um documento de citações. Grifar temas e tópicos e escrever a história no papel (*paper edit*) antes de abrir o editor. A edição vira "implementar a história", não "achar a história no software". [CLnS22LHdkw]
- **Assembly cut só de áudio.** Encadear só as entrevistas, sem música, sem B-roll e sem grafismo, como um podcast do filme. Se a história não prende ouvida assim, nenhum polimento visual salva. Só depois entram B-roll, grafismo e música. [CLnS22LHdkw]
- **Ordem de montagem de quem faz documentário no YouTube** [bwz-jLZz2w8]:
  1. Storyboard em duas colunas: roteiro à esquerda, direção à direita ("motion graphic aqui", "B-roll disso aqui").
  2. A-roll (câmera do apresentador ou narração) cortado, sem erros.
  3. "B-roll essencial", que o roteiro já exige.
  4. Música (é ela que dita o ritmo e como os clipes rolam).
  5. Clipes moldados à música.
  6. Onde haverá motion, a timeline fica com uma tela preta escrita "inserir motion de X".
  7. Motion volta da equipe e é encaixado.
  8. Mix e master no fim.
- **Dividir o filme em cenas de 2–3 min.** Isso tem um lado prático (meta diária possível) e um narrativo: se cada micro-história prende, a macro-história prende. [CLnS22LHdkw]
- **Perguntar "por quê", não só "o quê".** O videomaker mostra o recorde do corredor. O documentarista pergunta o que o motiva, o que sacrifica, quem era criança, do que foge. Pergunta sobre a condição humana é o que vicia. [CLnS22LHdkw]

### 2.2 Abertura: reter informação (refação de Inside the Edit) [gwyneGrX9Jw]
- **Diagnóstico da abertura ruim (25 s):** "Oi, meu nome é Dave, fui fuzileiro, moro aqui há 3 anos". Isso é informação incessante, com cara de vídeo corporativo ou reportagem. Os planos duravam 1,5–2 s ("ritmo de YouTube/atualidade") e a música era "bonitinha", sem mistério.
- **Regra:** o público é viciado em intriga. Editor inexperiente conta demais e cedo demais. Grande edição é **segurar informação e adiar a revelação**.
- **Refação, passo a passo:**
  1. Começar com planos de atmosfera (nascer do sol) num **intercut de tamanhos**: close/close, aberto/aberto ("um, dois, um, dois"). Variar de plano aberto a extremo close.
  2. Aparar cada plano até "onde fica bom" (antes do movimento de câmera ou da troca de exposição). Deixar o elemento sair do quadro: "não deixou a gaivota sair do quadro: desastre".
  3. **Planos de 3–5 s** (contra 1,5–2 s do original). A nova versão leva 30 s só para *começar* a sugerir que ele mora ali; a antiga contava tudo em menos de 25 s.
  4. Som em camadas, uma de cada vez: primeiro as ondas (fade-in longo), depois a gaivota quando ela aparece na imagem, e só então a música. A música não entra no início.
  5. Primeira fala **poética**, não informativa: "Sempre fui atraído pelo mar" no close, corte para o mar, "é um santuário para mim" no plano aberto. Para limpar a gagueira no início da fala, um dissolve de 2–3 quadros começando no corte.
  6. **Pistas em ordem crescente de revelação.** Primeiro o B-roll menos óbvio (passarinho, água, comida), depois canecas e cafeteira penduradas numa árvore ("tem alguém morando aqui?": pista, não confirmação), e só então a barraca (a revelação).
  7. **A fala que confirma entra depois que o público processou a imagem.** "Esta é minha residência" não entra junto com o plano da barraca, entra alguns quadros depois.
  8. Remover o "é…" do meio da fala e manter a pausa natural, para respeitar o ritmo do personagem e do lugar.
  9. Fechar a palavra-chave ("idílico") com um plano que a ilustre, diferente dos anteriores, e um **zoom muito sutil (escala 100 → 101,1)**.
- **Mix de rascunho:** ambiente a cerca de **−18 dB sob a fala**, colar atributos em todos os clipes, transição de áudio padrão para rampas suaves. Esconder o monitor de origem para julgar só o programa. Vozes graváveis mas com vento ficam mudas; o som vem de ambiente limpo.
- **Música certa:** "romântica, misteriosa, emocional na progressão de acordes", escolhida pelo personagem e pelo lugar, não pela beleza.

### 2.3 Estrutura e tensão em documentário longo (James Jani) [bwz-jLZz2w8]
- **Escolha da história:** um mistério com uma comunidade em volta (mega-igrejas, cripto, FTX). Muita gente em volta de algo, com a sensação de que "algo não está certo". A imagem dele: um jardim lindo onde todos comem maçãs, e ele cava e acha o que alimenta a árvore.
- **Gancho por contraste:** começar com música animada e otimista demais, construindo o "gênio" (o mais rico com menos de 30 anos, dorme num pufe). Depois vem a virada explícita ("esta não é uma dessas histórias"), o tom escurece e entra um único tuíte na tela ("FTX is a problem").
- **Não linear:** ir e voltar no tempo do jeito que o próprio autor descobriu a história, para o público refazer a investigação junto.
- **Motivo visual recorrente como marcador de progresso:** peças de quebra-cabeça. Na abertura o quebra-cabeça é mostrado e **quebrado**. Depois, cada momento significativo é "fechado" com um corte para as peças se juntando. O público sente progresso, como capítulos.
- **Contagem regressiva** ("faltam 10 meses", "faltam 5 anos"). Ela nasceu no 2º rascunho, quando o vai e vem não linear "parecia brusco". Lembra o tempo todo que vai desabar, o que dá sentido às peças. Ele chama isso de "sensação de pré-apocalipse".
- **Coração humano:** o espetáculo diverte, mas só pega com a pessoa real. Uma entrevista com uma vítima corre o filme inteiro, e o filme **fecha nas palavras dela**, não no vilão.
- **Sequências de internet** (clicar em matéria, buscar nome no Google): o canal tem uma página de *creative brief* com efeitos e templates de AE para a equipe de motion. Quadros complexos ("detective board") são rascunhados com gravação de tela tosca ou desenho no Paint. O conceito visual (neon laranja e azul) saiu do Midjourney e foi passado ao motion designer.
- **Plano B honesto:** quando não conseguiram filmar a cena do saque na FTX, fizeram animação de navegador ("bem óbvia, mas ok, segue o jogo").
- **Perfeccionismo:** combinaram aceitar "70% bom" e seguir. Os últimos 20–30% de detalhe "quase ninguém nota". "Dê-se permissão para ser ruim."

### 2.4 Cortes invisíveis [CLnS22LHdkw]
- Transição chamativa tira o público da história: ele percebe que está vendo uma edição.
- J-cut porque imita a vida: ouvimos a pessoa antes de virar o rosto para ela. Cortar exatamente no início da fala parece artificial.

### 2.5 Receita "Johnny Harris" no CapCut (cena de ~1 min, 18 clipes; a parte 1 cobre os clipes 1–7) [IjMVme1aDWg]
1. **Título datilografado:** fonte padrão do CapCut "Intellect-a-Typewriter" (como dito); animação de entrada "Retro Typer" de 3 s. Dividir o texto 1 s antes do fim e pôr keyframe de escala (zoom out leve na 1ª parte, maior na 2ª). Compor. Fundo com overlay de **poeira de filme**. Camada de ajuste com **contraste −18**.
2. **Fotos de arquivo:** P&B (saturação no mínimo), recorte de memorando entre elas, efeito "90s", camada de ajuste com só os **brancos −34**. Compor e acelerar **10×**.
3. **Transição de película:** overlay de rolo de filme exatamente no corte, modo **Screen**, mais o efeito "TV warble" no 1º clipe e "Bad TV 2" no texto seguinte, com a mesma duração.
4. **Documento:** inverter as cores do memorando (curva virada de cabeça para baixo), contorno branco com fundo branco e máscara, 3 páginas trocando por "replace clip" dentro do composto (sem refazer efeitos), zoom out no 1º segundo com curva **ease** (Alt+K).
5. **Cartela:** fundo branco, typewriter, entrada Retro Typer de 1 s e saída "slide up".
6. **Ficha de personagem:** foto P&B com máscara retangular de cantos arredondados, nome em "Cere bold" e cargo em "Cere regular" (como dito), mais um texto vertical na borda da imagem.
7. **Mapa:** estilizado no **Snazzy Maps** e acabado no **Photopea**. Inclinação 3D com o efeito "Player 3" (como dito), textura no mínimo, rotação no efeito e no vídeo; aparar o fade-in que o efeito cria. Linha de trajeto (asset do Photopea) em **Multiply**, revelada com máscara "split" girada 90° e keyframada da direita para a esquerda. Um "X" de cruz com duas linhas (uma duplicada e espelhada). Zoom final até o X com ease.
- A parte 2 (clipes 8–18 e acabamento com texturas) não está nesta transcrição.

---

## 3. Fluxos de edição com Claude Code

### 3.1 Duncan Rogoff: 6 trabalhos, nunca um prompt só [REAOFI534lk]
Ele foi editor 15 anos (Apple, PlayStation, Nissan). O "one-shot" ficava com cara barata porque era demais para o modelo. O que mudou foi dividir o trabalho em 6 jobs, salvos numa skill.
1. **Roteiro:** o Claude estuda 3 vídeos do nicho que bateram a média do próprio canal e extrai ganchos e formatos para uma biblioteca reutilizável.
2. **Corte:** Whisper (baixado pelo Claude, grátis) com tempo por palavra. Mantém a **última tomada limpa de cada linha**; o resto sai pelo FFmpeg. Teste sugerido: gravar com erros de propósito e pedir a **lista de tudo que foi removido**.
3. **Design:** screenshots de editores que você admira; o Claude explica o que funciona ou escreve diretrizes. Fonte citada: **promptmotion.com** (motion feitos com Claude, cada um com o prompt).
4. **Beat map antes de qualquer grafismo** (cada ideia do roteiro → o que está na tela). Regra nova vinda dos comentários: **1 grafismo por ideia, na tela tempo suficiente para ler** (antes era 1 por frase, "demais").
5. **Motion:** seções do vídeo para subagentes em paralelo, HyperFrames (grátis, HeyGen) para cada grafismo. **Opus/Fable no planejamento e direção criativa, Sonnet na construção.**
6. **Revisão automática:** checa **10 quadros por segundo** procurando 6 erros:
   - animação que toca duas vezes;
   - grafismo que pisca por uma fração de segundo;
   - texto que entra tarde demais para ler;
   - grafismo sobre o rosto;
   - palavra dita duas vezes seguidas;
   - lábio fora de sincronia com a voz.
   Dica: escrever os 3 erros que você sempre pega e entregar como checklist.
7. **Feedback:** depois de cada corte, perguntar "qual instrução teria prevenido cada nota?" e reescrever essa instrução na skill.
- **Render:** 9 subagentes renderizando juntos travaram a máquina e cancelaram o trabalho uns dos outros. Agora são **no máximo 4 renders simultâneos**, à noite. **Rascunhos em meia resolução**; qualidade cheia só depois de aprovar o corte. Fazer **1 grafismo como página web primeiro**, o resto como storyboard, e só então virar vídeo.
- **Limitação admitida:** "um bom editor humano ainda ganharia em alguns planos"; precisa de notas e refação.

### 3.2 Lucas Leite: 8 skills + skill mestre [W7E7Ln0z6aY]
- Pré-requisitos: Claude Pro + Claude Code. Revisa no Premiere por escolha.
- Antes de tudo (uma vez): pôr trechos de animações de referência na pasta e pedir a análise de estilo, animações, velocidade e ritmo. "Sem isso sai genérico."
- **Etapas** (cada uma é uma skill):
  1. **Iniciar:** briefing (qual vídeo, direção, comentários) e inventário de arquivos.
  2. **Preparar:** transcrição com **WhisperX** (grátis, local, tempo por palavra).
  3. **Cortes:** pausas e erros; usa o roteiro se houver. **1ª revisão no Premiere** (ele entrega arquivo de projeto).
  4. **Motion map:** "é aqui que o vídeo fica bom ou ruim". Planeja o que aparece, quando, ritmo e estilo, sem animar. Define mais ou menos animação e **movimentos de câmera casados com o motion** ("se uma animação entra com zoom, a câmera dá zoom antes da transição"). Economiza tokens.
  5. **Assets:** o Claude lista o que falta (ícones, prints, gravações), busca sozinho e pede o resto.
  6. **Motion render:** HyperFrames. **2ª revisão no Premiere**; "com fluxo treinado, 1–2 revisões no máximo".
  7. **Zooms:** diferença de zoom para disfarçar corte, zoom nas ênfases e câmera seguindo o rosto (modelo "UNET", como dito).
  8. **Efeitos sonoros:** 1 som por movimento de motion ou câmera. Primeiro a pasta local; o que falta ele baixa da Epidemic Sound (assinante, via API). Para quem não assina: perguntar ao Claude quais SFX ter numa pasta e montar com gratuitos.
- **Skill mestre:** chama etapa por etapa, avisa a hora de `/clear` e retoma de onde parou num chat novo.
- **Arquivo de aprendizados** na pasta: o Claude anota cada correção; o humano escolhe o que vira regra permanente e o que sai.
- **Custo honesto (ele mesmo corrigiu):** vídeo leve gasta 20–30% do limite semanal do Pro (~15–20 vídeos/mês, US$ 1–1,5/vídeo). Vídeo cheio de animação dá 5–10 vídeos/mês (US$ 2–4/vídeo). Editor humano equivalente: "no mínimo R$ 3.000".
- Grátis: skill no GitHub que guia a criar o próprio fluxo (`/fluxo-de-edicao`).

### 3.3 Matt Wolfe: short-form de notícia de tecnologia [ep4psgAFOqc]
- **Projeto no Claude** com instruções ("editor de short-form de nível mundial…") e ferramentas listadas: vidIQ, Blender, HyperFrames, FFmpeg (edição "headless", sem Premiere ou DaVinci), yt-dlp.
- **Conectores:** vidIQ MCP (patrocinador; pago, US$ 1 no 1º mês pelo link dele), HyperFrames, ElevenLabs (versão "full", para música e SFX).
- **Gerar as skills a partir do próprio canal:** "use o vidIQ para analisar meus shorts, ver os de melhor desempenho, roteiro e visual, e crie uma skill de roteiro e outra de edição". O que saiu:
  - hook-série ("this is the coolest thing I saw today");
  - temas físicos surpreendentes;
  - "parece IA mas é real" gera debate;
  - split 50/50 com B-roll em cima;
  - legenda magenta;
  - **B-roll trocando a cada 1,8–3,6 s**.
- **Fluxo:**
  1. Link da fonte → roteiro com nota (8/10, 4/5), faixa de views estimada, títulos e **shot list de B-roll**.
  2. Ele grava o A-roll usando o roteiro só como guia ("roteiro de IA dá para perceber"; procura "AI-isms" tipo "não é só isso, é aquilo").
  3. Solta o vídeo bruto sem prompt.
  4. A skill transcreve, faz o corte bruto, B-roll, música, render e review.
- **Instrução-chave:** "use **transcrição e forma de onda** para os cortes". Só pela transcrição o modelo corta a pessoa no meio da palavra.
- O B-roll vem do site da fonte (vídeos oficiais) e do material dele. O que não existe vira HyperFrames (tela digitando) ou **objeto 3D no Blender + texto do HyperFrames por cima**.
- **Problemas reais:**
  - ElevenLabs recusou transcrever e a skill não tinha alternativa (corrigido: "se falhar, use outra ferramenta; atualize a skill");
  - sites bloqueados (Settings → Capabilities → permitir sites; lista de domínios permitidos);
  - 1ª versão sem música, voz com EQ/compressão estranha, um erro não cortado, pausas largas.
  A 2ª passada (36 min) corrigiu e criou scripts Python próprios (`short edit`, `GFX kit`).
- **Loop mensal:** "revise meus últimos 10 shorts, ache os outliers e sugira melhorias para as skills de roteiro e edição". Usa analytics, transcrição, comentários e curva de retenção. Exemplo de achado: "o 1º quadro deve ser sempre o objeto real em ação"; specs em cartela; ressalvas em uma oração ou cortadas.
- **Opinião honesta:** para short informativo com rosto a IA "já faz bem"; para long-form ele ainda quer editor e ajuste à mão. Preocupação com inundação de conteúdo e editores de short sem trabalho.

### 3.4 Christian Peverelli: "equipe" de 7 ferramentas [HzXD4GVqXwM]
| papel | ferramenta | custo citado |
|---|---|---|
| editor/gerente | Claude Code desktop, modo local, pasta própria, permissões em auto | Max US$ 200/mês (uso geral) |
| transcritor | **Parakeet** (NVIDIA) | grátis |
| animador | HyperFrames (HeyGen), até 4K | grátis |
| pesquisador | Chrome controlado pelo Claude: screenshot de post/matéria, rolagem gravada, grifo de linha, zoom em trecho | — |
| editor de tela | **Tella** (grava rosto e tela; tem MCP, controla cortes, zoom e layout) | US$ 13/mês anual (~US$ 2/vídeo) |
| sound designer | **Epidemic Sound** (conector) | US$ 9,99/mês anual |
| finalizador | FFmpeg: tira tela preta, confere sincronia de áudio | grátis |
- **Skill "YouTube edit":** ~1.400 linhas, hoje com **36 regras**, escrita pelo próprio Claude.
- **Como treinou o estilo:**
  1. Começou só com ganchos, com notas com tempo ("no segundo 22 você fez X, quero Y").
  2. No 10º dia, só som: testou 8–10 SFX num gancho ("estava ocupado demais").
  3. Ao fim de cada sessão: "aprenda com o que fizemos e salve na skill".
  O preferido dele: gancho com música de suspense, depois lo-fi hip hop bem baixo.
- **Prompt de setup:** "crie um sistema de edição com HyperFrames, FFmpeg, Tella e Epidemic Sound; me guie passo a passo". Modelo top no setup, mais barato depois.
- **Resultado:** 2 min 46 s de bruto → 31 s, em 10–20 min. Hoje solta o bruto inteiro à noite e dá notas de manhã.
- **Custo:** ~US$ 27/vídeo (US$ 24 em tokens medidos pelo próprio Claude) contra US$ 250–1.000+ de um editor. Grava, edita e publica no mesmo dia; antes eram 3–7 dias.

### 3.5 100x Engineers: 6 passos com pontos de checagem [Ct5_C2xC-oo]
1. **Pré-requisitos:** Claude US$ 20 para testar; plano maior para uso regular. Juntar roteiro, A-roll e/ou VO.
2. **Treino de estilo:** 15–20 imagens de um estilo ("pastel neo-brutalismo"), do Pinterest e Cosmos. Pedir só a descrição do estilo e aprovar. As referências precisam ser **consistentes entre si**.
3. **Teste de estilo:** 3 imagens estáticas de 3 trechos do roteiro.
4. **Teste de animação:** animar a 1ª imagem segundo a frase dela. Os checkpoints economizam tokens antes da tarefa pesada.
5. **Storyboard:** o Claude gera e você corta e acrescenta, ou você escreve e o Claude critica. Ex.: "texto na minha frente / texto atrás de mim" escrito frase a frase.
6. **Edição final:** "usando o storyboard, o roteiro e o estilo, crie o vídeo".
- **Configuração:** Opus 5.5 em **esforço médio** ("alto às vezes melhora"). Leva 20–90 min (60 s simples ≈ 20–25 min).
- **Não colocar vídeos de mais de 1–2 min** de uma vez: editar em pedaços.
- **Extras:** skill **AE Builder** (deles; converte o MP4 em projeto editável do After Effects, link na descrição) e MCP customizado para o Premiere.
- Reel de 60 s em menos de 30 min e menos de US$ 2.

### 3.6 Matt Loui: Claude escreve o projeto do CapCut [U-AdnIz1jIk]
- **Preparo:**
  1. Bruto e assets num projeto novo do CapCut, com nome fácil.
  2. **Fechar o CapCut.**
- **Prompt:** sincronizar gravação de tela; cortar repetições, erros e pausas; alternar rosto e tela; camada de ajuste (saturação, contraste, sombras baixas); **zooms lentos e suaves em pontos intrigantes**; música da pasta "intrigue"; "não use computer use nem abra o CapCut: escreva os arquivos do projeto direto"; "me pergunte o que precisar".
- Opus 5.5 em esforço extra; 58 min. Às vezes 1–2 arquivos precisam de relink.
- 51 min de bruto com erros → 18 min.
- **Motion:** Higgsfield MCP (conector customizado) + referências do Pinterest (documental, UI suave, stop motion, tipografia). Gerar a 1ª animação para aprovação → o resto → importar no CapCut. Segundo ele, o MCP "não gastou créditos porque escreveu código", mas exige assinatura do Higgsfield.
- **Aprender com o ajuste humano:** ele corrige à mão (ex.: o motion entrava logo depois de um jump cut; adiantou o grafismo para cobrir o corte), fecha o CapCut e pede "reanalise o projeto". O Claude compara antes e depois e anota o gosto dele. Depois: "crie uma skill com este chat e fluxo".
- **Tempo honesto:** 1º projeto ≈ 3 h de máquina com ~10 min ativos; depois cai. Estima economizar 20–30 h por projeto.

### 3.7 Eddie: skill de cortes ("Clipper") [IY08-3TS2o8]
- **Um prompt** ("rode a skill Clipper para este vídeo" + link). Podcast de 2 h do MrBeast → 7 cortes em ~30 min (a edição dos 7 levou 7 min). Cada corte com título e legenda de post.
- **Critérios de escolha:**
  - o trecho se entende sozinho por um estranho sem contexto;
  - começa exatamente no gancho, pulando a enrolação anterior;
  - termina no *payoff*;
  - todo corte abre com um tipo de gancho: fato surpreendente, afirmação ousada ou início de história;
  - nota 0–10 e ranking.
- **Edição (scripts Python locais):**
  - tempo por palavra do Whisper;
  - legenda de 2–3 palavras por vez com palavras-chave destacadas ("billionaire", "million");
  - **detecção de rosto, zoom no fim da frase a cada poucos segundos**;
  - reenquadra a cada corte de câmera para o salto não ficar duro;
  - cor da legenda = cor da marca do criador, ou, se não souber, tirada do próprio vídeo;
  - **3 arquivos de whoosh** na skill, tocados nos zooms;
  - render 1080p.
- **Ajuste em linguagem natural:** "só o melhor corte, até 30 s, sem SFX, legenda azul".
- **Custo:** OpusClip 150 min/mês por US$ 15 (o podcast gastaria 2/3); plano de US$ 29 ≈ 3 podcasts/mês. Na skill, só a escolha dos momentos usa IA (plano Claude).
- A skill fica numa comunidade Skool (7 dias grátis). Ele também automatiza "20 reels/dia" no Instagram.

### 3.8 Jason Cooperson: 7 estágios e re-render parcial [XeTAlZiIWHE]
- **Estágios:** intake → rough cut (WhisperX, corta silêncio, takes ruins, enchimento; "polish" do áudio) → graphics (HyperFrames, 1 por segmento) → **2ª passada de grafismo, um a um** ("é o que separa AI slop de vídeo bom") → legendas (só short) → música → export (cópia em Downloads; projeto mantido para reeditar).
- **3 presets de formato:**
  - short explicativo: grafismo na metade de cima, rosto embaixo, legenda no meio;
  - "TikTok raw": gancho em texto + corte cru com legenda;
  - long-form.
- **Números:** 4 min 10 s → 47 s em 10–15 min; grafismo em 22 min; ~2 h de idas e vindas na 2ª passada; ajuste de um grafismo em ~3 min, porque **só re-renderiza o trecho alterado**.
- **Chat novo a cada estágio**; travar o rough cut antes do grafismo ("difícil mudar depois").
- **Preferências citadas:**
  - legenda com caixa preta atrás e palavras entrando conforme ditas, fonte "Cool Vedica" (como dito; provável Coolvetica);
  - música a −18 dB testada, fechada em **−23 dB**;
  - correções do tipo "cortou perto demais da palavra, dê mais espaço antes".
- **Ultra/extra effort**; "funciona com qualquer modelo".

### 3.9 Davi Lops: limitações honestas [WfEB0uoMVm8]
- **O que funcionou sem erro numa semana de uso diário:** organizar cartões de câmera (copiar para SSD + HD + Google Drive por cliente, função e pasta "brutos", conferindo takes), virando uma skill chamada ao inserir o cartão. Também instalou sozinho um LLM local e conectou Claude Code ao Premiere e ao **DaVinci Resolve (versão grátis)**. ChatGPT e Gemini disseram "não dá".
- **O que falhou (nos 3 editores, com áudio de celular e de câmera):**
  - o Claude **não vê o vídeo, só a transcrição**;
  - corta no meio da linha de pensamento;
  - corta antes de a palavra terminar;
  - a narrativa das falas ficou certa, mas **as emoções ficaram erradas** (falando alto → baixo, risada → trecho sério), com cortes "muito secos".
- Legenda feita num editor por IA ("Palmier Pro", como dito) não deixava mudar sombra nem aspecto; ele exportou e legendou no Premiere.
- **Conclusão:** "o refino final precisa ser na mão". Um trecho de 30–40 min que levava 1–2 dias agora sai numa manhã. O diferencial humano fica no timing, na velocidade da narrativa e nos insertos.

### 3.10 Felipe Borges [_ifTU7vk4rE]
- **Alegação (não verificada):** "a Adobe abriu o código do Premiere e do Photoshop", com versões "Photocraft" e "Filmcraft" instaladas pelo Claude a partir de repositórios do GitHub. O próprio fluxo depende da comunidade paga dele (AIverse, "Design OS", plugin "Premiere Craft"). **Tratar com desconfiança.**
- **Útil:** thumbnail em camadas editáveis (título atrás da cabeça; degradê; logos), em vez de imagem gerada achatada. Testes A/B de título sem gastar crédito.
- **Motion sob PIP:** pedir ao Claude o motion **deixando o 1º terço da tela vazio** para o rosto em PIP; o PIP muda de lado ou de forma (retângulo arredondado ↔ círculo) quando o grafismo muda de lado.

### 3.11 Outros números de tempo e esforço
- **Matheus Fonseca [1IuB9IRyOCs]:** edição do bruto com HyperFrames ~50 min; motion do zero com música e SFX ~30 min ("sincronia com o beat perfeita"); animação 3D ~40 min, com storyboard de quadros-chave antes. Esforço máximo. Prompts "na descrição"; método por DM.
- **LABS fábrica [5HwmrSwNY-Y]:** pedir o sistema ("vídeos curtos de curiosidade em 3D por código") → referências do Pinterest → personagem teste → personagem refinado → *sheets* (frente e perfil) e objetos de interação → roteiro → voz → render. Gastou "praticamente o plano Max 20× inteiro" (com outros projetos).
  - Dois modelos de roteiro: **história** (pergunta impactante respondida só no fim) e **por etapas** (premissa forte, "etapa 1 um pterodátilo passa…").
  - Voz-guia grátis para marcar tempo; a definitiva do ElevenLabs depois.
  - **Ressalvas:** usa personagens de *Rick and Morty* (risco de IP) e faz upload em massa de 60 shorts.

---

## 4. Motion e texto

### 4.1 Regras de motion de lançamento (o "senior motion designer na skill") [D5qpBbEWTxo]
- **História:** chamar atenção → problema → produto resolve → payoff. Cena que não serve a um dos 4 sai.
- **Leitura:** **~1,5 s na tela** para tudo que importa.
- **Movimento:**
  - nada linear;
  - entrada em **~0,5 s com leve overshoot**, saída mais rápida que a entrada;
  - todo clique tem um "press" pequeno;
  - **cursor em arco**, como mão real.
- **Regra de ouro: nada para completamente.**
  - agrupar elementos sob um "pai" (null) e mover o grupo;
  - **defasar keyframes em poucos quadros** entre elementos;
  - começar o próximo movimento antes de o anterior assentar.
  "É a diferença entre parecer site e parecer vídeo de lançamento."
- **Specs:** 1920×1080, **60 fps**, safe zones para adaptar ao vertical.
- **Insumos:** brief do cliente; storyboard cena a cena (o que aparece, por quanto tempo, para onde a câmera vai); cores e fontes; fundos; **UI exportada do Figma em SVG, não screenshot** (zoom no botão continua nítido).
- **Bugs da 1ª versão e a correção de cada um:**
  - layout explodiu (Figma em 1440 px, vídeo em 1920) → **travar o canvas em 1920×1080 e posicionar relativo ao centro**;
  - fonte caiu para Times New Roman → **carregar a fonte antes do 1º quadro**;
  - contador pulou para 200 num quadro → **contagem de ~1 s**;
  - cards entraram juntos → **um a um, poucos quadros de intervalo, cada um assenta antes do check**;
  - pan rápido demais → mais lento, com easy ease.
- **Depois do conserto vem o gosto:** brilho vermelho suave no contador enquanto sobe; cursor "hesita" entre abas.
- **Sem storyboard:** cenas em ordem aleatória, tudo se mexe ao mesmo tempo, "UI bonita voando sem história".
- **Revisão como vantagem:** trocar 200 → 999 é uma linha de código e minutos de render.

### 4.2 Medir o estilo em vez de opinar (Mr omi) [OtbLL6OBNE4]
- **Por quê:** "pedir para analisar" faz o Claude pegar poucos quadros, e o que dá realismo são **micro-animações** que só aparecem a 30 fps.
- **Corpus:** 20 shorts, ~18 min, 32 mil quadros. Atenção: a 1ª tentativa baixou a **dublagem alemã**; conferir a faixa original.
- **Ferramenta de medição (escrita pelo Claude):**
  - **contact sheet de 60 quadros a cada 2 s** (549 folhas);
  - câmera rastreada por **correlação de fase**;
  - cortes secos marcados;
  - brilho, contraste e saturação por short.
- **O que ela mostrou de roteiro:**
  - paradoxo na 1ª frase, sem intro;
  - escalada → pivô → payoff → twist numa última linha;
  - 14 dos 20 viram para a explicação com as mesmas duas palavras ("you see");
  - **~4 palavras/s, sem ar morto**.
- **O que ela mostrou de visual:**
  - personagens 2D iluminados como se existissem no 3D (pegam a key light e projetam sombra);
  - mundo 3D com contorno de tinta preta;
  - saturado, realces quentes e sombras azuis frias;
  - **a luz segue a história**: quente na preparação, azul noturno quando começa a explicação;
  - 12 dos 20 com 1 corte seco ou nenhum: a câmera viaja para o próximo momento.
- **Comparação quadro a quadro, nosso × original, com números** (12 agentes: 7 de diagnóstico por eixo — cor, contorno, luz e sombra, textura, personagem, profundidade, movimento —, 1 de som e 4 de reconstrução):
  - contorno em ~3/4 das bordas no original, zero no nosso (o blur rodava no mesmo passo e apagava o contorno, e o blur nem aparecia);
  - câmera do original desliza em ~23 quadros com slow in/out, a nossa pulava em 3;
  - **sem preto puro** no original, quase preto no nosso;
  - sombras de pôr do sol roxas no original, marrons no nosso;
  - corpo de 3,5 cabeças no original, menos de 3 no nosso; braços e pernas 5× mais grossos no nosso;
  - fundos desfocados no original, levam o olho ao personagem;
  - madeira e pedra "pintadas" no original, com veio e frestas escuras.
- **Correções das próprias notas:** as "cabeças ovais" eram as nossas, as do original eram mais redondas (38 medidas). A câmera "parada 80% do tempo" na verdade se move em 65% dos quadros com push-in lento, que a ferramenta não via.
- **Checagem antes do render:** quadros estáticos pegaram câmera presa dentro de casa, árvores verde-azuladas e corrente na frente dos rostos.
- **Multiagente:** **cada agente com sua cópia do projeto e seus arquivos**; o merge é feito arquivo a arquivo. "Não divida só as tarefas, divida os arquivos."
- **Ferramentas:** Blender (1º teste) → **Three.js + Remotion**. 37 modelos 3D grátis, texturas pintadas por código, 14 expressões faciais e um efeito de contorno próprio (detecta bordas no 3D). 15 planos, 2.025 quadros, ~10 h.
- **Checar fatos antes do roteiro:** a profundidade do rio (2 pés) virou a melhor piada. Descartar tema que o canal de referência já fez (havia um com 5,7 milhões de views).
- **Grátis:** skill no GitHub dele com 5.000 imagens de referência.

### 4.3 Texto palavra a palavra no After Effects (sem plugin) [16kTqBUh8mM]
1. Animator com Opacity e Position.
2. Opacity 0; Position Y +100.
3. Range Selector → Advanced: Units = **Words**, Shape = **Ramp Up**, Ease High **−50**, Ease Low **100**.
4. Animar Offset de **−100 → +100**.
- Equivalente em código: stagger por palavra com rampa e easing assimétrico.

### 4.4 Outras técnicas de tela citadas
- **Motion conversa com a câmera:** zoom de câmera antes da transição do motion; diferença de zoom para esconder corte; câmera seguindo o rosto. [W7E7Ln0z6aY]
- **Zoom no fim da frase** (não no meio), centrado no rosto, a cada poucos segundos, com whoosh. [IY08-3TS2o8]
- **Legenda de 2–3 palavras** com palavra-chave destacada [IY08-3TS2o8]; caixa preta atrás e palavras entrando conforme ditas [XeTAlZiIWHE].
- **Layout short explicativo:** grafismo em cima, rosto embaixo, legenda no meio [XeTAlZiIWHE]. Matt Wolfe: 50/50 com B-roll em cima, legenda magenta, troca de B-roll a cada 1,8–3,6 s, 1º quadro = objeto real em ação [ep4psgAFOqc].
- **Texto na frente / atrás da pessoa**, decidido frase a frase no storyboard. [Ct5_C2xC-oo]
- **Cobrir o jump cut com a entrada do motion** (adiantar o grafismo para o corte). [U-AdnIz1jIk]
- **Pesquisa como B-roll:** screenshot do post ou da matéria original, rolagem gravada, grifo na linha, zoom no trecho. "Mostra só o fato exato." [HzXD4GVqXwM]

---

## 5. Dinheiro

### 5.1 O caso dos US$ 880/dia [D5qpBbEWTxo]
- **Nicho que paga mais:** vídeo de lançamento SaaS ou tech. 30 s = US$ 1.500–10.000 no mercado.
- **Onde buscar (Upwork):** "SaaS launch video", "product launch video", "UI animation", "app promo video", "SaaS explainer".
- **Filtros antes de gastar *connects*:**
  1. Pagamento verificado, mais de US$ 10 mil gastos, taxa de contratação acima de 50%.
  2. **Post com menos de 30 min** (ordenar por mais novo e atualizar).
  3. **Menos de 15 propostas e ninguém entrevistado ainda.**
  4. Abrir o site e ver se a startup **acabou de captar** (tem verba e prazo).
- **Exceção:** vaga de US$ 5–10/h de cliente com zero contratações pode ser cliente novo que não sabe preencher o orçamento. Se a empresa é real, aplicar com o preço real (quase sem concorrência).
- **Proposta:**
  - sempre com carta;
  - **palavras exatas do post nas primeiras linhas** (o cliente só vê 2 linhas na prévia);
  - nada de "sou motion designer com X anos";
  - estrutura **tarefa dele → minha solução → prazo claro**;
  - um **conceito pronto substitui o portfólio** ("mostra o que vai fazer para ele");
  - **1º marco pequeno**, para o cliente não correr risco.
  Resultado: 3 de 5 responderam em poucas horas.
- **Preço e margem:** cotou **US$ 1.000 por 30 s em 1 dia** (UI já pronta no Figma). Ficou com **US$ 880** depois da taxa do Upwork e da assinatura de US$ 20. Dica: pedir que o cliente pague a taxa ("meu preço é 1.000 + taxa"), mais ~US$ 100.
- **Comparação:** profissional no Fiverr (47 avaliações) cotou US$ 1.000 em 5 dias e entregou em 7, depois de adiar o prazo. Resultado "sólido".
- **Argumento de venda:** mesma qualidade no dia seguinte, revisão em 1 h, não em dias.
- **Recorrência:** SaaS precisa de lançamento → update de feature → anúncio → próximo lançamento. Ser o "cara de motion" fixo deles vira renda-âncora. "O cliente não compra código, compra vídeo pronto amanhã."
- **Onde foi o tempo:** quase todo no storyboard, não na geração.

### 5.2 Custos e preços citados nos outros vídeos
| fonte | custo com Claude | referência humana |
|---|---|---|
| HzXD4GVqXwM | ~US$ 27/vídeo (Max US$ 200 + Tella + Epidemic) | editor YouTube US$ 250–1.000+/vídeo, 3–7 dias |
| W7E7Ln0z6aY | US$ 1–4/vídeo no Pro | editor ≥ R$ 3.000/vídeo |
| REAOFI534lk | 600 milhões de tokens (100 milhões Opus + 500 milhões Sonnet) ≈ US$ 160 em API; 6 h de máquina. O 1º vídeo foram 1,4 bilhão e 12 h; o reuso cortou pela metade | 3 dias a 1 semana de editor |
| Ct5_C2xC-oo | reel de 60 s < US$ 2, < 30 min | — |
| IY08-3TS2o8 | só o plano Claude | OpusClip US$ 15 (150 min) / US$ 29 |
| AsvN_feasyY | assinatura | motion designer: centenas (edição) a milhares (lançamento de 15 s) |
| 5HwmrSwNY-Y | — | "canais faturando R$ 10–15 mil/mês" (alegação) |

### 5.3 Como os próprios criadores ganham (o modelo por trás dos tutoriais)
- **Comunidade com o "pacote pronto":** Skool de Eddie (7 dias grátis), Jason e Christian ("We Are No Code", grátis); Claude Code Club do Duncan (US$ 9/mês, "8 mil membros"); AIverse (Felipe); "Fábrica de vídeos darks" (Wesley); Patreon (byl); mentoria (Matheus).
- **Afiliados e patrocínio:** vidIQ (Matt Wolfe), OpenArt, Higgsfield, ElevenLabs, Riverside e Musicbed (The Editing Podcast).
- **Isca:** "skill grátis"; o detalhe fica na versão paga ("a minha levou 5 meses de notas" [REAOFI534lk]; "semanas de código" [XeTAlZiIWHE]).

---

## 6. O que aplicar nas nossas skills

Caminhos: skills em `C:\Users\intal\peformake\.claude\skills\`; scripts em `video-tools\scripts\`; skills globais em `~\.claude\skills\`.

### 6.1 Mudanças priorizadas
1. **`decupagem-video` + `scripts/decupar.py`: corte por palavra E por forma de onda.**
   - Toda borda de corte vinda do Whisper é conferida contra o envelope de áudio (RMS ou `silencedetect` numa janela de ±150 ms). O corte só acontece depois que o som da palavra acaba, com folga antes da próxima.
   - Regra explícita: manter a **última tomada limpa de cada linha**.
   - Gravar `removidos.csv` com o que foi tirado e por quê.
   - Hoje este é o erro nº 1 relatado por 4 fontes [ep4psgAFOqc, WfEB0uoMVm8, XeTAlZiIWHE, REAOFI534lk] e coincide com o feedback do Italo (§11b).
2. **`edicao-cliente`: duas etapas obrigatórias antes de qualquer B-roll.**
   - (a) `paper_edit.md`: citações escolhidas, em ordem, com tempo de origem e o "porquê" de cada bloco.
   - (b) **assembly só de áudio**, exportada em WAV/MP3 para ouvir de ponta a ponta. Só se ela se sustentar sozinha entram imagem e música. [CLnS22LHdkw, bwz-jLZz2w8]
   - Acrescentar a checagem "emoção na emenda": não colar trecho rindo ou falando alto em trecho sério ou baixo sem respiro. O Claude não ouve o tom [WfEB0uoMVm8]; marcar energia (RMS) e risadas na decupagem para essa checagem.
3. **`motion-remotion` / `motion-pro`: "beat map / motion map" antes de animar, aprovado pelo Italo.**
   - Tabela ideia → grafismo → tempo na tela → movimento de câmera casado. **1 grafismo por ideia, não por frase**, com ≥ 1,5 s legível. [REAOFI534lk, W7E7Ln0z6aY, D5qpBbEWTxo]
   - Fazer 1 grafismo-piloto como página (HTML) antes do lote.
4. **`motion-pro`: bloco "regras de movimento" do §4.1.**
   - overshoot na entrada (~0,5 s), saída mais rápida, *press* no clique, cursor em arco;
   - grupo-pai e defasagem de 2–4 quadros, sobreposição: nada para totalmente;
   - SVG, não print;
   - canvas travado e posição relativa ao centro;
   - fonte carregada antes do quadro 0 (`delayRender` até `document.fonts.ready` no Remotion);
   - contador ≈ 1 s.
   Bate com a regra do Italo de motion "real, centralizado, sem cara de site".
5. **Novo `scripts/qa_quadros.py` (chamado no fim de `motion-pro` e `edicao-cliente`).**
   - Extrair 10 quadros/s do render e checar os 6 erros do Duncan: animação duplicada, flash < 0,2 s, texto que entra tarde, grafismo sobre o rosto (detector de rosto já usado em `recortar.py`/`rastrear.py`), palavra repetida (da transcrição do próprio corte) e lábio dessincronizado.
   - Somar os nossos: legenda fora da área segura; duas vozes ao mesmo tempo (§11b).
   - Saída: lista com tempos + 5 quadros-prova. [REAOFI534lk]
6. **`clientes/*.md` + `estilos-edicao`: arquivo de aprendizados com triagem humana.**
   - Seção `## Aprendizados (pendentes)`, onde o Claude anota cada nota do Italo e responde "qual instrução teria evitado isto".
   - O Italo promove para `## Regras` ou descarta. [W7E7Ln0z6aY, REAOFI534lk, HzXD4GVqXwM]
   - Variante Premiere (Matt Loui): depois que o Italo ajustar a sequência, exportar o XML pelo MCP do Premiere, comparar com o XML que entregamos e registrar as diferenças como gosto. [U-AdnIz1jIk]
7. **`scripts/analisar_referencia.py` / `referencia_reel.py`: medir, não opinar.** [OtbLL6OBNE4]
   - contact sheets densas (ex.: 60 quadros/2 s);
   - movimento de câmera por correlação de fase (`cv2.phaseCorrelate`);
   - cortes;
   - brilho, contraste e saturação, % de preto puro e cor média de sombra;
   - palavras/s da fala.
   - Modo `--comparar nosso.mp4 ref.mp4` com a tabela de diferenças.
   - Aviso na skill: a medição erra movimentos lentos; conferir à vista. Sempre baixar a faixa de áudio original, nunca a dublada.
   - Isso também resolve o problema do `cortes.csv` marcar "1 plano" (aviso em `licoes_profissionais.md`).
8. **`NARRATIVA.md` §9 (aberturas): acrescentar a "abertura que retém" para peças contemplativas** (institucional Disalp, evento 3LM, história de pessoa da Natália). [gwyneGrX9Jw]
   - Gancho por mistério em vez de informação: nada de "meu nome é…";
   - primeira fala poética;
   - pistas em ordem crescente até a revelação;
   - fala de confirmação alguns quadros depois da imagem;
   - planos de 3–5 s;
   - som entrando em camadas (ambiente → som do objeto quando aparece → música por último).
   - Não contradiz o "0–3 s": a imagem mais forte continua no início; o que se segura é a *informação*.
9. **`NARRATIVA.md` §3 (arco): ferramentas para peças longas (> 2 min).** [bwz-jLZz2w8]
   - motivo visual recorrente que marca progresso (mostrado e quebrado na abertura, reconstruído a cada virada);
   - contagem regressiva quando há um desfecho conhecido ("faltam 3 dias para a obra");
   - fechar na pessoa afetada, não no protagonista institucional;
   - estrutura em cenas de 2–3 min, editadas uma por vez [CLnS22LHdkw].
10. **`motion-remotion`: política de render para o nosso PC (i7, 8 GB).**
    - rascunho em 540p (meia resolução) e render cheio só depois da aprovação;
    - **no máximo 1–2 renders simultâneos** (o Duncan travou com 9 e usa 4 numa máquina melhor);
    - re-render só do trecho alterado (Remotion `--frames=a-b` e concatenação) [XeTAlZiIWHE].
    - Lotes longos à noite.
11. **Orquestração (`edicao-cliente`): uma etapa por chat**, com `/clear` e um arquivo `estado.json` para retomar [W7E7Ln0z6aY, XeTAlZiIWHE].
    - Opus no planejamento e direção; subagentes Sonnet construindo grafismos por seção [REAOFI534lk].
    - Cada subagente com os seus arquivos, sem dois agentes no mesmo arquivo [OtbLL6OBNE4].
12. **Cortes verticais (`cortes-verticais`, prevista no W3 de `ferramentas_e_workflows.md`): critérios do Clipper.** [IY08-3TS2o8]
    - entendível por estranho;
    - abre num de 3 ganchos (fato surpreendente / afirmação ousada / início de história);
    - termina no payoff;
    - nota 0–10;
    - zoom no fim da frase centrado no rosto;
    - reenquadrar a cada corte de câmera;
    - cor da legenda = cor do cliente (de `clientes/*.md`).
    Uso: lives e palestras da Natália, eventos 3LM.
13. **Componentes Remotion "documental de arquivo"** (Natália, 3LM, origem da Disalp) [IjMVme1aDWg]:
    - título datilografado com micro zoom out;
    - overlay de poeira e película em Screen no corte;
    - fotos P&B com brancos baixados;
    - documento recortado com contorno branco;
    - ficha de personagem (foto com cantos arredondados + nome bold/regular + texto vertical);
    - **mapa inclinado com traço revelado por máscara e X final** (ver a skill `remotion:remotion-maps`).
    Encaixa na receita E5 de `receitas_estilos.md`.
14. **`referencias-instagram`: loop mensal de outliers por cliente** [ep4psgAFOqc]. Últimos 10 posts → outliers → o que o 1º quadro, o gancho e o ritmo tinham em comum → propostas de mudança nas regras do cliente (com aprovação). Sem vidIQ: usar os dados que o cliente exportar do Instagram.
15. **`capa-thumbnail`: capa em camadas editáveis** (título atrás da pessoa via recorte, logos e fundo separados), para testar 2–3 títulos sem regerar [_ifTU7vk4rE]. O `recortar.py fundo` já dá a máscara.
16. **`sound-effects` / `sound_design.md`: testar 8–10 SFX num gancho antes de fixar o "kit" do cliente** e cortar o excesso ("estava ocupado demais") [HzXD4GVqXwM]. Montar a pasta de SFX grátis por cliente perguntando ao Claude o que falta [W7E7Ln0z6aY].

### 6.2 Ferramentas que valem testar (sem instalar agora)
| ferramenta | o que faz | custo/licença citados | por que testar |
|---|---|---|---|
| **WhisperX** | transcrição com tempo por palavra | grátis, local (licença não citada) | 2 fontes dizem que a precisão por palavra é o que deixa o corte certo; comparar com o nosso faster-whisper |
| **Parakeet** (NVIDIA) | transcrição | grátis (licença não citada) | alternativa; medir em pt-BR e em CPU antes |
| **Three.js + Remotion** | 3D por código renderizado no Remotion | grátis | já temos Remotion; 2 fontes (Kaz, Mr omi) |
| **AE Builder** (100x Engineers) | MP4 do Claude → projeto editável do After Effects | link na descrição (licença não citada) | deixar o motion ajustável pelo Italo; auditar (W8) |
| **promptmotion.com** | galeria de motion feito com Claude, com o prompt | site | referência de estilo e prompt |
| **Skill do Mr omi** (GitHub) | estilo 2D-em-3D + 5.000 imagens de referência | grátis | estudar o método de medição |
| **Skill do Lucas Leite** (`/fluxo-de-edicao`, GitHub) | guia para montar fluxo em etapas | grátis | comparar com a nossa orquestração |
| **Snazzy Maps + Photopea** | estilizar mapa / editar asset no navegador | grátis | mapas da Natália (bairros) e rotas da Disalp |
| **DaVinci Resolve (grátis)** controlado pelo Claude | alternativa ao Premiere | grátis | plano B se o MCP do Premiere falhar |
| **Tella** (MCP) | gravação rosto + tela, com cortes e zoom via Claude | US$ 13/mês | tutoriais e aprovação com cliente (concorre com o Cap) |
| **Epidemic Sound** (conector) | música e SFX buscados pelo Claude | US$ 9,99/mês | se a pasta grátis de SFX não bastar |
| **ElevenLabs MCP** (full) | música, SFX, transcrição | pago | falhou na transcrição no teste do Matt Wolfe: exigir fallback |
| **vidIQ MCP** | dados de canal, outliers, retenção, comentários | pago (US$ 1 no 1º mês, patrocinado) | só se algum cliente investir em YouTube |
| **Blender** (via Claude) | objeto 3D quando não há B-roll | grátis | pesado para 8 GB; preferir Three.js |
| **Midjourney** | conceito visual para orientar o motion | pago | uso como o do James Jani: moodboard, não peça final |

**Evitar ou desconfiar:**
- "Photocraft/Filmcraft" como "Adobe open source" (alegação não verificada, ligada a comunidade paga) [_ifTU7vk4rE];
- personagens de IP alheia e upload em massa de 60 shorts [5HwmrSwNY-Y];
- "20 reels por dia" [IY08-3TS2o8];
- skills fechadas de comunidade sem auditoria (seguir o W8 de `ferramentas_e_workflows.md`).
