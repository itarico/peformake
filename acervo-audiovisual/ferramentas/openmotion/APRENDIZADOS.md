# OpenMotion: aprendizados de uso real

Primeiro uso: cenas novas do documentário do Taoísmo v70 (20/11/2026). Scripts em `youtube/roteiros/taoismo/montagem/v70-openmotion/`.

## Fluxo que funcionou

- Escrever o projeto HyperFrames numa pasta do PC (gerado por script), conferir com `hyperframes check --json` e `hyperframes snapshot --at ...`, e só depois importar no OpenMotion.
- O import (`openmotion_project_archive` import) aceita só **arquivo ZIP**, não pasta. Zipar a pasta com `index.html` na raiz.
- Para textos grandes (contorno de mapa, centenas de pontos), gerar o HTML por script e importar o ZIP. Assim não é preciso colar o conteúdo inteiro no `openmotion_edit_project`.
- Exportar todas as cenas num MP4 só e cortar por quadro depois sai mais rápido que exportar uma por uma.
- Para cenas que entram num filme já montado, deixar o OpenMotion sem som e sem legenda. O motor do filme põe legenda, grão e vinheta por cima, e o mix é feito fora.

## Armadilhas

- **Duração do projeto precisa dar um número inteiro de quadros.** Com `data-duration="73.9167"` a 24 fps, o export saiu com 1774 quadros, o verificador esperava 1775 e reprovou. O arquivo reprovado é apagado. Use duração inteira em segundos, ou `quadros / fps` exato.
- Fontes fora da lista embutida (Cormorant Garamond, Noto Serif SC, Courier Prime) precisam de `@font-face` com arquivo em `assets/fonts/`. O Google Fonts serve TTF pela API css2, e `&text=` baixa só os caracteres usados (o subconjunto de hanzi ficou com 15 KB).
- Traço escondido com `stroke-dasharray 1` + `stroke-dashoffset 1` e ponta redonda deixa um ponto visível. Use `stroke-linecap="butt"` nos traços que se desenham.
- Começar cada cena num quadro inteiro (`ceil(t * fps) / fps`) para o corte por quadro bater.

## Som (vale para qualquer foley do Pixabay)

- Vários efeitos do Pixabay começam com silêncio. Exemplos: `carimbo_1` bate em 0,55 s, `sino_1` em 0,62 s, `tinta_*` em cerca de 0,3 s. Colocar o arquivo no tempo do objeto deixa o som atrasado.
- Correção usada no v70: medir o ataque de cada arquivo (primeiro ponto acima de 10% do pico) e adiantar o som nesse valor. A sincronia ficou entre 0 e 40 ms.
- O foley do v60 ainda não tem essa correção.
