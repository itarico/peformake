# Estruturas do vídeo do Taoísmo (mesmo estilo aprovado: papel de arroz, tinta, carimbo vermelho, verde-jade).
# Um quadro 1920x1080 por estrutura, para aprovação. Inspirações do Tinocando: título de capítulo, citação em cartão,
# lugar circulado a tinta no mapa, texto atrás da figura na pintura.
import asyncio, base64, io, pathlib, sys
from PIL import Image
from playwright.async_api import async_playwright

AQUI = pathlib.Path(__file__).resolve().parent
MID = pathlib.Path(r'C:\Claude\canal-youtube\taoismo\midia')
src = (AQUI / 'quadros.py').read_text(encoding='utf-8')
CSS = src[src.index('CSS = f"""') + 10: src.index('"""\ndef page')]
PAPEL = '#EFE4CC'; TINTA = '#1A1714'; VERM = '#B3261E'; JADE = '#3F6B5A'
CSS = CSS.replace('{PAPEL}', PAPEL).replace('{TINTA}', TINTA).replace('{VERM}', VERM).replace('{JADE}', JADE).replace('{{', '{').replace('}}', '}')
def page(b): return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="papel"></div><div class="fibras"></div><div class="grao"></div>{b}</body></html>'
def img(p, maxw=2200):
    im = Image.open(p).convert('RGB')
    if im.width > maxw: im = im.resize((maxw, int(im.height * maxw / im.width)))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=88); return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
def acha(pasta, *chaves):
    for f in sorted((MID / pasta).glob('*')):
        if f.stat().st_size > 2000 and all(k.lower() in f.name.lower() for k in chaves): return f
    return None
FILTRO = '<defs><filter id="t"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="3" seed="5"/><feDisplacementMap in="SourceGraphic" scale="7"/></filter></defs>'

Q = {}
# 1 · Título de capítulo (abre cada bloco)
Q['01_titulo_capitulo'] = page(f"""
<div style="position:absolute;left:0;right:0;top:330px;text-align:center">
 <div class="data" style="font-size:30px;color:{VERM}">CAPÍTULO 2</div>
 <div class="manchete" style="font-size:150px;margin-top:20px">A lenda</div>
 <div style="font-size:44px;font-style:italic;margin-top:10px">do velho mestre</div></div>
<div class="han" style="position:absolute;left:0;right:0;top:120px;text-align:center;font-size:520px;opacity:.06;line-height:1">老</div>
<div class="selo" style="left:900px;top:760px">貳</div>""")

# 2 · Linha do tempo (lenda × evidência)
Q['02_linha_do_tempo'] = page(f"""
<svg style="position:absolute;inset:0" width="1920" height="1080">{FILTRO}<g filter="url(#t)" stroke="{TINTA}" fill="none" stroke-linecap="round">
 <path d="M 220 560 L 1700 560" stroke-width="7"/>
 <path d="M 330 520 L 330 600 M 1500 520 L 1500 600" stroke-width="9"/>
 <path d="M 345 470 C 700 380, 1130 380, 1485 470" stroke="{VERM}" stroke-width="6" stroke-dasharray="14 12"/></g></svg>
<div style="position:absolute;left:230px;top:620px;width:220px;text-align:center"><div class="data" style="font-size:30px">séc. VI a.C.</div><div style="font-size:40px;font-weight:700;margin-top:6px">Laozi?</div><div style="font-size:28px;font-style:italic">segundo a tradição</div></div>
<div style="position:absolute;left:1390px;top:620px;width:220px;text-align:center"><div class="data" style="font-size:30px">c. 100 a.C.</div><div style="font-size:40px;font-weight:700;margin-top:6px">Sima Qian</div><div style="font-size:28px;font-style:italic">a 1ª biografia</div></div>
<div style="position:absolute;left:0;right:0;top:170px;text-align:center"><div class="manchete" style="font-size:96px;color:{VERM}">~400 anos</div><div style="font-size:36px;font-style:italic">entre o homem e o primeiro registro</div></div>
<div class="legenda">Uns quatrocentos anos depois.</div>""")

