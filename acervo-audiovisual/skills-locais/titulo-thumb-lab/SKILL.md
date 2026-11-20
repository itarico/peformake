---
name: titulo-thumb-lab
description: Laboratório de embalagem de vídeo do YouTube. Cria e escolhe título e thumbnail que puxam clique sem enganar, alinhados com os primeiros 30 segundos (Módulo 03 do Método De Dentro). Gera de 15 a 20 títulos por padrão, de 3 a 5 conceitos de thumb com briefing e prompt, pontua, escolhe os pares para teste A/B e diagnostica CTR baixo. Use quando o usuário pedir título, thumbnail, thumb, capa de vídeo, "melhorar o CTR", "ninguém clica", "embalagem do vídeo", teste A/B de thumb, ou depois de um roteiro da roteiro-retencao.
---

# Título + Thumb Lab (YouTube, MDD)

Base: `D:\ITALO\CLAUDE\SHOPPE\canal-youtube\MDD-manual-v2.md`, Módulo 03 e Módulo 11.
Saída: `D:\ITALO\CLAUDE\SHOPPE\canal-youtube\embalagens\<slug>-<AAAA-MM-DD>.md`, mais as imagens geradas na mesma pasta.

## A regra que manda
O título promete; a thumb intensifica ou complementa (não repete o título); a abertura confirma que a pessoa chegou ao vídeo certo. Embalagem que o vídeo não paga gera clique e depois abandono, e o YouTube para de mostrar o vídeo. Por isso cada proposta aqui vem com a frase dos 30 s que a confirma.

## Entrada
Promessa e abertura do roteiro (de `roteiro-retencao`) ou o tema. Se houver pesquisa da `youtube-outliers`, leia `outliers.json` e abra as thumbs em `thumbs/`: os padrões vencedores do nicho são o ponto de partida.

## Fluxo

### 1. Padrões do nicho
Com as thumbs e os títulos dos outliers (e `biblioteca.py resumo`), anote em até 6 linhas: tipos de título que repetem, elemento dominante das thumbs, cores, quantidade de texto e o que está saturado (todo mundo faz igual, então diferenciar ali ganha).

### 2. Títulos (15 a 20)
Distribua por padrão, de 2 a 3 de cada: **pergunta**, **contradição** ("X não é o que te contaram"), **revelação ou segredo**, **lista com número**, **história com personagem**, **comparação ou escala**, **consequência** ("o que acontece se...").
- Até cerca de 60 caracteres, para não cortar no celular. Mostre a contagem.
- Assunto claro + tensão. Sem palavra vaga ("incrível", "chocante") sem conteúdo.
- Nada que o vídeo não entrega (Módulo 03).

Pontue cada título de 1 a 5 em: clareza do assunto, tensão ou curiosidade, especificidade, diferença do nicho e honestidade. Mostre o top 5.

### 3. Conceitos de thumb (3 a 5)
Cada conceito:
- **Ideia dominante** (uma só): rosto com emoção, objeto-chave, antes e depois, escala, mapa, "o que está errado nesta imagem".
- **Texto**: zero a 3 palavras, sem repetir o título. Ele complementa.
- **Composição**: foco à esquerda ou à direita (o tempo do vídeo cobre o canto inferior direito), contraste alto, no máximo 3 elementos, legível a 120 px de largura.
- **Título que acompanha** e **frase dos 30 s que confirma**.
- **Prompt**: para `higgsfield-youtube-thumbnail` (preferido) ou `higgsfield-generate`, em 16:9 1280x720.

Gere as imagens quando o usuário aprovar os conceitos, porque cada geração consome créditos. Depois, faça a checagem em miniatura: reduza para 168x94 com Python/PIL, abra e veja se a ideia ainda se lê.

### 4. Pares para teste
Escolha 3 pares título+thumb **realmente diferentes** (ângulos diferentes, não variações de cor). O YouTube Studio tem o recurso "Testar e comparar" para thumbnails, e para títulos quando estiver disponível na conta. Defina o par principal para publicar e o critério de decisão: é o próprio teste do YouTube que decide, por tempo de exibição. Não decida por CTR isolado.

### 5. Diagnóstico pós-publicação (Módulo 11)
Quando o usuário trouxer números do Studio:
- Impressões altas e CTR baixo: embalagem ou público errado. Troque a thumb primeiro e o título depois.
- CTR bom e queda forte nos primeiros 30 s: promessa desalinhada com a abertura. Ajuste o título para o que o vídeo entrega.
- Poucas impressões: tema ou distribuição, não a embalagem.
Compare com vídeos do próprio canal com tema e duração parecidos. Registre a hipótese, a mudança feita e o resultado (Registro de aprendizado do MDD).

## Entrega
Arquivo com: padrões do nicho, títulos com nota, conceitos de thumb com prompt, imagens geradas, os 3 pares de teste e o par principal. Na conversa, mostre o par principal e as imagens.

## Regras
Não usar rosto de pessoa real, marca ou personagem de terceiros sem direito. Não fingir que uma imagem ilustrativa é registro real. Não usar sensacionalismo sobre tragédia, saúde ou pessoa vulnerável.
