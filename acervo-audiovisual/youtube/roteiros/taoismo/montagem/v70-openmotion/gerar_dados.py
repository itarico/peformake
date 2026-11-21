# Gera os dados das cenas novas do v70: contorno da China (Natural Earth, dominio publico) e pontos das particulas de tinta.
import json, pathlib, random
from PIL import Image, ImageDraw, ImageFont
AQUI = pathlib.Path(__file__).resolve().parent
FONTES = pathlib.Path(r'C:\Users\User\AppData\Local\Temp\claude\b0147d3e513e77ed\eb43bf09-0fe4-4e21-afcc-3832f6e69376\scratchpad\fontes')
# ---- mapa: caixa lon 73..135, lat 17..54 -> retangulo 760x560 a partir de (x0,y0) no quadro 1920x1080
X0, Y0, W, H = 880, 160, 920, 550
LON0, LON1, LAT0, LAT1 = 73, 135, 17, 54
def pt(lon, lat): return (X0 + (lon - LON0) / (LON1 - LON0) * W, Y0 + (LAT1 - lat) / (LAT1 - LAT0) * H)
g = json.load(open(AQUI.parent.parent / 'teste-estilo' / 'paises.geojson', encoding='utf-8'))
def simpl(anel, tol):  # Douglas-Peucker simples
    if len(anel) < 4: return anel
    def dp(a):
        (x1, y1), (x2, y2) = a[0], a[-1]; dx, dy = x2 - x1, y2 - y1; L = (dx * dx + dy * dy) ** .5 or 1e-9
        d = [abs(dy * x - dx * y + x2 * y1 - y2 * x1) / L for x, y in a[1:-1]]
        if not d or max(d) < tol: return [a[0], a[-1]]
        i = d.index(max(d)) + 1; return dp(a[:i + 1])[:-1] + dp(a[i:])
    return dp(anel)
caminhos = []
for f in g['features']:
    if f['properties']['ADMIN'] not in ('China', 'Taiwan'): continue
    polys = f['geometry']['coordinates'] if f['geometry']['type'] == 'MultiPolygon' else [f['geometry']['coordinates']]
    for p in polys:
        anel = [pt(*c) for c in p[0]]
        if len(anel) < 8: continue
        m = len(anel) // 2; s = simpl(anel[:m + 1], 1.2)[:-1] + simpl(anel[m:], 1.2)  # anel fechado: simplifica em duas metades
        caminhos.append('M' + ' L'.join(f'{x:.0f},{y:.0f}' for x, y in s) + 'Z')
lugares = {'guodian': (112.2, 30.95), 'mawangdui': (113.0, 28.2), 'pequim': (116.4, 39.9)}
dados = {'china': ' '.join(caminhos), 'lugares': {k: [round(v, 0) for v in pt(*c)] for k, c in lugares.items()}}
# ---- particulas: amostra pontos da palavra 'Funciona?' em Cormorant 700
img = Image.new('L', (1920, 1080), 0); d = ImageDraw.Draw(img)
fnt = ImageFont.truetype(str(FONTES / 'cormorant_700_normal.ttf'), 300)
txt = 'Funciona?'; bb = d.textbbox((0, 0), txt, font=fnt); tw, th = bb[2] - bb[0], bb[3] - bb[1]
ox, oy = (1920 - tw) / 2 - bb[0], 420 - th / 2 - bb[1]
d.text((ox, oy), txt, font=fnt, fill=255)
q = [ox + d.textlength('Funciona', font=fnt)]  # x inicial do '?' em vermelho
px = img.load(); rnd = random.Random(7); pts = []
while len(pts) < 420:
    x, y = rnd.randrange(bb[0] + int(ox), bb[2] + int(ox)), rnd.randrange(bb[1] + int(oy), bb[3] + int(oy))
    if px[x, y] > 128: pts.append((x, y))
dados['particulas'] = ' '.join(f'{x},{y}' for x, y in pts)
dados['texto_caixa'] = [round(ox + bb[0]), round(oy + bb[1]), tw, th]; dados['interrog_x'] = round(q[0])
dados['texto_xy'] = [round(ox), round(oy + fnt.getmetrics()[0])]  # x e linha de base para o <text> do SVG
(AQUI / 'dados_cenas.json').write_text(json.dumps(dados), encoding='utf-8')
print(len(caminhos), len(dados['china']), dados['lugares'], dados['texto_caixa'], q[0])
