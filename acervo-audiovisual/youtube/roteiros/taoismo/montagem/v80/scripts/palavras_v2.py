# Tempo de cada palavra da voz_editada_v2 (Whisper local), para a tipografia entrar na hora em que a palavra e dita.
# Transcreve frase por frase (pedacos curtos): com o PC carregado, o audio inteiro estourava a memoria.
# Saida: v80/palavras_v2.json = [{n, ini, fim, texto, palavras: [{p, ini, fim}]}], alinhado a frases_v2.json.
import json, pathlib, subprocess
import numpy as np
from faster_whisper import WhisperModel
V80 = pathlib.Path(__file__).resolve().parent.parent; MONT = V80.parent
fr = json.loads((MONT / 'frases_v2.json').read_text(encoding='utf-8'))['frases']
SR = 16000
audio = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(MONT / 'voz_editada_v2.wav'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                                     capture_output=True, check=True).stdout, np.float32)  # o av instalado nao abre arquivo pelo faster_whisper
m = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=4)  # a GPU daqui nao tem cublas64_12.dll
out = []
for f in fr:
    a = max(0.0, f['ini'] - .2); b = f['fim'] + .3
    segs, _ = m.transcribe(audio[int(a * SR):int(b * SR)].copy(), language='pt', word_timestamps=True, vad_filter=False, beam_size=3,
                           initial_prompt=f['texto'])
    ws = [{'p': w.word.strip(), 'ini': round(a + w.start, 3), 'fim': round(a + w.end, 3)} for s in segs for w in s.words]
    out.append({'n': f['n'], 'ini': f['ini'], 'fim': f['fim'], 'texto': f['texto'], 'palavras': ws})
(V80 / 'palavras_v2.json').write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8')
print('ok', sum(len(o['palavras']) for o in out), 'palavras;', sum(1 for o in out if not o['palavras']), 'frases sem palavra')
