---
name: decupagem-video
description: Decupagem de vídeos brutos da Performake. Transcreve (pt-BR, tempo por palavra), separa as falas em frases, detecta cortes de câmera, tira um print de cada trecho e entrega uma planilha XLSX de decupagem e um XML para importar no Adobe Premiere (sequência com marcadores e sequência SELECTS). Use quando o usuário pedir "decupa esse vídeo", "faz a decupagem", "planilha de decupagem", "transcreve a entrevista", "marca os melhores trechos", "monta os selects", "gera o XML pro Premiere" ou mandar brutos de gravação.
---

# Decupagem de vídeo → XLSX + XML do Premiere

Ferramentas em `video-tools/` (raiz do repositório). Se `/opt/video-venv/bin/python` não existir,
rode primeiro `bash video-tools/install.sh`.

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
/opt/video-venv/bin/python video-tools/scripts/decupar.py gerar <brutos>/*.mp4 \
  --out <pasta_saida> --caminho-pc "D:/Clientes/X/Brutos" [--modelo small|medium|large-v3]
```

`small` é rápido e bom em pt-BR. Use `medium`/`large-v3` para áudio ruim ou sotaque forte (mais lento).

Saída: `decupagem.xlsx`, `decupagem_premiere.xml`, e por vídeo `.srt`, `.captions.json`
(legenda do Remotion) e `.transcricao.json`.

## 4. Enriquecer a planilha (é aqui que você agrega valor)

Leia a coluna TRANSCRIÇÃO e, com openpyxl, preencha:
- **CLASSIFICAÇÃO**: GANCHO, MELHOR FALA, CTA, DEPOIMENTO, B-ROLL, ERRO/REFAZER.
- **USAR**: SIM / TALVEZ / NÃO. Marque como NÃO as falas repetidas, gaguejadas e os erros.
- **ORDEM**: sugestão de montagem (1, 2, 3...) para os trechos com USAR = SIM.
- Linhas `IMAGEM (sem fala)`: abra o print (coluna PRINT ou extraia um frame com ffmpeg)
  e descreva a cena.
Nunca altere as colunas ocultas INICIO_S/FIM_S: são elas que geram o XML.

Depois de enriquecer, regenere o XML para a sequência SELECTS refletir a escolha:

```bash
/opt/video-venv/bin/python video-tools/scripts/decupar.py xml <pasta_saida>/decupagem.xlsx \
  --out <pasta_saida> --caminho-pc "D:/Clientes/X/Brutos"
```

## 5. Entregar

- Suba `decupagem.xlsx`, `decupagem_premiere.xml` e os `.srt` para a pasta do cliente no Drive
  (`create_file`), ou envie com SendUserFile.
- Explique ao editor: no Premiere, **Arquivo > Importar > decupagem_premiere.xml**. Ele cria as
  sequências "DECUPAGEM - <vídeo>" (marcadores com a transcrição em cada fala) e "SELECTS"
  (só os trechos aprovados, na ordem). Se a mídia aparecer offline: clique com o botão direito >
  Vincular mídia > aponte a pasta dos brutos uma vez.
- Para Reels com legenda animada a partir dos selects, use a skill `motion-remotion`.

## Limitações a avisar

- A transcrição não identifica quem fala (Entrevistado/Entrevistador). Isso exigiria o pyannote,
  que precisa de um token gratuito do Hugging Face.
- Sequências multicâmera não são sincronizadas automaticamente.
