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
# trilha por emoção: troca no corte de bloco (missões 2, 3, 4), com cruzamento de 1 s; arquivo que faltar usa gancho.mp3
ini_cena = {c['id']: c['ini'] for c in EV['cenas']}
blocos = [(0.0, 'trilha1.mp3')] + [(ini_cena[c], f) for c, f in [('c44', 'trilha2.mp3'), ('c68', 'trilha3.mp3'), ('c83', 'trilha4.mp3')] if c in ini_cena]
trilha = np.zeros((N, 2), np.float32); XF = int(1.0 * SR)
for b, (t0, arq) in enumerate(blocos):
    f = AUD / 'trilha' / arq
    tr = ler(f if f.exists() else AUD / 'trilha' / 'gancho.mp3')
    a = int(t0 * SR); fim = int(blocos[b + 1][0] * SR) + XF if b + 1 < len(blocos) else N
    seg = np.zeros((min(fim, N) - a, 2), np.float32); k = 0
    while k < len(seg):
        n = min(len(tr), len(seg) - k); seg[k:k + n] = tr[:n]; k += n
    seg *= 1 / (np.sqrt(np.mean(seg ** 2)) + 1e-9)          # cada faixa no mesmo nível antes do ajuste pela voz
    if b > 0: seg[:XF] *= np.linspace(0, 1, min(XF, len(seg)))[:, None]
    if b + 1 < len(blocos): seg[-XF:] *= np.linspace(1, 0, XF)[:, None]
    trilha[a:a + len(seg)] += seg
# níveis pela voz (pedido do Italo, 23/11: música e efeitos estavam mais altos que a narração)
rms = lambda x: float(np.sqrt(np.mean(x[np.abs(x).max(axis=1) > 1e-3] ** 2)) + 1e-9)
v_rms = rms(voz)
trilha *= (v_rms * db(-20)) / rms(trilha)   # trilha 20 dB abaixo da fala
# sidechain simples: envelope da voz (janela de 50 ms) abaixa a trilha até 8 dB
env = np.convolve(np.abs(voz[:, 0]), np.ones(int(0.05 * SR)) / int(0.05 * SR), 'same')
env = np.clip(env / (np.percentile(env[env > 1e-4], 90) + 1e-9), 0, 1)
trilha *= (1 - 0.7 * env)[:, None]   # e mais 10 dB quando há fala
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
    x = x[int(corte * SR):]
    x = x * (v_rms * db(-14 + min(e.get('db', 0), 4)) / rms(x))   # efeito sempre abaixo da voz (-14 a -10 dB)
    a = int(ini * SR); n = min(len(x), N - a)
    fx[a:a + n] += x[:n]
    sf.write(faixas / f'fx_{i:03d}_{e["t"]:.2f}_{e["sfx"].replace(".mp3", "")}.wav', x, SR, subtype='PCM_24')
mix = voz + trilha + fx
sf.write(faixas / 'voz.wav', voz, SR, subtype='PCM_24'); sf.write(faixas / 'trilha.wav', trilha, SR, subtype='PCM_24')
tmp = SAIDA.with_suffix('.pre.wav'); sf.write(tmp, mix, SR, subtype='FLOAT')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), str(SAIDA)], check=True)
tmp.unlink()
print('mix', SAIDA, round(DUR, 2), 's; efeitos', len(EV['eventos']))
