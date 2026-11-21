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

### Segunda leva de referências (21/11/2026)
| Peça | Referência (só a mecânica) | Onde |
|---|---|---|
| Cartaz em 2 tons com slogan em par ("X É Y") | pôster do Ministério da Verdade (1984) | viradas: "PÃO É ORDEM · CIRCO É PAZ" |
| Cartaz art déco com fileira de figuras repetidas, raios e faixa de título | "Protect the Capitol" (de fã) | V2, DIP 1939: fileiras de rádios iguais, "OUÇA A HORA DO BRASIL" |
| Título de distrito art déco: número enorme e silhueta industrial real embaixo | "District 12 Resist" (de fã) | cartela de cada distrito (sem a saudação de 3 dedos, que é símbolo da franquia) |
| Parede de telas | sala de vigilância | V3, TV de 1970: a mesma imagem em dezenas de TVs, uma por casa |
| Névoa com luz vermelha por trás e silhuetas | Pacificadores com faixas vermelhas | clima da Capital nas viradas (só luz e névoa, sem soldado nem arma) |
| Retrato com produto + número em bloco vermelho + saudação | cartaz do Distrito 3 | confirma o molde do cartaz por distrito |
| Mapa 3D azul com anéis de HUD | banco de imagem | **não usar**: é exatamente o visual genérico que lê como IA. Fica só a ideia de extrusão no holograma do sorteio, na nossa paleta |

### Terceira leva: linguagem (Italo, 21/11/2026)
- **Foto de arquivo:** P&B de alto contraste, preto fechado e grão (referência: corredor noir). Fotos de época sempre assim.
- **Folha de contato vermelha:** tira de filme com números de borda (21, 21A, 22), tarja preta em rosto e círculo de giz
  no quadro que importa. Usar quando a fala "vai atrás" de algo (Carajás, "fui atrás da conta", as 84 cidades).
- **Película:** borda de filme com perfuração e queima laranja/vermelha como passagem entre arquivo e presente.
- **Atmosfera:** fumaça, poeira, sombra, luz vermelha pontual e grão. Sempre discretas, sem competir com a imagem.
- **Câmera:** zoom lento, aproximação em detalhe, panorâmica em foto, parallax discreto em imagem parada.
- **Transições:** corte seco (padrão), flicker de projetor, falha analógica, interferência de transmissão, passagem por
  imagem de arquivo.
- **Sobreposições:** timecode, número de arquivo, legenda documental, marcação geográfica, informação de contexto pequena.

## Nunca
- Tordo, logos, pôsteres, fontes e slogans oficiais; atores; frames do filme fora dos até 8 trechos de 5 s do trailer
  (faixa V3, com alternativa pronta, em `creditos-trechos.csv`).
- Documento inventado como se fosse oficial do cânone: marcar "visualização editorial".
- HUD futurista, glitch ou partícula sem função; vermelho em todo título.
