# Renderiza animado.html quadro a quadro (24 qps) e junta em MP4 com ffmpeg.
import asyncio, base64, io, pathlib, subprocess, shutil
from PIL import Image
from playwright.async_api import async_playwright

AQUI = pathlib.Path(__file__).resolve().parent
M = pathlib.Path(r'C:\Claude\canal-youtube\taoismo\midia\00-abertura-mawangdui')
def img(nome, maxw=2000):
    im = Image.open(M / nome).convert('RGB')
    if im.width > maxw: im = im.resize((maxw, int(im.height * maxw / im.width)))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=88)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

html = (AQUI / 'animado.html').read_text(encoding='utf-8')
html = html.replace('url(TUMBA)', 'url(' + img('Coffin Chamber Viewed from Above (10113075253).jpg') + ')')
html = html.replace('url(CAIXAO)', 'url(' + img('Lacquer Coffin Unearthed from the 2nd-century-BC Han Tomb No.1 at Mawangdui 2011-07.JPG', 1200) + ')')
html = html.replace('url(MS)', 'url(' + img('Mawangdui LaoTsu Ms2.JPG') + ')')

FPS, DUR = 24, 20.0
QD = AQUI / 'quadros_tmp'
if QD.exists(): shutil.rmtree(QD)
QD.mkdir()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
        await pg.set_content(html, wait_until='networkidle'); await pg.wait_for_timeout(1200)
        n = int(FPS * DUR)
        for i in range(n):
            await pg.evaluate(f'window.render({i / FPS})')
            await pg.screenshot(path=str(QD / f'{i:05d}.jpg'), type='jpeg', quality=92)
            if i % 48 == 0: print('quadro', i, '/', n, flush=True)
        await b.close()
asyncio.run(main())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', str(QD / '%05d.jpg'),
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', str(AQUI / 'teste_transicoes.mp4')], check=True)
shutil.rmtree(QD)
print('ok', AQUI / 'teste_transicoes.mp4')
