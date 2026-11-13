---
name: motion-pro
description: Motion graphics, efeitos e composição nível After Effects SEM After Effects — por código, no kit Remotion "pro" da Performake (video-tools/remotion/src/pro). Títulos cinéticos, texto animado por letra, câmera 3D com profundidade de campo, glow, RGB split, turbulência, tremor/impacto, motion blur, traços que se desenham, rastreamento de objeto, texto atrás da pessoa, fundos GLSL (neblina, raios de luz, gradiente vivo, film burn), CTA 3D, legendas e transições na identidade de cada cliente. Use quando pedirem "anima", "motion", "efeito", "abertura", "vinheta", "título", "texto atrás da pessoa", "segue o objeto", "estilo After Effects", "deixa mais profissional/premium", "parallax", "3D", "glow", "transição" ou citarem uma referência de motion.
---

# Motion nível After Effects, por código

O Italo NÃO quer instalar o After Effects. Tudo sai do kit `video-tools/remotion/src/pro/` (Remotion
4.0.541 + filtros SVG + WebGL/GLSL + three.js) e de dois scripts Python locais. Entrada própria:
`src/pro/index.ts` (não mexer no `src/Root.tsx` das sessões de cliente).

## Padrão da casa: GRAFISMO MÍNIMO E ELEGANTE (lição da Menudo, 07/11/2026)
A edição da Menudo foi reprovada por **excesso de grafismo e falta de narrativa**. O kit existe para
acabamento, não para enfeitar. Antes de qualquer efeito, a história tem de funcionar só com o corte.
- Padrão de um vídeo: **logo discreto + legenda limpa (`LegendaPro`) + transições motivadas** (no
  máximo 2–3 no vídeo todo, cada uma justificada por mudança de assunto/lugar/tempo). Título cinético só
  no gancho, se o roteiro pedir. CTA só no fim.
- Glow, RGB split, tremor, shaders, câmera 2,5D e traços: **exceção**, um por vídeo no máximo, e só quando
  servem à história (ex.: sublinhar o número que o político cita). Na dúvida, não use.
- Grão/vinheta: leve (opacidade baixa) ou nada. Nunca cubra rosto nem dispute atenção com quem fala.
- A `Pro-Vitrine` é demonstração de capacidade técnica, NÃO o padrão de entrega.

## Regra de estilo (sempre)
1. **Identidade do cliente manda**: cores, fonte, itálico, grão vêm de `src/pro/marca.ts` (`cliente: disalp | mf |
   mfBlack | tlm`). Leia `video-tools/clientes/<cliente>.md` e `_estilo_referencias.md` antes de animar.
   Cliente novo → acrescente a marca em `marca.ts`.
2. **Centralizado, sem cobrir rosto**: título no centro só em tela sem pessoa; com pessoa falando, `posicaoY ≈ 0.72`.
3. **Sem cara de site**: nada de caixas arredondadas chapadas, sombras de card, ícones genéricos. Profundidade,
   textura, luz e movimento de câmera é que dão o acabamento.
4. **Movimento**: nada linear; entrada rápida que assenta devagar (`expoOut`, molas de `anim.ts`); saída mais
   rápida que a entrada; câmera NUNCA parada (push-in lento); no máximo 1 efeito "chamativo" a cada ~8 s.
5. **Som**: cada impacto/transição pede SFX (skill `sound-effects`).

