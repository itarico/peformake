# Artes Vó Vina no estilo do feed: amarelo dominante, roxo de detalhe, título pesado com contorno e sombra 3D,
# pizza recortada (foto real), manjericão e tomate voando (vetor). HTML -> PNG 1080x1350.
import asyncio, base64, pathlib, sys
from playwright.async_api import async_playwright

BASE = pathlib.Path(__file__).resolve().parent.parent
OUT = BASE / 'artes' / 'png2'
OUT.mkdir(parents=True, exist_ok=True)

def img(rel):
    p = BASE / rel
    return f"data:image/{'png' if p.suffix == '.png' else 'jpeg'};base64," + base64.b64encode(p.read_bytes()).decode()

ROXO = '#5B2A8C'; ROXO2 = '#3E1A63'; AM = '#FFD21A'; CREME = '#FFF3D6'; PRETO = '#1B0F05'
LOGO = img('fotos/logo.jpg')
CALAB = img('recortes/calab.png'); MUSS = img('recortes/muss.png'); FATIA = img('recortes/fatia_mao.png')
MASSA = img('videos/hd/bas_5.jpg')
P1 = img('prints/p1_inicio.png'); P2 = img('prints/p2_lista.png'); P3 = img('prints/p3c.png')
SELO = 'Massa de longa fermentação'  # trocar por "48h de fermentação" se o cliente confirmar

FOLHA = """<svg viewBox='0 0 100 60' xmlns='http://www.w3.org/2000/svg'><path d='M2 30 C25 0 70 -2 98 30 C70 62 25 60 2 30Z' fill='%2342A33A'/><path d='M2 30 C25 0 70 -2 98 30' fill='%235BC24F'/><path d='M4 30 L94 30' stroke='%23246B1F' stroke-width='2.5' fill='none'/></svg>"""
TOMATE = """<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><circle cx='50' cy='50' r='48' fill='#9E2A17'/><circle cx='50' cy='50' r='42' fill='#C9452B'/><g fill='#E9A07A' opacity='.85'><circle cx='30' cy='35' r='4'/><circle cx='62' cy='28' r='3'/><circle cx='70' cy='58' r='4.5'/><circle cx='42' cy='66' r='3.5'/><circle cx='52' cy='46' r='2.5'/><circle cx='26' cy='58' r='3'/><circle cx='78' cy='40' r='2.5'/></g></svg>"""
def svg(s): return "url('data:image/svg+xml;base64," + base64.b64encode(s.replace('%23', '#').encode()).decode() + "')"
F, T = svg(FOLHA), svg(TOMATE)

def deco(itens):
    out = ''
    for kind, x, y, w, rot, blur in itens:
        bg = F if kind == 'f' else T
        h = int(w * (0.6 if kind == 'f' else 1))
        out += f'<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;background:{bg} center/contain no-repeat;transform:rotate({rot}deg);filter:blur({blur}px) drop-shadow(0 10px 12px rgba(0,0,0,.25))"></div>'
    return out

CSS = f"""
@import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Baloo+2:wght@600;700;800&display=swap');
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1080px;height:1350px;overflow:hidden;font-family:'Baloo 2',sans-serif;color:{ROXO2};position:relative}}
.fundo{{position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,#FFE65C 0%,{AM} 45%,#F2A900 100%)}}
.t{{font-family:'Luckiest Guy',cursive;line-height:.9;letter-spacing:1px;text-transform:uppercase;color:#fff;
   -webkit-text-stroke:7px {PRETO};paint-order:stroke fill;
   text-shadow:3px 3px 0 {PRETO},6px 6px 0 {PRETO},9px 9px 0 {PRETO},12px 12px 0 {PRETO}}}
.ty{{color:{AM}}}
.tr{{color:{ROXO}}}
.pill{{display:inline-block;background:{ROXO};color:#fff;border-radius:999px;padding:12px 30px;font-weight:800;font-size:34px;box-shadow:0 8px 0 {ROXO2}}}
.card{{background:{CREME};border-radius:34px;padding:34px 40px;box-shadow:0 18px 40px rgba(60,20,0,.28)}}
.logo{{width:170px;height:170px;border-radius:50%;background:url({LOGO}) center/cover;border:6px solid #fff;box-shadow:0 10px 24px rgba(0,0,0,.25)}}
.selo{{display:inline-block;background:{ROXO};color:{AM};border-radius:16px;padding:10px 20px;font-weight:800;font-size:26px;transform:rotate(-3deg)}}
.recorte{{position:absolute;background-size:contain;background-repeat:no-repeat;filter:drop-shadow(0 30px 30px rgba(70,30,0,.45))}}
.cont{{position:absolute;top:50px;right:56px;background:{ROXO};color:#fff;border-radius:999px;padding:6px 18px;font-weight:800;font-size:26px}}
.print{{background:#fff;border-radius:46px;padding:16px;box-shadow:0 30px 60px rgba(70,30,0,.35);border:6px solid {ROXO}}}
.print div{{border-radius:30px;background-size:cover;background-position:top center;width:100%;height:100%}}
"""
def page(body, extra=''):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}{extra}</style></head><body><div class="fundo"></div>{body}</body></html>'
def logo_base(y=1150): return f'<div class="logo" style="position:absolute;left:455px;top:{y}px;width:170px;height:170px"></div>'

