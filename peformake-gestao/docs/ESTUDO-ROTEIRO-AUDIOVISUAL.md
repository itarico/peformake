# Estudo: roteiro de vídeo que converte (Peformake + Ellcazo)

18/11/2026. **Isto é estudo, não regra.** Serve para a IA e a equipe pensarem melhor antes de escrever. A versão
operacional curta (o que a geração segue) está em `MOTOR-ROTEIRO.md`. Teste aplicado: `TESTE-ROTEIROS-SN.md`.

Pedido do Italo: a geração de roteiro "ficou bonita, mas não funcional". O roteiro tem que ser o diferencial da casa:
ideias novas e únicas por cliente, baseadas no que já deu certo (estrutura, gancho, neuromarketing, humor), com a
comunicação que o cliente precisa e foco em conversão. "Não é regra, é estudo; é construção narrativa criativa."

Base lida: `video-tools/NARRATIVA.md`, `video-tools/estilos/` (catálogo E1–E40, `estudo_narrativas.md` com G1–G12 e
M9–M18, `estudo_mavic.md` com H1–H14 e V1–V12, `licoes_profissionais.md`), `.claude/skills/roteiro-narrativa`
(SKILL, MODELOS, `IDEIAS_MDD.md`), `.claude/skills/peformake-estudo-mes` (rubrica, banco), os 2 roteiros da equipe
(Método Visage/Rosanne e Live do Colégio Militar), os 15 cards de audiovisual da SN (dez/2026), o briefing da SN,
o estudo de estratégia da SN (`tools/estudo-mes/sn.js`) e pesquisa na web (fontes no fim).

---

## 1. Por que a SN falhou (diagnóstico com os cards reais)

São 15 cards (14 roteiros + 1 pauta de entrevista). O que aconteceu, com número:

| Problema | O que está nos cards | Causa no processo |
|---|---|---|
| **Tudo igual** | 12 de 14 roteiros são "Sandra no balcão/corredor com a peça na mão falando para o celular". Os rótulos mudam ("Reel (ensinar)", "Reel (venda)", "Série curta") mas a **linguagem** é a mesma. Nenhum cinemático, documental, institucional ou história. | A regra "no máximo 2 formatos iguais" valia para o **rótulo**, não para a linguagem visual. A IA cumpriu a letra e furou o espírito. |
| **Público errado** | 7 de 14 falam com o consumidor leigo ("quantas pessoas moram aí?", "sua caixa transborda?", "você passa veda-rosca do lado certo?", "Gente, a SN não é só hidráulica"). Só 4 falam com quem compra para obra (S8 depoimento, S9 peça que parou a obra, S10 pedido, Extra Tigre). | O briefing lista **três públicos** e a IA tratou os três como iguais. O estudo da própria Peformake (`sn.js`) já tinha decidido: "vende para quem constrói", tese "tempo de obra", oferta "Manda a lista da obra". Esse estudo **não entra** no `strategy_brief_context`, e o quadro de dezembro não tem card de tese (aba resumo vazia). A IA escreveu sem leitura do cliente. |
| **Sem cruzamento de dados** | Nenhum card diz de qual dado nasceu. A obra de Maria Farinha (prova real do briefing) aparece só como pergunta de entrevista; "consultor que visita a obra", "8h às 18h sem fechar no almoço" (o post mais curtido) e "pedido programado de janeiro" ficaram de fora dos roteiros. | O formato do card não pedia a origem. Sem campo, sem disciplina. |
| **Referência fraca** | As referências foram escolhidas por view: "nomes estranhos que os clientes pedem" (130 mil, loja de elétrica falando com leigo), glossário de engenheiro civil (112 mil, público de estudante e curioso). Na lista do briefing, um "exemplo de distribuidora que fala com construtoras" (`DN1iXAXXPQz`) é **um post da própria SN** (18 curtidas). | Busca + colar. Nenhum critério de aderência ao público do cliente. View alto de público errado vira vídeo errado. |
| **Fala picada** | S3: "Joelho: faz a curva do cano." / "Luva: emenda dois canos iguais." / "Tê: divide a água pra dois lados." Cada linha é uma legenda; não há pensamento que atravesse o vídeo. | O formato `roteiro [{cena, fala}]` com uma linha por cena **induz** a escrever uma frase por plano. |
| **Sem apresentação, sem motivo para confiar** | A Sandra se apresenta em 1 de 14 ("Oi, eu sou a Sandra, da SN" como gancho, o mais fraco possível). Nenhum vídeo explica o método (como a SN confere uma lista), nenhum traz número ou caso. | Não havia papel "apresentar/autoridade" obrigatório no mix. |
| **Fecho carimbo** | 13 de 14 terminam em "Manda a lista/me chama no WhatsApp". | CTA único é bom; o fecho idêntico em todos não é. O fecho tem que nascer da história de cada vídeo. |

