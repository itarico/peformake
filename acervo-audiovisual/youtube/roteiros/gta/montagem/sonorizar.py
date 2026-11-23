"""Mixa voz + trilha + efeitos para o GTA VI (regras da skill transicoes-willrvail, referência Df2LedmCsjm):
efeito 15 ms antes do quadro, já descontado o ataque do arquivo (muitos arquivos do Pixabay começam com silêncio);
efeito de 0 a +6 dB sobre a trilha; trilha abaixa sob a voz (sidechain); master a -14 LUFS.
Uso: python sonorizar.py <pasta_audio> <eventos.json> <saida.wav> [duracao_s]
Também grava <saida>_faixas/: voz.wav, trilha.wav e cada efeito como arquivo próprio (para o Premiere em A1/A2/A3)."""
import json, subprocess, sys, pathlib, numpy as np, soundfile as sf
AUD = pathlib.Path(sys.argv[1]); EV = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding='utf-8')); SAIDA = pathlib.Path(sys.argv[3])
DUR = float(sys.argv[4]) if len(sys.argv) > 4 else EV['dur']; SR = 48000; N = int(DUR * SR)


def ler(f, ini=0.0, dur=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(ini)] + (['-t', str(dur)] if dur else []) + ['-i', str(f), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).copy()


def ataque(x):
    m = np.abs(x).max(axis=1); pico = m.max()
    return (int(np.argmax(m > 0.1 * pico)) / SR) if pico > 0 else 0.0


def db(v): return 10 ** (v / 20)


voz = np.zeros((N, 2), np.float32); v = ler(AUD / 'voz.wav', 0, DUR); voz[:len(v)] = v[:N]
tr = ler(AUD / 'trilha' / EV.get('trilha', 'gancho.mp3'))
trilha = np.zeros((N, 2), np.float32)
k = 0
while k < N:  # repete a trilha se for curta
    n = min(len(tr), N - k); trilha[k:k + n] = tr[:n]; k += n
trilha *= db(-17)
# sidechain simples: envelope da voz (janela de 50 ms) abaixa a trilha até 8 dB
env = np.convolve(np.abs(voz[:, 0]), np.ones(int(0.05 * SR)) / int(0.05 * SR), 'same')
env = np.clip(env / (np.percentile(env[env > 1e-4], 90) + 1e-9), 0, 1)
trilha *= (1 - 0.6 * env)[:, None]
fx = np.zeros((N, 2), np.float32)
faixas = SAIDA.with_name(SAIDA.stem + '_faixas'); faixas.mkdir(exist_ok=True)
cache = {}
for i, e in enumerate(EV['eventos']):
    if e['t'] >= DUR: continue
    if e['sfx'] not in cache:
        x = ler(AUD / 'sfx' / e['sfx']); cache[e['sfx']] = (x, ataque(x))
    x, at = cache[e['sfx']]
    ini = e['t'] - 0.015 - at
    corte = max(0, -ini); ini = max(0, ini)
    x = x[int(corte * SR):] * db(-12 + e.get('db', 0))   # -12 dBFS base: fica ~0 a +6 dB sobre a trilha
    a = int(ini * SR); n = min(len(x), N - a)
    fx[a:a + n] += x[:n]
    sf.write(faixas / f'fx_{i:03d}_{e["t"]:.2f}_{e["sfx"].replace(".mp3", "")}.wav', x, SR, subtype='PCM_24')
mix = voz + trilha + fx
sf.write(faixas / 'voz.wav', voz, SR, subtype='PCM_24'); sf.write(faixas / 'trilha.wav', trilha, SR, subtype='PCM_24')
tmp = SAIDA.with_suffix('.pre.wav'); sf.write(tmp, mix, SR, subtype='FLOAT')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), str(SAIDA)], check=True)
tmp.unlink()
print('mix', SAIDA, round(DUR, 2), 's; efeitos', len(EV['eventos']))
