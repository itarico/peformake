# Monta o documentário do Taoísmo: cenas.py + frases.json (tempos da voz editada) -> proj.json -> quadros no motor.html -> MP4 com a voz.
# Uso: python montar.py            (vídeo inteiro)
#      python montar.py 0 40       (só de 0 a 40 s, para conferir)
import asyncio, json, pathlib, shutil, subprocess, sys
from playwright.async_api import async_playwright
from cenas import CENAS, BLOCOS

AQUI = pathlib.Path(__file__).resolve().parent
FPS, WORKERS = 24, 6

fr = json.loads((AQUI / 'frases.json').read_text(encoding='utf-8'))
F = {f['n']: f for f in fr['frases']}
DUR = fr['duracao']

def inicio(n):  # início falado da frase n (ou da próxima achada)
    while n not in F and n < 200: n += 1
    return F[n]['ini'] if n in F else DUR

cenas = []
for k, c in enumerate(CENAS):
    c = dict(c); a, b = c.pop('f')
    c['ini'] = 0.0 if k == 0 else round(inicio(a) - .2, 3)
    clip = c.pop('clip', None)
    if clip:
        n = len(list((AQUI / 'frames' / clip).glob('*.jpg')))
        c['frames'] = {'dir': f'frames/{clip}', 'n': n, 'hold': clip.startswith('mapa3d')}
    cenas.append(c)
for k in range(len(cenas)):
    cenas[k]['fim'] = cenas[k + 1]['ini'] if k + 1 < len(cenas) else DUR
blocos = [round(inicio(n) - .2, 3) for n in BLOCOS]
proj = {'cenas': cenas, 'frases': [{'texto': f['texto'], 'ini': f['ini'], 'fim': f['fim']} for f in fr['frases']], 'blocos': blocos}
(AQUI / 'proj.json').write_text(json.dumps(proj, ensure_ascii=False, indent=1), encoding='utf-8')
longas = [(i, c['tipo'], round(c['fim'] - c['ini'], 1)) for i, c in enumerate(cenas) if c['fim'] - c['ini'] > 40]
print('cenas', len(cenas), '· duração', round(DUR / 60, 2), 'min · cenas acima de 40 s:', longas)

t0 = float(sys.argv[1]) if len(sys.argv) > 1 else 0.0
t1 = float(sys.argv[2]) if len(sys.argv) > 2 else DUR
QD = AQUI / 'quadros_tmp'
if QD.exists(): shutil.rmtree(QD)
QD.mkdir()
idx = list(range(int(t0 * FPS), int(t1 * FPS)))

async def worker(p, w):
    b = await p.chromium.launch()
    pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
    await pg.goto((AQUI / 'motor.html').as_uri(), wait_until='networkidle')
    await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(800)
    await pg.evaluate('p => window.carregar(p)', proj)
    meus = idx[w::WORKERS]
    for j, i in enumerate(meus):
        await pg.evaluate(f'window.render({i / FPS})')
        await pg.screenshot(path=str(QD / f'{i - idx[0]:06d}.jpg'), type='jpeg', quality=90)
        if w == 0 and j % 120 == 0: print(f'{j * WORKERS}/{len(idx)}', flush=True)
    await b.close()

async def main():
    async with async_playwright() as p:
        await asyncio.gather(*[worker(p, w) for w in range(WORKERS)])
asyncio.run(main())

saida = AQUI / ('taoismo_final.mp4' if len(sys.argv) <= 1 else f'previa_{int(t0)}_{int(t1)}.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', str(QD / '%06d.jpg'),
                '-ss', str(t0), '-t', str(t1 - t0), '-i', str(AQUI / 'voz_editada.wav'),
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
                '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(saida)], check=True)
shutil.rmtree(QD)
print('ok', saida)
