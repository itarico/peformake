# Panem: como a edição é feita (21/11/2026)

## Linha de produção
1. **Voz** (`montagem/voz_guia.py` agora; a voz do Italo depois): cada frase vira um tempo, e cada palavra tem o seu
   instante (`montagem/palavras.py`, Whisper alinhado pelo texto).
2. **Cenas** (`montagem/construir.py`): cada animação dispara na palavra dita. Texto grande só na palavra-chave.
   Movimento lento, só para levar o olho ao que a fala cita.
3. **Render** no OpenMotion (projeto HyperFrames importado por ZIP; vídeo sem som).
4. **Som** (`montagem/sonorizar.py`): voz + trilha por emoção (troca por bloco, abaixa sob a fala) + efeitos 15 ms antes
   do quadro, 0 a +6 dB sobre a trilha; silêncio antes do tiro de canhão. Mix a -14 LUFS.
5. **Premiere**: V1 cenas, V2 textos, V3 trechos e stills do filme (com alternativa), A1 voz, A2 trilha, A3 efeitos.

## Efeitos e onde entram
| Efeito | Como | Onde |
|---|---|---|
| Corte seco | padrão | quase tudo |
| Queima de película (film burn) | vídeo real de película queimando por cima, 0,5 a 1 s | passagem livro → Brasil em cada distrito; entrada da cartela de título; viradas de época |
| Match cut | a mesma forma continua no plano seguinte | círculo de Carajás no mapa → círculo na mina (satélite); pergaminho de Panem → mapa do Brasil; urna da colheita → urna da Capital; arena (raios da cornucópia) → rotas dos 12 distritos até a Capital |
| Flicker de projetor | 3 passos de opacidade em 0,25 s | toda entrada de still do filme |
| Textura | grão, papel real, poeira e fumaça discretas, luz de projetor | em todas as cenas, baixa |
| Colagem estilo Vox | fita adesiva no documento, círculo de giz, marca-texto sob o dado, caneta vermelha, recorte de foto | fichas dos distritos, números-âncora, clímax das 84 cidades |
| Datilografia | o texto do documento aparece letra a letra na palavra | ficha do tributo, fontes |
| Cartela em brasa | 3 palavras, a do meio fina | SE O BRASIL FOSSE PANEM, PÃO E CIRCO, 84 CIDADES = METADE |

Segurança: no máximo 3 flashes por segundo; nenhum flash branco cheio.
