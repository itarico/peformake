# Vó Vina v3: fotos do ensaio (Drive/Clientes/Vovina/NOV), amarelo dominante, roxo de detalhe, título pesado com
# contorno e sombra 3D (estilo do feed). Regras do Italo: sem botão/pílula/caixinha (não é interface), só foto real
# (nunca quadro de vídeo), alternar foto inteira e recorte, "Vó" é só o nome (sem vovó personagem), bordão "Tá aprovada, viu?".
import asyncio, base64, pathlib
from playwright.async_api import async_playwright
from PIL import Image
import io

BASE = pathlib.Path(__file__).resolve().parent.parent
SEL = BASE / 'ensaio' / 'sel'
OUT = BASE / 'artes' / 'png3'; OUT.mkdir(parents=True, exist_ok=True)

def img(p, maxw=1400):
    im = Image.open(p)
    if im.width > maxw:
        im = im.resize((maxw, int(im.height * maxw / im.width)))
    buf = io.BytesIO()
    if im.mode == 'RGBA':
        im.save(buf, 'PNG'); mime = 'png'
    else:
        im.convert('RGB').save(buf, 'JPEG', quality=90); mime = 'jpeg'
    return f'data:image/{mime};base64,' + base64.b64encode(buf.getvalue()).decode()

F = {n: img(SEL / f'vovina-{n}.png') for n in ['82', '61', '74', '41']}
R = {n: img(SEL / f'recorte-{n}.png') for n in ['66', '43', '35']}
P1 = img(BASE / 'prints/p1_inicio.png', 1170); P2 = img(BASE / 'prints/p2_lista.png', 1170); P3 = img(BASE / 'prints/p3c.png', 1170)

AM = '#FFD21A'; ROXO = '#5B2A8C'; MAR = '#2B1606'; PRETO = '#170C03'
CSS = f"""
@import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Baloo+2:wght@600;700;800&display=swap');
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1080px;height:1350px;overflow:hidden;font-family:'Baloo 2',sans-serif;color:{MAR};position:relative;background:{AM}}}
.am{{position:absolute;inset:0;background:radial-gradient(circle at 50% 38%,#FFE45A 0%,{AM} 48%,#F0A800 100%)}}
.foto{{position:absolute;inset:0;background-size:cover;background-position:center}}
.t{{font-family:'Luckiest Guy',cursive;line-height:.9;letter-spacing:1px;text-transform:uppercase;color:#fff;
   -webkit-text-stroke:7px {PRETO};paint-order:stroke fill;text-shadow:3px 3px 0 {PRETO},6px 6px 0 {PRETO},9px 9px 0 {PRETO},12px 12px 0 {PRETO}}}
.y{{color:{AM}}} .r{{color:{ROXO}}}
.apoio{{font-weight:800;font-size:40px;line-height:1.15}}
.cta{{font-family:'Luckiest Guy',cursive;font-size:44px;letter-spacing:1px;text-transform:uppercase;color:{ROXO}}}
.cta.b{{color:#fff;-webkit-text-stroke:3px {PRETO};paint-order:stroke fill}}
.ass{{position:absolute;bottom:46px;font-weight:800;font-size:30px;letter-spacing:.5px}}
.rec{{position:absolute;background-size:contain;background-repeat:no-repeat;filter:drop-shadow(0 34px 34px rgba(60,25,0,.5))}}
.n{{position:absolute;top:52px;right:60px;font-family:'Luckiest Guy';font-size:34px;color:{ROXO}}}
.cel{{position:absolute;background-size:cover;background-position:top center;border-radius:46px;border:12px solid {PRETO};box-shadow:0 34px 60px rgba(60,25,0,.4)}}
"""
SETA = '&#10140;'
def page(body): return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{body}</body></html>'
def escuro(top=.55, base=.9): return f'<div class="foto" style="background:linear-gradient(180deg,rgba(15,7,0,{top}) 0%,rgba(15,7,0,0) 30%,rgba(15,7,0,0) 50%,rgba(15,7,0,{base}) 82%)"></div>'

A = {}
# P01 · anúncio · foto inteira (mãos segurando o Combo Clássicos: mussarela + frango com catupiry)
A['P01_anuncio_combo_classicos'] = page(f"""<div class="foto" style="background-image:url({F['82']});background-position:center 45%"></div>{escuro()}
<div style="position:absolute;top:70px;left:60px;right:60px"><div class="t y" style="font-size:124px;transform:rotate(-3deg)">Dezembro é<br>mesa cheia</div></div>
<div style="position:absolute;left:60px;right:60px;bottom:120px;color:#fff">
  <div class="t" style="font-size:66px">Combo Clássicos da Casa</div>
  <div class="apoio" style="color:#fff;margin:14px 0 18px">Mussarela + Frango com Catupiry · 2 pizzas grandes</div>
  <div class="t y" style="font-size:118px">R$ 79,90</div></div>
<div class="ass" style="left:60px;color:#fff"><span class="cta b">{SETA} Peça pelo link da bio</span></div>
<div class="ass" style="right:60px;color:#fff">@vovinapizza</div>""")

