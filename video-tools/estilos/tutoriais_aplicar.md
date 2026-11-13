# Tutoriais — o que ENSINAM (fazer aqui) + a EDIÇÃO do próprio vídeo

Cada referência tipo B é estudada duas vezes: **(1) o conteúdo** (como fazer aqui no Claude/Premiere) e **(2) a
edição** do vídeo em si (que também é aprendizado). Brutos em `D:\PEFORMAKE\REFERENCIAS\_tutoriais\` (ou onde
indicado). Ferramentas citadas são verificadas em `ferramentas_citadas.md` antes de instalar.

---

## Melika Zaghari — Transição X-RAY (`De6W6_hRjEP`, 23 s, 687 comentários)
**(1) Ensina — transição raio-X no corte** (ela usa DaVinci; equivalente no Premiere entre parênteses):
1. Print do **último quadro do clipe 1** e do **primeiro do clipe 2**.
2. Gerar a versão **raio-X** de cada print numa IA de imagem (ChatGPT/Nano Banana) mantendo composição, luz, cor e
   fundo idênticos — só o sujeito vira esqueleto/estrutura interna luminosa. (Prompt dela é fechado por "comente
   XRAY"; escrever o nosso: "Transform only the main foreground subjects into a realistic technical X-ray /
   reverse-engineering visualization; keep the original composition, background, lighting and colors unchanged".)
3. Duplicar 3–6 quadros de cada lado do corte numa trilha acima.
4. Isolar o sujeito (Magic Mask → no Premiere: **máscara de objeto/rastreio** ou `recortar.py` para fosco).
5. **Curvas** subindo a exposição até ficar negativo estourado.
6. Modo de mesclagem **Diferença** (Premiere: Opacidade → Modo de mesclagem → Diferença).
7. Repetir no outro lado.
8. Colocar os quadros raio-X **ao lado** dos negativos (sequência: normal → negativo → raio-X | raio-X → negativo
   → normal), 2–4 quadros cada.
9. SFX curto: whoosh/scan/impacto sincronizado (ver `sound_design.md`).
- **Para nós:** troca de produto/máquina (MF: ferramenta → raio-X mostrando o motor interno; Disalp: lata → tomate
  dentro). Usar no máx. 1 vez por vídeo, no momento-chave. A IA de imagem precisa ser **gratuita ou do cliente**.

**(2) Edição do vídeo:** abre com o **resultado** (2 s de transição pronta, antes de explicar nada) → título
manuscrito amarelo "Transition" → passos com **tela do software curvada (lente/barril)** e título manuscrito
branco por passo + legenda pequena embaixo → CTA no meio ("Comment XRAY for the prompt") → fecha mostrando o
efeito de novo em outra cena. 1 passo ≈ 1,5–2 s. Fonte script (manuscrita) + texto simples = tutorial com cara de
marca.

---

## Gian Angioletti — "30 Claude Animations" (`DfcxCxTBVsw`, 39 s, 2.177 comentários)
**(1) Ensina — catálogo de 30 animações feitas pelo Claude** (os prompts são liberados por "comente ANIMATE"):
Map Route · Headline (jornal) · Teardown (explodido de produto) · Split Flap (painel de aeroporto) · Git City ·
Stat Chart · Globe Arcs · Agent Swarm · Before/After · Swiss Grid · Blueprint Draw · Paper Desk · Laptop Reveal ·
Notifications · Iso Flow (isométrico) · Ink Wash (nanquim) · Type Slam · Day Counter · Hologram · Ink Doodle ·
Deep Time · Contour Map · Neon Silhouette · Particle Logo · Turntable (produto girando) · Money Stack · Receipt
(nota fiscal) · Iceberg · POV Doodle · Terminal Bloom.
- **Para nós:** isso é exatamente a **biblioteca de motion** que precisamos. Recriar como **componentes nossos
  (Remotion/HyperFrames)** com prompt-receita próprio, priorizando os úteis aos clientes: Teardown e Turntable
  (MF: máquina explodida/girando), Receipt e Money Stack (preço/economia), Day Counter, Split Flap (anúncio de
  evento 3LM), Map Route (entrega Disalp), Before/After, Stat Chart, Headline (notícia da Natália), Particle Logo
  (fecho de marca). Não depender dos prompts fechados dele.

**(2) Edição do vídeo:** formato **"vitrine em lista"** — título fixo em neon verde-limão no topo, embaixo a janela
do terminal do Claude com a lista numerada (item atual destacado em verde, contador "07/30") e a prévia da
animação à esquerda; troca a cada ~1 s; fundo preto com brilho verde. Fecha com o card de comentário "ANIMATE" e a
resposta automática. Formato barato de produzir e que gera muito comentário.

---

## Andreia Schneider — plugin lemo-opuscar (`DfXLk9dlHgR`, em `_estilos\Instagram\71243138428\`)
**(1) Ensina:** plugin de Claude Code com **66 estilos de cinema em código** (ukiyo-e, aquarela, óleo, 3D
storybook, briefing de satélite…); escolhe estilo + tema e o agente faz roteiro, quadros, trilha e cortes. Prova:
"OPUSCAR 98" (98 vencedores do Oscar redesenhados). Instalação citada: `claude plugin install lemo-opuscar@lemolab`
(MIT segundo ela) — **verificação em `ferramentas_citadas.md` antes de instalar**.
**(2) Edição:** narração curta sobre trechos dos filmes gerados; frase de impacto de abertura ("6 minutos sem uma
única câmera").

---

## Bruno Moreira — skill Get B-rolls 2.6 (`DfZyB-lKUqY`, 36 s, 1.206 comentários)
**(1) Ensina:** skill para Claude Code/Codex: roteiro → **beats** com sugestão de B-roll por fala → busca a fonte
real (YouTube, Instagram, TikTok, Wikimedia, NASA, Pexels, Pixabay) e corta o trecho exato com **origem anotada**
→ storyboard que o **cliente aprova no navegador** → material bruto vira dado pesquisável (transcrição local) →
"receita" de pastas por cliente → ponte com HyperFrames; `setup` + `doctor` verificam ffmpeg/yt-dlp/playwright.
Verificação/licença em `ferramentas_citadas.md`. **Cuidado:** trecho de vídeo de terceiros (YouTube/IG/TikTok)
em peça comercial de cliente = risco de direito autoral → para clientes, só fontes livres ou material próprio.
Várias ideias valem copiar no nosso fluxo mesmo sem a skill: beats com B-roll por fala, origem de cada clipe,
aprovação do cliente por link, receita de pasta por cliente.

**(2) Edição:** motion de lançamento de software 100% gráfico, **sem rosto**: fundo preto + **um laranja** com
brilho radial; uma **palavra-conceito gigante por fala** em sans extra-bold com ponto final ("EXATO.", "LEMBRA.",
"DADO.", "ENTENDE.", "PRONTO.") e a palavra vira objeto/ícone (impressão digital no "DADO", check no "PRONTO",
escudo/cadeado nas chaves); UI real estilizada (prompt digitando `/getbrolls…`, timeline com trilhas SPLIT/
LETTERING/SFX, árvore de pastas, toggle ligado); números gigantes ("2.6", "61"); frases de 2–4 palavras, ~1 s cada,
locução seca. Fecho: logo + "COMENTA BROLL". Ótimo modelo para vender serviço/produto digital da Performake.

---

## Igor Henrique — Claude responde o WhatsApp (`DfcZQtkt599`, 52 s)
**(1) Ensina (fluxo, sem automação):** extensão do Claude no navegador (ele usa o Comet) → WhatsApp Web → pedir
"analise as conversas dos últimos 30 dias e ache possíveis clientes que demonstraram interesse e ficaram sem
resposta" → Claude lê o contexto de cada uma e **rascunha resposta no seu jeito de falar com os dados do negócio**
→ **você revisa e aprova cada envio**. Para nós: dá para fazer com o Claude in Chrome no WhatsApp da agência
(recuperar leads da Ellcazo/Performake) — sempre com aprovação mensagem a mensagem; WhatsApp de cliente só com
autorização dele.

**(2) Edição:** tutorial em **telas mockadas** (WhatsApp, Chrome Web Store, painel "Analisando o WhatsApp" com
barras e números 214/37/12, cartões de contexto, lista "para revisar antes de enviar", quadro de leads tipo kanban,
**fragmentadora** picotando as conversas esquecidas) sobre fundo preto com perspectiva 3D leve e grade de pontos;
legenda de 1–3 palavras embaixo com a **palavra-chave em serifada itálica azul com caixa de seleção** (como texto
selecionado no editor). Fecho: post com o passo a passo + comentário.

---

## Kallaway — "Desire Hook" (`Dfc59rPsETD`, 76 s, 945 comentários)
**(1) Ensina — roteiro de gancho que converte:**
1. **Comece pelo resultado desejado**, não pela informação secreta. Gancho de informação ("os 3 melhores truques
   do algoritmo") dá view de quem não compra; gancho de desejo ("como sair de 200 para 20 mil seguidores nas
   próximas 6 semanas") puxa quem quer o resultado.
2. **Amarre o resultado a um personagem identificável** (você, o espectador ou um terceiro): "como o Tony foi de
   200 a 20 mil em 6 semanas com um sistema de 3 passos". Se a solução não for óbvia, muita gente vai querer
   comprá-la.
3. Ele diz que há **5 modelos** de gancho "resultado + personagem" (fechados por "comente DESIRE").
- Já entrou em `NARRATIVA.md` §9. Para clientes: Disalp "como a pizzaria do Seu Zé passou a render 30 pizzas a
  mais por lata", MF "como o Carlos terminou a obra 1 semana antes com essa serra", Natália "como a Rua X deixou de
  alagar".

**(2) Edição:** talking head em estúdio escuro **alternando com tela dividida**: em cima, painel gráfico
(documento "Script" com Hook/Body/CTA, linhas grifadas em vermelho que viram o texto real, perfil passando de
1K → 166K seguidores, lista numerada "The Desire Hook Method" 01–05 com o item atual destacado e os próximos
desfocados); embaixo, ele pequeno. Volta para o rosto em tela cheia nas frases de convicção. B-roll encenado
(celular rolando, "?" sobre a cabeça). Título: sans branca + **palavra-chave em serifada itálica** ("The *Desire*
Hook"). Um vermelho só. Legenda branca de 1 palavra no meio. Lista com progresso visível = retenção.

---

## Victor Cardoso — "Construção inteligente" (`DfdACgbqey_`, 64 s)
**(1) Ensina (tese, o guia é fechado por "comente salve2"):** todo mundo usa o mesmo "prompt mestre", a mesma
skill e a mesma biblioteca de prompts → os vídeos feitos com Claude estão **ficando iguais**; e quando se tenta
mudar um efeito ou criar algo novo, "tudo desmorona". A saída é **entender como a animação é construída** — camadas,
depois movimentos, depois efeitos — em vez de depender de pronto. → Confirma nosso caminho: componentes próprios
e receitas por camada (não copiar biblioteca alheia), e cada animação com o "porquê" documentado.

**(2) Edição:** **gravação do monitor com o celular** (tela curva, teclado e luz azul do setup aparecendo, mão
mexendo no mouse no início) — dá prova de que é real e feito por ele, e cara de bastidor; texto fixo "Claude Opus
5.5 🤯" no topo. Na tela: motion claro e suave (fundo creme com **degradê azul desfocado**, ícones 3D de vidro azul,
palavras finas que aparecem, palavra-chave em **degradê roxo-azul bold**: "pronta", "construída"), depois a timeline
do After Effects/Premiere mostrando as camadas, e um alerta vermelho "desmorona". Narração calma, sem legenda
cinética. Ideia para nós: mostrar o **making-of na tela** (filmado do monitor) como prova de trabalho artesanal.

---

## Abdullayev Abdulaziz (editor, Uzbequistão) — tipografia em talking head (`De1jVwdsFbL`, 23 s) · só EDIÇÃO
Sem fala ensinando: é o making-of filmado da tela do Premiere (sequência "shirakmotion") mostrando o resultado.
- Talking head em fundo cinza-claro neutro; legenda curta com **palavra-chave colorida** (vermelho) e linha de apoio
  menor embaixo.
- **Texto gigante vermelho ATRÁS da pessoa** (condensada, ocupa a tela, pessoa recortada na frente) na palavra mais
  forte — técnica "texto atrás do sujeito" (`receitas_estilos.md` anexo XML + `recortar.py`).
- **Interlúdios gráficos de 1–2 s** que quebram o talking head: (a) colagem azul de jornal/recorte com a foto dele
  em P&B e palavra bold azul ("YANGI"); (b) pôster vermelho escuro com textura, **silhueta branca brilhando** no
  centro e serifada gigante ("TO'LADI") — a fala vira cartaz e volta para o rosto.
- Lição: alternar **rosto ↔ cartaz tipográfico** no ápice de cada ideia dá ritmo sem precisar de B-roll filmado.
  Serve para Natália (fala política forte) e depoimentos MF/Disalp.

---

## Allyson — "5 skills do Claude Code" (`DfUwzbcR1D5`, 58 s, 1.289 comentários)
**(1) Ensina (repos vistos na tela — verificar no SkillSpector antes de instalar):**
1. **Find Skills** (`vercel-labs/skills`, `npx skills find …` / `npx skills add …`): busca na biblioteca de skills a
   certa para o que você está fazendo e instala.
2. **Superpowers** (`obra/superpowers`): obriga o Claude a planejar, escrever teste antes (TDD) e revisar por
   subagente antes de mexer no projeto. (Mais para programação.)
3. **Claude-Mem** (`thedotmack/claude-mem`): memória persistente entre sessões (contexto comprimido e devolvido). Nós
   já temos memória por arquivos + CLAUDE.md; avaliar se acrescenta algo.
4. **Impeccable** (`pbakaus/impeccable`): "design system" com 24 comandos e 62 regras anti-cara-de-IA para front-end
   (útil para páginas/artifacts e para o motion HTML do HyperFrames).
5. **Task Observer** (repo na tela parece `…/one-skill-to-rule-them-all`, não confirmado): observa como você trabalha e
   melhora as outras skills em segundo plano — **cuidado**: skill que reescreve skills sozinha precisa de revisão.
→ Para nós os mais úteis: Find Skills (achar skills de vídeo) e Impeccable (anti-genérico); Superpowers só para
código. Adicionados à fila de verificação de `ferramentas_citadas.md`.

**(2) Edição:** motion de "lista de produto" escuro: número grande em **serifada itálica com neon** (01…05, cada um
na cor do item: azul, laranja, verde, vermelho, azul) que entra gigante e depois vira canto superior direito; nome
da skill + repo + selos (categoria, estrelas); terminal estilizado mostrando o comando sendo digitado e o resultado;
**metáfora visual por item** (velocímetro "rush to code" → "freio" para Superpowers; duas janelas "sessão de ontem /
sessão de hoje" ligadas por um cilindro para memória; gráfico de estrelas subindo 22.472 → 106.153; radar para o
observador); **mascote** pixelado laranja que reaparece; contador 78.256 → 100.000+ no gancho. Legenda de 2–3
palavras com **palavra-chave azul com caixa de seleção**. Sistema muito consistente = cara de série.

---

## Milad Aslani (motion designer) — tipografia "decode" em fundo branco (`DfZivEts0Fz`, 9 s) · só EDIÇÃO
- Pessoa recortada sentada no chão sobre **fundo branco infinito**, câmera parada; todo o resto é tipografia.
- **Texto que "decodifica"**: letras aleatórias embaralhando até formar a palavra ("rwpjvp" → "pqqyhz" → "product"),
  em sans fina cinza grande; sobre ela, **etiqueta verde-limão inclinada** com palavra pequena ("Congrats!", "why it",
  "edits") — o único acento de cor. Colchetes de canto `[ ]` marcando a palavra.
- **Tipografia pixelada** gigante para a virada ("But"), ícones pixel (coração) e **partículas quadradas verdes** com
  brilho que explodem nas transições; desfoque de movimento forte ao trocar de cena.
- **Lista vertical tipo roleta**: "value / difference / advantage / uniqueness" com a palavra ativa grande e nítida e
  as outras pequenas e apagadas, seta apontando a ativa, sob um "?" pixelado.
- Fecho: assinatura "aslani" + etiqueta "edits". Ritmo muito rápido (9 s), som de UI/glitch em cada troca.
- Para nós: abertura/fecho de marca (Ellcazo/Performake), anúncio de produto MF com a palavra-chave "decodificando",
  lista de benefícios em roleta. Implementação: Remotion/HyperFrames (texto embaralhado + etiqueta + partículas),
  pessoa via `recortar.py`.

---

## Sardor Ahmedov (editor) — talking head educativo com "cenas-cartaz" (`DfZGSx5xshh`, 22 s) · só EDIÇÃO
Making-of filmado da tela do Premiere (mostra o resultado, sem aula).
- **Abertura cinematográfica**: cena quente (luz de janela, livro aberto) com título **serifado amarelo-ouro grande** +
  subtítulo pequeno, e **contador de anos girando num arco** (2021 → 2026) — o tempo como gancho.
- **Cenas-cartaz azul-marinho** entre falas: palavra serifada fina "ASLIDA" com **anéis concêntricos dourados
  pulsando**; calendário em grade de pontos (2 meses) com a palavra-chave em **serifada itálica laranja** ("bemalol").
- **Talking head** (camiseta branca, cidade ao fundo): palavra-chave em serifada amarela bold **sobre o peito**
  (abaixo do rosto), ícones/emoji pequenos, **número grande translúcido atrás da cabeça** (2028); legenda
  secundária pequena branca. **Recorte com contorno pontilhado** ao redor da gola (detalhe de colagem).
- **Cena-mesa amarela/mostarda** (top-down): foto polaroid presa com fita, caderno e caneta, palavra serifada preta
  inclinada ("HAR XIL", "TAJVID"), sombra de janela — tipo moodboard físico; movimento de câmera lateral.
- Fecho: botão do YouTube vermelho com brilho saindo do peito (CTA).
- Lição: **uma família tipográfica serifada (amarelo/laranja/preto) costurando três ambientes** (filme quente,
  cartaz escuro, mesa colorida) dá unidade mesmo mudando tudo. Serve para Disalp (mesa de cozinha top-down com
  produto + palavra) e para depoimentos.

---

## Robson Oliveira — "+400 prompts de vídeo grátis" (`DfcYkpTMZyK`, 24 s) · marcado IMPORTANTE pelo Italo
**(1) Ensina:** uma coleção pública (na tela aparece um repositório do GitHub tipo "Awesome Opus 5.5 Videos", com
categorias Motion graphics, 3D, vídeo explicativo, jogo) com **o vídeo de exemplo + o prompt usado** em cada item;
fluxo: copiar o prompt → colar no Claude → "adapta essa animação pro meu assunto: lançamento do meu curso" → o
Claude mantém o estilo e troca textos e cores. Link fechado por comentário — **achar o repo público e verificar**
(fila de `ferramentas_citadas.md`). Uso para nós: **referência e ponto de partida**, não copiar — estudar como cada
prompt descreve camadas/movimento e transformar no nosso kit (ver lição do Victor Cardoso).
**(2) Edição:** talking head em estúdio escuro com microfone, legenda **condensada bold branca com palavra-chave em
ciano**, 2–3 palavras; inserts em tela cheia: mosaico de thumbnails em perspectiva com "+400" ciano gigante e
etiqueta amarela "DE GRAÇA", navegação no GitHub, chat do Claude digitando o pedido, lista de categorias com
check, comentários com emojis chegando (CTA visual).

---

## Naomie Davinci — gancho escrito na tela (`DehYzuWg3bn`, 74 s, em francês)
**(1) Ensina — "accroche textuelle" (o texto do gancho que aparece na tela):**
- **O que escrever:** parta do assunto + **um** destes: um problema que o público tem, um resultado que ele quer ou
  uma mudança que pode afetá-lo. Seja **preciso**: "seus 3 primeiros clientes" > "clientes"; "em 22 dias" > "em
  algumas semanas" (o número tem que ser verdade no vídeo). Use as palavras que o público usa. Corte o que não
  acrescenta.
- **Como mostrar:** fonte **legível** (nada caligráfico difícil), **terço superior** sem cobrir o rosto, legenda nem
  a interface, **máximo 2 linhas**, quebrar a linha sem separar palavras de uma mesma expressão.
- **Teste:** assistir o começo **sem som** — dá para entender o assunto e o porquê de assistir?
→ Vira regra de checagem do gancho em todos os nossos vídeos (NARRATIVA §9).
**(2) Edição:** talking head em ambiente quente (abajures, bokeh) alternando com **cartelas vermelho-vinho
chapadas** com tipografia: serifada **com capitular decorativa** ("*A*CCROCHE", "*C*HOISIR") + palavrinhas
pequenas em sans ao redor; **mãos pretas em silhueta apontando** para o "2 choses"; comparações certo/errado com
"X" e "✓" grandes translúcidos atrás do texto ("trouver des clients" × "ses 3 PREMIERS clients"); exemplos de
ganchos numerados. Abre com colagem de 3 thumbnails de exemplo. Uma cor (vinho) + branco = elegante.

---

## Kairoz Mind — "5 plugins grátis pro Claude Code" (`DfSKE9JAIGe`, 105 s, 11 mil curtidas)
**(1) Ensina (diálogo entre 2 personagens; adaptado de @petergriffin.ai):**
1. **Awesome Free LLM APIs** — troca para outros modelos grátis quando bate o limite → **NÃO** para nós (nosso
   trabalho depende do Claude; modelos aleatórios = qualidade instável e dados indo para terceiros).
2. **Strix** — teste de invasão automático em apps → só se fizermos sistemas para clientes (não é edição).
3. **Claude Mem** — memória entre sessões (mesmo do Allyson) → **TESTAR** (já temos memória por arquivos).
4. **Agent Reach** — lê X, Reddit, Instagram e LinkedIn "sem API" → **NÃO** (raspagem = risco de conta e termos de
   uso; nossas regras proíbem raspar Instagram logado).
5. **Claude Code Setup** — plugin **oficial da Anthropic** que analisa o projeto e recomenda skills, hooks,
   subagentes e MCPs → **VALE INSTALAR** (baixo risco; ajuda a organizar nosso repositório).
**(2) Edição:** formato **diálogo** com dois personagens (pergunta ingênua × resposta) — gancho de reclamação ("meu
Claude pede arrego em 10 minutos"); adaptação traduzida de reel gringo "com o nosso visual" (prática comum:
pegar formato validado lá fora e localizar).

---

## Sayantan Saha — montagem "rajada → herói → processo" (`DeqnUNoojtJ`, 15 s, 16:9) · só EDIÇÃO
**Gramática:** (1) **rajada de flash-cuts no gancho** — 12 cortes em 1,5 s (2–4 quadros cada), imagens-símbolo
isoladas em fundo chapado (branco/preto/vermelho) contando uma micro-história em sequência (semente → broto →
evolução), cortadas no ritmo da batida; (2) **close macro sensorial** (olho, pele arrepiada, luz) como respiro de
0,3–0,5 s; (3) **um único plano-herói longo** (6 s) com câmera 3D acompanhando o objeto em movimento (carro
derrapando sobre grade colorida, fumaça cobrindo a tela como transição); (4) **revelação do processo** — a fumaça
abre para a timeline do editor (prova de trabalho). Lição: contraste extremo de duração (2 quadros × 6 s) é o
ritmo; transição pelo próprio elemento da cena (fumaça, luz, buraco de fechadura).

## Ahmed Sami — showreel "100% Craft 0% AI" (`DcOIGDdss_L`, 84 s, 41,8 mil curtidas) · só EDIÇÃO (motion 2D/3D)
**Gramática de showreel de motion:** abre com **objetos 3D de cultura pop** (console retrô, cartucho, blocos de
videogame) montando o título "2026 Showreel" → cartela "LEVEL ONE." (metáfora de jogo costura os capítulos: "LEVEL
UP!") → sequência de trabalhos **cortada na batida**, alternando estilos (2D flat, 3D argila/claymation, neon,
colagem de papel, personagens) mas com **paleta roxo/rosa/amarelo recorrente** que dá unidade; transições por
**forma em comum** (círculo → planeta, retângulo → tela, linha → luz). Fecho: logo em selo roxo em fundo claro.
Para nós: modelo de **showreel da Ellcazo/Performake** (metáfora-tema + cor única + corte na batida + match de forma).

---

## Maestros da IA Hub — animação "desenhada à mão" pelo Claude (`Dfh7fFmSgie`, 57 s, 1.224 comentários)
**(1) Ensina:** repositório gratuito e de código aberto no GitHub (nome não dito; link fechado por "comenta
PINCEL") que faz o Claude gerar **animação com aparência de desenho à mão** — lápis, carvão, aquarela, pastel, giz,
caneta… **11 tipos de pincel**, uso comercial permitido (segundo ele). Fluxo: passar o repositório ao Claude →
descrever a animação ("esboço em carvão ganhando vida", "aquarela") → ilustrações animadas, transições artísticas,
motion "que não parece vídeo típico de IA". → **Achar o repo público e verificar licença/código**; muito útil
contra a "cara de IA" e para Disalp (ilustração de hortifrúti), Natália (bairro em aquarela) e aberturas.
**(2) Edição:** gancho = **resultado primeiro** (3 s de animações prontas em tela cheia) → talking head com legenda
amarela condensada no peito (2–3 palavras) → inserts de tela do GitHub e do chat do Claude sobre fundo claro com
**degradê lilás/roxo desfocado** → vitrine dos estilos (mosaico, tela cheia vermelha, amostras de traço de cada
pincel) → CTA "salve esse vídeo" + palavra no comentário. Alternância rosto ↔ resultado a cada 3–5 s.

---

## John — "treinei meu próprio modelo" / LTX Trainer (`Dcb4oFBBSFH`, 24 s) · EDIÇÃO FAVORITA DO ITALO 😍 + ensina
**(1) Ensina:** LTX Trainer (open source) — treinar um modelo de vídeo no **seu** estilo para que toda cena saia com o
mesmo visual, em vez de "prometer e torcer". Precisa de GPU forte → não roda neste PC (só em GPU na nuvem, paga).
**(2) Gramática da edição (para fazer igual):**
1. **Base cinematográfica escura e quente:** quarto/estúdio com luzes práticas (abajures, telas), sombras fundas,
   rosto meio na sombra; grade de cinema com **vermelho como único acento** (+ verde/roxo em 1–2 cenas de clímax).
2. **Tipografia cinética misturada, 1–3 palavras por vez:** palavra gigante condensada (branco ou vermelho) que
   ocupa a largura, **atrás da pessoa** ou ao lado; palavra pequena de apoio; troca a cada 0,3–0,6 s; palavra
   "esticada/borrada" de propósito na transição (smear: "WIIIKHIIW").
3. **Rabiscos à mão em branco** (contornos, molduras desenhadas em volta do sujeito, setas, círculos, "assinatura")
   animando por cima do vídeo — dá autoria humana.
4. **Recorte de silhueta** com halo de luz laranja/vermelha atrás (abertura) e **cards de tela flutuando** (UI,
   mini-vídeos em perspectiva) para "mostrar o produto".
5. **Cortes de 0,5–1,2 s** alternando close no rosto, plano aberto, detalhe (mãos no teclado), tela de UI e cartela
   tipográfica vermelha; alguns planos em quadro arredondado sobre fundo preto (cara de app).
6. Fecho: plano aberto calmo, luz natural, CTA em vermelho grande ("comment TRAINER").
Mistura de E1 (talking head cinético) + E16 (rosto ↔ cartaz) + E19 (curta cinematográfico). Para fazer aqui:
grade no Premiere/FFmpeg, texto e rabisco em Remotion/HyperFrames (rabisco = hand-drawn-video/p5.brush), pessoa
recortada (`recortar.py`) para texto atrás.

## Jerry Rogers — Higgsfield MCP (`Dfh1vOKxtZo`, 24 s) · ENSINA (ferramenta paga)
Vídeo de moda inteiro gerado por IA via **Higgsfield MCP** no Claude (promo: 3 dias grátis). É **pago por crédito**.
O que o Italo quer daqui: **montar o próprio "programa de edição"** = Claude Code + nossas skills (HyperFrames/Remotion,
real-sfx, earshot) + um gerador de vídeo por IA (Higgsfield ou alternativa) para as cenas que não dá para filmar.

## Murilo Abreu — Instagram Skills (`DexpW-DGAKJ`, 34 s) · ENSINA (ferramenta)
9 skills grátis para Instagram: legenda em 10 fórmulas de gancho, carrossel, hashtags, tirar cara de IA do texto,
planejar a semana, achar os posts que mais funcionaram no nicho e virar roteiro; nada publicado sem aprovação.
→ verificação em `lista_instalacao.md`.

## Pedro Augusto (@gut1n) — 24 skills de vídeo para o Claude (`DewQLa0FcyJ`, carrossel)
Slides não legíveis sem login; a legenda cita Video Use, HyperFrames, skills oficiais do Remotion e da ElevenLabs,
Clipify e o Skill Creator da Anthropic, em 6 categorias (bruto, motion, Shorts/YouTube, análise e legendas, cor e
áudio com vídeo de IA, fluxos completos). Verificação em `lista_instalacao.md`.

---

## Andrea (Sistemas con IA) — VoiceStudio (`DeKnZfbosMC`, 54 s, espanhol) · ENSINA (ferramenta)
VoiceStudio (debpalash/VoiceStudio, AGPL; plano "Pro" fechado para uso pago em várias máquinas): clona voz de uma
gravação limpa, cria vozes novas e **dubla vídeo para outro idioma no ritmo da fala**, tudo local; o Claude opera.
Precisa de máquina potente (lento em PC antigo). Para nós: narração com a voz do Italo/Ellcazo e versões em
outro idioma; **voz de cliente só com autorização por escrito**. Instalar pelo .exe dos Releases (não `irm | iex`).
Neste PC de 8 GB: testar só depois; ideal no Mac/PC novo. Voz genérica grátis já temos: Kokoro.

## Hudson Brendon (@99hud, 92 mil) — 6 reels visíveis sem login (de 336) · ENSINA (ferramentas Claude)
- `Dfk0orHFbIc` 5 plugins: SkillSpector ✅ instalado · Lemo-Opuscar ✅ instalado · Ponytail (economia de tokens —
  verificar) · FreeLLMAPI ❌ (troca o Claude por modelos aleatórios) · Agent Reach ❌ (raspagem de Reddit/YouTube/X).
- `DffrHm4DmJ4` **OpenMontage** (78 mil estrelas, AGPL): produtora de vídeo por agentes (pesquisa, roteiro, B-roll,
  trilha, efeitos, montagem) sobre Remotion; narração local grátis, imagens de acervo; Veo/Kling pagos opcionais.
  → TESTAR para estudar a estrutura dos pipelines (pesado para 8 GB).
- `DfhaP7YD_lh` **o que gasta o plano do Claude** (vale para nós): conversa longa reenvia o histórico inteiro
  (mudou de tarefa → nova sessão ou /clear); CLAUDE.md gordo entra em toda sessão (Anthropic recomenda < 200
  linhas, o resto em skills sob demanda); **MCP ligado e sem uso ocupa espaço** (desligar os que não usamos);
  /usage mostra quem mais gasta.
- `DfiP5dIip2Y` 9 apps open source (mesma lista do João Pedro, já avaliada em `ferramentas_citadas.md`).
- `Dfj9wi3kXNu` "Free Claude Code" (proxy para 61 provedores) ❌ — troca o modelo; `DfdGQ56E201` TimesFM (previsão
  de vendas, Google) — fora do nosso foco.
**Edição:** talking head simples + legenda; o valor do perfil está no conteúdo, não no estilo.

---

## Lote de avulsos (estudados 10/11/2026)

### Sky Tan — legenda de storytelling (`DexJ-qWiWdY`, 56 s) · ENSINA (roteiro de legenda) + E3
**Ensina — a legenda do post como história em 7 partes** (para os ~50 % de não seguidores): **Introdução** (quem
é você + motivo para continuar lendo) → **Luta** (você esteve onde a pessoa está) → **Ascensão** (quebra uma crença
dela, abre espaço para a sua) → **Prova** (depois da história = evidência, não ostentação) → **Mecanismo único** (o
que te diferencia numa fórmula simples) → **Expectativas** (o que ganha seguindo) → **CTA de duas portas** (material
grátis para quem não está pronto · conversa/agenda para o lead quente). Dele: 1.000 comentários → 100 pediram para
trabalhar junto, 700 receberam o material. → Usar nas legendas da Ellcazo e dos clientes (skill de copy/roteiro).
**Edição:** talking head escuro com diagrama colorido crescendo ao lado do rosto; palavra-chave em serifada itálica.

### Igor Henrique — demo de automação vendável (`Dfdf1VPtz6i`, 54 s) · ENSINA (negócio) + E15
**Ensina:** agente de IA no WhatsApp de clínica (transcreve áudio, entende urgência, consulta agenda, oferece 2
horários, confirma, envia localização, lembrete na véspera) vendido por até R$ 3 mil. **Roteiro = M11 "cena com
relógio"** perfeito: "São 23h47 e uma paciente manda um áudio…" → o agente age em tempo real → "41 segundos" → "quando
a dentista acorda, já tem 3 pacientes agendadas". → Ideia de serviço da Performake e modelo de roteiro para MF/3LM.
**Edição:** UI escura mockada (cards de agenda, relógio, ficha, notificação entrando em sequência).

### Gabriel Spricigo — skill "Anatomy" (`Del82x1DVA1`, 37 s) · ENSINA (ferramenta) + E12
**Ensina:** skill gratuita (Claude Code/Codex/OpenCode) que cria **animações isométricas**: explicações visuais,
wireframes, bento grids, engenharia reversa visual; usar um exemplo pronto como referência e pedir a sua. → Verificar
repositório/licença (fila de `ferramentas_citadas.md`) — útil para explicadores MF (máquina em isométrico).
**Edição:** avatar 3D do criador no canto apontando; cards + renders isométricos; fundo alterna preto/branco/laranja.

### Leonam Alves — 3 plugins para gastar menos tokens (`DfNpbO7hfPt`, 45 s) · ENSINA (ferramenta) + E15 tipográfico
**Ensina:** RTK (resume a saída do terminal antes do Claude ler; "até 90 %"), Context Mode (guarda fora da conversa o
que as ferramentas devolvem e passa só um resumo), Headroom (comprime arquivos/planilhas; "até 95 %"). Números são
dos criadores. → **Relevante para nós** (economizar o plano nos estudos) — verificar código antes de instalar.
**Edição:** sem rosto; fundo alterna preto/branco/cinza; palavras-chave em verde-limão/vermelho; números gigantes.

### Cauhi Jr — +700 prompts de vídeo em código (`DeoZD--iATa`, 87 s) · ENSINA (fluxo) + E3
**Ensina:** biblioteca de vídeos feitos em código (não gerados por IA) com o prompt de cada um, num site em
português: assistir → copiar prompt → colar no Claude Code → exportar MP4. Vantagem que ele destaca: **preço,
marca e cores saem exatos** (código, não IA geradora). Exemplos por nicho (Black Friday, imóvel, academia, curso,
clínica, confeitaria, hamburgueria). → Mesma lição do Robson (`DfcYkpTMZyK`): ponto de partida, não cópia.
**Edição:** rosto em moldura arredondada embaixo + mosaico de exemplos em cima; serifada itálica roxa.

### Felipe Tâmbara — lista de leads com dados verificados (`DfcdL09CaBf`, 41 s) · TRÁFEGO/prospecção
Em `REFERENCIAS\_trafego\`. **Ensina:** skill "Glacier" (nome como dito) que dá ao Claude fontes verificadas para
montar listas (ex.: 50 clínicas com telefone/Instagram e quem chamar primeiro) pagando por uso (~R$ 0,60) em vez
de ferramenta de R$ 719/mês; sem ela o Claude "inventa metade". → Verificar antes (dados pessoais/LGPD, termos de
uso das fontes). **Roteiro:** gancho de **comparação de preço** (60 centavos × R$ 719) + inimigo (G9) + prova.

---

## João Pedro Amorim — 9 trocas por open source (`DfTIAPVRKX-`)
**(1) Ensina:** Open Higgsfield, VoiceStudio, OpenSEO, AppFlowy, OpenWhispr, OpenProject, Cal.com, Chatwoot, Cap →
avaliação em `ferramentas_citadas.md`.
**(2) Edição:** receita **E12** em `receitas_estilos.md` (avatar cartoon + cards de dados, risco amarelo, sans +
serifada itálica).
