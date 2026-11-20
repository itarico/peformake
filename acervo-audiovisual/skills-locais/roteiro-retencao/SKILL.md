---
name: roteiro-retencao
description: Escreve roteiro de vídeo para YouTube (longo de 8 a 60 min, ou Short) feito para segurar o espectador até o fim, usando o Método De Dentro (MDD). Cobre pauta com fontes, tese, abertura dos 30 primeiros segundos, blocos com loops e transições, fala natural para narrar ou apresentar, roteiro técnico (imagem, som, grafismo, prova), auditoria MDD e cortes para Shorts. Use quando o usuário pedir roteiro para YouTube, vídeo longo, documentário, vídeo de curiosidade ou história, "roteiro que segura", retenção, "transforma essa pauta em vídeo", narração para canal dark/faceless, ou depois de rodar youtube-outliers.
---

# Roteiro de retenção (YouTube, MDD)

Base: `D:\ITALO\CLAUDE\SHOPPE\canal-youtube\MDD-manual-v2.md`. Leia os Módulos 01 a 10 na primeira vez da sessão. Esta skill aplica o manual ao YouTube; o manual manda em caso de dúvida.
Saída: `D:\ITALO\CLAUDE\SHOPPE\canal-youtube\roteiros\<slug>-<AAAA-MM-DD>.md`
Molde do arquivo: `references/molde-roteiro.md`.

## Por que retenção é o centro

O YouTube distribui o que o público assiste e escolhe. O clique (título e thumb) traz a pessoa; a retenção decide se o vídeo continua sendo mostrado. Cada bloco do roteiro precisa mudar o que o espectador sabe e deixar um motivo para o próximo (Unidade de Progressão, Módulo 01). Um bloco que pode sair sem fazer falta é onde a curva cai.

## Entrada

Uma pauta: do `MAPA.md` da `youtube-outliers` ou do usuário. Se faltar, pergunte em uma linha: tema, formato (narrado sem rosto | apresentador | entrevista), duração alvo e público. Sem resposta, assuma narrado sem rosto, 12 a 17 min.
Linha editorial do canal: `D:\ITALO\CLAUDE\SHOPPE\canal-youtube\LINHA-EDITORIAL.md`. Todo roteiro passa pela lente: o que é, como funciona por dentro, o que a evidência diz, o que muda para você.

### Modo dossiê (o usuário traz a pesquisa pronta)
Quando a entrada é um documento de estudo (PDF, DOCX ou texto longo, em geral em ordem de enciclopédia):
1. Extraia o texto (PDF: `D:\ITALO\CLAUDE\IA-LOCAL\venv-trafego\Scripts\python` com `pymupdf`; DOCX: ler `word/document.xml`).
2. Não siga a ordem do dossiê. Cronologia completa derruba a retenção. Garimpe nele: as **revelações** (fatos que contradizem o senso comum), o **mistério** que vira macro loop, as **cenas** concretas (lugar, data, objeto) que servem de abertura, e os blocos que não mudam a compreensão (esses saem ou viram uma frase).
3. Liste os fatos do dossiê sem fonte como [CONFIRMAR] no banco de evidências e rode a `checagem-fatos` antes do passo 5.
4. Calcule o tamanho: o dossiê inteiro narrado costuma passar da duração alvo. Corte pelo critério do Módulo 01: o bloco sai se o vídeo não perde nada sem ele.
5. Siga o fluxo a partir do passo 2. Mostre o mapa de blocos ao usuário antes de escrever a fala.

## Fluxo

### 1. Ficha de pauta e banco de evidências (Módulo 05)
Pesquise de verdade antes de escrever (Firecrawl, WebSearch, PDFs). Para cada fato, registre: afirmação, fonte com link, data, grau de confiança e onde entra no roteiro. Prefira fontes primárias; a imprensa confiável serve para acontecimentos. Fato sem fonte vira [CONFIRMAR] ou sai.
Canal de curiosidade e história vive de credibilidade: um erro factual nos comentários derruba a autoridade (Módulo 07).

### 2. Tese, bandeira e promessa
- **Pergunta central**: o que o vídeo descobre.
- **Tese**: a leitura própria, a Diferenciação Brutal. Responde por que este vídeo, e não os 50 iguais.
- **Crença comum questionada**: o "inimigo" é uma ideia, nunca uma pessoa ou grupo vulnerável.
- **Promessa**: uma frase que o vídeo consegue cumprir. Ela orienta título, thumb e abertura.

