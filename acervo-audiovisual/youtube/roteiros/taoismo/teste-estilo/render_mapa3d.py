# Renderiza mapa3d.html (three.js) quadro a quadro. Uso: python render_mapa3d.py [previa]
import asyncio, json, pathlib, shutil, subprocess, sys
from playwright.async_api import async_playwright
AQUI = pathlib.Path(__file__).resolve().parent
GEO = (AQUI / 'paises.geojson').read_text(encoding='utf-8')
FPS, DUR = 24, 12.0
PREVIA = len(sys.argv) > 1

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
        await pg.add_init_script('window.__GEO__=' + GEO + ';')
        await pg.goto((AQUI / 'mapa3d.html').as_uri(), wait_until='networkidle')
        await pg.wait_for_function('window.__pronto===true', timeout=60000); await pg.wait_for_timeout(800)
        if PREVIA:
            for t in (8.6, 10.0, 11.5):
                await pg.evaluate(f'window.render({t})'); await pg.screenshot(path=str(AQUI / f'_m{t}.jpg'), type='jpeg', quality=80)
        else:
            qd = AQUI / 'q3d'; shutil.rmtree(qd, ignore_errors=True); qd.mkdir()
            for i in range(int(FPS * DUR)):
                await pg.evaluate(f'window.render({i / FPS})'); await pg.screenshot(path=str(qd / f'{i:05d}.jpg'), type='jpeg', quality=92)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', str(qd / '%05d.jpg'), '-c:v', 'libx264',
                            '-pix_fmt', 'yuv420p', '-crf', '20', str(AQUI / 'teste_mapa3d.mp4')], check=True)
            shutil.rmtree(qd)
        await b.close()
asyncio.run(main()); print('ok')