# 3 · Mapa de tinta (o caminho do livro)
Q['03_mapa_rota'] = page(f"""
<svg style="position:absolute;inset:0" width="1920" height="1080">{FILTRO}<g filter="url(#t)" fill="none" stroke-linecap="round">
 <path d="M 1500 420 C 1200 180, 700 160, 600 330" stroke="{VERM}" stroke-width="6" stroke-dasharray="16 12"/>
 <path d="M 1500 420 C 1300 700, 800 820, 560 800" stroke="{JADE}" stroke-width="6" stroke-dasharray="16 12"/>
 <ellipse cx="1500" cy="430" rx="120" ry="58" stroke="{TINTA}" stroke-width="5"/>
 <ellipse cx="600" cy="340" rx="110" ry="52" stroke="{TINTA}" stroke-width="5"/>
 <ellipse cx="560" cy="810" rx="140" ry="58" stroke="{TINTA}" stroke-width="5"/></g>
 <g fill="{TINTA}"><circle cx="1500" cy="430" r="9"/><circle cx="600" cy="340" r="9"/><circle cx="560" cy="810" r="9"/></g></svg>
<div style="position:absolute;left:1420px;top:300px;font-size:44px;font-weight:700">China</div>
<div style="position:absolute;left:530px;top:210px;font-size:44px;font-weight:700">Londres</div><div class="data" style="position:absolute;left:520px;top:400px;font-size:28px;color:{VERM}">10/01/1788</div>
<div style="position:absolute;left:450px;top:680px;font-size:44px;font-weight:700">São Paulo</div><div class="data" style="position:absolute;left:470px;top:870px;font-size:28px;color:{JADE}">anos 1970</div>
<div class="fonte" style="left:1300px;top:960px">Mapa ilustrativo (sem escala)</div>
<div class="legenda">O livro chegou à Europa em 1788...</div>""")

# 4 · Citação na seda (cartão de trecho do livro)
Q['04_citacao_seda'] = page(f"""
<div class="heroi rasgado" style="left:380px;top:170px;width:1160px;height:640px;background:#E7D3A8;transform:rotate(-1deg)"></div>
<div style="position:absolute;left:470px;top:250px;width:980px;transform:rotate(-1deg)">
 <div class="data" style="font-size:28px;color:{VERM}">TAO TE CHING · CAPÍTULO 1</div>
 <div style="font-size:84px;font-style:italic;line-height:1.08;margin-top:40px">“O Tao de que se pode falar não é o Tao eterno.”</div>
 <div class="han" style="font-size:52px;margin-top:40px;opacity:.75">道可道，非常道</div></div>
<div class="selo" style="left:1430px;top:690px">道</div>""")

# 5 · Data-carimbo (o decreto de 733)
Q['05_decreto_carimbo'] = page(f"""
<div class="heroi rasgado" style="left:300px;top:200px;width:820px;height:620px;background:#E9D9B5;transform:rotate(2deg)"></div>
<div style="position:absolute;left:370px;top:270px;width:700px;transform:rotate(2deg)">
 <div class="data" style="font-size:28px">DINASTIA TANG · IMPERADOR XUANZONG</div>
 <div class="han" style="font-size:150px;margin-top:30px;line-height:1">勅</div>
 <div style="font-size:44px;font-style:italic;margin-top:24px">Cada casa deve ter uma cópia do Tao Te Ching.</div></div>
<div style="position:absolute;left:1040px;top:560px;width:300px;height:300px;border:12px solid {VERM};border-radius:14px;transform:rotate(-12deg);display:flex;align-items:center;justify-content:center;opacity:.92"><span class="data" style="font-size:110px;color:{VERM}">733</span></div>
<div style="position:absolute;left:1360px;top:330px;width:500px"><div class="manchete" style="font-size:70px">Leitura<br><span style="color:{VERM}">obrigatória</span></div></div>
<div class="fonte" style="left:300px;top:880px">Rolo de decreto: ilustração</div>
<div class="legenda">...virou leitura obrigatória por decreto.</div>""")

