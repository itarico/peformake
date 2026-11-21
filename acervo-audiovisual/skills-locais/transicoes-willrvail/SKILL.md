---
name: transicoes-willrvail
description: Receitas reproduzíveis das transições e efeitos de transição estudados no perfil @willrvail (Will Vail) - flash cut, quadro em negativo, whip e borrão de obturador, silhueta preenchida (masking/clone), match cut, mancha de tinta como luma matte, light leak e película queimada, wipe por objeto e glitch - com duração em quadros, easing, som e o passo a passo em ffmpeg, Remotion, HyperFrames/OpenMotion (HTML + GSAP) e Premiere. Use quando pedirem "transição estilo willrvail", "transições criativas", "efeito de transição", "flash cut", "match cut com tinta", "transição de tinta", "silhueta piscando", "transição para documentário", ou quando um corte precisar de acento e não souber qual transição usar.
---

# Transições estilo @willrvail

Estudo completo, números e exemplos: `C:\Claude\peformake\acervo-audiovisual\perfis\willrvail.md` e as fichas
`acervo-audiovisual/virais/*_willrvail_*.md`. Quadros a 24 qps (documentário). Para Reels a 30 qps, multiplique por 1,25.

## Princípio do estilo (ler antes de escolher)
1. **A transição é um acento de 1 a 3 quadros sobre um corte seco**, não uma fusão longa. Negativo, silhueta, borrão
   ou estouro de luz por 1 a 3 quadros, e o plano novo já está lá.
2. **Paleta de flash com 2 cores** no vídeo todo (branco + vermelho, ou o ciano do negativo).
3. **Rajada e respiro:** 4 a 12 planos de 2 a 5 quadros, depois 1 plano longo (slow-mo, plano aberto).
4. **Som é metade da transição:** whoosh termina no corte; hit ou estalo no quadro do acento.
5. **Segurança:** no máximo 3 flashes por segundo (fotossensibilidade). Nunca negativo e branco alternando por mais de 1 s.
6. Nunca usar trecho de vídeo de outro criador. Copia-se a mecânica.

## Escolha rápida
| Precisa de | Use | Quadros | Som |
|---|---|---|---|
| Gancho que para o dedo | 4. Silhueta piscando (masking hook) | 8 a 13 q antes do 1º plano real | 1 hit por forma |
| Ritmo de produto / detalhe | 1. Flash cut | planos de 2 a 5 q | clique por plano + whoosh |
| Impacto, virada, revelação | 2. Negativo | 1 a 3 q | impacto grave |
| Troca de lugar com energia | 3. Whip / borrão de obturador | 2 a 4 q | whoosh com ataque no corte |
| Mesma coisa em outro lugar ou época | 5. Match cut (+ 6. tinta) | 0 q (seco) ou 18 a 24 q | nada, ou pincel |
| Troca de época/tema calma | 6. Tinta (luma matte) | 18 a 24 q | pincel molhado + gongo baixo |
| Clima de película, nostalgia | 7. Light leak / película queimada / glow | 3 a 8 q | shimmer ou riser curto |
| Corte escondido, real | 8. Wipe por objeto | 3 a 6 q | whoosh grave |
| Tecnologia, erro, digital | 9. Glitch | 1 a 2 q | estalo digital |

---

## 1. Flash cut (rajada de detalhes)
**O que é:** 4 a 12 planos de detalhe de 2 a 5 quadros, com 1 a 3 quadros de borrão direcional entre alguns.
**Visto em:** Df2NAP3R7KC 0:00 (planos de 5 q e 2 q), DfnuZFyv6eQ 0:00, tutorial Df7WoiCxfQG.
**Câmera:** gravar 20 a 30 detalhes curtos em ângulos e distâncias diferentes, cada um com movimento (deslizar, girar,
rack focus), em 60 qps se der.
**A receita dele (Df7WoiCxfQG):** vários planos do objeto ou da pessoa em ângulos e distâncias focais diferentes, mais
planos de detalhe, tudo misturado; flash por cima de alguns planos; P&B invertido com distorção de lente num plano;
negativo em outro; obturador lento em outro.
**Som:** um clique ou tick por plano no beat; whoosh curto (0,3 a 0,5 s) terminando no último corte; hit no plano que respira.

