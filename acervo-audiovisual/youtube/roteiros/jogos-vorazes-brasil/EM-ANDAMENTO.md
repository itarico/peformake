# Panem: onde parou (21/11/2026)

## Pastas
- Roteiro, scripts e documentação (Git, branch `claude/performig-app-data-hxl4zh`): `C:\Claude\peformake\acervo-audiovisual\youtube\roteiros\jogos-vorazes-brasil\`
- Mídia e projeto montado (fora do Git): `C:\Claude\canal-youtube\panem\`
  - Voz do Italo: `audio_italo\gravacao.wav` (bruta, 15:32), `audio_italo\voz_editada_v2.wav` (editada, 12:32, 164 de 166 frases), `tempos.json`, `relatorio_voz_v2.md`
  - Projeto HyperFrames/OpenMotion montado com tempos estimados: `montagem\qa_v4\` (index.html e index_parte1..4.html)
  - QA das cenas: `qc\v4\` (qa.json e um quadro por cena)
  - Versão anterior entregue (roteiro v2, voz-guia): `panem_v1.mp4`, `panem_v1_previa_720p.mp4`

## Falta
1. Regravação de 7 frases pelo Italo: 27 (setenta e sete), 60 (setenta e quatro), 114 (setenta), 164 ("um por cento"), 107 (café), 121 ("Como em Panem."), 122 ("E se os Jogos fossem aqui?"). Na gravação atual ele leu 67, 64, 60 e "nenhum por cento".
2. Juntar as regravações: transcrever (`SRC=... OUT=... DEV=cuda python montagem/transcrever.py large-v3-turbo`), concatenar com `gravacao.wav` e rodar `montagem/editar_voz.py` de novo (SRC, TR, OUT).
3. (Feito com a voz atual: `audio_italo/palavras.json`, 50 de 1.826 palavras estimadas; refazer depois das regravações.) `montagem/palavras.py voz_editada_v2.wav tempos.json palavras.json`, depois `montagem/construir.py <midia> <audio_italo> <saida> final`.
4. `montagem/qa_cenas.py`, `separar_partes.py`, render das 4 partes no OpenMotion (disco: só ~8 GB livres no C:; render uma parte por vez), concat, `sonorizar.py`, mux, prévias 720p (< 45 MB) e celular (< 30 MB).
5. Projeto do Premiere: V1 cenas, V2 textos, V3 trechos do filme e do reality (`creditos-trechos.csv`), A1 voz, A2 trilha, A3 efeitos.
6. Decisão pendente do Italo: usar ou não o trecho de "Largados e Pelados Brasil: A Tribo" (gravado na África) na frase 129.
7. Avisar a sessão "Edição de vídeo"; lembrar o Italo de esperar "Verificações" no YouTube.
