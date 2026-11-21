# Transcreve a narração com tempo por palavra (faster-whisper na CPU). Saída: transcricao.json e transcricao.txt
import json, subprocess, sys, pathlib
import numpy as np, os
# DLLs CUDA (pip nvidia-cublas-cu12 e nvidia-cudnn-cu12) para rodar na GPU
for _m in ('cublas', 'cudnn'):
    try:
        _d = os.path.join(__import__('nvidia.' + _m, fromlist=['x']).__path__[0], 'bin'); os.add_dll_directory(_d); os.environ['PATH'] = _d + ';' + os.environ['PATH']
    except Exception: pass
from faster_whisper import WhisperModel
AQUI = pathlib.Path(__file__).resolve().parent
src = AQUI / os.environ.get('SRC', 'narracao-adobe-50.wav')
INI = float(os.environ.get('INI', 0)); SUF = os.environ.get('SUF', '')  # trecho: começa em INI s, saída transcricao<SUF>.json
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(INI), '-t', os.environ.get('DURA', '99999'), '-i', str(src), '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
modelo = WhisperModel(sys.argv[1] if len(sys.argv) > 1 else 'small', device=os.environ.get('DEV', 'cuda'), compute_type=os.environ.get('CT', 'int8_float16'))
segs, info = modelo.transcribe(audio, language='pt', word_timestamps=True, vad_filter=True,
                               # retakes repetem frases: sem isso o Whisper entra no fallback de temperatura e trava
                               condition_on_previous_text=False, temperature=0.0, compression_ratio_threshold=None, beam_size=int(os.environ.get('BEAM', 5)),
                               initial_prompt='Tao Te Ching, Laozi, Mawangdui, Guodian, Sima Qian, Hangu, Zhang Daoling, Xuanzong, Dunhuang, wu wei, qigong, tai chi, Liu Pai Lin.')
out = []
for s in segs:
    out.append({'ini': round(s.start + INI, 2), 'fim': round(s.end + INI, 2), 'texto': s.text.strip(),
                'palavras': [{'p': w.word.strip(), 'ini': round(w.start + INI, 2), 'fim': round(w.end + INI, 2)} for w in (s.words or [])]})
    print(f"{s.start + INI:7.1f} {s.text.strip()}", flush=True)
(AQUI / f'transcricao{SUF}.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
(AQUI / f'transcricao{SUF}.txt').write_text('\n'.join(f"[{o['ini']:.1f}] {o['texto']}" for o in out), encoding='utf-8')
print('ok', len(out))
