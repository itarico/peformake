# Pesquisa 7 — Estudo visual dos profissionais de vídeo com IA (08/11/2026)

Fonte: 18 vídeos em `REFERENCIAS/_salvos/profissionais/Instagram/<autor>/<id>/`. Cada `analise.md` tem a seção "Estudo visual (08/11/2026)" com a análise completa.
Objetivo: transformar o que os profissionais fazem em **skills permanentes de edição**, que valem para qualquer vídeo. Os clientes (hortifrúti B2B premium, assistência técnica de ferramentas, sistema para restaurantes, vereadora) aparecem só como exemplos.
Princípio: nada é regra. Analise e mescle com criatividade.

> Aviso de dados: o detector de planos (`cortes.csv`) marcou "1 plano" em quase todos, mas os quadros mostram muitos cortes. O limiar precisa ser revisto antes de usar "cortes/s" como métrica. Os quadros do Erik Marreiro saíram girados 90°. Os parâmetros abaixo vêm da leitura dos 16 quadros e das transcrições. Quando são estimativas, aparecem com "≈".

---

## 1. Tabela geral

| id | autor | origem | estilo | aprendizado principal |
|---|---|---|---|---|
| DfYEatNhvli | Curious Refuge (curta *Kagome*) | mundo | curta de terror naturalista com IA, em moldura de repost | contenção: luz motivada, câmera parada, o defeito da IA vira tema |
| DfBh7TVMPfo | Jon Finger | mundo | demo crua filmada com celular | a prova real dispensa produção; uma frase fixa basta |
| DefHdmSvaqw | Paul Trillo | mundo | curta animado com visual de pintura (LoRA sobre arte original) | estilo próprio vindo de um artista humano gera consistência |
| DefWg8XoXye | Justin Odisho | mundo | meme de texto sobre degradê | identificação com o nicho; alcance quase de graça |
| Dem0ANNI62t | Justin Odisho | mundo | tutorial filmando a tela com o celular | um passo por frase; as mãos humanizam o software |
| DdfCxu9pst7 | Eduardo Tumajan | Recife | breakdown em 3 faixas (IA / original / referência) | mostrar o processo gera autoridade; depth map + referência |
| DdsC0php5ys | Eduardo Tumajan | Recife | remake de ação com IA (Seedance) | cortar no meio do movimento esconde deformação |
| DfQLTwkMRBS | Lucas Levitan | Brasil | quebra de tela com mão real (Google Flow) | âncora física + estilo estilizado = mágica crível em 9 s |
| DfcXJtdxNz0 | Erik Marreiro | NE (PB) / Recife Image | institucional de memória urbana: ator + arquivo + render | código de cor narra o tempo; voz regional; IA a serviço da história |
| DfXhMzSBY_m | Kavan Cardoza | mundo | série de fantasia sombria (15 min, Magnific) | personagem recorrente e grade escura que esconde a IA |
| DfVJliVJ3T9 | Gabi Storymaker | Recife | storymaking de aniversário com abertura editorial | dignificar o retratado; detalhe em câmera lenta; clímax emocional |
| DfcZri3Am0J | Hashem Al-Ghaili | mundo | explainer científico em 3D estilizado | um visual por frase; tipografia em 3 níveis; paleta única |
| DbwMxQWJRt3 | @setup.tec | Brasil | UGC de review no setup | gancho de autoridade com número; legenda de 1 palavra |
| DfagfrQJRn6 | @setup.tec | Brasil | esquete de trend (transição do isqueiro) | match cut no gesto; inversão cômica em 10 s |
| DelBjZ_t7tK | André Nunes | Brasil | antes/depois em cards (edição por IA) | "você fala e a edição mostra"; layout comparativo |
| DfA7GoZTUo7 | André Nunes | Brasil | selfie + UI recriada em motion | recriar a interface em vez de gravar a tela; par sans + serifa itálica |
| DfWQjPpTDt- | André Nunes | Brasil | explainer jornalístico animado (política) | um card por frase, fontes visíveis, sistema gráfico fixo |
| DfUcaUrhTK4 | Robert Lucas | Recife | filme esportivo-conceitual noturno | direção de cor complementar; tipografia contida |

---

## 2. Recife: o que fazem e o que falta (oportunidade)

