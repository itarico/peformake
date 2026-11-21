# Gera audio/v70_creditos-audio.csv: copia do creditos-audio.csv do v60 (intocado) + uma linha por uso de efeito
# nas 5 cenas novas do v70, com o tempo exato no filme. Todos os efeitos ja estavam baixados e licenciados no v60.
import csv, json, pathlib, re
AQUI = pathlib.Path(__file__).resolve().parent
AUD = AQUI.parent.parent / 'audio'
linhas = list(csv.reader(open(AUD / 'creditos-audio.csv', encoding='utf-8', newline='')))
cab, dados = linhas[0], linhas[1:]
por_arquivo = {l[0]: l for l in dados}
proj = json.loads((AQUI / 'proj_v70.json').read_text(encoding='utf-8'))
ini = {c['om']: c['ini'] for c in proj['cenas'] if c['tipo'] == 'om'}
src = (AQUI / 'sonorizar_v70.py').read_text(encoding='utf-8')
novas = []
for bloco in re.split(r"(?:if|elif) c\['om'\] == ", src)[1:]:
    cena = re.match(r"'(\w+)'", bloco).group(1)
    usos = re.findall(r"\('(\w+)', [\d.]+, [\w.]+, ([\d.]+), -?\d+\)", bloco)
    usos += [(n, dt) for n, dt in re.findall(r"som\('(\w+)', 0, 7\); colocar\(sfx, x, t \+ ([\d.]+)", bloco)]
    for nome, dt in usos:
        t = ini[cena] + float(dt); arq = f'sfx/{nome}.mp3'; base = por_arquivo[arq]
        novas.append(base + [f'v70 · cena {cena} · {int(t // 60)}:{t % 60:05.2f}'])
novas.sort(key=lambda l: l[-1].split('· ')[-1])
with open(AUD / 'v70_creditos-audio.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f); w.writerow(cab + ['uso no v70'])
    for l in dados: w.writerow(l + [''])
    for l in novas: w.writerow(l)
print('ok', len(novas), 'usos novos ->', AUD / 'v70_creditos-audio.csv')