ARTES = {}
D1 = deco([('f', 60, 120, 120, -25, 0), ('t', 900, 80, 110, 10, 0), ('f', 930, 560, 140, 40, 2), ('t', 40, 700, 90, 0, 3), ('f', 820, 1180, 110, -60, 0)])

# P01 · anúncio do combo (4:5)
ARTES['P01_anuncio_combo'] = page(f"""{D1}
<div style="position:absolute;top:70px;left:0;right:0;text-align:center">
  <div class="t" style="font-size:132px;transform:rotate(-4deg)">Dezembro é<br><span class="ty">mesa cheia!</span></div></div>
<div class="recorte" style="left:-120px;top:520px;width:820px;height:400px;background-image:url({MUSS});transform:rotate(-8deg)"></div>
<div class="recorte" style="left:330px;top:640px;width:880px;height:410px;background-image:url({CALAB});transform:rotate(6deg)"></div>
<div style="position:absolute;top:430px;left:0;right:0;text-align:center"><span class="pill">Combo Mais Pedido · Mussarela + Calabresa</span></div>
<div style="position:absolute;left:50px;top:960px;width:300px;height:300px;border-radius:50%;background:{ROXO};border:8px solid #fff;box-shadow:0 14px 0 {ROXO2};display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-8deg)">
  <div style="color:#fff;font-weight:800;font-size:28px">2 pizzas grandes</div><div class="t ty" style="font-size:70px;-webkit-text-stroke:5px {PRETO}">R$ 69,90</div></div>
<div style="position:absolute;right:60px;top:1110px;text-align:right"><span class="selo">{SELO}</span><br><br>
  <span class="pill" style="font-size:36px">Peça pelo cardápio digital</span></div>
""")

# P02 · post dos combos do cardápio
ARTES['P02_post_combos'] = page(f"""{deco([('f', 880, 60, 130, 30, 0), ('t', 60, 70, 100, 0, 0), ('f', 30, 1120, 120, -40, 2), ('t', 960, 1000, 90, 0, 3)])}
<div style="position:absolute;top:90px;left:0;right:0;text-align:center">
  <div class="t" style="font-size:118px;transform:rotate(-3deg)">Dezembro chegou<br>na <span class="ty">Vó Vina!</span></div></div>
<div class="recorte" style="left:160px;top:430px;width:760px;height:360px;background-image:url({CALAB})"></div>
<div style="position:absolute;left:70px;right:70px;top:800px;display:flex;gap:30px">
  <div class="card" style="flex:1;transform:rotate(-2deg)"><div style="font-weight:800;font-size:36px;line-height:1">Combo Mais Pedido</div>
    <div style="font-size:28px;font-weight:600;margin:8px 0 12px">Mussarela + Calabresa</div><div class="t tr" style="font-size:64px;-webkit-text-stroke:4px {PRETO};text-shadow:4px 4px 0 {PRETO}">R$ 69,90</div></div>
  <div class="card" style="flex:1;transform:rotate(2deg)"><div style="font-weight:800;font-size:36px;line-height:1">Clássicos da Casa</div>
    <div style="font-size:28px;font-weight:600;margin:8px 0 12px">Mussarela + Frango com Catupiry</div><div class="t tr" style="font-size:64px;-webkit-text-stroke:4px {PRETO};text-shadow:4px 4px 0 {PRETO}">R$ 79,90</div></div></div>
<div style="position:absolute;left:0;right:0;top:1120px;text-align:center"><span class="pill">Monte seu combo pelo link da bio</span></div>
{logo_base(1190)}
""")

