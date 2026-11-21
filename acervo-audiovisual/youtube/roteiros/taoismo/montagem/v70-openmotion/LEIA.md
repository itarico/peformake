# Taoísmo v70: cenas novas feitas no OpenMotion

O v70 é o v60 com 5 cenas trocadas por animações feitas no OpenMotion e com foley próprio nessas cenas.
A trilha, o ducking e o foley das outras cenas são os mesmos do v60. Nenhum som novo foi baixado: todos os efeitos já estavam em `audio/sfx` e licenciados (Pixabay).

Entrega: `C:\Claude\canal-youtube\taoismo\montagem\taoismo_final_v70.mp4` (1080p, 11:19, -14,1 LUFS, pico -1,3 dBFS).
Os arquivos do v60 (`taoismo_final_v60.mp4`, `sonorizar.py`, `proj.json`, `audio/`) não foram alterados.

## As 5 cenas

| Cena | Substitui (índice em `cenas.py`) | Frases | Tipo |
| --- | --- | --- | --- |
| corte | 4, frase_tinta "Cortado..." | 8-9 | tipografia cinética: colunas de hanzi se partem, trocam de lugar e são reescritas em vermelho |
| mapa | 22, vídeo do Templo do Céu | 63-65 | mapa da China (Natural Earth) com Guodian, Mawangdui e Pequim; dúvida sobre a origem; setas para "o mesmo lado" |
| livro | 23, frase_tinta "Falado · decorado..." | 66-70 | linha do tempo do livro vivo: 口 心 竹 帛 刪 ＋ 改 até 八十一章 |
| yinyang | 32, yinyang antigo | 89-90 | taijitu girando com quatro faces (filosofia, religião, medicina, política); destaque no lado prático |
| funciona | 35, frase_tinta "Funciona?" | 95 | 420 partículas de tinta se juntam e formam "Funciona?" |

Os tempos internos seguem as palavras da narração. A posição de cada palavra vem das transcrições com tempo por palavra (`audio/transcricao_*.json`), ajustada ao início de cada frase em `frases.json`.

## Como refazer

Na pasta `montagem/openmotion_v70/` do PC (os scripts estão aqui no acervo):

1. `python gerar_dados.py`: contorno da China e pontos das partículas (precisa das fontes Cormorant e Noto Serif SC em TTF, baixadas do Google Fonts, licença OFL).
2. `python construir.py`: escreve o projeto HyperFrames em `projeto/`. Para conferir: `hyperframes check` e `hyperframes snapshot`.
3. Importar `projeto/` como ZIP no OpenMotion (`openmotion_project_archive` import) e exportar (`openmotion_export_request`, áudio `silent`).
4. `python montar_v70.py export_openmotion.mp4`: tira os quadros, renderiza só os 5 trechos no motor (com legenda, grão e vinheta) e cola por cima do `taoismo_final.mp4`.
5. `python gerar_sonorizar_v70.py` e depois `python sonorizar_v70.py`: refaz o mix lendo `proj_v70.json`.
6. `python montar_v70.py --mux` junta vídeo e som. `python creditos_v70.py` gera `audio/v70_creditos-audio.csv`.
7. `python conferir_sincronia.py` mede o atraso entre o objeto e o som.

## Conferência (20/11/2026)

- Sincronia: risco do corte +40 ms, alfinete de Pequim 0 ms, carimbo dos 81 capítulos -1 ms.
- Emendas: quadro anterior e posterior de cada cena trocada estão em `emendas.jpg`. Não há quadro de outra cena dentro do trecho.
- Vídeo inteiro: um quadro a cada 8 s, sem cena faltando, sem quadro preto fora das transições de tinta.