# 6 · Pirâmide de evidência (ciência)
Q['06_piramide_evidencia'] = page(f"""
<svg style="position:absolute;inset:0" width="1920" height="1080">{FILTRO}<g filter="url(#t)" stroke="{TINTA}" stroke-width="5">
 <path d="M 760 230 L 640 430 L 880 430 Z" fill="{JADE}"/>
 <path d="M 640 430 L 520 630 L 1000 630 L 880 430 Z" fill="#C9C1AE"/>
 <path d="M 520 630 L 380 860 L 1140 860 L 1000 630 Z" fill="#E3DCCB"/></g></svg>
<div style="position:absolute;left:940px;top:280px"><div class="manchete" style="font-size:44px;color:{JADE}">Alta certeza</div><div style="font-size:34px">pressão alta · densidade óssea pós-menopausa</div></div>
<div style="position:absolute;left:1060px;top:500px"><div class="manchete" style="font-size:40px">Moderada</div><div style="font-size:32px">várias condições</div></div>
<div style="position:absolute;left:1200px;top:720px"><div class="manchete" style="font-size:40px;color:#7A7266">Baixa</div><div style="font-size:32px">muitos estudos fracos</div></div>
<div style="position:absolute;left:160px;top:140px"><div class="manchete" style="font-size:96px">26</div><div style="font-size:36px;font-style:italic">revisões científicas</div></div>
<div class="fonte" style="left:160px;top:900px">Mak et al., J Integr Complement Med, 2026</div>
<div class="legenda">Resultado: evidência de alta certeza para duas coisas.</div>""")

# 7 · Vídeo real dentro de moldura de seda (o rolo se abre e o vídeo vive dentro)
FOTO = acha('06-ciencia', 'tai') or acha('01-tao-wuwei-yinyang', 'stream') or (MID / '00-abertura-mawangdui' / 'Han Tombs at Mawangdui (10112914825).jpg')
Q['07_video_em_moldura'] = page(f"""
<div style="position:absolute;left:250px;top:120px;width:1420px;height:840px;background:#D9C59C;box-shadow:16px 26px 50px rgba(50,30,5,.5)"></div>
<div style="position:absolute;left:250px;top:95px;width:1420px;height:46px;background:linear-gradient(#5B3A1E,#3A2412);border-radius:23px;box-shadow:0 8px 14px rgba(0,0,0,.4)"></div>
<div style="position:absolute;left:250px;top:940px;width:1420px;height:46px;background:linear-gradient(#5B3A1E,#3A2412);border-radius:23px;box-shadow:0 8px 14px rgba(0,0,0,.4)"></div>
<div class="heroi" style="left:330px;top:180px;width:1260px;height:710px;background-image:url({img(FOTO)});box-shadow:inset 0 0 60px rgba(0,0,0,.4)"></div>
<div style="position:absolute;left:330px;top:180px;width:1260px;height:710px;box-shadow:inset 0 0 80px rgba(40,20,0,.55);border:3px solid rgba(60,35,10,.5)"></div>
<div class="selo" style="left:1500px;top:800px">真</div>
<div class="data" style="position:absolute;left:340px;top:150px;font-size:22px;color:{VERM}">● VÍDEO REAL</div>
<div class="legenda">Tai chi, qigong, meditação.</div>""")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
        for n, h in Q.items():
            if len(sys.argv) > 1 and not any(a in n for a in sys.argv[1:]): continue
            await pg.set_content(h, wait_until='networkidle'); await pg.wait_for_timeout(600)
            await pg.screenshot(path=str(AQUI / f'E{n}.png')); print(n)
        await b.close()
asyncio.run(main())
