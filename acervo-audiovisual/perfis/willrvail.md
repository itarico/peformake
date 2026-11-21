# Estudo do perfil @willrvail (Will Vail): transições e efeitos de transição

Editor e videomaker de Houston (EUA), cerca de 191,6 mil seguidores em 20/11/2026. Bio: "Just Making Cool Videos ·
Editing Tutorials · Cinematic Lifestyle", loja de cursos na Stan Store. Estudado em 21/11/2026 a pedido do Italo, com foco
em **transições**. Isto é estudo, não regra: funcionar para ele não garante funcionar para nós.

**Como foi feito (sem login):** o `instaloader` levou 429 do Instagram logo na primeira consulta ao perfil, e o
`yt-dlp` não lista perfil ("Unable to extract data"). A lista dos 12 posts recentes, com curtidas, comentários e
visualizações, veio da página pública do perfil (raspagem da página aberta, sem conta). Depois o `yt-dlp` baixou
cada Reel pelo link, um por vez, com pausa de 5 s. **Baixados: 10** (9 Reels e o 1º vídeo de um carrossel). Ficaram
de fora 2 posts sem vídeo (apresentação de janeiro e a bolsa de câmera).
Mídia, quadros e transcrições: `acervo-audiovisual/_brutos/willrvail/` (fora do Git). Cortes detectados por quadro
(diferença de histograma HSV), 6 quadros em volta de cada corte; nos breakdowns o vídeo analisado aparece num cartão
pequeno, então a detecção rodou só no recorte do cartão. Fala transcrita com Whisper local.

