"""Relevo em cinza (Natural Earth GRAY_50M_SR_OB, domínio público) recortado e projetado no MESMO espaço 1000x1000
do mapa.json (equirretangular com x escalado por cos 14°). Saída: relevo.png 2000x2000 (cinza escuro, contraste alto).
Uso: python gerar_relevo.py <gray50m.tif> <saida.png>"""
import sys, math
from PIL import Image, ImageOps, ImageEnhance
Image.MAX_IMAGE_PIXELS = None
src = Image.open(sys.argv[1]).convert('L'); PPD = src.width / 360
C = math.cos(math.radians(14)); L0, L1, A0, A1 = -74.2, -34.6, 5.4, -33.9
W = (L1 - L0) * C; H = A0 - A1; S = 1000 / max(W, H); ox = (1000 - W * S) / 2; oy = (1000 - H * S) / 2
lon0, lon1 = L0 - ox / (C * S), L0 + (1000 - ox) / (C * S); lat0, lat1 = A0 + oy / S, A0 - (1000 - oy) / S
box = ((lon0 + 180) * PPD, (90 - lat0) * PPD, (lon1 + 180) * PPD, (90 - lat1) * PPD)
im = src.resize((2000, 2000), Image.LANCZOS, box=box)
im = ImageOps.autocontrast(im, 1); im = ImageEnhance.Contrast(im).enhance(1.35)
im = im.point(lambda v: int(14 + (v / 255) ** 1.6 * 120))   # escuro: 14..134
im.save(sys.argv[2]); print('ok', box)
