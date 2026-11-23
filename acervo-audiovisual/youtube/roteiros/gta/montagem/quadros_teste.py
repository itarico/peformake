"""3 quadros de teste do estilo "Boca do Caixa": capa (thumb), o cupom sendo fatiado e o mapa de horas de salário.
Uso: python quadros_teste.py <pasta_midia (com fontes/ e geo/world.geojson)> <pasta_saida>
Gera capa.html, fatia.html, mapa.html e os PNG 1920x1080 (Playwright + Chrome)."""
import sys, pathlib, shutil
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from estilo import *

MID = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
if not (OUT / 'fontes').exists(): shutil.copytree(MID / 'fontes', OUT / 'fontes')


def linha(a, b, extra=''):
    return f'<div class="linhacp" style="{extra}"><span>{a}</span><span class="pont"></span><span>{b}</span></div>'


def risco(top, larg=440, ang=-2):
    return (f'<div class="abs" style="left:30px;top:{top}px;width:{larg}px;height:7px;background:{VERMELHO};'
            f'border-radius:4px;transform:rotate({ang}deg);opacity:.92"></div>')


def corte(top):
    return f'<div class="abs" style="left:-10px;right:-10px;top:{top}px;border-top:4px dashed {VERMELHO}"></div>'


def corte_rel():
    return f'<div style="border-top:4px dashed {VERMELHO};margin:4px -60px"></div>'


CAB = (f'<div class="mono" style="text-align:center;font-size:24px;letter-spacing:4px">POR DENTRO · CUPOM</div>'
       f'<div class="mono4" style="text-align:center;font-size:20px;margin:4px 0 14px">23/11/2026 · CAIXA 01</div>'
       f'<div style="border-top:3px dashed {TINTA};margin:6px 0 14px"></div>')

# ---------- 1. CAPA (thumb): cupom em diagonal, três fatias riscadas, a pergunta
cupom1 = f'''<div class="abs papel serra" style="left:1060px;top:-40px;width:600px;height:1180px;padding:120px 46px 0;transform:rotate(9deg)">
{CAB}
<div class="mono" style="font-size:34px;margin-bottom:6px">GTA VI STANDARD</div>
{linha('1 UN', '<b class="preto" style="font-size:64px">R$ 449,90</b>', 'align-items:flex-end')}
<div style="border-top:3px dashed {TINTA};margin:20px 0"></div>
<div style="position:relative">{linha('IMPOSTO', 'R$ ???')}{risco(26, 470, -3)}</div>
{corte_rel()}<div style="position:relative">{linha('LOJA', 'R$ ???')}{risco(30, 470, 2)}</div>
{corte_rel()}<div style="position:relative">{linha('QUEM FEZ O JOGO', 'R$ ???')}</div>
{corte_rel()}<div class="preto" style="font-size:260px;color:{VERMELHO};text-align:center;margin-top:20px">?</div>

</div>'''
capa = cupom1 + tesoura(1700, 470, 188, 1.1, 30) + f'''
<div class="abs preto" style="left:90px;top:230px;font-size:180px;color:{PAPEL};text-shadow:0 10px 0 rgba(0,0,0,.4)">QUEM<br>FICA COM</div>
<div class="abs preto" style="left:90px;top:600px;font-size:250px;color:{AMARELO};text-shadow:0 10px 0 rgba(0,0,0,.45)">ISSO?</div>'''

# ---------- 2. A FATIA: a tesoura corta o imposto, a fatia cai no envelope, o contador perde em vermelho
topo = f'''<div class="abs papel" style="left:260px;top:120px;width:600px;height:560px;padding:50px 46px 0;transform:rotate(-2deg)">
{CAB}
<div class="mono" style="font-size:34px;margin-bottom:6px">GTA VI STANDARD</div>
{linha('1 UN', '<b class="preto" style="font-size:64px">R$ 449,90</b>', 'align-items:flex-end')}
<div style="border-top:3px dashed {TINTA};margin:20px 0"></div>
{linha('PIS · COFINS', '...')}{linha('ISS · REMESSA', '...')}
<div class="abs" style="left:0;right:0;bottom:-8px;height:16px;background:{PAPEL};clip-path:polygon({serra_pts(30, 50)})"></div>
</div>'''
fatia = f'''<div class="abs papel serra" style="left:560px;top:700px;width:600px;height:230px;padding:30px 46px 0;transform:rotate(11deg)">
{linha('<b class="mono">IMPOSTO</b>', '<b class="preto" style="font-size:48px;color:' + VERMELHO + '">28 % A 44 %</b>', 'align-items:flex-end')}
{linha('ESTIMADO', 'R$ 126 A R$ 198')}
<div class="mono4" style="font-size:19px;margin-top:10px">SEM CONTA OFICIAL PUBLICADA</div></div>'''
quadro2 = (topo + envelope(1180, 760, 'IMPOSTO', -6) + fatia + tesoura(880, 690, 172, 1.15, 22) +
           hud('R$ 252 A 324', perda='−R$ 126 A 198', frac=0.64) + f'''
<div class="abs preto" style="left:1180px;top:430px;font-size:96px;color:{PAPEL}">ANTES DE<br>QUALQUER<br><span style="color:{AMARELO}">EMPRESA</span></div>
<div class="fonte">FONTE: TRIBUTO DEVIDO, 18/06/2026 · NUMERANDO (IBPT) · <span class="selo" style="font-size:18px;padding:3px 8px">CONTA NOSSA</span></div>''')

