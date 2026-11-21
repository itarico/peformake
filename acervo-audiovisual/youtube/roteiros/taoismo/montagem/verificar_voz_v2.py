# Confere a voz editada v2: transcreve voz_editada_v2.wav (large-v3-turbo) e compara cada frase (tempos de frases_v2.json)
# com o roteiro. Aponta palavra faltando, palavra sobrando (repetição) e palavra cortada nas bordas.
# Saída: verificacao_voz_v2.md
import json, os, pathlib, subprocess, sys
from difflib import SequenceMatcher
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).parent))
for _m in ('cublas', 'cudnn'):
    try:
        _d = os.path.join(__import__('nvidia.' + _m, fromlist=['x']).__path__[0], 'bin'); os.add_dll_directory(_d); os.environ['PATH'] = _d + ';' + os.environ['PATH']
    except Exception: pass
from faster_whisper import WhisperModel

AQUI = pathlib.Path(__file__).resolve().parent
src = open(AQUI / 'editar_voz_v2.py', encoding='utf-8').read()
g = {}; exec(src.split('# ---------- roteiro')[0], g); norm = g['norm']
fr = json.loads((AQUI / 'frases_v2.json').read_text(encoding='utf-8'))['frases']

pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(AQUI / 'voz_editada_v2.wav'), '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
m = WhisperModel('large-v3-turbo', device='cuda', compute_type='int8_float16')
segs, _ = m.transcribe(audio, language='pt', word_timestamps=True, vad_filter=False, condition_on_previous_text=False, temperature=0.0, beam_size=1,
                       initial_prompt='Tao Te Ching, Laozi, Mawangdui, Guodian, Sima Qian, Hangu, Zhang Daoling, Xuanzong, Dunhuang, wu wei, qigong, tai chi, Liu Pai Lin.')
P = [w for s in segs for w in (s.words or [])]
(AQUI / 'transcricao_voz_v2.json').write_text(json.dumps([{'p': w.word.strip(), 'ini': round(w.start, 2), 'fim': round(w.end, 2)} for w in P], ensure_ascii=False), encoding='utf-8')

linhas = []; ok = 0
for f in fr:
    ws = [w for w in P if f['ini'] - .15 <= (w.start + w.end) / 2 <= f['fim'] + .15]
    ouv = [t for w in ws for t in norm(w.word)]; rot = norm(f['texto'])
    sm = SequenceMatcher(None, rot, ouv, autojunk=False)
    falta = [rot[i] for op, i1, i2, j1, j2 in sm.get_opcodes() if op in ('delete', 'replace') for i in range(i1, i2)]
    sobra = [ouv[j] for op, i1, i2, j1, j2 in sm.get_opcodes() if op in ('insert', 'replace') for j in range(j1, j2)]
    rep = [ouv[j] for j in range(1, len(ouv)) if ouv[j] == ouv[j - 1] and len(ouv[j]) > 2]
    r = sm.ratio()
    if r >= .85 and not rep and len(sobra) <= 2: ok += 1; continue
    linhas.append(f"- **{f['n']}** ({f['ini']:.1f} s, nota {r:.2f}) roteiro: \"{' '.join(rot)}\"\n  ouvido: \"{' '.join(ouv)}\""
                  + (f"\n  falta: {' '.join(falta)}" if falta else '') + (f"\n  sobra: {' '.join(sobra)}" if sobra else '') + (f"\n  repetição: {' '.join(rep)}" if rep else ''))
(AQUI / 'verificacao_voz_v2.md').write_text(f'# Verificação da voz v2\n\n{ok} de {len(fr)} frases batem com o roteiro (nota 0,85 ou mais, sem repetição).\n\n' + '\n'.join(linhas) + '\n', encoding='utf-8')
print(ok, 'de', len(fr), 'ok;', len(linhas), 'para olhar')
