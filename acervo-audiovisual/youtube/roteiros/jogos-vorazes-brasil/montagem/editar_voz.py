# Panem: cópia adaptada do editar_voz_v2.py do Taoísmo. Uso: SRC=<gravação.wav> TR=<transcricao.json> OUT=<pasta> python editar_voz.py
# Edição da voz, v2. Substitui o editar_voz.py, que tinha cortes fora de hora, repetição e palavra cortada.
# Ideia:
# 1. Candidatos: para cada frase do roteiro, acha todas as tentativas na transcrição (large-v3-turbo, tempo por palavra).
#    Cada uma é medida pela COBERTURA, a fração das palavras do roteiro que aparece na ordem.
# 2. Escolha global (programação dinâmica, em ordem no tempo): vence a tentativa mais completa; entre as completas,
#    vence a última (o retake). Uma tentativa interrompida nunca vence uma completa.
# 3. Dentro da tentativa, só fica o que bate com o roteiro. Palavra a mais (repetição, "ele foi, ele foi") vira corte.
#    Palavra que o Whisper escreveu diferente (número, nome chinês) fica, se ocupar o lugar de uma palavra do roteiro.
# 4. O corte cai no ponto de menor energia do áudio entre duas palavras, nunca no meio de uma, com fade de 10 ms.
# Saída: voz_editada_v2.wav, frases_v2.json e relatorio_voz_v2.md. Os arquivos antigos não são tocados.
import json, re, subprocess, unicodedata, wave, pathlib, os
from difflib import SequenceMatcher
import numpy as np

OUT = pathlib.Path(os.environ['OUT']); OUT.mkdir(parents=True, exist_ok=True)
BASE = OUT
ROT = pathlib.Path(__file__).resolve().parent.parent / 'NARRACAO-PARA-GRAVAR.md'
SRC = pathlib.Path(os.environ['SRC'])
TR = pathlib.Path(os.environ['TR'])
SR = 48000

