"""3 quadros de teste do estilo "Propaganda da Capital": capa, ficha de tributo (HUD) e mapa que acende.
Uso: python quadros_teste.py <pasta_midia (com geo/ e fontes/)> <pasta_saida>
Gera capa.html, ficha.html, mapa.html e os PNG 1920x1080 (Playwright + Chrome)."""
import sys, pathlib, shutil
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from panem_ui import *

MID = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
if not (OUT / 'fontes').exists(): shutil.copytree(MID / 'fontes', OUT / 'fontes')
M = carregar_mapa(MID / 'geo' / 'mapa.json')

def pagina(corpo, extra=''):
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{fontes_css()}
body{{margin:0;background:#000}}{CSS_BASE}{extra}</style></head><body><div class="tela">{corpo}
<div class="grao"></div><div class="vinheta"></div></div></body></html>'''

# ---------- 1. CAPA: o Brasil rachado em 13 peças, raios de propaganda, a Capital dourada
raios = (f'<div class="abs" style="left:-400px;top:-660px;width:2800px;height:2800px;'
         f'background:repeating-conic-gradient(from 0deg at 62% 50%,{VERM_E} 0deg 6deg,{PRETO} 6deg 12deg);opacity:.55"></div>'
         f'<div class="abs" style="inset:0;background:radial-gradient(circle at 66% 50%,rgba(13,11,10,0) 0,rgba(13,11,10,.2) 30%,{PRETO} 70%)"></div>')
todos = {d: 'apagado' for d in range(1, 13)}
capa = raios + svg_mapa(M, todos, 820, 60, 980, 'c', numerais=True, explodir=0.035) + f'''
<div class="abs mono" style="left:110px;top:96px;font-size:26px;color:{OURO}">★ POR DENTRO · COMUNICADO OFICIAL DA CAPITAL</div>
<div class="abs regime" style="left:100px;top:190px;font-size:250px;color:{OSSO}">QUAL É</div>
<div class="abs regime" style="left:100px;top:405px;font-size:250px;color:{VERM}">O SEU?</div>
<div class="abs" style="left:112px;top:680px;border:5px solid {OURO};padding:14px 26px 10px;transform:rotate(-3deg)">
 <div class="regime" style="font-size:78px;color:{OURO}">SE O BRASIL FOSSE PANEM</div></div>
<div class="abs mono" style="left:112px;top:840px;font-size:24px;color:{CINZA}">12 DISTRITOS · 27 ESTADOS · NÚMEROS OFICIAIS DO IBGE</div>'''

# ---------- 2. FICHA DE TRIBUTO: HUD de videogame (Distrito XII, Pará)
d = DIST[12]
pontos = ''.join(f'<span style="display:inline-block;width:14px;height:14px;margin:3px;border-radius:2px;background:{VERM if i == 37 else "#2E2A27"}"></span>' for i in range(96))
seg = lambda pct, cor: ''.join(f'<span style="flex:1;margin-right:4px;background:{cor if (i + 1) * 5 <= pct + 2 else "#2A2624"}"></span>' for i in range(20))
ficha_css = f'''.linha{{border-top:2px solid #2E2A27;padding:22px 0 18px}}
.rot{{font-size:20px;color:{CINZA}}}
.chip{{display:inline-flex;align-items:center;gap:10px;border:2px solid {OSSO};padding:6px 14px;margin-right:12px;font-family:"Plex";font-weight:700;font-size:24px;letter-spacing:2px}}
.barra{{display:flex;height:34px;margin-top:10px}}'''
ficha = (svg_mapa(M, {12: 'aceso'}, 40, 110, 820, 'f', numerais=True) + f'''
<div class="scan"></div>
<div class="abs mono" style="left:70px;top:70px;font-size:22px;color:{VERM}">● AO VIVO · COLHEITA 2026</div>
<div class="abs cantos" style="left:930px;top:70px;width:900px;height:830px"></div>
<div class="abs" style="left:930px;top:70px;width:900px;height:830px;background:rgba(26,23,21,.86)"></div>
<div class="abs" style="left:930px;top:70px;width:900px">
 <div class="mono" style="background:{VERM};color:{PRETO};font-weight:700;font-size:22px;padding:10px 26px;display:flex;justify-content:space-between">
  <span>TRIBUTO Nº 0417 · DISTRITO XII · PARÁ</span><span>FICHA</span></div>
 <div style="padding:22px 40px 0">
  <div style="display:flex;align-items:flex-end;gap:30px">
   <div><div class="mono rot">DISTRITO</div><div class="regime" style="font-size:190px;color:{VERM}">XII</div></div>
   <div style="padding-bottom:18px"><div class="regime" style="font-size:96px">{d["estado"]}</div>
    <div class="mono" style="font-size:24px;color:{OURO};margin-top:8px">{d["nome"]}</div></div>
   <div style="margin-left:auto;padding-bottom:30px">{icone(d["icone"], OSSO, 96, 2.6)}</div></div>
  <div class="linha"><div class="mono rot">VOCÊ PRODUZ</div><div style="margin-top:12px">
   <span class="chip">◆ MINÉRIO</span><span class="chip">◆ MADEIRA</span></div></div>
  <div class="linha" style="display:flex;gap:30px;align-items:center">
   <div style="flex:1"><div class="mono rot">CHANCE NA COLHEITA</div>
    <div class="num" style="font-size:84px;line-height:1;margin-top:6px">1 <span style="font-size:44px;color:{CINZA}">EM</span> {d["chance"]}</div></div>
   <div style="width:300px;line-height:0">{pontos}</div></div>
  <div class="linha"><div class="mono rot" style="display:flex;justify-content:space-between"><span>SUA RENDA × CAPITAL</span>
    <span style="color:{OSSO}">R$ 994 <span style="color:{CINZA}">×</span> <span style="color:{OURO}">R$ 2.999</span></span></div>
   <div class="barra">{seg(33, VERM)}</div><div class="barra" style="height:14px;margin-top:8px">{seg(100, OURO)}</div>
   <div style="display:flex;justify-content:space-between;margin-top:6px"><span class="num" style="font-size:54px;color:{VERM}">33 %</span>
    <span class="mono" style="font-size:20px;color:{OURO};padding-top:24px">CAPITAL = 100 %</span></div></div>
 </div></div>
<div class="abs mono" style="left:930px;top:918px;width:900px;font-size:15px;color:{CINZA};letter-spacing:1.5px">FONTE: IBGE, CENSO 2022 · ANM, CFEM 2025 · SIMULAÇÃO NOSSA: 4 TRIBUTOS POR DISTRITO, JOVENS DE 12 A 18 ANOS</div>
''' + regua(12, set()))

# ---------- 3. MAPA: o Brasil acende distrito por distrito (estamos no IX), com o número-âncora em texto cinético
est = {12: 'apagado', 11: 'apagado', 10: 'apagado', 9: 'aceso'}
mapa = (svg_mapa(M, est, 700, 30, 900, 'p', numerais=True) + f'''
<div class="abs" style="left:110px;top:150px;background:{VERM};color:{OSSO};padding:8px 18px 6px" ><span class="regime" style="font-size:54px">DISTRITO IX</span></div>
<div class="abs mono" style="left:114px;top:232px;font-size:26px;color:{OSSO}">GRÃOS · MATO GROSSO + RIO GRANDE DO SUL</div>
<div class="abs num" style="left:96px;top:300px;font-size:300px;line-height:1;color:{OSSO}">30,4<span style="font-size:150px">%</span></div>
<div class="abs regime" style="left:110px;top:620px;font-size:110px;color:{VERM}">DA SOJA<br><span style="color:{OSSO}">DO BRASIL</span></div>
<div class="abs mono" style="left:114px;top:850px;font-size:20px;color:{CINZA}">FONTE: IBGE · PAM 2025</div>
<div class="abs mono" style="left:1500px;top:470px;font-size:22px;color:{OURO}">◀ CAPITAL</div>''' + regua(9, {12, 11, 10}))

for nome, corpo, css in [('capa', capa, ''), ('ficha', ficha, ficha_css), ('mapa', mapa, '')]:
    (OUT / f'{nome}.html').write_text(pagina(corpo, css), encoding='utf-8')

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome'); pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    for nome in ['capa', 'ficha', 'mapa']:
        pg.goto((OUT / f'{nome}.html').as_uri()); pg.wait_for_timeout(600); pg.screenshot(path=str(OUT / f'{nome}.png'))
    b.close()
print('ok', OUT)
