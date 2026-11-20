# Teste de estilo do vídeo do Taoísmo: 3 quadros 1920x1080 (mesa 2,5D em papel de arroz, tinta e carimbo vermelho).
import asyncio, base64, pathlib, io
from PIL import Image
from playwright.async_api import async_playwright

M = pathlib.Path(r'C:\Claude\canal-youtube\taoismo\midia\00-abertura-mawangdui')
OUT = pathlib.Path(__file__).resolve().parent

def img(nome, maxw=2400):
    im = Image.open(M / nome).convert('RGB')
    if im.width > maxw: im = im.resize((maxw, int(im.height * maxw / im.width)))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=90)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

MS = img('Mawangdui LaoTsu Ms2.JPG')
TUMBA = img('Coffin Chamber Viewed from Above (10113075253).jpg')
CAIXAO = img('Lacquer Coffin Unearthed from the 2nd-century-BC Han Tomb No.1 at Mawangdui 2011-07.JPG', 1400)

PAPEL = '#EFE4CC'; TINTA = '#1A1714'; VERM = '#B3261E'; JADE = '#3F6B5A'
CSS = f"""
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Noto+Serif+SC:wght@600;900&family=Courier+Prime:wght@700&family=Inter:wght@500;600&display=swap');
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1920px;height:1080px;overflow:hidden;background:{PAPEL};position:relative;font-family:'Cormorant Garamond',serif;color:{TINTA}}}
.papel{{position:absolute;inset:0;background:
  radial-gradient(ellipse at 50% 45%, rgba(255,250,235,.9) 0%, rgba(239,228,204,0) 55%),
  radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(70,45,15,.38) 100%), {PAPEL}}}
.grao{{position:absolute;inset:0;opacity:.32;mix-blend-mode:multiply;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .35  0 0 0 0 .25  0 0 0 0 .12  0 0 0 .55 0'/></filter><rect width='600' height='600' filter='url(%23n)'/></svg>")}}
.fibras{{position:absolute;inset:0;opacity:.18;mix-blend-mode:multiply;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='900' height='900'><filter id='f'><feTurbulence type='turbulence' baseFrequency='.004 .09' numOctaves='2'/><feColorMatrix values='0 0 0 0 .4  0 0 0 0 .3  0 0 0 0 .15  0 0 0 .7 0'/></filter><rect width='900' height='900' filter='url(%23f)'/></svg>")}}
.heroi{{position:absolute;background-size:cover;background-position:center;box-shadow:14px 22px 40px rgba(50,30,5,.45), 0 0 0 1px rgba(0,0,0,.05)}}
.rasgado{{clip-path:polygon(0 1%,4% 0,9% 1.2%,15% .3%,22% 1%,30% 0,38% 1.1%,47% .2%,55% 1%,63% 0,71% 1.3%,80% .4%,88% 1%,95% 0,100% 1%,99.2% 8%,100% 17%,99.3% 27%,100% 38%,99.4% 50%,100% 61%,99.2% 72%,100% 83%,99.4% 93%,100% 99%,94% 100%,86% 99%,77% 100%,68% 99.2%,59% 100%,50% 99%,41% 100%,32% 99.1%,23% 100%,14% 99%,6% 100%,0 99%,.7% 90%,0 80%,.8% 68%,0 56%,.6% 44%,0 33%,.8% 21%,0 10%)}}
.manchete{{font-family:'Cormorant Garamond';font-weight:700;letter-spacing:2px;text-transform:uppercase;line-height:.95}}
.data{{font-family:'Courier Prime';font-weight:700;letter-spacing:2px}}
.han{{font-family:'Noto Serif SC';font-weight:900}}
.legenda{{position:absolute;left:0;right:0;bottom:70px;text-align:center;font-family:'Inter';font-weight:600;font-size:34px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.8),0 0 2px #000}}
.selo{{position:absolute;width:118px;height:118px;border:6px solid {VERM};color:{VERM};display:flex;align-items:center;justify-content:center;font-family:'Noto Serif SC';font-weight:900;font-size:44px;line-height:1;transform:rotate(-6deg);opacity:.88;border-radius:8px;text-align:center}}
.fonte{{position:absolute;font-family:'Inter';font-weight:500;font-size:20px;letter-spacing:1px;color:rgba(26,23,20,.65)}}
"""
def page(b): return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="papel"></div><div class="fibras"></div><div class="grao"></div>{b}</body></html>'

