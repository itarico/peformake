"""Ataques (eventos sonoros) e andamento aproximado de um WAV mono 16-bit. Uso: onsets.py arquivo.wav"""
import sys, wave, numpy as np
w = wave.open(sys.argv[1]); sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
hop, n = 256, 1024
fr = np.array([x[i:i+n] * np.hanning(n) for i in range(0, len(x) - n, hop)])
S = np.abs(np.fft.rfft(fr, axis=1)); f = np.fft.rfftfreq(n, 1 / sr)
flux = np.maximum(0, np.diff(np.log1p(S), axis=0)).sum(1)
rms = np.sqrt((fr ** 2).mean(1)); thr = flux.mean() + 1.2 * flux.std(); last = -1
for p in range(1, len(flux) - 1):
    if flux[p] > thr and flux[p] >= flux[p-1] and flux[p] >= flux[p+1]:
        t = (p + 1) * hop / sr
        if t - last < 0.08: continue
        last = t; sp = S[p+1]; cen = (sp * f).sum() / sp.sum(); lo = sp[f < 200].sum() / sp.sum()
        print(f"{t:5.2f}s flux={flux[p]:6.1f} rms={20*np.log10(rms[p+1]+1e-9):5.1f}dB centroide={cen:6.0f}Hz grave={lo:.2f}")
ac = np.correlate(flux - flux.mean(), flux - flux.mean(), 'full')[len(flux)-1:]
lags = np.arange(len(ac)) * hop / sr; m = (lags > 0.3) & (lags < 1.5)
best = lags[m][np.argmax(ac[m])]; print(f"periodo~{best:.3f}s BPM~{60/best:.1f}")
