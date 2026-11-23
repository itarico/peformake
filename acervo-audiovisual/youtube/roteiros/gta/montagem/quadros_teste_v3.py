"""Quadros de teste v3 (23/11/2026): textura de risografia e colagem (referências do Italo: capa de loading screen do
GTA, cartaz laranja com foto em meio-tom e rabisco, cartaz vermelho com rabisco à mão), fotos reais do Brasil, sem
texto pequeno na tela (fontes vão para a descrição). Cara de GTA: pôr do sol, coqueiro, placar de dinheiro, missão.
Uso: python quadros_teste_v3.py <pasta_midia (fontes/, fotos/)> <pasta_saida>"""
import sys, pathlib, shutil, random
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from riso import meio_tom, rabisco, seta, estrela
MID = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
if (OUT / 'fontes').exists(): shutil.rmtree(OUT / 'fontes')
shutil.copytree(MID / 'fontes', OUT / 'fontes')
W, H = 1920, 1080
FUNDO = '#241219'; LARANJA = '#FF6A2B'; ROSA = '#FF3D7F'; CREME = '#F1E6D2'; VERDE = '#4BE38A'
CR = (241, 230, 210); RS = (255, 61, 127); LR = (255, 106, 43)
F = MID / 'fotos'

# fotos em meio-tom (creme) + cópia rosa para o registro desalinhado
meio_tom(F / 'f11.jpg', OUT / 'ipanema.png', CR, largura=1500, celula=8, claro=True)
meio_tom(F / 'f11.jpg', OUT / 'ipanema_r.png', RS, largura=1500, celula=8, claro=True)
meio_tom(F / 'f09.jpg', OUT / 'nota.png', (36, 18, 25), largura=1100, celula=7, contraste=1.4)
meio_tom(F / 'f14.jpg', OUT / 'etiqueta.png', (36, 18, 25), largura=1150, celula=8, recorte=(560, 1500, 1460, 2250), contraste=1.3)

FONTES = ''.join(f'@font-face{{font-family:"{n}";src:url("fontes/{a}")}}' for n, a in
                 [('Anton', 'Anton-400.ttf'), ('Archivo', 'ArchivoBlack-400.ttf'), ('Plex', 'Plex-700.ttf')])
GRAO = ("url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>"
        "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/>"
        "<feColorMatrix values='0 0 0 0 1 0 0 0 0 .95 0 0 0 0 .9 0 0 0 1.1 -.45'/></filter>"
        "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")")
CSS = f'''{FONTES}*{{box-sizing:border-box}}body{{margin:0;background:#000}}
.tela{{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:{FUNDO}}}
.abs{{position:absolute}}
.anton{{font-family:"Anton";line-height:.88;letter-spacing:1px}}
.grao{{position:absolute;inset:0;background:{GRAO};opacity:.5;mix-blend-mode:screen;pointer-events:none}}
.sujo{{position:absolute;inset:0;background:radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.06),transparent 40%),
  radial-gradient(ellipse at 80% 90%,rgba(0,0,0,.45),transparent 50%);pointer-events:none}}
.vinheta{{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 50%,rgba(0,0,0,.65) 100%);pointer-events:none}}
.rasgo{{clip-path:polygon(2% 4%,30% 0,58% 3%,100% 1%,98% 35%,100% 70%,97% 100%,60% 97%,25% 100%,0 96%,3% 60%,0 30%)}}'''


def riscos(seed, n=40):
    random.seed(seed)
    return ''.join(f'<line x1="{(x := random.randint(0, W))}" y1="{(y := random.randint(0, H))}" x2="{x + random.randint(-90, 90)}" '
                   f'y2="{y + random.randint(-6, 6)}" stroke="rgba(241,230,210,.18)" stroke-width="{random.choice([1, 1, 2])}"/>' for _ in range(n))


def pagina(corpo, seed=1):
    return (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="tela">{corpo}'
            f'<svg class="abs" style="inset:0" width="{W}" height="{H}">{riscos(seed)}</svg><div class="sujo"></div><div class="grao"></div>'
            f'<div class="vinheta"></div></div></body></html>')


def svg(conteudo):
    return f'<svg class="abs" style="left:0;top:0;overflow:visible" width="{W}" height="{H}">{conteudo}</svg>'


por_do_sol = (f'<div class="abs" style="left:0;right:0;top:420px;height:520px;background:linear-gradient(180deg,rgba(255,61,127,0) 0%,'
              f'{ROSA} 35%,{LARANJA} 75%,#FFB35C 100%);opacity:.9"></div>')