**ffmpeg** (planos já cortados em p1..p4, cada um com 3 q; borrão nos 2 quadros finais do p2):
```bash
ffmpeg -i p1.mp4 -i p2.mp4 -i p3.mp4 -i p4.mp4 -filter_complex \
"[0:v]trim=end_frame=3,setpts=PTS-STARTPTS[a];\
[1:v]trim=end_frame=3,setpts=PTS-STARTPTS,dblur=angle=0:radius=60:enable='gte(n,1)'[b];\
[2:v]trim=end_frame=5,setpts=PTS-STARTPTS[c];[3:v]trim=end_frame=2,setpts=PTS-STARTPTS[d];\
[a][b][c][d]concat=n=4:v=1[v]" -map "[v]" -r 24 flashcut.mp4
```
**Remotion:** `<Series>` com `<Series.Sequence durationInFrames={3}>` por plano; no plano com borrão, envolva o vídeo
num SVG filter `feGaussianBlur stdDeviation="40 0"` (borrão só horizontal) ligado por `interpolate(frame,[0,1,2],[0,40,0])`.
**HyperFrames/OpenMotion (GSAP):** um `<img>`/`<video>` por plano, todos `opacity:0`; `tl.set(el,{opacity:1},t)` e
`tl.set(el,{opacity:0},t+3/24)` em sequência. Borrão: `tl.fromTo(el,{filter:"blur(0px)"},{filter:"blur(14px)",duration:2/24,ease:"expo.in"})`
(o CSS não tem borrão direcional; para direcional use o filtro SVG da receita 3).
**Premiere:** cortar os planos com a ferramenta Navalha no beat (marcadores com M na batida); 3 a 5 quadros por plano;
Directional Blur nos quadros do corte (keyframes 0, 60, 0).

## 2. Negativo / raio X (acento)
**O que é:** 1 a 3 quadros com as cores invertidas no início do plano novo (ou alternando com o normal). Às vezes puxado para ciano.
**Visto em:** Df97b3bxVUL 0:01 (ciano, plano inteiro), Df2NAP3R7KC q124 e q361 (2 q), DfnuZFyv6eQ q14 (1 q), Deb-VcJRpxp 0:55.
**Som:** impacto grave ou "snap" exatamente no 1º quadro invertido.

**ffmpeg** (inverte os 2 primeiros quadros de b e estoura o 3º):
```bash
ffmpeg -i a.mp4 -i b.mp4 -filter_complex \
"[0:v]setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS,negate=enable='between(n,0,1)',eq=brightness=0.6:enable='eq(n,2)'[b];\
[a][b]concat=n=2:v=1[v]" -map "[v]" negativo.mp4
```
Ciano: depois do `negate`, acrescente `colorbalance=rs=-0.3:bs=0.3:enable='between(n,0,1)'`.
**Remotion:** `style={{filter: frame < 2 ? "invert(1) hue-rotate(180deg)" : "none"}}` no vídeo do plano novo.
**GSAP:** `tl.set(el,{filter:"invert(1)"},t); tl.set(el,{filter:"none"},t+2/24);`
**Premiere:** Efeitos > Canal > Inverter no plano novo; corte o clipe em 2 quadros (Navalha) e deixe o efeito só no
pedaço de 2 quadros. Ciano: Lumetri > Curvas no mesmo pedaço.

## 3. Whip / borrão de obturador (low shutter, transitional blur)
**O que é:** borrão direcional que cresce até o corte e some depois. 2 a 4 quadros no total.
**Visto em:** Df97b3bxVUL 0:00 (3 q vermelho), Df2NAP3R7KC q3 a q6, Dfz94Lyh98B 0:16 e 0:30 (whip real de dentro do carro).
**Easing:** expo in até o corte (borrão máximo no último quadro do plano A), expo out no plano B.
**Câmera (melhor):** whip pan real no fim do plano A e no começo do B, na mesma direção, obturador 1/25 a 1/50.
**Som:** whoosh com o pico no corte. Os do Pixabay começam com silêncio: meça o ataque e adiante (ver
`acervo-audiovisual/ferramentas/openmotion/APRENDIZADOS.md`).

**ffmpeg** (a=48 quadros; borra os 3 finais de a e os 3 iniciais de b):
```bash
ffmpeg -i a.mp4 -i b.mp4 -filter_complex \
"[0:v]setpts=PTS-STARTPTS,dblur=angle=0:radius=80:enable='gte(n,45)'[a];\
[1:v]setpts=PTS-STARTPTS,dblur=angle=0:radius=80:enable='lte(n,2)'[b];\
[a][b]concat=n=2:v=1[v]" -map "[v]" whip.mp4
```
Para crescer quadro a quadro, faça 3 passadas com raio 30, 60 e 90 em `enable='eq(n,45)'`, `eq(n,46)`, `eq(n,47)`.
Já existe pronto como camada: `video-tools/remotion/src/pro/Transicoes.tsx` → `TransicaoWhip`.
**HTML/GSAP (borrão só horizontal):**
```html
<svg width="0" height="0"><filter id="dblur"><feGaussianBlur id="dbv" stdDeviation="0 0"/></filter></svg>
<script>
tl.to(q1("#dbv"),{attr:{stdDeviation:"60 0"},duration:2/24,ease:"expo.in"},corte-2/24)
  .to(q1("#dbv"),{attr:{stdDeviation:"0 0"},duration:2/24,ease:"expo.out"},corte);
// aplique style="filter:url(#dblur)" nas duas cenas e mova-as 8% na direção do whip no mesmo intervalo
</script>
```
**Premiere:** efeito Transformar no fim do A e começo do B: Posição com keyframes (desloca 300 a 600 px), desmarque
"Usar ângulo do obturador da composição" e ponha Ângulo do obturador 360. Ou Directional Blur 0 → 80 → 0.

