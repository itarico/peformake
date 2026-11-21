"""PIB 2023 dos 5.570 municípios (IBGE, SIDRA tabela 5938, variável 37) + coordenadas (kelvins/municipios-brasileiros, MIT)
-> municipios.json: [x, y, pib_mil, nome] ordenado do maior para o menor, no espaço 1000x1000 do mapa.json.
Confere a tese: quantas cidades somam 50 % e quanto pesam as 1.301 menores. Uso: python gerar_municipios.py <pasta geo>"""
import json, csv, sys, math, pathlib
G = pathlib.Path(sys.argv[1])
C = math.cos(math.radians(14)); L0, L1, A0, A1 = -74.2, -34.6, 5.4, -33.9
W = (L1 - L0) * C; H = A0 - A1; S = 1000 / max(W, H); ox = (1000 - W * S) / 2; oy = (1000 - H * S) / 2
co = {r['codigo_ibge']: (float(r['longitude']), float(r['latitude'])) for r in csv.DictReader(open(G / 'municipios.csv', encoding='utf-8'))}
pib = json.load(open(G / 'pib_mun_2023.json', encoding='utf-8'))
out = []
for r in pib:
    v = float(r['V']) if r['V'].replace('.', '').isdigit() else 0.0
    lon, lat = co[r['D1C']]
    out.append([round((lon - L0) * C * S + ox, 1), round((A0 - lat) * S + oy, 1), v, r['D1N']])
out.sort(key=lambda o: -o[2]); tot = sum(o[2] for o in out); s = 0
for i, o in enumerate(out):
    s += o[2]
    if s >= tot / 2: n50 = i + 1; break
menores = sum(o[2] for o in out[-1301:]) / tot * 100
json.dump(out, open(G / 'municipios.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('municípios', len(out), '| metade do PIB com', n50, f'| 1.301 menores = {menores:.4f} %', '| top5', [o[3] for o in out[:5]])
