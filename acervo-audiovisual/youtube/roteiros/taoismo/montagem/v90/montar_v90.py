# Taoismo v90: base v60 (motor.html + cenas) sobre a voz da IA (voz_ia.wav), cenas casadas pelo texto da frase (frases_v3.json).
# Uso: python v90/montar_v90.py linha | python v90/montar_v90.py 0 64 (trecho) | python v90/montar_v90.py tudo
import asyncio, json, pathlib, shutil, subprocess, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from cenas_v90 import CENAS, BLOCOS
MONT = pathlib.Path(__file__).resolve().parent.parent; V90 = MONT / 'v90'
TRAB = pathlib.Path('G:/lucas/taoismo_v90'); TRAB.mkdir(parents=True, exist_ok=True)
FPS, WORKERS = 24, 6
fr = json.loads((V90 / 'frases_v3.json').read_text(encoding='utf-8')); DUR = fr['duracao']
ORD = [str(f['n']) for f in fr['frases']]; F = {str(f['n']): f for f in fr['frases']}
def inicio(n):
    n = str(n); return F[n]['ini']
cenas = []
for k, c in enumerate(CENAS):
    c = dict(c); a, b = c.pop('f')
    c['ini'] = 0.0 if k == 0 else round(inicio(a) - .2, 3)
    clip = c.pop('clip', None)
    if clip:
        n = len(list((MONT / 'frames' / clip).glob('*.jpg'))); c['frames'] = {'dir': f'frames/{clip}', 'n': n, 'hold': clip.startswith('mapa3d')}
    cenas.append(c)
for k in range(len(cenas)): cenas[k]['fim'] = cenas[k + 1]['ini'] if k + 1 < len(cenas) else DUR
# cenas OpenMotion da v70: os quadros ja renderizados sao reamostrados para a duracao nova da frase (sem perder nenhuma animacao)
OMSRC = MONT / 'openmotion_v70' / 'frames'
for c in cenas:
    if c['tipo'] != 'om': continue
    src = sorted((OMSRC / c['om']).glob('*.jpg')); i0 = int(round(c.pop('om_ini', 0) * FPS))
    dst = V90 / 'om' / c['om']; shutil.rmtree(dst, ignore_errors=True); dst.mkdir(parents=True)
    n = max(1, round((c['fim'] - c['ini']) * FPS)); usa = src[i0:]
    for j in range(n): shutil.copyfile(usa[min(len(usa) - 1, int(j * len(usa) / n))], dst / f'{j + 1:05d}.jpg')
    c['frames'] = {'dir': f'v90/om/{c["om"]}', 'n': n, 'hold': True}
blocos = [round(inicio(n) - .2, 3) for n in BLOCOS]
proj = {'cenas': cenas, 'frases': [{'texto': f['texto'], 'ini': f['ini'], 'fim': f['fim']} for f in fr['frases']], 'blocos': blocos}
(V90 / 'proj_v90.json').write_text(json.dumps(proj, ensure_ascii=False, indent=1), encoding='utf-8')
print('cenas', len(cenas), 'duração', round(DUR / 60, 2), 'min; mais longas:', sorted([(round(c['fim'] - c['ini'], 1), c['tipo']) for c in cenas], reverse=True)[:3])
if sys.argv[1:2] == ['linha']: sys.exit()
t0 = 0.0 if sys.argv[1] == 'tudo' else float(sys.argv[1]); t1 = DUR if sys.argv[1] == 'tudo' else float(sys.argv[2])
QD = TRAB / 'quadros'; shutil.rmtree(QD, ignore_errors=True); QD.mkdir()
idx = list(range(int(t0 * FPS), int(t1 * FPS)))
async def worker(p, w):
    b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
    await pg.goto((MONT / 'motor_v90.html').as_uri(), wait_until='networkidle'); await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(800)
    await pg.evaluate('p => window.carregar(p)', proj)
    for j, i in enumerate(idx[w::WORKERS]):
        await pg.evaluate(f'window.render({i / FPS})')
        await pg.screenshot(path=str(QD / f'{i - idx[0]:06d}.jpg'), type='jpeg', quality=92)
    await b.close()
async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p: await asyncio.gather(*[worker(p, w) for w in range(WORKERS)])
asyncio.run(main())
nome = 'video_v90.mp4' if sys.argv[1] == 'tudo' else f'trecho_{int(t0)}_{int(t1)}.mp4'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', str(QD / '%06d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', str(TRAB / nome)], check=True)
shutil.rmtree(QD); print('ok', TRAB / nome)