## 4. Silhueta preenchida (masking hook, clone, silhouette overlay)
**O que é:** o sujeito recortado vira forma chapada (branca, vermelha ou preta) por 1 a 3 quadros; ou vira janela com
outros vídeos trocando dentro a cada 6 quadros.
**Visto em:** Deb-VcJRpxp 0:00 (formas branco e vermelho de 1 q cada, revelação no quadro 13), Deb 0:20 (paisagens
dentro da cabeça, troca a cada 6 q), DW6eZHpjWxc 0:02 (ele em branco, 3 q), DfP5pelxuP_ 0:36 (silhueta brilhando).
**Som:** um hit seco por forma; no "overlay", um tick por troca de 6 q no beat.
**Recorte:** Roto Brush (After Effects) ou remoção de fundo por IA exportando a máscara em P&B (branco = sujeito).

**ffmpeg** (máscara mask.mp4 em P&B; silhueta vermelha nos quadros 24 a 26):
```bash
ffmpeg -i a.mp4 -i mask.mp4 -f lavfi -i "color=c=0xB3261E:s=1920x1080:r=24" -filter_complex \
"[1:v]format=gray[m];[2:v][m]alphamerge[s];[0:v][s]overlay=enable='between(n,24,26)':shortest=1[v]" \
-map "[v]" silhueta.mp4
```
Silhueta com vídeo dentro: troque o `color` pelo vídeo de paisagem e mantenha o overlay o tempo todo, com fundo branco
(`color=c=white`) por baixo.
**Remotion:** `<Img src={mascaraPng} style={{filter:"brightness(0) invert(1)"}}/>` = silhueta branca; mostre só nos
quadros do acento com `frame>=a && frame<a+3`. Janela: `<OffthreadVideo>` com `style={{maskImage:`url(${mascaraPng})`, maskSize:"cover"}}`.
**GSAP:** PNG do recorte com `filter: brightness(0) invert(1)` (branco) ou `brightness(0)` (preto); `tl.set` aparece e
some em 1 a 3 quadros.
**Premiere:** Matte de cor (branco ou vermelho) numa trilha acima; efeito Chave de fosco de trilha (Track Matte Key)
com o recorte como fosco Alfa; corte para durar 1 a 3 quadros.

## 5. Match cut (mesma forma, outro lugar)
**O que é:** o plano B repete a forma, a posição e o movimento do A. O corte some porque o olho segue a forma.
**Visto em:** DW6eZHpjWxc 0:00 (câmera da mesa para a grama), DfnuZFyv6eQ 0:03 (gota na água).
**Câmera:** tripé na mesma altura e lente, marca de fita no chão, objeto no mesmo ponto do quadro. Movimento continua
no B (a mão que entra no A termina no B).
**Pós:** alinhar escala e posição do B sobre o A com 50% de opacidade, depois voltar a 100%. Corte seco, ou com a tinta da receita 6.
**ffmpeg:** `concat` simples; para alinhar, `scale` e `crop` no B até a forma coincidir.
**Som:** nenhum ou só a música; o silêncio vende o truque.

## 6. Mancha de tinta como luma matte (ink blot)
**O que é:** a cena nova aparece por dentro de uma mancha de tinta que cresce. Ele baixou um clipe de mancha e usou como
Luma Matte no After Effects (DW6eZHpjWxc 0:41 a 0:50).
**Duração:** 18 a 24 quadros. **Easing:** cresce rápido e desacelera (power3.out / expo.out).
**Som:** pincel molhado ou swoosh de tinta com o ataque no 1º quadro da mancha; para documentário, gongo baixo no fim.

