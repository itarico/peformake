# Placar de estruturas (nossos vídeos publicados)

O que fez o motor de roteiro aprender com o próprio resultado: cada Reel publicado de cliente entra aqui com o código S da
estrutura e a força (views ÷ mediana dos últimos 12 Reels do perfil do cliente na data da medição).
`acervo-audiovisual/ferramentas/mapa_estruturas.py` lê esta tabela e põe "nosso placar" em cada código do mapa;
o motor prefere o que deu certo aqui e evita o que falhou (3 ou mais vídeos abaixo de 0,7x).

Quem preenche: a rotina diária "Acervo: virais e placar" (lê `client_scan` fonte `perfis`), ou qualquer sessão que
publique/medir vídeo. Uma linha por vídeo; medir com pelo menos 7 dias no ar. Código pela ficha/roteiro do card
(`strategy_cards.data.estrutura`); sem card, classificar pela legenda e pelos quadros e marcar "(classificado)".

## Como o placar ensina (status por código, calculado pelo `mapa_estruturas.py`)
- **testar**: 0 ou 1 vídeo medido. Ainda não diz nada; vale tentar de novo com outro tema.
- **repetir**: 2 ou mais vídeos e média de 1,2x ou mais. Volta no mês seguinte com tema novo.
- **neutro**: média entre 0,7x e 1,2x. Usar quando o objetivo pede; não é prioridade.
- **descansar**: os 2 últimos vídeos do código no mesmo cliente em 0,7x ou menos. Fica 30 dias sem usar naquele cliente
  (fadiga de fórmula: o público já sabe o que vem). Volta com uma variação, não com o mesmo molde.
- **evitar**: 3 ou mais vídeos e média abaixo de 0,7x. Só volta com motivo escrito no card.
Cada cliente tem o seu status; a média geral (todos os clientes) aparece ao lado como referência.

## Para o placar valer (registro antes, não depois)
1. O código S vai no card **antes** de gravar (`strategy_cards.data.estrutura`), com a hipótese em 1 linha
   ("esquete vai trazer compartilhamento"). Classificar depois de publicado tende a encaixar o vídeo no que deu certo.
2. Vídeo sem código no card entra marcado "(classificado)" e conta, mas o mapa mostra quantos são assim.
3. Medir com 7 dias no ar ou mais, sempre contra a mediana dos últimos 12 Reels do próprio perfil.
4. Na nota: o que mudou além da estrutura (impulsionado, collab, trend, horário). Vídeo impulsionado não entra na média.

| Data | Cliente | Vídeo | Código | Views | Força | Nota |
|---|---|---|---|---|---|---|
| 2026-09-26 | VOVINA | https://www.instagram.com/reel/Ddw4ZTuPLiT/ | S70 | 1036 | 1,8x | esquete do motoboy "a pizza é boa mesmo?" (classificado) |
| 2026-10-31 | VOVINA | https://www.instagram.com/reel/DfLHHFBvKmX/ | S59 | 921 | 1,6x | novidade: cardápio digital (classificado) |
| 2026-10-22 | VOVINA | https://www.instagram.com/reel/Dezzn6hPvNZ/ | S112 | 733 | 1,3x | massa do zero ao pronto (classificado) |
| 2026-09-23 | VOVINA | https://www.instagram.com/reel/DdpSmqgPqo0/ | S84 | 675 | 1,2x | "sua quarta merece" (classificado) |
| 2026-11-08 | VOVINA | https://www.instagram.com/reel/DffflrmOomR/ | S52 | 644 | 1,1x | borda dourada não é queimada (classificado) |
| 2026-09-29 | VOVINA | https://www.instagram.com/reel/Dd4v2Ivv9nT/ | S22 | 585 | 1,0x | "testou a de mussarela?" (classificado) |
| 2026-10-19 | VOVINA | https://www.instagram.com/reel/DesOHVWvDNf/ | S50 | 575 | 1,0x | como a pizza é feita, passo a passo (classificado) |
| 2026-10-27 | VOVINA | https://www.instagram.com/reel/DfAzJl0vQO7/ | S69 | 410 | 0,7x | ingredientes selecionados (classificado) |
| 2026-11-06 | VOVINA | https://www.instagram.com/reel/DfaedhYhRvQ/ | S84 | 391 | 0,7x | "Sextou" (classificado) |
| 2026-11-10 | VOVINA | https://www.instagram.com/reel/DfkpcugPbEw/ | S84 | 339 | 0,6x | "Terçou" (classificado) |
| 2026-10-15 | VOVINA | https://www.instagram.com/reel/Deh4aAnPAHX/ | S84 | 311 | 0,5x | "Quintou" (classificado) |
| 2026-11-04 | VOVINA | https://www.instagram.com/reel/DfU8sQRB1nv/ | S83 | 295 | 0,5x | "uma pizza qualquer um faz" (classificado) |
