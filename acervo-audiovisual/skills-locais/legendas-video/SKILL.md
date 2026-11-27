---
name: legendas-video
description: Legenda queimada em vídeo vertical (Reels, TikTok, Shorts 1080x1920) da Peformake. Escolhe o estilo (padrões SN, BRIO e DISALP, famílias do Legendas Master, estilos do acervo como palavra a palavra, duas vozes, legenda de filme e texto atrás da pessoa), gera os PNGs transparentes com um script único (fonte, cor de destaque, altura, palavras por tela, janelas sem legenda, zona segura) e coloca no Premiere pela ponte MCP premiere-pro. Use quando pedirem "legenda", "legendar", "legendar o vídeo", "estilo de legenda", "Legendas Master", "texto atrás da pessoa", "legenda palavra por palavra", "legenda no Premiere", "tirar a legenda enquanto tem motion", "legenda animada", "animação de legenda", "legenda estilo Hormozi", "karaokê", "fonte para legenda". Não é para texto/legenda de post (copy): para isso, caption-writer.
---

# Legendas em vídeo (Peformake)

Tudo o que a agência já estudou e usa de legenda queimada. Some aqui o que for aprendendo (novo cliente = novo preset + linha no catálogo).

Arquivos:
- `referencias/catalogo-estilos.md`: estilos, quando usar, linhas, tom (padrões da casa, Legendas Master, acervo).
- `scripts/legendas.py`: gerador único de PNG (presets `sn`, `brio`, `disalp`, `palavra`, `marca_texto`, `viral`, `apple`, `filme`, `caixa`, `atras`, `hormozi`, `beast`, `ali`).
- `scripts/animar.py`: animador. Mesmo layout e presets, gera .mov com alfa: 28 animações, 5 efeitos contínuos, 5 saídas, 30 curvas de velocidade e 4 velocidades.
- `referencias/animacoes.md`: catálogo de animações, curvas e regras de ritmo. `referencias/fontes.md`: fontes instaladas, a instalar e licenças.
- `referencias/pesquisa-2026-11.md`: pesquisa completa com links (estilos de criadores e apps, valores de animação, 51 fontes).
- `scripts/premiere_lote.py`: transforma o `plano.json` nos argumentos da ponte MCP.
- `scripts/recorte_pessoa.py`: recorte da pessoa com rembg para o texto atrás dela.
- `exemplos/entrada.json`: modelo de entrada.

## Regras fixas

1. **Zona segura do Reels (1080x1920)**: rosto e conteúdo entre y 380 e 1150; nada de texto abaixo de y 1530 nem acima de 380; lateral direita livre a partir de y 1000 (coluna de botões, x > 900). Na sequência 2160x3840 os valores dobram. O gerador avisa (`ZONA ...`) e, com `lateral_livre` (padrão), estreita a linha sozinho.
2. **Legenda nativa do Premiere (trilha de legenda) não é lida nem editada por script.** Por isso a legenda da agência é PNG transparente numa trilha V, acima do vídeo e abaixo do logo. A legenda nativa e o Legendas Master só quando o Italo for fazer à mão.
3. **Motion na tela = sem legenda.** Passe as janelas (`"janelas"`) e o gerador corta ou tira as legendas desses trechos (folga de 0,1 s).
4. Ortografia revisada a partir da fala, não da transcrição crua. Conferir nomes de cliente, produto e endereço.
5. 1 palavra-pico por tela, no máximo. Troca de estilo só quando a cena muda de linguagem.
6. Diretrizes gerais de edição: `G:\lucas\_EDICAO_DIRETRIZES.md` (fila única do Premiere: só uma sessão usa por vez; confirmar com a coordenadora "Edição de vídeo" antes de mexer).

## Passo a passo

### 1. Escolher o estilo
Ler `referencias/catalogo-estilos.md`. Cliente já com padrão (SN, BRIO, DISALP) = usar o preset dele. Cliente novo: propor 2 estilos ao Italo com prévia (passo 3) antes de gerar tudo.

### 2. Montar a entrada
Copiar `exemplos/entrada.json`. Três formas de texto por vídeo (tempos em segundos **da sequência**):
- frases: `[[ini, fim, "texto com *destaque*"], ...]`
- `{"srt": "caminho.srt"}`
- `{"palavras": "whisper.json"}` (Whisper com `word_timestamps`; skill `ler-video` gera) agrupado por `palavras_por_tela`, quebrando em pontuação e pausa > 0,35 s.

`config` aceita qualquer chave de `PADRAO` no script por cima do preset: `fonte` (nome do arquivo em `%LOCALAPPDATA%\Microsoft\Windows\Fonts`, `C:\Windows\Fonts` ou `G:\lucas\NOVEMBRO\SN\_RECURSOS\Fontes`, ou caminho), `peso` (eixo de fonte variável), `corpo`, `cor`, `cor_destaque`, `estilo_destaque` (`cor`, `marca_texto`, `gigante`), `y_centro` (fração da altura), `largura_max`, `max_linhas`, `palavras_por_tela`, `caixa_alta`, `contorno`, `sombra`, `caixa_linha`, `destacar` (palavras destacadas automaticamente), `largura`/`altura` (2160x3840 padrão; 1080x1920 para sequência HD), `saida`.

### 3. Gerar e conferir
```
python C:\Users\User\.claude\skills\legendas-video\scripts\legendas.py entrada.json --previa
```
Saída: `<saida>/<VIDEO>/NNN.png`, `previa_NNN.jpg` (zona vermelha = proibida, laranja = botões, linha verde = fim da área do rosto) e `<saida>/plano.json`. Abrir 2 ou 3 prévias antes de seguir. Zerar os avisos `ZONA` e `SOBREPOE`. `--so VIDEO` regera um vídeo só.