**O que fazem bem**
- **Robert Lucas:** fotografia de cinema (cor complementar, câmera lenta, ângulos variados, tipografia elegante).
- **Gabi Storymaker:** cobertura de evento que dignifica a pessoa (abertura editorial, detalhe, emoção).
- **Tumajan:** domina fluxo avançado de IA (Seedance + depth map + referência) e mostra o processo.
- **Erik Marreiro** (paraibano, palestrante do Recife Image): o mais completo. Roteiro com arco, ator, voz regional, arquivo animado e código de cor. Tem cliente público e agência.

**O que falta neles (e é a diferenciação da agência)**
1. **Gancho nos 3 primeiros segundos.** Robert abre com rosto desfocado e Gabi com um pé. Não há promessa nem pergunta.
2. **A mensagem dentro do vídeo.** Em Robert, a metáfora tênis/negócio só existe na legenda do post. Sem VO e sem texto, o vídeo é só bonito.
3. **IA aplicada a problema de negócio.** Tumajan faz fan remake (Matrix), não peça de cliente. Ninguém em PE mostra IA vendendo produto B2B, serviço técnico ou SaaS.
4. **Formatos de informação.** Ninguém faz explainer com dados (Hashem, André/Texas). É a lacuna maior, e serve justamente para B2B, SaaS e mandato.
5. **Sistema tipográfico.** Ou não há texto, ou é texto solto. Falta hierarquia (kicker/título/legenda).
6. **Som diegético e desenho de som.** Tudo é música de trend. Falta som real (bola, motor, faca, aplauso) e silêncio.
7. **Série e recorrência.** São peças avulsas. Ninguém tem personagem ou quadro fixo.
8. **Transparência.** Exceto Erik ("imagens ilustrativas"), ninguém sinaliza IA nem fontes. Para conteúdo político isso é obrigação.

**Posicionamento possível:** "A cinematografia de Recife + o roteiro e os dados de quem sabe vender + IA só onde a câmera não alcança."

---

## 3. O que os do mundo fazem de diferente (e cabe num PC fraco)

| prática | quem | por que cabe num PC fraco |
|---|---|---|
| Geração 100% na nuvem; o PC só monta | Kavan (Magnific), Levitan (Flow), Tumajan (Seedance) | o render pesado é remoto; local fica um corte de clipes 1080p |
| Estilo estilizado (massinha, pintura, 3D de brinquedo) em vez de fotorrealismo | Levitan, Trillo, Hashem | o estilizado esconde artefato, então gera menos refação e menos créditos |
| Âncora física filmada no celular + IA só no "impossível" | Levitan, Jon Finger, Odisho | celular + 1 geração curta |
| Grade escura e low-key | Kavan, Kagome | esconde defeito; o grading no FFmpeg/Premiere é leve |
| Motion gráfico 2D em código (cards, fitas, UI recriada) | André (Texas, Claude) | Remotion/HTML renderiza 2D rápido, inclusive em 720p para prévia |
| Bíblia de estilo e de personagem (3–5 refs fixas reusadas) | Trillo, Kavan, Hashem | é organização, não hardware |
| Um visual por frase, roteiro denso | Hashem, André | é planejamento, não render |
| Contenção (planos fixos, pouco efeito) | Kagome, Trillo | menos efeito significa render mais leve |

O que **não** cabe: treinar LoRA local (Trillo), 3D real em Blender pesado, 15 min de série com lip sync. Substitutos: usar imagem de referência em vez de LoRA, estilizado gerado em vez de Blender e minissérie de 30–45 s.

---

## 4. As 10 lições como RECEITAS REPRODUZÍVEIS

Formato de cada receita: **Quando usar · Parâmetros · Implementação · Exemplo.**
Padrão de áudio comum a todas: o lote inteiro mede ≈ -14 LUFS integrados. Usar `-14 LUFS / true peak -1 dBTP`, porque vários arquivos passaram de 0 dBTP, o que é um erro. FFmpeg: `loudnorm=I=-14:TP=-1:LRA=11` (duas passagens).

### R1. "Um visual por frase" (explainer de autoridade)
*Fonte: Hashem Al-Ghaili, André Nunes (Texas).*
- **Quando usar:** explicar número, processo, regra ou boato; conteúdo de autoridade e conversão.
- **Parâmetros:**
  - roteiro em frases de 1,5–4 s; 1 card ou cena nova por frase (≈ 25–35 cenas em 75–120 s);
  - abertura 0–4 s com *comparação visual ou pergunta* ("Esse é X. E esse é Y.");
  - virada aos ≈ 70% ("Agora, a pergunta."); fecho em frase curta de efeito;
  - fundo único da peça (ex.: azul-marinho com textura sutil); 1 cor de acento para destaque (amarelo);
  - entrada de elemento com spring de 250–400 ms, sem rotação nem efeitos chamativos;
  - linha fixa "FONTES NA DESCRIÇÃO" em ≈ 18 px no topo, quando houver fato.