**ffmpeg** (máscara de ruído que cresce do centro em 0,75 s; testado):
```bash
ffmpeg -i a.mp4 -i b.mp4 -filter_complex \
"[0:v]format=gbrp[a];[1:v]format=gbrp[b];\
nullsrc=s=1920x1080:r=24:d=3,geq=lum='clip(255*((random(1)*0.35+0.65*(1-hypot(X-960,Y-540)/1100))-(1-T/0.75)),0,255)':cb=128:cr=128,\
gblur=sigma=6,curves=all='0/0 0.45/0 0.55/1 1/1',format=gbrp[m];\
[a][b][m]maskedmerge,format=yuv420p[v]" -map "[v]" -t 3 tinta.mp4
```
Mude o centro (960,540) para o ponto de onde a tinta nasce; `0.75` é a duração em segundos; `gblur` maior = borda mais mole.
Com clipe de tinta real (mancha preta em fundo branco): use o clipe, `negate` e `format=gray`, como terceira entrada do `maskedmerge`.

**HTML/GSAP (HyperFrames/OpenMotion), cena B como imagem dentro do SVG:**
```html
<svg width="1920" height="1080" viewBox="0 0 1920 1080" class="abs">
  <defs>
    <filter id="borda-tinta" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="7"/>
      <feDisplacementMap in="SourceGraphic" scale="160" xChannelSelector="R" yChannelSelector="G"/>
      <feGaussianBlur stdDeviation="2"/>
    </filter>
    <mask id="mascara-tinta" maskUnits="userSpaceOnUse">
      <rect width="1920" height="1080" fill="black"/>
      <g filter="url(#borda-tinta)"><circle id="mancha" cx="960" cy="540" r="0" fill="white"/></g>
    </mask>
  </defs>
  <image href="assets/cena-b.jpg" width="1920" height="1080" preserveAspectRatio="xMidYMid slice" mask="url(#mascara-tinta)"/>
</svg>
<script>
// dentro do bloco da composição (tl = gsap.timeline({paused:true}))
tl.to(q1("#mancha"), {attr:{r:1250}, duration:20/24, ease:"power3.out"}, 0);
</script>
```
A cena A fica embaixo, num `<img>` comum. Para nascer de um ponto (ex.: o ponto vermelho do mapa), mude `cx`/`cy`.
Para vídeo na cena B, renderize a máscara como sequência PNG com alfa e monte no Premiere (Chave de fosco de trilha, Luma).
O motor do Taoísmo já tem uma tinta que **cobre** a tela (`tinta_tr` em `youtube/roteiros/taoismo/montagem/motor.html`);
esta receita é a versão que **revela** a cena nova por dentro da tinta.
**Remotion:** mesmo SVG dentro de `<AbsoluteFill>`, com `r = interpolate(frame,[0,20],[0,1250],{easing: Easing.out(Easing.cubic), extrapolateRight:"clamp"})`.
**Premiere:** clipe de tinta (preto no branco) na trilha acima da cena B; na cena B, efeito Chave de fosco de trilha,
Fosco = trilha da tinta, Composição usando = Luma do fosco (inverta se precisar). Cena A na trilha de baixo.

## 7. Light leak, película queimada e glow
**O que é:** vazamento de luz laranja em 3 q (DfnuZFyv6eQ q144); faixa vermelha vertical de película que corre e troca
a cena em 6 a 8 q (q392 a q399); estouro branco que sobe em 3 q e revela o plano novo (q147 a q151, q501).
**Easing:** sobe rápido (2 a 3 q), desce mais devagar (4 a 6 q).
**Som:** shimmer, riser curto ou chiado de projetor.

**ffmpeg** (vazamento laranja em modo Tela; testado):
```bash
ffmpeg -i a.mp4 -f lavfi -i "gradients=s=1920x1080:r=24:d=3:c0=0xff7a1a:c1=0x000000:x0=0:y0=540:x1=900:y1=540:speed=0.02" \
-filter_complex "[1:v]format=gbrp,fade=in:st=0.8:d=0.25,fade=out:st=1.3:d=0.4[l];[0:v]format=gbrp[a];\
[a][l]blend=all_mode=screen,format=yuv420p[v]" -map "[v]" leak.mp4
```
Estouro branco: `eq=brightness=0.5` com `enable` nos 2 últimos quadros do A, ou `fade=in:color=white:st=0:d=0.17` no B.
Pronto como camada: `TransicaoLightLeak` em `video-tools/remotion/src/pro/Transicoes.tsx`.
**GSAP (faixa de película):** `<div>` 18% da largura, gradiente vermelho com borda desfocada (`filter:blur(30px)`,
`mix-blend-mode:screen`); `tl.fromTo(faixa,{xPercent:-120},{xPercent:620,duration:8/24,ease:"power2.inOut"},corte-4/24)`
e troca a cena no meio (`tl.set(cenaB,{opacity:1},corte)`).
**Premiere:** clipe de light leak em trilha acima, modo de mesclagem Tela; meio do clipe no ponto de corte.

