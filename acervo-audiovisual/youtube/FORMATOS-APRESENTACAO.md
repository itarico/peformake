# Formatos de apresentação para vídeo longo (canal Por Dentro)

Estudo de 21/11/2026. O formato muda a cada vídeo; o escopo do canal não muda (`POSICIONAMENTO-CANAL.md`: tudo o que
você consome foi vendido para você, e a gente mostra como).
Skill de escolha: `formatos-youtube` (`skills-locais/formatos-youtube/SKILL.md`).

## Como os números foram coletados
- `yt-dlp` em 21/11/2026 (busca por termo, abas de vídeos dos canais) e o script `youtube-outliers/scripts/outliers.py`
  (score = views do vídeo / mediana do canal). Views são as do dia da coleta.
- Alguns títulos em português voltaram traduzidos para o inglês pelo YouTube (tradução automática da interface). Onde
  isso aconteceu, o título vem entre aspas com "(título traduzido)".
- "Não encontrei" quer dizer que a busca não trouxe exemplo com número; não é prova de que não exista.
- Assinaturas visuais vêm de observação geral dos canais. Nesta sessão não houve análise quadro a quadro (o download de
  vídeo falhou por falta de runtime JavaScript no yt-dlp). Para decompor um vídeo, use a skill `ler-video`.

## Resumo e nota de adequação ao Por Dentro
| # | Formato | Nota (0-10) | Uso no canal |
|---|---|---|---|
| 1 | Índice com ícones e progresso | 9 | "Todos os gatilhos de X explicados" |
| 2 | Estilo Daniel Penin (investigação-denúncia em partes) | 6 | Mecânica sim, tom não |
| 3 | Dossiê / investigação (Coffeezilla, Fern) | 9 | É a "Sala de Guerra" do canal |
| 4 | Ascensão e queda ("como X faliu") | 9 | Formato mais forte do Brasil no nicho |
| 5 | Ranking / top N com contagem regressiva | 8 | Listas de casos e golpes |
| 6 | Explicado em X níveis | 7 | Conceito de marketing do leigo ao especialista |
| 7 | Iceberg | 8 | Golpes, truques, lado obscuro do consumo |
| 8 | "E se...?" (cenário hipotético) | 8 | Panem; contas de loteria; "e se a marca X não existisse" |
| 9 | Mistério com revelação no fim | 8 | Origem de mitos de marca |
| 10 | Comparação lado a lado | 7 | Marca A x marca B, estreia x estreia |
| 11 | Linha do tempo / mapa que cresce (Nostalgia) | 7 | Expansão de uma marca pelo mapa |
| 12 | Tier list | 7 | Classificar estratégias |
| 13 | Desafio interativo ("descubra seu...") | 6 | Camada de interação dentro de outro formato |
| 14 | Tipografia cinética / texto (Tinocando) | 7 | Ensaio de ideia, sem imagem de arquivo |
| 15 | Entrevista / documental com fontes | 4 | Só quando houver acesso a gente de dentro |

Os 5 mais promissores agora: 1, 3, 4, 7 e 9 (detalhe no fim).

---

## 1. Índice com ícones e progresso
**Como funciona.** O vídeo abre mostrando o mapa inteiro: uma grade ou fila de ícones, um por tópico ("12 gatilhos").
Cada tópico acende quando chega a vez dele, com contador ("3/12") e uma barra de progresso fixa na borda. O título
costuma ser "Todos os X explicados em N minutos".
- 0:00-0:30: promessa e a grade completa de ícones na tela (o espectador vê o tamanho do caminho).
- Blocos de 45 a 90 s por tópico: ícone cresce para o centro, definição em 1 frase, exemplo, volta para a grade.
- Ordem do mais conhecido ao mais surpreendente; o último ícone fica "trancado" (cadeado) até o fim, que é o loop.
- Fecho: a grade toda acesa e a ligação entre os tópicos.

**Exemplos.**
- The Analyst, "Every Government Form Explained in 12 Minutes": 5.393.882 views.
- The Evaluator, "Every Autism Type Explained In 16 Minutes": 2.529.575 views.
- Explicação sem Complicação (117 mil inscritos, pt-BR): "Explicando todas as classes angelicais em 14 minutos"
  (título traduzido), 1.026.879 views; "Explicando todas as orientações sexuais em 13 minutos" (título traduzido), 664.035.
- Engenharia Explicada, "Todos os Tipos de ALICATES Explicados em 11 Minutos": 166.856.

**Por que retém.** O espectador sabe quanto falta (reduz a ansiedade de "isso vai demorar?") e quer completar a grade
(efeito de completude). Cada tópico é um micro loop que fecha rápido. O cadeado no último ícone segura até o fim.