# ---------- 3. O MAPA DE HORAS: o mesmo jogo, 11 horas de salário mínimo lá, 61 aqui
paths, proj = mapa_paths(MID / 'geo' / 'world.geojson', 110, 190, 1700)
dest = {'USA': '#C9CDD3', 'BRA': '#C9CDD3'}
svg = ''.join(f'<path d="{d}" fill="{dest.get(k, "#4A4F57")}" stroke="{CHUMBO}" stroke-width="1.2"/>' for k, d in paths.items() if k != 'ATA')
mapa = f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}">{svg}</svg>'


def pilha(lon, lat, n, rot, cor, lado='dir'):
    """Pilha de cartões de ponto (1 cartão = 1 hora) em cima do país; etiqueta ao lado da base."""
    x, y = proj(lon, lat); passo = 5
    cartoes = ''.join(f'<div class="abs" style="left:{(i % 2) * 2}px;bottom:{i * passo}px;width:70px;height:4px;background:{PAPEL};'
                      f'border:1px solid #9a968c;box-shadow:0 1px 0 rgba(0,0,0,.3)"></div>' for i in range(n))
    tam = 64 if n > 20 else 46
    ex = x + 55 if lado == 'dir' else x - 55 - (260 if n > 20 else 190)
    return f'''<div class="abs" style="left:{x - 35:.0f}px;top:{y - n * passo:.0f}px;width:72px;height:{n * passo}px;filter:drop-shadow(8px 10px 8px rgba(0,0,0,.5))">{cartoes}</div>
<div class="abs etq" style="left:{ex:.0f}px;top:{y - tam - 30:.0f}px;font-size:{tam}px;color:{TINTA};background:{cor}">{rot}</div>'''


def preco(lon, lat, txt):
    x, y = proj(lon, lat)
    return (f'<div class="abs" style="left:{x - 6:.0f}px;top:{y - 6:.0f}px;width:12px;height:12px;border-radius:50%;background:{AMARELO}"></div>'
            f'<div class="abs mono" style="left:{x + 12:.0f}px;top:{y - 16:.0f}px;font-size:22px;color:{PAPEL};background:rgba(0,0,0,.55);padding:2px 8px">{txt}</div>')


quadro3 = mapa + pilha(-100, 40, 11, '11 H', PAPEL, 'esq') + pilha(-45, -8, 61, '61 H', AMARELO) + \
    preco(79, 21, 'ÍNDIA ≈ US$ 64') + preco(139, 37, 'JAPÃO ≈ US$ 62') + preco(-9, 39.5, 'PORTUGAL ≈ US$ 90') + \
    preco(-65, -36, 'ARGENTINA US$ 96,79') + preco(-103, 22, 'MÉXICO ≈ US$ 81') + f'''
<div class="abs preto" style="left:90px;top:60px;font-size:84px;color:{PAPEL}">O MESMO JOGO</div>
<div class="abs mono" style="left:94px;top:150px;font-size:24px;color:#C8CCD2;letter-spacing:3px">HORAS DE SALÁRIO MÍNIMO PARA COMPRAR O GTA VI</div>
<div class="abs preto" style="left:1350px;top:760px;font-size:150px;color:{AMARELO};-webkit-text-stroke:5px #000;paint-order:stroke">5,5x</div>
<div class="fonte">EUA US$ 7,25/H (PISO FEDERAL) · BRASIL R$ 7,37/H (DECRETO 12.797/2025) · PREÇOS: LEONIDA LAB VIA FAST COMPANY, 10/11/2026 · <span class="selo" style="font-size:18px;padding:3px 8px">CONTA NOSSA</span></div>'''

for nome, corpo in [('capa', capa), ('fatia', quadro2), ('mapa', quadro3)]:
    (OUT / f'{nome}.html').write_text(pagina(corpo), encoding='utf-8')

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    pg = b.new_page(viewport={'width': W, 'height': H})
    for nome in ['capa', 'fatia', 'mapa']:
        pg.goto((OUT / f'{nome}.html').as_uri()); pg.wait_for_timeout(400)
        pg.screenshot(path=str(OUT / f'{nome}.png')); print('ok', nome)
    b.close()