# P03 · carrossel 6 telas
def c3(n, corpo): return page(corpo + f'<div class="cont">{n}/6</div>')
ARTES['P03_1_capa'] = c3(1, f"""{deco([('f', 70, 90, 120, -20, 0), ('t', 880, 160, 100, 0, 0), ('f', 900, 980, 130, 50, 2)])}
<div style="position:absolute;top:120px;left:60px;width:600px">
  <div class="t" style="font-size:136px;transform:rotate(-4deg)">Meio a meio<br>em <span class="ty">3 passos!</span></div>
  <div style="font-size:42px;font-weight:800;margin-top:40px;color:{ROXO2}">Sem ligação, sem espera.</div>
  <div style="margin-top:24px"><span class="pill">Arrasta →</span></div></div>
<div class="recorte" style="right:-30px;top:330px;width:520px;height:1160px;background-image:url({FATIA});transform:rotate(8deg)"></div>""")
def passo(n, num, titulo, texto, shot, pos):
    return c3(n, f"""{deco([('f', 40, 1160, 110, -30, 1), ('t', 520, 60, 80, 0, 0)])}
<div style="position:absolute;top:130px;left:60px;width:470px">
  <div class="t ty" style="font-size:300px;line-height:.8">{num}</div>
  <div class="t" style="font-size:78px;margin-top:20px">{titulo}</div>
  <div class="card" style="margin-top:36px;font-size:34px;font-weight:700;line-height:1.2;padding:26px 30px">{texto}</div></div>
<div class="print" style="position:absolute;top:120px;right:56px;width:440px;height:960px;transform:rotate(3deg)"><div style="background-image:url({shot});background-position:center {pos}"></div></div>
{logo_base(1170)}""")
ARTES['P03_2_passo1'] = passo(2, '1', 'Abra o cardápio', 'Toque no link da bio do <b>@vovinapizza</b>.', P1, '0%')
ARTES['P03_3_passo2'] = passo(3, '2', 'Escolha os sabores', 'Combos, as que todo mundo pede e o sabor do mês. Metade de cada um.', P3, '10%')
ARTES['P03_4_passo3'] = passo(4, '3', 'Confira e finalize', 'Entrega ou retirada, confere o pedido e pronto.', P2, '100%')
ARTES['P03_5_forno'] = c3(5, f"""{deco([('t', 900, 120, 110, 0, 0), ('f', 60, 1100, 130, -30, 0)])}
<div style="position:absolute;left:90px;right:90px;top:120px;height:760px;border-radius:40px;background:url({MASSA}) center/cover;border:10px solid #fff;box-shadow:0 30px 50px rgba(70,30,0,.35);transform:rotate(-2deg)"></div>
<div style="position:absolute;left:0;right:0;top:920px;text-align:center">
  <div class="t" style="font-size:112px;transform:rotate(-3deg)">O forno já tá<br><span class="ty">esperando!</span></div>
  <div style="font-size:36px;font-weight:800;margin-top:26px">A massa descansada vai direto pro forno.</div></div>""")
ARTES['P03_6_cta'] = c3(6, f"""{D1}
<div style="position:absolute;top:150px;left:0;right:0;text-align:center">
  <div class="logo" style="margin:0 auto 60px;width:240px;height:240px"></div>
  <div class="t" style="font-size:150px;transform:rotate(-4deg)">Salve<br><span class="ty">este post!</span></div>
  <div style="font-size:42px;font-weight:800;margin:56px 0 36px">E peça pelo link da bio hoje mesmo.</div>
  <span class="pill" style="font-size:40px">Cardápio digital no link da bio</span></div>""")

# Recado da Vó: feriado (hoje 20/11 e a versão de 07/12)
def feriado(quando, rodape):
    return page(f"""{deco([('f', 70, 100, 120, -25, 0), ('t', 900, 110, 100, 0, 0), ('f', 920, 780, 140, 40, 2), ('t', 60, 820, 80, 0, 3)])}
<div style="position:absolute;top:110px;left:0;right:0;text-align:center">
  <span class="pill" style="transform:rotate(-3deg);display:inline-block">Recado da Vó</span>
  <div class="t" style="font-size:150px;margin-top:40px;transform:rotate(-4deg)">{quando} é<br><span class="ty">feriado!</span></div>
  <div class="card" style="display:inline-block;margin-top:50px;font-size:44px;font-weight:800;padding:22px 44px;transform:rotate(2deg)">Já sabe quem vai cuidar do jantar?</div></div>
<div class="recorte" style="left:140px;top:820px;width:800px;height:380px;background-image:url({CALAB})"></div>
<div style="position:absolute;left:0;right:0;top:1190px;text-align:center"><span class="pill">{rodape}</span></div>""")
ARTES['P04_hoje_feriado_20-11'] = feriado('Hoje', 'Peça pelo cardápio digital · link da bio')
ARTES['P04_amanha_feriado_07-12'] = feriado('Amanhã', 'Peça pelo cardápio digital · link da bio')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1080, 'height': 1350})
        for nome, html in ARTES.items():
            await pg.set_content(html, wait_until='networkidle'); await pg.wait_for_timeout(500)
            await pg.screenshot(path=str(OUT / f'{nome}.png')); print(nome)
        await b.close()
asyncio.run(main())
