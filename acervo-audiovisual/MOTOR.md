# Motor audiovisual único: a porta de entrada

Todo vídeo da Peformake e da Ellcazo começa aqui, de qualquer sessão, PC ou celular. Este arquivo não repete o
conhecimento: diz **em que ordem decidir** e **qual arquivo ou skill** responde cada passo. As skills continuam
separadas porque fazem trabalhos diferentes (roteirizar, editar, estudar referência), mas todas leem as mesmas fontes
abaixo. Nada aqui é regra fixa: é a ordem das perguntas e o repertório para responder com critério.

## Um código principal por camada
| Camada | Código principal | Onde | Apelidos antigos (mesma coisa) |
|---|---|---|---|
| Estrutura do vídeo (o esqueleto) | **S1–S117** | `ESTRUTURAS/S__.md` (gramática das 117; skill `estrutura-video`) · catálogo completo em `peformake-gestao/docs/ESTUDO-ROTEIRO-AUDIOVISUAL.md` §3c | M1–M49, H, V → ver `ESTRUTURAS/EQUIVALENCIAS.md` |
| Gancho (os 3 primeiros segundos) | **G1–G12** | `video-tools/estilos/estudo_narrativas.md` | §5 do ESTUDO-ROTEIRO |
| Linguagem de edição (como fica na tela) | **E1–E40** | `video-tools/estilos/catalogo_estilos.md` + `receitas_estilos.md` | técnicas T, R, V, EE, DC dos estudos de editor |
| Vídeo longo de YouTube | blocos com loop (MDD) | skill `roteiro-retencao` + `acervo-audiovisual/youtube/` | — |

Quando um documento antigo citar um M ou um H, traduza para o S pela tabela de equivalências e siga a página do S.

## Nota em cada etapa
Cada etapa abaixo termina com nota de 0 a 10 (`ESTRUTURAS/AVALIACAO.md`): a nota é o pior critério, não a média.
Abaixo do mínimo, volta (no máximo 2 vezes; depois segue com a lacuna escrita e pergunta ao Italo).

## A ordem (Reels, TikTok, Shorts, anúncio)
1. **Por quê.** Objetivo único do vídeo, público, frase-alma ("deve SENTIR ___ e ACREDITAR que ___"), ação final.
   → skill `roteiro-narrativa` §1 · MDD (`skills-locais/mdd/`).
2. **O que o cliente consegue gravar.** `ESTRUTURAS/FICHA-ENTRADA.md` (10 perguntas, guardadas na ficha do cliente em
   `video-tools/clientes/<cliente>.md`) e o nicho em `ESTRUTURAS/NICHOS.md` (35 nichos; qualquer outro entra pelo mais
   parecido). Tira da mesa o que ele não consegue fazer e o que o setor não permite.
3. **Qual estrutura (modo de escolha).** Skill `estrutura-video`, modo 1:
   `python acervo-audiovisual/ferramentas/escolher_estrutura.py --objetivo … --nicho … --cliente …` ranqueia as 117
   pelo objetivo, nicho, exigências, **placar** (`PLACAR-ESTRUTURAS.md`: repetir / neutro / testar / descansar /
   evitar), evidência real e variedade, com o porquê de cada ponto. A força de fora vem com o público do perfil de
   origem: força num perfil de editores não vale o mesmo para um negócio comum.
4. **Gramática + intenção.** Abrir `ESTRUTURAS/S__.md`: mecanismo, blocos em % da duração, obrigatório, o que muda, onde dá errado.
   Cada bloco ganha emoção e alavanca (neuromarketing, humor) pela `ESTRUTURAS/INTENCAO.md`: nenhum bloco sem porquê.
   As fichas em `virais/` são prova e inspiração, não molde para copiar.
5. **Roteiro.** Skill `roteiro-narrativa` (fala contínua, 3,3–3,5 palavras/s, virada a cada 15–20 s, fecho em círculo).
   No app: `peformake-gestao/docs/MOTOR-ROTEIRO.md` (pipeline M0–M10 e banca de 4 notas). Gravar `data.estrutura`
   **antes** de gravar, com a hipótese em 1 linha.
6. **Edição.** `video-tools/MANUAL_EDICAO.md` → estilo E (`estilos-edicao`), motion (`motion-pro`, HyperFrames,
   Remotion), som (`video-tools/estilos/sound_design.md`, `real-sfx`), entrega (`edicao-cliente`).
7. **Medir e devolver.** Com 7 dias no ar, linha no `PLACAR-ESTRUTURAS.md`; rodar o mapa. O motor aprende com o que
   funcionou nos nossos clientes.

## A ordem (YouTube longo)
1. Pauta e lacuna: `acervo-audiovisual/youtube/pesquisas/` (skill `youtube-outliers` / `varredura-nicho`).
2. Roteiro: skill `roteiro-retencao` (abertura de 30 s, macro loop, blocos que mudam o que o espectador sabe, auditoria
   MDD). Roteiros prontos em `acervo-audiovisual/youtube/roteiros/`.
3. Título e capa: `titulo-thumb-lab`. Cortes para Shorts: `shorts-do-longo`, que devolvem ao fluxo de Reels (passo 3
   acima, com a estrutura S de cada corte).
4. Edição e estudo de canais: `video-tools/estilos/estudo_youtube.md` (paper edit, montagem só de áudio, ofício
   documental) e `estudo_maestros_ia.md`.

## Como o motor cresce
O ciclo completo de auto-aprendizado (o que a rotina diária faz sozinha, em que ordem e o que passa pelo Italo) está em
`acervo-audiovisual/APRENDIZADO.md`. Resumo:
- **Vídeo novo que funcionou** → skill `engenharia-reversa-viral` → ficha em `virais/` → atualizar a gramática do S
  (`ESTRUTURAS/S__.md`, seção Variações e Evidência) → `python acervo-audiovisual/ferramentas/mapa_estruturas.py`.
- **Estrutura nova** (nenhum S serve) → ficha com "S-novo" → quando houver 2 exemplos, ganha código e página.
- **Vídeo nosso publicado** → placar → status do código muda sozinho no mapa.
- Tudo novo entra no Git no mesmo dia (regra do Italo, 19/11/2026).
