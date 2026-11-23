# Alinha a voz da IA (voz_ia.wav) ao texto da narracao v3, frase por frase, pelo texto (Whisper por palavra).
# Saida: v90/frases_v3.json {duracao, frases:[{n, texto, ini, fim, palavras:[{p,ini,fim}]}]}
import json, pathlib, re, subprocess, unicodedata, difflib
import numpy as np
from faster_whisper import WhisperModel
V90 = pathlib.Path(__file__).resolve().parent.parent
TXT = pathlib.Path(r'C:\Claude\peformake\acervo-audiovisual\youtube\roteiros\taoismo\NARRACAO-v3.md').read_text(encoding='utf-8')
corpo = TXT[TXT.index('## Bloco 0'):TXT.index('---', TXT.index('## Bloco 0'))]
fr = []
for l in corpo.splitlines():
    m = re.match(r'^(\d+b?)\.\s+(.*)', l)
    if m:
        t = re.sub(r'\[pausa\]\s*|\(baixo\)\s*', '', m.group(2)).replace('**', '').strip()
        fr.append({'n': m.group(1), 'texto': t})
def nz(s):
    s = unicodedata.normalize('NFD', s.lower()); return re.sub(r'[^a-z0-9]', '', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))
SR = 16000
audio = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(V90 / 'voz_ia.wav'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32)
m = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=4)
ws = []
for k in range(0, len(audio), SR * 60):  # pedacos de 60 s com 2 s de sobra
    a = max(0, k - 2 * SR); seg = audio[a:k + SR * 60]
    s, _ = m.transcribe(seg, language='pt', word_timestamps=True, beam_size=3, condition_on_previous_text=False)
    for x in s:
        for w in x.words:
            t0 = a / SR + w.start
            if t0 >= k / SR - .05 or k == 0: ws.append({'p': w.word.strip(), 'ini': round(t0, 3), 'fim': round(a / SR + w.end, 3)})
# alinhamento texto x transcricao por palavra normalizada
ref = [(i, nz(w)) for i, f in enumerate(fr) for w in f['texto'].split() if nz(w)]
hyp = [nz(w['p']) for w in ws]
sm = difflib.SequenceMatcher(a=[r[1] for r in ref], b=hyp, autojunk=False)
casa = {}
for blk in sm.get_matching_blocks():
    for j in range(blk.size): casa[blk.a + j] = blk.b + j
por_frase = {}
for ri, (fi, _) in enumerate(ref):
    if ri in casa: por_frase.setdefault(fi, []).append(ws[casa[ri]])
out = []
for i, f in enumerate(fr):
    p = por_frase.get(i, [])
    f2 = dict(f, palavras=p, ini=p[0]['ini'] if p else None, fim=p[-1]['fim'] if p else None,
              cobertura=round(len(p) / max(1, len([w for w in f['texto'].split() if nz(w)])), 2))
    out.append(f2)
for i, f in enumerate(out):  # frase sem palavra casada: entre as vizinhas
    if f['ini'] is None:
        ant = next((o['fim'] for o in reversed(out[:i]) if o['fim']), 0); pos = next((o['ini'] for o in out[i + 1:] if o['ini']), len(audio) / SR)
        f['ini'], f['fim'] = ant + .05, pos - .05
json.dump({'duracao': round(len(audio) / SR, 3), 'frases': out}, open(V90 / 'frases_v3.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
fracas = [(f['n'], f['cobertura']) for f in out if f['cobertura'] < .7]
print('frases', len(out), 'palavras', len(ws), 'cobertura baixa:', fracas)
