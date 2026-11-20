---
name: edicao-motion
description: Edita Reels no "Estilo Motion" da Peformake (talking head + motion design premium, pessoa recortada com texto atrás, objetos 3D, tipografia gigante, transições com forma). Use quando o Italo pedir "estilo Motion", "edição premium", "editar como as referências", ou editar depoimento/vídeo de especialista com animações.
---

# Estilo Motion

Pasta do editor: `D:\ITALO\CLAUDE\SHOPPE\editor` (README, `ferramentas\FERRAMENTAS.md`, `estilos\motion\`).

1. Leia o guia completo: `D:\ITALO\CLAUDE\SHOPPE\editor\estilos\motion\GUIA.md`.
2. Se precisar rever o visual, abra as folhas de quadros em `D:\ITALO\CLAUDE\SHOPPE\editor\estilos\motion\referencias\sheet1.jpg` a `sheet18.jpg`. A **ref7 (`sheet7.jpg`) é a prioritária** (ref11 a ref14 são do mesmo editor; ref14 é o roteiro de venda com cases) para o Italo: composição de pôster, cards de vidro com aura, P&B + uma cor, transições de luz.
   - Padrão mais repetido: lockup de texto em 3 camadas (linha pequena em sans + palavra enorme condensada atrás da pessoa + palavra em script cruzando, em outra cor).
   - Fórmula "Raw → Edited": balão de comentário como gancho, whip ou flash, fundo reiluminado e lockup.
3. Assista o material bruto com a skill `ler-video` antes de editar.
4. Monte em Remotion. Use `D:\ITALO\CLAUDE\SHOPPE\video-cassia` como base (theme.ts, ui.tsx, Shot.tsx com miniatura, legenda premium e cortes por pausa real). Siga a skill `remotion-best-practices`.

## Fluxo de produção (sempre nesta ordem)

0. **Etapa 1, corte, separada do motion.** Com bruto de fala, faça primeiro só o corte com a skill `video-use` e o guia `D:\ITALO\CLAUDE\SHOPPE\editor\ferramentas\CORTE.md` (transcrição local, corte em fronteira de palavra, fade de 30 ms, conferência de cada corte). Mostre o corte cru e espere a aprovação do Italo. Só então comece os passos abaixo, sem mudar os tempos do corte aprovado.
1. Juntar referências visuais, cores e fontes (identidade da Peformake ou do cliente).
2. Mostrar um **storyboard visual** (quadros-chave renderizados como imagens) e aprovar com o Italo **antes** de montar o vídeo inteiro.
3. Montar e renderizar **já separado em camadas** (`layers.tsx`) para o Italo poder abrir no Premiere. A entrega final é o MP4 e a pasta `out/premiere` com camadas, sons e `timeline.xml`. Ver `D:\ITALO\CLAUDE\SHOPPE\editor\ferramentas\premiere\PREMIERE.md`.
4. **Efeitos sonoros sincronizados** com cada entrada e corte (skill `audio-video`).

Prompts de estilos curtos de 8s (showreel, ASCII, pixel art, linha única): `D:\ITALO\CLAUDE\SHOPPE\editor\prompts\janustiu-7-motion-styles\PROMPTS.md`.

## Regras do Italo (não negociáveis)

- **Base, não molde.** As referências ensinam a estética. Nunca copiar um layout de referência; criar composição própria para cada vídeo e cliente, misturando técnicas e inventando variações.
- Premium e sem cara de IA: sem gradiente em texto, sem brilho em tudo, sem quique, sem legenda neon.
- Um número ou ideia por tela. Na dúvida, tire.
- Nunca cortar a última palavra: achar os cortes com `ffmpeg silencedetect`, não só pelo Whisper.
- Dados com período certo (ex.: "em 5 meses") e simulação sempre rotulada como simulação.
- Identidade Peformake: `#090E1A`, `#1A2033`, `#3C83F6`, `#00C0C7`; Plus Jakarta Sans + Inter; logo `logo-white.png`.
- Tráfego é acelerador, nunca vilão.
- Música o Italo coloca depois, a menos que mande o arquivo.
- **Vídeo narrado: nunca mostrar pessoa falando para a câmera.** Se a boca mexe e a voz é outra, fica estranho. Priorizar cenas de alguém demonstrando ou usando o produto, mãos trabalhando, fachada, localização e drone. Pessoa só aparece fazendo algo, nunca falando.
- Material da MF e de outros clientes: além do Drive, procurar na pasta local de jobs do HD (`Jobs 2026`, uma pasta por mês, com subpastas do cliente e vídeos de drone).

## Antes de começar um vídeo novo

Confira na tabela "Ferramentas" do guia o que ainda falta instalar para o efeito pedido (recorte da pessoa, 3D, transições) e avise o Italo.
