"""Direção v3: manual "Arquivos de Panem" (pacote do Italo, 21/11/2026; cópia em ../identidade-arquivos-de-panem/).
Investigação com cara de arquivo: foto real com tratamento documental, lower third do manual, cartão de arquivo em papel,
mapa esquemático em traço fino. Paleta: carvão #111315, concreto #35383A, sangue #A51E25 (só 5 %), papel #C2B79F, marfim #E6E2D9.
Títulos Anton; texto IBM Plex Sans; metadados IBM Plex Mono.
Uso: python estilo_v3.py <midia> <saida>"""
import sys, pathlib, shutil
from PIL import Image, ImageEnhance, ImageOps
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from panem_ui import carregar_mapa
MID, OUT = map(pathlib.Path, sys.argv[1:3]); OUT.mkdir(parents=True, exist_ok=True)
shutil.copytree(MID / 'fontes', OUT / 'fontes', dirs_exist_ok=True)
M = carregar_mapa(MID / 'geo' / 'mapa.json')
CARVAO, CONCRETO, SANGUE, PAPEL, MARFIM = '#111315', '#35383A', '#A51E25', '#C2B79F', '#E6E2D9'

# tratamento documental do distrito: frio, contraste moderado, pouca saturação
f = Image.open(MID / 'img' / 'carajas_satelite.jpg').convert('RGB')
f = ImageEnhance.Color(f).enhance(0.45); f = ImageEnhance.Contrast(f).enhance(1.12); f = ImageEnhance.Brightness(f).enhance(0.78)
r, g, b = f.split(); b = b.point(lambda v: min(255, int(v * 1.06 + 4))); r = r.point(lambda v: int(v * 0.95)); f = Image.merge('RGB', (r, g, b))
f.resize((1920, 1280)).crop((0, 80, 1920, 1160)).save(OUT / 'carajas_doc.jpg', quality=92)
shutil.copy(MID / 'tex' / 'Paper001.jpg', OUT / 'papel.jpg')

CSS = f'''@font-face{{font-family:"Anton";src:url("fontes/Anton-Regular.ttf")}}
@font-face{{font-family:"Plex Sans";src:url("fontes/IBMPlexSans[wdth,wght].ttf");font-weight:100 700}}
@font-face{{font-family:"Plex Mono";src:url("fontes/IBMPlexMono-Medium.ttf");font-weight:500}}
body{{margin:0;background:#000}}.tela{{position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden;background:{CARVAO}}}.abs{{position:absolute}}
.tit{{font-family:"Anton";text-transform:uppercase;line-height:1}}.txt{{font-family:"Plex Sans";font-weight:500}}
.meta{{font-family:"Plex Mono";font-weight:500;letter-spacing:4px;text-transform:uppercase}}
.grao{{position:absolute;inset:0;pointer-events:none;opacity:.07;mix-blend-mode:screen;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>")}}'''

def pagina(corpo): return f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="tela">{corpo}<div class="grao"></div></div></body></html>'

def mapa_esq(x, y, tam, acesos=(12,), capital=True):
    ps = ''.join(f'<path d="{u["d"]}" fill="{SANGUE if u["dist"] in acesos else "none"}" fill-opacity="{.85 if u["dist"] in acesos else 0}" '
                 f'stroke="{PAPEL}" stroke-opacity="{.9 if u["dist"] in acesos else .45}" stroke-width="1.3" vector-effect="non-scaling-stroke"/>' for u in M.values())
    df = M['DF']
    cap = f'<circle cx="{df["cx"]}" cy="{df["cy"]}" r="9" fill="none" stroke="{MARFIM}" stroke-width="2.5"/>' if capital else ''
    return f'<svg class="abs" style="left:{x}px;top:{y}px" width="{tam}" height="{tam}" viewBox="0 0 1000 1000">{ps}{cap}</svg>'