- **Implementação:**
  - *Remotion:* `<Series>` com uma `<Series.Sequence>` por frase; a duração vem dos timestamps da transcrição (Whisper). Cada card é um componente reutilizável (`<Fita data/>`, `<CardTweet/>`, `<Verbete/>`, `<Calendario/>`), animado com `spring({damping: 200})`.
  - *HyperFrames/HTML:* uma `<section>` por frase com `data-start`/`data-duration` e GSAP `from({y:40, opacity:0, duration:.35, ease:"power3.out"})`.
  - *Premiere:* MOGRTs de card + marcadores da transcrição (Speech to Text) para posicionar.
- **Exemplo:** "Por que o tomate subiu 40%?" (hortifrúti); "Para onde vai seu IPTU" (vereadora, com fontes).

### R2. Sistema tipográfico em 3 níveis
*Fonte: Hashem; par de fontes do André.*
- **Quando usar:** qualquer peça com texto na tela.
- **Parâmetros (vertical 1080x1920):**
  - **Kicker:** monoespaçada, caixa alta, tracking +15%, 20–24 px, 60% de opacidade, acima do título.
  - **Título:** sans bold 64–90 px, alinhado à esquerda na margem de 72 px, 1–4 palavras, com ponto final em cor de acento.
  - **Legenda:** sans bold 44–52 px no terço inferior (y ≈ 1350–1500, fora da UI do Reels), 1–3 palavras por vez, palavra ativa com caixa de cor (padding 6/12 px, raio 6).
  - **Acento editorial:** 1 palavra por frase em serifa itálica (Playfair/Instrument Serif Italic), para tom premium.
  - **Versão contida (marca e luxo):** só um título final em serifa fina, caixa alta, tracking +30%, 28–32 px (Robert).
- **Implementação:**
  - *Remotion:* `@remotion/captions` → `createTikTokStyleCaptions({combineTokensWithinMilliseconds: 600})`; a palavra ativa vem de `currentTime` contra o token.
  - *FFmpeg:* legenda ASS com `\k` (karaoke) e a caixa via estilo `BorderStyle=3`.
  - *Premiere:* Captions com estilo de trilha salvo e Essential Graphics com 3 estilos de texto.
- **Exemplo:** toda peça da agência sai com esse sistema e as cores do cliente.

### R3. Âncora real + IA só no impossível ("quebra de tela")
*Fonte: Lucas Levitan, Jon Finger.*
- **Quando usar:** mostrar transformação (pedido → produto, defeito → conserto, antes → depois) em 6–12 s, com loop.
- **Parâmetros:**
  - 1 plano contínuo de celular, travado no tripé, luz ambiente quente; mão real entrando no quadro;
  - transformação no meio (≈ 40–60% do tempo);
  - mundo gerado *estilizado* (massinha, ilustração), não fotorreal;
  - 1 cor-guia (o objeto transformado) saturada e o resto neutro;
  - final igual ao início, para loop.
- **Implementação:** filmar o quadro inicial e o final reais; gerar a transição com *first/last frame* (Flow/Veo, Kling) na nuvem; costurar no corte de mão (quando a mão cobre a tela). FFmpeg: `xfade=transition=fade:duration=0.12` só se houver salto de luz.
- **Exemplo:** a mão tira do WhatsApp da distribuidora um tomate real; a furadeira sai da tela e volta revisada.

### R4. Código de cor que conta o tempo
*Fonte: Erik Marreiro.*
- **Quando usar:** história de origem, antes/depois, obra entregue, aniversário de empresa.
- **Parâmetros:**
  - **Passado:** P&B de contraste alto + grão. FFmpeg: `hue=s=0,eq=contrast=1.25:brightness=-0.03,noise=alls=10:allf=t+u`.
  - **Memória/afeto:** quente saturado (`colorbalance=rs=.06:gs=.02:bs=-.06,eq=saturation=1.15`).
  - **Futuro/obra:** frio e claro (`colorbalance=bs=.05:rs=-.03,eq=brightness=.03`).
  - Transição por "portal" falado ("Volta comigo!") + corte seco, sem efeito.
  - Renders e reconstituições com selo "imagens ilustrativas" (12–14 px, canto).
