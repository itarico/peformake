"""Refaz a voz do Panem com os MESMOS tempos da voz_continua, mas com cada corte no ponto de silêncio mais próximo.
Motivo (3º retorno do Italo, 23/11/2026): a voz_continua cortava no tempo do Whisper (que erra o começo e o fim das
palavras em até ~0,3 s), punha 0,12 s de silêncio ali e fazia fade: palavra picada. Aqui o corte anda até 0,35 s para
cair no vale de energia do áudio; a duração total e a posição de cada frase não mudam (o vídeo continua valendo).
Uso: python voz_silencio.py <frases_v2.json> <gravacao.wav> <regravacao.json> <voz_continua.wav atual> <saida.wav>"""
import sys, json, pathlib, subprocess, numpy as np, soundfile as sf
FR, GRAV, REG, ATUAL, SAIDA = sys.argv[1:6]
SR = 48000
def carrega(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32).copy()
PAL = [w for x in json.load(open(pathlib.Path(GRAV).parent / 'transcricao.json', encoding='utf-8')) for w in x['palavras']]
SRC = {'G': carrega(GRAV)}; reg = json.load(open(REG, encoding='utf-8'))
fr = {f['n']: f for f in json.load(open(FR, encoding='utf-8'))['frases']}
if 121 in fr and 122 in fr and 123 not in fr:
    fr[123] = dict(fr[122]); fr[123]['n'] = 123; fr[123]['src_ini'] = fr[121]['src_ini']; del fr[121], fr[122]
ordem = sorted(fr); ini_src = {n: fr[n]['src_ini'] for n in ordem}

# ---------- 1. mesma lista de pedaços da voz_continua: ('s', fonte, c, d) ou ('z', duração)
P = []
for i, n in enumerate(ordem):
    if str(n) in reg:
        arq, a, b = reg[str(n)]
        if arq not in SRC: SRC[arq] = carrega(pathlib.Path(REG).parent / arq)
        P.append(['s', arq, a, b])
    else:
        s, e = fr[n]['src_ini'], fr[n]['src_fim']
        prox = ini_src[ordem[i + 1]] if i + 1 < len(ordem) else e + 1.0
        a, b = max(0, s - 0.15), min(e + 0.45, prox - 0.15)
        if len(fr[n].get('spans', [])) > 1:
            sp = [list(x) for x in fr[n]['spans']]; sp[0][0] = a; sp[-1][1] = b; juntos = [sp[0]]
            for c, d in sp[1:]:
                tem_fala = any(w['ini'] >= juntos[-1][1] - 0.05 and w['fim'] <= c + 0.05 for w in PAL)
                if tem_fala or c - juntos[-1][1] < 0.3: juntos[-1][1] = d
                else: juntos[-1][1] += 0.15; juntos.append([c - 0.15, d])
            for c, d in juntos: P.append(['s', 'G', c, d])
        else: P.append(['s', 'G', a, b])
    P.append(['z', 0.12 + (0.6 if '[pausa]' in fr[n].get('texto', '') else 0.0)])
def dur(p): return int(p[3] * SR) - int(p[2] * SR) if p[0] == 's' else int(p[1] * SR)

# ---------- 2. os mesmos cortes de repetição já feitos (tempo da saída, em 3 rodadas)
def corta(P, c0, c1):
    out, t = [], 0
    i0, i1 = int(c0 * SR), int(c1 * SR)
    for p in P:
        n = dur(p); a, b = t, t + n; t = b
        if b <= i0 or a >= i1: out.append(p); continue
        if a < i0:
            out.append(['s', p[1], p[2], p[2] + (i0 - a) / SR] if p[0] == 's' else ['z', (i0 - a) / SR])
        if b > i1:
            out.append(['s', p[1], p[2] + (i1 - a) / SR, p[3]] if p[0] == 's' else ['z', (b - i1) / SR])
    return out
for rodada in ([(201.70, 203.30), (361.40, 362.85)], [(544.52, 546.67)], [(602.67, 605.37), (736.37, 739.10)]):
    for c0, c1 in sorted(rodada, reverse=True): P = corta(P, c0, c1)
tot = sum(dur(p) for p in P) / SR
at, _ = sf.read(ATUAL, dtype='float32')
print(f'reconstrução {tot:.2f} s · voz atual {len(at) / SR:.2f} s')

# ---------- 3. cada junção anda até o silêncio (a duração total não muda)
JAN = int(0.03 * SR)
def energia(x):
    e = np.sqrt(np.convolve(x.astype(np.float64) ** 2, np.ones(JAN) / JAN, 'same')); return e
