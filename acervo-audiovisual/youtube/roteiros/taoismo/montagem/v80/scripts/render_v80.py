# Taoismo v80: monta a linha do tempo (planos_v80 + frases_v2 + palavras_v2) e renderiza no motor_v80.html.
# Uso:
#   python render_v80.py linha                 -> so grava v80/linha_v80.json e mostra o resumo
#   python render_v80.py v1 [t0 t1]            -> faixa V1 (imagens e camera) em JPG -> v80/saida/v1.mp4 e um clipe por plano
#   python render_v80.py v2 [t0 t1]            -> faixa V2 (textos e legenda, fundo transparente) -> v80/saida/v2.mov (alfa)
#   python render_v80.py tudo t0 t1            -> previa do quadro final de um trecho -> v80/saida/previa_t0_t1.mp4
import asyncio, csv, json, math, pathlib, re, shutil, subprocess, sys, unicodedata
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from planos_v80 import P, BLOCOS, EPOCA, CAPITULOS
Image.MAX_IMAGE_PIXELS = None
V80 = pathlib.Path(__file__).resolve().parent.parent; MONT = V80.parent
TRAB = pathlib.Path('G:/lucas/taoismo_v80')  # quadros e saidas no G: (o C: tem pouco espaco)
SAI = TRAB / 'saida'; SAI.mkdir(parents=True, exist_ok=True)
FPS, WORKERS = 24, 6

def nz(s):
    s = unicodedata.normalize('NFD', s.lower()); return re.sub(r'[^a-z0-9]', '', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))