## Tabela After Effects → kit
| No After Effects | No kit (arquivo) | Uso |
|---|---|---|
| Keyframes + Graph Editor | `chaves(frame, [[f, valor, curva]...])` (`fx/camera.tsx`), `MOLA`, `expoOut/expoIn` (`anim.ts`) | qualquer propriedade |
| Expressão `wiggle()` | `wiggle()` e `<Tremor freq amp rot zoom forca>` (`fx/efeitos.tsx`) | câmera na mão, tremor |
| Shake de impacto | `impacto(frame, emFrame, dur)` × `<Tremor forca>` | batida, "boom" |
| Glow | `<Brilho raio intensidade limiar cor>` | palavra-chave, logo, neon |
| RGB Split / Chromatic Aberration | `<Aberracao deslocamento angulo>` | impacto, glitch sutil, transição |
| Turbulent Displace | `<Turbulencia quantidade tamanho velocidade>` | texto "vivo", fumaça, calor |
| Pixel Motion Blur / Motion Blur | `<DesfoqueMov amostras obturador>` (`@remotion/motion-blur`) | whip, textos rápidos (pesado: só onde precisa) |
| Câmera 3D + camadas 3D + DOF | `<Cena3D camera={{x,y,z,rotX,rotY,foco,abertura}}>` + `<Camada z escalaFixa>` + `useMovimento("dolly"\|"orbita"\|"pan"\|"respirar")` | parallax de fotos recortadas, rack focus, "documentário" |
| Text Animator (range selector) | `<AnimadorTexto texto por="letra"\|"palavra" ordem="centro"... de={{y,rotX,blur,escala,tracking,opacidade}} saida>` (`fx/texto.tsx`) | títulos por letra |
| Shape Layer + Trim Paths | `<TracoAnimado forma="circulo"\|"seta"\|"sublinhado"\|"moldura"\|"check" d=...>` (`fx/traco.tsx`) | marcar produto, sublinhar |
| Tracker (track point) | `scripts/rastrear.py` → `public/tracks/x.json` → `<SeguirPonto arquivo dx dy>` (`fx/composicao.tsx`) | etiqueta/seta colada na máquina |
| Rotoscopia + track matte | `scripts/recortar.py fundo` (pessoa com alpha) → `<TextoAtrasDaPessoa video pessoa>` | título entre o fundo e a pessoa |
| Fractal Noise / CC Light Rays / gradiente / Film Burn | `<ShaderCamada tipo="neblina"\|"raios"\|"gradiente"\|"queimado" intensidade modo>` (`fx/shader.tsx`, GLSL) | atmosfera, fundos de cartela, transição orgânica |
| Lottie/Bodymovin | `<LottiePro arquivo tingir>` | ícones animados do LottieFiles na cor da marca |
| Templates prontos | `TituloCinetico`, `LegendaPro`, `LowerThirdPro`, `TransicaoWipe/Whip/LightLeak`, `CTA3D` (three.js), `GrainOverlay` | peças de linha |
| Composição completa | `Vitrine.tsx` (`Pro-Vitrine`) | exemplo de como empilhar tudo |

## Fluxo
1. Entenda a intenção do vídeo e o cliente (fichas). Defina 1 gancho, ritmo, onde entram título/legenda/CTA.
2. **Peças soltas para o Premiere** (padrão da casa): renderize cada peça em ProRes 4444 com alpha e coloque em
   trilha própria no XML — `bash video-tools/remotion/render-pro.sh <ID> <saida.mov> --props='{...}'`.
3. **Peça completa com o vídeo dentro** (abertura, "texto atrás da pessoa", rastreio): crie uma composição nova
   em `src/pro/` usando `VideoBase`, `TextoAtrasDaPessoa`, `SeguirPonto`; render em MP4 (`--codec=h264 --crf=16`).
   Mídia vai em `remotion/public/` (cópia leve ou proxy 1080p; nunca o bruto 4K).
4. **Confira antes de entregar**: `npx remotion still src/pro/index.ts <ID> quadro.png --frame=N --gl=angle`
   em 3–5 quadros-chave (entrada, meio, impacto, saída) e OLHE (Read). Procure: texto cortado, rosto coberto,
   cor fora da marca, serrilhado, quadro vazio no começo/fim.
5. Para ajustar ao vivo: `npx remotion studio src/pro/index.ts`.

## Rastrear um objeto
```bash
bash video-tools/bin/vpy video-tools/scripts/rastrear.py clipe.mp4 --caixa 0.40,0.52,0.18,0.12 --inicio 2.0 --fim 6.0 --previa previa.mp4 -o video-tools/remotion/public/tracks/furadeira.json
```
`--caixa` = x,y,largura,altura do objeto em fração da tela no quadro `--inicio`. Abra a `previa.mp4` (caixa verde
= rastreio bom, vermelha = perdido). Superfícies lisas/sem textura rastreiam mal: escolha uma área com detalhe.

## Limites honestos (o que ainda é melhor no AE/Blender)
- Partículas 3D complexas, simulação física, rotoscopia fina de cabelo, 3D com fonte extrudada da marca
  (precisa converter a fonte para typeface.json), plugins tipo Element 3D/Saber. Para shaders aplicados SOBRE o
  vídeo (distorção do próprio vídeo), use os filtros SVG (`Turbulencia`, `Aberracao`) — o GLSL do kit gera
  camadas, não processa a imagem do vídeo.
- PC com 8 GB e MX230: `--concurrency=1`, `DesfoqueMov` com 6–8 amostras, e nunca renderizar junto com outra sessão.