Q = {}
# Quadro 1 · "Ele estava de trás para frente" (o rolo partido e as metades trocando)
Q['1_mesa_rolo_de_tras_para_frente'] = page(f"""
<div class="heroi rasgado" style="left:520px;top:120px;width:380px;height:420px;background-image:url({MS});background-position:center 100%;transform:rotate(-2.5deg)"></div>
<div class="heroi rasgado" style="left:520px;top:520px;width:380px;height:420px;background-image:url({MS});background-position:center 0%;transform:rotate(1.5deg)"></div>
<svg style="position:absolute;left:930px;top:250px" width="150" height="560" viewBox="0 0 150 560"><defs><filter id="r"><feTurbulence baseFrequency=".04" numOctaves="2"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter></defs>
 <g filter="url(#r)" fill="none" stroke="{VERM}" stroke-width="9" stroke-linecap="round"><path d="M20 60 C 120 140, 120 420, 30 500"/><path d="M30 500 l 34 -6 M30 500 l 8 -32"/><path d="M40 480 C -40 400, -40 160, 50 80" opacity=".0"/></g></svg>
<div class="han" style="position:absolute;left:400px;top:330px;font-size:120px;color:{TINTA};opacity:.9">德</div>
<div class="han" style="position:absolute;left:400px;top:690px;font-size:120px;color:{TINTA};opacity:.9">道</div>
<div style="position:absolute;left:1120px;top:330px;width:700px">
  <div class="data" style="font-size:30px;color:{VERM}">MAWANGDUI · 168 a.C.</div>
  <div class="manchete" style="font-size:112px;margin-top:18px">De trás<br>para <span style="color:{VERM}">frente</span></div>
  <div style="font-size:40px;font-style:italic;margin-top:26px">o Te vinha antes do Tao</div></div>
<div class="selo" style="left:1640px;top:110px">道德<br>經</div>
<div class="fonte" style="left:520px;top:950px">Manuscrito B do Laozi em seda · Mawangdui · domínio público</div>
<div class="legenda">Ele estava de trás para frente.</div>""")

# Quadro 2 · diagrama do wu wei (força contra fluxo), traço de tinta
Q['2_diagrama_wu_wei'] = page(f"""
<svg style="position:absolute;inset:0" width="1920" height="1080" viewBox="0 0 1920 1080"><defs>
 <filter id="tinta"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="4"/><feDisplacementMap in="SourceGraphic" scale="14"/></filter>
 <filter id="tinta2"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="2" seed="9"/><feDisplacementMap in="SourceGraphic" scale="8"/></filter></defs>
 <g filter="url(#tinta)"><path d="M 900 420 C 990 330, 1090 360, 1110 470 C 1130 580, 1040 660, 950 640 C 860 620, 820 500, 900 420 Z" fill="{TINTA}" opacity=".92"/></g>
 <g filter="url(#tinta2)" fill="none" stroke-linecap="round">
  <path d="M 200 380 L 840 470" stroke="{VERM}" stroke-width="22"/>
  <path d="M 845 445 l 40 -40 M 850 480 l 50 10 M 840 500 l 20 45" stroke="{VERM}" stroke-width="9"/>
  <path d="M 200 720 C 600 720, 760 760, 880 760 C 1050 760, 1150 690, 1240 640 C 1360 575, 1500 600, 1720 640" stroke="{JADE}" stroke-width="22" opacity=".95"/>
  <path d="M 1690 610 l 40 30 l -46 22" stroke="{JADE}" stroke-width="12"/></g>
</svg>
<div style="position:absolute;left:200px;top:300px"><div class="manchete" style="font-size:52px;color:{VERM}">Forçar</div></div>
<div style="position:absolute;left:200px;top:770px"><div class="manchete" style="font-size:52px;color:{JADE}">Contornar</div></div>
<div style="position:absolute;right:160px;top:150px;text-align:right"><div class="han" style="font-size:150px;line-height:1">無為</div>
 <div class="manchete" style="font-size:64px;margin-top:10px">Wu wei</div><div style="font-size:38px;font-style:italic">agir sem forçar</div></div>
<div class="selo" style="left:120px;top:90px">水</div>
<div class="legenda">Ela não vence a pedra no choque. Ela vence porque não para.</div>""")

# Quadro 3 · abertura: a câmara da tumba vista de cima + o caixão de laca
Q['3_abertura_tumba'] = page(f"""
<div class="heroi rasgado" style="left:170px;top:150px;width:1050px;height:700px;background-image:url({TUMBA});transform:rotate(-1.5deg)"></div>
<div class="heroi" style="left:1180px;top:560px;width:520px;height:390px;background-image:url({CAIXAO});border:14px solid #F7F1E3;transform:rotate(4deg)"></div>
<div style="position:absolute;left:1290px;top:150px;width:520px">
  <div class="data" style="font-size:34px;color:{VERM}">CHANGSHA · 1973</div>
  <div class="manchete" style="font-size:84px;margin-top:14px">Fechada há mais de dois mil anos</div></div>
<div class="selo" style="left:1700px;top:420px">墓</div>
<div class="fonte" style="left:170px;top:880px">Câmara funerária de Mawangdui, Museu de Hunan · CC0 · Caixão de laca, tumba 1 · CC BY-SA 4.0</div>
<div class="legenda">Em 1973, no sul da China, arqueólogos abriram uma tumba...</div>""")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
        for n, h in Q.items():
            await pg.set_content(h, wait_until='networkidle'); await pg.wait_for_timeout(600)
            await pg.screenshot(path=str(OUT / f'{n}.png')); print(n)
        await b.close()
asyncio.run(main())