## 8. Wipe por objeto (wipe the frame)
**O que é:** alguém ou algo passa colado na lente e o corte entra no quadro mais escuro. Deb-VcJRpxp 0:11 (pessoa
passa com rastro), Dfz94Lyh98B 0:06 (mão cobre a lente: 3 q até o preto, 1 q preto, corte).
**Câmera:** gravar o fim do A com o objeto cobrindo a lente e o começo do B com o objeto saindo, na mesma direção.
**Pós:** achar o quadro mais escuro e cortar nele:
```bash
ffprobe -f lavfi -i "movie=a.mp4,signalstats" -show_entries frame_tags=lavfi.signalstats.YAVG -of csv=p=0
```
Rastro: no Premiere, efeito Eco (Echo) com 2 a 3 ecos; no ffmpeg, `tmix=frames=3`.
**Documentário (sem câmera):** troque por objeto desenhado: um rolo de seda ou uma pincelada que atravessa a tela.
GSAP: `tl.fromTo(pincel,{xPercent:-110},{xPercent:110,duration:10/24,ease:"power2.inOut"},corte-5/24)` e troca da cena em `corte`.
**Som:** whoosh grave ou passo, com o pico quando o objeto cobre tudo.

## 9. Glitch / pixel
**O que é:** 1 a 2 quadros de mosaico e separação de cor (DfP5pelxuP_ q662 e q870).
**ffmpeg** (testado): `-vf "pixelize=w=48:h=48:enable='between(n,30,31)',rgbashift=rh=-12:bh=12:enable='between(n,30,31)'"`
**Som:** estalo digital curto. **Não usar** em documentário de papel e tinta.

## Som: como pôr o SFX no corte (ffmpeg)
```bash
# whoosh termina no corte em 1,70 s; o arquivo leva 0,35 s até o pico -> adelay = (1,70 - 0,35) s = 1350 ms
ffmpeg -i video.mp4 -i whoosh.wav -filter_complex \
"[1:a]adelay=1350|1350[w];[0:a][w]amix=inputs=2:normalize=0[a]" -map 0:v -map "[a]" -c:v copy -c:a aac saida.mp4
```
Medir o pico do arquivo antes (primeiro ponto acima de 10% do pico). Whoosh e impacto 3 a 6 dB acima da trilha, abaixo da voz.

## Para documentário de papel e tinta (canal Por Dentro, Taoísmo)
Usar só a versão calma: 6 (tinta), 5 (match cut por forma), 4 (silhueta, sem piscar), 8 (wipe por objeto desenhado) e
a versão "papel" do 2 e do 7. Nada de glitch, whip rápido ou rajada de flash cut: o vídeo longo respira (cenas de 3 a 6 s).
Referências do vídeo: Tinocando (texto) e Nostalgia (câmera), em `acervo-audiovisual/perfis/tinocando-e-nostalgia.md`.
Plano de cenas: `acervo-audiovisual/youtube/roteiros/taoismo/ANIMACAO-E-CENAS.md`. 1920x1080, 24 qps.
Todas as receitas abaixo seguem o molde de composição do v70 (`montagem/v70-openmotion/construir.py`): `tl` pausado,
`q1()` busca dentro da composição, tempo em segundos, quadros = n/24. Cortar sempre no fim da frase, nunca no meio da palavra.

### T1. Abertura da tumba de 1973: tinta que nasce do ponto vermelho (receita 6)
**Onde:** frase 1. Mapa da China em papel → o ponto vermelho cai em Changsha → a câmara funerária vista de cima aparece
por dentro de uma mancha de tinta que nasce do ponto. **Tempo:** ponto pulsa 6 q, tinta abre em 20 q, câmara segue com push de 8 %.
**Som:** gota de tinta no 1º quadro da mancha; pincel molhado arrastado nos 20 q; gongo baixo no q20 (o "Mawangdui · 1973" entra aqui).
```html
<img class="abs" data-hf-id="t1-mapa" src="assets/mapa-papel.jpg" style="left:0;top:0;width:1920px;height:1080px">
<div class="abs" data-hf-id="t1-ponto" style="left:1262px;top:668px;width:28px;height:28px;border-radius:50%;background:#B3261E"></div>
<svg width="1920" height="1080" viewBox="0 0 1920 1080"><defs>
  <filter id="t1-borda" x="-30%" y="-30%" width="160%" height="160%">
    <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="4" seed="3"/>
    <feDisplacementMap in="SourceGraphic" scale="170" xChannelSelector="R" yChannelSelector="G"/></filter>
  <mask id="t1-m" maskUnits="userSpaceOnUse"><rect width="1920" height="1080" fill="black"/>
    <g filter="url(#t1-borda)"><circle id="t1-c" cx="1276" cy="682" r="0" fill="white"/></g></mask></defs>
  <image id="t1-tumba" href="assets/camara-de-cima.jpg" width="1920" height="1080" preserveAspectRatio="xMidYMid slice" mask="url(#t1-m)"/>
</svg>
<script>
tl.fromTo(q1('[data-hf-id="t1-ponto"]'),{scale:1},{scale:1.6,duration:3/24,ease:"power2.out",yoyo:true,repeat:1},1.0)
  .to(q1("#t1-c"),{attr:{r:1500},duration:20/24,ease:"power3.out"},1.0+6/24)
  .fromTo(q1("#t1-tumba"),{scale:1,transformOrigin:"50% 50%"},{scale:1.08,duration:5,ease:"none"},1.0+6/24);
</script>
```

