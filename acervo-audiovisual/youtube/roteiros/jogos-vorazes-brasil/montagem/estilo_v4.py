"""Direção v4: cartografia investigativa (referência Border Forensics enviada pelo Italo, 21/11/2026) + manual Arquivos de Panem.
Relevo real em cinza, estados em traço fino, distrito em vermelho translúcido, círculo de chamada no lugar citado,
painéis pequenos com barras e metadados em mono. Uso: python estilo_v4.py <midia> <saida>"""
import sys, pathlib, shutil, math
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from panem_ui import carregar_mapa, rotulo_distrito
MID, OUT = map(pathlib.Path, sys.argv[1:3]); OUT.mkdir(parents=True, exist_ok=True)
shutil.copytree(MID / 'fontes', OUT / 'fontes', dirs_exist_ok=True); shutil.copy(MID / 'relevo' / 'relevo.png', OUT / 'relevo.png')
M = carregar_mapa(MID / 'geo' / 'mapa.json')
CARVAO, CONCRETO, SANGUE, PAPEL, MARFIM, LARANJA = '#111315', '#35383A', '#C4242B', '#C2B79F', '#E6E2D9', '#E0892B'
X, Y, T = 620, -90, 1300          # mapa grande, sangrando para fora do quadro
def p(px, py): return X + px * T / 1000, Y + py * T / 1000
C14 = math.cos(math.radians(14)); W_ = 39.6 * C14; S_ = 1000 / max(W_, 39.3)
def geo(lon, lat): return p((lon + 74.2) * C14 * S_ + (1000 - W_ * S_) / 2, (5.4 - lat) * S_ + (1000 - 39.3 * S_) / 2)
feitos = {12}

def uf_path(u):
    on = u['dist'] in feitos
    return (f'<path d="{u["d"]}" fill="{SANGUE if on else "none"}" fill-opacity="{.28 if on else 0}" '
            f'stroke="{SANGUE if on else MARFIM}" stroke-opacity="{1 if on else .28}" stroke-width="{2.2 if on else 1}" vector-effect="non-scaling-stroke"/>')
ufs = ''.join(uf_path(u) for u in M.values())
kx, ky = geo(-50.17, -6.07); sx, sy = geo(-44.37, -2.57)          # Carajás; Ponta da Madeira (São Luís)
dfx, dfy = p(M['DF']['cx'], M['DF']['cy'])
def cod(xy, t): return f'<div class="abs cod" style="left:{xy[0] - 26:.0f}px;top:{xy[1] - 18:.0f}px">{t}</div>'
codigos = cod(p(*rotulo_distrito(M, 12)), 'PA') + ''.join(cod(p(M[s]['cx'], M[s]['cy']), s) for s in ['AM', 'GO', 'BA', 'SP'])

graf = ''
for i, (rot, h, cor) in enumerate([('D12', 33, SANGUE), ('CAPITAL', 100, PAPEL)]):
    x = 40 + i * 120
    graf += (f'<div style="position:absolute;left:{x}px;bottom:46px;width:56px;height:{h * 1.7:.0f}px;background:{cor}"></div>'
             f'<div class="mono" style="position:absolute;left:{x}px;bottom:{50 + h * 1.7:.0f}px;width:56px;text-align:center;font-size:20px;color:{MARFIM}">{h}%</div>'
             f'<div class="mono" style="position:absolute;left:{x - 10}px;bottom:14px;width:76px;text-align:center;font-size:17px;color:{PAPEL}">{rot}</div>')
grade = ''.join(f'<div style="position:absolute;left:30px;right:24px;bottom:{46 + k * 34}px;height:1px;background:rgba(230,226,217,.09)"></div>' for k in range(6))

