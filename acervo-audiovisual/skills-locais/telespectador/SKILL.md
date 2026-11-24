---
name: telespectador
description: Assiste um vídeo longo do YouTube (ou um corte) como se fosse o público real e prevê a retenção antes de publicar. Simula 3 espectadores diferentes, assiste em janelas de 10 a 15 s (quadros + transcrição com tempo + áudio), marca em que segundo cada um fecharia a aba e por quê, desenha a curva de retenção prevista, aponta os 10 piores momentos com a correção pronta e dá o veredito "publica / corrige / refaz". Use quando o usuário pedir "assiste como espectador", "avalia a retenção", "esse vídeo prende?", "por que não está prendendo", "simula o público", "telespectador", "o vídeo está chato?", ou antes de publicar qualquer vídeo longo do canal Por Dentro.
---

# Telespectador

Objetivo: ser o público, não o editor. O editor vê o que fez; o espectador só vê o que chega na tela e no ouvido, com o
polegar em cima do próximo vídeo. A pergunta de cada janela é uma só: **por que eu continuaria assistindo agora?**

## Entrada
- O vídeo final (MP4). Se não der para ver o vídeo, quadros a cada 1 a 2 s com o tempo escrito (folhas de contato) e a
  transcrição da voz com tempo por frase. Sem transcrição, gere com a skill `ler-video`.
- O título e a thumb que vão para o ar (a promessa que o espectador clicou).
- Opcional: o roteiro, para separar erro de roteiro de erro de edição.

## Os 3 espectadores (sempre os três)
1. **Curioso de feed (17 a 25 anos):** clicou pelo GTA. Sai se em 30 s não aparecer nada do jogo ou uma revelação que dê
   para contar aos amigos. Odeia aula, gráfico parado e número empilhado.
2. **Dono de pequeno negócio (30 a 45):** quer aprender algo aplicável. Aguenta conta se ela levar a uma lição. Sai com
   enrolação, repetição e quando não entende para onde o vídeo vai.
3. **Espectador exigente de documentário (Vox, Johnny Harris, Coffeezilla):** compara o ritmo, a clareza e a
   originalidade com os melhores. Sai quando vê clichê visual, texto ilegível, som irritante ou falta de prova.

## Como assistir
1. **Antes do play:** leia título e thumb. Escreva em 1 linha o que cada espectador espera ganhar.
2. **Janelas de 10 a 15 s** do começo ao fim. Para cada janela, registre:
   - o que a voz diz (resumo) e o que a tela mostra;
   - **interesse de 0 a 10** para cada espectador;
   - **gatilho de saída**, se houver: promessa adiada, repetição, informação sem consequência, número sem emoção,
     tela que não muda há mais de 6 s, tela que muda sem relação com a fala, texto ilegível ou escondido, som alto
     ou estranho, sotaque/voz robótica, pergunta sem resposta, transição gratuita;
   - **gancho de permanência**, se houver: loop aberto, revelação, contraste, imagem que surpreende, pergunta ao
     espectador, humor.
3. **Pontos críticos:** 0 a 5 s (o polegar), 30 s (a promessa), 60 s, cada troca de bloco e o fim (a recompensa paga?).
4. **Som:** volume da voz contra música e efeitos; efeito que soa como outra coisa (ex.: parece Minecraft, desenho
   animado, game antigo) conta como erro grave, porque tira a pessoa da história.
5. **Imagem:** texto atrás de foto ou de vídeo, texto que some antes de dar para ler (menos de 0,4 s + 0,3 s por palavra),
   cena que não ilustra a frase, mesmo tipo de cena repetido mais de 3 vezes seguidas.

## Curva de retenção prevista
- Comece em 100 % e desconte a cada janela pela média dos três espectadores: interesse 8 a 10 tira 0 a 1 ponto;
  5 a 7 tira 2 a 4; abaixo de 5 tira 5 a 10; gatilho de saída grave tira mais 5.
- Referência de mercado para vídeo de 8 a 12 min (YouTube, 2025 e 2026): bom é acima de 70 % aos 30 s e acima de 40 %
  na média; menos de 55 % aos 30 s indica abertura fraca.
- Entregue a tabela (tempo, % restante, motivo da queda) e marque as 3 maiores quedas. É uma previsão para orientar a
  edição, não um número do YouTube: diga isso no relatório.

## Saída (arquivo `AVALIACAO-TELESPECTADOR-<data>.md` ao lado do roteiro)
1. **Veredito em 3 linhas:** prende ou não, a curva prevista (30 s, 1 min, metade, fim) e a decisão: publica / corrige / refaz.
2. **O que cada espectador sentiu** (1 parágrafo cada, na voz dele, curta e sincera).
3. **Curva de retenção** (tabela).
4. **Os 10 piores momentos**, do mais grave ao menos: tempo, o que acontece, por que faz sair, a correção pronta
   (fala, imagem, som ou corte), e se é erro de roteiro ou de edição.
5. **O que já funciona** (no máximo 5 itens) para não perder na correção.
6. **Se for para refazer:** a nova abertura de 30 s escrita e a ordem nova dos blocos.

## Regras
- Seja duro e específico. Nada de "o vídeo está bom, mas...". O usuário pediu porque o vídeo não está prendendo.
- Todo problema com tempo exato (mm:ss) e correção concreta.
- Não invente o que não está na tela ou no áudio. Se não deu para ouvir algo, diga.
- Não reescreva fatos: se mudar a fala, mantenha números e fontes checados.
