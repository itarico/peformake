"""Baixa trilhas e efeitos do Pixabay (todos conferidos SEM "Content ID Registered" na página em 21/11/2026)
e escreve creditos-audio.csv. Uso: python baixar_audio.py <pasta audio>"""
import sys, urllib.request, pathlib, csv, time
A = pathlib.Path(sys.argv[1])
L = [  # arquivo, página, cdn
('trilha/gancho.mp3','music/beats-miyagisama-lit-fuse-cinematic-drama-tension-urgency-8820','2021/09/29/audio_c77e0ef59b'),
('trilha/panem.mp3','music/ambient-dystopian-umbra-417001','2025/10/08/audio_564c25d64f'),
('trilha/marcha.mp3','music/main-title-ironbound-march-v2-450731','2025/12/12/audio_063540cb30'),
('trilha/viradas.mp3','music/main-title-dramatic-documentary-background-144035','2023/03/26/audio_c38882e2b2'),
('trilha/pulso.mp3','music/epic-classical-epic-suspense-build-up-cinematic-rising-tension-score-447939','2025/12/12/audio_bd8c844d8e'),
('trilha/capital.mp3','music/orchestral-dark-cinematic-epic-orchestral-background-01-527553','2026/05/01/audio_b1421d2d8f'),
('trilha/espelho.mp3','music/beautiful-plays-sad-631948','2026/11/04/audio_60097cdb28'),
('trilha/radio1940.mp3','music/big-band-jive-parade-1940s-style-big-band-music-448088','2025/12/06/audio_36e9788b11'),
('sfx/canhao.mp3','sound-effects/film-special-effects-cannon-shot-352459','2025/05/31/audio_69a27fd520'),
('sfx/canhao2.mp3','sound-effects/horror-powerful-cannon-shot-02-487887','2026/02/20/audio_bdc6365fca'),
('sfx/moedas.mp3','sound-effects/film-special-effects-coins-drop-1-404409','2025/09/14/audio_05ffa0af62'),
('sfx/moeda.mp3','sound-effects/film-special-effects-coin-drop-229314','2024/08/03/audio_87adbd41ef'),
('sfx/glitch.mp3','sound-effects/film-special-effects-glitch-effect-1-397982','2025/09/01/audio_b5effe8cf7'),
('sfx/coracao.mp3','sound-effects/film-special-effects-intense-cinematic-heartbeat-sound-effect-584627','2026/08/12/audio_5ab3d58586'),
('sfx/notificacao.mp3','sound-effects/technology-new-notification-040-493469','2026/03/01/audio_4182fd0ce7'),
('sfx/papeis.mp3','sound-effects/musical-shuffle-papers-1-88826','2022/03/15/audio_ba3446b013'),
('sfx/radio_estatica.mp3','sound-effects/film-special-effects-radio-static-323621','2025/04/06/audio_7ad9983b3e'),
('sfx/tv_estatica.mp3','sound-effects/film-special-effects-old-tv-with-bad-signal-static-changing-channels-577996','2026/08/01/audio_ebd4178e68'),
('sfx/riser.mp3','sound-effects/film-special-effects-cinematic-riser-03-414575','2025/10/10/audio_cda4228686'),
('sfx/whoosh.mp3','sound-effects/film-special-effects-simple-whoosh-382724','2025/07/30/audio_b3087a581e'),
('sfx/whoosh2.mp3','sound-effects/film-special-effects-whoosh-cinematic-376875','2025/07/18/audio_f5a010a2d7'),
('sfx/beep.mp3','sound-effects/film-special-effects-digital-beep-151921','2023/05/31/audio_92281e08cb'),
('sfx/ui.mp3','sound-effects/film-special-effects-ui-interface-03-277552','2024/12/17/audio_f8b21a6462'),
('sfx/multidao.mp3','sound-effects/people-crowd-cheer-406646','2025/09/18/audio_94652bbdb5'),
]
rows = []
for arq, pag, cdn in L:
    p = A / arq
    if not p.exists():
        r = urllib.request.Request(f'https://cdn.pixabay.com/download/audio/{cdn}.mp3', headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://pixabay.com/'})
        p.write_bytes(urllib.request.urlopen(r, timeout=60).read()); time.sleep(1)
    rows.append([arq, pag.split('/')[-1], f'https://pixabay.com/{pag}/', f'https://cdn.pixabay.com/download/audio/{cdn}.mp3',
                 'Pixabay Content License (uso comercial livre, sem atribuição obrigatória); sem "Content ID Registered" na página em 21/11/2026'])
    print(arq, p.stat().st_size)
REUSO = ['carimbo_1', 'carimbo_2', 'papel_1', 'papel_2', 'maquina_1', 'impacto_1', 'impacto_2', 'impacto_3', 'pagina_1']
with open(A / 'creditos-audio.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f); w.writerow(['arquivo', 'nome no Pixabay', 'página', 'download', 'licença']); w.writerows(rows)
    for r in csv.reader(open('C:/Claude/canal-youtube/taoismo/audio/creditos-audio.csv', encoding='utf-8')):
        if any(r[0].endswith(x + '.mp3') for x in REUSO): w.writerow(['taoismo/' + r[0]] + r[1:])