### 2b. Tema polêmico: protocolo de imparcialidade
Use quando o tema divide o público (política, religião, saúde, economia, comportamento, história disputada). A imparcialidade aqui não é ficar em cima do muro: é mostrar a evidência de cada posição pelo seu peso real.
- **Mapeie as posições** (2 a 4) e escreva cada uma na sua **versão mais forte**, como alguém que a defende reconheceria. Teste: um defensor de cada lado assinaria esse resumo?
- **Separe as camadas**: o que é fato verificável, o que é interpretação, o que é valor (moral ou político). A ciência responde à primeira camada; na última, o vídeo mostra o argumento e não escolhe por quem assiste.
- **Peso da evidência**: diga quando um lado tem muito mais evidência (consenso científico, dado oficial). Falso equilíbrio também é parcialidade.
- **Fontes dos dois lados** no banco de evidências, de preferência primárias e institucionais.
- **Linguagem neutra**: sem rótulo pejorativo, ironia sobre um lado ou adjetivo de torcida. Revise a fala só para isso.
- **Fechamento**: o que se sabe, o que segue em aberto e como a pessoa pode checar sozinha. Na tese do vídeo, o "inimigo" é a desinformação ou a simplificação, nunca um dos lados.
- **Monetização**: tema polêmico pode receber anúncio limitado pelas diretrizes para anunciantes. Evite imagem chocante e palavrão nos primeiros 30 s e na thumb.
- Eleições, saúde e tragédias recentes pedem cuidado redobrado: fonte oficial, sem especulação sobre vítimas, sem previsão de resultado.

### 3. Mapa narrativo (Módulos 01, 02 e 06)
Monte a tabela antes de escrever a fala. Uma linha por bloco: função (ruptura, imersão, tensão, revelação, consequência), o que o público sabe antes e depois, meso loop aberto, recompensa, tipo de transição e duração.
- **Macro loop**: a promessa principal. Alimente ao longo do vídeo e pague perto do fim, não no começo.
- **Meso loop**: um por bloco. Cada um abre e fecha dentro do bloco ou do seguinte.
- **Micro loops**: dentro das cenas.
- Alterne tensão e recompensa. Nunca abra um loop que não fecha.
- Retome a pergunta, com algo novo, a cada 60 a 120 s (re-hook). É hipótese de trabalho, a validar pela curva.
- Narrativa não linear é permitida (resultado ou cena crítica primeiro), mas a cronologia factual fica clara.

### 4. Abertura de 30 segundos (Módulo 03)
- Comece materializando a promessa: cena, pergunta, afirmação ou contradição. Nada de "olá pessoal" nem pedido de inscrição antes de entregar valor.
- Até os 30 s: o que está em jogo e por que assistir até o fim (o macro loop).
- A abertura confirma o título e a thumb. Escreva 3 versões de abertura para testar.

### 5. Roteiro de fala (Módulo 09)
- Escreva para ser ouvido: uma ideia por frase, verbos concretos, ordem direta, termo técnico explicado na hora.
- Alterne frases curtas e longas. Marque `[pausa]` antes das revelações e **negrito** nas palavras de ênfase.
- Varie o modo de entrega a cada poucos parágrafos: explicar, demonstrar, contar, comparar, provar, aplicar (Módulo 04).
- Rode `humanizar` ou `stop-slop` no texto final. Leia mentalmente em voz alta e reescreva o que tropeça.
- Tamanho: em português, a narração gira em torno de 140 a 160 palavras por minuto. Calcule a duração estimada e mostre.

### 6. Roteiro técnico (Módulo 10)
Por bloco: fala | intenção | imagem principal | cobertura (B-roll ou cena de IA) | som (trilha, SFX, silêncio) | grafismo (mapa, linha do tempo, número) | fonte ou prova na tela | duração.
- Narrado sem rosto no estilo documental: a coluna de imagem segue a `edicao-story` (cada frase vira cena). Prompts de imagem e vídeo vão para `higgsfield-generate`, `seedance-prompter` ou `kling-prompter`.
- Imagem de IA ou de arquivo nunca é apresentada como registro real do fato. Marque "ilustração" ou "reconstituição" quando for.
- Áudio: `audio-video`.

### 7. CTA e final
- Uma ação principal. Em canal de descoberta, quase sempre: assistir ao próximo vídeo (tela final) ou comentar.
- Inscrição, se houver, vem depois de uma entrega forte, no meio, e em uma frase.
- Pague o macro loop e abra um gancho para o próximo vídeo nos últimos 20 s.

### 8. Auditoria MDD (Sistema de Avaliação)
Dê nota de 1 a 10 nas 12 dimensões: clareza da promessa, força da tese, diferenciação, verdade e evidência, progressão, curiosidade, densidade de valor, linguagem oral, autoridade demonstrada, integração audiovisual, adequação da CTA, qualidade operacional. Qualquer nota abaixo de 7: reescreva aquele ponto antes de entregar. A nota é instrumento interno, não previsão de views.

### 9. Shorts derivados
Liste de 3 a 6 trechos que funcionam sozinhos, com início e fim no roteiro, mais um gancho reescrito para os 2 primeiros segundos e um CTA para o vídeo longo.

## Entrega
O arquivo segue `references/molde-roteiro.md`. Na conversa, mostre só a promessa, a abertura escolhida, o mapa de blocos e as notas da auditoria.
Sequência depois do roteiro: `checagem-fatos`, depois `titulo-thumb-lab` (embalagem), `narracao` (voz, tempos e .srt), `edicao-story` (cenas e montagem), `audio-video` (trilha e mix) e `shorts-do-longo`.

## Regras de verdade (MDD)
Não inventar fato, número, citação, depoimento ou cena. Separar fato, interpretação e hipótese no texto. Dramatização é identificada como tal. Sem clickbait que o vídeo não paga: isso derruba a retenção e a confiança.