# P02 · post · recorte das 2 pizzas do combo no amarelo
A['P02_post_dezembro'] = page(f"""<div class="am"></div>
<div style="position:absolute;top:80px;left:0;right:0;text-align:center"><div class="t" style="font-size:118px;transform:rotate(-3deg)">Dezembro chegou<br>na <span class="y">Vó Vina</span></div></div>
<div class="rec" style="left:60px;top:430px;width:660px;height:720px;background-image:url({R['66']})"></div>
<div style="position:absolute;right:60px;top:560px;width:380px;text-align:right">
  <div class="t r" style="font-size:58px;-webkit-text-stroke:5px {PRETO}">Combo<br>Clássicos</div>
  <div class="apoio" style="font-size:32px;margin:10px 0">Mussarela + Frango com Catupiry</div>
  <div class="t" style="font-size:96px">R$ 79,90</div>
  <div class="apoio" style="font-size:30px;margin-top:40px;color:{ROXO}">ou 2 Mussarelas<br>por R$ 69,90</div></div>
<div class="ass" style="left:60px"><span class="cta">{SETA} Monte o seu pelo link da bio</span></div>
<div class="ass" style="right:60px">@vovinapizza</div>""")

# P03 · carrossel 6 telas (alterna foto inteira, prints e recorte)
def num(n): return f'<div class="n">{n}/6</div>'
A['P03_1_capa'] = page(f"""<div class="foto" style="background-image:url({F['61']});background-position:center 40%"></div>{escuro(.7,.5)}
<div style="position:absolute;top:80px;left:60px;right:60px"><div class="t" style="font-size:140px;transform:rotate(-3deg)">Meio a meio<br>em <span class="y">3 passos</span></div>
<div class="apoio" style="color:#fff;margin-top:30px;font-size:44px">Sem ligação, sem espera.</div></div>
<div class="ass" style="left:60px"><span class="cta b">Arrasta {SETA}</span></div>{num(1)}""")
def passo(n, k, titulo, texto, shot, pos):
    return page(f"""<div class="am"></div>
<div style="position:absolute;top:120px;left:60px;width:470px">
  <div class="t y" style="font-size:300px;line-height:.8">{k}</div>
  <div class="t" style="font-size:80px;margin-top:24px">{titulo}</div>
  <div class="apoio" style="margin-top:30px">{texto}</div></div>
<div class="cel" style="top:110px;right:60px;width:440px;height:960px;background-image:url({shot});background-position:center {pos};transform:rotate(3deg)"></div>
<div class="ass" style="left:60px">@vovinapizza</div>{num(n)}""")
A['P03_2_passo1'] = passo(2, '1', 'Abra o cardápio', 'Toque no link da bio do @vovinapizza.', P1, '0%')
A['P03_3_passo2'] = passo(3, '2', 'Escolha os sabores', 'Combos, as que todo mundo pede e o sabor do mês. Metade de cada um.', P3, '10%')
A['P03_4_passo3'] = passo(4, '3', 'Confira e finalize', 'Entrega ou retirada, confere o pedido e pronto.', P2, '100%')
A['P03_5_forno'] = page(f"""<div class="foto" style="background-image:url({F['74']});background-position:center 45%"></div>{escuro(.2,.85)}
<div style="position:absolute;left:60px;right:60px;bottom:150px"><div class="t" style="font-size:118px;transform:rotate(-3deg)">O forno já tá<br><span class="y">esperando</span></div>
<div class="apoio" style="color:#fff;margin-top:24px">Massa de longa fermentação, direto pro forno.</div></div>{num(5)}""")
A['P03_6_cta'] = page(f"""<div class="am"></div>
<div class="rec" style="left:190px;top:560px;width:700px;height:700px;background-image:url({R['43']})"></div>
<div style="position:absolute;top:110px;left:0;right:0;text-align:center"><div class="t" style="font-size:150px;transform:rotate(-3deg)">Salve<br><span class="r">este post</span></div>
<div class="apoio" style="margin-top:30px;font-size:44px">E peça hoje mesmo.</div></div>
<div class="ass" style="left:60px"><span class="cta">{SETA} Cardápio no link da bio</span></div>{num(6)}""")

# Feriado · hoje (foto inteira) e 07/12 (recorte no amarelo)
A['P04_hoje_feriado_20-11'] = page(f"""<div class="foto" style="background-image:url({F['41']});background-position:center 50%"></div>{escuro(.75,.85)}
<div style="position:absolute;top:80px;left:60px;right:60px"><div class="t" style="font-size:150px;transform:rotate(-3deg)">Hoje é<br><span class="y">feriado</span></div>
<div class="apoio" style="color:#fff;margin-top:30px;font-size:48px">O jantar já tá resolvido.</div></div>
<div style="position:absolute;left:60px;right:60px;bottom:120px"><div class="t y" style="font-size:84px">Tá aprovada, viu?</div></div>
<div class="ass" style="left:60px"><span class="cta b">{SETA} Peça pelo link da bio</span></div>
<div class="ass" style="right:60px;color:#fff">@vovinapizza</div>""")
A['P04_amanha_feriado_07-12'] = page(f"""<div class="am"></div>
<div style="position:absolute;top:90px;left:0;right:0;text-align:center"><div class="t" style="font-size:150px;transform:rotate(-3deg)">Amanhã é<br><span class="y">feriado</span></div>
<div class="apoio" style="margin-top:28px;font-size:46px">E o jantar já tem dono.</div></div>
<div class="rec" style="left:170px;top:560px;width:740px;height:680px;background-image:url({R['35']})"></div>
<div class="ass" style="left:60px"><span class="cta">{SETA} Peça pelo link da bio</span></div>
<div class="ass" style="right:60px">@vovinapizza</div>""")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1080, 'height': 1350})
        for nome, html in A.items():
            await pg.set_content(html, wait_until='networkidle'); await pg.wait_for_timeout(500)
            await pg.screenshot(path=str(OUT / f'{nome}.png')); print(nome)
        await b.close()
asyncio.run(main())
