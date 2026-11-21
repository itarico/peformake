# Cenas: "Se o Brasil fosse Panem: em qual distrito você nasceria?"

Plano de cenas por bloco do `ROTEIRO.md`. A estética mistura duas mecânicas estudadas em
`../../../perfis/tinocando-e-nostalgia.md`:
- do **Nostalgia**, o mapa em pergaminho que cresce e acende, a etiqueta vermelha de data e a linha do tempo fixa na base;
- do **Tinocando**, o título serifado em caixa alta (às vezes atrás de um objeto), o cartão de citação e uma cor de destaque única.
Copiamos a mecânica, nunca a arte, o texto ou a trilha deles.
Corte médio de 5 a 6 s, ou seja, de 110 a 130 cortes em 11 min (a faixa dos dois canais).

## Regras fixas
- **Nada do filme:** nenhum trecho, still, pôster, ator, trilha, nem o tordo do logo. Panem é desenhada por nós.
- **Paleta:**
  - pergaminho creme (#EFE4CC) como fundo;
  - tinta marrom-escura (#2B1E16) nos traços;
  - **vermelho-colheita (#B3261E)** como única cor de destaque, para o distrito que acende, os números e o carimbo;
  - dourado (#C9A54A) só para a Capital.
- **Tipografia:** serifada de cartaz em caixa alta para os títulos (Cinzel ou Playfair Display SC, Google Fonts, licença
  OFL) e uma sem serifa condensada para os números (Oswald, OFL).
- **Fonte na tela:** todo número entra com o rodapé da fonte, por exemplo "IBGE · PAM 2025".
- **Foto real:** só com licença livre (Wikimedia Commons, Agência Brasil com crédito, Pexels, Unsplash) e com o crédito
  no canto. Cena histórica feita com IA leva o rótulo "ilustração".
- **Produção:** animação 2.5D em After Effects ou Remotion (skill `motion-pro` / `remotion-video`), câmera lenta
  sobre o papel, parallax leve e grão de papel por cima.

## Elementos que se repetem (fazer uma vez, reusar 13 vezes)
1. **O mapa-mãe:** o Brasil em pergaminho, com as UFs em traço fino.
   - A cada distrito, as UFs dele se preenchem de vermelho como tinta que escorre, e um número romano é carimbado no
     centro ("XII").
   - Os distritos anteriores ficam em vermelho apagado, e assim o mapa **cresce** ao longo do vídeo, como no Nostalgia.
   - A Capital (DF) é um ponto dourado desde a abertura, pulsando de leve.
   - Malha das UFs: IBGE (API de malhas, `qualidade=minima`), domínio público.
2. **A ficha do tributo (molde fixo):** um cartão de papel envelhecido que desliza da direita, preso com um clipe. Tem
   4 linhas que se preenchem a caneta, uma por frase da narração:
   - DISTRITO: XII · PARÁ
   - VOCÊ PRODUZ: minério · madeira
   - CHANCE NA COLHEITA: 1 em 252.831 (com uma urninha que chacoalha)
   - SUA RENDA × CAPITAL: uma barra horizontal que enche até 33 %, com a barra dourada da Capital a 100 % ao lado
   - Rodapé: "simulação · 4 tributos (50º Jogos) · jovens de 12 a 18 anos, Censo 2022"
   - Quando a ficha sai, um carimbo vermelho escreve o número do distrito.
3. **O título de distrito (Tinocando):** o nome do distrito do livro em caixa alta creme ("MINERAÇÃO"), grande, atrás de
   uma foto recortada do objeto real (minério, cacho de manga, boi, saca de soja), com um brilho em estrela vermelho
   na virada.
4. **A barra de linha do tempo (Nostalgia):** fica escondida e só aparece nas 3 viradas, na base da tela:
   80 d.C. · · · 1939 · · · 1970 · · · 2024. O ponto da época acende em vermelho, com a etiqueta de data.
5. **O cartão de citação (Tinocando):** papel com borda, a referência no topo ("JUVENAL · SÁTIRA X") e a frase curta no centro.

## Som (`POSICIONAMENTO-CANAL.md`, seção Som)
- **Trilha por emoção**, trocando no corte de bloco: 7 faixas.
  - Gancho: tensão de tambor grave.
  - Panem: mistério.
  - D12 a D9: marcha lenta.
  - Viradas: cordas históricas.
  - D8 a D5: pulso crescente.
  - Capital: grave e dourado.
  - Espelho e CTA: piano de reflexão.
- **Fontes:** YouTube Audio Library, Pixabay Music e Freesound CC0. Ducking automático sob a voz.
- **Foley:**
  - papel deslizando para a ficha;
  - caneta escrevendo em cada linha;
  - carimbo em cada distrito;
  - urna de sorteio (papéis chacoalhando) para a chance;
  - moedas para a renda;
  - estalo de rádio antigo no V2;
  - ruído de TV antiga no V3;
  - notificação de celular no circo de bolso.

---

## 0 · GANCHO DO DESAFIO (0:00 a 0:35)
| Fala (início) | Imagem | Texto na tela | Som |
|---|---|---|---|
| "Imagina que o Brasil acordou amanhã dividido em doze distritos" | o mapa-mãe em pergaminho; rachaduras correm e partem o Brasil em 13 peças; o DF acende em dourado | "12 DISTRITOS" | papel rasgando, tambor |
| "uma Capital que não produz quase nada" | zoom no ponto dourado; linhas finas, como rotas, saem de cada peça e convergem para ele | (nenhum) | grave subindo |
| "um sorteio escolhe jovens de doze a dezoito anos" | urna de vidro desenhada, com papéis dobrados caindo dentro | "12 A 18 ANOS" | papéis |
| "anota aí o seu estado" | uma mão desenhada escreve "MEU ESTADO: ______" num papel; o cursor pisca na linha | "ANOTA O SEU ESTADO" (vermelho) | caneta |
| "distrito, o que produziria, chance, salário" | a ficha do tributo em branco entra e as 4 linhas aparecem como pontos de interrogação | "DISTRITO ? · PRODUZ ? · CHANCE ? · RENDA ?" | clique a cada linha |
| "A Capital do Brasil não é onde você está pensando" | o ponto dourado do DF apaga de repente; 84 pontinhos dourados piscam espalhados e somem | (nenhum) | corte seco, silêncio de 0,5 s |
| "todos os números são oficiais" | o carimbo "FONTE: IBGE · ANM · ANP · ANTAQ · BC" bate na ficha | (nenhum) | carimbo |
Card de título por 2 s: "SE O BRASIL FOSSE PANEM".

## 1 · PANEM EM 40 S (0:35 a 1:15)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "Panem é o que sobrou dos Estados Unidos" | mapa da América do Norte em pergaminho, com a costa recuando como água que sobe (desenho nosso, sem o mapa oficial do filme) | "PANEM" | vento |
| "uma Capital rica e distritos que trabalham para ela" | pirâmide de papel recortado: a Capital dourada no topo e os distritos em camadas embaixo | "CAPITAL" / "DISTRITOS" | (nenhum) |
| "dois jovens... ao vivo, como reality show" | uma TV antiga de papel com uma silhueta dentro e o selo "AO VIVO" | "AO VIVO" | estática |
| "Amanhecer na Colheita... cada distrito entrega quatro" | a urna recebe 4 papéis; o número 2 é riscado e vira 4 em vermelho | "50º JOGOS · 4 POR DISTRITO" | carimbo |
| "panem et circenses. Pão e circo." | o cartão de citação em latim, que se traduz letra por letra | "PANEM ET CIRCENSES = PÃO E CIRCO" | sino grave |
| "do mais pobre até o mais rico" | a câmera desce até o mapa do Brasil; o contador "XII" aparece no canto | "XII → I" | marcha começa |

## 2 · DISTRITOS 12 A 9 (1:15 a 3:50)
O padrão de cada distrito (cerca de 35 s, de 6 a 7 cortes):
1. As UFs acendem no mapa-mãe e o número romano é carimbado.
2. O título de distrito aparece atrás do objeto.
3. Um número-âncora gigante (Oswald, vermelho) entra com a fonte.
4. Uma foto livre de lugar real, com Ken Burns.
5. A ficha do tributo.
6. A ficha sai e o carimbo bate.

| Distrito | Objeto atrás do título | Número-âncora (fonte) | Foto livre sugerida | Destaque de ficha |
|---|---|---|---|---|
| XII · Mineração · PA | pedra de minério de ferro | "39 % DOS ROYALTIES DA MINERAÇÃO" (ANM · CFEM 2025) e "39,6 % DA MADEIRA NATIVA" (IBGE · PEVS 2025) | mina de Carajás vista do alto (Wikimedia, CC) | barra de renda em 33 %, que treme |
| XI · Lavoura · BA, PE, AL, SE, PI | cacho de manga e cacho de uva | "77,5 % DA MANGA" (IBGE · PAM 2025) | irrigação no Vale do São Francisco (Agência Brasil, com crédito) | a urna fica enorme, cheia de papéis: "1 em 841.399"; legenda "o distrito mais populoso" |
| X · Pecuária · GO, MS, TO, RO | silhueta de boi | animação de contagem: 1 boneco de pessoa ao lado de 5,4 bois de papel; "69 MI DE BOIS · 12,9 MI DE PESSOAS" (IBGE · PPM 2025; Censo 2022) | pasto de cerrado (Pexels) | barra em 54 % |
| IX · Grãos · MT, RS | punhado de soja e de arroz | "30,4 % DA SOJA" e "69,2 % DO ARROZ" (IBGE · PAM 2025) | colheitadeira em fila (Pexels) | barra em 66 % |
Fecho do bloco ("por que ninguém se revolta?"): o mapa com 4 distritos acesos dá um zoom out lento; a tinta escorre
para a base e vira a barra de linha do tempo, que entra.

## V1 · ROMA (3:50 a 4:30)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "Roma, começo do século dois. Juvenal" | busto romano recortado (foto de museu em domínio público) sobre o pergaminho; a etiqueta vermelha "~100 d.C." entra | "JUVENAL" atrás do busto | cordas |
| "pão e jogos de circo" | o cartão de citação: "JUVENAL · SÁTIRA X" | "PANEM ET CIRCENSES" | (nenhum) |
| "trigo público para a plebe... mais de duzentas mil" | sacos de trigo de papel se empilhando até formar o número "200 MIL" | "+200.000 PESSOAS" · "Res Gestae, 15" | grãos caindo |
| "Coliseu... cem dias de jogos" | gravura antiga do Coliseu (domínio público), com Ken Burns; um calendário que vira 100 folhas | "ANO 80 · 100 DIAS" | multidão distante |
| "Comida para não ter fome, espetáculo para não pensar na fome" | tela dividida: o pão à esquerda e a arena à direita, que se fundem no "P" de PANEM | "PÃO + CIRCO = PANEM" | batida |
| "o Brasil tem a própria versão" | a câmera volta ao mapa do Brasil; a barra de linha do tempo desce e some | (nenhum) | marcha volta |

## 3 · DISTRITOS 8 A 5 (4:30 a 6:20)
| Distrito | Objeto atrás do título | Número-âncora (fonte) | Foto livre sugerida | Destaque |
|---|---|---|---|---|
| VIII · Têxtil · SC | carretel de linha | "1 EM CADA 5 EMPREGOS TÊXTEIS" · "3,7 % DA POPULAÇÃO" (IBGE · CEMPRE 2024) | tear industrial (Pexels) | a barra de renda chega a 74 %, a mais perto da dourada; o selo "MENOR DESIGUALDADE · GINI 0,452" |
| VII · Madeira · PR | tora de pinus | "21 % DA MADEIRA PLANTADA" (IBGE · PEVS 2025) e o bônus de um peixe de papel com "39 % DA TILÁPIA" | pinheiral plantado (Wikimedia) | barra em 66 % |
| VI · Transporte · MA | vagão de trem | **cena-choque:** dois navios de papel lado a lado, "PONTA DA MADEIRA 172,4 MI T" (um terminal) e "SANTOS, TODO O COMPLEXO 186,4 MI T"; os dois afundam quase igual na água (ANTAQ e APS 2025) | trem de minério de Carajás (Wikimedia, CC) | um trem atravessa a tela da esquerda para a direita e sai do quadro: "o trem não para aqui"; a barra de renda em 30 %, a menor, pisca vermelha |
| V · Energia · RJ | gota de petróleo | "~88 % DO PETRÓLEO DO BRASIL" (ANP 2025); o ranking de PIB municipal em que Maricá sobe para o 4º lugar e passa Belo Horizonte (IBGE · PIB 2023) | plataforma no mar (Agência Brasil) | barra em 62 %; selo "GINI 0,574" |
Saída do D5: uma onda de rádio sai do Rio de Janeiro no mapa e vira a transição para o V2.

## V2 · O RÁDIO, 1939 (6:20 a 6:55)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "dezembro de 1939. Um decreto cria o DIP" | um decreto datilografado (recriado por nós, com o número real) recebe o carimbo; a etiqueta "1939" acende na linha do tempo | "DIP · DECRETO-LEI 1.915" | máquina de escrever, carimbo |
| "todas as rádios... Hora do Brasil" | rádio de válvula em papel recortado; ondas saem dele e cobrem o mapa do Brasil inteiro | "HORA DO BRASIL · OBRIGATÓRIA" | estalo de rádio antigo |
| "até no tema do samba e do carnaval" | pandeiro e serpentina de papel, com um carimbo "APROVADO" pairando em cima | "SAMBA · CARNAVAL" | pandeiro abafado |
| "entrava pela sala de casa" | uma sala de casa em corte, com a família em silhueta em volta do rádio | (nenhum) | (nenhum) |
Sem foto de político da época. Se precisar de imagem real, usar só o prédio ou um rádio de museu.

## 4 · DISTRITOS 4 A 1 (6:55 a 8:20)
| Distrito | Objeto | Número-âncora (fonte) | Foto livre | Destaque |
|---|---|---|---|---|
| IV · Pesca · CE, RN, PB | camarão | "87 % DO CAMARÃO DE CULTIVO" (IBGE · PPM 2025) | viveiro de camarão no litoral (Agência Brasil) | barra em 37 % |
| III · Tecnologia · AM | placa de circuito | "R$ 227,67 BI EM 2025 · RECORDE" (Suframa) contra "RENDA MÉDIA R$ 980" (Censo 2022), em contraste lado a lado | o encontro das águas ou fábrica (Agência Brasil) | a urna fica pequena: "1 em 127.742", a mais fácil de ser sorteado entre os 12 |
| II · Pedra · MG, ES | pedra de minério e saca de café | "45 % DOS ROYALTIES DA MINERAÇÃO" (ANM 2025) e "3 DE CADA 4 SACAS DE CAFÉ" (IBGE · PAM 2025) | cafezal de montanha (Pexels) | barra em 54 % |
| I · Luxo · SP | taça e prédio | "31,5 % DO PIB DO BRASIL" e a cidade de SP sozinha, "9,75 %" (IBGE · PIB 2023) | skyline da Paulista (Wikimedia, CC) | a urna gigante: "1 em 985.027", o mais difícil; barra em 70 % |
Fecho ("quem é a Capital?"): o mapa inteiro aceso em vermelho, só o DF dourado; a câmera para em cima dele por 1 s.

## V3 · A TV, 1970 (8:20 a 8:45)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "1970... Copa ao vivo, via satélite" | um satélite de papel cruza o céu de pergaminho; a etiqueta "1970" acende na linha do tempo | "1ª COPA AO VIVO" | ruído de TV antiga |
| "Pra Frente Brasil... concurso das transmissões" | uma TV de tubo de papel, com a tela em listras coloridas, sem imagem de jogo nem de jogador | "VINHETA DAS TRANSMISSÕES" | sem a música (direitos autorais); só a multidão |
| "governo militar usou o título na propaganda" | um cartaz genérico recriado por nós, sem rosto, com uma taça de silhueta | "PROPAGANDA" | (nenhum) |
| "um espetáculo nacional, ao vivo, na sala de todo mundo" | a mesma sala do V2, agora com TV no lugar do rádio; dissolve para a arena de Panem desenhada | "COMO EM PANEM" | batida |

## 5 · A CAPITAL E A REVELAÇÃO (8:45 a 9:50)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "A resposta fácil é Brasília" | o DF cresce em dourado no centro da tela, com o Eixo Monumental desenhado em traço fino | "CAPITAL · DF" atrás do desenho | trilha grave e dourada |
| "maior PIB por pessoa... duas vezes e meia" | duas colunas de moedas: Brasil, R$ 53.887, e DF, R$ 129.790 | "2,4×" · "IBGE, cálculo com PIB 2023" | moedas |
| "maior renda... três vezes a do Maranhão" | barras de renda: DF R$ 2.999 e MA R$ 900 | "3,3×" · "Censo 2022" | (nenhum) |
| "maior desigualdade de renda" | o selo "GINI 0,584 · O MAIOR DO PAÍS" | (nenhum) | carimbo |
| "somei o PIB dos 5.570 municípios" | **a cena-tese:** os 5.570 municípios aparecem como pontinhos no mapa e um contador de % sobe enquanto eles acendem do maior para o menor | contador: 0 % → 50 % | tique-taque acelerando |
| "Com oitenta e quatro cidades, já deu metade" | o contador trava em 50 % com 84 pontos dourados acesos; o resto do Brasil fica cinza | "84 CIDADES = 50 % DO PIB" | silêncio de 1 s, depois o grave |
| "os mil e trezentos menores não chegam a um por cento" | 1.301 pontos cinza apertados num quadradinho, ao lado do número "1 %" | "1.301 CIDADES = 1 %" | (nenhum) |
| "um arquipélago de oitenta e quatro cidades" | o ponto único do DF se desfaz e vira as 84 ilhas douradas espalhadas pelo mapa, ligadas por linhas | "A CAPITAL É UM ARQUIPÉLAGO" | coro grave |
| "pode estar a meia hora da sua casa" | zoom até uma ilha dourada no meio de um distrito vermelho | (nenhum) | (nenhum) |
Rodapé da cena: "IBGE · PIB dos Municípios 2023 · soma acumulada (cálculo nosso)".

## 6 · O ESPELHO (9:50 a 10:20)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "Panem não inventou nada. Só deixou à vista" | um espelho oval de moldura antiga sobre o pergaminho; dentro dele, o mapa de Panem se inverte e vira o mapa do Brasil | (nenhum) | piano |
| "o circo de hoje cabe no bolso" | um celular de papel; a barra de linha do tempo volta e acende "2024" | "2024" | notificação |
| "entre dezoito e vinte e um bilhões por mês, via Pix" | ícones genéricos de Pix saindo do celular em fila e um contador mensal | "R$ 18 A 21 BI POR MÊS" · "Banco Central, Estudo Especial 119/2024" | moedas em sequência |
| "vinte e quatro milhões de pessoas" | 24 bonecos de papel, cada um valendo 1 milhão | "24 MILHÕES · AGO/2024" | (nenhum) |
| "Pão, circo e um sorteio... quem compra o bilhete somos nós" | a urna da colheita se transforma num bilhete de aposta genérico, sem marca de empresa | "PÃO · CIRCO · SORTEIO" | batida final |
Sem logo de casa de aposta, sem atleta, sem político.

## 7 · RESULTADO E CTA (10:20 a 10:45)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "pega o estado que você anotou" | o mapa completo dos 12 distritos e da Capital, com a legenda em grade: cada distrito com as UFs, a chance e a renda (é o frame para print; deixar parado 4 s) | "ACHE O SEU" | caneta |
| "comenta: qual é o seu distrito e a sua chance" | a ficha do tributo em branco, com a seta para baixo, para os comentários | "COMENTA: DISTRITO + CHANCE" (vermelho) | clique |
| "o 13... três estados" | as 3 UFs (AC, RR, AP) em cinza, cobertas por um pano de papel com "?" | "DISTRITO XIII" | vento |
| tela final | a tela final do YouTube por cima do mapa, com o "?" do D13 ao lado do vídeo sugerido | (nenhum) | trilha sobe |

## Lista de produção
- [ ] Mapa-mãe vetorial com as UFs separadas em camadas (malha do IBGE).
- [ ] Molde da ficha do tributo (Remotion: um componente com props de distrito, produto, chance e renda, para gerar as 12 fichas).
- [ ] 12 objetos recortados (foto livre com o fundo removido, ou ilustração).
- [ ] 12 fotos livres de lugar real, com o crédito anotado na planilha de mídia.
- [ ] Cena-tese animada dos 5.570 pontos (dados prontos: o PIB 2023 por município da tabela 5938 e as coordenadas dos centroides pela API de malhas).
- [ ] Barra de linha do tempo (80 d.C., 1939, 1970, 2024).
- [ ] Cartão de citação de Juvenal.
- [ ] Revisar o Content ID: zero áudio e zero imagem do filme.
