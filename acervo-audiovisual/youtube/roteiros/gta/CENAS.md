# Cenas: "R$ 549,90: quem fica com o dinheiro do seu GTA VI"

Plano de cenas por bloco do `ROTEIRO.md`. Corte médio de 5 a 6 s (de 115 a 135 cortes em 11 min e meio, a faixa de
Tinocando e Nostalgia em `../../../perfis/tinocando-e-nostalgia.md`). Troca de modo a cada 45 a 90 s.

## Estilo: "Boca do Caixa"
Diferente do Taoísmo (papel e tinta, série especial) e do Panem (arquivo investigativo em pergaminho). Aqui o mundo é
um **balcão de loja visto de cima**, limpo e comercial, com a lógica de infográfico do Wendover e do PolyMatter
(`../../REFERENCIAS-ESTILO-CANAIS.md`, viabilidade 8): poucos elementos, número grande, movimento com função.
- **Objeto-mãe: o cupom fiscal térmico.** Ele imprime linha a linha no gancho, vira régua do vídeo e é cortado em
  fatias nos blocos 3 a 5. No fecho, volta inteiro, com cada fatia nomeada.
- **Etiqueta de preço amarela** para cada país, cada edição e cada número-âncora.
- **Leitor de código de barras e maquininha** como transição: o "bip" passa de um bloco para o outro.
- Mãos só em silhueta (recorte chapado), nunca rosto.