- **Implementação:**
  - *Premiere:* 3 camadas de ajuste com Lumetri (Passado/Afeto/Futuro), aplicadas por trecho.
  - *Remotion:* `filter: grayscale(1) contrast(1.25)` no `<OffthreadVideo>` do trecho.
  - Fotos antigas animadas na nuvem (imagem para vídeo) com movimento ≤ 5% de escala.
- **Exemplo:** vereadora contando a praça de 1970 → reforma; assistência "30 anos consertando a cidade".

### R5. Realismo contido (anti-cara-de-IA)
*Fonte: Kagome (Curious Refuge), Kavan Cardoza.*
- **Quando usar:** marca premium, B2B, emoção, qualquer cena gerada que precise parecer filmada.
- **Parâmetros:**
  - plano fixo ou empurrão lento (≤ 3% de zoom por plano); proibido órbita de drone sem motivo;
  - duração de plano 3–6 s; insertos de mão de 1,5–2,5 s;
  - luz motivada: a fonte aparece ou se justifica (luminária, janela, fluorescente);
  - grade: pretos densos ou levemente levantados, dessaturação de 10–20% e grão fino. FFmpeg: `eq=saturation=0.85,curves=all='0/0.03 0.5/0.47 1/0.95',noise=alls=6:allf=t`;
  - som: ambiente real e silêncio antes do momento-chave; música só onde houver emoção;
  - cortar *no meio* do movimento rápido para esconder deformação (Tumajan).
- **Implementação:** padronizar a grade em LUT (.cube) e aplicar igual a planos reais e gerados (`lut3d=marca.cube`), o que unifica as fontes. Letterbox 2.39 opcional para tom de cinema (`drawbox` preto em cima e embaixo).
- **Exemplo:** galpão de hortifrúti às 4 h; cozinha em hora de pico com pedido errado.

### R6. Estilo próprio fixado por referência (bíblia visual)
*Fonte: Paul Trillo, Kavan, Hashem.*
- **Quando usar:** qualquer projeto com mais de 3 gerações, série, personagem ou mascote.
- **Parâmetros:**
  - pasta `bíblia/` com 3–5 imagens de estilo + 3–4 refs por personagem (frente, perfil, corpo inteiro, como na faixa de baixo do Tumajan);
  - paleta de no máximo 5 cores com HEX; um material dominante (glossy, massinha, pintura, filme);
  - prompt-base fixo + variação só de ação e enquadramento.
- **Implementação:** gerar sempre com imagem de referência (Kling/Seedance/Flow). Registrar seed e prompt em `bíblia/prompts.md`. Pós: a mesma LUT da R5.
- **Exemplo:** personagem recorrente "O Gerente" para o sistema de restaurantes; universo ilustrado da marca hortifrúti.

### R7. Prova lado a lado (antes/depois e breakdown)
*Fonte: André Nunes (cards), Tumajan (3 faixas).*
- **Quando usar:** vender resultado ou serviço; portfólio da agência; mostrar processo.
- **Parâmetros:**
  - *Cards:* fundo escuro com vinheta; card "antes" a ≈ 35% da largura e card "depois" a ≈ 55%, sobrepostos, raio 16–24, sombra; selos em pílula no topo; CTA fixo embaixo.
  - *Breakdown:* 3 faixas iguais de 640 px (resultado / original / referência) com rótulo de 22 px no canto.
  - O card "depois" leva mais calor e contraste que o "antes" (+10% de saturação e de contraste).
- **Implementação:**
  - *FFmpeg (3 faixas):* `[a][b][c]vstack=inputs=3` após `scale=1080:640:force_original_aspect_ratio=increase,crop=1080:640`; os rótulos com `drawtext`.
  - *Remotion:* dois `<OffthreadVideo>` em `<AbsoluteFill>` com transform e um `startFrom` sincronizado.
- **Exemplo:** foto de celular do produto → versão de campanha; ferramenta suja → revisada.