### T2. Troca de bloco: pincelada que atravessa a tela com o título e o carimbo (receitas 8 + 2 em versão papel)
**Onde:** a última frase de cada bloco (gancho para o próximo, ex.: frases 89 a 91 → bloco 4). **Tempo:** a pincelada
preta atravessa em 10 q e cobre a tela no q5; a cena nova entra no q5; o título do bloco fica 2 s; o carimbo vermelho
bate em 2 q (escala 1,25 → 1) no q14. **Som:** bambu batendo no q5 e carimbo no q14; gongo baixo só nas viradas grandes.
```html
<div class="abs" data-hf-id="t2-pincel" style="left:0;top:-10%;width:130%;height:120%;
  background:url(assets/pincelada-preta.png) center/100% 100% no-repeat"></div>
<div class="abs tit" data-hf-id="t2-tit" style="left:160px;top:430px;font-size:120px;color:#EFE4CC;opacity:0">BLOCO 4 · O TEMPLO</div>
<img class="abs" data-hf-id="t2-selo" src="assets/carimbo.png" style="left:1560px;top:380px;width:200px;opacity:0">
<script>
const T=0; // início da transição (fim da frase)
tl.fromTo(q1('[data-hf-id="t2-pincel"]'),{xPercent:-110},{xPercent:110,duration:10/24,ease:"power2.inOut"},T)
  .set(q1('[data-hf-id="cena-b"]'),{opacity:1},T+5/24)
  .to(q1('[data-hf-id="t2-tit"]'),{opacity:1,duration:4/24},T+5/24)
  .fromTo(q1('[data-hf-id="t2-selo"]'),{opacity:0,scale:1.25},{opacity:1,scale:1,duration:2/24,ease:"power4.out"},T+14/24);
</script>
```
`pincelada-preta.png` = uma pincelada larga de tinta com alfa (scan ou IA marcada como ilustração), com as pontas secas.

### T3. Aparição de personagem: silhueta de tinta com a paisagem dentro (receita 4, sem piscar)
**Onde:** Laozi no búfalo (bloco 2), o guarda no portão, Confúcio, Matgioi. **Tempo:** a silhueta preta chapada entra em
8 q (opacidade 0 → 1, escala 1,04 → 1); dentro dela uma paisagem shan shui desliza 3 % por 36 q; depois a pintura real
aparece por dentro da silhueta em 12 q e o nome entra atrás da figura (estilo Tinocando).
**Som:** nota grave de guzheng no q0; flauta respirando enquanto a paisagem desliza; nada de impacto.
```html
<svg width="1920" height="1080" viewBox="0 0 1920 1080"><defs>
  <mask id="t3-m" maskUnits="userSpaceOnUse"><image href="assets/laozi-recorte-mascara.png" width="1920" height="1080"/></mask></defs>
  <g mask="url(#t3-m)" id="t3-g" opacity="0">
    <rect width="1920" height="1080" fill="#1A1714"/>
    <image id="t3-paisagem" href="assets/shanshui.jpg" x="-60" width="2040" height="1080" preserveAspectRatio="xMidYMid slice" opacity="0"/>
    <image id="t3-pintura" href="assets/laozi-pintura.jpg" width="1920" height="1080" preserveAspectRatio="xMidYMid slice" opacity="0"/>
  </g></svg>
<div class="abs tit" data-hf-id="t3-nome" style="left:0;width:1920px;top:300px;text-align:center;font-size:260px;color:#B3261E;opacity:0;z-index:-1">LAOZI</div>
<script>
tl.fromTo(q1("#t3-g"),{opacity:0,scale:1.04,transformOrigin:"50% 60%"},{opacity:1,scale:1,duration:8/24,ease:"power2.out"},0)
  .to(q1("#t3-paisagem"),{opacity:0.85,duration:8/24},8/24)
  .fromTo(q1("#t3-paisagem"),{x:-60},{x:0,duration:36/24,ease:"none"},8/24)
  .to(q1("#t3-pintura"),{opacity:1,duration:12/24,ease:"power1.inOut"},44/24)
  .to(q1('[data-hf-id="t3-nome"]'),{opacity:1,duration:10/24},50/24);
</script>
```
A máscara é o recorte da figura em branco sobre preto (máscara de luminância do SVG). O nome atrás da figura pede uma
segunda cópia do recorte por cima do texto (como no `construir.py` do v70).

