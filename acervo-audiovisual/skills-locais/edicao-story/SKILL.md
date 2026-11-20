---
name: edicao-story
description: Edita vídeos no "Estilo Story" da Peformake (storytelling documental narrado; cada frase vira cena cinematográfica com imagens de IA, mesa vista de cima, mãos em quadro, jornais e objetos de prova, tipografia de cartaz, câmera 2.5D). Use quando o Italo pedir "estilo Story", "vídeo de história", "storytelling", "documentário curto", "curiosidade narrada" ou citar as referências EarnEdits.
---

# Estilo Story

Pasta do editor: `D:\ITALO\CLAUDE\SHOPPE\editor` (README, `ferramentas\FERRAMENTAS.md`).

1. Leia o guia: `D:\ITALO\CLAUDE\SHOPPE\editor\estilos\story\GUIA.md`.
2. Para rever o visual, abra `D:\ITALO\CLAUDE\SHOPPE\editor\estilos\story\referencias\sheet1.jpg` a `sheet21.jpg`. As transcrições ficam em `refN\transcricao.txt`.
3. Comece pelo roteiro: gancho paradoxal, âncora de tempo e personagem, virada, número, ponte para a oferta e CTA. Uma ideia por frase.
4. Use as ferramentas da tabela em `FERRAMENTAS.md`: imagens de IA por cena, `recortar_imagem.py`, `profundidade.py`, Remotion com câmera 2.5D. Siga `remotion-best-practices`. Para direção, use também `motion-art-direction`, `shot-composition` e `beat-sync-editing`.

## Fluxo de produção (sempre nesta ordem)

1. Roteiro aprovado e referências visuais, cores e fontes da história.
2. Mostrar um **storyboard visual** (uma imagem por cena, com o texto da narração) e aprovar com o Italo **antes** de montar o vídeo inteiro.
3. Montar e renderizar **já separado em camadas** (`layers.tsx`) para o Italo poder abrir no Premiere. A entrega final é o MP4 e a pasta `out/premiere` com camadas, sons e `timeline.xml`. Ver `D:\ITALO\CLAUDE\SHOPPE\editor\ferramentas\premiere\PREMIERE.md`.
4. **Efeitos sonoros sincronizados** com cada objeto, corte e palavra (skill `audio-video`).

## Regras do Italo

- **Base, não molde.** Nunca copiar uma cena de referência; criar composição própria para cada história e cliente.
- Premium e sem cara de IA na tipografia e no movimento: sem quique, sem legenda neon, uma ideia por tela.
- Dados com fonte e período certos. O que for estimativa aparece como estimativa.
- Nunca cortar a fala: cortes por `ffmpeg silencedetect` + tempo de palavra do Whisper.
- Tráfego é acelerador, nunca vilão.
- Quando o Italo mandar referências dizendo "só vá aprendendo", estudar e registrar no guia sem editar vídeo nenhum.