Lição: a IA não falhou por falta de criatividade, falhou por **falta de leitura do cliente antes de criar** e por
um **formato de saída que empurra para o raso**. O motor corrige as duas coisas.

---

## 2. O que os dois roteiros da equipe ensinam (estudo, não modelo)

### Método Visage (Rosanne, nail designer): 4 vídeos, 4 papéis
1. **Institucional** "Unhas em gel com acabamento natural": abre na **dúvida/medo real** ("tem receio de que fique
   grossa ou artificial"), **se apresenta depois do gancho** ("Eu sou Rosanne Ventura, nail designer"), conta o
   **método** em 1ª pessoa ("antes de começar eu observo o formato da sua unha, converso…"), dá um **valor emocional**
   ("um momento pra você sentar e ter um tempo pra você") e fecha **convidando, não empurrando** ("se esse é o tipo de
   atendimento que você procura, me chama").
2. **História em 3 perguntas** "Como tudo começou": perguntas escritas **a partir da história real** (kit do Mercado
   Livre, pós em genética, a filha) e, abaixo de cada uma, **"pontos pra resposta espontânea"**: o que a pessoa deve
   lembrar de contar, sem decorar. A 3ª pergunta é cênica ("se pudesse mostrar uma unha pra Rosanne daquele primeiro
   kit, qual detalhe…?") e gera **imagem** na resposta.
3. **Carro-chefe** "Alongamento em gel fica grosso?": título = objeção do público. Uma **ação de prova** ("olha esse aqui
   de lado comigo" + direção entre colchetes "[mostra a unha de perfil]"), depois a segunda dúvida que ela ouve
   ("qual técnica é a mais resistente?") e a terceira ("estraga a unha?"), cada uma respondida com critério, não promessa.
4. **Serviços como cardápio** "Qual serviço combina com você?": em vez de listar serviços, organiza por **desejo do
   cliente** ("quer ganhar comprimento? quer reforço? quer a cor por mais tempo?") e fecha com pergunta de escolha.

O que extrair: **cada vídeo tem um papel diferente no mês**; a fala é **contínua, em 1ª pessoa, de quem aparece**;
cada frase faz uma coisa (dúvida → quem sou → como faço → por que importa → convite); a direção aparece **só onde
muda o que se vê**; nada de adjetivo vazio; o fecho é convite com pergunta.

### Live do Batalhão Escolar (Colégio Militar do Recife)
- **Contexto antes de tudo**: quem fala, onde está, o que vai acontecer e por que importa ("ser coronel-aluno é
  assumir a responsabilidade de liderar os próprios colegas").
- **Blocos com função** (abertura, cerimônia, entrevista 1, entrevista 2, comandante, encerramento) e **direção em
  caixa alta separada da fala** ("CORTA PARA O PÁTIO · MICROFONE DA APRESENTADORA FECHADO").
- **Transições escritas** ("a gente volta em instantes pra ouvir…"): o espectador nunca fica perdido.
- **Perguntas que sobem de nível**: emoção ("o que passou pela sua cabeça?") → aprendizado ("o que liderar te
  ensinou?") → mensagem ("que conselho você deixaria?").
- **Referência de linguagem nomeada** (CazéTV, abertura de Paris 2024): a equipe sabe o "jeito" sem precisar de
  parágrafo.
- Encerramento com agradecimento, ciclo ("acontece todos os anos") e despedida.

---

## 3. Papéis no mês (para que serve cada vídeo)

Um mês bom é um **elenco de papéis**, não uma pilha de dicas. Cada papel responde a uma pergunta que o comprador faz
antes de comprar.

| Papel | Pergunta do comprador | Linguagens que servem | Sinal de que funcionou |
|---|---|---|---|
| **Apresentar / autoridade** | "Quem são vocês e por que eu confiaria?" | cinemático/institucional, documental, depoimento do dono | salvamentos, visitas ao perfil, "vi o vídeo de vocês" no atendimento |
| **História / origem** | "Por que vocês fazem isso?" | entrevista em perguntas, documental, micro-doc | tempo de visualização alto, comentários pessoais |
| **Objeção principal** | "Mas e o preço / o prazo / a confiança?" | talking head documental, diálogo leigo × especialista, demonstração | conversas que citam o argumento; menos "achei caro" |
| **Prova** | "Funciona mesmo? Para quem?" | caso real, depoimento de cliente, antes e depois, bastidor | pedidos de orçamento parecidos com o caso |
| **Método / como funciona** | "Como é trabalhar com vocês?" | POV câmera viva, passo a passo, bastidor | conversas mais qualificadas (já sabem o processo) |
| **Oferta** | "O que eu ganho agora e até quando?" | vitrine com condição, talking head direto, esquete com oferta dentro da ficção | conversas/pedidos no período |
| **Comunidade / humor** | "Eles entendem a minha vida?" | esquete, trend com motivo, personagem fixo | compartilhamentos e marcações (alcance entre pares) |
| **Educar / utilidade** | "O que eu preciso saber?" | tutorial, mito × verdade, lista | salvamentos |

Regras de bolso (de `estudo_narrativas` e `peformake-estudo-mes`): um mês de 6–8 vídeos tem pelo menos **apresentar,
objeção, prova e oferta**; o resto varia. O papel decide o gancho, a linguagem e o fecho, nessa ordem.

---

## 4. Estruturas (arcos) que funcionam

Detalhe e exemplos em `estudo_narrativas.md` §3 e `MODELOS.md`. Resumo por papel:

- **Institucional com método** (Visage 1): dúvida real → quem sou → como faço (método em 2–3 passos concretos) → o
  valor que não está no produto → convite.
- **Documental de lugar/processo** (M14, E2/E19): imagem que intriga → personagem → o que está em jogo → o processo
  mostrado (não dito) → respiro → frase que fecha na pessoa.
- **Objeção honesta** (M15 + ressalva honesta + efeito "Avis"): diz a objeção em voz alta → **admite o que é verdade**
  → reenquadra o critério de escolha → mostra o método/prova → convite sem pressão.
- **Cena com relógio** (M11): hora, nome, lugar → "normalmente…" (o que daria errado) → o serviço agindo → o resultado.
- **Leigo × especialista** (M18): a dúvida na voz do público → diagnóstico em 1 frase → itens com a tradução do leigo.
- **Esquete** (M19–M24): premissa (dor real numa cena de 2 pessoas) → 2–4 escaladas → virada em 55–75 % → produto como
  fim da piada → tag de 3–6 s.
- **Entrevista em perguntas** (Visage 2, Live): perguntas da história real + pontos pra resposta espontânea; sobem de
  emoção → aprendizado → mensagem.
- **Retenção no meio**: uma virada anunciada a cada 15–20 s ("só que tem um detalhe"), ressalva honesta a 70–85 %,
  fecho em círculo (a última frase responde a primeira).

---

## 5. Banco de ganchos por objetivo (0–3 s)

Tipos G1–G12 em `estudo_narrativas.md` §2. Escolha **pelo objetivo do vídeo**, nunca pela moda.

| Objetivo | Gancho que funciona | B2B / obra | Local / B2C |
|---|---|---|---|
| Autoridade | **Imagem que intriga** sem explicar (G2) ou **sentença contraintuitiva** (G5) | "Toda obra tem um dia em que tudo para por causa de uma peça pequena." | "Unha natural não é a mais fina. É a que respeita a sua." |
| Objeção | **A objeção dita em voz alta**, por alguém real (G8) | "'Sandra, vocês não foram os mais baratos.' Às vezes não somos mesmo." | "Alongamento em gel fica grosso?" |
| Prova | **Resultado + personagem identificável** (G1) ou **cena com hora** (G6) | "Sexta, 6h40. A obra de Maria Farinha precisava do biodigestor às 8h." | "A Dona Lúcia voltou depois de 3 anos." |
| Oferta | **Condição concreta + prazo verdadeiro** | "Pedido fechado até [19/12], material na obra na volta das férias." | "Só até sábado: [condição]." |
| Educar | **Curiosidade sobre algo que todos veem e ninguém repara** (G7) | "Por que o tubo de esgoto é branco e o de água é marrom?" | "Você sabe por que esse molho é mais vermelho?" |
| Humor / comunidade | **Conflito já em andamento** (G10) ou **título-meme** de situação reconhecível | "Quando a lista da obra chega num papel de pão…" | "Quando o cliente diz 'é só uma pontinha'…" |
| História | **In medias res** (G6) ou **contraste presente × passado** | "Em 2012 a gente era Só Hidráulica." | "Comecei com um kit do Mercado Livre." |

Regras do gancho: detalhe **concreto e verdadeiro** (número, nome, lugar); **teste sem som** (o texto na tela conta o
assunto em ≤ 2 linhas); 3 versões para testar (o gancho é a variável mais barata: no estudo da casa, o mesmo autor
foi de 91 a 2.791 comentários só trocando o gancho); nunca "oi, gente", logo ou título genérico; e **o gancho fala
com quem compra**: para B2B, a dor de quem responde pela obra (prazo, equipe parada, especificação), não a do curioso.

---

## 6. Neuromarketing aplicado a vídeo curto (o que a ciência e as plataformas dizem)

1. **Atenção se decide no começo.** A Meta orienta "capturar a atenção rápido: comece forte"; nos testes dela para
   feed, o que funcionou foi **reduzir a uma história só, abrir com a imagem mais forte, encurtar e trazer a marca
   para mais cedo, com texto para quem assiste sem som** (Meta for Business). Números de mercado circulam ("71 % decide
   em 3 s", "65 % de quem vê 3 s fica 10 s"); são de consultorias e relatórios internos, use como tendência, não como
   lei.
2. **Lacuna de curiosidade (loop aberto).** Curiosidade nasce quando a pessoa percebe uma lacuna entre o que sabe e o
   que quer saber, e cresce perto de fechar (Loewenstein, 1994). Na prática: abrir uma pergunta que **só o vídeo
   fecha** ("e não é o que você imagina", a peça que ninguém lembrou) e fechar **antes do CTA**. Loop que não fecha é
   clickbait e queima o perfil.
3. **História com arco > informação solta.** Narrativas com arco dramático (tensão que sobe e se resolve) provocaram
   aumento de cortisol e oxitocina, e a oxitocina se correlacionou com empatia e com doação depois do vídeo; histórias
   com personagem melhoram a compreensão e a lembrança dos pontos semanas depois (Zak, HBR 2014; Cerebrum 2015).
   Tradução: **personagem + o que está em jogo + virada**, mesmo em 30 s.
4. **Emoção também vende em B2B.** No banco do IPA analisado por Binet & Field para o B2B Institute (LinkedIn), a
   decisão B2B é só "um pouco" mais racional que a B2C; campanhas emocionais têm mais efeito de marca no longo prazo e
   as racionais ativam venda no curto prazo; o equilíbrio vence. A Volvo Trucks (Live Tests, "Epic Split") partiu do
   insight de que o comprador de caminhão é "coração e cérebro" e de que **muita gente influencia a compra**: mais de
   100 milhões de views e quase 8 milhões de compartilhamentos, mostrando **uma característica por filme**, de verdade.
5. **Comitê de compra.** Em compra B2B complexa, a Gartner fala em grupos de 6 a 10 pessoas. Numa construtora: quem
   especifica (engenheiro), quem compra (suprimentos), quem recebe e reclama (mestre), quem paga (dono). Cada vídeo
   escolhe **um** deles como alvo e fala a língua dele.
6. **Especificidade gera crença.** Número, nome, hora e lugar ("Maria Farinha", "desde 2012", "8h às 18h sem fechar
   no almoço") valem mais que adjetivo ("qualidade", "excelência"). Prova visual > afirmação.
7. **Contraste e ressalva honesta.** Admitir um limite verdadeiro aumenta a confiança no resto (estudo da casa: os
   vídeos de maior autoridade têm "mas pera, isso não faz X"; Avis "We're number two, we try harder" virou prejuízo em
   lucro e durou 50 anos).
8. **Prova social certa.** Depoimento de **par** (engenheiro para engenheiro) pesa mais que número de seguidores.
   Prova de caixa (pedidos, obras entregues), não de vaidade.

---

## 7. Humor em vídeo de marca (estudo)

**Por que funciona:** humor prende e faz lembrar (anúncios mais engraçados foram mais lembrados no Super Bowl,
Warren, Percival Carter & McGraw). **Por que dá errado:** o que derruba a marca não é falta de graça, é **reação
negativa** (ofensa, constrangimento, nojo): no mesmo estudo, a reação negativa explicou muito mais a atitude com a
marca do que o quanto o anúncio era engraçado.

**A teoria que guia (violação benigna, McGraw & Warren):** rimos quando algo "está errado" mas é inofensivo.
- **Violação leve > grave**: o humor grave (acidente feio, perigo) faz rir igual e fere a marca.
- **Inclusiva > exclusiva**: rir da **situação** ou da natureza humana ajuda a marca; rir de **um grupo ou pessoa**
  (o cliente, a mulher, o nordestino, o pedreiro) piora a marca mesmo quando é engraçado.
- **Humor com encaixe no produto** (humor-product fit) protege a marca justamente com público **muito envolvido**
  (comprador B2B), que de outro modo se distrai com a piada (*Psychology & Marketing*, 2022, fonte no fim). Em B2B, **a piada tem que ser sobre o trabalho dele**, não solta.
- Em B2B, comprador gosta de humor e vê pouco (mais de 70 % dizem que é eficaz; 36 % dizem ver com frequência,
  citados pela Refine Labs): é espaço vazio.

**Mecanismos** (catálogo completo H1–H14 em `estudo_mavic.md` §3): quebra de expectativa (solene → banal),
exagero da dor, literalização, mal-entendido, personagem-tipo com bordão, **paródia de gênero** (documentário,
detetive, telejornal), anacronismo, repetição em escalada, metalinguagem ("isto é um anúncio"), plot twist, ironia
dramática, timing do silêncio, trocadilho, tag depois da marca. Use **1 mecanismo-mãe + 1–2 de apoio**.

**Como não queimar a marca (checklist):**
1. O alvo da piada é a **situação** (a lista no papel de pão, o prazo, o calor), nunca o cliente, a equipe dele ou um
   grupo. Se alguém do público pode se sentir o "bobo", reescreva até ele se sentir o "entendido".
2. O riso nasce de uma **verdade do público** que só quem vive aquilo reconhece (isso é o que gera compartilhamento
   entre pares).
3. **O produto é o fim da piada** (V1): troque a marca por outra; se a piada continua funcionando, ela não vende.
4. Uma frase séria no meio, curta, que **devolve a credibilidade** ("brincadeira à parte: decifrar lista é trabalho
   nosso").
5. Atuação séria, ninguém ri da própria piada; o absurdo é levado a sério.
6. Nada de piada racial, de gênero, política, de doença, de demissão ou de acidente de obra.
7. Em B2B: humor **de ofício** (a obra, a lista, o prazo, o jargão) > humor de internet (meme da semana).

**Exige na diária:** 2–4 pessoas que topem atuar, 1 locação real (o galpão, o balcão), lapela em todos, ensaio de
10 min, 2–3 takes por fala para achar o tempo do silêncio. 1 esquete ≈ 1h de diária.

---

## 8. Linguagens visuais e o que cada uma exige

Gramática completa em `catalogo_estilos.md` (E1–E40). Aqui, o que importa para planejar a diária.

| Linguagem | Serve para | Quem aparece | O que exige | Tempo de diária | Cuidado |
|---|---|---|---|---|---|
| **Cinemático / curta (E19)** | apresentar, autoridade, marca | dono ou personagem real; voz off | Ellcazo: câmera, lentes, luz motivada, gimbal/tripé, locação preparada, roteiro de planos; voz gravada à parte em sala silenciosa | 2–3 h (+ obra externa) | precisa de **ideia e personagem**; "bonito sem história" é vitrine cara |
| **Documental mínimo (E2)** | história, prova, processo | pessoas reais no lugar real | 2 tamanhos de plano, lapela, pouca encenação, acompanhar o processo de verdade | 1–2 h | deixar a pessoa falar; não decorar |
| **Entrevista sentada** | história, autoridade, corte em vários vídeos | dono, cliente | 2 câmeras (aberto + close), luz suave, fundo com profundidade, perguntas + pontos pra resposta espontânea | 40–60 min rendem 3–5 cortes | pedir resposta em frase completa (a pergunta é cortada) |
| **Institucional falado (talking head)** | apresentar, objeção, oferta | dono | teleprompter ou bloco curto decorado, 2 enquadramentos, inserts de prova | 30–40 min | fala contínua, não picada; inserts = o que é dito |
| **POV câmera viva (E17)** | método, bastidor, passeio | quem conduz | grande-angular na mão, caminho ensaiado, fala contínua andando | 20–30 min | o cenário tem que provar algo |
| **Tutorial / demonstração (E9)** | educar, prova de produto | quem domina | close de mão, mesa limpa, luz dura, um passo por frase | 20 min | resultado primeiro |
| **Esquete / humor (E18)** | comunidade, alcance, objeção leve | equipe que atua | 2–4 pessoas, figurino barato e assumido, lapela, campo/contracampo | ~1 h | checklist do §7 |
| **Trend / nativo de feed (E22)** | alcance barato | equipe | celular, áudio do momento | 10 min | só com motivo ligado à tese; a equipe do cliente faz no dia a dia |
| **Bastidor cru (E21)** | prova de que é real, rotina | equipe | celular, sem grading | contínuo (cliente grava) | não confundir com conteúdo principal |
| **Depoimento de cliente** | prova | cliente real com autorização | marcar com antecedência, 2 perguntas boas | 20–30 min por pessoa | autorização de imagem; nunca roteirizar a resposta |
| **Vitrine / lista** | oferta, mix | produto | planos de produto limpos, ritmo | 15 min | só depois que o cliente já confia |
| **Motion / texto (E14, E16)** | tese, dado, carrossel animado | ninguém | só edição | 0 de diária | não substitui gente quando gente rende mais |

Mistura recomendada num mês com 1 diária Ellcazo: **1 cinemático/documental** (o que só a Ellcazo faz) + **1 entrevista**
que vira 3 cortes + **1 talking head de objeção** + **1 esquete** + **2–3 de celular** que o cliente grava no dia a dia.

---

## 9. Escrita: fala contínua, cada frase com função

O erro da SN, em um exemplo:

> Picado (legenda): "Joelho: faz a curva do cano." / "Luva: emenda dois canos iguais." / "Tê: divide a água pra dois lados."

> Contínuo (pensamento): "Quando um encanador me pede 'aquele do banheiro', eu já sei que vou precisar perguntar mais
> duas coisas: a bitola e se é água quente ou fria. Lista de obra quase nunca vem completa, e tá tudo bem. O meu
> trabalho é perceber o que ficou de fora antes de virar uma viagem a mais."

Como escrever:
- Escreva **como a pessoa fala**, em 1ª pessoa, num bloco por momento do arco (não uma frase por plano).
- Cada frase faz **uma** coisa e dá pra dizer qual: abre a lacuna, apresenta, mostra o método, prova, admite limite,
  vira para o espectador, convida. Frase sem função sai.
- 3–12 palavras por frase, com variação; frase curta como pancada depois de uma longa.
- **Direção separada da fala**, em caixa alta, só onde muda o que se vê ou o tom (como na Live).
- **Mostre o que se diz** (falou "lista", aparece a lista real; falou "Maria Farinha", aparece a obra).
- Velocidade para estimar duração: 3,3 palavras/s (Reels falado), 2,5 (institucional), 1,5 (emocional/documental).
- Fecho que **responde o gancho** e convida com uma ação só, dita do jeito daquele vídeo.

---

## 10. Fontes

- Meta for Business: "Adopt a mobile-first creative approach" (facebook.com/business/news/mobile-first-creative) e
  "Video ads: testing what works for mobile feed" (facebook.com/business/news/building-video-for-mobile-feed).
- Loewenstein, G. (1994). *The Psychology of Curiosity: A Review and Reinterpretation*. Psychological Bulletin
  (cmu.edu/dietrich/sds/docs/loewenstein/PsychofCuriosity.pdf).
- Zak, P. (2014). "Why Your Brain Loves Good Storytelling", Harvard Business Review; Zak (2015), "Why Inspiring Stories
  Make Us React: The Neuroscience of Narrative", Cerebrum (pmc.ncbi.nlm.nih.gov/articles/PMC4445577).
- Binet, L. & Field, P. *The 5 Principles of Growth in B2B Marketing*, LinkedIn B2B Institute
  (business.linkedin.com/advertise/resources/b2b-institute/marketing-as-growth).
- Contagious (2014), "Insight & Strategy: Volvo, Live Tests" (contagious.com/en/article/news-and-views/insight-strategy-live-tests).
- Gartner, B2B buying journey (gartner.com/en/sales/insights/b2b-buying-journey), via resumo em geisheker.com.
- Warren, C. & McGraw, A. P. (2016). "When Does Humorous Marketing Hurt Brands?", Journal of Marketing Behavior
  (cópia em wearesocial.com/uk/wp-content/uploads/sites/2/2021/09/warren.mcgraw.2016a.pdf).
- Warren, C., Percival Carter, E. & McGraw, A. P. "The Influence of Perceived Humor and Negative Emotional Reactions on
  Brand Attitudes" (leeds-faculty.colorado.edu/mcgrawp/pdf/warren.percivalcarter.mcgraw.inpress.pdf).
- "The influence of humor in advertising: Explaining the effects of humor in two-sided messages", Psychology &
  Marketing, 2022 (onlinelibrary.wiley.com/doi/full/10.1002/mar.21634).
- Refine Labs, "Why Humor Works in B2B Marketing" (refinelabs.com/blog/why-humor-works-in-b2b-marketing).
- Avis "We try harder" (DDB, 1962), resumo em mynameiskalam.com/case-studies/avis-we-try-harder.
- Estudos internos: `video-tools/estilos/estudo_narrativas.md`, `estudo_mavic.md`, `catalogo_estilos.md`,
  `video-tools/NARRATIVA.md`, `.claude/skills/roteiro-narrativa/`.
