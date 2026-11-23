# GERADO a partir de ../sonorizar.py (v60), para a voz da IA e frases_v3.
# Sonoriza o documentário: trilha por emoção (troca por trecho, com crossfade), ducking pela voz e foley sincronizado
# com a entrada dos objetos de cada cena (tempos tirados do motor.html). Saída: mix_final.wav e taoismo_final_v60.mp4.
# Músicas e efeitos: Pixabay (licença Pixabay, uso comercial, sem Content ID registrado), créditos em audio/creditos-audio.csv.
import json, subprocess, pathlib
import numpy as np

AQUI = pathlib.Path(__file__).resolve().parent.parent
V90 = AQUI / 'v90'
TRAB = pathlib.Path('G:/lucas/taoismo_v90')
AUD = AQUI.parent / 'audio'
SR = 48000
proj = json.loads((V90 / 'proj_v90.json').read_text(encoding='utf-8'))
fr = json.loads((V90 / 'frases_v3.json').read_text(encoding='utf-8'))
F = {}
for f in fr['frases']:
    F[str(f['n'])] = f
    if str(f['n']).isdigit(): F[int(f['n'])] = f

def ler(p, ss=0, dur=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(ss), '-i', str(p)] + (['-t', str(dur)] if dur else []) + ['-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).copy()

def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
def db(g): return 10 ** (g / 20)

voz = ler(V90 / 'voz_ia.wav'); N = len(voz)
musica = np.zeros((N, 2), np.float32); sfx = np.zeros((N, 2), np.float32)

def colocar(buf, x, t, ganho_db, fade_in=.01, fade_out=.05):
    i = int(t * SR)
    if i >= N or len(x) == 0: return
    x = x[:N - i] * db(ganho_db)
    fi = min(len(x), int(fade_in * SR)); fo = min(len(x), int(fade_out * SR))
    if fi: x[:fi] *= np.linspace(0, 1, fi)[:, None]
    if fo: x[-fo:] *= np.linspace(1, 0, fo)[:, None]
    buf[max(0, i):i + len(x)] += x[max(0, -i):]

# ---------- trilha: (frase que abre o trecho, faixa, onde começar na faixa em s) ----------
TRILHA = [(1, 'abertura_2', 0), (8, 'abertura_1', 4), (13, 'agua_4', 0), (28, 'agua_1', 8), (35, 'lenda_4', 0),
          (43, 'livro_2', 0), (51, 'agua_2', 6), (58, 'ciencia_1', 0), (76, 'religiao_3', 0), (87, 'religiao_2', 10),
          (91, 'virada_1', 0), (95, 'ciencia_2', 0), (106, 'pilula_2', 0), (110, 'agua_3', 10), (114, 'pilula_1', 0)]
XF = 1.5
def inicio_frase(n): return 0.0 if n == 1 else F[n]['ini'] - .25
for k, (n, faixa, off) in enumerate(TRILHA):
    t0 = inicio_frase(n); t1 = inicio_frase(TRILHA[k + 1][0]) if k + 1 < len(TRILHA) else N / SR
    dur = t1 - t0 + XF
    x = ler(AUD / 'trilha' / f'{faixa}.mp3', off)
    vivo = np.where(np.abs(x).max(axis=1) > db(-30))[0]; x = x[:vivo[-1] - int(1.5 * SR)] if len(vivo) else x  # corta o final que morre
    base = x.copy(); xf = int(2 * SR)
    while len(x) < dur * SR:  # faixa curta: emenda nela mesma com crossfade de 2 s
        x = np.concatenate([x[:-xf], x[-xf:] * np.linspace(1, 0, xf)[:, None] + base[:xf] * np.linspace(0, 1, xf)[:, None], base[xf:]])
    x = x[:int(dur * SR)]
    x *= db(-20 - rms_db(x))  # todas as faixas no mesmo nível antes do ducking
    colocar(musica, x, t0 - (XF / 2 if k else 0), 0, fade_in=XF if k else 2.5, fade_out=XF if k + 1 < len(TRILHA) else 4)

# ducking: envelope da voz (ataque 40 ms, soltura 400 ms); com voz a trilha cai ~11 dB, nas pausas volta
env = np.abs(voz).max(axis=1); jan = int(.02 * SR)
env = np.convolve(env, np.ones(jan) / jan, 'same')
fala = (env > db(-38)).astype(np.float32)
g = np.empty_like(fala); a, r = 1 - np.exp(-1 / (.04 * SR)), 1 - np.exp(-1 / (.4 * SR)); v = 0.0
for i in range(0, len(fala), 48):  # passo de 1 ms basta
    alvo = fala[i]; v += (alvo - v) * (1 - (1 - (a if alvo > v else r)) ** 48); g[i:i + 48] = v
musica *= (db(-16) * (1 - g) + db(-22) * g)[:, None]  # v90b: trilha 6 dB mais baixa (Italo: musica mais alta que a narracao, 23/11)

# ---------- foley ----------
_cache = {}
def som(nome, ss=0, dur=None):
    k = (nome, ss, dur)
    if k not in _cache:
        x = ler(AUD / 'sfx' / f'{nome}.mp3', ss, dur)
        ini = np.where(np.abs(x).max(axis=1) > np.abs(x).max() * .05)[0]  # muitos efeitos do Pixabay começam com silêncio (0,3 a 0,6 s): corta para o som bater na hora
        x = x[max(0, ini[0] - int(.005 * SR)):] if len(ini) else x; _cache[k] = x * db(-12 - max(-60, 20 * np.log10(np.abs(x).max() + 1e-9)))
    return _cache[k].copy()
AGUA = ('rio', 'li-river', 'canion', 'guilin')
tinta = ['tinta_1', 'tinta_2', 'tinta_3']
for i, c in enumerate(proj['cenas']):
    t, d, tp = c['ini'], c['fim'] - c['ini'], c['tipo']
    clip = c.get('frames', {}).get('dir', '').split('/')[-1]
    if tp == 'foto_mesa':
        colocar(sfx, som('papel_2', 0, 1.2), t, -6)
        if c.get('data'): colocar(sfx, som('maquina_1', 1, .8), t + .3, -12)
        if c.get('img2'): colocar(sfx, som('papel_3', 0, 1.0), t + 1.2, -10)
        if c.get('selo'): colocar(sfx, som('carimbo_1'), t + 1.8, -2)
    elif tp == 'manuscrito_troca':
        colocar(sfx, som('papel_1', 0, 1.5), t, -8)
        colocar(sfx, som('pagina_1'), t + d * .25 + .1, -4)
        colocar(sfx, som('carimbo_2'), t + d * .25 + 2.6, -3)
    elif tp == 'capitulo':
        colocar(sfx, som('sino_3', 0, 6), t + .1, -6, fade_out=2)
    elif tp == 'frase_tinta':
        colocar(sfx, som('pincel_1', 0, 2.0), t + .2, -8)
    elif tp == 'citacao':
        colocar(sfx, som('pagina_2'), t, -6)
    elif tp == 'decreto':
        colocar(sfx, som('papel_2', 1.5, 1.0), t, -8); colocar(sfx, som('carimbo_3'), t + .8, 0)
    elif tp in ('linha_tempo', 'diagrama_wuwei'):
        colocar(sfx, som('pincel_3'), t + .4, -8)
    elif tp == 'piramide':
        for k in (.2, .6, 1.0): colocar(sfx, som('pincel_3'), t + k, -10)
    elif tp == 'yinyang':
        colocar(sfx, som('sino_1', 0, 7), t, -10, fade_out=3)
    elif tp == 'pintura':
        colocar(sfx, som('pincel_2', 0, 2.0), t + .3, -14)
    elif tp == 'video_moldura':
        colocar(sfx, som('pagina_3', 0, 1.2), t, -8)
    elif tp == 'video_cheio':
        if clip.startswith('mapa3d'): colocar(sfx, som(tinta[i % 3]), t, -8)
        if c.get('data'): colocar(sfx, som('maquina_1', 3, .6), t + .3, -14)
    # ambiente do vídeo real (bem baixo, por baixo da voz)
    if clip.startswith(AGUA): colocar(sfx, som('agua_1', 5, d + .5) * db(-6), t, -14, fade_in=.6, fade_out=.8)
    elif clip == 'bambu': colocar(sfx, som('bambu_3', 3, d + .5), t, -16, fade_in=.6, fade_out=.8)
    elif clip.startswith('caligrafia'): colocar(sfx, som('pincel_2', 0, min(d, 3.7)), t + .2, -16, fade_in=.2, fade_out=.6)
    elif clip.startswith('incenso'): colocar(sfx, som('sino_2', 0, min(d, 8)), t + .3, -18, fade_out=3)
for b in proj['blocos']:  # transição de tinta entre blocos: swoosh + impacto grave
    colocar(sfx, som(tinta[int(b) % 3]), b - .9, -4)
    colocar(sfx, som('impacto_1', 0, 2.5), b - .1, -8, fade_out=1)

mix = voz + musica + sfx * .45  # v90: efeitos mais baixos
pico = np.abs(mix).max(); mix /= max(1.0, pico / .97)
esc = 1 / max(1.0, pico / .97)
def grava(x, nome):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(TRAB / nome)], input=x.astype(np.float32).tobytes(), check=True)
grava(voz * esc, 'A1_voz.wav'); grava(musica * esc, 'A2_trilha.wav'); grava(sfx * .45 * esc, 'A3_foley.wav')
bruto = TRAB / 'mix_bruto.wav'; final = TRAB / 'mix_v90.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(bruto)], input=mix.astype(np.float32).tobytes(), check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(bruto), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), str(final)], check=True)
print('ok', final, 'pico', round(20 * np.log10(pico + 1e-9), 2))
