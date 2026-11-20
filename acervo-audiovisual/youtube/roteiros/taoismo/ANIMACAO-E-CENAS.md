# Taoísmo · estrutura visual, animação e cenas

Base: `roteiro-v1.md` (fala), `NARRACAO-PARA-GRAVAR.md` (frases numeradas 1 a 156), `FONTES-E-MIDIA.md` (licenças).
Mídia local (fora do Git): `C:\Claude\canal-youtube\taoismo\midia\` (imagens livres da Wikimedia, uma pasta por bloco,
com `creditos-commons.csv`). A pasta antiga com os 64 documentários de referência e os vídeos do Pexels está no disco D:
(`D:\ITALO\CLAUDE\SHOPPE\canal-youtube\roteiros\taoismo\midia\`); ao conectar o D:, copiar para a pasta local.

## 1. Estilo do vídeo (decisão)
**E35 Documentário de mesa 2,5D, pele "arquivo de tinta e seda"** (estudo `video-tools/estilos/estudo_earnedits.md`),
com E5 (retrô-documentário) nas cenas de lenda e diagramas Manim nos três momentos de explicação. 16:9, 4K de saída
(1080p de trabalho), 24 qps.
- **Palco:** papel de arroz e seda crua vistos de cima (a "mesa do pesquisador"), com bordas de pincel, carimbo vermelho,
  pedra de tinta, tiras de bambu e lupa nas bordas. As imagens de arquivo entram como **heróis recortados** sobre esse
  papel (borda de papel rasgado, sombra de cima-esquerda), nunca como tela cheia "chapada".
- **Cor:** creme de papel #EFE4CC, tinta preta #1A1714, vermelho de carimbo #B3261E (só no que importa: datas, a
  virada, "ao contrário"), verde-jade #3F6B5A para natureza/ciência. Grão 8 a 10 %, vinheta-spot suave.
- **Tipografia:** manchete em serifada clássica (Cormorant Garamond 600) ou caracteres em Noto Serif SC para o chinês;
  datas em slab de máquina (Courier Prime Bold); legenda de fala pequena, sans branca com sombra (Inter 600), base do
  quadro. 1 a 4 palavras por manchete; o caractere chinês correspondente aparece ao lado quando ajuda (道 Tao, 德 Te,
  無為 wu wei, 陰陽 yin-yang).
- **Câmera:** 2,5D (imagem separada em camadas com mapa de profundidade), push de 3 a 6 % por cena e deriva lateral
  lenta; pinturas longas (rolos) em pan horizontal. Cortes no fim de frase, nunca no meio da palavra.
- **Transições:** por objeto (o rolo de seda que se desenrola e vira a próxima cena), tinta que escorre e cobre a tela
  (tinta-transição, a marca do vídeo), e íris de lupa nos manuscritos. Sem transição pronta de software.
- **Ritmo:** 1 frase = 1 cena de 3 a 6 s (vídeo longo respira mais que Reels); 1 evento a cada 1 a 1,5 s (palavra que
  entra, lupa que anda, carimbo). Blocos de explicação (1, 3, 6) seguram o diagrama por mais tempo.
- **Som:** trilha de guzheng/flauta e cordas graves a −14 dB sob a voz; SFX de papel, pincel, bambu batendo, carimbo e
  gongo baixo nas viradas; silêncio de 1 s antes de "de trás para frente" (frase 7) e "É estratégia" (frase 151).
- **Regras:** imagem histórica = acervo real (nunca IA fingindo arquivo); IA só em reconstituição marcada
  "ilustração" no canto. Nenhum trecho de documentário de outro canal (Content ID). Créditos CC BY na descrição.


## 1b. Variedade: 10 tipos de animação (pedido do Italo, 20/11/2026)
A mesa de papel e tinta é a base, mas o vídeo alterna linguagens para ficar dinâmico, como o Tinocando e o Nostalgia
(estudo em `acervo-audiovisual/perfis/tinocando-e-nostalgia.md`). Regra: nenhum tipo fica mais de 40 s seguidos.
| # | Tipo | De onde vem | Onde entra |
|---|---|---|---|
| A | Mesa de papel 2,5D (base, aprovada) | EarnEdits | Fatos, manuscritos, provas |
| B | Pintura em tela cheia com câmera 2,5D e título atrás da figura | Tinocando | Lenda de Laozi, corte Tang, Dunhuang |
| C | Ilustração autoral em camadas (personagens que respiram), marcada "ilustração" | Nostalgia | Guarda de Hangu, Zhang Daoling, Royal Society 1788 |
| D | **Mapa 3D**: globo que desce do espaço até a China, rotas em arco | Nostalgia (mapa) em 3D | Changsha 1973, China → Londres → São Paulo |
| E | Mapa em pergaminho em que o território cresce em vermelho | Nostalgia | Expansão Tang, rota da seda até Dunhuang |
| F | Tinta que vira paisagem de montanha e rio (troca de época) | Nostalgia | Passagem entre blocos |
| G | Diagrama de traço (wu wei, yin-yang, Te/Tao, pirâmide) | nosso | Explicações |
| H | Vídeo real dentro do rolo de seda | pedido do Italo | Tai chi, rio, incenso, caligrafia |
| I | Barra de linha do tempo fixa na base, que acende a cada época | Nostalgia (Egito) | Todo o vídeo, em cada salto de data |
| J | Tipografia cinética em tela de tinta preta (frase-pico sozinha) | Tinocando | "Elas não são.", "Virou lei.", "É estratégia." |

Distribuição por bloco: 0 = D + A + J · 1 = H + G + A · 2 = B + C + I · 3 = A + linha de vinhetas + I · 4 = B + E + C + J ·
5 = D + H + G · 6 = H + J + A.

## 2. Ferramentas
| O quê | Ferramenta |
|---|---|
| Cenas 2,5D, textos, transições de tinta, mapas e linhas do tempo | Remotion (kit `video-tools/remotion/src/pro`, skill `motion-pro`), separado em camadas para o Premiere |
| Diagramas de explicação (força × fluxo, yin-yang, Te/Tao trocando, pirâmide de evidência) | Manim (skill `manim-skill`), exportado em ProRes 4444 com fundo transparente |
| Recorte e profundidade das imagens | `rembg` (recorte) e mapa de profundidade (skill `tratamento-video`) |
| Reconstituições (tumba, guarda no portão, Royal Society 1788) | IA de imagem, prompts no estilo "pintura a tinta chinesa / gravura do séc. XVIII", marcadas "ilustração" |
| Corte pela narração | Whisper (tempo por palavra) + `silencedetect`, nunca cortando palavra (skill `decupagem-video`) |
| Montagem final | Premiere com `timeline.xml` gerado (camadas + sons) |

## 3. Cenas por bloco (frases da `NARRACAO-PARA-GRAVAR.md`)

### Bloco 0 · Abertura (frases 1 a 12, cerca de 55 s)
| Frases | Cena | Mídia | Animação | Texto na tela |
|---|---|---|---|---|
| 1 | Mapa da China em papel; ponto vermelho cai em Changsha; corte para a câmara funerária vista de cima | `00/Location map of Changsha`, `00/Coffin Chamber Viewed from Above` | Câmera desce sobre a câmara (push 8 %), poeira | "Mawangdui · 1973" (slab) |
| 2 | Caixa de laca abrindo, rolo de seda aparecendo | `00/Lacquer...`, `00/Calligraphy on Silk and Bamboo` | Tampa desliza (2,5D), luz de lanterna passa | — |
| 3 a 5 | O rolo do Laozi de Mawangdui desenrolando sobre o papel | `00/Mawangdui LaoTsu Ms2` | Rolo se desenrola da esquerda (máscara), lupa entra | 道德經 → "O livro do caminho" |
| 6 a 7 | Close na seda; as duas metades se separam e trocam de lugar | `00/Mawangdui Tao Teh King fragment` | Silêncio de 1 s; a seda "corta" em duas e troca (Te ↔ Tao) | **DE TRÁS PARA FRENTE** (vermelho) |
| 8 a 10 | Pilha de edições: rolo → livro antigo → livro de livraria | ilustração + capa 1894 (`05/Matgioi`) | Objetos empilham com sombra, carimbo "editado" | "copiado · cortado · reorganizado" |
| 11 a 12 | Mosaico rápido das 4 promessas (Tao, autor, religião, ciência) | miniaturas de cada bloco | 4 cartões entram um por palavra | — |

### Bloco 1 · O que é o Tao (frases 13 a 49, cerca de 2 min)
| Frases | Cena | Mídia | Animação | Texto |
|---|---|---|---|---|
| 13 a 18 | Caractere 道 pintado a pincel, depois rio, semente e dia/noite | `01/Daodejing in Lesser Seal`, vídeo de rio (`01/Running Stream`), timelapse ilustração | Pincel desenha 道 (máscara de traço) e a tinta vira o rio | 道 · "caminho" |
| 19 a 24 | Primeira linha do livro sobre a seda | `01/Daodejing-81-chapters` | Lupa percorre a coluna 1 | "O Tao de que se pode falar não é o Tao eterno" (cap. 1) |
| 25 a 31 | **Diagrama Manim 1:** seta que bate na pedra × seta que contorna | Manim | Seta reta trava e treme; seta curva passa | 無為 · "agir sem forçar" |
| 32 a 37 | Água contornando pedra; cânion de cima | `01/Mountain Moment, Box Canyon`, rio | Câmera lenta, push | "mole · insiste · vence" |
| 38 a 45 | **Diagrama Manim 2:** yin-yang que gira e se transforma (cada metade vira a outra) | `01/Yin and yang.svg` | Gira, os pontos crescem e trocam | 陰陽 · "forças que se completam" |
| 46 a 49 | Volta ao rolo; pergunta | `00/Mawangdui LaoTsu Ms2` | Tinta escorre e cobre a tela (transição) | **QUEM PENSOU ISSO?** |

### Bloco 2 · Laozi: lenda contra evidência (frases 50 a 65, cerca de 2 min)
| Frases | Cena | Mídia | Animação | Texto |
|---|---|---|---|---|
| 50 a 52 | Retrato de Laozi; Confúcio ao lado | `02/Dongping Han fresco`, `02/Laozi...` | 2,5D, os dois se separam em camadas | "Laozi · 'velho mestre'" |
| 53 a 57 | **A lenda:** Laozi no búfalo atravessando o passo na névoa | `02/Zhang Lu Laozi Riding an Ox`, `02/Chen Hongshou...`, `02/Hangu Pass` | Pan lento no rolo, névoa cruzando (E5) | "Passo de Hangu" |
| 58 a 60 | O guarda pede o livro; pincel escreve 5.000 caracteres | `02/Laozi meets Yin Xi`, `02/Laozi Delivering the Daodejing` | Caracteres caem na folha em cascata | "~5.000 caracteres" |
| 61 a 63 | **Corte seco para o silêncio:** retrato de Sima Qian; linha do tempo | `02/Sima Qian (painted portrait)` | Linha do tempo séc. VI a.C. → c. 100 a.C.; "~400 anos" pisca | "Shiji · Sima Qian" |
| 64 a 65 | Três rolos lado a lado com uma lupa | ilustração de mesa | Lupa compara; os três não batem | **ELAS NÃO SÃO.** |

### Bloco 3 · O livro vivo (frases 66 a 91, cerca de 3 min 20 s)
| Frases | Cena | Mídia | Animação | Texto |
|---|---|---|---|---|
| 66 a 70 | Guodian: tiras de bambu amarradas | `03/郭店楚简 老子甲/乙/丙`, `03/Warring States or Han Bamboo Slips` | Tiras entram uma a uma (som de bambu), lupa | "Guodian · 1993 · c. 300 a.C." |
| 71 a 72 | Tiras fora de ordem se reorganizando | Manim/Remotion com as tiras recortadas | As tiras trocam de posição e não fecham os 81 capítulos | "sem 81 capítulos" |
| 73 a 77 | Mawangdui de novo: duas cópias em seda | `00/Mawangdui LaoTsu Ms2` | **Diagrama 3:** blocos "Te" e "Tao" trocam de lugar | 德 → 道 · "Te Tao Ching" |
| 78 a 81 | Tiras da Universidade de Pequim | `03/Laozi PKU` | Etiqueta "mercado de antiguidades" com carimbo "origem incerta" | "Pequim · 2009" |
| 82 a 87 | Linha do tempo completa: falado → bambu → seda → 81 capítulos | as três provas recortadas | Os 3 marcadores acendem; o livro final se forma | "300 a.C. · 168 a.C. · Han" |
| 88 | CTA de inscrição sobre a mesa | — | Selo vermelho "inscreva-se" carimbado no papel | — |
| 89 a 91 | Gancho para o bloco 4 | templo (próximo bloco) | Tinta-transição | "o que ele virou depois" |

### Bloco 4 · De filosofia a religião de Estado (frases 92 a 112, cerca de 3 min)
| Frases | Cena | Mídia | Animação | Texto |
|---|---|---|---|---|
| 92 a 94 | "Imagem do Ocidente × o que foi na China": sábio sereno × templo com incenso | `04/Jade Emperor temple incense`, vídeo de incenso | Tela dividida que se abre | "Ocidente × China" |
| 95 a 99 | Zhang Daoling; talismãs | `04/Zhang Daoling`, `04/fulu talisman`, `04/Taoist talisman Hsinchu` | Talismã de papel amarelo cai sobre a mesa | "Mestres Celestiais · séc. II" · "5 medidas de arroz" |
| 100 a 104 | Dinastia Tang: palácio e Xuanzong | `04/A palace concert`, `04/Journey to Shu`, `04/李隆基像` | Pan longo no rolo "Journey to Shu"; contador 618 → 907 | "Tang · 618-907" |
| 105 a 106 | O decreto de 733 | ilustração de rolo de decreto | Carimbo vermelho "733" com batida de gongo | **LEITURA OBRIGATÓRIA** |
| 107 a 109 | Dunhuang | `04/Dunhuang Cave 16`, `04/Dunhuang 0507 341` | Push dentro da caverna, luz de lanterna | "Dunhuang" |
| 110 a 112 | Quatro faces: filosofia, religião, medicina, política | recortes dos blocos 1 a 4 | 4 cartões giram para a câmera | — |

### Bloco 5 · Ocidente e Brasil (frases 113 a 125, cerca de 1 min 35 s)
| Frases | Cena | Mídia | Animação | Texto |
|---|---|---|---|---|
| 113 a 116 | Royal Society, 1788 (Somerset House) | ilustração marcada; capa 1894 `05/Matgioi` | Mapa: China → Londres, linha de tinta | "Londres · 10/01/1788" |
| 117 a 118 | Livro encolhendo até virar frase de pôster | capas | Livro reduz até virar adesivo "deixa a vida te levar" | — |
| 119 a 122 | São Paulo nos anos 1970; Liberdade | `05/Liberdade São Paulo`, `05/Metrô Jabaquara 1970` | Mapa: China → São Paulo | "Liu Pai Lin (1907-2000)" sem foto (sem imagem livre) |
| 123 a 125 | Tai chi ao amanhecer | `06/Morning Tai Chi`, vídeos de tai chi | Câmera lenta | **FUNCIONA?** |

### Bloco 6 · O que a ciência diz (frases 126 a 144, cerca de 2 min)
| Frases | Cena | Mídia | Animação | Texto |
|---|---|---|---|---|
| 126 a 129 | Símbolo do Tao com etiqueta "não testável" | `01/Yin and yang.svg` | Carimbo "fora do laboratório" | — |
| 130 a 133 | O mapa de exercícios de Mawangdui (Daoyin tu) volta a ligar com a tumba | `06/Daoyin tu Wellcome` | Pan nas 44 figuras; lupa | "Daoyin tu · Mawangdui" |
| 134 a 139 | **Diagrama Manim 4:** pirâmide de evidência (26 revisões) | Manim | Alta: pressão e densidade óssea acendem em verde-jade; moderada e baixa em cinza | "Mak et al., 2026 · 26 revisões" |
| 140 a 141 | Medidor de pressão; tai chi lento | `06/Sphygmomanometer`, vídeo | 2,5D | — |
| 142 a 144 | Balança: "benefício real" × "não prova a cosmologia" | ilustração de mesa | Balança equilibra | **COMPLEMENTO, NÃO TROCA** |

### Bloco 7 · Fechamento (frases 145 a 156, cerca de 1 min 10 s)
| Frases | Cena | Mídia | Animação | Texto |
|---|---|---|---|---|
| 145 a 148 | Volta ao rolo de seda de 1973 | `00/Mawangdui LaoTsu Ms2` | Mesma câmera da abertura, ao contrário (espelho) | — |
| 149 a 150 | Água contornando a pedra | rio | Câmera lenta | 無為 |
| 151 | Silêncio; a palavra entra | — | 1 s de silêncio, carimbo vermelho | **É ESTRATÉGIA.** |
| 152 a 156 | Tela final: próximo vídeo (estoicos) + inscrever-se | — | Rolo se fecha e vira o cartão do próximo vídeo | — |

## 4. Ordem de produção
1. Italo grava a narração (`NARRACAO-PARA-GRAVAR.md`) e manda o áudio tratado.
2. Whisper na voz → tempo de cada frase → `tempos.json` (cada cena acima ganha início e fim reais).
3. **Storyboard** (uma imagem por cena com a frase) para aprovar antes de animar o vídeo inteiro.
4. Diagramas Manim (4) e cenas 2,5D no Remotion, em camadas; trilha e SFX.
5. Render, `timeline.xml` para o Premiere, revisão, legenda, thumb (`titulo-thumb-lab`) e os 5 Shorts.

## 5. O que falta de mídia
- Vídeos do Pexels (rio, tai chi, incenso, caligrafia, bambu): estão no D:. Sem o D:, baixar de novo pelo site do Pexels.
- Royal Society 1788 e Liu Pai Lin: sem imagem livre. Ilustração marcada, ou autorização da Associação Tai Chi Pai Lin.
- Pranchas completas do Laozi A e B de Mawangdui (PDF grande, domínio público), se quiser o close em alta.
