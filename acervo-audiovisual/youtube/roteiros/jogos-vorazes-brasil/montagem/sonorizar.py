"""Som do vídeo Panem a partir de eventos.json (gerado pelo construir.py).
- Voz: cada frase recortada do arquivo de voz (tempos originais) e posta no tempo final da linha.
- Trilha por emoção: troca na marca do bloco, com crossfade de 1,5 s; ducking pela voz (-9 dB sob a fala).
- Respiro: trilha em silêncio no intervalo marcado (o impacto que vem depois soa sozinho).
- SFX: ataque medido (1º ponto acima de 10 % do pico) e o som adiantado para bater 15 ms ANTES do quadro;
  nível = trilha + db do evento (0 a +6 dB; impacto depois de respiro até +10 dB).
- Saídas (48 kHz): voz.wav, trilha.wav, sfx.wav (faixas A1, A2, A3 do Premiere) e mix.wav a -14 LUFS.
Uso: python sonorizar.py <projeto com eventos.json> <pasta audio> <voz.wav> <saida>"""
import sys, json, pathlib, subprocess, numpy as np, soundfile as sf
PROJ, AUD, VOZ, OUT = map(pathlib.Path, sys.argv[1:5]); OUT.mkdir(parents=True, exist_ok=True)
SR = 48000
E = json.loads((PROJ / 'eventos.json').read_text(encoding='utf-8'))
N = int(E['dur'] * SR)

def carrega(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).copy()
def rms(x): return float(np.sqrt(np.mean(x ** 2)) + 1e-9)
def db(v): return 10 ** (v / 20)

# ---------- voz
v = carrega(VOZ); voz = np.zeros((N, 2), np.float32)
_gr = sorted((int(k), L) for k, L in E['linha'].items() if L['orig_fim'] > L['orig_ini'])   # frases gravadas, em ordem
# A voz entra em BLOCOS contínuos, sem recorte por frase: frases seguidas com o mesmo deslocamento (vídeo - voz) são
# copiadas de uma vez. Recortar por frase no tempo do Whisper picava palavra (fade no meio da fala e trecho dobrado).
blocos = []
for n, L in _gr:
    d = L['ini'] - L['orig_ini']
    if blocos and abs(d - blocos[-1][0]) < 0.02: blocos[-1][2] = L['orig_fim']
    else: blocos.append([d, L['orig_ini'], L['orig_fim']])
