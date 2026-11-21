# O que funciona no YouTube em 2026 (canal Por Dentro)

Estudo de 21/11/2026. Cada afirmação tem a fonte e o peso dela:
- **[OFICIAL]**: página de ajuda ou blog do YouTube.
- **[DADO NOSSO]**: coleta com `yt-dlp` feita por nós (pastas em `pesquisas/` e este estudo).
- **[TERCEIRO]**: blog, estudo ou guia de criador. Serve de hipótese, não de regra.
Não encontrei anúncio oficial do YouTube descrevendo uma "mudança de algoritmo de 2026". Os textos que falam disso são
de terceiros e se contradizem em pontos (ver item 1).

## 1. Retenção
**O que se sabe.**
- O Studio mostra quantos espectadores continuam depois dos primeiros 30 s do vídeo longo (relatório de introdução).
  Taxa alta costuma indicar que a abertura cumpriu o que o título e a thumb prometeram. [TERCEIRO, descrição consistente
  entre vidIQ e 1of10]
- A satisfação pesa cada vez mais ao lado do tempo assistido: pesquisas de satisfação, espectador que volta, feedback
  negativo. O tempo assistido continua contando. [TERCEIRO: vidIQ, "How the YouTube Algorithm Works in 2026"; um resumo
  de vídeo diz que a retenção "não é mais a métrica principal", e isso contradiz as outras fontes, por isso fica de fora]
- Canais pequenos recebem teste de distribuição mais cedo, com mais peso para a satisfação. [TERCEIRO, relato de criadores]

**Gancho dos primeiros 30 s.**
- Paddy Galloway (consultor de MrBeast e outros) usa um teste simples: os primeiros 30 s do longo funcionariam sozinhos
  como um Short? Se sim, a abertura tem força própria. Ele também avisa para não reagir a cada pequena queda da curva.
  [TERCEIRO, resumo de entrevista]
- Regra nossa (`roteiro-retencao`): materializar a promessa nos primeiros segundos (cena, pergunta, afirmação ou
  contradição), dizer o que está em jogo e abrir o macro loop até os 30 s. Nada de "olá, pessoal" antes do valor.
- Os números de "gancho em 3 s" e "gancho em 5 a 10 s" que circulam em blogs se contradizem. Tratar como heurística.

**Loops abertos.** Macro loop pago perto do fim, um meso loop por bloco, retomada da pergunta a cada 60 a 120 s
(hipótese de trabalho do MDD, validar na curva de cada vídeo).

**Ritmo de mudança visual.**
- [DADO NOSSO] Tinocando e Nostalgia: entre 79 e 122 cortes em 10 min, ou um corte a cada 5 a 8 s
  (`perfis/tinocando-e-nostalgia.md`).
- [TERCEIRO] Criadores de alta retenção trocam de "estímulo" (cenário, formato, gráfico, música) a cada 45 a 60 s.
  Isso é além do corte: é mudança de modo.
- Aplicação: corte a cada 5 a 8 s e troca de modo de bloco (explicar, mostrar prova, contar, comparar) a cada 45 a 90 s.

## 2. CTR: título e thumbnail
- **[OFICIAL]** A ferramenta "Testar e comparar" do Studio testa até 3 títulos, 3 thumbnails ou combinações. O vencedor
  é escolhido pela **participação no tempo de exibição**, não pela taxa de cliques; depois o vencedor aparece para todos.
  Resultado pode ser vencedor claro, "desempenho igual" ou inconclusivo.
  (support.google.com/youtube/answer/16391400 e /13861714)
- O teste leva por volta de duas semanas para juntar dados. [TERCEIRO]
- Consequência: título e thumb que puxam clique mas não seguram perdem o teste. A embalagem precisa prometer só o que o
  vídeo paga.
- Prática: sempre subir com 3 versões de capa no teste (variar o conceito, não só a cor). Variantes muito parecidas tendem
  a dar inconclusivo. [TERCEIRO]