**Serve para.** Taxonomias: tipos de gatilho, de golpe, de preço, de anúncio, de vendedor.

**Produção.** Baixa a média. Um molde de grade com ícones (biblioteca livre, por exemplo Lucide ou Tabler, licença MIT)
e barra de progresso em HTML+GSAP ou Remotion, reaproveitado em todo vídeo do formato. Voz e b-roll leve.

**Nota 9.** Encaixa com a lente "mecanismo com nome" (cada ícone é um gatilho com nome). Molde barato e reutilizável.

## 2. Estilo Daniel Penin
**O que foi verificado.**
- O canal principal (ID `UCXQPvU8tGvWy_mAfPPav--Q`) está **encerrado**: o YouTube responde "This account has been
  terminated for violating YouTube or Google's Terms of Service" (consulta de 21/11/2026). Não deu para assistir aos
  vídeos originais.
- Agregadores de estatística citam cerca de 2,7 mi de inscritos, 213 mi de views, 629 vídeos, duração típica de cerca de
  16 min, temas de marketing, economia, negócios, investimentos "e de vez em quando documentários". Dados de agregador,
  podem estar velhos.
- Caso mais conhecido (maio de 2023): "BLAZE - Tire dos Pobres e dê aos Influencers" e "BLAZE - A Face do Dono
  (Parte 2)". A imprensa registrou que o brasileiro apontado como dono disse estar sendo ameaçado após a exposição e
  chamou o vídeo de mentiroso.
- Os vídeos viveram também nos reacts: Casimiro reagindo a "A Face do Dono", 1.175.829 views; Super Xandão reagindo a
  "Tire dos Pobres", 463.222. Outros canais fizeram vídeos sobre ele: "A VERDADE sobre Daniel Penin" (Ismael), 531.283;
  Flow #226, 525.840; "O CASO DO DANIEL PENIN É PIOR DO QUE PARECE..." (Peter Aqui), 362.754.
- Canal secundário "Daniel Penin Stories": 313 inscritos; "Trailer: A história não contada do PABLO MARÇAL!", 2.600 views.

**Como funciona (pelo que os títulos e a repercussão mostram).**
- Título-tese moral com vilão e vítima ("tire dos pobres e dê aos influencers").
- Investigação em capítulos que viram vídeos separados ("Parte 2"): o loop fica aberto entre vídeos.
- Dinheiro e pessoa com nome no centro; o espectador é colocado como a vítima do esquema.

**Por que prende.** Indignação mais curiosidade ("quem está por trás?"), série que pede o próximo vídeo e assunto que vira
pauta de reacts (distribuição grátis por canais maiores).

**Riscos que o próprio caso mostra.** Acusação a pessoa física com nome, ameaça, contestação pública e canal encerrado.
Para o Por Dentro: copiar a mecânica (tese moral no título, série em partes, o espectador como alvo do esquema), nunca o
tom de acusação sem prova documental.

**Produção.** Média. Prints, documentos, voz forte. Exige checagem jurídica (`checagem-fatos`).

**Nota 6.** Mecânica valiosa, risco alto. Use só dentro do formato 3, com prova na tela.

## 3. Dossiê / investigação
**Como funciona.** Abre com a evidência mais estranha (print, anúncio, número), declara o que vai ser investigado e
segue a trilha: peça, pista, contradição, quem ganha, a conta. Termina com o que se sabe e o que segue em aberto.
- 0:00-0:45: a prova estranha e a pergunta.
- Blocos de 2 a 4 min, cada um com um documento novo na tela.
- Clímax: a conta (quanto alguém ganhou).

**Exemplos.**
- Coffeezilla (4,78 mi inscritos; mediana dos últimos 10 vídeos: 5,05 mi): "Exposing the Gambling Epidemic",
  10.000.000 views.
- fern (5,71 mi; mediana dos últimos 10: 5,0 mi): "The Most Disgusting Influencer Campaign of 2026", 11.000.000.
- BBC News Brasil, "Documentário BBC: O Golpista das Férias": 981.754.

**Por que retém.** Cada documento é recompensa e pista ao mesmo tempo. A pergunta "quem ganha?" é o macro loop.

**Serve para.** Black Friday, bets, golpes, campanhas de influenciador, promessas de produto.

**Produção.** Média. Prints reais (Biblioteca de Anúncios, sites, documentos públicos), mesa de dossiê em HTML+GSAP.
Combina com o estilo "Sala de Guerra".

**Nota 9.** É a forma natural do posicionamento.