_env = np.abs(v).max(1)
def _vale(t0, t1):                                    # ponto mais silencioso entre t0 e t1 (s), para a emenda dos blocos
    a, b = int(max(0, t0) * SR), int(min(len(v) / SR, t1) * SR)
    if b - a < 480: return t0
    k = _env[a:b][:(b - a) // 480 * 480].reshape(-1, 480).max(1); return (a + int(np.argmin(k)) * 480 + 240) / SR
for i, (d, t0, t1) in enumerate(blocos):
    ini = 0.0 if i == 0 else _vale(blocos[i - 1][2], t0)
    fim = len(v) / SR if i + 1 == len(blocos) else _vale(t1, blocos[i + 1][1])
    a, b = int(ini * SR), int(fim * SR); seg = v[a:b].copy(); f = int(0.008 * SR)
    seg[:f] *= np.linspace(0, 1, f)[:, None]; seg[-f:] *= np.linspace(1, 0, f)[:, None]
    o = a + int(round(d * SR))
    if o < 0: seg = seg[-o:]; o = 0
    voz[o:o + len(seg)] += seg[:max(0, N - o)]
print('blocos de voz:', len(blocos))
voz *= db(-18) / rms(voz[np.abs(voz).max(1) > 0.01])          # voz em torno de -18 dBFS RMS na fala

# ---------- trilha por emoção
MUS = db(-27)                                                  # trilha sem fala ~ -27 dBFS RMS
trilha = np.zeros((N, 2), np.float32); cues = E['trilha'] + [[E['dur'], None, 0]]
for (t0, nome, g), (t1, _, _) in zip(cues, cues[1:]):
    m = carrega(AUD / 'trilha' / f'{nome}.mp3'); m *= MUS * db(g) / rms(m)
    a, b = int(t0 * SR), min(N, int((t1 + 1.5) * SR)); L = b - a
    while len(m) < L: m = np.concatenate([m, m])
    seg = m[:L].copy(); fi = int(1.0 * SR) if t0 > 0 else int(0.3 * SR); fo = int(1.5 * SR)
    seg[:fi] *= np.linspace(0, 1, fi)[:, None]
    if b < N: seg[-fo:] *= np.linspace(1, 0, fo)[:, None]
    trilha[a:b] += seg
# ducking: envelope da voz (ataque 60 ms, soltura 350 ms)
env = np.abs(voz).max(1); hop = 480; e = env[:len(env) // hop * hop].reshape(-1, hop).max(1) > 0.004
g = np.ones(len(e)); alvo = np.where(e, db(-9), 1.0); cur = 1.0
for i, al in enumerate(alvo):
    k = 0.6 if al < cur else 0.1; cur += (al - cur) * k; g[i] = cur
g = np.repeat(g, hop); g = np.pad(g, (0, N - len(g)), constant_values=1.0)
trilha *= g[:, None]
for a, b in E['respiros']:
    ia, ib = int(a * SR), int(b * SR); r = int(0.05 * SR)
    trilha[ia:ia + r] *= np.linspace(1, 0, r)[:, None]; trilha[ia + r:ib] = 0
    vol = int(0.4 * SR); trilha[ib:ib + vol] *= np.linspace(0, 1, vol)[:, None]

# ---------- efeitos
sfx = np.zeros((N, 2), np.float32); cache = {}
for ev in E['eventos']:
    nome = ev['sfx']
    if nome not in cache:
        p = (pathlib.Path('C:/Claude/canal-youtube/taoismo/audio/sfx') / (nome.split('/', 1)[1] + '.mp3')) if nome.startswith('taoismo/') else AUD / f'{nome}.mp3'
        x = carrega(p); pk = np.abs(x).max(); at = int(np.argmax(np.abs(x).max(1) > 0.1 * pk))
        x = x[: at + int(2.5 * SR)]                              # no máximo 2,5 s depois do ataque
        x[-int(0.2 * SR):] *= np.linspace(1, 0, int(0.2 * SR))[:, None]
        ativo = x[at: at + int(0.25 * SR)]
        cache[nome] = (x / np.abs(x).max(), at)                 # normalizado pelo PICO: o nível abaixo é o pico do efeito
    x, at = cache[nome]
    o = int((ev['t'] - 0.015) * SR) - at
    # Efeito sempre ABAIXO da fala (retorno do Italo, 23/11): pico em -17 dBFS quando há fala por perto (os picos da voz ficam
    # entre 0 e -6 dBFS); só no silêncio (impacto depois de respiro, cartela) ele sobe para -9 dBFS.
    _i0, _i1 = max(0, int((ev['t'] - 0.25) * SR)), int((ev['t'] + 0.9) * SR)
    tem_voz = _i1 > _i0 and float(np.abs(voz[_i0:_i1]).max()) > 0.02
    nivel = db((-17 if tem_voz else -9) + max(-6, min(6, ev['db'])) * 0.35)   # pico do efeito em dBFS (pico da voz: 0 a -6)
    if o < 0: x, o = x[-o:], 0
    L = min(len(x), N - o); sfx[o:o + L] += x[:L] * nivel

# ---------- saída
for nome, arr in [('voz', voz), ('trilha', trilha), ('sfx', sfx)]: sf.write(OUT / f'{nome}.wav', arr, SR, subtype='FLOAT')
mix = voz + trilha + sfx; sf.write(OUT / 'mix_bruto.wav', mix, SR, subtype='FLOAT')
r = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(OUT / 'mix_bruto.wav'), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                   capture_output=True, text=True)
j = json.loads(r.stderr[r.stderr.rindex('{'):r.stderr.rindex('}') + 1])
# Ganho FIXO até -14 LUFS + limitador de pico. O loudnorm em dois passos caía no modo dinâmico quando o pico estourava
# e ficava abaixando e subindo a voz no meio das palavras.
ganho = -14.0 - float(j['input_i'])
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / 'mix_bruto.wav'), '-af',
                f"volume={ganho:.2f}dB,alimiter=limit=0.84:attack=3:release=60:level=false", '-ar', str(SR), str(OUT / 'mix.wav')], check=True)
(OUT / 'mix_bruto.wav').unlink()
print('mix ok', E['dur'], 's | entrada', j['input_i'], 'LUFS | ganho', round(ganho, 2), 'dB | eventos', len(E['eventos']))
