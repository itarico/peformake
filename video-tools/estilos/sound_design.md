# Sound design — efeitos sonoros que fazem a edição "parecer cara"

Estudado em 08/11/2026 a partir das referências do Italo:
- **Jay Bendon** `Db_BY95IzKn` — "sound effects BREAKDOWN" (17 s): mostra, corte por corte, qual som entrou.
- **Helal | Video Editing** (@helalwork, 7 posts) — `Dc1AHDotwvU` "Comment – SFX: essential SFX for UI designs",
  `DZPtuwvtwrs` antes/depois de anúncio (porta, objeto recortado, lupa, texto animado; timeline do After Effects).
- **eslam sayed** `DaHkdemNr5S`.
Arquivos em `D:\PEFORMAKE\REFERENCIAS\_estilos\Instagram\<autor>\<id>\` (`sequencia_densa.jpg`, `video.mp4`).

## O princípio
**Todo evento visual tem um som** — e o som descreve o **tipo** de movimento. Sem isso, motion parece "slide";
com isso, parece físico. Mas o volume é baixo (sente-se, não se nota) e a música abre espaço.

## Dicionário ação → som (do breakdown do Jay Bendon)
| Ação na tela | Som |
|---|---|
| Palavra/texto aparece (pop) | **tap** curto (1 por palavra; "tap ×4" quando entram 4 palavras) |
| Colagem/mosaico montando, tela enchendo | **charge com taps** (subida + toques no ritmo das entradas) |
| Corte para foto/plano parado, "congelou" | **shutter** (obturador de câmera) |
| Câmera se move / transição com movimento | **swoosh** (whoosh) — duração = duração do movimento |
| Tensão antes de revelar | **charge com swoosh** (sobe e solta na revelação) |
| Luz piscando, troca rápida de planos, glitch | **flicker** (v1/v3) / **flash flicker** |
| Sequência de fotos/cliques | **shutter clicks** em sequência |
| Objeto tocado, detalhe, comida, objeto pequeno | **click ×2** |
| Interface, celular, tela, número | **digital** (bip/UI) |

## Interface (Helal "Comment – SFX for UI")
Elementos de UI (cards, pílulas de áudio, botões, cursor/playhead) entram cada um com um **som de UI** curto e
diferente conforme a ação: aparecer (pop), deslizar (swipe), clicar (click), digitar (keys), notificação (ding),
alternar (toggle). Ritmo regular, como "trilho" sob a música.

## Anúncio com objeto recortado (Helal antes/depois, `DZPtuwvtwrs`)
Fundo branco com sombra de luz de janela, objeto real recortado (porta) que muda de estado, lupa que revela o
defeito (cupim), pessoa recortada reagindo, texto que entra palavra por palavra, comparação de produtos lado a
lado, relógio para "prazo", equipe de pé para "serviço", logo no fim. O **antes** era só voz + música; o
**depois** tem um som para cada entrada/troca — é isso que ele vende ("where the magic happens").

## Regras práticas (para nós)
1. Fazer a lista de **eventos** (cada entrada de texto, troca de objeto, corte, movimento de câmera) → escolher o
   som pelo dicionário acima. Usar a skill `sound-effects` (biblioteca CC0 + mixagem medida).
2. Som **começa 1–2 frames antes** do evento visual (o ouvido antecipa); whoosh centrado no meio do movimento.
3. Nível: SFX −18 a −24 LUFS (curtos), voz manda; música −6 dB sob a voz e **abaixa 2–3 dB** nos momentos de SFX.
4. Não repetir o mesmo arquivo em sequência (variações v1/v2/v3 ou pitch ±1–2 semitons).
5. Silêncio também é efeito: tirar a música 0,3–0,5 s antes da frase mais forte.
6. Material real (evento, depoimento): SFX só no motion/legendas, nunca por cima de fala.

## Ferramentas instaladas (10/11/2026 — do reel do Fabiano Carvalho `DfiChDoim6H`)
O Claude não escuta; estas três resolvem isso (todas grátis e locais, código revisado antes):
1. **Openverse** — `video-tools/scripts/openverse_audio.py buscar "whoosh" --comercial --max-s 4` e
   `baixar <id> --pasta <projeto>/sons`: busca direta na API pública (sem servidor de terceiros); grava
   `.licenca.txt` ao lado de cada som (CC0 ou BY; BY exige crédito na legenda).
2. **Earshot** (Leon Lin, MIT) — "ouvidos" do Claude: descreve um som, compara candidatos, acha onde falta som
   num vídeo, diz se soa sintético e até gera sons. Instalado em `D:\PEFORMAKE\_ferramentas\earshot\.venv`
   (MCP `earshot`). 1º uso baixa ~1,1 GB de modelos; roda na CPU (pesado no PC de 8 GB — usar sozinho).
3. **Real SFX** (Clipwing, scripts MIT, sons UI CC0) — skill `real-sfx` em `~/.claude/skills/real-sfx`: assiste o
   vídeo, acha cada momento que pede som (pop na entrada, whoosh no corte), escolhe sons REAIS da nossa biblioteca
   (109 sons em `~/.claude/skills/sound-effects/sfx` + 78 UI) e põe no quadro exato, preservando música e voz;
   entrega MP4 novo + trilha de SFX separada. Precisa de FFmpeg no PATH (no Git Bash: exportar a pasta do Gyan).
Fluxo: Real SFX propõe as deixas → Earshot confere se cada som combina → Openverse completa o que faltar.