## Números (página pública, 20/11/2026)
| Post | Data | Visualizações | Curtidas | Coment. | Força* | O que é |
|---|---|---|---|---|---|---|
| [Deb-VcJRpxp](https://www.instagram.com/reel/Deb-VcJRpxp/) | 13/10 | 1.582.070 | 120.422 | 1.157 | 8,0x | Breakdown do vídeo de @nvision.media (12 efeitos), fixado |
| [Df2NAP3R7KC](https://www.instagram.com/reel/Df2NAP3R7KC/) | 17/11 | 1.226.573 | 74.011 | 1.330 | 6,2x | Breakdown de vídeo de oficina de moto (@sametxhunter, 10 efeitos) |
| [DfnuZFyv6eQ](https://www.instagram.com/reel/DfnuZFyv6eQ/) | 12/11 | 638.099 | 35.774 | 733 | 3,2x | Breakdown de joias (@sam.john.creates, 13 efeitos) |
| [DW6eZHpjWxc](https://www.instagram.com/reel/DW6eZHpjWxc/) | 09/04 | 542.415 | 39.587 | 220 | 2,7x | Tutorial próprio: match cut com tinta (luma matte), fixado |
| [Df97b3bxVUL](https://www.instagram.com/reel/Df97b3bxVUL/) | 20/11 | 198.313 | 9.058 | 216 | 1,0x | Breakdown de óculos (@shaeel.siddiqui, 16 efeitos) |
| [Df7WoiCxfQG](https://www.instagram.com/reel/Df7WoiCxfQG/) | 19/11 | 109.045 | 4.890 | 36 | 0,55x | Tutorial: "Flash Cut Effect" |
| [DfYJ3-0xT2Y](https://www.instagram.com/reel/DfYJ3-0xT2Y/) | 05/11 | 88.513 | 4.294 | 23 | 0,45x | Tutorial: texto de vidro (After Effects, 11 passos) |
| [DfP5pelxuP_](https://www.instagram.com/reel/DfP5pelxuP_/) | 02/11 | 60.687 | 2.404 | 26 | 0,31x | Breakdown de moda (@the_ampa, 7 efeitos) |
| [Dfz94Lyh98B](https://www.instagram.com/reel/Dfz94Lyh98B/) | 16/11 | 43.401 | 1.397 | 31 | 0,22x | Edição própria 16:9 (carro, rua), feita com @invideo.io |
| [Df4xvp5nfh3](https://www.instagram.com/p/Df4xvp5nfh3/) | 18/11 | sem dado | 1.641 | 25 | | Carrossel sobre o Premiere Pro 27 (só o 1º vídeo baixado) |

*Força = visualizações ÷ mediana dos 9 com visualização (198 mil).

**Leitura:** o formato "Viral Video Breakdown" (ele reage ao vídeo de outro editor e dá nome a cada efeito) é o topo
inteiro: os 3 maiores (1,6 mi, 1,2 mi e 638 mil) e o 5º. O tutorial com passo a passo (flash cut, texto de vidro)
fica entre 0,45x e 0,55x, e a edição autoral dele é o que menos alcança (0,22x). O público vem pelo **catálogo de
efeitos com nome**, não pela obra dele. Comentário alto (733 a 1.330) vem da palavra-isca no fim: "comenta qual efeito
você quer de tutorial".

## Os que mais viralizaram (por que prenderam)
Ficha completa de cada um em `acervo-audiovisual/virais/`.

1. **Deb-VcJRpxp · 1,58 mi · 120 mil curtidas · 13/10/2026** ([ficha](../virais/2026-10-13_willrvail_Deb-VcJRpxp.md)).
   Gancho (0 a 3 s): o vídeo abre com o "masking hook" do outro editor, formas recortadas que piscam branco e vermelho
   sobre preto, 1 quadro cada, e ele já diz "this is a sick masking hook". O olho não sabe o que é a forma até a
   revelação no quadro 13. Ritmo: no cartão, 25 cortes em 67 s, com rajadas de 6 quadros por plano dentro da silhueta.
   Transição-assinatura: silhueta branca com a paisagem trocando dentro dela a cada 6 quadros. Som: a voz dele por
   cima; a trilha do original fica baixa. Texto: uma palavra por vez, caixa alta larga e branca, e a lista
   "EFFECTS 1 a 12" crescendo no canto.
2. **Df2NAP3R7KC · 1,23 mi · 74 mil curtidas · 17/11/2026** ([ficha](../virais/2026-11-17_willrvail_Df2NAP3R7KC.md)).
   Gancho: corte relâmpago de ferramentas (planos de 2 a 5 quadros com borrão direcional entre eles) já no quadro 1.
   Ritmo: 38 cortes em 40 s no cartão, plano médio de 1 s, o mais rápido dos estudados. Transições: flash cut,
   obturador lento, quadro em negativo de 2 quadros como acento, borrão direcional. Fecha elogiando o som ("sound
   design was on point").
3. **DfnuZFyv6eQ · 638 mil · 36 mil curtidas · 12/11/2026** ([ficha](../virais/2026-11-12_willrvail_DfnuZFyv6eQ.md)).
   Gancho: texto "JEWELLERY" com eco e um anel caindo, corte relâmpago para a corrente. Ritmo: 33 cortes em 59 s.
   Transições: vazamento de luz laranja de 3 quadros, faixa vermelha de filme queimado, brilho branco (glow) que
   estoura e revela, raio X (negativo), match cut da gota d'água. Ele diz: "ouça com e sem som e você vai ver".
4. **DW6eZHpjWxc · 542 mil · 40 mil curtidas · 09/04/2026** ([ficha](../virais/2026-04-09_willrvail_DW6eZHpjWxc.md)).
   Gancho: o resultado primeiro (câmera na mesa vira câmera na grama, mesmo enquadramento), com o título "MATCH CUT" e
   a frase "This effect is easier than it looks". Ritmo: 32 cortes em 55 s. Transição: match cut com uma **mancha de
   tinta baixada do YouTube usada como luma matte** no After Effects, a grama aparece por dentro da tinta. Também usa
   a silhueta branca dele mesmo (3 quadros) e o "palco no escuro" (luz de spot em preto).
5. **Df97b3bxVUL · 198 mil · 9 mil curtidas · 20/11/2026** ([ficha](../virais/2026-11-20_willrvail_Df97b3bxVUL.md)).
   Gancho: borrão de obturador baixo em vermelho e o quadro em negativo ciano no segundo 1. Ritmo: 37 cortes em 45 s.
   Lista de 16 efeitos, a mais longa: low shutter, inverted, match cut, detail shots, lens distortion, object reveal,
   object pop, directional blur, silhouette, flash, mask overlay, rotoscope, B&W glow, flash cut.

## Tabela de transições (o que ele mostra e nomeia)
Quadros a 24 qps. "Real" = feito na câmera; "pós" = na edição. O som dos breakdowns é a voz dele por cima, então o SFX
do original não se ouve: a coluna Som diz o que as transições pedem e o que foi medido nos vídeos com som próprio.

| # | Transição (nome dele) | Exemplo (vídeo · tempo do cartão) | Duração | Easing e borrão | Som | Como foi feita |
|---|---|---|---|---|---|---|
| 1 | **Flash cut** (rajada de detalhes) | Df2N 0:00 a 0:01; Dfnu 0:00; Df7W (tutorial) | planos de 2 a 5 q, rajada de 0,5 a 1 s | corte seco; 1 a 3 q de borrão direcional entre planos | clique ou hit por plano + whoosh curto (inferido) | Real: muitos planos curtos do objeto em ângulos e distâncias diferentes. Pós: cortes no beat |
| 2 | **Inverted / X-ray** (negativo como acento) | Df97 0:01 (ciano); Df2N q124 e q361; Dfnu q14; Deb q1320 | 1 a 3 q, às vezes plano inteiro | sem easing (troca seca); às vezes com borrão | impacto grave ou "snap" (inferido) | Pós: efeito Inverter (Premiere) no 1º ou 2º quadro do plano novo |
| 3 | **Low shutter / transitional blur** (whip) | Df97 0:00 a 0:01 (3 q vermelho); Df2N q76; Dfz9 0:16 e 0:30 | 2 a 4 q | expo in até o corte, expo out depois; borrão máximo no corte | whoosh com ataque no corte | Real: whip pan com obturador baixo (Dfz9, carro). Pós: Directional Blur animado 0 → 80 → 0 |
| 4 | **Masking / clone / silhouette** (silhueta preenchida) | Deb 0:00 (formas branco/vermelho, 1 q cada); Deb 0:20 (silhueta com vídeos dentro, troca a cada 6 q); DW6 0:02 (ele em branco, 3 q); DfP5 0:36 (silhueta brilhando) | 1 a 3 q no flash; 6 q por troca dentro da silhueta | sem easing; batida seca | um hit por troca (inferido) | Pós: recorte do sujeito (Roto Brush ou remover fundo), preenchido de branco ou vermelho; vídeo dentro por máscara |
| 5 | **Match cut** (mesma forma, outro lugar) | DW6 0:00 (câmera mesa → grama); Dfnu 0:05 (gota d'água) | corte seco ou fusão por máscara de 12 a 24 q | o movimento continua do plano A para o B | whoosh ou nada; a música segura | Real: filmar os dois planos com o mesmo enquadramento (tripé, marca no chão). Pós: alinhar escala e posição |
| 6 | **Ink blot / luma matte** (tinta) | DW6 0:41 a 0:50 (tutorial) | cerca de 18 a 24 q | a mancha cresce rápido e desacelera (ease out) | pincel molhado ou swoosh (inferido) | Pós: clipe de mancha de tinta como Luma Matte da camada nova (After Effects) |
| 7 | **Light leak / film burn / glow** | Dfnu q144 (laranja, 3 q); Dfnu q397 (faixa vermelha vertical, 6 a 8 q); Dfnu q501 e q611 (estouro branco) | 3 a 8 q | sobe rápido, desce mais devagar | riser curto ou "shimmer" (inferido) | Pós: sobreposição em modo Tela; glow = exposição subindo até o branco e cortando |
| 8 | **Wipe the frame** (objeto ou corpo passa na lente) | Deb 0:11 (pessoa passa com rastro); Dfz9 0:06 (mão cobre a lente, 3 q até o preto) | 3 a 6 q | segue a velocidade do objeto | whoosh grave ou passo | Real: alguém ou algo passa colado na lente; o corte entra no quadro mais escuro. Pós: Echo para o rastro |
| 9 | **Glitch / pixel** | DfP5 q662 e q870 | 1 a 2 q | nenhum | estalo digital (inferido) | Pós: mosaico ou deslocamento de pixel num quadro |
| 10 | **Slow-mo e handheld** (respiro) | Deb 0:39 ("slowmo para dar respiro"); DfP5 hyperlapse | 1 a 3 s | rampa de velocidade | a trilha abre | Real: filmar em 60 ou 120 qps; câmera na mão |

Medido no som dos vídeos que têm trilha própria: no DW6, 10 dos 32 cortes caem num pico de som, e 5 deles têm subida
forte de energia nos 0,4 s antes do corte (whoosh ou riser que termina no corte: 0:00, 0:07, 0:16, 0:18, 0:21). No Dfz9
(edição dele, só música) são 3 de 12: ali o corte segue a frase musical, não cada batida.

## O que torna o estilo reconhecível
1. **Acento de 1 a 3 quadros.** Quase toda transição dele é um "evento" curtíssimo em cima de um corte seco: quadro
   negativo, silhueta branca, estouro de luz, borrão. Não há fusão lenta. O olho registra o acento sem saber o que viu.
2. **Paleta de flash limitada a 2 cores** (branco e vermelho, ou ciano do negativo) que se repete o vídeo todo.
3. **Silhueta como recurso central**: a pessoa vira forma chapada (branca, vermelha ou preta) por 1 a 3 quadros,
   ou vira janela para outros vídeos.
4. **Planos de detalhe muito curtos em rajada** (2 a 5 quadros) alternados com 1 plano que respira (slow-mo, wide).
5. **O som é metade da transição**: ele mesmo repete que o "sound design" é o que dá vida ao vídeo.
6. **Formato de apresentação**: ele em plano médio com o celular na mão, o vídeo analisado num cartão com o @ do autor,
   legenda de uma palavra em caixa alta larga e branca, e a lista numerada "EFFECTS" crescendo no topo à direita a cada
   efeito nomeado. Fecha com "comenta qual você quer de tutorial. Peace".

## O que copiar e o que não copiar
- **Copiar a lógica:** dar nome a cada efeito, a lista que cresce na tela, o acento de 1 a 3 quadros sobre corte
  seco, a silhueta, o match cut com tinta, o respiro de slow-mo depois da rajada.
- **Não copiar:** os vídeos de terceiros que ele analisa (nunca pôr trecho de outro criador no vídeo do cliente),
  o nome dele, a frase de fechamento.
- **Cuidado:** acento piscante em sequência rápida (negativo e branco) pode incomodar quem tem fotossensibilidade.
  Não passar de 3 flashes por segundo.

## Como a Peformake e a Ellcazo usam isso
- **Ellcazo (portfólio):** série "nome do efeito" no formato do breakdown, mas com os **nossos** vídeos: o editor da
  casa aparece com o vídeo de cliente num cartão, nomeia 6 a 10 efeitos e fecha com a palavra-isca. Prova técnica e
  atrai dono de negócio que quer vídeo "de marca grande".
- **Cliente de produto (detalhe, oficina, loja):** rajada de flash cut com 8 a 12 detalhes do produto, 1 negativo
  de 2 quadros no impacto e um slow-mo de respiro. Funciona em Disalp, MF Máquinas e qualquer produto físico.
- **Documentário (canal Por Dentro, Taoísmo):** só a versão calma: tinta como luma matte, match cut por forma,
  silhueta preenchida, wipe por objeto. Ver a seção "Taoísmo" da skill `transicoes-willrvail`.

Skill com as receitas: `~/.claude/skills/transicoes-willrvail/SKILL.md` (cópia em
`acervo-audiovisual/skills-locais/transicoes-willrvail/`).
