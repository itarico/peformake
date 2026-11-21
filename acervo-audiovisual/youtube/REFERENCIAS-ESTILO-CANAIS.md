# Canais de referência de estilo de apresentação

Estudo de 21/11/2026, pedido do Italo: canais com estilos visuais diferentes para adaptar ao Por Dentro, além de
Nostalgia e Tinocando (ficha em `perfis/tinocando-e-nostalgia.md`). Copiar a mecânica, nunca a arte, o texto ou a trilha.

## Como medir "em alta"
`yt-dlp` em 21/11/2026, aba de vídeos de cada canal: mediana das views dos 10 vídeos mais recentes (med. 1-10) contra a
dos 10 anteriores (med. 11-20), e a data do último vídeo. Vídeo recente ainda está acumulando views, então a med. 1-10
tende a sair menor; queda forte indica perda, alta indica bom momento.
As assinaturas visuais vêm de observação geral dos canais, sem análise quadro a quadro nesta sessão (o download de
trechos falhou por falta de runtime JavaScript no yt-dlp). Antes de copiar uma mecânica, assista 2 vídeos com `ler-video`.

**O que temos para reproduzir:** OpenMotion / HyperFrames (HTML + GSAP), Remotion, Premiere, imagens livres (Wikimedia
Commons, Agência Brasil, Pexels, Unsplash, domínio público), malhas do IBGE, ícones livres. **Sem gerador de imagem.**

## Tabela
| Canal | Inscritos | Último vídeo | Med. 1-10 | Med. 11-20 | Momento | Viabilidade (0-10) |
|---|---|---|---|---|---|---|
| Johnny Harris | 8,02 mi | 07/11/2026 | 3,6 mi | 3,4 mi | em alta, estável | 7 |
| Vox | 12,7 mi | 20/11/2026 | 86 mil | 79 mil | estável, baixo para o tamanho | 7 |
| Kurzgesagt | 25,8 mi | 10/11/2026 | 9,2 mi | 4,3 mi | em alta | 4 |
| Wendover Productions | 4,92 mi | 06/11/2026 | 985 mil | 1,1 mi | estável | 8 |
| PolyMatter | 1,93 mi | 24/07/2026 | 176 mil | 348 mil | em queda, parado há 4 meses | 8 |
| LEMMiNO | 5,93 mi | 31/10/2025 | 7,7 mi | 8,55 mi | raro (1 vídeo por ano), cada um é evento | 6 |
| Real Engineering | 5,12 mi | 07/11/2026 | 723 mil | 1,8 mi | em queda | 3 |
| Coffeezilla | 4,78 mi | 12/11/2026 | 5,05 mi | 5,6 mi | em alta, estável | 8 |
| fern | 5,71 mi | 12/11/2026 | 5,0 mi | 4,35 mi | em alta | 4 |
| Canal Nostalgia | 15,2 mi | 17/10/2026 | 1,45 mi | (poucos vídeos na aba) | forte | 7 |
| Ciência Todo Dia | 7,94 mi | 26/10/2026 | 550 mil | 639 mil | estável | 6 |
| Manual do Mundo | 20,6 mi | 18/11/2026 | 1,4 mi | 778 mil | em alta | 2 |
| Meteoro Brasil | 1,8 mi | 19/10/2026 | 19,5 mil | 31 mil | em queda | 7 |
| Tinocando TV | 2,89 mi | 14/11/2026 | 501 mil | 273 mil | em alta | 8 |
| Daniel Penin | canal encerrado pelo YouTube | - | - | - | - | ver nota |

Vídeo mais visto entre os 20 recentes de cada um (para assistir primeiro):
- Johnny Harris: "The Modern Middle East, Explained", 8,0 mi.
- Vox: "Creatine, debunked", 1,2 mi.
- Kurzgesagt: "AI Just Crossed the Terrifying Line - Now What?", 24 mi.
- Wendover: "How the Channel Tunnel Works", 2,3 mi.
- PolyMatter: "How China Killed Hong Kong's Economy", 590 mil.
- LEMMiNO: "Cicada 3301: An Internet Mystery", 43 mi.
- Real Engineering: "The Insane Engineering of the P-38 Lightning", 3,7 mi.
- Coffeezilla: "Exposing the Gambling Epidemic", 10 mi.
- fern: "The Most Disgusting Influencer Campaign of 2026", 11 mi.
- Nostalgia: "Brasil antes de 1500: a história não contada" (título traduzido), 7,5 mi.
- Ciência Todo Dia: "Quando o TEMPO DESAPARECE!" (título traduzido), 1,4 mi.
- Manual do Mundo: "Como é feita a ração do seu pet?" (título traduzido), 2,8 mi.
- Meteoro Brasil: "Globonews prepara demissões e mudanças editoriais" (título traduzido), 162 mil.
- Tinocando: "DOSTOIÉVSKI: o HOMEM que COMPREENDEU a VIDA", 978 mil.