## 4. Ascensão e queda ("como X faliu")
**Como funciona.** Começa no auge ou na queda (resultado primeiro), volta à origem, mostra a escalada e o erro, e paga
com a lição.
**Exemplos (de `pesquisas/nicho-estrategia-2026-11-20/outliers.md`).**
- Arquitetos do Poder (5,9 mil inscritos), "As 20 Falências Mais Absurdas da História": 881.228 (226x).
- Inteligência Visionária, "ITAPEMIRIM: Como a Maior Transportadora do Brasil Faliu?": 1.107.300 (55x).
- DisruptivoTV, "COMO A MAIOR OPERADORA DO BRASIL FALIU?": 724.542 (66x).
**Por que retém.** O fim é conhecido e a pergunta é o "como". Curva de tensão clássica.
**Serve para.** Marcas brasileiras, com a lente da comunicação (onde a mensagem quebrou antes do caixa).
**Produção.** Média: arquivo, manchetes, gráficos de dado público.
**Nota 9.** Formato mais forte do nicho no Brasil; a lacuna é a lente de marketing.

## 5. Ranking / top N com contagem regressiva
**Como funciona.** Lista numerada do menor para o maior, com o número 1 guardado para o fim. 1 a 3 min por item.
**Exemplos.** Desimpedidos, "TOP 10 MAIORES CANHOTOS DA HISTÓRIA": 2.273.633; Arquitetos do Poder (acima), 881.228.
**Por que retém.** Contagem visível e o "número 1" como loop. Fácil de cortar em Shorts (um item por Short).
**Serve para.** Campanhas, falências, golpes, viradas de marca.
**Produção.** Baixa a média. Contador em HTML+GSAP.
**Nota 8.** Risco: virar lista rasa. Cada item precisa de mecanismo com nome.

## 6. Explicado em X níveis
**Como funciona.** O mesmo conceito explicado 5 vezes, do leigo (criança) ao especialista. Cada nível tem cartão e cor.
**Exemplos.** WIRED, "Quantum Computing Expert Explains One Concept in 5 Levels of Difficulty": 8.016.139;
"Computer Scientist Explains One Concept in 5 Levels of Difficulty": 7.199.514.
**Em pt-BR:** não encontrei canal brasileiro fazendo esse formato com número relevante (a busca "explicado em 5 níveis"
devolveu outros formatos). Lacuna.
**Por que retém.** Progresso claro e a sensação de "subir de nível". Cada nível paga o anterior.
**Serve para.** Um conceito: preço psicológico, Spotify Wrapped, funil, ancoragem.
**Produção.** Baixa (narrado com cartões). O original usa entrevistados; o nosso seria narrado.
**Nota 7.**

## 7. Iceberg
**Como funciona.** Uma imagem de iceberg em camadas; cada camada mais funda é mais obscura. A câmera desce a cada bloco.
**Exemplos.** Wendigoon, "The Conspiracy Theory Iceberg": 17.489.039 (9h30 de duração); RafaLuc, "O Iceberg de South
Park": 1.092.567; espantalho, "O ICEBERG DE HORA DE AVENTURA": 849.134.
**Por que retém.** A camada seguinte é sempre "pior" (escalada garantida). Barra de progresso natural: a profundidade.
**Serve para.** Golpes de marketing, truques de varejo, lado obscuro das bets.
**Produção.** Baixa a média: um iceberg em camadas (HTML+GSAP) e a câmera descendo.
**Nota 8.** Formato quase sem uso na lente de marketing.

## 8. "E se...?"
**Como funciona.** Uma premissa impossível, seguida com dados reais até a consequência.
**Exemplos.** xkcd's What If?, "What if Earth grew 1cm every second?": 6.243.133; EconoSimples, "E se o Brasil se
dividisse em dois?" (título traduzido), 173.355; Histórias Alternativas, "E se a França tivesse colonizado o Brasil?", 96.897.
**Por que retém.** A pergunta é o macro loop e cada passo é uma consequência nova.
**Serve para.** Panem (em andamento); "e se você jogasse em todas as Mega da Virada?".
**Produção.** Média. Mapas e gráficos.
**Nota 8.**

## 9. Mistério com revelação no fim
**Como funciona.** Um enigma no começo, pistas falsas no meio, resposta no fim. Ritmo lento, música própria, silêncio.
**Exemplos.** LEMMiNO (5,93 mi), "Cicada 3301: An Internet Mystery": 43.000.000. Canal History Brasil, "O QUE ESTÃO
ESCONDENDO SOBRE O VOO DA MALAYSIA?": 997.721.
**Por que retém.** O macro loop é o próprio título. Quem sai antes perde a resposta.
**Serve para.** Mitos de marca ("a Coca-Cola inventou o Papai Noel?"), origem de símbolos.
**Produção.** Média a alta: depende de clima (trilha, tipografia sóbria).
**Nota 8.**

