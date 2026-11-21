"""Duas direções "material real" para tirar a cara de IA (retorno do Italo, 21/11/2026: o vetor liso em fundo preto entregava IA).
A: cartaz impresso da Capital (papel real, retícula de jornal, tinta que vaza, registro desalinhado, foto colada com fita).
B: transmissão da Capital (foto real em tela cheia, tarja de TV, chiado de tubo, mapa pequeno no canto).
Uso: python estilo_v2.py <midia> <saida>"""
import sys, pathlib, shutil, math
from PIL import Image, ImageOps, ImageDraw, ImageFilter, ImageEnhance
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from panem_ui import *
MID, OUT = map(pathlib.Path, sys.argv[1:3]); OUT.mkdir(parents=True, exist_ok=True)
if not (OUT / 'fontes').exists(): shutil.copytree(MID / 'fontes', OUT / 'fontes')
M = carregar_mapa(MID / 'geo' / 'mapa.json')

def reticula(src, dst, cor, passo=9, ang=15, larg=1100):
    """Retícula de jornal: pontos cujo tamanho segue o escuro da foto, numa cor de tinta, fundo transparente."""
    im = ImageOps.grayscale(Image.open(src)); im = ImageOps.equalize(ImageOps.autocontrast(im, 2))
    w = larg; h = int(im.height * w / im.width); im = im.resize((w, h))
    big = im.rotate(ang, expand=True, fillcolor=255)
    out = Image.new('L', big.size, 0); d = ImageDraw.Draw(out)
    for y in range(0, big.height, passo):
        for x in range(0, big.width, passo):
            v = 1 - big.getpixel((min(x, big.width - 1), min(y, big.height - 1))) / 255
            r = passo * 0.6 * math.sqrt(v) ** 1.15
            if r > 0.4: d.ellipse([x - r, y - r, x + r, y + r], fill=255)
    out = out.rotate(-ang, expand=False)
    cx, cy = out.width // 2, out.height // 2; out = out.crop((cx - w // 2, cy - h // 2, cx - w // 2 + w, cy - h // 2 + h))
    out = out.filter(ImageFilter.GaussianBlur(0.6))
    rgba = Image.new('RGBA', out.size, cor); rgba.putalpha(out); rgba.save(dst)

reticula(MID / 'img' / 'carajas_satelite.jpg', OUT / 'carajas_ret_preto.png', (24, 18, 14), passo=11)
reticula(MID / 'img' / 'carajas_satelite.jpg', OUT / 'carajas_ret_verm.png', (178, 34, 26), passo=9, ang=75)
shutil.copy(MID / 'tex' / 'Paper006.jpg', OUT / 'papel.jpg'); shutil.copy(MID / 'tex' / 'Paper001.jpg', OUT / 'papel2.jpg')
# foto para a TV: corte e grade fria/escura
foto = Image.open(MID / 'img' / 'carajas_satelite.jpg').convert('RGB').resize((1920, 1280)).crop((0, 100, 1920, 1180))
foto = ImageEnhance.Color(foto).enhance(0.55); foto = ImageEnhance.Contrast(foto).enhance(1.25); foto = ImageEnhance.Brightness(foto).enhance(0.8)
foto.save(OUT / 'carajas_tv.jpg', quality=92)

TINTA = '''<filter id="tinta" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="3.5"/><feGaussianBlur stdDeviation="0.35"/></filter>
<filter id="gasto"><feTurbulence type="fractalNoise" baseFrequency="0.035 0.6" numOctaves="3" seed="9" result="t"/>
<feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.6" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>'''