- [DADO NOSSO] Nos outliers de negócio do Brasil, os títulos fortes repetem 3 moldes: "COMO A MAIOR X DO BRASIL FALIU?",
  pergunta com contradição ("Por que tá todo mundo falindo menos a Havan?") e número com escala ("As 20 falências mais
  absurdas"). (`pesquisas/nicho-estrategia-2026-11-20/outliers.md`)

## 3. Shorts que puxam para o longo
- **[OFICIAL]** Todo Short pode ter um "vídeo relacionado" do mesmo canal, que aparece como link clicável abaixo do nome
  do canal no player de Shorts. Configura no Studio, aba Detalhes. (support.google.com/youtube/answer/14075157)
- Não encontrei número oficial de quanta audiência sai do Short para o longo. Medir no nosso Studio.
- Prática (skill `shorts-do-longo`): o Short abre um loop que só o longo fecha. Não entregar a resposta no Short; entregar
  a primeira metade e apontar o vídeo relacionado.
- Formatos com itens (índice de ícones, ranking, iceberg) rendem um Short por item.
- Publicar os Shorts nos dias seguintes ao longo, cada um com o link para ele.

## 4. Frequência de publicação
- O YouTube não confirma frequência como fator de ranking; a orientação oficial é perguntar se o ritmo é sustentável a
  longo prazo. [OFICIAL: "Upload schedule tips", support.google.com/youtube/answer/13616979; TERCEIRO: Lilach Bullock]
- vidIQ analisou 10,2 milhões de canais: a cada aumento de frequência, a mediana de crescimento mensal de views e
  inscritos foi maior. É correlação, não causa. [TERCEIRO]
- Outro estudo (8.942 vídeos de 270 canais) não achou vantagem em manter horário fixo contra publicar de forma
  irregular. [TERCEIRO]
- Recomendação para o Por Dentro: **1 longo por semana** (ritmo que a produção aguenta com qualidade) e **3 a 5 Shorts por
  semana**, todos ligados ao longo da semana. Melhor 1 vídeo bom por semana do que 3 rasos.

## 5. Como canais novos ou que voltam crescem rápido
- **[OFICIAL] Hype:** fãs podem dar "hype" em vídeos longos de canais do Programa de Parcerias com 500 a 500 mil
  inscritos, nos 7 primeiros dias após a publicação; cada pessoa pode dar hype em até 3 vídeos por semana; canais menores
  recebem multiplicador de pontos. Vídeos com mais hype entram num ranking de descoberta.
  (support.google.com/youtube/answer/15509925; blog.youtube "hype-global-expansion")
  Aplicação: se o canal está no Programa de Parcerias, pedir hype na primeira semana (fala curta no meio do vídeo e post
  na comunidade). Se não está, a ferramenta não vale ainda.
- [DADO NOSSO] Canal pequeno pode explodir com tema e embalagem certos: Arquitetos do Poder (5,9 mil inscritos) com
  881 mil views (226x); Rogger Kastalski (11,8 mil) com 772 mil (31x); "Coca Cola: O Império do Mal", canal Origens
  (17 mil), 745 mil (1.119x).
- Canal que volta: os primeiros vídeos ensinam ao algoritmo para quem entregar. Publicar 4 a 6 vídeos seguidos dentro da
  mesma lente (marketing por dentro), variando o formato, não o assunto-base. Misturar nichos no retorno confunde a
  audiência inicial (é o problema descrito em `POSICIONAMENTO-CANAL.md`).
- Série com nome e parte numerada segura a audiência entre vídeos (mecânica do caso Daniel Penin, ver
  `FORMATOS-APRESENTACAO.md` §2).

## 6. Hype x atemporal: proporção e como fazer o hype durar
**Proporção.**
- Fontes de criadores recomendam algo entre 70-80 % atemporal e 20-30 % em alta. [TERCEIRO: TubeMilestone;
  Video Creatr Podcast (80/20)] Não achei fonte para a divisão "70/20/10" que às vezes circula.
- Para o Por Dentro: **no retorno (dezembro de 2026), cerca de 40 % hype**, porque o calendário está cheio (GTA 6,
  Jogos Vorazes, Black Friday, Natal, Mega da Virada) e o hype traz a primeira audiência. **A partir de janeiro de 2027,
  70 % atemporal e 30 % hype.**

**Como transformar hype em vídeo que continua rendendo.**
1. **O mecanismo no centro, a notícia no gancho.** O título fala do mecanismo ("Como a Black Friday te faz comprar"),
   e a data aparece só na abertura e na thumb.
2. **Sem ano no título** quando o mecanismo vale todo ano. Ano só quando o ano é a notícia.
3. **Trocar a embalagem depois da onda:** passado o pico, testar um título atemporal no "Testar e comparar".
4. **Parte reutilizável:** o bloco "Use você" vale sem a notícia; ele vira Short atemporal.
5. **Datas que voltam todo ano** (Black Friday, Natal, Wrapped, Mega da Virada) são hype recorrente: o mesmo vídeo volta a
   ser buscado a cada novembro e dezembro.

## Fontes
- YouTube Ajuda, "Teste A/B de títulos e thumbnails": https://support.google.com/youtube/answer/16391400
- YouTube Ajuda, "Testar e comparar thumbnails": https://support.google.com/youtube/answer/13861714
- YouTube Ajuda, "Adicionar um vídeo relacionado aos Shorts": https://support.google.com/youtube/answer/14075157
- YouTube Ajuda, "Hype: qualificação e políticas": https://support.google.com/youtube/answer/15509925
- Blog do YouTube, expansão global do Hype: https://blog.youtube/news-and-events/hype-global-expansion/
- TechCrunch, Hype global (ago/2025): https://techcrunch.com/2025/08/26/youtubes-hype-feature-that-boosts-smaller-creators-launches-globally
- YouTube Ajuda, "Dicas de cronograma de envio": https://support.google.com/youtube/answer/13616979
- vidIQ, frequência de publicação (10,2 mi de canais): https://vidiq.com/blog/post/How-Often-Post-on-Youtube/
- vidIQ Research, estudo de frequência (jul/2026): https://vidiq.com/research/youtube-upload-frequency-study/
- vidIQ, algoritmo em 2026: https://vidiq.com/blog/post/youtube-algorithm/
- AIR Media-Tech, mudanças de 2026 mês a mês: https://air.io/en/trending/youtube-algorithm-in-2026-month-by-month-changes-that-affect-your-views
- 1of10, gancho dos primeiros 30 s: https://1of10.com/blog/how-to-hook-viewers-in-the-first-30-seconds-of-a-youtube-video
- Resumo de entrevista com Paddy Galloway: https://www.skool.com/syncraticsystems-3823/win-the-first-30-seconds-or-lose-everyone
- Lilach Bullock, frequência não confirmada como fator: https://www.lilachbullock.com/?p=148614
- TubeMilestone, conteúdo atemporal: https://tubemilestone.com/blog/youtube-evergreen-content
- Video Creatr Podcast, evergreen x trending: https://www.buzzsprout.com/1887347/episodes/17231682-evergreen-vs-trending-which-videos-actually-grow-your-channel
- Subscribr, equilíbrio entre os dois: https://subscribr.ai/youtube-strategy/evergreen-vs-trending-youtube-topics
- Dados nossos: `pesquisas/nicho-estrategia-2026-11-20/outliers.md`, `perfis/tinocando-e-nostalgia.md`,
  `FORMATOS-APRESENTACAO.md`, `PAUTAS-PROXIMAS.md`.
