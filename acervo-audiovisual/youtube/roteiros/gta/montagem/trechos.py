"""Trechos dos trailers oficiais (faixa V3): até 6 trechos de até 5 s, sem o som do trailer, numa moldura sobre a
cena (a cena por baixo é a alternativa pronta se o Content ID reclamar). Regra "meio-termo" do Italo (23/11/2026).
1) gera um MOV com alfa (ProRes 4444) por trecho, 1920x1080, com moldura creme, grão e crédito;
2) com --compor, sobrepõe os trechos no vídeo das cenas e grava o MP4 final de imagem.
Uso: python trechos.py <eventos.json> <pasta_trailers> <saida_dir> [--compor cenas.mp4 saida.mp4]"""
import json, subprocess, sys, pathlib
EV = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')); SRC = pathlib.Path(sys.argv[2]); OUT = pathlib.Path(sys.argv[3])
OUT.mkdir(parents=True, exist_ok=True)
FONTE = r'C\:/Claude/canal-youtube/gta6/midia/fontes/Anton-400.ttf'
CREME, ESCURO = '0xF1E6D2', '0x160A10'
GEO = {'monitor': (384, 170, 1152, 648), 'player': (355, 160, 1209, 680)}
arqs = []


def textos(t):
    """drawtext das palavras-chave que a cena de baixo mostraria nesse intervalo (Italo: texto não pode ficar atrás da foto)."""
    out = ''
    for x in t.get('textos', []):
        r = max(0.0, x['t'] - t['t']); txt = x['txt'].replace(':', r'\:')
        out += (f",drawtext=fontfile='{FONTE}':text='{txt}':fontsize={x.get('tam', 150)}:fontcolor={x.get('cor', CREME)}:shadowcolor={ESCURO}:shadowx=7:shadowy=7"
                f":x=(w-tw)/2:y=h*{x.get('y', 0.70)}:enable='gte(t,{r:.3f})'")
    return out


for k, t in enumerate(EV['trechos']):
    if t['geo'] == 'tela':   # plano gerado por IA (Nim): tela cheia, cor puxada para a paleta, grão e a marca ILUSTRAÇÃO
        saida = OUT / f'trecho_{k + 1:02d}.mov'; arqs.append(saida)
        vf = (f"[0:v]trim=start={t['ss']}:duration={t['dur']},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,"
              f"eq=saturation=0.7:contrast=1.08,colorbalance=rs=0.12:gs=-0.04:bs=0.06:rh=0.08:bh=-0.04,noise=alls=14:allf=t,vignette=PI/4,"
              f"drawtext=fontfile='{FONTE}':text='ILUSTRAÇÃO':fontsize=30:fontcolor={CREME}:box=1:boxcolor={ESCURO}@0.8:boxborderw=10:x=w-tw-60:y=50" + textos(t) + ",format=yuva444p10le")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(SRC / t['arq']), '-filter_complex', vf, '-an', '-c:v', 'prores_ks', '-profile:v', '4444',
                        '-pix_fmt', 'yuva444p10le', '-r', '24', str(saida)], check=True)
        print('ilustração', k + 1, t['t'], t['arq']); continue
    x, y, w, h = GEO[t['geo']]
    saida = OUT / f'trecho_{k + 1:02d}.mov'; arqs.append(saida)
    borda = 0 if t['geo'] == 'player' else 12
    cred = t['credito'].replace(':', r'\:')
    vf = (f"[0:v]trim=start={t['ss']}:duration={t['dur']},setpts=PTS-STARTPTS,scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
          f"noise=alls=10:allf=t,eq=saturation=0.85:contrast=1.05,pad={w + 2 * borda}:{h + 2 * borda}:{borda}:{borda}:color={CREME},format=yuva444p[v];"
          f"color=c=black@0.0:s=1920x1080:r=24:d={t['dur']},format=yuva444p[bg];"
          f"[bg][v]overlay={x - borda}:{y - borda}:format=auto,"
          f"drawtext=fontfile='{FONTE}':text='{cred}':fontsize=30:fontcolor={CREME}:box=1:boxcolor={ESCURO}@0.85:boxborderw=10:x={x}:y={y + h + borda + 18}" + textos(t) + ",format=yuva444p10le")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(SRC / t['arq']), '-filter_complex', vf, '-an', '-c:v', 'prores_ks', '-profile:v', '4444',
                    '-pix_fmt', 'yuva444p10le', '-r', '24', str(saida)], check=True)
    print('trecho', k + 1, t['t'], t['arq'], t['ss'], t['dur'])
json.dump([dict(t, mov=str(a)) for t, a in zip(EV['trechos'], arqs)], open(OUT / 'trechos.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
if '--compor' in sys.argv:
    i = sys.argv.index('--compor'); base, final = sys.argv[i + 1], sys.argv[i + 2]
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', base]
    for a in arqs: cmd += ['-i', str(a)]
    fc, ult = [], '0:v'
    for k, t in enumerate(EV['trechos']):
        fc.append(f"[{k + 1}:v]setpts=PTS+{t['t']}/TB[t{k}];[{ult}][t{k}]overlay=enable='between(t,{t['t']},{t['t'] + t['dur']})':eof_action=pass[o{k}]")
        ult = f'o{k}'
    cmd += ['-filter_complex', ';'.join(fc), '-map', f'[{ult}]', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', final]
    subprocess.run(cmd, check=True); print('composto', final)