# ---------- 1. distrito: foto real + lower third do manual + número
D = f'''<img class="abs" src="carajas_doc.jpg" style="left:0;top:0;width:1920px;height:1080px;object-fit:cover">
<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(17,19,21,.88) 0%,rgba(17,19,21,.55) 38%,rgba(17,19,21,0) 62%)"></div>
<div class="abs meta" style="left:110px;top:90px;font-size:22px;color:{PAPEL}">REGISTRO 012 · CENSO DOS DISTRITOS</div>
<div class="abs meta" style="right:110px;top:90px;font-size:20px;color:{MARFIM};opacity:.8">06°04′S · 50°10′O</div>
<div class="abs tit" style="left:104px;top:250px;font-size:260px;color:{MARFIM}">39%</div>
<div class="abs txt" style="left:112px;top:540px;width:640px;font-size:44px;line-height:1.2;color:{MARFIM}">dos royalties da mineração do Brasil vêm do Pará</div>
<div class="abs meta" style="left:112px;top:680px;font-size:18px;color:{PAPEL};letter-spacing:3px">FONTE: ANM · CFEM 2025</div>
<div class="abs" style="left:110px;top:820px;width:760px;height:150px;background:{CARVAO};opacity:.94"></div>
<div class="abs" style="left:110px;top:820px;width:9px;height:150px;background:{SANGUE}"></div>
<div class="abs meta" style="left:155px;top:852px;font-size:23px;color:{PAPEL};letter-spacing:3px">DISTRITO 12 · PARÁ</div>
<div class="abs txt" style="left:155px;top:893px;font-size:43px;font-weight:700;color:{MARFIM}">A MINA DE CARAJÁS</div>
<div class="abs meta" style="right:110px;top:985px;font-size:15px;color:{MARFIM};opacity:.7;letter-spacing:2px">IMAGEM: NASA/JPL · ASTER · DOMÍNIO PÚBLICO</div>'''

# ---------- 2. ficha do tributo como cartão de arquivo (papel), mapa esquemático ao lado
FIC = f'''{mapa_esq(90, 120, 760)}
<div class="abs meta" style="left:110px;top:70px;font-size:20px;color:{PAPEL}">PANEM / ESQUEMA DOS DISTRITOS</div>
<div class="abs meta" style="left:110px;top:900px;font-size:15px;color:#777;letter-spacing:2px">VISUALIZAÇÃO EDITORIAL · MALHA DAS UFs: IBGE</div>
<div class="abs" style="left:920px;top:150px;width:900px;height:760px;background:{PAPEL};box-shadow:0 20px 40px rgba(0,0,0,.5)">
 <img src="papel.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;opacity:.55">
 <div style="position:absolute;inset:28px;border:3px solid {CONCRETO}"></div>
 <div class="meta" style="position:absolute;left:70px;top:62px;font-size:22px;color:{CONCRETO}">CAPITAL / REGISTRO DE TRIBUTO</div>
 <div style="position:absolute;left:70px;right:70px;top:100px;height:2px;background:{CONCRETO}"></div>
 <div class="tit" style="position:absolute;left:66px;top:128px;font-size:120px;color:{CARVAO}">DISTRITO 12</div>
 <div class="meta" style="position:absolute;left:70px;top:270px;font-size:26px;color:{CONCRETO}">PARÁ · MINERAÇÃO</div>
 <div style="position:absolute;left:70px;top:330px;width:760px;font-family:'Plex Mono';font-size:27px;line-height:2.05;color:{CARVAO}">
  PRODUZ ........... minério, madeira<br>
  CHANCE NA COLHEITA  1 em 252.831<br>
  RENDA MÉDIA ...... R$ 994 por pessoa<br>
  CAPITAL .......... R$ 2.999</div>
 <div style="position:absolute;left:70px;top:610px;width:760px;height:18px;background:rgba(53,56,58,.25)"><div style="width:33%;height:100%;background:{SANGUE}"></div></div>
 <div class="meta" style="position:absolute;left:70px;top:642px;font-size:20px;color:{CONCRETO}">33 % DA RENDA DA CAPITAL</div>
 <div style="position:absolute;right:70px;top:540px;border:7px solid {SANGUE};padding:8px 22px 4px;transform:rotate(-8deg);opacity:.85">
  <span class="tit" style="font-size:52px;color:{SANGUE}">UM TERÇO</span></div>
 <div class="meta" style="position:absolute;left:70px;top:706px;font-size:13px;color:{CONCRETO};letter-spacing:1.5px">IBGE, CENSO 2022 · SIMULAÇÃO NOSSA: 4 TRIBUTOS POR DISTRITO, JOVENS DE 12 A 18 ANOS</div>
</div>'''

for nome, corpo in [('distrito', D), ('ficha', FIC)]:
    (OUT / f'{nome}.html').write_text(pagina(corpo), encoding='utf-8')
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    br = p.chromium.launch(channel='chrome'); pg = br.new_page(viewport={'width': 1920, 'height': 1080})
    for nome in ['distrito', 'ficha']:
        pg.goto((OUT / f'{nome}.html').as_uri()); pg.wait_for_timeout(900); pg.screenshot(path=str(OUT / f'{nome}.png'))
    br.close()
print('ok')