# ---------- 1. CAPA: gente na praia de Ipanema ao pôr do sol, em meio-tom; R$ 449 com rabisco; estrelas
capa = (
        '<img class="abs" src="ipanema_r.png" style="left:308px;top:-32px;width:1640px;mix-blend-mode:screen;opacity:.85">'
        '<img class="abs" src="ipanema.png" style="left:300px;top:-40px;width:1640px">' +
        f'<div class="abs anton" style="left:70px;top:120px;font-size:330px;color:{LARANJA};text-shadow:8px 8px 0 {FUNDO}">R$ 449</div>'
        f'<div class="abs" style="left:10px;top:70px">{rabisco(3, 980, 470, 2, CREME, 10)}</div>'
        f'<div class="abs anton" style="left:80px;top:560px;font-size:150px;color:{CREME};text-shadow:6px 6px 0 {FUNDO}">QUEM FICOU<br>COM ISSO?</div>' +
        svg(estrela(1080, 140, 46, LARANJA) + estrela(1720, 300, 34, CREME, False, 12) + estrela(990, 900, 30, ROSA, rot=-10)))

# ---------- 2. GANCHO: 1 dia de GTA VI contra 1 ano do Brasil (a nota de 200 reais em meio-tom)
gancho = (f'<div class="abs" style="left:-80px;top:180px;width:1150px;height:700px;background:{LARANJA};transform:rotate(-4deg)"></div>'
          '<img class="abs rasgo" src="nota.png" style="left:-20px;top:240px;width:1100px;transform:rotate(-4deg);">' +
          f'<div class="abs anton" style="left:1150px;top:170px;font-size:230px;color:{CREME}">1 DIA</div>'
          f'<div class="abs anton" style="left:1160px;top:400px;font-size:120px;color:{LARANJA}">&gt; 1 ANO</div>'
          f'<div class="abs anton" style="left:1160px;top:520px;font-size:120px;color:{CREME}">DO BRASIL</div>' +
          svg(seta(5, 1240, 820, 1050, 640, ROSA, 10) + estrela(1720, 820, 50, ROSA) + estrela(1560, 930, 26, CREME, False)))

# ---------- 3. MISSÃO 2: a Receita, em meio-tom recortado; cartela "fatia cobrada"; placar perdendo
missao = (f'<div class="abs" style="left:120px;top:250px;width:760px;height:470px;background:{ROSA};transform:rotate(-3deg);clip-path:polygon(0 0,100% 0,96% 18%,100% 36%,95% 55%,100% 74%,96% 100%,0 100%)"></div>'
          '<div class="abs" style="left:120px;top:250px;width:760px;height:470px;overflow:hidden;transform:rotate(-3deg);clip-path:polygon(0 0,100% 0,96% 18%,100% 36%,95% 55%,100% 74%,96% 100%,0 100%)">'
          '<img src="nota.png" style="position:absolute;left:0;top:30px;width:1100px"></div>'
          f'<div class="abs" style="left:960px;top:330px;width:340px;height:470px;background:{ROSA};transform:rotate(9deg);clip-path:polygon(4% 0,100% 0,100% 100%,4% 100%,0 80%,5% 60%,0 40%,6% 22%)"></div>'
          '<div class="abs" style="left:960px;top:330px;width:340px;height:470px;overflow:hidden;transform:rotate(9deg);clip-path:polygon(4% 0,100% 0,100% 100%,4% 100%,0 80%,5% 60%,0 40%,6% 22%)">'
          '<img src="nota.png" style="position:absolute;left:-760px;top:30px;width:1100px"></div>' +
          f'<div class="abs" style="left:930px;top:300px">{rabisco(11, 420, 540, 2, LARANJA, 11)}</div>'
          f'<div class="abs" style="left:-40px;right:-40px;top:790px;height:200px;background:{FUNDO};transform:rotate(-3deg)"></div>'
          f'<div class="abs anton" style="left:0;right:0;top:800px;text-align:center;font-size:180px;color:{LARANJA};transform:rotate(-3deg);letter-spacing:6px">FATIA COBRADA</div>'
          f'<div class="abs anton" style="right:70px;top:60px;font-size:110px;color:{VERDE};-webkit-text-stroke:6px {FUNDO};paint-order:stroke fill">R$ 449,90</div>'
          f'<div class="abs anton" style="right:70px;top:185px;font-size:80px;color:{ROSA};-webkit-text-stroke:5px {FUNDO};paint-order:stroke fill">−R$ 126</div>' +
          svg(estrela(1560, 520, 40, CREME, False, 8) + estrela(1700, 640, 24, LARANJA) + seta(9, 1500, 330, 1330, 480, CREME, 8)))

for nome, corpo, s in [('v3_capa', capa, 1), ('v3_gancho', gancho, 2), ('v3_missao', missao, 3)]:
    (OUT / f'{nome}.html').write_text(pagina(corpo, s), encoding='utf-8')
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    pg = b.new_page(viewport={'width': W, 'height': H})
    for nome in ['v3_capa', 'v3_gancho', 'v3_missao']:
        pg.goto((OUT / f'{nome}.html').as_uri()); pg.wait_for_timeout(600)
        pg.screenshot(path=str(OUT / f'{nome}.png')); print('ok', nome)
    b.close()