## Fichas

### Johnny Harris (mapas, colagem e papel)
- **Assinatura:** mapa de papel físico e digital misturados, marcador desenhando por cima, colagem de foto e documento,
  apresentador aparecendo em campo e em mesa.
- **Ritmo:** rápido, cortes curtos, câmera sempre em movimento sobre o mapa.
- **Texto e dados:** palavras escritas à mão sobre o mapa, setas, círculos; número dentro do mapa, não em gráfico solto.
- **Reproduzir:** mapa vetorial (IBGE, Natural Earth) em HTML+GSAP com traço que se desenha (stroke-dashoffset), textura de
  papel, fotos livres recortadas; Premiere para montar.
- **Viabilidade 7:** a parte de campo não temos; a parte de mapa e colagem dá.

### Vox (colagem explicativa)
- **Assinatura:** colagem de recortes, documento com marca-texto amarelo, gráficos limpos, arquivo de jornal.
- **Ritmo:** médio, explicativo.
- **Texto e dados:** o trecho do documento é destacado com marca-texto enquanto a voz lê.
- **Reproduzir:** prints e PDFs públicos em HTML+GSAP (máscara de marca-texto animada), Remotion para gráficos.
- **Viabilidade 7.** É a base técnica mais útil para a "Sala de Guerra".

### Kurzgesagt (flat 2D)
- **Assinatura:** ilustração vetorial plana, cores saturadas, personagens-pássaro, animação contínua.
- **Ritmo:** animação sem pausa; trilha própria.
- **Texto e dados:** pouco texto; dado vira escala visual (coisa grande ao lado de coisa pequena).
- **Reproduzir:** exige ilustrador e animação quadro a quadro. Dá para imitar o "flat" com ícones e formas em SVG + GSAP,
  mas sem a riqueza deles.
- **Viabilidade 4.**

### Wendover Productions (infográfico de logística)
- **Assinatura:** mapa plano com rotas animadas, b-roll de banco de imagem, gráfico simples, narração constante.
- **Ritmo:** médio, sem rosto.
- **Texto e dados:** rótulos curtos no mapa, números grandes sobre fundo sólido.
- **Reproduzir:** HTML+GSAP para rotas e rótulos, Remotion para gráficos, b-roll livre (Pexels).
- **Viabilidade 8.** Muito próximo do que já sabemos fazer.

### PolyMatter (minimalista de economia)
- **Assinatura:** formas geométricas simples, paleta contida, ícones e mapas limpos.
- **Ritmo:** médio, cada ideia em uma cena.
- **Texto e dados:** palavra-chave em tela cheia, gráfico de linha simples.
- **Reproduzir:** SVG + GSAP, tipografia; quase tudo em molde.
- **Viabilidade 8.** Atenção: canal parado desde julho e em queda.

### LEMMiNO (documentário sóbrio)
- **Assinatura:** fundo escuro, tipografia fina, arquivo real, trilha original, muito silêncio.
- **Ritmo:** lento, longo (40 min ou mais), investigação com revelação.
- **Texto e dados:** títulos de capítulo, data e lugar em letra pequena, documento ampliado.
- **Reproduzir:** Premiere + HTML+GSAP para títulos; trilha livre (YouTube Audio Library). O que não temos é o tempo de
  pesquisa de meses.
- **Viabilidade 6.** Bom para o formato "mistério com revelação".

### Real Engineering (3D técnico)
- **Assinatura:** render 3D de máquinas, corte transversal, narração técnica.
- **Reproduzir:** exige 3D (Blender). Fora do nosso foco.
- **Viabilidade 3.**

### Coffeezilla (investigação em cenário)
- **Assinatura:** cenário de escritório de detetive (3D), documentos, prints de site e de rede social na tela, o
  apresentador como investigador.
- **Ritmo:** rápido, prova atrás de prova.
- **Texto e dados:** print com o trecho destacado; mensagem de chat ampliada.
- **Reproduzir:** a mesa da "Sala de Guerra" em HTML+GSAP (fundo de madeira ou feltro, documentos que deslizam, carimbo),
  prints reais da Biblioteca de Anúncios.
- **Viabilidade 8.** O formato mais próximo do posicionamento.

### fern (3D minimalista)
- **Assinatura:** mundo 3D cinza e simples, narrador anônimo, histórias de golpe e investigação.
- **Reproduzir:** exige 3D. Dá para trocar o 3D por 2.5D (camadas de papel com parallax).
- **Viabilidade 4.**

### Canal Nostalgia (mapa que cresce e ilustração)
- Ficha em `perfis/tinocando-e-nostalgia.md`. Mapa em pergaminho que cresce, barra de linha do tempo fixa, tinta como
  transição. A ilustração autoral não temos.
- **Viabilidade 7** (mapa e linha do tempo sim; ilustração não).

