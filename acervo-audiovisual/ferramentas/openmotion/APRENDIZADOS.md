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

## v80 do Taoísmo (21/11/2026): o que valeu para vídeo longo

- **Download do Wikimedia:** muitos pedidos seguidos levam a erro 429 por IP, que dura de 2 a 10 minutos. Para mais de 30 arquivos, espaçar 8 a 10 s e respeitar o `Retry-After`. Não contornar o limite por outro caminho (o sistema de permissões bloqueia). A miniatura de PDF só sai em larguras-padrão; 2400 px deu erro 400.
- **Disco:** o render de 18 mil quadros com alfa ocupa dezenas de GB. Quadros e saídas vão para o G: (`G:\lucas\...`), nunca para o C:.
- **Whisper no PC:** a GPU não tem cublas64_12.dll; usar CPU. O modelo médio com o áudio inteiro estoura a memória; transcrever frase por frase com o modelo small resolve.
- **Chrome headless:** máscara CSS (`mask-image`) apontando para arquivo local é bloqueada; a silhueta foi feita com `filter: brightness(0)` na própria figura recortada.
- **Premiere pela ponte MCP:** `import_folder` e a importação para dentro de pasta falham (`targetBin.importFiles is not a function`). `execute_extendscript` com `app.project.importFiles(lista, true, pasta, false)` importa em lote, mas a ponte fica sem responder até o Premiere terminar. `add_to_timeline_batch` com cerca de 130 clipes por chamada funciona. Fechar o projeto derruba o painel da ponte; para reabrir, `verify_premiere_connection`.
- **Planos longos:** dividir automaticamente todo plano acima de 3,6 s, com outra câmera na mesma imagem, garante o ritmo de 2 a 4 s sem precisar escrever cada plano.

## v80 reprovada (retorno do Italo, 21/11/2026): o que não fazer de novo

- **"Adicionar cenas" quer dizer somar, não refazer.** A v80 trocou todas as animações aprovadas da v60/v70 por planos novos. O certo: manter a base (cenas do `proj.json` da sessão de roteiro e as 5 cenas OpenMotion da v70) e só inserir imagem nova onde a narração cita exatamente aquilo, no lugar de trecho repetitivo ou longo, nunca no lugar de uma animação que já ilustrava a frase.
- **Regra de ouro:** cada imagem ilustra a frase que está sendo dita naquele momento. Sem imagem que ilustre, fica a animação da base. Imagem "parecida" ou de enchimento conta como aleatória.
- **Ritmo de 2 a 4 s não é cortar por relógio.** Dividir plano longo automaticamente, com outra câmera na mesma imagem, gerou troca de imagem sem relação com a fala. O corte acompanha a frase e a palavra citada, não um teto de segundos.
- **Movimento:** menos e mais lento. A câmera só se move para levar o olho ao que a fala cita. Parallax e balanço contínuos em todo plano cansam e parecem aleatórios.
- **Texto Tinocando:** só nas palavras-chave, no quadro exato da palavra. Não pôr título em toda frase.
- **Sincronia com a fala:** remapear cada cena pela frase correspondente no áudio novo, alinhando pelo texto (transcrição por palavra do áudio final), não por tempo absoluto nem por proporção dentro da frase. Gatilho que não bate com palavra transcrita não pode cair em posição estimada: revisar à mão.
- **Aprovação por trecho:** antes do render inteiro, mandar 60 s de teste (abertura) para o Italo aprovar. Render completo só depois do ok.
