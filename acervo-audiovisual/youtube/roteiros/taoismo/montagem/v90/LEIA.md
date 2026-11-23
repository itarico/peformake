# Taoísmo v90 (23/11/2026)

Voz gerada por IA pelo Italo (ElevenLabs) sobre a narração v3, com a abertura pela múmia Xin Zhui. Base: cenas da v60 (`cenas_v90.py`) e as 5 cenas OpenMotion da v70, reamostradas para a duração nova de cada frase. Imagens novas só onde a fala cita: múmia e reconstituição de Xin Zhui, colina, tumba do filho, laca, livraria, Sima Qian e Zhang Daoling. A trilha e os efeitos são os da v60, mais baixos a pedido do Italo.

Passo a passo: `alinhar_v3.py` (frases pelo texto da voz), `montar_v90.py linha`, `sonorizar_v90.py`, `montar_v90.py 0 64.5` (teste aprovado) e `montar_v90.py tudo`.

Entrega: `montagem/taoismo_final_v90.mp4` (1080p, 11:24, -13,8 LUFS, pico -2,0 dBFS) e `taoismo_final_v90_720p.mp4` (45,7 MB).

## v90 sem legenda (23/11/2026)

A legenda saiu da imagem (`#leg{display:none}` no `motor_v90.html`) e foi para `legenda_taoismo_v90.srt`, para subir no YouTube. A trilha desceu mais 6 dB porque o Italo achou a música mais alta que a narração, embora a medição desse 19 dB abaixo: a voz da IA é suave e precisa de mais folga. Agora a trilha fica 25 dB abaixo da voz na fala. Entrega: `taoismo_final_v90_sem_legenda.mp4` e `_720p.mp4` (-13,8 LUFS, pico -2,1 dBFS).
