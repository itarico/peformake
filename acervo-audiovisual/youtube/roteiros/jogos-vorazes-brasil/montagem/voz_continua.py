"""Voz final do Panem sem cortes dentro das frases (2º retorno do Italo: o editar_voz cortava fim de frase e palavras).
O Italo já deixou só as melhores tentativas na gravação; aqui cada frase entra INTEIRA, do começo da 1ª palavra ao fim
da última, com folga (0,15 s antes, até 0,45 s depois, sem invadir a frase seguinte). Pausas longas viram 0,5 s.
Frases regravadas (outro arquivo) substituem a da gravação. Frases sem gravação ficam de fora.
Uso: python voz_continua.py <frases_v2.json> <gravacao.wav> <regravacao.json> <saida pasta>
regravacao.json: {"27": ["arquivo.wav", ini, fim], ...}  (fim já com a folga)
Saída: voz_continua.wav (48 kHz mono) e tempos.json (n, ini, fim, texto) no tempo do arquivo novo."""
import sys, json, pathlib, subprocess, numpy as np, soundfile as sf
FR, GRAV, REG, OUT = sys.argv[1:5]; OUT = pathlib.Path(OUT); OUT.mkdir(parents=True, exist_ok=True)
SR = 48000
def carrega(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32).copy()
PAL = [w for x in json.load(open(pathlib.Path(GRAV).parent / 'transcricao.json', encoding='utf-8')) for w in x['palavras']]
G = carrega(GRAV); reg = json.load(open(REG, encoding='utf-8')); cache = {}
fr = {f['n']: f for f in json.load(open(FR, encoding='utf-8'))['frases']}
# o editor rotulou "Em Panem | a arena muda..." como 121 e 122: é a frase 123 inteira (121 e 122 não foram gravadas)
if 121 in fr and 122 in fr and 123 not in fr:
    fr[123] = dict(fr[122]); fr[123]['n'] = 123; fr[123]['src_ini'] = fr[121]['src_ini']; fr[123]['texto'] = fr[122]['texto']
    del fr[121], fr[122]
ordem = sorted(fr)
ini_src = {n: fr[n]['src_ini'] for n in ordem}
partes, tempos, t = [], [], 0.0
fade = int(0.012 * SR)
for i, n in enumerate(ordem):
    if str(n) in reg:
        arq, a, b = reg[str(n)]
        if arq not in cache: cache[arq] = carrega(pathlib.Path(REG).parent / arq)
        src, pre = cache[arq], 0.0
        fala_ini, fala_fim = a + 0.15, b - 0.35
    else:
        s, e = fr[n]['src_ini'], fr[n]['src_fim']
        prox = ini_src[ordem[i + 1]] if i + 1 < len(ordem) else e + 1.0
        a, b = max(0, s - 0.15), min(e + 0.45, prox - 0.15)
        src, fala_ini, fala_fim = G, s, e
    if str(n) in reg: e = b - 0.35
    if src is G and len(fr[n].get('spans', [])) > 1:
        # cortes internos do editar_voz: mantém o corte só se o trecho tirado não tem fala (pausa); se tem palavra, volta
        sp = [list(x) for x in fr[n]['spans']]; sp[0][0] = a; sp[-1][1] = b; juntos = [sp[0]]
        for c, d in sp[1:]:
            tem_fala = any(w['ini'] >= juntos[-1][1] - 0.05 and w['fim'] <= c + 0.05 for w in PAL)
            if tem_fala or c - juntos[-1][1] < 0.3: juntos[-1][1] = d
            else: juntos[-1][1] += 0.15; juntos.append([c - 0.15, d])
        pedacos = []
        for c, d in juntos:
            x = src[int(c * SR):int(d * SR)].copy(); x[:fade] *= np.linspace(0, 1, fade); x[-fade:] *= np.linspace(1, 0, fade); pedacos.append(x)
        seg = np.concatenate(pedacos); fala_fim = fala_ini + len(seg) / SR - (fala_ini - a) - (b - e)
    else:
        seg = src[int(a * SR):int(b * SR)].copy()
        seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
    pausa = 0.6 if '[pausa]' in fr.get(n, {}).get('texto', '') else 0.0
    tempos.append({'n': n, 'ini': round(t + (fala_ini - a), 3), 'fim': round(t + (fala_fim - a), 3), 'texto': fr[n]['texto'] if n in fr else ''})
    partes.append(seg); t += len(seg) / SR
    gap = 0.12 + pausa                                   # respiro entre frases (a folga de cada lado já soma ~0,5 s)
    partes.append(np.zeros(int(gap * SR), np.float32)); t += gap
voz = np.concatenate(partes)
sf.write(OUT / 'voz_continua.wav', voz, SR, subtype='PCM_24')
json.dump(tempos, open(OUT / 'tempos.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(tempos), 'frases', round(len(voz) / SR / 60, 2), 'min')
