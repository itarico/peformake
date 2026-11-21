"""Malha das UFs (IBGE, API de malhas v3, qualidade=minima, domínio público) -> mapa.json com path SVG por UF
num espaço de 1000 x 1000, centroide e o distrito de Panem de cada UF.
Uso: python gerar_mapa.py <br_uf.json> <ufs_nomes.json> <saida mapa.json>"""
import json, sys, math
geo = json.load(open(sys.argv[1], encoding='utf-8')); nomes = {str(e['id']): e['sigla'] for e in json.load(open(sys.argv[2], encoding='utf-8'))}
DIST = {'SP': 1, 'MG': 2, 'ES': 2, 'AM': 3, 'CE': 4, 'RN': 4, 'PB': 4, 'RJ': 5, 'MA': 6, 'PR': 7, 'SC': 8, 'MT': 9, 'RS': 9,
        'GO': 10, 'MS': 10, 'TO': 10, 'RO': 10, 'BA': 11, 'PE': 11, 'AL': 11, 'SE': 11, 'PI': 11, 'PA': 12,
        'DF': 0, 'AC': 13, 'RR': 13, 'AP': 13}
C = math.cos(math.radians(14)); L0, L1, A0, A1 = -74.2, -34.6, 5.4, -33.9
W = (L1 - L0) * C; H = A0 - A1; S = 1000 / max(W, H); ox = (1000 - W * S) / 2; oy = (1000 - H * S) / 2
def pr(lon, lat): return ((lon - L0) * C * S + ox, (A0 - lat) * S + oy)
out = {}
for f in geo['features']:
    sig = nomes[f['properties']['codarea']]; g = f['geometry']
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    d = []; ax = ay = aa = 0
    for poly in polys:
        for ring in poly[:1]:
            pts = [pr(*p) for p in ring]
            d.append('M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + 'Z')
            a = 0; cx = cy = 0
            for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
                c = x1 * y2 - x2 * y1; a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c
            if abs(a) > 1e-9: ax += cx / 3; ay += cy / 3; aa += a
    out[sig] = {'d': ' '.join(d), 'cx': round(ax / aa, 1), 'cy': round(ay / aa, 1), 'dist': DIST[sig], 'area': round(abs(aa) / 2)}
json.dump(out, open(sys.argv[3], 'w', encoding='utf-8'))
print(len(out), 'UFs', {k: (v['cx'], v['cy']) for k, v in list(out.items())[:3]})