## 10. Comparação lado a lado
**Como funciona.** Tela dividida, critério por critério, placar no canto.
**Exemplos.** Onespot Gaming, "GTA 6 VS GTA 5 (COMPARISON WITHOUT SPOILERS)": 1.305.555; Radar do Arsenal, "BRASIL vs
ARGENTINA: Comparação dos arsenais": 457.492.
**Por que retém.** Placar parcial é loop ("quem ganha no fim?").
**Serve para.** Bob's x McDonald's, duas estreias no mesmo dia, duas estratégias de preço.
**Produção.** Baixa: molde de tela dividida e placar.
**Nota 7.**

## 11. Linha do tempo / mapa que cresce (Nostalgia)
**Como funciona.** Barra de linha do tempo fixa na base e mapa que acende conforme a história avança. Ficha completa em
`perfis/tinocando-e-nostalgia.md`.
**Exemplos.** Canal Nostalgia (15,2 mi), "500 anos em 1 hora / História do Brasil" (título traduzido): 20.448.702;
"Brasil antes de 1500: a história não contada" (título traduzido): 7.500.000.
**Por que retém.** O espectador sempre sabe "onde e quando" está; cada era é recompensa.
**Serve para.** Expansão de uma marca (lojas no mapa), história de um produto.
**Produção.** Média: mapa-mãe reutilizável (malha IBGE, domínio público).
**Nota 7.** Ótimo para a série especial; não precisa ser o padrão.

## 12. Tier list
**Como funciona.** Itens entram um a um e são colocados nas faixas S, A, B, C, D, com justificativa.
**Exemplos.** República Coisa de Nerd, "QUAL A MELHOR FRANQUIA DE JOGOS DA HISTÓRIA? - Tierlist videogames":
1.027.304; AnaliZ, "TIER LIST DE STICKMAN!": 1.207.880.
**Por que retém.** Opinião provoca comentário ("errou o C!"), e a tabela vai se completando.
**Serve para.** Estratégias de uma empresa, truques de app, campanhas do ano.
**Produção.** Baixa.
**Nota 7.** Atenção: tier list é opinião; o nosso critério precisa ser declarado (efeito no bolso, por exemplo).

## 13. Desafio interativo ("descubra seu...")
**Como funciona.** O espectador responde perguntas na cabeça e recebe um resultado no fim.
**Exemplos.** INCRÍVEL, "Um teste de cor que pode dizer sua idade mental" (título traduzido): 17.117.115.
**Por que retém.** O resultado pessoal só sai no fim.
**Serve para.** Camada dentro de outro formato (Panem já usa: "em qual distrito você nasceria?").
**Produção.** Baixa.
**Nota 6.** Sozinho, tende ao raso; como camada, funciona.

## 14. Tipografia cinética / texto (Tinocando)
**Como funciona.** Título serifado em caixa alta sobre pintura de domínio público, cartão de citação, uma cor de destaque.
**Exemplos.** Tinocando TV (2,89 mi; mediana dos últimos 10: 501 mil, contra 273 mil nos 10 anteriores): "DOSTOIÉVSKI:
o HOMEM que COMPREENDEU a VIDA", 978 mil.
**Por que retém.** Frase forte vira imagem; ritmo de leitura acompanha a voz.
**Serve para.** Ensaio sobre uma ideia ("os 7 pecados do marketing"), quando não há imagem de arquivo.
**Produção.** Baixa a média: HTML+GSAP para o texto; pintura de domínio público.
**Nota 7.**

## 15. Entrevista / documental com fontes
**Exemplos.** BBC News Brasil, "8 de Janeiro: o dia que abalou o Brasil": 4.316.724; Flow #226 (Daniel Penin): 525.840.
**Por que retém.** Voz de quem viveu; autoridade.
**Produção.** Alta: convidados, gravação, autorização.
**Nota 4.** Só quando houver acesso a alguém de dentro (cliente da Performake, por exemplo).

---

## Os 5 mais promissores para o canal agora
1. **Dossiê / investigação (3)** com a mecânica do Penin (2): é a "Sala de Guerra". Coffeezilla e fern mostram mediana de
   5 mi por vídeo com esse formato.
2. **Índice com ícones e progresso (1):** molde barato, retenção previsível, cada ícone vira um Short.
3. **Ascensão e queda (4):** o formato mais forte do Brasil no nicho, com a lacuna da lente de comunicação.
4. **Iceberg (7):** escalada garantida e quase ninguém usa para marketing.
5. **Mistério com revelação no fim (9):** bom para mitos de marca no Natal.

Regra de variedade: não repetir o mesmo formato em dois vídeos seguidos; o elemento fixo do canal são os 4 blocos
("A peça", "O mecanismo", "A conta", "Use você"), que entram dentro de qualquer formato.