EN = {k: energia(v) for k, v in SRC.items()}
piso = float(np.percentile(EN['G'], 20)); fala = float(np.percentile(EN['G'], 80))
lim = max(piso * 2.5, fala * 0.04)            # a gravação do Italo tem silêncio digital entre as falas (piso 0)
S = [i for i, p in enumerate(P) if p[0] == 's']
antes = depois = movidas = 0; ruins = []
for ia, ib in zip(S, S[1:]):
    A, B = P[ia], P[ib]
    if A[1] != B[1]:                                   # regravação: cada lado é ajustado sozinho, dentro da própria margem
        continue
    e = EN[A[1]]; L, R = A[3], B[2]
    def custo(x):
        iL, iR = int((L + x) * SR), int((R + x) * SR)
        if iL < 0 or iR >= len(e): return 1e9
        return max(e[iL], e[iR])
    c0 = custo(0.0)
    if c0 > lim: antes += 1
    for alc in (0.35, 0.8):                             # se não há silêncio a 0,35 s, procura até 0,8 s
        xs = [x for x in np.arange(-alc, alc + 0.001, 0.005) if (L + x) > A[2] + 0.05 and (R + x) < B[3] - 0.05] or [0.0]
        x = min(xs, key=lambda x: (custo(x) > lim, round(custo(x) / lim / 0.25), abs(x)))
        if custo(x) <= lim: break
    if custo(x) < c0 * 0.8 or c0 > lim:
        A[3] = L + x; B[2] = R + x; movidas += 1
    cf = custo(x) if (A[3] != L) else c0
    if cf > lim: depois += 1; ruins.append((round(sum(dur(p) for p in P[:ib]) / SR, 1), round(cf / lim, 1)))
print(f'junções {len(S) - 1} · em cima de fala antes {antes} · depois {depois} · movidas {movidas}')
print('ainda em fala (tempo na voz, energia/limite):', ruins)

# ---------- 3b. remendo da frase 137: "Mas Brasília, sozinha, | tem só três por cento" (1ª tentativa + fim da 2ª).
# O corte de repetição antigo deixava "Mas Brasília sozinha 3%" (sem "tem só"). A duração do trecho não muda.
k = next((i for i, p in enumerate(P) if p[0] == 's' and p[1] == 'G' and 711.0 < p[2] < 712.3), None)
if k is not None and P[k - 1][0] == 's' and P[k + 1][0] == 's' and P[k + 2][0] == 'z':
    T137 = sum(dur(p) for p in P[k - 1:k + 3]) / SR
    e = EN['G']
    def vale(t0, t1):
        a, b = int(t0 * SR), int(t1 * SR); return (a + int(np.argmin(e[a:b]))) / SR
    fimA = vale(703.15, 703.6); iniC = vale(712.55, 713.32); a0 = P[k - 1][2]
    fimC = iniC + (T137 - (fimA - a0) - 0.05)
    print(f'remendo 137: [{a0:.2f}-{fimA:.2f}] + [{iniC:.2f}-{fimC:.2f}] · energia nas pontas /limite',
          [round(float(e[int(x * SR)] / lim), 2) for x in (fimA, iniC, fimC)])
    P[k - 1:k + 3] = [['s', 'G', a0, fimA], ['s', 'G', iniC, fimC], ['z', 0.05]]
import os
if os.environ.get('DEBUG'):
    t0, t1 = map(float, os.environ['DEBUG'].split(',')); t = 0
    for p in P:
        n = dur(p) / SR
        if t + n >= t0 and t <= t1:
            ws = ' '.join(w['p'] for w in PAL if p[0] == 's' and p[1] == 'G' and w['ini'] >= p[2] - 0.05 and w['fim'] <= p[3] + 0.05)
            print(round(t, 2), p[0], [round(x, 2) if isinstance(x, float) else x for x in p[1:]], ws[:90])
        t += n
# ---------- 4. gravar
F = int(0.008 * SR); partes = []
for p in P:
    if p[0] == 'z': partes.append(np.zeros(dur(p), np.float32)); continue
    x = SRC[p[1]][int(p[2] * SR):int(p[3] * SR)].copy()
    if len(x) > 2 * F: x[:F] *= np.linspace(0, 1, F); x[-F:] *= np.linspace(1, 0, F)
    partes.append(x)
voz = np.concatenate(partes)
if len(voz) < len(at): voz = np.concatenate([voz, np.zeros(len(at) - len(voz), np.float32)])
sf.write(SAIDA, voz[:len(at)], SR, subtype='PCM_24')
for tt in (100, 300, 500, 700):
    i = int(tt * SR); print('confere', tt, round(float(np.abs(voz[i:i + SR] - at[i:i + SR]).max()), 4))
print('gravado', SAIDA, round(len(at) / SR, 2), 's')
