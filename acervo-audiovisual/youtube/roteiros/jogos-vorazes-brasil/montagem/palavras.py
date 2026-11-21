"""Tempo de cada palavra do roteiro na voz (guia ou do Italo), alinhado pelo TEXTO.
Transcreve frase a frase (faster-whisper small, CPU) dentro da janela de tempos.json e casa as palavras
transcritas com as palavras do roteiro (difflib). Palavra do roteiro sem par fica com interpolação marcada 'est': true,
e não pode virar gatilho de animação sem revisão.
Uso: python palavras.py <voz.wav> <tempos.json> <saida palavras.json>"""
import sys, json, re, difflib, unicodedata, numpy as np, soundfile as sf
from faster_whisper import WhisperModel
voz, tempos, saida = sys.argv[1:4]
a, sr = sf.read(voz, dtype='float32')
if a.ndim > 1: a = a.mean(1)
if sr != 16000:
    import math; n = int(len(a) * 16000 / sr); a = np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype('float32'); sr = 16000
m = WhisperModel('small', device='cpu', compute_type='int8')
UN = {'um': '1', 'uma': '1'}
def norm(w):
    w = unicodedata.normalize('NFD', w.lower()); w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', w)
out = []
for t in json.load(open(tempos, encoding='utf-8')):
    txt = re.sub(r'\[.*?\]|\(baixo\)|\*', '', t['texto'])
    ref = [w for w in txt.split() if norm(w)]
    i0 = max(0, t['ini'] - 0.15); seg = a[int(i0 * sr): int((t['fim'] + 0.15) * sr)]
    segs, _ = m.transcribe(seg, language='pt', word_timestamps=True, beam_size=5, temperature=0, condition_on_previous_text=False,
                           initial_prompt=txt)
    hyp = [(w.word.strip(), w.start + i0, w.end + i0) for s in segs for w in (s.words or [])]
    sm = difflib.SequenceMatcher(a=[norm(w) for w in ref], b=[norm(h[0]) for h in hyp], autojunk=False)
    tm = [None] * len(ref)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size): tm[blk.a + k] = hyp[blk.b + k][1:]
    # interpola os que faltaram entre vizinhos conhecidos
    pal = []
    for k, w in enumerate(ref):
        if tm[k]: pal.append({'w': w, 'ini': round(tm[k][0], 3), 'fim': round(tm[k][1], 3)}); continue
        prev = next((tm[j][1] for j in range(k - 1, -1, -1) if tm[j]), t['ini'])
        nxt = next((tm[j][0] for j in range(k + 1, len(ref)) if tm[j]), t['fim'])
        pal.append({'w': w, 'ini': round(prev, 3), 'fim': round(nxt, 3), 'est': True})
    est = sum(1 for p in pal if p.get('est'))
    out.append({'n': t['n'], 'ini': t['ini'], 'fim': t['fim'], 'palavras': pal, 'estimadas': est})
    print(t['n'], len(ref), 'est', est, flush=True)
json.dump(out, open(saida, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('total estimadas', sum(o['estimadas'] for o in out), 'de', sum(len(o['palavras']) for o in out))