**Paleta:**
- balcão cinza-chumbo (#2B2E33) como fundo;
- papel térmico (#F4F1EA) e tinta de impressora (#1B1B1B) para o cupom e os textos;
- **amarelo-etiqueta (#FFD400)** como única cor de destaque (preço, número-âncora, barra do contador);
- vermelho-caneta (#D7261E) só para riscar e para as fatias que saem do cupom;
- verde de visor de maquininha (#3DDC84) só para "APROVADO" e para a fatia que chega na Take-Two.

**Tipografia (Google Fonts, licença OFL):**
- IBM Plex Mono para tudo o que é cupom, código e rodapé de fonte (cara de impressora);
- Archivo Black para números-âncora e títulos de bloco;
- Inter para legendas curtas.

**Rodapé fixo de fonte:** todo número entra com a fonte em Plex Mono no canto inferior esquerdo, no formato de linha de
cupom: `FONTE: TAKE-TWO · RELEASE 20/11/2026`. Conta nossa leva o selo amarelo `CONTA NOSSA`; a divisão do bloco 5
leva `SIMULAÇÃO · HIPÓTESES NA DESCRIÇÃO`.

**Produção:** animação 2D com profundidade leve (sombra do cupom no balcão, parallax mínimo) em HyperFrames/OpenMotion
(HTML + GSAP) ou Remotion (`motion-pro`, `remotion-video`). Câmera fixa de cima, com zoom e pan suaves.
Foto real de pessoa ou lugar só do Brasil (prateleira de loja brasileira, quem joga em casa), com licença livre
(Agência Brasil com crédito, Pexels, Unsplash, Wikimedia) e crédito no canto. Imagem de IA, se o Italo liberar, leva
"ilustração".

## Elementos que se repetem (fazer uma vez, reusar)
1. **O cupom (molde):** largura de 1/3 da tela, borda serrilhada embaixo, cabeçalho `CUPOM · GTA VI · STANDARD`.
   Linhas novas imprimem com o som da impressora térmica. Cada fatia que sai é recortada com tesoura (corte em
   zigue-zague), cai num envelope com nome ("IMPOSTO", "LOJA", "TAKE-TWO") e o envelope desliza para fora do quadro.
2. **O contador (re-hook visual):** barra horizontal fina no topo da tela, amarela, com o rótulo
   `SOBRA PARA QUEM FEZ O JOGO: R$ 449,90`. Aparece aos 0:20 cheia. Só encolhe nos blocos 3, 4 e 5; nos outros blocos
   entra por 2 s, parada, sempre que a fala retoma a pergunta (marcas em `ROTEIRO.md`, notas de retenção).
3. **A etiqueta de país:** etiqueta amarela pendurada por um barbante, com a bandeira pequena, o preço local e, embaixo,
   o preço em dólar. No bloco 2 ganha uma segunda linha: `HORAS DE SALÁRIO MÍNIMO`.
4. **O cartão de prova:** recorte de manchete ou trecho de documento num cartão branco com clipe, fonte e data em Plex
   Mono. Sempre parado (captura de tela), nunca vídeo de terceiro.
5. **O título de bloco:** linha de cupom grande em Archivo Black que imprime e é cortada: `01 · A PEÇA`,
   `02 · O MECANISMO`, `03 · A CONTA`, `04 · A CONTA`, `05 · A CONTA`, `06 · O MECANISMO`, `07 · USE VOCÊ`.

## Som (`../../POSICIONAMENTO-CANAL.md`, seção Som)
- **Trilha por emoção, troca no corte de bloco (8 faixas):** gancho, pulso eletrônico tenso · peça, groove leve de
  loja · preço por país, marimba curiosa · imposto, grave contido · loja, baixo sincopado com tensão · o que sobra,
  revelação aberta · Ultimate, ironia leve (pizzicato) · Use você e fecho, piano limpo.
- **Fontes:** YouTube Audio Library, Pixabay Music, Freesound CC0. Ducking automático sob a voz.
- **Foley real:** impressora térmica (cada linha do cupom), tesoura (cada fatia), envelope deslizando, bip de leitor
  de código (transição de bloco), maquininha "aprovado", moedas caindo (valores), caneta riscando, papel de etiqueta,
  caixa de papelão abrindo (a caixa sem disco), martelo de juiz (depoimento da Microsoft), relógio de ponto (horas).
- **Silêncio de 0,5 s** antes das 4 revelações marcadas no roteiro.

---

## 0 · GANCHO (0:00 a 0:35)
| Fala (início) | Imagem | Texto na tela | Som |
|---|---|---|---|
| "Quatrocentos e quarenta e nove reais e noventa" | balcão vazio; o cupom imprime de baixo para cima: `GTA VI ...... R$ 449,90` | `R$ 449,90` (amarelo, gigante) | impressora térmica |
| "vendeu três vírgula setenta e nove bilhões de dólares em um dia" | cartão de prova: trecho do release da Take-Two (captura parada) | `US$ 3,79 BI · 1 DIA` · `FONTE: TAKE-TWO 20/11/2026 · ESTIMATIVA DA EMPRESA` | maquininha |
| "quanto chega em quem fez o jogo?" | o contador nasce no topo, cheio: `SOBRA PARA QUEM FEZ O JOGO: R$ 449,90` | (o contador) | bip |
| "desmontei esse preço, fatia por fatia" | uma tesoura entra no quadro e para sobre o cupom, aberta | (nenhum) | tesoura abrindo |
| "chega perto da metade. Talvez menos." | o contador treme e mostra um ponto de interrogação piscando na metade da barra | `?` | silêncio de 0,5 s, depois grave |
| "A edição de cem reais a mais" | entra uma segunda etiqueta, `R$ 549,90`, ao lado do cupom | `R$ 549,90` | papel de etiqueta |
| "fazer a outra parecer barata" | a etiqueta de R$ 549,90 projeta uma sombra que faz o cupom de R$ 449,90 parecer menor | `PARECER BARATA` | corte seco |
Card de título por 2 s: `QUEM FICA COM O SEU DINHEIRO` impresso no cupom.
**Short:** este bloco sai inteiro em 9:16 (cupom centralizado), com o texto final `A CONTA INTEIRA ESTÁ NO VÍDEO`.

## 1 · A PEÇA: O CUPOM (0:35 a 1:45)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "Vamos começar pela peça" | título de bloco `01 · A PEÇA` imprime e é cortado | `01 · A PEÇA` | impressora |
| "saiu no dia dezenove de novembro, só para PlayStation 5 e Xbox" | **trecho do jogo T1** (faixa V3) dentro de um monitor desenhado sobre o balcão | `19/11/2026 · PS5 · XBOX SERIES` · crédito do trecho | ruído de TV ligando |
| "Standard... Ultimate..." | duas etiquetas penduradas lado a lado: `STANDARD R$ 449,90` e `ULTIMATE R$ 549,90` | `FONTE: PS STORE BR` | etiqueta |
| "Vingadores: Ultimato... um vírgula dois bilhão em cinco dias" | gráfico de barras em linha de cupom: uma barra curta (Ultimato, 5 dias) e uma barra 3,2 vezes maior (GTA VI, 1 dia) | `US$ 1,2 BI · 5 DIAS` x `US$ 3,79 BI · 1 DIA` · `FONTE: DISNEY 2019 · TAKE-TWO 2026` · selo `CONTA NOSSA: 3,2x` | moedas caindo |
| "soma as pré-vendas, e é uma estimativa" | asterisco gigante amarelo cola na barra do GTA | `* INCLUI PRÉ-VENDAS · ESTIMATIVA DA EMPRESA · BILHETERIA ≠ VAREJO` | caneta |
| "trinta e quatro por cento de um salário mínimo" | um contracheque desenhado (R$ 1.621); um terço dele é recortado e cola na etiqueta da Ultimate | `34 % DO SALÁRIO MÍNIMO` · `FONTE: DECRETO 12.797/2025` · `CONTA NOSSA` | tesoura |
| "A caixa do GTA VI não tem disco" | caixa de papelão genérica (sem a arte oficial) se abre de cima; dentro, só um papelzinho | `SEM DISCO` | caixa abrindo, silêncio |
| "Dentro, tem um código" | close no papelzinho: `XXXX-XXXX-XXXX` em Plex Mono; o código vira uma seta que aponta para dois ícones de loja genéricos (sem logo) | `CÓDIGO → LOJA DIGITAL` · `FONTE: ROCKSTAR, 24/06/2026, VIA OMELETE` | bip |
| "até a caixa física é uma porta" | a caixa vira uma porta que abre para uma vitrine digital | `A CAIXA É UMA PORTA` | porta |
| "por que lá fora setenta e nove dólares" | etiqueta `US$ 79,99` entra ao lado de `R$ 449,90`; um ponto de interrogação liga as duas | `US$ 79,99 x R$ 449,90` | contador entra 2 s |

## 2 · O MECANISMO 1: O PREÇO DE CADA PAÍS (1:45 a 3:30)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "o dólar convertido, mais imposto. Não é bem assim." | uma calculadora faz `79,99 × câmbio + imposto` e o resultado é riscado em vermelho | `CONVERSÃO? NÃO.` | caneta riscando |
| "uma etiqueta para cada país. Preço regional." | **mapa-múndi de preços:** planisfério chapado em cinza claro sobre o balcão; etiquetas amarelas caem uma a uma nos países | `PREÇO REGIONAL` | etiquetas caindo |
| "sessenta e três países" | cartão de prova: manchete da Fast Company Brasil (12/11/2026) com o levantamento Leonida Lab | `63 MERCADOS · LOJAS OFICIAIS` | papel |
| "Índia... Japão... Portugal... Argentina" | zoom em cada etiqueta: `ÍNDIA ₹ 5.999 ≈ US$ 64` · `JAPÃO ¥ 9.800 ≈ US$ 62` · `PORTUGAL € 79,99 ≈ US$ 90` · `ARGENTINA US$ 96,79 COM IVA` | rodapé `FONTE: LEONIDA LAB VIA FAST COMPANY, CÂMBIO 10/11/2026 · IPROUP 19/11/2026` | bip a cada etiqueta |
| "E no Brasil? oitenta e um dólares" | a etiqueta do Brasil cai por último, ao lado da dos EUA; as duas ficam da mesma altura | `BRASIL ≈ US$ 81 · EUA US$ 79,99` | silêncio curto |
| "quantas horas de salário mínimo" | um relógio de ponto bate um cartão | `HORAS DE SALÁRIO MÍNIMO` | relógio de ponto |
| "onze horas" | nos EUA, uma pilha de 11 cartões de ponto | `11 H · US$ 7,25/H PISO FEDERAL` · `CONTA NOSSA` | ponto x 11 (rápido) |
| "sessenta e uma horas" | no Brasil, a pilha cresce até 61 cartões e passa do topo da tela | `61 H · R$ 7,37/H · DECRETO 12.797/2025` · `CONTA NOSSA` | ponto acelerando, depois silêncio |
| "Quase seis vezes mais trabalho" | as duas pilhas lado a lado | `5,5x` | grave |
| **opcional** (só se o preço da Turquia for confirmado) | etiqueta da Turquia com 32 h | `TURQUIA ≈ 32 H` | (nenhum) |
| "trava de região" | um cadeado fecha sobre a fronteira entre a Europa e o Brasil no mapa; um código europeu bate no cadeado e volta | `PS5: CÓDIGO SÓ NA REGIÃO DE COMPRA · XBOX: SEM TRAVA` · `FONTE: ROCKSTAR VIA INSIDER GAMING` | cadeado |
| "A Rockstar não explicou o motivo" | o cadeado ganha uma etiqueta em branco | `MOTIVO: NÃO DIVULGADO` | (nenhum) |
| "um sócio que entra primeiro" | uma mão em silhueta entra pelo canto e segura a ponta do cupom | (nenhum) | contador entra 2 s |

## 3 · A CONTA 1: O IMPOSTO (3:30 a 4:50)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "O sócio é o imposto" | título de bloco `03 · A CONTA`; a mão em silhueta ganha um crachá `IMPOSTO` | `03 · A CONTA` | impressora |
| "No Brasil, a etiqueta já vem com o imposto dentro" | duas etiquetas: a brasileira com uma camada interna visível (raio X), a americana com um `+ IMPOSTO NO CAIXA` | `BR: IMPOSTO DENTRO · EUA: IMPOSTO DEPOIS` | bip |
| "não existe uma conta oficial publicada" | carimbo vermelho `SEM CONTA OFICIAL` sobre o cupom | `SEM CONTA OFICIAL` | carimbo, silêncio |
| "PIS, COFINS, ISS e os da remessa" | as siglas imprimem no cupom uma embaixo da outra | `PIS · COFINS · ISS · REMESSA` | impressora |
| "cerca de vinte e oito... quase quarenta e quatro" | dois cartões de prova: Tributo Devido (18/06/2026) e Numerando/IBPT; uma régua amarela marca a faixa de 28 % a 44 % no cupom | `28 % A 44 % · ESTIMATIVAS` | caneta |
| "entre cento e vinte e seis e cento e noventa e oito reais" | **a 1ª fatia é recortada:** a tesoura corta o trecho da régua; a fatia cai no envelope `IMPOSTO` | `R$ 126 A R$ 198` · `CONTA NOSSA` | tesoura, envelope |
| "Antes de qualquer empresa ver um centavo" | o contador encolhe para `R$ 252 A R$ 324` | `ANTES DE QUALQUER EMPRESA` | moedas saindo |
| "reforma tributária... transição que leva anos" | linha do tempo em cupom: `HOJE: PIS · COFINS · ICMS · ISS` → `DEPOIS: CBS · IBS` | `FONTE: TRIBUTO DEVIDO` | papel |
| "E aí entra a segunda mão" | uma segunda mão em silhueta entra pelo outro lado | (nenhum) | bip de transição |

## 4 · A CONTA 2: A LOJA (4:50 a 6:20)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "a dona da loja" | a segunda mão ganha crachá `LOJA DO CONSOLE`; título `04 · A CONTA` | `04 · A CONTA` | impressora |
| "No PlayStation ou no Xbox" | **trecho do jogo T2** dentro do monitor, com uma moldura genérica de "loja" desenhada em volta (sem a interface real da loja) | crédito do trecho | (nenhum) |
| "Epic contra a Apple... sob juramento" | cartão de prova: manchete de 2021 (TweakTown, "Microsoft exec: our 30% commission is required to build Xbox consoles"); martelo de juiz desenhado | `EPIC x APPLE · MAIO/2021 · DEPOIMENTO DA MICROSOFT` | martelo |
| "trinta por cento" | `30 %` gigante em Archivo Black | `30 % · XBOX NO CONSOLE` (`12 % NO PC`, menor) | moedas |
| "o hardware do Xbox nunca deu lucro" | um console genérico (silhueta, sem marca) sobre o balcão com a etiqueta `LUCRO: R$ 0` | `FONTE: GEEKWIRE, MAIO/2021` | bip |
| "Na Sony, a fatia é a mesma" | cartão de prova: manchete sobre o processo coletivo no Reino Unido | `PLAYSTATION: 30 % · SEGUNDO O PROCESSO COLETIVO NO REINO UNIDO` | papel |
| "Esse contrato não é público" | envelope lacrado com `TAKE-TWO x LOJAS` e carimbo `NÃO PÚBLICO` | `NÃO PÚBLICO` | carimbo |
| "entre setenta e seis e noventa e sete reais" | **a 2ª fatia é recortada** e cai no envelope `LOJA` | `R$ 76 A R$ 97` · `CONTA NOSSA · SIMULAÇÃO` | tesoura, envelope |
| "vendido sem lucro... paga pedágio" | animação: o console vira uma cancela de pedágio; cada caixa de jogo que passa deixa uma moeda | `CADA JOGO PAGA PEDÁGIO` | moeda a cada caixa |
| "O console é a isca. A loja é o anzol." | o console vira uma isca presa num anzol, e a linha sobe até a palavra `LOJA` | `ISCA / ANZOL` | silêncio de 0,5 s, depois grave |
| "Agora sim dá para responder" | o contador entra no centro da tela, grande | (o contador) | bip |

## 5 · A CONTA 3: O QUE SOBRA (6:20 a 7:40)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "chegam na Take-Two... entre cento e setenta e sete e duzentos e vinte e sete" | o que sobrou do cupom cai no envelope `TAKE-TWO`; a maquininha mostra `APROVADO` em verde | `R$ 177 A R$ 227` · `SIMULAÇÃO · CONTA NOSSA` | maquininha aprovado |
| "De quarenta a cinquenta por cento" | **gráfico do cupom inteiro**, em pé, dividido em 3 cores: imposto (vermelho), loja (cinza), Take-Two (verde), com as duas versões lado a lado (cenário 28 % e cenário 43,9 %) | `39 % A 50 %` · `HIPÓTESES: IMPOSTO DE 28 % A 43,9 % · LOJA 30 % SOBRE O VALOR SEM IMPOSTO` | grave e silêncio |
| "antes de pagar quem fez o jogo, servidores, marketing" | do envelope verde saem setas para 4 caixinhas: `EQUIPE`, `SERVIDORES`, `MARKETING`, `ANOS DE DESENVOLVIMENTO` (sem valores) | `VALORES NÃO PÚBLICOS` | papel |
| "Uma cópia digital a mais custa quase nada" | uma copiadora desenhada cospe caixas idênticas, cada vez mais rápido | `CUSTO DE UMA CÓPIA ≈ 0` | copiadora |
| "trinta e dois milhões e meio... duzentos e trinta e cinco milhões" | gráfico de pilhas de caixas em escala: GTA VI antes do lançamento x GTA V em 13 anos | `32,5 MI ANTES DE SAIR · GTA V: 235 MI` · `FONTE: TAKE-TWO 20/11/2026` | moedas |
| "um mês de GTA mais" | **trecho do jogo T3** no monitor; por cima, um cartão de assinatura com `1º MÊS GRÁTIS` | `RESERVA DIGITAL: 1 MÊS DE GTA+` · `FONTE: PLAYSTATION, TERMOS DA OFERTA` | notificação |
| "Você conhece esse truque" | o cartão de assinatura vira um carrinho de compras com a palavra `RENOVA` | `ASSINATURA = RECEITA TODO MÊS` | clique |
| "por que existe uma edição de cem reais a mais?" | a etiqueta `R$ 549,90` volta ao centro, girando devagar no barbante | `R$ 100 A MAIS. POR QUÊ?` | contador entra 2 s |

## 6 · O MECANISMO 2: A EDIÇÃO DE CEM REAIS A MAIS (7:40 a 9:10)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "cem reais a mais. Vinte e dois por cento." | título `06 · O MECANISMO`; as duas etiquetas lado a lado, com uma régua mostrando a diferença | `+ R$ 100 · + 22 %` · `CONTA NOSSA` | impressora |
| "carros, armas e roupas exclusivos" | **trecho do jogo T4** no monitor (um carro do jogo) | `ULTIMATE: VEÍCULOS, ARMAS E ROUPAS EXCLUSIVOS` · `FONTE: ROCKSTAR` | (nenhum) |
| "custa quase nada para copiar" | a copiadora do bloco 5 volta e copia a etiqueta `ULTIMATE` | `CUSTO ≈ 0` | copiadora |
| "Tversky e Kahneman... efeito âncora" | cartão de prova: capa do artigo na *Science*, 1974 (referência, sem foto das pessoas) e uma âncora desenhada caindo sobre a etiqueta de R$ 549,90 | `EFEITO ÂNCORA · TVERSKY E KAHNEMAN · SCIENCE, 1974` | âncora batendo |
| "o quatrocentos e cinquenta para de parecer caro" | a etiqueta de R$ 449,90 encolhe visualmente e ganha um selo `SENSATO` | `PARECE O SENSATO` | (nenhum) |
| "o chamariz. Dan Ariely... The Economist" | cartão de prova: capa do livro *Previsivelmente Irracional* (2008) | `EFEITO CHAMARIZ · ARIELY, 2008 · HUBER, PAYNE E PUTO, 1982` | papel |
| "Três opções" | **o experimento em cupom:** três etiquetas `SÓ DIGITAL US$ 59` · `SÓ IMPRESSA US$ 125` · `IMPRESSA + DIGITAL US$ 125` | (as etiquetas) | bip x 3 |
| "ninguém escolheu a só impressa. Zero. oitenta e quatro" | 100 bonequinhos se distribuem: 16 / 0 / 84 | `16 · 0 · 84` | passos |
| "tirou a opção que ninguém queria... trinta e dois" | a etiqueta do meio é arrancada; os bonequinhos correm e ficam 68 / 32 | `68 · 32` | papel rasgando, silêncio |
| "A opção que ninguém comprava era a que fazia a outra vender" | a etiqueta arrancada volta e ganha o crachá `CHAMARIZ` | `CHAMARIZ` | grave |
| "a Rockstar nunca disse... leitura de marketing" | carimbo `LEITURA, NÃO CONFISSÃO` | `LEITURA DE MARKETING` | carimbo |
| "um preço alto ao lado... um upgrade depois" | a estrutura em 3 etiquetas: `ULTIMATE` (alta), `STANDARD` (sensata), `UPGRADE DEPOIS` (pendurada mais longe) | `ÂNCORA · SENSATO · UPGRADE` | etiquetas |
| "nada disso é exclusividade de videogame" | as etiquetas viram etiquetas de academia, padaria e celular (desenho chapado) | (nenhum) | contador entra 2 s |

## 7 · USE VOCÊ E FECHO (9:10 a 11:30)
| Fala | Imagem | Texto | Som |
|---|---|---|---|
| "a mesma arquitetura. Sem enganar ninguém." | título `07 · USE VOCÊ`; uma prancheta com checklist vazio | `07 · USE VOCÊ` | impressora |
| "Um: monte três opções" | item 1 se marca; exemplo: tabela de planos de academia brasileira redesenhada (mensal, semestral, anual) | `1 · TRÊS OPÇÕES` | caneta marcando |
| "o cardápio com o prato mais caro no topo" | cardápio de restaurante brasileiro desenhado, prato mais caro em cima | (nenhum) | papel |
| "Dois: não converta preço, escolha preço" | item 2; mini-mapa do Brasil com etiquetas diferentes por bairro e público (ilustração genérica) | `2 · ESCOLHA O PREÇO` · `ÍNDIA US$ 64 · PORTUGAL US$ 90` | bip |
| "Três: mostre o preço alto primeiro" | item 3; a âncora do bloco 6 cai primeiro na prancheta | `3 · O ALTO PRIMEIRO` | âncora |
| "a opção cara tem que entregar de verdade" | a etiqueta cara ganha um selo `ENTREGA?` com um visto | `SÓ VALE SE ENTREGAR` | caneta |
| "volta para o cupom do começo" | **o cupom inteiro volta**, remendado com fita, cada fatia nomeada: `IMPOSTO 28-44 %` · `LOJA 30 % DO RESTO` · `TAKE-TWO 39-50 %`; a etiqueta da Ultimate pendurada ao lado | `FONTES NA DESCRIÇÃO` | impressora (a mesma do gancho) |
| "Nenhum desses números é segredo sozinho" | as fatias se juntam numa única folha | (nenhum) | fita |
| "qualquer grande lançamento" | o cupom troca de produto em cortes rápidos: `CELULAR`, `INGRESSO DE SHOW`, `FILME`, cada um com fatias em branco | `QUALQUER LANÇAMENTO` | bip x 3 |
| "O preço não mede quanto uma coisa custa para fazer..." | o cupom fica sozinho no balcão, câmera sobe devagar | a frase em Archivo Black, linha por linha | piano |
| "terceiro vídeo sobre o GTA... na tela" | tela final: miniatura de "Você foi o marketing do GTA 6" e da "ciência da espera" | (tela final do Studio) | piano termina |

---

## Faixa do jogo (V3, separada): 7 trechos de até 5 s
Regras para todos: trailer oficial do canal da Rockstar no YouTube, **sem o áudio original** (mudo), dentro do monitor
desenhado (ocupa no máximo 40 % da tela), com narração por cima e crédito fixo `ROCKSTAR GAMES · TRAILER 1 (2023)` ou
`TRAILER 2 (2025)`. Cada trecho fica numa faixa própria do Premiere, com a **alternativa já montada na faixa de baixo**:
se o Content ID reivindicar, desliga-se a V3 e a alternativa aparece sem refazer nada.

| # | Onde | Trecho sugerido (até 5 s) | Por que entra | Alternativa pronta (sem jogo) |
|---|---|---|---|---|
| T1 | Bloco 1, "saiu no dia dezenove" | plano aéreo de Vice City (Trailer 1) | mostra o produto de que se fala | animação do monitor com a palavra `19/11/2026` e a caixa genérica girando |
| T2 | Bloco 4, "No PlayStation ou no Xbox" | plano de carro em movimento (Trailer 2) | ritmo depois de 3 min de gráfico | a cancela de pedágio do mesmo bloco, adiantada em 5 s |
| T3 | Bloco 5, "um mês de GTA mais" | plano de cidade à noite (Trailer 2) | ilustra o "mundo" que vira assinatura | cartão de assinatura animado sobre o balcão |
| T4 | Bloco 6, "carros, armas e roupas exclusivos" | close de um carro esportivo (Trailer 1 ou 2) | ilustra o que a Ultimate vende | etiqueta `ULTIMATE` com 3 ícones chapados (carro, roupa, chave) |
| T5 | Bloco 2, "O mesmo jogo" (opcional) | plano de praia (Trailer 1) | quebra a pilha de cartões de ponto | as duas pilhas de cartões, sem corte |
| T6 | Bloco 7, "qualquer grande lançamento" (opcional) | 2 s de qualquer plano dos trailers antes de trocar para celular e show | marca o GTA como o primeiro "lançamento" da sequência | um cupom `GTA VI` em branco no lugar |
| T7 | Short 1 ou 2 (só nos cortes, opcional) | plano aéreo (o mesmo do T1) | primeiros 2 s do Short | a caixa sem disco abrindo |

Total no longo: no máximo 6 trechos (T1 a T6), cerca de 25 s. O vídeo funciona com a V3 desligada.
Antes de subir: rodar a verificação de direitos autorais do Studio (Checks) e, se houver reivindicação, desligar só o
trecho apontado.

## Arquivos e fontes visuais a juntar
- Capturas paradas (fonte e data no canto): release da Take-Two (20/11/2026); manchete da Fast Company Brasil
  (12/11/2026); manchete da Omelete sobre a caixa sem disco (25/06/2026); manchete do Insider Gaming sobre a trava de
  região; manchete da TweakTown (2021); manchete sobre o processo coletivo contra a Sony; página da Tributo Devido
  (18/06/2026); página da Numerando; manchete do Canaltech e do Correio 24 Horas sobre o preço.
- Página da PS Store Brasil com R$ 449,90 e R$ 549,90 (print do dia, com data).
- Capa da *Science* 1974 e do livro *Previsivelmente Irracional* só como referência bibliográfica pequena.
- Mapa-múndi: Natural Earth (domínio público), estilizado em cinza.
- Foto do Brasil: prateleira de loja de games brasileira e pessoa jogando em casa (Pexels/Unsplash, com crédito).
