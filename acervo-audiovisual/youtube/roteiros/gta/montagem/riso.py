"""Textura de risografia e colagem (referências do Italo, 23/11/2026): foto em meio-tom de uma cor, papel com grão e
sujeira, rabisco à mão, estrelas, registro desalinhado. Usado pelos quadros v3 e pelas cenas.
meio_tom(foto, saida, tinta, papel, largura, celula): PNG com a foto em pontos da cor da tinta sobre fundo transparente
ou papel."""
import math, random
from PIL import Image, ImageDraw, ImageOps, ImageFilter, ImageEnhance


def meio_tom(foto, saida, tinta=(245, 236, 220), papel=None, largura=1400, celula=7, angulo=22, contraste=1.6, recorte=None, claro=False):
    """claro=True: tinta clara sobre fundo escuro (ponto maior onde a foto é clara)."""
    im = Image.open(foto).convert('L')
    if recorte: im = im.crop(recorte)
    im = im.resize((largura, int(im.height * largura / im.width)), Image.LANCZOS)
    im = ImageEnhance.Contrast(ImageOps.autocontrast(im, cutoff=2)).enhance(contraste)
    w, h = im.size
    big = im.rotate(angulo, expand=True, fillcolor=0 if claro else 255)
    W, H = big.size
    esc = 3  # supersample
    dots = Image.new('L', (W * esc, H * esc), 0)
    d = ImageDraw.Draw(dots)
    px = big.load()
    for y in range(0, H, celula):
        for x in range(0, W, celula):
            v = px[min(x + celula // 2, W - 1), min(y + celula // 2, H - 1)]
            r = ((v / 255) if claro else (1 - v / 255)) ** 0.8 * celula * 0.75
            if r > 0.4:
                cx, cy = (x + celula / 2) * esc, (y + celula / 2) * esc
                d.ellipse([cx - r * esc, cy - r * esc, cx + r * esc, cy + r * esc], fill=255)
    dots = dots.resize((W, H), Image.LANCZOS).rotate(-angulo, expand=False)
    l, t = (W - w) // 2, (H - h) // 2
    mask = dots.crop((l, t, l + w, t + h))
    # sujeira: falhas de tinta
    rnd = Image.effect_noise((w, h), 90).filter(ImageFilter.GaussianBlur(1.2)).point(lambda v: 255 if v > 70 else 0)
    mask = Image.composite(mask, Image.new('L', (w, h), 0), rnd)
    base = Image.new('RGBA', (w, h), papel + (255,) if papel else (0, 0, 0, 0))
    cor = Image.new('RGBA', (w, h), tinta + (255,))
    base.paste(cor, (0, 0), mask)
    base.save(saida)
    return w, h


def rabisco(seed, w=600, h=400, voltas=3, cor='#FF6A2B', esp=9):
    """Rabisco à mão (laço que se repete), em SVG."""
    random.seed(seed)
    pts = []
    cx, cy = w / 2, h / 2
    for i in range(voltas * 14):
        a = i / 14 * 2 * math.pi
        rx = w * (0.38 + random.uniform(-.06, .06)); ry = h * (0.34 + random.uniform(-.07, .07))
        pts.append((cx + rx * math.cos(a) + random.uniform(-8, 8), cy + ry * math.sin(a) + random.uniform(-8, 8)))
    d = f'M{pts[0][0]:.0f},{pts[0][1]:.0f}' + ''.join(
        f' Q{pts[i][0]:.0f},{pts[i][1]:.0f} {(pts[i][0] + pts[i + 1][0]) / 2:.0f},{(pts[i][1] + pts[i + 1][1]) / 2:.0f}' for i in range(1, len(pts) - 1))
    return (f'<svg width="{w}" height="{h}" style="overflow:visible"><filter id="r{seed}"><feTurbulence baseFrequency=".04" numOctaves="2" seed="{seed}"/>'
            f'<feDisplacementMap in="SourceGraphic" scale="7"/></filter><path d="{d}" fill="none" stroke="{cor}" stroke-width="{esp}" '
            f'stroke-linecap="round" stroke-linejoin="round" filter="url(#r{seed})"/></svg>')


def seta(seed, x1, y1, x2, y2, cor='#FF6A2B', esp=9):
    random.seed(seed)
    mx, my = (x1 + x2) / 2 + random.uniform(-60, 60), (y1 + y2) / 2 + random.uniform(-60, 60)
    a = math.atan2(y2 - my, x2 - mx); L = 42
    p1 = (x2 - L * math.cos(a - .5), y2 - L * math.sin(a - .5)); p2 = (x2 - L * math.cos(a + .5), y2 - L * math.sin(a + .5))
    return (f'<path d="M{x1},{y1} Q{mx:.0f},{my:.0f} {x2},{y2} M{p1[0]:.0f},{p1[1]:.0f} L{x2},{y2} L{p2[0]:.0f},{p2[1]:.0f}" fill="none" '
            f'stroke="{cor}" stroke-width="{esp}" stroke-linecap="round" stroke-linejoin="round"/>')


def estrela(x, y, r, cor='#FF6A2B', cheia=True, rot=0):
    pts = ' '.join(f'{x + (r if i % 2 == 0 else r * .45) * math.cos(math.radians(rot - 90 + i * 36)):.0f},'
                   f'{y + (r if i % 2 == 0 else r * .45) * math.sin(math.radians(rot - 90 + i * 36)):.0f}' for i in range(10))
    return f'<polygon points="{pts}" fill="{cor if cheia else "none"}" stroke="{cor}" stroke-width="5" stroke-linejoin="round"/>'
