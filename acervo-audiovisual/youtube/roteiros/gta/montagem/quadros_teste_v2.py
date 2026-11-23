"""Quadros de teste v2: "Missão: siga o dinheiro" (Vox + cara de GTA, pouco texto). Pedido do Italo, 23/11/2026:
menos texto, estilo Vox, edição diferente da v1 e algo que lembre GTA (sem nada da Rockstar: desenho e palavras nossos).
Linguagem: pôr do sol de Leonida (roxo, magenta, laranja), coqueiros em silhueta, meio-tom de jornal (Vox),
mapa de GPS com rota amarela (o dinheiro como missão), placar de dinheiro em verde, cartela de "fatia cobrada".
Uso: python quadros_teste_v2.py <pasta_midia (com fontes/)> <pasta_saida>"""
import sys, pathlib, shutil, math, random
MID = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
if (OUT / 'fontes').exists(): shutil.rmtree(OUT / 'fontes')
shutil.copytree(MID / 'fontes', OUT / 'fontes')
W, H = 1920, 1080
ROXO = '#1B0F2E'; MAGENTA = '#FF2E88'; LARANJA = '#FF8A3D'; CREME = '#F2E8D5'; VERDE = '#4BE38A'; VERM = '#FF3B3B'
AMARELO = '#FFD23F'; TEAL = '#19D3C5'

FONTES = ''.join(f'@font-face{{font-family:"{n}";src:url("fontes/{a}")}}' for n, a in
                 [('Anton', 'Anton-400.ttf'), ('Plex', 'Plex-700.ttf'), ('Inter', 'Inter-800.ttf')])
GRAO = ("url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>"
        "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/>"
        "<feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .6 0'/></filter>"
        "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")")
CSS = f'''{FONTES}*{{box-sizing:border-box}}body{{margin:0;background:#000}}
.tela{{position:relative;width:{W}px;height:{H}px;overflow:hidden}}
.abs{{position:absolute}}
.anton{{font-family:"Anton";line-height:.9;letter-spacing:1px}}
.mono{{font-family:"Plex";letter-spacing:2px}}
.contorno{{-webkit-text-stroke:10px #000;paint-order:stroke fill}}
.meiotom{{background-image:radial-gradient(rgba(0,0,0,.55) 30%,transparent 32%);background-size:9px 9px}}
.grao{{position:absolute;inset:0;background:{GRAO};opacity:.22;mix-blend-mode:overlay;pointer-events:none}}
.vinheta{{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(0,0,0,.6) 100%)}}
.fonte{{position:absolute;left:56px;bottom:40px;font-family:"Plex";font-size:19px;color:rgba(255,255,255,.7);letter-spacing:1px}}'''


def pagina(corpo):
    return f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="tela">{corpo}<div class="grao"></div><div class="vinheta"></div></div></body></html>'


def coqueiro(x, y, esc=1.0, cor='#12091F', inclina=-8):
    """Coqueiro em silhueta (desenho próprio)."""
    folhas = ''.join(f'<path d="M0,0 Q{math.cos(a) * 90:.0f},{math.sin(a) * 90 - 40:.0f} {math.cos(a) * 190:.0f},{math.sin(a) * 190 + 30:.0f} '
                     f'Q{math.cos(a) * 100:.0f},{math.sin(a) * 100 - 10:.0f} 0,0Z" fill="{cor}"/>'
                     for a in [math.radians(d) for d in (-170, -140, -110, -70, -40, -10, 200, 160)])
    return (f'<svg class="abs" style="left:{x}px;top:{y}px;overflow:visible" width="1" height="1"><g transform="scale({esc}) rotate({inclina})">'
            f'<path d="M-14,620 Q-30,300 0,0 L14,0 Q-8,300 14,620Z" fill="{cor}"/><g>{folhas}</g></g></svg>')


def por_do_sol():
    return (f'<div class="abs" style="inset:0;background:linear-gradient(180deg,{ROXO} 0%,#4A1554 34%,{MAGENTA} 62%,{LARANJA} 82%,#FFC46B 100%)"></div>'
            f'<div class="abs" style="left:1120px;top:520px;width:560px;height:560px;border-radius:50%;'
            f'background:linear-gradient(180deg,#FFE29A,{LARANJA});box-shadow:0 0 140px rgba(255,180,90,.7)"></div>'
            + ''.join(f'<div class="abs" style="left:1100px;top:{690 + i * 34}px;width:600px;height:{8 + i * 2}px;background:#C7206E"></div>' for i in range(6))
            + f'<div class="abs meiotom" style="inset:0;opacity:.35;mix-blend-mode:multiply"></div>')


# ---------- 1. CAPA: pôr do sol de Leonida, coqueiros, o cupom rasgado em 3, a pergunta
pedaco = lambda x, y, ang, txt, cor: (f'<div class="abs" style="left:{x}px;top:{y}px;width:300px;padding:26px 24px;background:{CREME};'
                                       f'transform:rotate({ang}deg);box-shadow:0 26px 40px rgba(0,0,0,.5);font-family:Plex;font-size:30px;color:#111">'
                                       f'<div style="font-size:20px;opacity:.6">CUPOM · GTA VI</div><div class="anton" style="font-size:72px;color:{cor};margin-top:8px">{txt}</div></div>')