### R8. Gancho de 0–3 s com promessa explícita
*Fonte: a lacuna de Recife (Robert, Gabi) × setup.tec, Hashem, André.*
- **Quando usar:** sempre, inclusive em filmes bonitos.
- **Parâmetros (escolher 1):**
  - (a) **número de autoridade** ("170 milhões de views");
  - (b) **pergunta** ("Seu cérebro tem limite?");
  - (c) **comparação visual** (dois logos, antes × depois);
  - (d) **frase de atitude na tela desde o frame 0** (versão contida para filme estético).
  - Texto do gancho legível em ≤ 1,5 s (≤ 7 palavras); a imagem do gancho já é o melhor plano, não um plano de textura.
- **Implementação:** começar a timeline pelo plano mais forte e mover a abertura "atmosférica" para depois de 3 s. Usar a skill `viral-video-hook-templates`.
- **Exemplo:** o filme de "precisão" da assistência abre já na faísca em câmera lenta com "Precisão não é sorte."

### R9. Som que carrega a peça
*Fonte: Kagome (silêncio, noticiário), Erik (voz regional + rima), lacuna de Robert e Gabi.*
- **Quando usar:** sempre. O som é metade da percepção de "profissional".
- **Parâmetros:**
  - 3 camadas: **voz** (−14 LUFS de referência), **ambiente/foley diegético** (−28 a −22 LUFS: bola, motor, faca, aplauso), **música** (−24 a −20 sob a voz, com ducking de 6–9 dB);
  - 0,5–1,5 s de silêncio ou só ambiente antes da virada ou da revelação;
  - voz e sotaque locais quando o público é local, com bordão ou rima no fecho (Erik);
  - evitar letra de música em inglês que compete com a mensagem; em evento, subir o som real nos picos (parabéns, aplauso).
- **Implementação:**
  - *FFmpeg:* `sidechaincompress` para ducking + `loudnorm` final.
  - *Premiere:* Essential Sound (Dialogue/Music/SFX) + Auto-ducking + Remix para ajustar a duração da trilha.
  - Usar a skill `sound-effects` para cue list e mix.
- **Exemplo:** evento comunitário com o hino da rima no fim; oficina com o som do motor como "batida".

### R10. Formatos de baixo custo para alcance (meme, trend, demo, dica)
*Fonte: Odisho (meme, tutorial), setup.tec (isqueiro), Jon Finger (demo).*
- **Quando usar:** manter frequência entre peças caras; testar ganchos; suporte ao cliente.
- **Parâmetros:**
  - **Meme de texto:** fundo da marca (degradê de 2 cores da paleta), sans bold 64–72 px centralizada, 4–6 linhas, 8–12 s, 1 frase de dor do nicho.
  - **Trend de transformação:** câmera fixa, corte no gesto (mão cobre a lente em ≤ 3 frames), 8–12 s, frase fixa no topo.
  - **Dica de 30 s:** celular por cima do ombro, 1 passo por frase, jump cut a cada 2–4 s, legenda palavra a palavra em cor de acento, CTA "Siga para mais".
  - **Demo crua:** 1 tomada de 10–20 s, frase fixa centralizada, sem grading.
- **Implementação:** templates Remotion com props (`texto`, `cores`), renderizados em lote (`npx remotion render` por linha de CSV). FFmpeg para a frase fixa: `drawtext=fontfile=...:text='...':x=(w-tw)/2:y=h*0.12:fontsize=56:borderw=3`.
- **Exemplo:** "Eu podia controlar estoque no caderno… mas gosto de dormir" (restaurantes); "Isso aqui é ostentação!" com a bancada revisada (assistência).

---

## 5. Mapa de mescla (exemplos, não regra)

| objetivo da peça | receita-base | misturar com |
|---|---|---|
| autoridade / conversão B2B | R1 explainer | R2 tipografia + R5 grade contida |
| marca premium / emoção | R5 realismo contido | R8(d) gancho de atitude + R9 som diegético |
| história de origem / obra entregue | R4 código de cor | R1 dados na tela + R9 voz regional e rima |
| mostrar transformação | R3 quebra de tela | R7 antes/depois + R10 loop curto |
| frequência barata | R10 | R2 cores e fonte da marca |
| série / personagem | R6 bíblia | R5 grade escura + R8(b) pergunta por episódio |
| evento comunitário | abertura editorial (Gabi) | R8 gancho + R9 som real + R4 P&B como respiro |

**Regras transversais:** sinalizar conteúdo sintético quando houver pessoa real ou contexto político (regra eleitoral); fontes na descrição quando houver fato; nada de rosto real em cena inventada sem consentimento.
