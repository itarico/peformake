# Montagem do documentário do Taoísmo

Pipeline (os arquivos de mídia ficam fora do Git, em `C:\Claude\canal-youtube\taoismo\`):

1. `transcrever.py` (em `audio/`): faster-whisper com tempo por palavra.
   - GPU: precisa de `pip install nvidia-cublas-cu12 "nvidia-cudnn-cu12>=9,<10"`.
   - Use `condition_on_previous_text=False` e `temperature=0`, senão os retakes repetidos travam o Whisper no fallback de temperatura.
   - Para paralelizar, rode em trechos: `INI=0 DURA=600 SUF=_a python transcrever.py medium` (GPU) e `INI=600 SUF=_b DEV=cpu CT=int8 python transcrever.py small` (CPU).
2. `editar_voz.py`: acha cada frase da `NARRACAO-PARA-GRAVAR.md` na transcrição e fica com a última tentativa de cada frase.
   - Corta repetições internas e encurta pausas longas.
   - Números são comparados por extenso.
   - Saída: `voz_editada.wav` (loudnorm -16 LUFS) e `frases.json`.
3. `cenas.py`: plano de cenas, uma cena por intervalo de frases, nos 10 tipos de animação.
4. `montar.py`: gera o `proj.json` e renderiza o `motor.html` quadro a quadro (Playwright, 6 navegadores em paralelo, 24 qps). Depois junta com a voz.
   - `python montar.py 0 75` gera só uma prévia.
   - Os vídeos reais entram como sequências JPG em `frames/<clipe>/`, extraídas com ffmpeg dos clipes Pexels.
   - O mapa 3D sai de `teste-estilo/render_mapa3d.py quadros <pasta>`.
5. `sonorizar.py`: trilha por emoção (15 trechos, troca na frase indicada, crossfade de 1,5 s), ducking pela voz (fundo cerca de 15 dB abaixo da fala) e foley sincronizado com a entrada de cada objeto nas cenas (papel, carimbo, pincel, sino, página, água, bambu, máquina de escrever, swoosh de tinta mais impacto nas viradas de bloco). Mix final a -14 LUFS. Saída: `taoismo_final_v60.mp4`.
   - Músicas e efeitos: Pixabay, licença Pixabay, uso comercial. Só entram músicas **sem** o selo "Content ID Registered" na página (no Pixabay, cerca de 2 em cada 3 faixas têm esse selo e gerariam reivindicação no YouTube). Lista com links em `creditos-audio.csv`.
   - Download: a página da faixa traz o link `cdn.pixabay.com/download/audio/...mp3`, e o `curl` baixa direto com User-Agent de navegador e referer do pixabay.com.
