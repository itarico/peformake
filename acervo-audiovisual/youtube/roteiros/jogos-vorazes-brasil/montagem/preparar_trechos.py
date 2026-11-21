"""Trechos em movimento (até 5 s cada) dos trailers oficiais e de reality, no lugar dos stills em algumas cenas.
Cada trecho vira assets/video/filme/<nome>.mp4 (1760x880, cor contida como os stills, sem som) e o último quadro vira
assets/img/filme_<nome>.jpg (fica por baixo: se a cena for mais longa que o trecho, a imagem congela no fim).
Registro em creditos-trechos.csv (faixa V3 no Premiere, com alternativa). Uso: python preparar_trechos.py <midia>"""
import sys, pathlib, subprocess
MID = pathlib.Path(sys.argv[1]); T = MID / 'trechos'; A = MID / 'assets'
(A / 'video' / 'filme').mkdir(parents=True, exist_ok=True)
# nome: (arquivo, início, duração, origem)
TRECHOS = {
    't_colheita': ('mfmrPu43DF8', 56.5, 4.0, 'Jogos Vorazes (2012), trailer oficial, Lionsgate Movies (YouTube mfmrPu43DF8)'),
    't_arena':    ('mfmrPu43DF8', 145.3, 1.7, 'Jogos Vorazes (2012), trailer oficial, Lionsgate Movies (YouTube mfmrPu43DF8)'),
    't_capital':  ('mfmrPu43DF8', 82.0, 1.3, 'Jogos Vorazes (2012), trailer oficial, Lionsgate Movies (YouTube mfmrPu43DF8)'),
    't_saudacao': ('mfmrPu43DF8', 132.4, 1.5, 'Jogos Vorazes (2012), trailer oficial, Lionsgate Movies (YouTube mfmrPu43DF8)'),
    't_arena50':  ('nGuNhQhnLQo', 72.95, 1.55, 'Jogos Vorazes: Amanhecer na Colheita, trailer 2 oficial, Paris Filmes (YouTube nGuNhQhnLQo)'),
    't_plateia':  ('nGuNhQhnLQo', 118.25, 0.55, 'Jogos Vorazes: Amanhecer na Colheita, trailer 2 oficial, Paris Filmes (YouTube nGuNhQhnLQo)'),
    't_reality':  ('RwjdcS2neu0', 75.4, 3.6, 'Largados e Pelados Brasil: A Tribo, chamada oficial, Discovery Brasil (YouTube RwjdcS2neu0)'),
}
VF = '{corte}scale=1760:880:force_original_aspect_ratio=increase,crop=1760:880,fps=24,eq=saturation=0.62:contrast=1.06'
for nome, (src, ini, dur, _) in TRECHOS.items():
    v = A / 'video' / 'filme' / f'{nome}.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ini), '-i', str(T / f'{src}.mp4'), '-t', str(dur), '-an', '-vf', VF.format(corte='crop=iw*0.6:ih*0.6:iw*0.2:ih*0.18,' if src == 'RwjdcS2neu0' else 'crop=1920:800,'),
                    '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-g', '24', str(v)], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-sseof', '-0.1', '-i', str(v), '-frames:v', '1', '-q:v', '3', str(A / 'img' / f'filme_{nome}.jpg')], check=True)
    print(nome, dur, 's')
cred = MID.parent / 'creditos-trechos.csv'
linhas = cred.read_text(encoding='utf-8').splitlines() if cred.exists() else ['cena,still,tempo no vídeo (voz-guia),duração,origem,crédito na tela,alternativa pronta']
linhas = [l for l in linhas if not l.startswith('trecho:')]
for nome, (src, ini, dur, origem) in TRECHOS.items():
    cr = 'TRECHO: LARGADOS E PELADOS BRASIL · © DISCOVERY' if src == 'RwjdcS2neu0' else 'TRECHO DE TRAILER OFICIAL · JOGOS VORAZES · © LIONSGATE'
    linhas.append(f'trecho:{nome},trechos/{src}.mp4 a partir de {ini}s,(ver eventos.json),{dur}s,"{origem}",{cr},still do próprio quadro final (filme_{nome}.jpg)')
cred.write_text('\n'.join(linhas) + '\n', encoding='utf-8')