corpo = f'''<img class="abs" src="relevo.png" style="left:{X}px;top:{Y}px;width:{T}px;height:{T}px">
<svg class="abs" style="left:{X}px;top:{Y}px" width="{T}" height="{T}" viewBox="0 0 1000 1000">{ufs}</svg>
<div class="abs" style="inset:0;background:linear-gradient(90deg,{CARVAO} 0%,rgba(17,19,21,.75) 30%,rgba(17,19,21,0) 52%)"></div>
{codigos}
<div class="abs" style="left:{dfx - 8:.0f}px;top:{dfy - 8:.0f}px;width:16px;height:16px;border-radius:50%;background:{PAPEL};box-shadow:0 0 0 5px rgba(194,183,159,.25)"></div>
<div class="abs mono" style="left:{dfx + 16:.0f}px;top:{dfy - 11:.0f}px;font-size:16px;color:{PAPEL}">CAPITAL</div>
<div class="abs" style="left:{kx - 7:.0f}px;top:{ky - 7:.0f}px;width:14px;height:14px;border-radius:50%;background:{SANGUE}"></div>
<div class="abs" style="left:{kx - 62:.0f}px;top:{ky - 62:.0f}px;width:124px;height:124px;border-radius:50%;border:4px solid {LARANJA};box-shadow:0 0 18px rgba(224,137,43,.45)"></div>
<div class="abs" style="left:{kx - 260:.0f}px;top:{ky + 4:.0f}px;width:196px;height:1px;background:{LARANJA}"></div>
<div class="abs it" style="left:{kx - 440:.0f}px;top:{ky - 12:.0f}px">Serra dos Carajás</div>
<div class="abs" style="left:{sx - 6:.0f}px;top:{sy - 6:.0f}px;width:12px;height:12px;border-radius:50%;background:{SANGUE};opacity:.9"></div>
<div class="abs painel" style="left:60px;top:60px;width:430px;height:430px">
 <div class="pt">DISTRITO 12, PARÁ:<br>39% DOS ROYALTIES<br>DA MINERAÇÃO DO PAÍS</div>
 <div class="mono" style="position:absolute;left:30px;top:128px;font-size:15px;color:#8a8579">RENDA MÉDIA POR PESSOA × CAPITAL</div>
 <div style="position:absolute;left:0;right:0;top:150px;bottom:0">{grade}{graf}</div></div>
<div class="abs mono" style="left:60px;top:498px;font-size:13px;color:#77736a">Fonte: ANM, CFEM 2025 · IBGE, Censo 2022</div>
<div class="abs painel" style="left:60px;top:540px;width:430px;height:190px">
 <div class="pt">CHANCE NA COLHEITA</div>
 <div style="position:absolute;left:30px;top:66px;font-family:Anton;font-size:72px;color:{MARFIM}">1 em 252.831</div>
 <div class="mono" style="position:absolute;left:30px;bottom:14px;font-size:13px;color:#77736a">simulação: 4 tributos, jovens de 12 a 18 anos</div></div>
<div class="abs painel" style="left:60px;top:770px;width:430px;height:120px">
 <div style="position:absolute;left:24px;top:30px;width:34px;height:3px;background:{SANGUE}"></div>
 <div class="mono" style="position:absolute;left:76px;top:20px;font-size:16px;color:{MARFIM}">Estados do distrito revelado</div>
 <div style="position:absolute;left:34px;top:72px;width:12px;height:12px;border-radius:50%;background:{SANGUE}"></div>
 <div class="mono" style="position:absolute;left:76px;top:66px;font-size:16px;color:{MARFIM}">Mina e porto citados</div></div>
<div class="abs mono" style="right:60px;bottom:22px;font-size:13px;color:#77736a">Relevo: Natural Earth · Malha: IBGE · Visualização editorial</div>'''

CSS = f'''@font-face{{font-family:"Anton";src:url("fontes/Anton-Regular.ttf")}}
@font-face{{font-family:"Plex Mono";src:url("fontes/IBMPlexMono-Medium.ttf");font-weight:500}}
@font-face{{font-family:"Plex Mono";src:url("fontes/IBMPlexMono-Bold.ttf");font-weight:700}}
@font-face{{font-family:"Plex Sans";src:url("fontes/IBMPlexSans[wdth,wght].ttf");font-weight:100 700}}
body{{margin:0;background:#000}}.tela{{position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden;background:{CARVAO}}}.abs{{position:absolute}}
.mono{{font-family:"Plex Mono";font-weight:500}}
.cod{{background:{SANGUE};color:{CARVAO};font-family:"Plex Mono";font-weight:700;font-size:22px;padding:2px 8px;letter-spacing:1px}}
.it{{font-family:"Plex Mono";font-style:italic;font-size:17px;color:{LARANJA};border:1px solid {LARANJA};padding:3px 10px;background:rgba(17,19,21,.85)}}
.painel{{background:rgba(10,11,12,.86)}}
.pt{{position:absolute;left:30px;top:26px;font-family:"Plex Sans";font-weight:700;font-size:21px;line-height:1.25;color:{MARFIM}}}'''
(OUT / 'mapa.html').write_text(f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="tela">{corpo}</div></body></html>', encoding='utf-8')
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome'); pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.goto((OUT / 'mapa.html').as_uri()); pg.wait_for_timeout(900); pg.screenshot(path=str(OUT / 'mapa.png')); b.close()
print('ok')
