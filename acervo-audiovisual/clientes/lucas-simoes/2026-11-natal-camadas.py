from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
F = r"C:\Users\User\AppData\Local\Microsoft\Windows\Fonts"
OUT = r"C:\Users\User\Downloads\lucas_natal\criativos"
L = os.path.join(OUT, "camadas")

def serif(sz, w=700):
    f = ImageFont.truetype(os.path.join(F, "PlayfairDisplay-VariableFont_wght.ttf"), sz)
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f
def ital(sz, w=500):
    f = ImageFont.truetype(os.path.join(F, "PlayfairDisplay-Italic-VariableFont_wght.ttf"), sz)
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f
def inter(sz, k="SemiBold"): return ImageFont.truetype(os.path.join(F, f"Inter-{k}.otf"), sz)

CREAM = (255, 246, 230, 255); GOLD = (226, 190, 110, 255); RED = (150, 22, 30, 255); WHITE = (255, 255, 255, 255)

def grad(W, H, y0, y1, top_alpha, bot_alpha):
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(g)
    for y in range(y0, y1):
        a = int(top_alpha + (bot_alpha - top_alpha) * (y - y0) / max(1, y1 - y0))
        d.line([(0, y), (W, y)], fill=(12, 4, 4, a))
    return g

def ctext(d, y, t, f, fill, W=1080, shadow=True):
    w = d.textlength(t, font=f); x = (W - w) / 2
    if shadow: d.text((x + 2, y + 3), t, font=f, fill=(0, 0, 0, 150))
    d.text((x, y), t, font=f, fill=fill)
    b = d.textbbox((x, y), t, font=f); return b[3]

def pill(d, y, t, f, W=1080, bg=GOLD, fg=(40, 10, 10, 255), padx=46, pady=22):
    w = d.textlength(t, font=f); b = d.textbbox((0, 0), t, font=f); h = b[3] - b[1]
    x0 = (W - w) / 2 - padx; x1 = (W + w) / 2 + padx
    d.rounded_rectangle([x0, y, x1, y + h + 2 * pady], radius=(h + 2 * pady) // 2, fill=bg)
    d.text(((W - w) / 2, y + pady - b[1]), t, font=f, fill=fg)
    return y + h + 2 * pady

def hook(name, l1, l2, l3=None):
    im = grad(1080, 1920, 0, 760, 200, 0); d = ImageDraw.Draw(im)
    y = 250
    y = ctext(d, y, l1, inter(40, "SemiBold"), GOLD) + 18
    y = ctext(d, y, l2, serif(96), CREAM) + 6
    if l3: ctext(d, y, l3, ital(72), CREAM)
    im.save(os.path.join(L, name))

def endcard(name, top="3 pacotes a partir de"):
    im = grad(1080, 1920, 820, 1920, 0, 235); d = ImageDraw.Draw(im)
    y = 1010
    y = ctext(d, y, top, inter(44, "Medium"), CREAM) + 8
    y = ctext(d, y, "R$ 197", serif(150), GOLD) + 22
    y = ctext(d, y, "Últimas datas até 21/12", inter(46, "SemiBold"), CREAM) + 36
    pill(d, y, "Chama no WhatsApp", inter(44, "Bold"))
    im.save(os.path.join(L, name))

def pacotes(name):
    im = grad(1080, 1920, 60, 460, 0, 190); im.alpha_composite(grad(1080, 1920, 460, 1920, 190, 235)); d = ImageDraw.Draw(im)
    y = 330
    y = ctext(d, y, "Ensaio de Natal", serif(92), CREAM) + 4
    y = ctext(d, y, "em São Lourenço da Mata", ital(54), CREAM) + 50
    rows = [("Natal Essencial", "30 min · 5 fotos tratadas", "R$ 197", False),
            ("Natal Especial", "45 min · 10 fotos tratadas", "R$ 297", True),
            ("Natal Completo", "60 min · 20 fotos + vídeo de bastidores", "R$ 447", False)]
    for t, s, p, hi in rows:
        h = 190; x0, x1 = 90, 990
        d.rounded_rectangle([x0, y, x1, y + h], radius=26, fill=(255, 248, 236, 235) if not hi else (255, 241, 210, 245),
                            outline=GOLD if hi else None, width=5)
        d.text((x0 + 40, y + 34), t, font=serif(54), fill=RED)
        d.text((x0 + 40, y + 112), s, font=inter(30, "Medium"), fill=(70, 40, 35, 255))
        pw = d.textlength(p, font=serif(60)); d.text((x1 - 40 - pw, y + 58), p, font=serif(60), fill=(40, 10, 10, 255))
        if hi:
            tag = "Mais indicado"; f = inter(26, "Bold"); tw = d.textlength(tag, font=f)
            d.rounded_rectangle([x1 - 60 - tw, y - 22, x1 - 20, y + 22], radius=22, fill=RED)
            d.text((x1 - 40 - tw, y - 16), tag, font=f, fill=WHITE)
        y += h + 34
    y += 14
    y = ctext(d, y, "Últimas datas até 21/12", inter(44, "SemiBold"), CREAM) + 30
    pill(d, y, "Chama no WhatsApp", inter(44, "Bold"))
    im.save(os.path.join(L, name))

def estatica(src, W, H, name, top_y):
    base = Image.open(src).convert("RGB")
    s = max(W / base.width, H / base.height); base = base.resize((int(base.width * s), int(base.height * s)), Image.LANCZOS)
    x = (base.width - W) // 2; y = (base.height - H) // 2; base = base.crop((x, y, x + W, y + H)).convert("RGBA")
    base.alpha_composite(grad(W, H, 0, int(H * 0.42), 215, 0))
    base.alpha_composite(grad(W, H, int(H * 0.52), H, 0, 235))
    d = ImageDraw.Draw(base)
    y = top_y
    y = ctext(d, y, "SÃO LOURENÇO DA MATA", inter(36, "SemiBold"), GOLD, W) + 16
    y = ctext(d, y, "Ensaio de Natal", serif(112), CREAM, W) + 4
    ctext(d, y, "com cenário montado e direção de poses", ital(44), CREAM, W)
    yb = H - (680 if H > 1500 else 430)
    yb = ctext(d, yb, "3 pacotes a partir de", inter(44, "Medium"), CREAM, W) + 4
    yb = ctext(d, yb, "R$ 197", serif(140), GOLD, W) + 18
    yb = ctext(d, yb, "Vagas limitadas · últimas datas até 21/12", inter(38, "SemiBold"), CREAM, W) + 30
    pill(d, yb, "Chama no WhatsApp", inter(42, "Bold"), W)
    base.convert("RGB").save(os.path.join(OUT, name), quality=95)

hook("c1_gancho.png", "ESTÚDIO DE NATAL MONTADO", "Ensaio de Natal", "em São Lourenço da Mata")
endcard("c1_final.png")
hook("c2_gancho.png", "AGENDA DE DEZEMBRO ABERTA", "Ainda dá tempo", "do seu ensaio de Natal")
pacotes("c2_pacotes.png")
estatica(os.path.join(L, "quadro_5148.jpg"), 1080, 1350, "C3_arte_4x5.jpg", 70)
estatica(os.path.join(L, "quadro_5148.jpg"), 1080, 1920, "C3_arte_9x16.jpg", 230)
print("ok")