def pagina(corpo, css=''):
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{fontes_css()}
body{{margin:0;background:#000}}.tela{{position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden}}.abs{{position:absolute}}
.regime{{font-family:"BigS";font-weight:900;text-transform:uppercase;line-height:.86}}.num{{font-family:"Oswald";font-weight:700}}
.mono{{font-family:"Plex";font-weight:500;letter-spacing:2px;text-transform:uppercase}}{css}</style></head>
<body><svg width="0" height="0" style="position:absolute"><defs>{TINTA}</defs></svg><div class="tela">{corpo}</div></body></html>'''

# ---------------- A. cartaz impresso
def mapa_impresso(x, y, tam, deslize=0):
    """Mapa impresso: preto e vermelho em chapas separadas, levemente fora de registro, com tinta irregular."""
    preto = ''.join(f'<path d="{u["d"]}" fill="none" stroke="#1d1712" stroke-width="2.2" vector-effect="non-scaling-stroke"/>' for u in M.values())
    verm = ''.join(f'<path d="{u["d"]}" fill="#b3261e" fill-opacity=".92"/>' for k, u in M.items() if u['dist'] == 12)
    ouro = f'<circle cx="{M["DF"]["cx"]}" cy="{M["DF"]["cy"]}" r="11" fill="#a8832e"/>'
    return (f'<svg class="abs" style="left:{x + deslize}px;top:{y + 2}px;mix-blend-mode:multiply" width="{tam}" height="{tam}" viewBox="0 0 1000 1000"><g filter="url(#tinta)">{verm}{ouro}</g></svg>'
            f'<svg class="abs" style="left:{x}px;top:{y}px;mix-blend-mode:multiply" width="{tam}" height="{tam}" viewBox="0 0 1000 1000"><g filter="url(#tinta)">{preto}</g></svg>')

A = f'''<img class="abs" src="papel.jpg" style="left:0;top:0;width:1920px;height:1080px;object-fit:cover;filter:sepia(.25) brightness(1.03)">
<div class="abs" style="inset:0;background:radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 50%,rgba(60,35,15,.35) 100%)"></div>
<div class="abs regime" style="left:96px;top:64px;font-size:40px;color:#b3261e;mix-blend-mode:multiply;filter:url(#tinta);letter-spacing:2px">COMUNICADO Nº 0417 DA CAPITAL · CENSO DOS DISTRITOS</div>
<div class="abs" style="left:96px;top:118px;width:1728px;height:6px;background:#1d1712;mix-blend-mode:multiply;filter:url(#tinta)"></div>
<div class="abs regime" style="left:90px;top:170px;font-size:300px;color:#1d1712;mix-blend-mode:multiply;filter:url(#tinta)">PARÁ</div>
<div class="abs regime" style="left:96px;top:440px;font-size:92px;color:#b3261e;mix-blend-mode:multiply;filter:url(#tinta)">DISTRITO XII · MINERAÇÃO</div>
<div class="abs" style="left:96px;top:600px;transform:rotate(-2.2deg);width:760px;height:400px;overflow:hidden;background:#f2ead8;box-shadow:0 10px 18px rgba(40,20,0,.35)">
 <img src="papel2.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35">
 <img src="carajas_ret_preto.png" style="position:absolute;left:-170px;top:-120px;width:1100px;mix-blend-mode:multiply;opacity:.95">
 <div class="mono" style="position:absolute;left:14px;bottom:8px;font-size:15px;color:#1d1712;background:#efe6d2;padding:2px 6px">MINA DE CARAJÁS, VISTA DO SATÉLITE · NASA/JPL</div></div>
<div class="abs" style="left:110px;top:582px;width:120px;height:38px;background:rgba(235,225,200,.75);transform:rotate(-8deg);box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
<div class="abs" style="left:760px;top:574px;width:120px;height:38px;background:rgba(235,225,200,.75);transform:rotate(7deg);box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
{mapa_impresso(1000, 190, 820, 5)}
<div class="abs" style="left:1350px;top:300px;transform:rotate(-11deg);border:9px solid #b3261e;padding:6px 26px 0;mix-blend-mode:multiply;filter:url(#gasto)">
 <span class="regime" style="font-size:150px;color:#b3261e">XII</span></div>
<div class="abs num" style="left:1000px;top:770px;font-size:170px;line-height:1;color:#b3261e;mix-blend-mode:multiply;filter:url(#tinta)">39%</div>
<div class="abs regime" style="left:1420px;top:790px;font-size:58px;color:#1d1712;mix-blend-mode:multiply;filter:url(#tinta)">DOS ROYALTIES<br>DA MINERAÇÃO</div>
<div class="abs mono" style="left:1424px;top:920px;font-size:17px;color:#4a3d30">FONTE: ANM · CFEM 2025</div>'''

# ---------------- B. transmissão da Capital
B = f'''<img class="abs" src="carajas_tv.jpg" style="left:0;top:0;width:1920px;height:1080px;object-fit:cover">
<img class="abs" src="carajas_tv.jpg" style="left:4px;top:0;width:1920px;height:1080px;object-fit:cover;mix-blend-mode:screen;opacity:.18;filter:sepia(1) saturate(6) hue-rotate(-40deg)">
<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(10,8,7,.82) 0%,rgba(10,8,7,.35) 45%,rgba(10,8,7,0) 70%)"></div>
<div class="abs" style="inset:0;opacity:.22;background:repeating-linear-gradient(0deg,rgba(0,0,0,.9) 0 2px,transparent 2px 4px)"></div>
<div class="abs" style="inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 58%,rgba(0,0,0,.7) 100%)"></div>
<div class="abs mono" style="left:72px;top:58px;font-size:24px;color:#edece6"><span style="color:#e33">●</span> CAPITAL · AO VIVO · CENSO DOS DISTRITOS</div>
<div class="abs mono" style="right:72px;top:58px;font-size:22px;color:#edece6">DISTRITO 12 · 06°04′S 50°10′O</div>
<div class="abs num" style="left:88px;top:260px;font-size:280px;line-height:1;color:#f3efe6;text-shadow:0 4px 30px rgba(0,0,0,.5)">39%</div>
<div class="abs" style="left:96px;top:560px;font-family:Oswald;font-weight:500;font-size:58px;line-height:1.05;color:#f3efe6">dos royalties de mineração<br>do Brasil saem daqui</div>
<div class="abs" style="left:0;top:868px;width:1920px;height:132px;background:rgba(14,11,10,.92)"></div>
<div class="abs" style="left:0;top:868px;width:300px;height:132px;background:#b3261e;display:flex;align-items:center;justify-content:center">
 <span class="regime" style="font-size:110px;color:#f3efe6">XII</span></div>
<div class="abs" style="left:336px;top:884px;font-family:Oswald;font-weight:600;font-size:56px;color:#f3efe6">PARÁ · MINA DE CARAJÁS</div>
<div class="abs mono" style="left:338px;top:956px;font-size:20px;color:#bdb6aa">IMAGEM DE SATÉLITE: NASA/JPL · FONTE DO DADO: ANM, CFEM 2025</div>
<div class="abs" style="right:72px;top:620px;width:220px;height:220px;background:rgba(14,11,10,.75);padding:10px">{svg_mapa(M, {12: 'aceso'}, 10, 10, 200, 'bm', numerais=False)}</div>'''

for nome, corpo in [('A_cartaz', A), ('B_transmissao', B)]:
    (OUT / f'{nome}.html').write_text(pagina(corpo), encoding='utf-8')
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome'); pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    for nome in ['A_cartaz', 'B_transmissao']:
        pg.goto((OUT / f'{nome}.html').as_uri()); pg.wait_for_timeout(900); pg.screenshot(path=str(OUT / f'{nome}.png'))
    b.close()
print('ok')
