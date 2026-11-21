# Taoísmo v80: tudo o que a narração diz aparece na tela

Entrega de 21/11/2026, a partir do retorno do Italo sobre a v70: narração recortada de novo (voz_v2), ritmo de 2 a 4 s por plano, cena literal para cada coisa citada, texto no estilo Tinocando, câmera no estilo Nostalgia, abertura na tumba de 1973 e projeto do Premiere com faixas separadas.

## Arquivos entregues (fora do Git)

- `C:\Claude\canal-youtube\taoismo\montagem\taoismo_final_v80.mp4`: 1080p, 24 qps, 12:34, -14,1 LUFS, pico -1,3 dBFS.
- `C:\Claude\canal-youtube\taoismo\montagem\taoismo_final_v80_720p.mp4`: prévia de 43,5 MB para o WhatsApp.
- `G:\lucas\taoismo_v80\taoismo_v80.prproj`: sequência "Taoismo v80" com V1 = 264 clipes de cena (um por plano), V2 = textos e legenda com fundo transparente (ProRes 4444), A1 = voz, A2 = trilha, A3 = foley.
- Quadros, faixas e áudio intermediários ficam em `G:\lucas\taoismo_v80\saida` (o C: não tem espaço).

## Como foi feito

1. `scripts/palavras_v2.py`: tempo de cada palavra da voz_v2 (Whisper local, frase por frase).
2. `scripts/planos_v80.py`: o plano frase a frase, com imagem, câmera e palavras que entram na tela. O mapa do que é dito e do que aparece está em `plano-visual.md`.
3. `scripts/camadas.py`: recorta a figura de cada pintura (rembg) e preenche o fundo, para a câmera 2.5D.
4. `scripts/render_v80.py linha`, depois `v1` e `v2`: monta a linha do tempo (264 planos, média de 2,9 s; plano longo vira dois com outra câmera) e renderiza no `motor_v80.html`.
5. `scripts/gerar_sonorizar_v80.py` gera o `sonorizar_v80.py` a partir do `sonorizar.py` do v60: a mesma trilha, retimada pela voz_v2, mais o foley novo e o respiro. As regras de som estão em `NOTAS-SOM.md`.
6. `scripts/finalizar_v80.py`: junta V1 + V2 + mix e gera a de 1080p e a de 720p.
7. `scripts/creditos_imagens.py`: `creditos-imagens.csv` (arquivo, fonte, URL, autor, licença e tempo de uso) e `descricao-creditos.txt` (texto pronto para a descrição do YouTube).

## Onde entrou cada recurso

- **Tipografia Tinocando:** a palavra-chave entra grande e assenta (escala de 1,38 para 1) na hora em que é dita, com destaque vermelho e risco. A versão anterior sobe e apaga, e os nomes ficam atrás da figura (LAOZI, SIMA QIAN, ZHANG DAOLING). Datas entram como carimbo vermelho ("1973" gigante na abertura). Rótulos de lugar com linha (MAWANGDUI, HANGU, DUNHUANG, SÃO PAULO). O caractere chinês entra ao lado (道, 無為, 德, 李, 氣). Vale em todas as frases.
- **Câmera Nostalgia:** aproximação, afastamento, movimento lateral, subida e descida em todo plano; parallax com o fundo desfocado e a figura recortada andando de leve nas pinturas de Laozi, Sima Qian, Zhang Daoling, letrados, jesuítas e Marco Aurélio. Nenhum plano parado.
- **Transições (skill transicoes-willrvail, versão papel e tinta):**
  - T1 na frase 1: ponto vermelho no escuro e mancha de tinta que revela a câmara da tumba;
  - T2 em toda troca de bloco: pincelada preta, título do capítulo e carimbo;
  - T3 nas frases 35, 44, 79 e 124: a figura entra em tinta e a pintura aparece;
  - T4 na frase 28: gota no papel que vira água ondulando;
  - T5 na frase 6: 2 quadros de negativo em "de trás para frente", com respiro de som;
  - T6 na frase 2: halo de luz na caixa de laca.
- **Abertura:** escuro, poço e escavação de 1972-73 com luz de lanterna, caixões, laca, a pintura de seda em forma de T e o manuscrito.

## Regras de imagem

- Fotos de imprensa (P1 a P7): sempre animadas, até 5 s por aparição, crédito na descrição. O Laozi em seda B ficou com 5,4 s no vídeo inteiro.
- Sem imagem de IA. Sem trecho de vídeo de terceiros.
- Sem imagem livre: Liu Pai Lin (ficou o vídeo de tai chi) e a tradução de 1788 (ficaram a gravura dos jesuítas e a Sociedade Real).

## Conferência

- Sincronia: carimbo do 1973 -14 ms, carimbo do capítulo 2 +20 ms, gota que vira água +51 ms.
- Trilha sob a voz: cerca de -30 dB antes da normalização (pedido: -28 a -22 dB na fala).
- Vídeo inteiro em `conferencia_inteiro.jpg` (1 quadro a cada 6 s).
