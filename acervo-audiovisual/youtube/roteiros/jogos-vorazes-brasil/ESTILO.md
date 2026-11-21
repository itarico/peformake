# Panem: guia de estilo (fechado com o Italo em 21/11/2026)

Base: manual "Arquivos de Panem" (`identidade-arquivos-de-panem/`). Paleta carvão #111315, concreto #35383A, sangue #A51E25
(só ~5 % da tela, com significado), papel #C2B79F, marfim #E6E2D9; brasa (vermelho → laranja → amarelo) só nas cartelas.
Títulos Anton; texto IBM Plex Sans; metadados IBM Plex Mono. Corte seco é o padrão; zoom lento em foto e documento.

## Por que mudou (retorno do Italo)
A 1ª versão ("propaganda da Capital": vetor liso, fundo preto, HUD de jogo) "está muito visível que foi feito com IA".
O que entregava: tudo chapado sem material real; a fórmula repetida "número gigante à esquerda + gráfico à direita";
rótulos mono espaçados em toda tela; ícones de clip-art. Regra daqui para frente: **toda tela tem um material real**
(foto, relevo, papel, impressão) e o gráfico só existe para explicar.

## As peças e onde entram
| Peça | Referência (só a mecânica) | Onde | Script de amostra |
|---|---|---|---|
| Mapa investigativo: relevo real em cinza, estados em traço fino, distrito em vermelho translúcido, círculo de chamada, painéis com barras | Border Forensics | espinha dos 12 distritos; o mapa cresce | `montagem/estilo_v4.py` |
| Foto real em P&B ou fria com texto grande por cima, no tempo da palavra | Godard, *Histoire(s) du cinéma* | número-âncora de cada distrito | `montagem/estilo_v3.py` (distrito) |
| Ficha do tributo como documento físico (papel, carimbo, tarja) | documentos "desclassificados" na mesa | refrão de cada distrito | `montagem/estilo_v3.py` (ficha) |
| Cartaz da Capital por distrito: retrato real de trabalhador, produto atrás, número em bloco vermelho, ícone e saudação nossos | cartazes de distrito da Capital | abertura de cada distrito (e Shorts) | a fazer |
| Cartaz de propaganda em 2 cores (vermelho e creme), retrato retinado, slogan repetido | "Hunger for…" | viradas V1 a V3 (Roma, rádio 1939, TV 1970) | a fazer |
| Cartela de 3 palavras em brasa, a do meio fina | "Louder than guns" | frases-chave: SE O BRASIL FOSSE PANEM, PÃO E CIRCO, 84 CIDADES = METADE | `estilo-v5/cartela.html` |
| Brasil de cima no escuro, cidades como brasas | plano zenital noturno com focos de fogo | clímax: 84 cidades = metade do PIB | `montagem/estilo_brasas.py` |
| Pergaminho de Panem que se dissolve no mapa do Brasil | mapa de Panem sépia (de fã) | bloco 1, "agora vamos montar o mapa" | a fazer |
| Mesa de holograma com "sinais vitais do tributo" | sala de controle dos Idealizadores | só no sorteio (frase 3) | a fazer |
| Cartaz construtivista: raios, bandeira, multidão com faixas em português | "Rise against the Capitol" (de fã) | final, "o espelho" | a fazer |

## Nunca
- Tordo, logos, pôsteres, fontes e slogans oficiais; atores; frames do filme fora dos até 8 trechos de 5 s do trailer
  (faixa V3, com alternativa pronta, em `creditos-trechos.csv`).
- Documento inventado como se fosse oficial do cânone: marcar "visualização editorial".
- HUD futurista, glitch ou partícula sem função; vermelho em todo título.
