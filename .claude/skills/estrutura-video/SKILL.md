---
name: estrutura-video
description: Motor de estruturas de vídeo da Peformake/Ellcazo para qualquer nicho. Escolhe a melhor estrutura (S1–S117) para um vídeo pelo objetivo, pelo nicho, pelo que o cliente consegue gravar e pelo placar dos vídeos já publicados; abre a gramática da estrutura (mecanismo, blocos em % da duração, obrigatório, onde dá errado); aplica no conteúdo do cliente e dá nota em cada etapa, voltando quando não fica bom. Use quando pedirem "qual estrutura usar", "escolhe o formato", "que tipo de vídeo fazer", "estrutura de vídeo", "esqueleto do roteiro", "monta o mês de vídeos", "esse vídeo em qual estrutura", ou antes de escrever qualquer roteiro de Reels, TikTok, Shorts ou anúncio. Para YouTube longo, encaminha para roteiro-retencao.
---

# Estrutura de vídeo (motor único)

Porta de entrada geral: `acervo-audiovisual/MOTOR.md`. Esta skill cobre as etapas 2 a 4 do motor (o que o cliente
consegue, qual estrutura, gramática aplicada) e chama a avaliação de cada etapa. Nada é regra fixa: o ranking e as
páginas são repertório e ponto de partida; a decisão final tem um porquê escrito.

**Por que uma skill só, e não uma por estrutura:** cada skill instalada ocupa espaço em toda conversa, e 117 skills
quase iguais competiriam entre si para disparar. Aqui cada estrutura é uma página (`ESTRUTURAS/S__.md`) que só é aberta
quando escolhida: funciona como uma skill por estrutura, sem o custo.

## Arquivos
- `acervo-audiovisual/ESTRUTURAS/S1.md` … `S117.md`: a gramática de cada estrutura. As que têm `evidencia: catálogo`
  ainda não têm vídeo real estudado (são aposta; marcar "testar").
- `ESTRUTURAS/FICHA-ENTRADA.md`: as 10 perguntas do que o cliente consegue gravar (guardadas em
  `video-tools/clientes/<cliente>.md`, bloco "Entrada do motor").
- `ESTRUTURAS/NICHOS.md`: 35 nichos com o que costumam ter, regulação, estruturas que rendem e cuidados. Nicho novo:
  escolher o mais parecido e acrescentar uma linha.
- `ESTRUTURAS/INTENCAO.md`: emoção e alavanca de cada bloco (neuromarketing, humor H1–H14), teste de intenção.
- `ESTRUTURAS/AVALIACAO.md`: nota por etapa, mínimo, para onde volta.
- `ESTRUTURAS/EQUIVALENCIAS.md`: M, H, V, G, E → S (documento antigo citou M18? é o S5).
- `PLACAR-ESTRUTURAS.md`: resultado dos nossos vídeos publicados e o status por código e cliente.
- `MAPA-ESTRUTURAS.md`: visão geral (por objetivo, por exigência, os mais fortes com o público de origem).

## Modo 1 · Escolher a melhor estrutura
1. Junte: objetivo do vídeo (etapa 1 do motor), nicho, ficha de entrada do cliente, estruturas usadas no mês.
2. Rode:
   ```
   python acervo-audiovisual/ferramentas/escolher_estrutura.py --objetivo <alcance|seguidores|salvar|autoridade|prova|conversao|lead|comentario|conexao> \
          --nicho <chave do NICHOS.md> --cliente <NOME> [--tem fala,local,...] [--regulado] [--usadas S70,S84] [--top 8]
   ```
   Sem Python à mão (celular, nuvem sem repo): faça o mesmo raciocínio pelas tabelas "Por exigência" e "Nosso placar"
   do `MAPA-ESTRUTURAS.md` e pela linha do nicho em `NICHOS.md`.
3. Leia as 3 primeiras páginas sugeridas. Escolha uma pelo que a história do cliente pede (não só pela pontuação) e
   escreva o porquê em 1 linha. Dê a nota da **etapa 3** (`AVALIACAO.md`). Abaixo de 7, escolha outra.
4. Ao montar o mês: pelo menos 1 estrutura nova para o cliente, nenhuma repetida (salvo série), e nada em "descansar".

## Modo 2 · Aplicar a gramática
1. Abra `ESTRUTURAS/S__.md`. Preencha cada bloco com o conteúdo **real** do cliente (MDD: caso, número, palavra,
   pessoa). Os colchetes de "O que muda de cliente para cliente" são o roteiro do que perguntar ao cliente.
2. Dê a cada bloco uma linha de intenção (`ESTRUTURAS/INTENCAO.md`: emoção · alavanca · como aparece na tela);
   com humor, um mecanismo H só. Confira "Obrigatório" e "Dá errado quando". Nota da **etapa 4**. Abaixo de 8, volte.
3. Siga para o roteiro (skill `roteiro-narrativa`; no app, o motor M0–M10 com a banca). Grave `data.estrutura` com o
   código e a hipótese ("esta estrutura vai trazer ___") **antes** de gravar.

## Modo 3 · Classificar um vídeo que já existe
Leia o vídeo (ou a ficha), compare com os blocos das páginas mais próximas e diga o código. Se nenhum serve, é um
S-novo: ficha pela skill `engenharia-reversa-viral`.

## Manter vivo
- Ficha nova de vídeo viral → atualizar a página do S (Evidência e Variações) → `python acervo-audiovisual/ferramentas/mapa_estruturas.py`.
- Vídeo nosso publicado → linha no placar (7 dias no ar) → rodar o mapa.
- Página de catálogo que ganhou o primeiro vídeo real → tirar `evidencia: catálogo` e reescrever as Variações como vistas.
- Tudo no Git no mesmo dia.
