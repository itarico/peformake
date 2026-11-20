# Avaliação por etapa: nota em cada passo, e se não ficar bom, volta

Cada etapa do `MOTOR.md` termina com uma nota de 0 a 10. A nota de uma etapa é a **menor** nota dos critérios dela, e
não a média: um critério ruim não se esconde atrás dos bons. Abaixo do mínimo, a etapa **volta** (para ela mesma ou
para a etapa indicada) com o motivo em 1 linha. No máximo 2 voltas por etapa. Na terceira, o trabalho segue com a
lacuna escrita no card (`suposicao`) e a pergunta vai para o Italo. Toda nota vem com 1 linha de justificativa: nota sem
motivo não vale.

Quem avalia: a mesma sessão, relendo como crítico (não como autor). No app, a etapa 5 é a banca do
`peformake-gestao/docs/MOTOR-ROTEIRO.md`, que já tem 4 notas e o avaliador às cegas.

## Etapa 0 · Pesquisa: nunca do zero (mínimo 7)
| Critério | 10 é | Se falhar |
|---|---|---|
| Dossiê do cliente | atualizado no mês, com fonte em cada item (produto, preço, equipe, reputação, palavras do público) | completar o dossiê; o que faltar vira pergunta ao cliente |
| Assunto do momento | o radar do nicho foi olhado; a ideia diz se é do momento (com validade) ou perene | olhar o radar antes de seguir |
| Pergunta ou dor real | a ideia responde a uma pergunta ou dor real de quem compra (comentário, direct, briefing) | buscar a pergunta; sem ela, a ideia é suposição e fica marcada |
| Mercado | sabe o que os concorrentes estão mostrando (para não repetir e achar a lacuna) | varredura do nicho |
Abaixo de 7: não sai roteiro final; sai pré-roteiro de validação com as perguntas (igual ao portão 0b do motor do app).

## Etapa 1 · Por quê (mínimo 8)
| Critério | 10 é | Se falhar, volta para |
|---|---|---|
| Objetivo único | um só (alcance, seguidores, salvar, prova, lead ou venda) e mensurável | etapa 1 |
| Público concreto | dá para descrever 1 pessoa real que vai assistir | etapa 1 (ou pedir dado ao cliente) |
| Frase-alma | "deve SENTIR ___ e ACREDITAR que ___" sem palavra vaga | etapa 1 |
| Ação final | o que a pessoa faz depois, uma só | etapa 1 |

## Etapa 2 · O que o cliente consegue gravar (mínimo 8)
| Critério | 10 é | Se falhar |
|---|---|---|
| Ficha de entrada atual | respondida nos últimos 3 meses, sem "?" | perguntar ao cliente antes de seguir |
| Nicho e regras | nicho definido (`NICHOS.md`) e regras do conselho anotadas se regulado | etapa 2 |

## Etapa 3 · Escolha da estrutura (mínimo 7)
Use o `escolher_estrutura.py` (ou o mesmo raciocínio na mão) e dê nota à escolhida:
| Critério | 10 é | Se falhar, volta para |
|---|---|---|
| Serve ao objetivo | o objetivo e o funil da página batem com a etapa 1 | etapa 3 (outra estrutura) |
| O cliente consegue | todo o `exige` está "sim" na ficha de entrada | etapa 3 |
| Placar | não está em "descansar" nem "evitar" para este cliente (ou há motivo escrito) | etapa 3 |
| Variedade | não repete estrutura do mês (salvo série) | etapa 3 |
| Evidência | tem exemplo real ou é aposta declarada ("testar") | anotar como teste, não volta |

## Etapa 4 · Gramática aplicada (mínimo 8)
| Critério | 10 é | Se falhar, volta para |
|---|---|---|
| Blocos completos | cada bloco da página tem conteúdo do cliente | etapa 4 |
| Obrigatório cumprido | todos os itens de "Obrigatório" presentes | etapa 4 ou 3 (se o cliente não tem o ingrediente) |
| Longe do "dá errado" | nenhum modo de falha da página aconteceu | etapa 4 |
| De dentro (MDD) | caso, número, palavra e pessoa reais do cliente; passa na troca de logo | etapa 1 ou 4 |
| Intenção por bloco | cada bloco com emoção e alavanca (`INTENCAO.md` §3); o teste de intenção (§5) passa | etapa 4 |
| Humor (se houver) | um mecanismo H só, nascido da dor, produto resolve a piada; nota de humor ≥ 8 | etapa 4 |

## Etapa 5 · Roteiro (banca do motor)
As 4 notas da banca: criativa ≥ 8,5 (nenhum item < 7), fidelidade ≥ 9, autenticidade ≥ 8, conhecimento do cliente ≥ 7.
Abaixo: volta só à etapa que derrubou (gancho → 4, dado → 2, tom → 1).

## Etapa 6 · Edição (mínimo 8, no corte bruto 720p antes de finalizar)
| Critério | 10 é | Se falhar |
|---|---|---|
| Gancho sem som | os 3 primeiros segundos entendem-se mudos | refazer abertura |
| Imagem = fala | cada frase tem a imagem do que é dito | refazer B-roll |
| Ritmo | virada a cada 15–20 s; nada que possa sair sem fazer falta | cortar |
| Som | música abaixo da fala, SFX no evento, −14 LUFS | mixar de novo |
| Sem cara de IA | checklist de `video-tools/estilos/receitas_estilos.md` §4 | etapa 6 |
| Termina na frase que fecha | último quadro = última ideia | etapa 6 |

## Etapa 7 · Depois de publicado (não volta; ensina)
Com 7 dias no ar, linha no `PLACAR-ESTRUTURAS.md` com a força. Compare com a hipótese escrita no card: acertou, errou ou
não deu para saber. Esse aprendizado vai na coluna Nota do placar e muda o status do código.
