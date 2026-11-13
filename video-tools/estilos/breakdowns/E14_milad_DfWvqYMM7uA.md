# Breakdown técnico — E14 "Fio condutor de uma forma" (Milad Aslani, `DfWvqYMM7uA`)

Medido em 08/11/2026: quadros a 10 fps com tempo (`seq10fps.jpg`), recortes em resolução cheia (`texto.jpg`,
`grao.png`), espectrograma + forma de onda (`audio.png`) e detecção de ataques no áudio (script `onsets.py`).
Pasta: `D:\PEFORMAKE\REFERENCIAS\_estilos\Instagram\72757508324\DfWvqYMM7uA\`. 1080×1920, **30 fps**, 6,8 s
(203 quadros), áudio −16,9 LUFS, sem voz (só texto + som).

## 1. Linha do tempo exata
| Tempo | Imagem | Texto | Som |
|---|---|---|---|
| 0,00–0,30 | **Entrada de câmera**: começa muito perto/alto e borrado, recua rápido até o plano aberto (pessoa sentada no cubo, sala vinho) — desfoque de movimento vertical forte | "Why" grande, borrado, descendo de cima e encolhendo até o lugar | **whoosh/ruído** (0–0,6 s, faixa larga) + 4 cliques |
| 0,30–1,00 | Plano aberto parado + **aproximação lenta** contínua; surgem **4–6 quadradinhos brancos** nos cantos do texto e um **traço "—"** acima (moldura HUD) | "Why" fixo | cliques suaves |
| 1,00–2,10 | aproximação continua (~+12 % de escala até 2,1 s) | **troca de palavra no mesmo lugar** a cada ~0,13–0,3 s: "waste" → "hours" → "on" → "work" | **um clique por palavra** (1,08 / 1,22 / 1,35 / 1,49 s) |
| 2,10–2,40 | **Um quadrado branco** aparece no canto, **cresce e cai sobre o rosto/peito**, o plano escurece | "work" | rajada de cliques rápidos |
| 2,40–2,60 | **Corte para preto** (fundo vinho quase preto com vinheta); o quadrado vira um **pixel** que desliza | — | cliques |
| 2,60–3,50 | Preto | pergunta **pequena** centralizada aparecendo palavra por palavra: "that should take minutes?"; embaixo **3 pontinhos de "carregando"** acendendo um a um; depois a frase **pixeliza e some** | 3 cliques (um por ponto) |
| 3,50–4,10 | **Pontos se espalham** em círculo (constelação) em volta do quadrado central | "Focus" → "on" (topo) | rajada de cliques agudos (3,62 s) |
| 4,10–4,80 | Pontos se **ligam ao centro com linhas finas** (raios); o quadrado central fica **laranja** | "what" → "matters" | cliques graves |
| 4,80–4,95 | Os raios **viram o símbolo da marca** (asterisco laranja) dentro de um quadro branco que **cresce e toma a tela** | "matters" pixelizando | impacto curto |
| 4,95–5,55 | **Fundo branco**, símbolo laranja; leve **afastamento** (símbolo diminui) | "Let Claude" (preto, pequeno) | cauda do impacto |
| 5,55–5,70 | **Corte de volta à pessoa** com **desfoque de movimento** e escala maior (zoom-in "estalo") | — | whoosh curto |
| 5,70–6,80 | Plano aberto parado | "Handle" (grande) + "the / rest" (pequeno, à direita, empilhado); **cantoneiras ⌐ ⌙** entram dos cantos e travam em volta da frase | 3 cliques finais e fim |

## 2. Movimento de câmera (3D/2,5D)
- A cena da pessoa é um **plano aberto fixo** (provavelmente gerado/3D ou gravado em estúdio). A "câmera" é
  digital: **escala + posição animadas no editor**, com **desfoque de movimento** ligado.
- **Entrada:** escala ~250 % → 100 % e posição de cima para o centro em ~9 quadros (0,3 s), curva **ease-out
  forte** (expo) + desfoque de movimento (After Effects: Motion Blur ligado, 180°; Premiere: efeito "Transform"
  com "Shutter Angle" 180–360).
- **Respiração:** depois, aproximação lenta e constante de ~100 % → 112 % em ~1,8 s (linear ou ease-in leve).
- **Retorno (5,55 s):** começa em ~115 % borrado e assenta em 100 % em ~4 quadros (estalo).
- Não há órbita 3D real; a profundidade vem da **luz** (sala vinho com luz de cima, vinheta) e do desfoque.

## 3. Texto (legendas/tipografia)
- **Fonte:** sans fina geométrica (tipo Neue Haas/Inter Light) **renderizada pixelada** — bordas em degraus, como
  bitmap ampliado (efeito "Mosaic"/pixelização de 2–4 px ou fonte pixel-fina). Branco puro; preto no fundo branco.
- **Entrada da palavra:** surge **esticada e borrada na horizontal** (rastro/"smear" de 2–3 quadros) e assenta
  nítida — é um deslize curto com desfoque direcional + pixelização que diminui.
- **Troca:** palavra substitui a anterior **no mesmo lugar** (corte seco), 0,13–0,4 s por palavra, sincronizada a
  um clique.
- **Saída:** pixeliza (mosaico aumentando) em 2–3 quadros.
- **Hierarquia:** palavra-chave grande (~11 % da largura de altura de letra) × frase de pergunta pequena (~3 %) ×
  palavras de apoio pequenas empilhadas ao lado ("the / rest").
- **Moldura HUD:** traço "—" acima + 4–6 quadradinhos nos cantos em volta da palavra; no fecho, **cantoneiras**
  `⌐ ⌙` que deslizam dos cantos e travam.

## 4. Transições
1. **Forma que cresce e cobre** (quadrado branco → tela) = transição para o preto.
2. **Corte seco para preto** (a virada/pergunta).
3. **Forma que se transforma** (pixel → pontos → constelação → raios → logo) = nenhuma transição "de efeito"; o
   próprio elemento muda.
4. **Quadro branco que cresce** a partir do logo = revelação/inversão para fundo branco.
5. **Corte com estalo de escala + desfoque** de volta à pessoa.

## 5. Cor e textura
- **Monocromia vinho:** sombras quase pretas (#120407), meios #5a0f1e, altas #b8324a no chão; branco puro nos
  gráficos. Vinheta forte (cantos −60 %). Única cor extra: **laranja terracota** (#d9734e) só no símbolo da marca.
- **Textura:** imagem **macia** (pouco detalhe fino, leve compressão), sem grão evidente; o "acabamento" vem da
  pixelização do texto e dos quadradinhos (estética digital/8-bit limpa), não de grão de filme.
- Gradação para reproduzir: curvas baixando sombras, saturação seletiva do vermelho, tudo puxado para um matiz;
  vinheta elíptica; branco dos gráficos sem brilho (flat).

## 6. Música e efeitos sonoros
- **Sem batida:** a "música" é um **drone/pad harmônico** contínuo (linhas horizontais no espectrograma, tom grave
  estável) — cria clima, não marca ritmo.
- **O ritmo é dado pelos cliques:** sons de **tique/clique de interface** muito curtos (ataque instantâneo,
  centróide 500–2.400 Hz), **um por evento visual** (cada palavra, cada ponto, cada linha). Em rajadas de 8 cliques
  espaçados ~0,13 s quando vários elementos aparecem (2,2–2,7 s; 3,6–4,2 s).
- **Whoosh/ruído largo** na entrada de câmera (0–0,6 s) e whoosh curto no retorno (5,6 s).
- **Impacto** curto na revelação do logo (4,8 s).
- Mix: cliques em torno de −20 dB RMS, pad mais baixo; volume geral −17 LUFS (baixo para Reels; o nosso alvo é −14).

## 7. Como reproduzir aqui (passo a passo)
1. **Base:** pessoa em fundo limpo (estúdio ou recorte com `recortar.py`) num cenário de **uma cor** (cor da marca
   escurecida). Gradação monocromática + vinheta (Premiere Lumetri ou FFmpeg `colorbalance`/`curves` + `vignette`).
2. **Câmera digital:** keyframes de escala/posição (entrada 250 → 100 % em 9 quadros, ease-out expo; respiração
   100 → 112 % em 1,8 s; retorno 115 → 100 % em 4 quadros) + desfoque de movimento.
3. **Texto e forma (Remotion/HyperFrames, camada separada com alfa):** componente de palavra que troca no lugar com
   entrada "smear" (translateX 40 px + blur direcional 12 px → 0 em 3 quadros) e pixelização (canvas em baixa
   resolução ampliado sem suavização); quadrado → pontos → raios → **logo do cliente em SVG** (morph); cantoneiras.
4. **Som:** pad grave contínuo (licença livre) + biblioteca de **cliques de UI CC0** (skill `sound-effects`), um
   por evento, variando 3–4 arquivos; whoosh na entrada; impacto no logo. Mixar para −14 LUFS.
5. **Tempos:** 0,13–0,4 s por palavra; vídeo total 7–10 s.