### T4. Água: gota que cai no papel e vira ondulação (receita 5, match cut por forma + deslocamento)
**Onde:** "o Tao é como a água" (bloco 1) e qualquer cena de rio. **Tempo:** a gota de tinta cai e abre um anel no
papel em 10 q; no q10 corte seco para a água (pintura ou vídeo) com o anel no mesmo ponto do quadro; a cena nova ondula
(deslocamento 0 → 40 → 0) em 16 q e assenta. **Som:** gota no q10 (o ataque exatamente no corte); água correndo baixa depois.
```html
<svg width="1920" height="1080" viewBox="0 0 1920 1080"><defs>
  <filter id="t4-onda"><feTurbulence id="t4-turb" type="turbulence" baseFrequency="0.006 0.02" numOctaves="2" seed="5"/>
    <feDisplacementMap id="t4-desl" in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></defs>
  <circle id="t4-anel" cx="960" cy="560" r="4" fill="none" stroke="#1A1714" stroke-width="10" opacity="0"/>
  <image id="t4-agua" href="assets/rio-pintura.jpg" width="1920" height="1080" preserveAspectRatio="xMidYMid slice" filter="url(#t4-onda)" opacity="0"/>
</svg>
<script>
tl.set(q1("#t4-anel"),{opacity:1},0)
  .to(q1("#t4-anel"),{attr:{r:180,"stroke-width":2},opacity:0.2,duration:10/24,ease:"power2.out"},0)
  .set(q1("#t4-agua"),{opacity:1},10/24)
  .to(q1("#t4-desl"),{attr:{scale:40},duration:6/24,ease:"power2.out"},10/24)
  .to(q1("#t4-desl"),{attr:{scale:0},duration:10/24,ease:"power2.inOut"},16/24);
</script>
```

### T5. "De trás para frente": negativo de papel de 2 quadros (receita 2, uso único no vídeo)
**Onde:** frases 6 e 7, no instante em que as duas metades da seda trocam de lugar (Te ↔ Tao). O negativo diz
"inverteu" sem palavra. **Tempo:** 1 s de silêncio (já previsto), a troca começa, 2 q em negativo de papel (papel
escuro, tinta clara) no quadro da troca, volta ao normal e entra "DE TRÁS PARA FRENTE" em vermelho.
**Som:** silêncio até o q0; um único impacto grave (tambor ou gongo abafado) no 1º quadro invertido.
```js
// cena = o contêiner da seda; T = quadro da troca, em segundos
tl.set(q1('[data-hf-id="seda"]'),{filter:"invert(1) sepia(0.6)"},T)
  .set(q1('[data-hf-id="seda"]'),{filter:"none"},T+2/24)
  .fromTo(q1('[data-hf-id="titulo-tras"]'),{opacity:0,scale:1.12},{opacity:1,scale:1,duration:6/24,ease:"power3.out"},T+2/24);
```
Só uma vez no vídeo inteiro: repetido, vira efeito e perde o sentido.

### T6. Luz de lanterna sobre a caixa de laca (receita 7, glow quente)
**Onde:** frase 2 (a caixa de laca abrindo). **Tempo:** um halo quente atravessa a cena em 36 q em modo Tela, com
pico de brilho quando a tampa termina de deslizar. **Som:** madeira raspando na tampa, depois um "shimmer" baixo.
```html
<div class="abs" data-hf-id="t6-luz" style="left:0;top:0;width:900px;height:1080px;mix-blend-mode:screen;
  background:radial-gradient(ellipse at center,rgba(255,170,70,.55) 0%,rgba(255,120,30,.18) 45%,rgba(0,0,0,0) 70%)"></div>
<script>
tl.fromTo(q1('[data-hf-id="t6-luz"]'),{x:-900,opacity:0},{x:1920,opacity:1,duration:36/24,ease:"sine.inOut"},0.4)
  .to(q1('[data-hf-id="t6-luz"]'),{opacity:0,duration:10/24},0.4+26/24);
</script>
```