def linha():
    fr = json.loads((MONT / 'frases_v2.json').read_text(encoding='utf-8')); DUR = fr['duracao']; fr = fr['frases']
    pal = {x['n']: x['palavras'] for x in json.loads((V80 / 'palavras_v2.json').read_text(encoding='utf-8'))}
    cred = {}
    for nome in ('creditos-imagens.csv', 'creditos-imagens-pexels.csv'):
        if (V80 / nome).exists():
            for l in csv.DictReader(open(V80 / nome, encoding='utf-8')):
                lic = l['licenca']; cid = pathlib.Path(l['arquivo']).stem
                if l['fonte'] == 'imprensa': cred[cid] = l['autor']
                elif 'BY' in lic: cred[cid] = f"{l['autor'][:60]} · {lic}"
    S = {f['n']: (0.0 if f['n'] == 1 else round(f['ini'] - .12, 3)) for f in fr}
    ns = [f['n'] for f in fr]; F = {f['n']: f for f in fr}
    planos, faltam = [], set()
    for idx, n in enumerate(ns):
        a = S[n]; b = S[ns[idx + 1]] if idx + 1 < len(ns) else DUR
        specs = P[n][0].split()
        alvo_k = max(len(specs), math.ceil((b - a) / 3.6))  # ritmo de 2 a 4 s: plano longo vira dois com outra camera
        TROCA = {'in': 'r', 'out': 'l', 'l': 'in', 'r': 'out', 'up': 'in', 'dn': 'out', 'px': 'in', 'escuro': 'escuro'}
        base_specs = list(specs)
        while len(specs) < alvo_k:
            sp = base_specs[len(specs) % len(base_specs)]
            if sp == 'escuro' or '/' not in sp: specs.append(sp); continue
            im, cm, *fx = sp.split('/'); c0 = cm.split('+')[-1]
            specs.append(f"{im}/{TROCA.get(c0, 'in')}")
        if len(specs) > len(base_specs):  # intercala: A, A', B, B' ...
            specs = [x for par in zip(base_specs, specs[len(base_specs):] + [None] * len(base_specs)) for x in par if x][:alvo_k]
        k = len(specs)
        inicios = [w['ini'] for w in pal.get(n, [])]
        cortes = [a]
        for j in range(1, k):
            alvo = a + (b - a) * j / k
            perto = min(inicios, key=lambda x: abs(x - alvo)) if inicios else alvo
            cortes.append(round(perto - .04 if abs(perto - alvo) < .7 else alvo, 3))
        cortes.append(b)
        # textos: hora da palavra-gatilho (ou posicao proporcional no texto da frase)
        textos = []
        for item in [x for x in P[n][1].split('|') if x]:
            est, resto = item.split(':', 1); txt, gat = resto.rsplit('@', 1); red = txt.startswith('!'); txt = txt.lstrip('!')
            g = nz(gat); t = None
            for w in pal.get(n, []):
                if nz(w['p']).startswith(g) or (g.isdigit() and g in nz(w['p'])): t = w['ini']; break
            if t is None:
                pos = nz(F[n]['texto']).find(g); fr_ = pos / max(1, len(nz(F[n]['texto']))) if pos >= 0 else .3
                t = F[n]['ini'] + (F[n]['fim'] - F[n]['ini']) * fr_; faltam.add((n, gat))
            textos.append({'e': est, 'txt': txt, 'red': red, 't': round(max(a + .05, t), 3)})
        for j, sp in enumerate(specs):
            ps_ = sp.split('/'); img, cam, fx = (ps_[0], ps_[1] if len(ps_) > 1 else 'in', ps_[2] if len(ps_) > 2 else '') if sp != 'escuro' else ('', 'escuro', '')
            pl = {'n': n, 't0': cortes[j], 't1': cortes[j + 1], 'cam': cam, 'fx': fx, 'textos': [], 'epoca': EPOCA.get(n)}
            if img.startswith('v:'):
                clip = img[2:]; nq = len(list((MONT / 'frames' / clip).glob('*.jpg')))
                pl['video'] = {'dir': f'../frames/{clip}', 'n': nq, 'ini': int((n * 37) % max(1, nq // 2))}
                pl['base'] = f'../frames/{clip}/00001.jpg'; pl['dimkey'] = 'video'
            elif img:
                base = V80 / 'camadas' / f'{img}_base.jpg'
                if not base.exists(): faltam.add((n, img)); base = V80 / 'camadas' / 'X_manuscrito_base.jpg'; img = 'X_manuscrito'
                pl['base'] = f'camadas/{img}_base.jpg'; pl['dimkey'] = img
                if ('px' in cam or fx == 't3') and (V80 / 'camadas' / f'{img}_figura.png').exists():
                    pl['figura'] = f'camadas/{img}_figura.png'; pl['fundo'] = f'camadas/{img}_fundo.jpg'
                if img in cred: pl['cred'] = cred[img]
            planos.append(pl)
        for x in textos:  # cada texto vai para o plano em que a palavra e dita
            alvo = next((p for p in planos if p['n'] == n and p['t0'] <= x['t'] < p['t1']), [p for p in planos if p['n'] == n][-1])
            alvo['textos'].append(x)
    dims = {'video': [1920, 1080]}
    for f in (V80 / 'camadas').glob('*_base.jpg'):
        with Image.open(f) as im: dims[f.name[:-9]] = list(im.size)
    blocos = [S[n] for n in BLOCOS]
    flash = []  # rajada da troca de bloco: 3 imagens (nao video) do bloco que comeca
    for k, n in enumerate(BLOCOS):
        fim = BLOCOS[k + 1] if k + 1 < len(BLOCOS) else 999
        imgs = [p['base'] for p in planos if n <= p['n'] < fim and 'video' not in p and 'base' in p]
        flash.append(list(dict.fromkeys(imgs))[1:4] or imgs[:3])
    L = {'capitulos': CAPITULOS, 'shanshui': 'camadas/04_fan_kuan_montanhas_base.jpg', 'flash': flash, 'planos': planos, 'frases': [{'texto': f['texto'], 'ini': f['ini'], 'fim': f['fim']} for f in fr], 'blocos': blocos, 'dims': dims, 'duracao': DUR}
    (V80 / 'linha_v80.json').write_text(json.dumps(L, ensure_ascii=False, indent=0), encoding='utf-8')
    d = [p['t1'] - p['t0'] for p in planos]
    print(f'planos {len(planos)} · duração média {sum(d) / len(d):.2f} s · maior {max(d):.1f} s · menores que 1 s: {sum(x < 1 for x in d)}')
    if faltam: print('sem gatilho ou sem imagem (usei posição aproximada ou imagem reserva):', sorted(faltam, key=str)[:60])
    return L

async def renderiza(L, modo, t0, t1):
    from playwright.async_api import async_playwright
    QD = TRAB / f'quadros_{modo}'
    if QD.exists(): shutil.rmtree(QD)
    QD.mkdir()
    idx = list(range(int(round(t0 * FPS)), int(round(t1 * FPS))))
    ext = 'png' if modo == 'v2' else 'jpg'
    async def w(p, k):
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
        await pg.goto((V80 / 'motor_v80.html').as_uri() + f'?modo={modo}', wait_until='networkidle')
        await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(800)
        await pg.evaluate('d => window.carregar(d)', L)
        meus = idx[k::WORKERS]
        for j, i in enumerate(meus):
            await pg.evaluate(f'window.render({(i + .001) / FPS})')
            alvo = str(QD / f'{i - idx[0]:06d}.{ext}')
            if ext == 'png': await pg.screenshot(path=alvo, type='png', omit_background=True)
            else: await pg.screenshot(path=alvo, type='jpeg', quality=92)
            if k == 0 and j % 240 == 0: print(f'{modo} {j * WORKERS}/{len(idx)}', flush=True)
        await b.close()
    async with async_playwright() as p:
        await asyncio.gather(*[w(p, k) for k in range(WORKERS)])
    return QD, idx

def main():
    L = linha()
    if len(sys.argv) < 2 or sys.argv[1] == 'linha': return
    modo = sys.argv[1]; t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0; t1 = float(sys.argv[3]) if len(sys.argv) > 3 else L['duracao']
    QD, idx = asyncio.run(renderiza(L, modo, t0, t1))
    if modo == 'v2':
        saida = SAI / ('v2.mov' if len(sys.argv) <= 2 else f'v2_{int(t0)}_{int(t1)}.mov')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', str(QD / '%06d.png'), '-c:v', 'prores_ks', '-profile:v', '4444',
                        '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0', str(saida)], check=True)
    else:
        nome = {'v1': 'v1', 'tudo': 'previa'}[modo]
        saida = SAI / (f'{nome}.mp4' if len(sys.argv) <= 2 else f'{nome}_{int(t0)}_{int(t1)}.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', str(QD / '%06d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                        '-crf', '17', '-preset', 'medium', str(saida)], check=True)
        if modo == 'v1' and len(sys.argv) <= 2:  # um clipe por plano para a faixa V1 do Premiere
            CL = SAI / 'v1_planos'; shutil.rmtree(CL, ignore_errors=True); CL.mkdir()
            for k, p in enumerate(L['planos']):
                a, b = int(round(p['t0'] * FPS)), int(round(p['t1'] * FPS))
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-start_number', str(a), '-i', str(QD / '%06d.jpg'), '-frames:v', str(b - a),
                                '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', str(CL / f'{k + 1:03d}_f{p["n"]:03d}.mp4')], check=True)
    shutil.rmtree(QD)
    print('ok', saida)

if __name__ == '__main__':
    main()