U = 'zero um dois tres quatro cinco seis sete oito nove dez onze doze treze quatorze quinze dezesseis dezessete dezoito dezenove'.split()
D = 'x x vinte trinta quarenta cinquenta sessenta setenta oitenta noventa'.split()
C = 'x cento duzentos trezentos quatrocentos quinhentos seiscentos setecentos oitocentos novecentos'.split()
def extenso(n):
    if n < 20: return U[n]
    if n < 100: return D[n // 10] + ('' if n % 10 == 0 else ' e ' + U[n % 10])
    if n == 100: return 'cem'
    if n < 1000: return C[n // 100] + ('' if n % 100 == 0 else ' e ' + extenso(n % 100))
    m = 'mil' if n // 1000 == 1 else extenso(n // 1000) + ' mil'
    return m + ('' if n % 1000 == 0 else ' e ' + extenso(n % 1000))

def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    s = re.sub(r'(\d)\.(\d{3})', r'\1\2', s)
    s = re.sub(r'\d+', lambda m: ' ' + extenso(int(m.group())) + ' ' if int(m.group()) < 10000 else m.group(), s)
    return re.findall(r'[a-z0-9]+', s)

# ---------- roteiro ----------
frases = []
for l in ROT.read_text(encoding='utf-8').splitlines():
    m = re.match(r'^(\d+)\. (.*)', l)
    if not m or int(m.group(1)) > 166 or 'Frases ' in m.group(2): continue
    txt = m.group(2)
    limpo = re.sub(r'\[pausa\]|\(baixo\)|\*\*', '', txt).strip()
    frases.append({'n': int(m.group(1)), 'texto': limpo, 'pausa': '[pausa]' in txt, 'tok': norm(limpo)})
frases = frases[:166]

# ---------- transcrição: lista de palavras (uma palavra falada pode virar vários tokens, ex. números) ----------
W = []
if TR.exists(): _segs = json.loads(TR.read_text(encoding='utf-8'))
else:  # reserva: transcrição antiga em 3 trechos (mesma gravação, mesmos tempos)
    _a = BASE / 'audio'; _segs = json.loads((_a / 'transcricao_a.json').read_text(encoding='utf-8')) + json.loads((_a / 'transcricao_b.json').read_text(encoding='utf-8'))
    _c = json.loads((_a / 'transcricao_c.json').read_text(encoding='utf-8')); _c0, _c1 = _c[0]['ini'], _c[-1]['fim']
    _antes = [s for s in _segs if s['ini'] < _c0]; _corte = max([s['fim'] for s in _antes] + [0])
    _segs = _antes + [s for s in _c if s['ini'] >= _corte - .2] + [s for s in _segs if s['ini'] >= _c1]
for s in _segs:
    for w in s['palavras']:
        for t in norm(w['p']):
            W.append({'t': t, 'ini': w['ini'], 'fim': min(w['fim'], w['ini'] + 1.2)})
toks = [w['t'] for w in W]
NW = len(W)

# ---------- 1. candidatos por frase ----------
def alinhar(ftok, i0, i1):
    """Alinha a frase com W[i0:i1]. Devolve (cobertura, índices de W que batem, pares (ia, iw))."""
    # alinha de trás para frente: em empate, o casamento cai na versão mais tardia (o retake),
    # e o começo abandonado ("se um homem só | se um homem só escreveu") fica de fora
    fa, fw = ftok[::-1], toks[i0:i1][::-1]; nA, nW = len(fa), len(fw)
    sm = SequenceMatcher(None, fa, fw, autojunk=False)
    pares = sorted((nA - 1 - (b.a + k), i0 + nW - 1 - (b.b + k)) for b in sm.get_matching_blocks() for k in range(b.size))
    return len(pares) / max(1, len(ftok)), pares

def candidatos(f):
    L = len(f['tok']); vistos = set(); out = []
    fortes = [t for t in f['tok'] if len(t) >= 4] or f['tok']
    ancora = set(fortes[:2]) | set(f['tok'][:1])  # começo da frase (palavras longas = menos falso positivo)
    for i in range(NW):
        if toks[i] not in ancora: continue
        for i0 in (max(0, i - 3), i):
            i1 = min(NW, i0 + int(L * 1.6) + 4)
            cob, pares = alinhar(f['tok'], i0, i1)
            if cob < .5 or len(pares) < 1: continue
            a = pares[0][1]; b = pares[-1][1]
            if (a, b) in vistos: continue
            vistos.add((a, b)); out.append({'cob': cob, 'a': a, 'b': b, 'pares': pares})
    if not out: return out
    top = max(c['cob'] for c in out); out = [c for c in out if c['cob'] >= top - .35]
    # tentativas: candidatos que começam perto uns dos outros são a mesma versão; fica o de maior cobertura
    out.sort(key=lambda c: c['a']); tent = []
    for c in out:
        if tent and c['a'] - tent[-1]['a'] < max(3, L // 2):
            if c['cob'] > tent[-1]['cob']: tent[-1] = c
        else: tent.append(c)
    for i, c in enumerate(tent):
        c['ordem'] = i; c['n_versoes'] = len(tent)
        usados = {iw for _, iw in c['pares']}
        c['extra'] = sum(1 for x in range(c['a'], c['b'] + 1) if x not in usados)  # palavras a mais: gaguejo, tropeço
        c['t'] = W[c['a']]['ini']
    return tent

cands = []
for f in frases:
    cs = candidatos(f)
    cands.append(cs)

# ---------- 2. escolha global por programação dinâmica ----------
# estado: (frase k, candidato j). Pontos: cobertura^3 * 100 (completo vale muito mais) + 0,001 * posição (desempate: o mais tardio)
# Frase sem candidato vira "buraco" (pega o áudio entre as vizinhas).
INF = -1e18
melhor = [dict() for _ in frases]  # j -> (pontos, j_anterior)
# qualidade: cobertura do roteiro (pesa muito) menos tropeços; a versão mais tardia ganha um bônus que só decide entre
# versões de qualidade parecida. Assim fica a última, a não ser que ela tenha um erro que uma anterior não tem.
def pontos(c): return (c['cob'] ** 3) * 100 - 4 * min(c['extra'], 6) + .001 * c['a']
for k, cs in enumerate(cands):
    for j, c in enumerate(cs):
        if k == 0:
            melhor[k][j] = (pontos(c), None); continue
        # anterior: qualquer candidato da frase k-1 que termina antes do início deste (ou a frase k-1 pulada)
        best = (INF, None)
        kk = k - 1; penal = 0
        while kk >= 0 and best[0] == INF:
            for jj, (pt, _) in melhor[kk].items():
                if cands[kk][jj]['b'] < c['a'] and pt > best[0]: best = (pt, (kk, jj))
            if best[0] == INF: penal += 60; kk -= 1
        if best[0] == INF and kk < 0: best = (0, None)
        melhor[k][j] = (best[0] + pontos(c) - penal, best[1])
# reconstrução: melhor final
fim_k = max(range(len(frases)), key=lambda k: max([p for p, _ in melhor[k].values()] or [INF]) + k * 1000 * (1 if melhor[k] else 0))
k = len(frases) - 1
while k >= 0 and not melhor[k]: k -= 1
j = max(melhor[k], key=lambda j: melhor[k][j][0])
escolha = {}
estado = (k, j)
while estado:
    kk, jj = estado; escolha[kk] = cands[kk][jj]; estado = melhor[kk][jj][1]

# ---------- 2b. versões de cada frase: só as que estão entre a frase anterior e a seguinte (repetições de verdade) ----------
def qual(c): return c['cob'] - .015 * min(c['extra'], 8)  # repetição interna sai na limpeza; pesa pouco
versoes = {}
for k in range(len(frases)):
    if k not in escolha: continue
    lo = escolha[k - 1]['b'] if k - 1 in escolha else -1
    hi = escolha[k + 1]['a'] if k + 1 in escolha else NW
    loc = [c for c in cands[k] if c['a'] > lo and c['b'] < hi] or [escolha[k]]
    if escolha[k] not in loc: loc.append(escolha[k]); loc.sort(key=lambda c: c['a'])
    melhor_q = max(qual(c) for c in loc)
    escolha[k] = [c for c in loc if qual(c) >= melhor_q - .04][-1]  # a última entre as boas
    versoes[k] = loc

# ---------- 3. dentro da tentativa: só o que bate, com repetições fora ----------
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(SRC), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
A = np.frombuffer(pcm, np.int16).astype(np.float32)
FR = int(.005 * SR)  # energia em janelas de 5 ms
E = np.sqrt(np.convolve(A ** 2, np.ones(FR) / FR, 'same'))

def vale(t0, t1):
    """Instante de menor energia entre t0 e t1 (s)."""
    a, b = int(max(0, t0) * SR), int(min(len(A) / SR, max(t1, t0 + .01)) * SR)
    if b <= a: return t0
    return (a + int(np.argmin(E[a:b:48]) * 48)) / SR

def trechos(f, c):
    """Lista de (i_ini, i_fim) em W a manter. Entre duas palavras que batem com o roteiro, a lacuna da transcrição
    tem gap_w palavras e a do roteiro tem gap_a. Ficam as ÚLTIMAS gap_a palavras da lacuna (são as que ocupam o lugar
    das palavras do roteiro, ex. "Guodian" escrito "gaudian"); as gap_w - gap_a primeiras são repetição e saem."""
    pares = c['pares']; keep = [pares[0][1]]
    for (pa, pw), (ia, iw) in zip(pares, pares[1:]):
        gap_a = ia - pa - 1; lac = list(range(pw + 1, iw))
        # retake dentro da lacuna: o fim dela repete o que vem logo depois ("tiras de | apareceram feixes de tiras de bambu")
        while True:
            k = next((k for k in range(min(len(lac), 12), 1, -1) if [toks[x] for x in lac[-k:]] == toks[iw:iw + k]), 0)
            if not k: break
            lac = lac[:-k]
        # restos de tentativas abandonadas: começo da lacuna que repete o que veio antes ("em | em gaudian")
        while lac and toks[lac[0]] == toks[pw] and len(toks[pw]) > 1: lac = lac[1:]
        # tentativa abandonada no meio da lacuna: "fechada em mil | fechada em cento": corta do recomeço em diante
        for j in range(len(lac) - 1):
            if toks[lac[j]] == toks[iw] and toks[lac[j + 1]] == toks[iw + 1 if iw + 1 < NW else iw]: lac = lac[:j]; break
        # o Whisper às vezes parte um nome em dois ("malango doi" = Mawangdui): tolera 1 palavra a mais
        manter = min(len(lac), gap_a + 1) if gap_a else 0
        kept = lac[len(lac) - manter:] if manter else []
        while kept and toks[kept[0]] == toks[pw]: kept = kept[1:]    # "chamado | chamado zang"
        while kept and toks[kept[-1]] == toks[iw]: kept = kept[:-1]  # "de que | e que"
        if len(kept) > gap_a and kept and toks[kept[0]] in ('e', 'a', 'o', 'de', 'que'): kept = kept[1:]
        keep += kept + [iw]
    # pontas: palavras do roteiro que o Whisper escreveu diferente (até 3), se a fala estiver colada
    falta_ini, falta_fim = pares[0][0], len(f['tok']) - 1 - pares[-1][0]
    for _ in range(min(3, falta_ini)):
        i = keep[0]
        if i > 0 and W[i]['ini'] - W[i - 1]['fim'] < .35: keep.insert(0, i - 1)
    for _ in range(min(3, falta_fim)):
        i = keep[-1]
        if i + 1 < NW and W[i + 1]['ini'] - W[i]['fim'] < 4.5: keep.append(i + 1)  # ex.: "168 ... a.C." dito depois de uma pausa
    # trechos: índices seguidos e sem pausa longa (pausa de gravação vira respiro curto)
    rs = [[keep[0], keep[0]]]
    for i in keep[1:]:
        if i == rs[-1][1] + 1 and W[i]['ini'] - W[i - 1]['fim'] < .9: rs[-1][1] = i
        else: rs.append([i, i])
    # repetição de 3+ palavras entre um trecho e o próximo ("funciona para algumas | funciona para algumas coisas"): fica o segundo
    lim = []
    for r in rs:
        while lim:
            a0, a1 = lim[-1]; seq = toks[a0:a1 + 1]; prox = toks[r[0]:r[1] + 1]
            n = next((k for k in range(min(len(seq), len(prox)), 2, -1) if seq[-k:] == prox[:k]), 0)
            if not n: break
            lim[-1][1] -= n
            if lim[-1][1] < lim[-1][0]: lim.pop()
            break
        lim.append(r)
    return lim

def cortes(i0, i1):
    """Tempos de corte (s) para as palavras W[i0..i1], no vale de energia antes/depois."""
    ant = W[i0 - 1]['fim'] if i0 > 0 else W[i0]['ini'] - .3
    nxt = W[i1 + 1]['ini'] if i1 + 1 < NW else W[i1]['fim'] + .3
    t0 = vale(max(ant, W[i0]['ini'] - .25), W[i0]['ini'] + .02)
    t1 = vale(W[i1]['fim'] - .02, min(nxt, W[i1]['fim'] + .3))
    return t0, t1

# ---------- 4. montagem ----------
saida = []; rel = []
for k, f in enumerate(frases):
    c = escolha.get(k)
    if c is None:
        ant = next((x for x in reversed(saida) if x.get('spans')), None)
        prox = next((escolha[kk] for kk in range(k + 1, len(frases)) if kk in escolha), None)
        if ant and prox:
            t0 = vale(ant['src_fim'], ant['src_fim'] + .3); t1 = vale(W[prox['a']]['ini'] - .3, W[prox['a']]['ini'])
            if 0.4 < t1 - t0 < 10:
                saida.append({'n': f['n'], 'texto': f['texto'], 'pausa': f['pausa'], 'spans': [(t0, t1)], 'src_ini': t0, 'src_fim': t1, 'nota': 'buraco'})
                rel.append(f"- {f['n']}: o Whisper não reconheceu a frase; usei o áudio entre as vizinhas ({t0:.1f}-{t1:.1f} s). **Conferir de ouvido.**")
                continue
        rel.append(f"- {f['n']}: **não achada**"); continue
    ts = trechos(f, c)
    spans = [cortes(a, b) for a, b in ts]
    # nunca reaproveitar áudio da frase anterior
    lim_ant = next((x['src_fim'] for x in reversed(saida)), 0)
    spans = [(max(a, lim_ant + .02), b) for a, b in spans if b > lim_ant + .1]
    # nem invadir o começo da frase seguinte ("... Te Tao Ching | a ordem")
    if k + 1 in escolha:
        lim_prox = vale(W[escolha[k + 1]['a']]['ini'] - .25, W[escolha[k + 1]['a']]['ini'] + .02)
        spans = [(a, min(b, lim_prox)) for a, b in spans if a < lim_prox - .1]
    if not spans: rel.append(f"- {f['n']}: **sem áudio próprio** (sobreposta à anterior)"); continue
    usados = [toks[i] for a, b in ts for i in range(a, b + 1)]
    cob = round(c['cob'], 2)
    saida.append({'n': f['n'], 'texto': f['texto'], 'pausa': f['pausa'], 'spans': spans, 'src_ini': spans[0][0], 'src_fim': spans[-1][1], 'nota': cob,
                  'ouvido': ' '.join(usados)})
    if cob < .85 or len(spans) > 1:
        rel.append(f"- {f['n']} (cobertura {cob}, {len(spans)} trecho(s)): roteiro \"{' '.join(f['tok'])}\" · ficou \"{' '.join(usados)}\"")

fade = int(.01 * SR)
LIM = 10 ** (45 / 20)  # silêncio desta gravação fica entre 20 e 40 dB (escala int16), fala entre 60 e 78 dB
def encurtar(x, maxp=.7, alvo=.4):
    """Pausa interna maior que maxp vira alvo (s), com o corte no meio do silêncio e fade curto."""
    e = np.sqrt(np.convolve(x ** 2, np.ones(FR) / FR, 'same')); sil = e < LIM
    out = []; i = 0; n = len(x)
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]: j += 1
            if (j - i) > maxp * SR and i > 0 and j < n:
                h = int(alvo * SR / 2); out.append(x[i:i + h] * np.linspace(1, 0, h)); out.append(x[j - h:j] * np.linspace(0, 1, h))
            else: out.append(x[i:j])
            i = j
        else:
            j = i
            while j < n and not sil[j]: j += 1
            out.append(x[i:j]); i = j
    return np.concatenate(out) if out else x

partes = [np.zeros(int(.6 * SR), np.float32)]; t = .6
for f in saida:
    if f['pausa']: partes.append(np.zeros(int(.5 * SR), np.float32)); t += .5
    ped = []
    for q, (u0, u1) in enumerate(f['spans']):
        pc = encurtar(A[int(u0 * SR):int(u1 * SR)].copy())
        if len(pc) > 2 * fade:
            pc[:fade] *= np.linspace(0, 1, fade); pc[-fade:] *= np.linspace(1, 0, fade)
        if q: ped.append(np.zeros(int(.12 * SR), np.float32))  # respiro curto onde havia repetição ou pausa de gravação
        ped.append(pc)
    trecho = np.concatenate(ped)
    f['ini'] = round(t, 3); partes.append(trecho); t += len(trecho) / SR; f['fim'] = round(t, 3)
    p = .45 if f['texto'].rstrip().endswith(('.', '?', '!')) else (.3 if f['texto'].rstrip().endswith(':') else .2)
    partes.append(np.zeros(int(p * SR), np.float32)); t += p
partes.append(np.zeros(int(1.5 * SR), np.float32))
y = np.clip(np.concatenate(partes), -32768, 32767).astype(np.int16)
bruto = OUT / 'voz_bruta_editada_v2.wav'
with wave.open(str(bruto), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(bruto), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', str(OUT / 'voz_editada_v2.wav')], check=True)
for f in saida: f['spans'] = [[round(a, 3), round(b, 3)] for a, b in f['spans']]; f['src_ini'] = round(f['src_ini'], 3); f['src_fim'] = round(f['src_fim'], 3)
(OUT / 'frases_v2.json').write_text(json.dumps({'duracao': round(len(y) / SR, 2), 'frases': saida}, ensure_ascii=False, indent=1), encoding='utf-8')
rep = ['# Repetições: qual versão ficou em cada frase', '', 'Versão = cada vez que a frase foi falada (tempo na gravação original, narracao-adobe-50.wav). '
       'Cobertura = quanto do roteiro a versão tem. Tropeços = palavras a mais (gaguejo, recomeço).', '']
for k, f in enumerate(frases):
    cs = versoes.get(k, []); c = escolha.get(k)
    if len(cs) < 2 or c is None: continue
    ult = cs[-1]
    if c is ult: motivo = 'a última'
    elif c['cob'] > ult['cob'] + .01: motivo = f"**não é a última**: a última ({ult['t']:.1f} s) cobre menos do roteiro ({ult['cob']:.0%})"
    elif c['extra'] < ult['extra']: motivo = f"**não é a última**: a última ({ult['t']:.1f} s) tem mais tropeços ({ult['extra']})"
    else: motivo = f"**não é a última**: a ordem das frases vizinhas obrigou (a última, em {ult['t']:.1f} s, se sobrepõe à frase seguinte)"
    vs = ' · '.join(f"{x['t']:.1f} s ({x['cob']:.0%}, {x['extra']} trop.)" + (' ← ficou' if x is c else '') for x in cs)
    rep.append(f"- **{f['n']}** \"{f['texto'][:70]}\": {len(cs)} versões: {vs}. Ficou {motivo}.")
(OUT / 'repeticoes.md').write_text(chr(10).join(rep) + chr(10), encoding='utf-8')
(OUT / 'relatorio_voz_v2.md').write_text('# Edição da voz v2: frases para conferir\n\n' + '\n'.join(rel) + '\n', encoding='utf-8')
print('frases', len(saida), 'de', len(frases), '· duração', round(len(y) / SR / 60, 2), 'min · para conferir:', len(rel))

# ---------- tempos.json no formato do palavras.py/construir.py (mesma numeração de falas.json)
_bl = {o['n']: o for o in json.loads((pathlib.Path(__file__).resolve().parent / 'falas.json').read_text(encoding='utf-8'))}
(OUT / 'tempos.json').write_text(json.dumps([{'n': f['n'], 'bloco': _bl[f['n']]['bloco'], 'ini': f['ini'], 'fim': f['fim'], 'texto': _bl[f['n']]['texto']} for f in saida],
                                            ensure_ascii=False, indent=1), encoding='utf-8')
print('tempos.json ok', len(saida), 'frases')
