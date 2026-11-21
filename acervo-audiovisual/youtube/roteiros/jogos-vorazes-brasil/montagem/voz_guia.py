"""Voz-guia (Kokoro, kokoro-onnx, voz pm_alex) para montar antes da voz do Italo.
Lê falas.json, narra frase a frase e grava voz_guia.wav + tempos.json (início/fim de cada frase).
Uso: <venv-kokoro>/python voz_guia.py <pasta_saida> <pasta_modelos>
A voz do Italo depois substitui esta: o tempos.json dela sai do editar_voz (mesma numeração)."""
import json, re, sys, pathlib, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
aqui = pathlib.Path(__file__).resolve().parent
out = pathlib.Path(sys.argv[1]); mod = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(mod / 'kokoro-v1.0.onnx'), str(mod / 'voices-v1.0.bin'))
FALAR = {'royalties': 'róialtis', 'PIB': 'pib', 'Pix': 'piks', 'bets': 'béts', 'panem et circenses': 'pánem ét circênses',
         'Panem': 'Pánem', 'DIP': 'dip', 'Suzanne Collins': 'Suzân Cólins', 'reality show': 'riáliti xou'}
falas = json.load(open(aqui / 'falas.json', encoding='utf-8'))
SR = 24000; pista = []; t = 0.0; tempos = []; ant = None
def sil(s): return np.zeros(int(s * SR), dtype=np.float32)
pista.append(sil(1.0)); t = 1.0
for f in falas:
    if ant is not None:
        g = 1.2 if f['bloco'] != ant['bloco'] else (0.6 if f['sub'] != ant['sub'] else 0.3)
        pista.append(sil(g)); t += g
    txt = re.sub(r'\(baixo\)|\*', '', f['texto']); pausa = '[pausa]' in txt; txt = txt.replace('[pausa]', '').strip()
    for a, b in FALAR.items(): txt = re.sub(r'\b' + re.escape(a) + r'\b', b, txt)
    s, sr = k.create(txt, voice='pm_alex', speed=1.0, lang='pt-br'); assert sr == SR
    s = s.astype(np.float32)
    nz = np.nonzero(np.abs(s) > 0.01)[0]
    if len(nz): s = s[max(0, nz[0] - 600): nz[-1] + 1200]
    tempos.append({'n': f['n'], 'bloco': f['bloco'], 'ini': round(t, 3), 'fim': round(t + len(s) / SR, 3), 'texto': f['texto']})
    pista.append(s); t += len(s) / SR
    if pausa: pista.append(sil(0.9)); t += 0.9
    ant = f; print(f['n'], round(t, 1), flush=True)
pista.append(sil(1.5))
w = np.concatenate(pista); w = w / max(1e-6, np.abs(w).max()) * 0.89
sf.write(out / 'voz_guia.wav', w, SR)
json.dump(tempos, open(out / 'tempos.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('total', round(len(w) / SR, 1), 's')