**Antes de exportar:** duração da composição em número inteiro de quadros, `hyperframes check --json`, e o SFX adiantado
pelo ataque de cada arquivo (ver `ferramentas/openmotion/APRENDIZADOS.md`).

---

## Referência Df2LedmCsjm (@sam.john.creates, carrossel de 20 edições 16:9, 17/11/2026)
Ficha completa com a tabela quadro a quadro: `acervo-audiovisual/virais/2026-11-17_sam.john.creates_Df2LedmCsjm.md`.
Medido a 30 qps (para 24 qps, multiplique os quadros por 0,8 e arredonde). Não é do @willrvail; mesma família de linguagem.

### Transições novas (somam às receitas 1 a 9)
| Nome | Quadros | Easing | Como fazer | Som |
|---|---|---|---|---|
| 10. Estrobo de silhueta (fundo troca, figura fica) | 1 a 2 q por cor, 6 a 8 q no total | seco | figura recortada (ou pictograma) por cima de fundos sólidos alternando preto, branco e 1 cor de destaque | 1 tick agudo por troca, baixo (-6 a 0 dB sobre a música) |
| 11. Recorte branco da forma seguinte | 1 q | seco | máscara da figura/objeto do plano SEGUINTE preenchida de branco sobre o plano atual; depois corte seco (ou whip) | riser de 0,6 s terminando no corte |
| 12. Rampa de exposição até o branco | 4 q subindo, corte para plano escuro | ease-in | brilho/exposição em keyframe até estourar (luz 50 → 150 → 220 → 250) | música em passa-baixa abrindo 0,4 s antes + swell; impacto ou shimmer no branco |
| 13. Troca de mapa de cor por quadro | 1 q por gradação, 3 a 6 q | seco | o mesmo plano em térmico, cinza, negativo, um por quadro | estalos digitais em rajada |
| 14. Pixel stretch (arrasto vertical) | 3 a 5 q | ease-in | esticar uma linha de pixels até cobrir a tela | whoosh curto |
| 15. Moldura que salta (portal) | 3 q de entrada | ease-out com overshoot leve | moldura listrada de 2 cores escala de 1,15 para 1 com o plano seguinte dentro | **1 s de silêncio antes** e impacto brilhante no quadro (+15 a +20 dB) |
| 16. Wipe branco de 1 q | 1 q | seco | faixa branca cobrindo 70 % do quadro, vindo de cima | queda da música, riser e drop 0,5 s depois |
| 17. Flip para negativo segurado | 0 q, segura 1 s | seco | o mesmo plano invertido, sem cortar | nenhum: a música baixa 3 dB |
| 18. HUD de videogame | entra elemento a elemento, 3 a 6 q cada | ease-out | nome do lugar em serifada de RPG no topo, barra de vida, minimapa, caixa de missão; desenhar o próprio HUD | blip de interface por elemento |

### Som: o que os números ensinam (20 vídeos, 384 cortes)
- 58 % dos cortes têm ataque de som a até 100 ms (acaso: 34 %). Entre os sincronizados, **o som vem 15 ms antes** (meio
  quadro). No ffmpeg: `adelay` = (tempo do corte - 0,015 - ataque do arquivo) em ms.
- Efeito pontual fica **0 a +6 dB** sobre a música. Impacto forte (+10 a +20 dB) só depois de **silêncio ou passa-baixa**.
- **Respiro a cada 10 a 15 s:** música abafada (passa-baixa até 500 Hz) por 0,3 a 1 s, ou silêncio de 0,5 a 1 s; volta
  com riser de 0,6 s (+15 a +28 dB) terminando no corte, ou impacto no primeiro quadro.
- Fade para o preto: passa-baixa fechando junto com a imagem; a música volta forte 0,5 s depois.
- Transição sem som também vale (negativo de 2 q só com a música).

Passa-baixa com rampa (ffmpeg; trilha.wav, abafa de 10,2 s a 11,0 s e cala até 11,3 s):
```bash
ffmpeg -i trilha.wav -af "lowpass=f=500:enable='between(t,10.2,11.0)',volume=0:enable='between(t,11.0,11.3)'" trilha_respiro.wav
```
(O `lowpass` com `enable` liga seco; para descer em rampa, faça 3 degraus: 4000, 1500 e 500 Hz em fatias de 0,25 s.)

Onde achar sons parecidos (sem baixar agora): Freesound com filtro "Creative Commons 0" e Pixabay (licença própria, não
CC0, uso comercial). Buscas: "tick click short", "camera shutter", "glitch digital", "whoosh short", "riser",
"reverse riser", "sub drop", "cinematic hit", "boom impact", "ui click", "game notification", "shimmer".
