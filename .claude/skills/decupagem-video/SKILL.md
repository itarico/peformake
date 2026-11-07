---
name: decupagem-video
description: Decupagem de vídeos brutos da Performake direto no Adobe Premiere. Transcreve (pt-BR, tempo por palavra), separa as falas em frases, detecta cortes de câmera, classifica os trechos e entrega um XML para o Premiere (sequência com marcadores classificados em cada fala + sequência SELECTS montada). Sem planilha por padrão. Use quando o usuário pedir "decupa esse vídeo", "faz a decupagem", "planilha de decupagem", "transcreve a entrevista", "marca os melhores trechos", "monta os selects", "gera o XML pro Premiere" ou mandar brutos de gravação.
---

# Decupagem de vídeo → XML do Premiere

Padrão da agência: **sem planilha**. A decupagem vive nos marcadores do Premiere.
Só gere planilha (`--planilha`) se o usuário pedir.

Ferramentas em `video-tools/` (raiz do repositório). O Python roda via `bash video-tools/bin/vpy`
(funciona no Windows com Git Bash, no Linux e no macOS). Se acusar que não está instalado: Windows
`powershell -ExecutionPolicy Bypass -File video-tools\install.ps1`; Linux/macOS `bash video-tools/install.sh`.

## 1. Trazer os vídeos

- **Google Drive** (conector): localize a pasta com `search_files`, baixe cada vídeo com
  `download_file_content` para uma pasta nova e vazia no scratchpad (ex.: `<scratchpad>/brutos/`).
  Arquivos muito grandes podem falhar pelo conector: nesse caso peça um link de download direto.
- **Link direto**: `curl -L -o <scratchpad>/brutos/<nome>.mp4 "<url>"`.
- **Google Flow / clipes gerados por IA**: o usuário exporta do Flow para o Drive; depois siga o
  caminho do Drive.

## 2. Perguntar (se não foi dito)

1. Onde os brutos ficam no PC do editor (ex.: `D:/Clientes/X/Brutos`). Com isso o XML abre
   no Premiere já com a mídia conectada (`--caminho-pc`).
2. Tipo de material (entrevista, evento, reels, institucional), para classificar os trechos.

## 3. Gerar

```bash
bash video-tools/bin/vpy video-tools/scripts/decupar.py gerar <brutos>/*.mp4 \
  --out <pasta_saida> --caminho-pc "D:/Clientes/X/Brutos" [--modelo small|medium|large-v3]
```

`small` é rápido e bom em pt-BR. Use `medium`/`large-v3` para áudio ruim ou sotaque forte (mais lento).

Saída: `decupagem_premiere.xml`, `decupagem.json` (trechos para classificar) e, por vídeo, `.srt`,
`.captions.json` (legenda do Remotion) e `.transcricao.json`.

## 4. Classificar os trechos (é aqui que você agrega valor)

Leia `decupagem.json` e preencha em cada item de `trechos`:
- **classificacao**: GANCHO, MELHOR FALA, CTA, DEPOIMENTO, APRESENTAÇÃO, B-ROLL ou ERRO/REFAZER.
  Ela vira o nome do marcador no Premiere: `[GANCHO] texto da fala`.
- **usar**: SIM / TALVEZ / NÃO. Marque como NÃO as falas repetidas, gaguejadas e os erros
  (em takes repetidos, use SIM só no melhor).
- **ordem**: sugestão de montagem (1, 2, 3...) para os trechos com usar = SIM.
- **obs**: notas para o editor (ex.: "melhor take", "cortar o 'né' no fim").
- Trechos `IMAGEM (sem fala)`: abra o arquivo do campo `print` e troque `texto` por uma descrição da cena.
Nunca altere `inicio`, `fim` nem `arquivo`.

Depois, regenere o XML para os marcadores e a sequência SELECTS refletirem a classificação:

```bash
bash video-tools/bin/vpy video-tools/scripts/decupar.py xml <pasta_saida>/decupagem.json \
  --out <pasta_saida> --caminho-pc "D:/Clientes/X/Brutos"
```

## 5. Entregar

- Suba `decupagem_premiere.xml` e os `.srt` para a pasta do cliente no Drive
  (`create_file`), ou envie com SendUserFile.
- Explique ao editor: no Premiere, **Arquivo > Importar > decupagem_premiere.xml**. Ele cria as
  sequências "DECUPAGEM - <vídeo>" (marcador `[CLASSIFICAÇÃO] fala` em cada trecho, visível no
  painel Marcadores) e "SELECTS"
  (só os trechos aprovados, na ordem). Se a mídia aparecer offline: clique com o botão direito >
  Vincular mídia > aponte a pasta dos brutos uma vez.
- No chat, entregue um resumo curto: os melhores ganchos (com timecode), a duração do SELECTS e
  ideias de cortes para reels.
- Para Reels com legenda animada a partir dos selects, use a skill `motion-remotion`.

## Limitações a avisar

- A transcrição não identifica quem fala (Entrevistado/Entrevistador). Isso exigiria o pyannote,
  que precisa de um token gratuito do Hugging Face.
- Sequências multicâmera não são sincronizadas automaticamente.
