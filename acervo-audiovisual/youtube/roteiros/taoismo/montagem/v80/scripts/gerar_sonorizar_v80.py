# Gera sonorizar_v80.py a partir do sonorizar.py do v60 (intocado): mesma trilha por bloco e mesmo ducking, retimados
# pela voz_editada_v2; foley novo lido de linha_v80.json (efeitos T1-T6 e textos); respiro de som na troca Te/Tao;
# saidas separadas para o Premiere (A1 voz, A2 trilha, A3 foley) e o mix final.
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
s = (AQUI.parent.parent / 'sonorizar.py').read_text(encoding='utf-8')
def troca(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)
troca("AQUI = pathlib.Path(__file__).resolve().parent\n",
      "AQUI = pathlib.Path(__file__).resolve().parent.parent.parent  # pasta montagem\nV80 = AQUI / 'v80'\nTRAB = pathlib.Path('G:/lucas/taoismo_v80/saida')\n")
troca("proj = json.loads((AQUI / 'proj.json').read_text(encoding='utf-8'))", "L = json.loads((V80 / 'linha_v80.json').read_text(encoding='utf-8'))")
troca("fr = json.loads((AQUI / 'frases.json').read_text(encoding='utf-8'))", "fr = json.loads((AQUI / 'frases_v2.json').read_text(encoding='utf-8'))")
troca("voz = ler(AQUI / 'voz_editada.wav')", "voz = ler(AQUI / 'voz_editada_v2.wav')")
troca("musica *= (db(-6) * (1 - g) + db(-17) * g)[:, None]", "musica *= (db(-6) * (1 - g) + db(-11) * g)[:, None]  # v80: trilha entre -28 e -22 dB sob a voz (pedido do Italo)")
i0 = s.index('# ---------- foley ----------'); i1 = s.index('mix = voz + musica + sfx * .8')
FOLEY = r'''# ---------- foley do v80 (regras em v80/NOTAS-SOM.md) ----------
_cache = {}
def som(nome, ss=0, dur=None):
    k = (nome, ss, dur)
    if k not in _cache:
        p = AUD / ('sfx_v80' if nome.startswith('pedra') else 'sfx') / f'{nome}.mp3'
        x = ler(p, ss, dur); _cache[k] = x * db(-12 - max(-60, 20 * np.log10(np.abs(x).max() + 1e-9)))
    return _cache[k].copy()
def ataque(x):
    e = np.abs(x).max(axis=1); return np.argmax(e > e.max() * .1) / SR
def sfxp(nome, t, g, ss=0, dur=None, **kw):  # o ataque do som cai 15 ms antes do instante t
    x = som(nome, ss, dur); colocar(sfx, x, max(0, t - ataque(x) - .015), g, **kw)
def grave(x, semitons=-7):  # versao mais grave (gongo baixo a partir do sino) por reamostragem simples
    f = 2 ** (semitons / 12); idx = np.arange(0, len(x) - 1, f)
    return np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in range(2)], 1).astype(np.float32)
AGUA = ('rio', 'li-river', 'canion', 'guilin')
GRANDES = {1, 3}  # viradas grandes (blocos 2 e 4): gongo na pincelada
respiros = []
for k, p in enumerate(L['planos']):
    t, d, fx = p['t0'], p['t1'] - p['t0'], p.get('fx', '')
    clip = p.get('video', {}).get('dir', '').split('/')[-1]
    if fx == 't1':  # abertura: pedra arrastando, gota, pincel molhado e gongo baixo no q20 da mancha
        x = som('pedra_arrasta'); x = np.concatenate([x, x[::-1] * .6]); colocar(sfx, x, t + .1, -4, fade_out=.4)
        sfxp('tinta_1', t + 1.0 + 6 / 24, -6); sfxp('pincel_2', t + 1.0 + 6 / 24, -10, 0, 1.0)
        g = grave(som('sino_1', 0, 6)); colocar(sfx, g, t + 1.0 + 26 / 24 - ataque(g) - .015, -6, fade_out=2)
    if k == 1: sfxp('pedra_assenta', t, -4)
    if fx == 't3': g = grave(som('sino_3', 0, 5), -12); colocar(sfx, g, t - ataque(g), -12, fade_out=1.5)
    if fx == 't4': sfxp('tinta_1', t + 10 / 24, -4); colocar(sfx, som('agua_1', 5, d), t + 10 / 24, -16, fade_in=.3, fade_out=.6)
    if fx == 't6': sfxp('bambu_1', t + .4, -12, 0, 1.2); sfxp('sino_2', t + .4 + 20 / 24, -16, 0, 2.5, fade_out=1)
    if fx == 't5':
        T = (p['textos'][0]['t'] if p['textos'] else t); respiros.append(T)
    for x in p['textos']:  # tipografia: so os destaques fazem som
        if x['e'] == 'G': sfxp('carimbo_1', x['t'], -2); g = grave(som('sino_1', 0, 5)); colocar(sfx, g, x['t'] - ataque(g), -8, fade_out=2)
        elif x['e'] == 'D': sfxp('carimbo_2', x['t'], -6)
        elif x['e'] == 'H': sfxp('pincel_3', x['t'], -12)
        elif x['e'] == 'R': sfxp('maquina_1', x['t'], -16, 1, .5)
        elif x['e'] == 'Q': sfxp('pagina_2', x['t'], -8)
        elif x['e'] == 'T' and x['red']: sfxp('pincel_1', x['t'], -12, 0, .8)
    # ambiente baixo dos videos reais
    if clip.startswith(AGUA): colocar(sfx, som('agua_1', 5, d + .4) * db(-6), t, -16, fade_in=.4, fade_out=.5)
    elif clip == 'bambu': colocar(sfx, som('bambu_3', 3, d + .4), t, -18, fade_in=.4, fade_out=.5)
    elif clip.startswith('incenso'): colocar(sfx, som('sino_2', 0, min(d, 6)), t + .2, -18, fade_out=2)
for j, b in enumerate(L['blocos']):  # T2: bambu no q5 da pincelada, carimbo no q14, gongo so nas viradas grandes
    sfxp('bambu_2', b + 5 / 24 - 5 / 24, -4); sfxp('carimbo_3', b + 14 / 24, -2)
    if j in GRANDES: g = grave(som('sino_1', 0, 6), -9); colocar(sfx, g, b + 14 / 24 - ataque(g), -6, fade_out=2.5)
# respiro de som (estudo Df2LedmCsjm): passa-baixa crescente, trilha a zero 0,3 s antes, impacto grave no T, volta em T+0,5
if respiros:
    abafada = ler_array_lowpass = None
    import subprocess as _sp
    cru = musica.astype(np.float32).tobytes()
    lp = np.frombuffer(_sp.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'lowpass=f=500,lowpass=f=500',
                                '-f', 'f32le', '-'], input=cru, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2)
    for T in respiros:
        a, b0, c = int((T - .8) * SR), int((T - .3) * SR), int(T * SR)
        w = np.linspace(0, 1, b0 - a)[:, None] ** .7; musica[a:b0] = musica[a:b0] * (1 - w) + lp[a:b0] * w
        musica[b0:int((T + .5) * SR)] = 0
        f = int(.2 * SR); r0 = int((T + .5) * SR); musica[r0:r0 + f] *= np.linspace(0, 1, f)[:, None]
        sfxp('impacto_2', T, 0, 0, .6, fade_out=.15)
'''
s = s[:i0] + FOLEY + s[i1:]
i2 = s.index("bruto = AQUI / 'mix_bruto.wav'")
SAIDA = r'''TRAB.mkdir(parents=True, exist_ok=True)
def grava(x, nome):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(TRAB / nome)],
                   input=x.astype(np.float32).tobytes(), check=True)
esc = 1 / max(1.0, pico / .97)
grava(voz * esc, 'A1_voz.wav'); grava(musica * esc, 'A2_trilha.wav'); grava(sfx * .8 * esc, 'A3_foley.wav')  # faixas para o Premiere
bruto = TRAB / 'mix_v80_bruto.wav'; final = TRAB / 'mix_v80.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(bruto)], input=mix.astype(np.float32).tobytes(), check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(bruto), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), str(final)], check=True)
print('ok', final, 'pico antes do loudnorm', round(20 * np.log10(pico + 1e-9), 2), 'dBFS; respiros em', [round(r, 2) for r in respiros])
'''
s = s[:i2] + SAIDA
(AQUI / 'sonorizar_v80.py').write_text('# GERADO por gerar_sonorizar_v80.py a partir de ../../sonorizar.py (v60). Nao editar a mao.\n' + s, encoding='utf-8')
print('ok')
