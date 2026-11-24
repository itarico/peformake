# Formato "Penin" aplicado ao Por Dentro: estudo de 24/11/2026

Objetivo: entender como Daniel Penin montava os vídeos de "lado obscuro / por trás / como a empresa X faz Y" e tirar uma
receita para o nosso vídeo narrado, sem rosto, sem copiar texto, arte ou thumb dele.
Contexto prévio: `youtube/FORMATOS-APRESENTACAO.md` §2 e `youtube/REFERENCIAS-ESTILO-CANAIS.md` (nota 6, "mecânica sim,
tom não"). Este estudo confirma e detalha a mecânica com material assistido.

## 0. Limites do estudo (ler antes)

- **O canal principal está encerrado.** `yt-dlp` em `youtube.com/channel/UCXQPvU8tGvWy_mAfPPav--Q/videos` devolve "This
  account has been terminated for violating YouTube or Google's Terms of Service" (consulta de 24/11/2026). Por isso
  **não existe lista dos 40 vídeos mais recentes nem mediana de views do canal**, e o cálculo de outlier pedido (views
  divididas pela mediana) não pôde ser feito do jeito normal.
- **Substituto usado:** (a) os vídeos originais sobrevivem como reuploads de terceiros, com legenda automática; foram
  esses que se decompuseram (o áudio e o quadro são do original; as views dos reuploads são irrelevantes);
  (b) como termômetro de repercussão, a maior reação (react) publicada para cada vídeo. Isso mede o tamanho de quem
  reagiu tanto quanto o vídeo, então o "índice" abaixo é indício, não outlier verdadeiro.
- Legenda automática tem erro de nome e de número. Nomes próprios e cifras citados aqui servem para entender a
  estrutura; não use nada daqui como fato num roteiro sem `checagem-fatos`.
- Quadros: 1 a cada 5 s dos 3 primeiros minutos de cada um dos 3 vídeos (360p). Cortes contados por detecção de cena
  (limiar 0,3), que erra para menos em cortes suaves e para mais em zoom e glitch. Áudio (música, efeitos, volume) **não
  foi analisado**; o que se diz de som abaixo é recomendação nossa, marcada como tal.
- Diferença de base: Penin aparece em câmera (mesa, microfone, estúdio com luz neon; em um vídeo, de pé). O Por Dentro
  é sem rosto. A receita traduz a função de cada recurso dele, não a presença dele.

## 1. Tabela de repercussão (proxy de outlier)

Melhor react encontrado por vídeo (views em 24/11/2026). Mediana dos 6 valores: 205.072. Índice = react / mediana.

| # | Vídeo (título como circulou) | Data | Melhor react (views) | Índice | URL do react | Fonte analisada (reupload) |
|---|---|---|---|---|---|---|
| 1 | BLAZE - A Face do Dono (Parte 2) | jun/2023 | 2.211.129 (orochidois); 1.175.897 (Casimiro) | 10,8 | https://www.youtube.com/watch?v=M1SnMu02dLI | https://www.youtube.com/watch?v=BURcisRmQ4Q (35 min) |
| 2 | BLAZE - Tire dos Pobres e dê aos Influencers (Parte 1) | mai/2023 | 463.263 (Super Xandão) | 2,3 | https://www.youtube.com/watch?v=zA-7erP3u0c | https://www.youtube.com/watch?v=xQYIN_KIZUM (34 min) |
| 3 | CHOQUEI - Lacrando Vidas (agência Mynd8 "por trás" das páginas de fofoca) | jan/2024 | 236.317 (Hudson Amorim); 217.242 (mount) | 1,2 | https://www.youtube.com/watch?v=ZzHLJ3hDvo0 | https://www.youtube.com/watch?v=pXssVl0mt0s (39 min) |
| 4 | Felipe Neto - O Fantástico Mentiroso | 2023 | 173.828 (Herói da Terra) | 0,8 | https://www.youtube.com/watch?v=NHIoy6Qy764 | sem reupload limpo achado |
| 5 | BLAZE - Checkmate (Parte 3) | 2023 | 140.295 (mount) | 0,7 | https://www.youtube.com/watch?v=p1P-qjHAmWU | https://www.youtube.com/watch?v=BkpenwZkUHE (não analisado) |
| 6 | XP Investimentos (vítimas, "A queda da XP") | 2025 | 119.355 (Nanda Guardian) | 0,6 | https://www.youtube.com/watch?v=OlcWRzxapZ4 | só visto dentro de react longo; não serve para decompor |

Leitura: a Parte 2 da Blaze é o ponto fora da curva por larga margem (a série segurou o público de um vídeo para o outro e
virou pauta de dezenas de reacts). Os dois vídeos seguintes mostram que o formato se sustentou, mas em escala menor. Os
vídeos 4 a 6 ficam abaixo da mediana desse recorte.

Os 3 escolhidos para decompor (os mais fortes do tipo "lado obscuro / por trás / como a empresa faz"):
1. Blaze Parte 2, "A Face do Dono".
2. Blaze Parte 1, "Tire dos Pobres e dê aos Influencers".
3. Choquei, "Lacrando Vidas" (a agência por trás das páginas).

## 2. Decomposição

### 2.1 Blaze Parte 1: "Tire dos Pobres e dê aos Influencers" (34 min)

**Abertura, 0:00-0:45.** Sem apresentador. Colagem de cerca de 25 s de material real da própria empresa e dos seus
divulgadores: influenciadores jogando e comemorando ganhos, logo da marca, banner "+18", frases de propaganda ("garanto a
sua grana extra"). Em seguida um cartão preto com o nome do canal (0:30) e, só então, a analogia que enquadra tudo:
desenho animado do Robin Hood e cenas de filme sobre o "lobo de Wall Street", para chegar à tese moral em uma frase por
volta de 1:05: a empresa "tira dos pobres e dá aos influenciadores". Primeira imagem do apresentador só em 1:20. Em 45 s
já houve 24 cortes.

**Índice / capítulos.** Não há índice gráfico nem capítulos na tela. O que existe é uma **promessa falada em lista**
(6:30-7:00): "o vídeo de hoje é só seu: história misteriosa, empresas fora do Brasil, dono oculto, famosos, brigas,
mentiras...". É o mapa do vídeo dito de uma vez, em ritmo acelerado, antes do primeiro bloco. Depois os blocos seguem sem
título na tela: base legal (7:00), ciência do vício com o experimento do rato e da alavanca (8:30-11:00), o "robô" que
deixa você ganhar para depois tirar (11:00-13:30), por que não dá para processar (14:00), a lista de 400 influenciadores
(15:00-16:30), paraíso fiscal (17:00-19:00), a trilha dos registros até a primeira pessoa física (19:00-25:00), dúvida
sobre se é "laranja" (25:00), vaga de emprego e entrevista com contradições (26:00-28:00), dinheiro e fundos (28:30-33:00).

**Como mostra a prova.** Mistura de quatro tipos: (1) tela de computador com a pesquisa acontecendo, mostrando consulta a
registro empresarial; (2) documento com trecho em destaque (termos do programa de afiliados com a linha marcada, 2:30);
(3) cartão em tela cheia com número grande (valor fixo mínimo e máximo, em fundo xadrez vermelho, 1:40); (4) manchete,
avaliação de usuário e reclamações citadas com contagem (milhares). Cada passo da investigação aparece como "procurei
isso, achei aquilo", o que faz o espectador sentir que acompanha a descoberta.

**Ritmo de corte.** Cerca de 116 cortes nos 3 primeiros minutos (média de 1,6 s por corte). Alterna plano de apresentador
(2 a 6 s) com inserts de 1 a 3 s. Fala em torno de 175 palavras por minuto (contagem da legenda).

**Tom.** Segunda pessoa e provocação direta ao alvo ("e eu te pergunto, dono da empresa..."), ironia, simulação em primeira
pessoa do jogador ("você coloca 100 reais...") que coloca o espectador como a vítima do sistema. Mistura científica leve
(dopamina) com deboche.

**Virada obscura.** Duas camadas. Primeiro o "óbvio" (como o influenciador é pago: valor fixo, comissão por cadastro,
comissão sobre a perda de quem joga). Depois o "oculto" (a empresa não está onde diz estar, não há com quem litigar, o
dono não aparece). A virada emocional vem do mecanismo de pagamento, antes do mistério do dono.

**Fechamento.** Termina sem revelar o dono: três hipóteses abertas (uma pessoa, um segundo nome, "empresas atrás de
empresas") e uma ironia final dirigida à empresa. É um cliffhanger deliberado que empurra para a Parte 2.

**Título e thumb.** Título: NOME DA EMPRESA em caixa alta + hífen + frase-tese moral com vilão e vítima. Thumb original
não verificada (o reupload usa quadro do apresentador, não a capa).

### 2.2 Blaze Parte 2: "A Face do Dono" (35 min)

**Abertura, 0:00-0:45.** Começa pelo público, não por ele: cortes de críticos e grandes influenciadores comentando o
vídeo anterior ("achei fraco", "só falou o óbvio"). Cria tensão e prova de que a Parte 1 mexeu com o meio. 20 cortes em 45 s.

**Dramatização do risco (0:55-1:25).** Tela preta com interface de ligação recusada e texto aparecendo frase a frase: recebi
ameaças anônimas; estou tomando medidas legais; pensei em não postar; mas vou contar. Só depois entra o apresentador
(1:30). Função: transformar o vídeo em ato de coragem e justificar o tamanho do que vem.

**Índice / capítulos.** Sem índice gráfico. A promessa vem em duas frases: "o primeiro vídeo falou o óbvio; este vai
falar o que ninguém sabe: quem é o dono" (2:00), com cartão de silhueta e a pergunta em tela. Aos 3:00 explica a
produção em duas etapas (um roteiro "óbvio", outro "o que ninguém sabe"), o que funciona como transparência e como
gancho. Depois cada bloco é uma etapa da caça: documentos comprados, bancos de dados, cadeia de empresas, avaliações do
site, jurisdição, domínios, quem aparece em vagas e perfis.

**Como mostra a prova.** Mais documental que a Parte 1: ele diz que pagou por documentos públicos de um registro
estrangeiro e o valor (6:00); mostra a cadeia de compras entre empresas; mostra o perfil de uma pessoa suspeita e avisa
que o perfil ficou privado depois, mas que já havia sido gravado (22:30), isto é, **prova preservada antes de o alvo
reagir**. Também pede ajuda ao público numa rede social (15:00), o que vira conteúdo do próprio vídeo.

**Ritmo de corte.** Cerca de 45 cortes nos 3 primeiros minutos (média de 4,0 s). Mais planos longos de apresentador (até
10 s), texto cinético e animação simples de bandeira, silhueta, logotipo. Fala em torno de 182 palavras por minuto.

**Tom.** Menos deboche que a Parte 1, mais "detetive": sequência de dúvidas ("será que o site informa o dono? será que
o domínio?") e tentativa/erro narrada em voz alta.

**Virada obscura.** Aos 28:30 ele declara um limite ético (a justiça diria que não é ilegal, mas não é ético, e por isso
não adianta insistir no nome). Aos 30:00 vem a virada: **o verdadeiro dono não é a pessoa achada; é quem fez a empresa
crescer**, isto é, os divulgadores. A caça ao nome vira a tese de que o incentivo (quem lucra com a perda alheia) é o dono.
Depois lista, em reconhecimento, quem recusou o patrocínio.

**Fechamento.** Responde ao crítico que abriu o vídeo (o loop de abertura fecha no fim), com ironia cordial, e entrega o
contraste entre quem divulgou e quem recusou. Fecha o arco de duas partes.

**Título e thumb.** "(Parte 2)" no título e "A Face do Dono": a promessa de ver um rosto. Thumb original não verificada.

### 2.3 Choquei, "Lacrando Vidas" (39 min)

**Abertura, 0:00-0:45.** Cold open de gancho puro: trechos de falas de terceiros sobre poder e responsabilidade
("o topo da pirâmide") em voz, sobre animação 3D vermelha e preta, e logotipos animados das páginas citadas. Em 30 s
estabelece o dano concreto (uma morte) e, em seguida, o "por que todas postaram no mesmo dia?". Apresentador aparece em
0:25, de pé, estúdio escuro com gradiente azul e vermelho, sem mesa. Somente 7 cortes em 45 s, ritmo bem mais lento que
na Blaze, com texto e animação ocupando a tela.

**Índice / capítulos.** Sem índice. O que organiza é uma **pergunta-fio** (quem é o topo da pirâmide?) e uma **ordem de
prova**: primeiro o fato (data, caso), depois a pergunta "por que no mesmo dia?", depois "será que há um chefe?", depois a
promessa "vou provar que existe um topo antes de dizer quem é" (3:00). O vídeo encerra uma série nomeada ("a história
não contada"), o que dá identidade de franquia.

**Como mostra a prova.** Prints de postagens com **marca-texto verde e vermelho**; contagem em tela ("/12", "60 mi de
seguidores"); avatares das contas em cluster animado; conversa de mensagens desfocada (anonimização); recorte de
reportagem em preto e branco; filme institucional da própria agência usado como evidência; entrevistas da dona da agência
a um jornal lidas na tela e confrontadas; cópia antiga do site recuperada em arquivo web depois que páginas foram
removidas (23:00); lista de marcas clientes na reta final (37:00). Atribui a pista inicial a outro criador e cita o minuto
exato do vídeo dele.

**Ritmo de corte.** Cerca de 32 cortes nos 3 primeiros minutos (média de 5,6 s). Mais lento, com blocos longos de
apresentador e prova em tela. Fala em torno de 190 palavras por minuto. Seis vezes usa um interlocutor cético imaginário
("Daniel, isso é coisa da sua cabeça?") e responde com prova em seguida.

**Tom.** Gravidade e indignação, sem o deboche da Blaze. Em todo o vídeo o alvo é uma estrutura (agência), não uma só
pessoa, mas há acusação direta a pessoas e empresas com nome.

**Virada obscura.** Aos 18:00 e 19:00: o dinheiro. O faturamento da agência vira a "descoberta" do mercado do
cancelamento. Depois, a prova em contradição: o que a empresa disse em entrevista contra o que apagou do site.

**Fechamento.** Reconhece que não consegue provar quem causou o dano (35:00), pede que a polícia e a imprensa
investiguem, lista as marcas clientes, e termina com um chamado para uma aula ao vivo vendendo o próprio curso e com a
frase-assinatura da série. O fecho comercial no meio de uma pauta de morte é o ponto mais frágil do vídeo.

**Título e thumb.** Título: NOME DO ALVO em caixa alta + hífen + trocadilho moral ("Lacrando Vidas"). Thumb verificada:
máscara de sorriso em close, o nome do alvo em tipografia gigante amarela dentro de um disco rachado e com respingos de
sangue, recortes de jornal ao fundo. Elementos: rosto de vilão genérico, uma palavra gigante, sangue, jornal.

## 3. O que se repete nos três (a "máquina")

1. Título: ALVO em caixa alta + hífen + tese moral ou trocadilho.
2. Os 25 a 30 s iniciais são material real e curto do universo do alvo, não explicação.
3. A tese moral cabe em uma frase e aparece no primeiro minuto e meio.
4. Promessa falada do que o vídeo vai mostrar, no lugar de índice gráfico.
5. A investigação é narrada como caça passo a passo, com a tela de pesquisa aparecendo.
6. Todo número tem cartão em tela cheia; todo documento tem marca-texto.
7. O espectador é colocado como vítima ou alvo ("o que acontece com você").
8. Dinheiro revela o mecanismo antes de a pessoa ser revelada.
9. O vídeo termina com loop aberto ou com série ("Parte 2", "a história não contada").
10. Há um limite declarado ("não consigo provar", "não é ético dizer") perto do fim.

## 4. Riscos que o próprio caso mostra (para não repetir)

- Canal encerrado pelo YouTube; vídeos posteriores sobre o tema de uma corretora aparecem em títulos de terceiros como
  alvo de decisão judicial. Acusação a pessoa e empresa com nome gera processo, ameaça, derrubada.
- O vídeo da agência trata de uma morte e atribui responsabilidade a uma empresa com base em indício. O próprio autor
  admite que não prova a causa.
- Fechar uma investigação vendendo curso do próprio apresentador destrói a credibilidade (conflito de interesse).
- Trechos de filme e desenho animado de terceiros para fazer analogia são risco de direito autoral.
- O recurso mais forte dele (o "lobo" que chama o alvo de "você") é também o que o expõe a ação por injúria.

## 5. Receita para o nosso vídeo (sem rosto, sem copiar)

Premissa do Por Dentro mantida: algo por dentro que não sabem, fato com fonte, reflexão. A receita abaixo dá a forma;
o conteúdo vem do `checagem-fatos` e das fontes já levantadas na pasta `gta`.

**Estrutura**

1. **Título.** `[EMPRESA/PRODUTO] + hífen + tese moral de uma linha com verbo concreto e um "quem paga / quem ganha"`.
   Só afirmar o que o vídeo prova; trocar "golpe", "roubo" por o mecanismo ("como o dinheiro do jogador vira...").
   Testar 3 variações no `titulo-thumb-lab`.
2. **Abertura (0:00-0:45).** 20 a 25 s de material real do universo do alvo (anúncio, trailer, depoimento, interface),
   cortes de 1,5 a 3 s, voz entrando em 0:05. A tese em uma frase por volta de 0:45 (nunca depois de 1:30). Nada de
   "olá" nem apresentação do canal antes da tese.
3. **Promessa em lista falada (0:45-1:15).** De 4 a 6 itens do que vai aparecer, ditos de uma vez, com cartão de
   palavra-chave em tela a cada item. Depois do primeiro bloco, mostrar o índice com ícones (formato 1) de forma curta,
   como barra de progresso, sem tomar mais de 5 s por aparição. Isto substitui a falta de índice dele pela nossa vantagem
   de molde reutilizável.
4. **Dois andares.** Primeiro o "óbvio que todos já sabem" em 3 a 4 minutos (a camada de conforto); depois o "o que
   ninguém mostrou" (o dinheiro, o contrato, o incentivo). A virada é dita com uma frase fixa de transição, igual em
   todo vídeo da série, para virar assinatura.
5. **Prova sempre na tela e com a trilha.** Cada afirmação importante: documento, página oficial, manchete ou número
   com a fonte escrita em rodapé pequeno; marca-texto em uma só cor (a do vídeo); número crítico em cartão de tela cheia.
   Mostrar a busca acontecendo (gravação de tela em registro público) pelo menos 3 vezes no vídeo, com o passo
   "procurei isto, achei aquilo".
6. **Ritmo.** Abertura com uma imagem nova a cada 1,5 a 3 s; corpo a cada 4 a 6 s; nunca passar de 8 s sem mudança
   visual (movimento de câmera 2.5D, destaque ou novo plano contam). Fala-alvo de 160 a 175 palavras por minuto para
   voz sem rosto, mais lenta que a dele, para dar tempo de ler a prova. Silêncio de 1 s antes de cada virada.
7. **Alvo é o mecanismo, não a pessoa.** Segunda pessoa para o espectador ("você abre o jogo e..."), simulação passo a
   passo do que acontece com o jogador, e o vilão sempre nomeado como sistema, contrato ou incentivo. Nome de pessoa
   física só com documento público e checagem jurídica.
8. **Cético interno.** 4 a 6 objeções do tipo "e se for coincidência?" ou "não é ilegal?", cada uma respondida em até
   20 s com prova ou com a ressalva honesta. Na voz sem rosto: "Você pode estar pensando que...".
9. **Bloco "o que não sabemos" aos 85% do vídeo.** Dizer o que não dá para provar, o que a empresa respondeu (ou que não
   respondeu, com a data do pedido) e o que um leitor desconfiado deve conferir. Isso protege juridicamente e rende
   confiança.
10. **Fecho.** Resolver o loop principal em uma frase; entregar a reflexão (a nossa assinatura); deixar um loop novo
    nomeado e numerado ("Parte 2: ...") com data. Sem venda no fecho. A chamada é para o próximo vídeo.

**Imagem (nosso kit, não o dele)**

- Biblioteca fixa de 5 peças reutilizáveis: documento com marca-texto; cartão de número; gravação de tela de registro
  público; mapa de relações (empresa para empresa, com setas que se desenham); silhueta ou carimbo para "o oculto".
- Material de terceiros (clipes de filme, desenho animado, memes) só com licença ou uso curto comprovável como crítica;
  preferir material de domínio público ou nosso, para não perder o vídeo por direito autoral.
- Pessoa e lugar reais seguem a regra do Por Dentro (imagem do Brasil, exceto quando a fala cita outro país).
- Sem estúdio, sem mesa, sem apresentador: o lugar do "rosto" é a voz mais um elemento fixo na tela (por exemplo, um
  selo da série no canto superior), como o selo de rede social que ele usa.

**Som (recomendação nossa; o áudio dele não foi analisado)**

- Cama musical grave e contínua baixa na parte "óbvia"; corte da música em seco no momento da virada; um golpe seco
  (ou silêncio) na entrada de cada prova importante. Mixagem com a voz sempre 10 a 12 dB acima da música.

## 6. Nota para o dono do canal

O que dá resultado nesse formato é a **investigação em partes com loop aberto entre vídeos**, a **prova na tela com
trilha** e o **mecanismo de dinheiro**; o que dá problema é a acusação a pessoa sem prova documental, a venda de curso
no fim e o uso de material de terceiros. "No estilo Daniel Penin" cabe se for: tese moral no título, série numerada,
dinheiro como mecanismo, prova na tela. Não cabe copiar o tom de tribunal.

Fontes e arquivos de trabalho (rascunho, não versionados): legendas e quadros em
`C:\Users\User\AppData\Local\Temp\claude\b0147d3e513e77ed\a9c39701-ab0e-4f01-8f0d-14e6701238b5\scratchpad\penin`.
