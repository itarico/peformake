"""Clímax "a Capital é um arquipélago": o Brasil visto de cima, no escuro, e as 84 cidades que somam metade do PIB
acesas como brasas (tamanho pela raiz do PIB). Referência de clima: plano zenital noturno com focos de fogo (enviado pelo Italo).
Dados: IBGE, PIB dos Municípios 2023 (municipios.json). Uso: python estilo_brasas.py <midia> <saida>"""
import sys, pathlib, shutil, math, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from panem_ui import carregar_mapa
MID, OUT = map(pathlib.Path, sys.argv[1:3]); OUT.mkdir(parents=True, exist_ok=True)
shutil.copytree(MID / 'fontes', OUT / 'fontes', dirs_exist_ok=True); shutil.copy(MID / 'relevo' / 'relevo.png', OUT / 'relevo.png')
M = carregar_mapa(MID / 'geo' / 'mapa.json'); MUN = json.loads((MID / 'geo' / 'municipios.json').read_text(encoding='utf-8'))
X, Y, T = 560, -40, 1160
ufs = ''.join(f'<path d="{u["d"]}" fill="none" stroke="#E6E2D9" stroke-opacity=".13" stroke-width="1" vector-effect="non-scaling-stroke"/>' for u in M.values())
apagadas = ''.join(f'<circle cx="{o[0]}" cy="{o[1]}" r="1.1" fill="#7d776c" fill-opacity=".35"/>' for o in MUN[84:])
brasas = ''
for i, o in enumerate(MUN[:84]):
    r = max(2.5, min(22, math.sqrt(o[2] / 1e6) * 0.55))
    brasas += (f'<circle cx="{o[0]}" cy="{o[1]}" r="{r * 3.2:.1f}" fill="url(#halo)"/>'
               f'<circle cx="{o[0]}" cy="{o[1]}" r="{r:.1f}" fill="url(#nucleo)"/>')
corpo = f'''<img class="abs" src="relevo.png" style="left:{X}px;top:{Y}px;width:{T}px;height:{T}px;opacity:.38;filter:sepia(.6) hue-rotate(160deg) saturate(.5) brightness(.55)">
<svg class="abs" style="left:{X}px;top:{Y}px" width="{T}" height="{T}" viewBox="0 0 1000 1000">
<defs><radialGradient id="halo"><stop offset="0" stop-color="#FF8A2A" stop-opacity=".55"/><stop offset=".45" stop-color="#C4242B" stop-opacity=".18"/><stop offset="1" stop-color="#C4242B" stop-opacity="0"/></radialGradient>
<radialGradient id="nucleo"><stop offset="0" stop-color="#FFF1C9"/><stop offset=".45" stop-color="#FFB443"/><stop offset="1" stop-color="#E0461E"/></radialGradient></defs>
{ufs}{apagadas}<g style="mix-blend-mode:screen">{brasas}</g></svg>
<div class="abs" style="inset:0;background:radial-gradient(ellipse at 62% 50%,rgba(0,0,0,0) 35%,rgba(5,6,8,.85) 100%)"></div>
<div class="abs" style="left:110px;top:330px;font-family:Anton;font-size:200px;line-height:.95;color:#F2A51F">84</div>
<div class="abs" style="left:116px;top:530px;font-family:Anton;font-size:72px;line-height:1.05;color:#E6E2D9">CIDADES<br><span style="font-family:Oswald;font-weight:300;color:#E9731E">=</span> METADE<br>DO PIB</div>
<div class="abs mono" style="left:116px;top:820px;font-size:17px;color:#8a8579">IBGE · PIB DOS MUNICÍPIOS 2023 · SOMA ACUMULADA (CÁLCULO NOSSO)</div>
<div class="abs mono" style="right:60px;bottom:26px;font-size:14px;color:#5f5b54">5.486 cidades apagadas · relevo: Natural Earth</div>'''
CSS = '''@font-face{font-family:"Anton";src:url("fontes/Anton-Regular.ttf")}@font-face{font-family:"Oswald";src:url("fontes/Oswald[wght].ttf");font-weight:200 700}
@font-face{font-family:"Plex Mono";src:url("fontes/IBMPlexMono-Medium.ttf")}
body{margin:0;background:#000}.tela{position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden;background:#06080a}.abs{position:absolute}
.mono{font-family:"Plex Mono";letter-spacing:2px}'''
(OUT / 'brasas.html').write_text(f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="tela">{corpo}</div></body></html>', encoding='utf-8')
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome'); pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.goto((OUT / 'brasas.html').as_uri()); pg.wait_for_timeout(1200); pg.screenshot(path=str(OUT / 'brasas.png')); b.close()
print('ok')