### 3b. Legenda animada (opcional)
Mesma entrada, mais o bloco `"animacao"` (ver `referencias/animacoes.md`):
```
"animacao": {"nome": "hormozi_bloco", "velocidade": "normal", "fps": "30000/1001", "saida": "fade_saida"}
```
`fps` = o da sequência (29,97 = `30000/1001`). Rodar:
```
python C:\Users\User\.claude\skills\legendas-video\scripts\animar.py entrada.json --quadros --previa trecho.mp4
```
- `--quadros`: folha `<VIDEO>_quadros.jpg` com a 1a legenda quadro a quadro (conferir a curva). `--previa`: legenda sobre o vídeo em 540x960.
- Modo `por_video` (padrão): 1 arquivo `<VIDEO>.mov` (QuickTime Animation com alfa) do tempo 0 até a última legenda. No Premiere: `import_media` e `add_to_timeline` na trilha V vazia no tempo 0 (ou no início do trecho). Não precisa cortar duração.
- Modo `por_legenda`: `<VIDEO>/NNN.mov`, um por legenda (para mexer em uma só depois); colocar com `premiere_lote.py` usando `plano_animado.json`.
- Tempo: cerca de 8 quadros por segundo em 2160x3840 (30 s de Reels = 2 min). Teste rápido: `"largura": 1080, "altura": 1920`.
- Palavra a palavra, karaokê e `dois_tons` ficam precisos com entrada `{"palavras": "whisper.json"}`; com frases ou SRT o tempo de cada palavra é estimado pelo tamanho.

### 4. Colocar no Premiere (ponte MCP `premiere-pro`)
Só com o Premiere liberado para esta sessão.
1. `verify_premiere_connection`; `list_sequences` para pegar o `sequenceId`; `invoke_tool list_sequence_tracks` para achar uma trilha V vazia (acima do vídeo, abaixo do logo). Se faltar trilha, criar (buscar com `search_tools` "add track").
2. `python premiere_lote.py <saida>\plano.json VIDEO --importar` e, para cada item, `invoke_tool import_media {filePath, binName}`.
3. `invoke_tool list_project_items`; salvar `ids.json` = `{"<caminho do png>": "<projectItemId>"}`.
4. `python premiere_lote.py <saida>\plano.json VIDEO --ids ids.json --seq <sequenceId> --trilha <n>` e rodar `invoke_tool add_to_timeline_batch` com o bloco `add_to_timeline_batch` de `lote_VIDEO.json`.
5. Imagem parada entra com duração padrão: `list_sequence_tracks` de novo e, para cada clipe da trilha (na ordem do tempo), `invoke_tool trim_clip {clipId, duration}` com `duracoes[i].dur`. Cortar do último para o primeiro evita sobrescrever o vizinho.
6. Escala: PNG 2160x3840 em sequência 2160x3840 = 100%. Se a sequência for 1080x1920, gerar com `"largura":1080,"altura":1920` em vez de escalar. Ajuste fino de posição: `set_clip_properties_batch` (Motion > Posição).
7. Conferir com 2 ou 3 quadros exportados (ou print) antes de dizer pronto. Salvar o projeto. Não exportar XML do FCP (trava a ponte).

Legenda já existente em trilha nativa e com motion por cima (caso DISALP): o script não mexe; usar `G:\lucas\DISALP\PROJETOS\MOTION\legendas_plano.py` para listar o que apagar/mover e o Italo faz no painel Propriedades. Se a legenda for PNG/gráfico em trilha V, dá para `split_clip` e `remove_from_timeline` pela ponte.

### 5. Texto atrás da pessoa
1. Gerar a palavra: entrada com `"preset": "atras"` (Bebas Neue Bold gigante, caixa alta, terço superior, atrás da cabeça).
2. Recortar a pessoa do mesmo trecho:
   `python scripts\recorte_pessoa.py video.mp4 --ini 3.2 --fim 6.0 --saida recorte_01.mov` (ProRes 4444 com alfa; `--escala 0.5` para ir mais rápido; foto: saída .png).
3. Premiere: V1 vídeo, V2 PNG da palavra, V3 o `.mov` do recorte no mesmo tempo do trecho (`--ini` = tempo do clipe na origem; alinhar na timeline ao início do trecho). A legenda corrida vai acima de tudo ou some nesse trecho.
4. Usar 1 a 3 vezes por vídeo, em palavra-tese ou nome do produto. Conferir a borda do recorte (cabelo, mãos) em 2 quadros.

### 6. Legendas Master (manual)
Quando o Italo quiser um template animado do plugin: indicar família e template pelo catálogo (`G:\lucas\NOVEMBRO\SN\_RECURSOS\legendas_master_catalogo.jpg`, nome tipo `Viral/2 linhas/T12`). O plugin pede login e roda no painel; os `.cgt` são criptografados, então não dá para gerar nem editar por script.

## Somar daqui para frente
Novo padrão aprovado de cliente: adicionar preset em `PRESETS` no script e uma linha na seção 1 do catálogo, com a data e o vídeo de referência. Animação nova: entrada em `ANIMACOES` no `animar.py` (trilhas com quadros-chave) e uma linha em `referencias/animacoes.md`. Fonte nova: instalar e registrar em `referencias/fontes.md`. Depois espelhar em `C:\Claude\peformake\acervo-audiovisual\skills-locais\legendas-video` e fazer commit e push (regra do acervo).