capa = (por_do_sol() + coqueiro(1560, 380, 1.0) + coqueiro(1780, 470, .8, inclina=10) + coqueiro(980, 600, .6, inclina=-14) +
        f'<div class="abs" style="left:0;right:0;bottom:0;height:120px;background:#12091F"></div>' +
        pedaco(1080, 120, 8, 'IMPOSTO', VERM) + pedaco(1300, 300, -6, 'LOJA', VERM) + pedaco(1120, 520, 5, '?', '#111') + f'''
<div class="abs anton contorno" style="left:80px;top:150px;font-size:300px;color:{AMARELO}">R$ 449</div>
<div class="abs anton contorno" style="left:90px;top:470px;font-size:150px;color:#fff">QUEM FICOU</div>
<div class="abs anton contorno" style="left:90px;top:620px;font-size:150px;color:#fff">COM ISSO?</div>''')

# ---------- 2. A MISSÃO: mapa de GPS, a rota amarela leva o dinheiro de mão em mão
random.seed(7)
ruas = ''
for i in range(-4, 30):
    ruas += f'<line x1="{i * 95}" y1="-200" x2="{i * 95 - 380}" y2="1300" stroke="#3B4357" stroke-width="{14 if i % 5 == 0 else 6}"/>'
for j in range(-2, 16):
    ruas += f'<line x1="-200" y1="{j * 88}" x2="2200" y2="{j * 88 + 260}" stroke="#3B4357" stroke-width="{14 if j % 4 == 0 else 6}"/>'
quadras = ''.join(f'<rect x="{random.randint(0, 1900)}" y="{random.randint(0, 1060)}" width="{random.randint(30, 70)}" height="{random.randint(20, 50)}" fill="#2B3142" opacity=".8"/>' for _ in range(160))
agua = f'<path d="M1500,-50 C1380,250 1620,420 1460,700 C1350,900 1520,1000 1480,1150 L2000,1150 L2000,-50Z" fill="#163A5C"/>'
pts = [(240, 840), (520, 760), (700, 480), (980, 400), (1120, 640), (1340, 560)]
rota = 'M' + ' L'.join(f'{x},{y}' for x, y in pts)
blip = lambda x, y, letra, cor, rot='': (f'<div class="abs" style="left:{x - 34}px;top:{y - 34}px;width:68px;height:68px;border-radius:50%;background:{cor};'
                                         f'border:5px solid #000;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:40px;color:#000;'
                                         f'box-shadow:0 0 0 6px rgba(255,255,255,.25)">{letra}</div>' +
                                         (f'<div class="abs mono" style="left:{x - 120}px;top:{y + 48}px;width:240px;text-align:center;font-size:24px;color:#fff;'
                                          f'text-shadow:0 2px 0 #000,0 0 8px #000">{rot}</div>' if rot else ''))
missao = (f'<svg class="abs" style="inset:0" width="{W}" height="{H}"><rect width="100%" height="100%" fill="#232838"/>{quadras}{ruas}{agua}'
          f'<path d="{rota}" fill="none" stroke="#000" stroke-width="26" stroke-linejoin="round"/>'
          f'<path d="{rota}" fill="none" stroke="{AMARELO}" stroke-width="14" stroke-linejoin="round"/></svg>' +
          blip(240, 840, 'R$', VERDE, 'VOCÊ') + blip(700, 480, '1', AMARELO, 'IMPOSTO') + blip(1120, 640, '2', AMARELO, 'LOJA') +
          blip(1340, 560, '3', AMARELO, 'TAKE-TWO') + f'''
<div class="abs" style="right:60px;top:40px;text-align:right">
 <div class="anton" style="font-size:96px;color:{VERDE};-webkit-text-stroke:6px #000;paint-order:stroke fill">R$ 449,90</div></div>
<div class="abs" style="left:0;right:0;bottom:70px;text-align:center;font-family:Inter;font-size:40px;color:#fff;text-shadow:0 3px 0 #000,0 0 10px #000">
 Siga o dinheiro até o <span style="color:{AMARELO}">imposto</span>.</div>''')

# ---------- 3. FATIA COBRADA: a cartela que fecha cada fatia (meio-tom Vox ao fundo, faixa preta no meio)
cartela = (f'<div class="abs" style="inset:0;background:linear-gradient(135deg,#3A1240,{MAGENTA} 60%,{LARANJA})"></div>'
           f'<div class="abs meiotom" style="inset:0;opacity:.55"></div>' + coqueiro(1650, 420, .9, '#1A0B24') + coqueiro(180, 470, .8, '#1A0B24', 12) + f'''
<div class="abs" style="left:-40px;right:-40px;top:360px;height:360px;background:rgba(0,0,0,.82);transform:rotate(-2deg)"></div>
<div class="abs anton" style="left:0;right:0;top:395px;text-align:center;font-size:170px;color:{AMARELO};transform:rotate(-2deg);
  -webkit-text-stroke:6px #000;paint-order:stroke fill;letter-spacing:4px">FATIA COBRADA</div>
<div class="abs anton" style="left:0;right:0;top:580px;text-align:center;font-size:84px;color:#fff;transform:rotate(-2deg)">
  IMPOSTO <span style="color:{VERM}">−R$ 126 A 198</span></div>
<div class="fonte">ESTIMATIVA: TRIBUTO DEVIDO (18/06/2026) E NUMERANDO/IBPT · CONTA NOSSA</div>''')

for nome, corpo in [('v2_capa', capa), ('v2_missao', missao), ('v2_fatia', cartela)]:
    (OUT / f'{nome}.html').write_text(pagina(corpo), encoding='utf-8')
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    pg = b.new_page(viewport={'width': W, 'height': H})
    for nome in ['v2_capa', 'v2_missao', 'v2_fatia']:
        pg.goto((OUT / f'{nome}.html').as_uri()); pg.wait_for_timeout(500)
        pg.screenshot(path=str(OUT / f'{nome}.png')); print('ok', nome)
    b.close()
