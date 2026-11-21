# Edita a narração: acha cada frase da NARRACAO-PARA-GRAVAR.md na transcrição, fica com a ÚLTIMA tentativa de cada frase,
# corta pela palavra (nunca no meio) e monta voz_editada.wav + frases.json (tempo de cada frase na voz editada).
import json, re, subprocess, unicodedata, wave, pathlib
from difflib import SequenceMatcher
import numpy as np

BASE = pathlib.Path(r'C:\Claude\canal-youtube\taoismo')
ROT = pathlib.Path(r'C:\Claude\peformake\acervo-audiovisual\youtube\roteiros\taoismo\NARRACAO-PARA-GRAVAR.md')
SR = 48000

U = 'zero um dois tres quatro cinco seis sete oito nove dez onze doze treze quatorze quinze dezesseis dezessete dezoito dezenove'.split()
D = 'x x vinte trinta quarenta cinquenta sessenta setenta oitenta noventa'.split()
C = 'x cento duzentos trezentos quatrocentos quinhentos seiscentos setecentos oitocentos novecentos'.split()
def extenso(n):  # 0..9999 por extenso, para comparar "1788" com "mil setecentos e oitenta e oito"
    if n < 20: return U[n]
    if n < 100: return D[n // 10] + ('' if n % 10 == 0 else ' e ' + U[n % 10])
    if n == 100: return 'cem'
    if n < 1000: return C[n // 100] + ('' if n % 100 == 0 else ' e ' + extenso(n % 100))
    m = 'mil' if n // 1000 == 1 else extenso(n // 1000) + ' mil'
    return m + ('' if n % 1000 == 0 else ' e ' + extenso(n % 1000))

def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    s = re.sub(r'(\d)\.(\d{3})', r'', s)  # 2.400 -> 2400
    s = re.sub(r'\d+', lambda m: ' ' + extenso(int(m.group())) + ' ' if int(m.group()) < 10000 else m.group(), s)
    return [t for t in re.findall(r'[a-z0-9]+', s) if t != 'e']  # o "e" de ligação varia demais entre fala e texto

frases = []
for l in ROT.read_text(encoding='utf-8').splitlines():
    m = re.match(r'^(\d+)\. (.*)', l)
    if not m or int(m.group(1)) > 125: continue
    txt = m.group(2)
    if 'Frases ' in txt: continue
    pausa = '[pausa]' in txt
    limpo = re.sub(r'\[pausa\]|\(baixo\)|\*\*', '', txt).strip()
    frases.append({'n': int(m.group(1)), 'texto': limpo, 'pausa': pausa, 'tok': norm(limpo)})
frases = [f for f in frases if f['n'] <= 125][:125]

partes_tr = [BASE / 'audio' / n for n in ('transcricao_a.json', 'transcricao_b.json')]  # transcrição feita em 2 trechos (GPU + CPU)
if not all(x.exists() for x in partes_tr): partes_tr = [BASE / 'audio' / 'transcricao.json']
tr = sorted([s for x in partes_tr for s in json.loads(x.read_text(encoding='utf-8'))], key=lambda s: s['ini'])
# trecho refeito na GPU (o small da CPU entrou em loop "uei, uei..." perto de 1126 s): substitui o que houver nesse intervalo
rc = BASE / 'audio' / 'transcricao_c.json'
if rc.exists():
    c = json.loads(rc.read_text(encoding='utf-8')); a0, a1 = c[0]['ini'], c[-1]['fim']
    antes = [s for s in tr if s['ini'] < a0]; depois = [s for s in tr if s['ini'] >= a1]
    corte = max([s['fim'] for s in antes] + [0])  # o trecho de antes pode entrar no começo do refeito: não duplica
    tr = antes + [s for s in c if s['ini'] >= corte - .2] + depois
W = []
for s in tr:
    for w in s['palavras']:
        for t in norm(w['p']):
            W.append({'t': t, 'ini': w['ini'], 'fim': min(w['fim'], w['ini'] + 1.0)})  # Whisper estica a última palavra sobre o silêncio
toks = [w['t'] for w in W]

def achar(tok, de, ate, thr):
    L = len(tok); r = []
    for i in range(de, min(ate, len(W))):
        for L2 in {max(1, round(L * .8)), L, round(L * 1.2) + 1}:
            if i + L2 > len(W): continue
            sc = SequenceMatcher(None, tok, toks[i:i + L2]).ratio()
            if sc >= thr: r.append((sc, i, L2))
    return r

def seguinte(k):  # tokens das próximas frases (pelo menos 6), para servir de âncora
    t = []
    for f in frases[k + 1:k + 4]:
        t += f['tok']
        if len(t) >= 6: break
    return t

# Para cada frase: acha a 1ª ocorrência; a âncora é a 1ª ocorrência das frases seguintes depois dela.
# As janelas que se sobrepõem são a mesma tentativa; fica a ÚLTIMA tentativa cuja nota fica perto da melhor.
def repeticoes(i0, i1):
    """Índices mantidos em [i0, i1]: se um trecho de 3+ palavras se repete logo adiante, corta a 1ª cópia (gaguejo/retake curto)."""
    keep = list(range(i0, i1 + 1)); mudou = True
    while mudou:
        mudou = False; tk = [toks[x] for x in keep]
        for k in (6, 5, 4, 3, 2, 1):  # trechos longos podem estar longe; 1-2 palavras só se repetidas logo em seguida ("que que", "fechada em... fechada em")
            alcance = 26 if k >= 3 else (5 if k == 2 else 3)
            for p in range(len(tk) - k):
                for q in range(p + 1, min(len(tk) - k + 1, p + alcance)):
                    if k == 1 and len(tk[p]) < 3: continue
                    if tk[p:p + k] == tk[q:q + k]:
                        keep = keep[:p] + keep[q:]; mudou = True; break
                if mudou: break
            if mudou: break
    return keep

cursor = 0; saida = []; baixas = []
for k, f in enumerate(frases):
    best = achar(f['tok'], cursor, cursor + 700, .55)
    if not best:
        baixas.append((f['n'], 0)); continue
    prim = min(b[1] for b in best if b[0] >= max(b2[0] for b2 in best) - .15)
    prox = seguinte(k); limite = len(W)
    if prox:
        a_ = achar(prox, prim + 1, prim + 400, .72)
        if a_:  # começo real da próxima frase: a 1ª palavra que bate (a janela pode começar antes)
            def real(b):
                bl_ = [x for x in SequenceMatcher(None, prox, toks[b[1]:b[1] + b[2]]).get_matching_blocks() if x.size]
                if not bl_: return b[1]
                g_ = max(bl_, key=lambda x: x.size)  # maior bloco, recuado pelo que falta antes dele na frase
                return b[1] + max(0, g_.b - g_.a)
            limite = min(real(b) for b in a_)
    cand = sorted([b for b in best if b[1] < limite] or best, key=lambda b: b[1])
    # tentativas: janelas boas (nota perto da melhor) que começam a até 3 palavras umas das outras; fica a última tentativa
    top = max(b[0] for b in cand); boas = [b for b in cand if b[0] >= top - .1]; tent = []
    for b in boas:
        if tent and b[1] - tent[-1][-1][1] <= 3: tent[-1].append(b)
        else: tent.append([b])
    sc, i, L2 = max(tent[-1])
    # aperta a janela nas palavras que batem e estende o que o Whisper escreveu diferente (números) nas pontas
    bl = [x for x in SequenceMatcher(None, f['tok'], toks[i:i + L2]).get_matching_blocks() if x.size]
    j0 = i + bl[0].b - min(bl[0].a, 4); j1 = i + bl[-1].b + bl[-1].size - 1 + min(len(f['tok']) - (bl[-1].a + bl[-1].size), 4)
    j0 = max(j0, cursor); j1 = min(j1, len(W) - 1, (limite - 1) if limite < len(W) else len(W) - 1)
    # a melhor janela pode acabar cedo (repetição dentro dela): segue enquanto as palavras forem desta frase
    vocab = set(f['tok']); fimmax = min(limite, len(W)) - 1
    while j1 < fimmax and (toks[j1 + 1] in vocab or (j1 + 2 <= fimmax and toks[j1 + 2] in vocab)) and W[j1 + 1]['ini'] - W[j1]['fim'] < 1.5:
        j1 += 1
    if j1 < j0: j0, j1 = i + bl[0].b, max(i + bl[-1].b + bl[-1].size - 1, i + bl[0].b)
    keep = repeticoes(j0, j1); grupos = []
    for x in keep:  # novo pedaço onde houve corte de repetição ou silêncio longo (pausa de gravação)
        if grupos and x == grupos[-1][-1] + 1 and W[x]['ini'] - W[x - 1]['fim'] < .6: grupos[-1].append(x)
        else: grupos.append([x])
    spans = [(W[g[0]]['ini'], W[g[-1]]['fim']) for g in grupos]
    if sc < .7: baixas.append((f['n'], round(sc, 2)))
    saida.append({**{k2: f[k2] for k2 in ('n', 'texto', 'pausa')}, 'src_ini': spans[0][0], 'src_fim': spans[-1][1], 'spans': spans, 'nota': round(sc, 2)})
    cursor = j1 + 1

# frase que o Whisper engoliu: se as vizinhas foram achadas e o buraco é curto, usa o áudio entre elas
achadas = {f['n'] for f in saida}
for f in frases:
    if f['n'] in achadas: continue
    ant = next((x for x in saida if x['n'] == f['n'] - 1), None); seg_ = next((x for x in saida if x['n'] == f['n'] + 1), None)
    if ant and seg_ and 0.4 < seg_['src_ini'] - ant['src_fim'] < 10:
        saida.append({'n': f['n'], 'texto': f['texto'], 'pausa': f['pausa'], 'src_ini': ant['src_fim'] + .1, 'src_fim': seg_['src_ini'] - .15, 'spans': [(ant['src_fim'] + .1, seg_['src_ini'] - .15)], 'nota': 'buraco'})
        print('frase', f['n'], 'tirada do buraco entre vizinhas')
saida.sort(key=lambda x: x['n'])

pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(BASE / 'audio' / 'narracao-adobe-72.wav'), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                     capture_output=True, check=True).stdout
a = np.frombuffer(pcm, np.int16).astype(np.float32)
partes = [np.zeros(int(.6 * SR), np.float32)]; t = .6; fade = int(.012 * SR)
for f in saida:
    if f['pausa']: partes.append(np.zeros(int(.55 * SR), np.float32)); t += .55
    sp = f.get('spans') or [(f['src_ini'], f['src_fim'])]; pedacos = []
    for q, (u0, u1) in enumerate(sp):
        s0 = max(0, int((u0 - (.07 if q == 0 else .03)) * SR)); s1 = min(len(a), int((u1 + (.14 if q == len(sp) - 1 else .06)) * SR))
        pc = a[s0:s1].copy()
        if len(pc) > 2 * fade:
            pc[:fade] *= np.linspace(0, 1, fade); pc[-fade:] *= np.linspace(1, 0, fade)
        if q: pedacos.append(np.zeros(int(.22 * SR), np.float32))  # respiro curto onde havia pausa longa ou repetição
        pedacos.append(pc)
    trecho = np.concatenate(pedacos)
    f['ini'] = round(t + .07, 3); partes.append(trecho); t += len(trecho) / SR; f['fim'] = round(t - .1, 3)
    pausa = .32 if f['texto'].rstrip().endswith(('.', '?', '!', ':')) else .18
    partes.append(np.zeros(int(pausa * SR), np.float32)); t += pausa
partes.append(np.zeros(int(1.5 * SR), np.float32))
y = np.clip(np.concatenate(partes), -32768, 32767).astype(np.int16)
out = BASE / 'montagem' / 'voz_bruta_editada.wav'
with wave.open(str(out), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000',
                str(BASE / 'montagem' / 'voz_editada.wav')], check=True)
(BASE / 'montagem' / 'frases.json').write_text(json.dumps({'duracao': round(len(y) / SR, 2), 'frases': saida}, ensure_ascii=False, indent=1), encoding='utf-8')
print('frases achadas', len(saida), 'de', len(frases), '· duração', round(len(y) / SR / 60, 2), 'min')
print('nota baixa (conferir):', baixas)
