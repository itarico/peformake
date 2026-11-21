# Monta o taoismo_final_v70.mp4 sem tocar nos arquivos do v60:
# 1) tira os quadros das 5 cenas do MP4 exportado pelo OpenMotion;
# 2) renderiza so esses 5 trechos no motor (copia motor_v70.html, com legenda, grao e vinheta por cima);
# 3) cola os 5 trechos sobre o video do v60 (taoismo_final.mp4) e junta o audio de mix_v70.wav.
# Uso: python montar_v70.py <export_openmotion.mp4>     (depois: python sonorizar_v70.py; python montar_v70.py --mux)
import asyncio, json, math, pathlib, shutil, subprocess, sys
AQUI = pathlib.Path(__file__).resolve().parent
MONT = AQUI.parent
FPS = 24
TAB = json.loads((AQUI / 'tabela_cenas.json').read_text(encoding='utf-8'))

def proj_v70():
    proj = json.loads((MONT / 'proj.json').read_text(encoding='utf-8'))
    for c in TAB:
        old = proj['cenas'][c['cena_idx']]
        assert abs(old['ini'] - c['inicio_filme']) < .01, (c['id'], old['ini'])
        n = len(list((AQUI / 'frames' / c['id']).glob('*.jpg')))
        proj['cenas'][c['cena_idx']] = {'tipo': 'om', 'om': c['id'], 'ini': old['ini'], 'fim': old['fim'],
                                        'frames': {'dir': f'frames/{c["id"]}', 'n': n, 'hold': True}}
    return proj

def motor():
    h = (MONT / 'motor.html').read_text(encoding='utf-8')
    h = h.replace('const T={', 'const T={\n om:{monta:c=>`<img id="v" style="position:absolute;inset:0;width:100%;height:100%">`,anima:()=>{}},', 1)
    h = h.replace("if(c.tipo!=='video_cheio'&&", "if(c.tipo!=='om'&&c.tipo!=='video_cheio'&&", 1)
    assert 'om:{monta' in h and "c.tipo!=='om'" in h
    (AQUI / 'motor_v70.html').write_text(h, encoding='utf-8')

def quadros(export):
    for c in TAB:
        d = AQUI / 'frames' / c['id']
        if d.exists(): shutil.rmtree(d)
        d.mkdir(parents=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-ss', f"{c['inicio_clip']:.4f}", '-i', str(export), '-t', str(c['dur']),
                        '-q:v', '2', str(d / '%05d.jpg')], check=True)

async def trechos(proj):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch()
        async def um(c):
            pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
            await pg.goto((AQUI / 'motor_v70.html').as_uri(), wait_until='networkidle')
            await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(800)
            await pg.evaluate('p => window.carregar(p)', proj)
            cena = proj['cenas'][c['cena_idx']]; qd = AQUI / f"quadros_{c['id']}"
            if qd.exists(): shutil.rmtree(qd)
            qd.mkdir()
            i0, i1 = math.ceil(cena['ini'] * FPS), math.ceil(cena['fim'] * FPS)
            for i in range(i0, i1):
                await pg.evaluate(f'window.render({(i + .001) / FPS})')
                await pg.screenshot(path=str(qd / f'{i - i0:06d}.jpg'), type='jpeg', quality=92)
            await pg.close()
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', str(qd / '%06d.jpg'), '-c:v', 'libx264',
                            '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', str(AQUI / f"trecho_{c['id']}.mp4")], check=True)
            shutil.rmtree(qd)
            print('trecho', c['id'], i0, i1, flush=True)
        await asyncio.gather(*[um(c) for c in TAB])
        await b.close()

def colar():
    # sobrepoe cada trecho no seu intervalo exato (em quadros) do video do v60
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', str(MONT / 'taoismo_final.mp4')]
    filt, ult = [], '0:v'
    for k, c in enumerate(TAB):
        cena = json.loads((MONT / 'proj.json').read_text(encoding='utf-8'))['cenas'][c['cena_idx']]
        i0, i1 = math.ceil(cena['ini'] * FPS), math.ceil(cena['fim'] * FPS)
        cmd += ['-i', str(AQUI / f"trecho_{c['id']}.mp4")]
        filt.append(f"[{k + 1}:v]setpts=PTS+{i0}/{FPS}/TB[t{k}]")
        filt.append(f"[{ult}][t{k}]overlay=enable='between(n,{i0},{i1 - 1})':eof_action=pass[o{k}]"); ult = f'o{k}'
    cmd += ['-filter_complex', ';'.join(filt), '-map', f'[{ult}]', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
            '-preset', 'medium', str(AQUI / 'video_v70.mp4')]
    subprocess.run(cmd, check=True); print('ok video_v70.mp4')

def mux():
    saida = MONT / 'taoismo_final_v70.mp4'
    assert not saida.exists() or '--forcar' in sys.argv, 'v70 ja existe'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(AQUI / 'video_v70.mp4'), '-i', str(AQUI / 'mix_v70.wav'), '-map', '0:v', '-map', '1:a',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', str(saida)], check=True)
    print('ok', saida)

if __name__ == '__main__':
    if sys.argv[1:2] == ['--mux']: mux(); sys.exit()
    quadros(pathlib.Path(sys.argv[1])); motor(); proj = proj_v70()
    (AQUI / 'proj_v70.json').write_text(json.dumps(proj, ensure_ascii=False, indent=1), encoding='utf-8')
    asyncio.run(trechos(proj)); colar()