### Ciência Todo Dia (apresentador + animação)
- **Assinatura:** apresentador em estúdio intercalado com animações de ciência e gráficos.
- **Reproduzir:** sem apresentador, perde a âncora. A parte de gráfico dá em Remotion.
- **Viabilidade 6.**

### Manual do Mundo (experimento em estúdio)
- **Assinatura:** experimento físico gravado. Não se aplica a um canal narrado.
- **Viabilidade 2.**

### Meteoro Brasil (colagem de meme e comentário)
- **Assinatura:** dois apresentadores, colagem de prints, memes e manchetes.
- **Reproduzir:** a colagem de print e manchete dá (HTML+GSAP).
- **Viabilidade 7**, mas o canal está em queda.

### Tinocando TV (texto sobre pintura)
- Ficha em `perfis/tinocando-e-nostalgia.md`. Título serifado sobre pintura de domínio público, cor de destaque única.
- **Viabilidade 8.** Tudo com material livre e GSAP.

### Daniel Penin
- Canal principal encerrado pelo YouTube (consulta de 21/11/2026). Agregadores citam cerca de 2,7 mi de inscritos antes
  disso. Não deu para assistir aos originais; o que se sabe do formato está em `FORMATOS-APRESENTACAO.md` §2 (investigação
  com tese moral e partes numeradas). Referência de mecânica de título e série, não de visual.

## Os 4 estilos que mais servem ao Por Dentro
1. **Coffeezilla + Vox = "Sala de Guerra":** mesa de dossiê, prints reais, marca-texto. Viabilidade 8.
2. **Wendover / PolyMatter:** infográfico limpo de mapa e número. Viabilidade 8.
3. **Tinocando:** texto forte sobre pintura, para ensaios. Viabilidade 8.
4. **Johnny Harris + Nostalgia:** mapa que se desenha e cresce. Viabilidade 7.

---

## Recomendação para o próximo vídeo: "Se o Brasil fosse Panem"
O plano atual (`roteiros/jogos-vorazes-brasil/CENAS.md`) usa papel e tinta com mapa-mãe que cresce (Nostalgia), título
serifado (Tinocando) e a ficha do tributo.

### Opção A: manter papel e tinta + Nostalgia / Tinocando
- **Frame:** pergaminho creme, mapa do Brasil a traço marrom; o Pará se preenche de vermelho como tinta que escorre e o
  carimbo "XII" bate no centro; à direita, a ficha de papel com clipe se preenche a caneta.
- **Prós:** já está planejado e roteirizado; mapa-mãe reutilizável; continuidade com o Taoísmo.
- **Contras:** papel antigo combina com história, não com distopia; os dois primeiros vídeos do retorno ficariam com a
  mesma cara, e o posicionamento diz que papel e tinta é série especial, não padrão.

### Opção B (recomendada): "Propaganda da Capital": HUD de ficha de tributo + mapa de dados
- **Frame:** fundo grafite com grão; o mapa do Brasil em linhas finas brancas, as UFs do distrito acendendo em
  vermelho-colheita; no canto superior esquerdo, o HUD "TRIBUTO Nº 0417 · DISTRITO XII · PARÁ" com barras que enchem
  (renda, chance na colheita); na base, a régua dos 12 distritos com ícones (picareta, espiga, engrenagem), o atual aceso
  e o contador "4/12"; nos blocos de "pão e circo", cartazes de propaganda da Capital com tipografia condensada e o slogan
  carimbado.
- **Prós:** combina com a distopia; diferencia do Taoísmo; casa com o formato "índice com ícones e progresso" (o
  espectador vê quantos distritos faltam); tudo em HTML+GSAP com o mapa-mãe que já está planejado (só troca a pele: o
  mecanismo de acender e crescer continua); os cartazes viram Shorts.
- **Contras:** refazer a paleta e alguns moldes do `CENAS.md`; risco de lembrar o material oficial do filme. Evitar a
  fonte, o tordo e as cores do pôster oficial; a "Capital" é nossa (dourado, como já previsto).

### Opção C: colagem estilo Vox / Johnny Harris
- **Frame:** mesa com o mapa do IBGE impresso, fotos reais da Agência Brasil recortadas (garimpo, lavoura, porto) presas
  com fita, a linha do dado sublinhada com marca-texto e o rodapé "IBGE · PAM 2025".
- **Prós:** prova real na tela, reforça a credibilidade dos números; é a "Sala de Guerra" do canal.
- **Contras:** depende de muitas fotos livres com crédito (pesquisa de imagem pesada); a fantasia de Panem fica menos
  presente.

**Recomendação:** opção B como pele do vídeo inteiro, com dois empréstimos: a colagem da opção C só no bloco do clímax
(os 84 municípios, com prova na tela) e o mapa-mãe que cresce do plano atual. O papel e tinta fica para o Taoísmo e a
série histórica.
