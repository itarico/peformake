# Gera sonorizar_v70.py a partir do sonorizar.py do v60 (que fica intocado): mesma trilha, mesmo ducking e mesmo foley,
# lendo proj_v70.json, com foley proprio para as 5 cenas OpenMotion (tipo 'om') e saida em openmotion_v70/mix_v70.wav.
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
s = (AQUI.parent / 'sonorizar.py').read_text(encoding='utf-8')

def troca(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)

troca("AQUI = pathlib.Path(__file__).resolve().parent\n",
      "AQUI = pathlib.Path(__file__).resolve().parent.parent  # pasta montagem (v60)\nV70 = pathlib.Path(__file__).resolve().parent\n")
troca("proj = json.loads((AQUI / 'proj.json').read_text(encoding='utf-8'))",
      "proj = json.loads((V70 / 'proj_v70.json').read_text(encoding='utf-8'))")
FOLEY_OM = '''
# ---------- foley das cenas OpenMotion do v70 (tempos = momentos em que cada objeto entra na cena) ----------
def ataque(x):  # varios arquivos do Pixabay comecam com silencio: mede onde o som de fato bate
    e = np.abs(x).max(axis=1); return np.argmax(e > e.max() * .1) / SR
def om(t0, lista):  # o ataque do som cai no quadro em que o objeto entra
    for nome, ss, dur, dt, g in lista:
        x = som(nome, ss, dur); colocar(sfx, x, max(0, t0 + dt - ataque(x)), g)
for c in proj['cenas']:
    if c['tipo'] != 'om': continue
    t = c['ini']
    if c['om'] == 'corte':      # colunas escritas a pincel, risco do corte, troca de colunas, reescrita
        om(t, [('pincel_3', 0, None, .3, -16), ('pincel_3', 0, None, .75, -16), ('pincel_3', 0, None, 1.2, -16),
               ('pincel_1', 0, 1.2, 6.34, -6), ('papel_1', 0, .9, 6.6, -10), ('pagina_2', 0, None, 7.18, -8),
               ('pincel_3', 0, None, 8.4, -10), ('pincel_3', 0, None, 8.55, -12), ('pincel_3', 0, None, 8.7, -12)])
    elif c['om'] == 'mapa':     # contorno a pincel, alfinetes, carimbo em Pequim, tiras de bambu, circulo da duvida, setas
        om(t, [('pincel_2', 0, 2.2, .2, -12), ('tinta_1', 0, None, 1.0, -14), ('tinta_2', 0, None, 1.3, -14),
               ('carimbo_1', 0, None, 2.1, -4), ('bambu_2', 0, None, 6.45, -6), ('pincel_3', 0, None, 9.95, -10),
               ('pincel_3', 0, None, 14.6, -12), ('pincel_3', 0, None, 14.85, -12), ('pincel_3', 0, None, 15.1, -12)])
    elif c['om'] == 'livro':    # riscos vermelhos, estacoes da linha do tempo, carimbo dos 81 capitulos
        om(t, [('maquina_1', 1, .6, .3, -14), ('pincel_1', 0, .9, 4.9, -8), ('pincel_1', 0, .9, 8.0, -8),
               ('tinta_1', 0, None, 9.55, -14), ('tinta_2', 0, None, 10.03, -14), ('bambu_2', 0, None, 11.35, -8),
               ('papel_3', 0, .8, 12.83, -12), ('pincel_3', 0, None, 13.19, -12), ('tinta_3', 0, None, 14.07, -14),
               ('pagina_2', 0, None, 15.05, -10), ('carimbo_3', 0, None, 18.6, -4)])
    elif c['om'] == 'yinyang':  # sino na entrada do simbolo, toques de tinta nas quatro faces, circulo vermelho
        x = som('sino_1', 0, 7); colocar(sfx, x, t + .2 - ataque(x), -10, fade_out=3)
        om(t, [('tinta_1', 0, None, 2.91, -14), ('tinta_2', 0, None, 3.61, -14), ('tinta_3', 0, None, 4.43, -14),
               ('tinta_1', 0, None, 5.63, -14), ('pincel_3', 0, None, 11.3, -10)])
    elif c['om'] == 'funciona': # gotas de tinta voando e assentando na palavra
        om(t, [('tinta_2', 0, None, .15, -8), ('tinta_3', 0, None, .9, -12), ('pincel_1', 0, 1.0, 2.4, -10)])
'''
troca("for b in proj['blocos']:", FOLEY_OM + "for b in proj['blocos']:")
troca("bruto = AQUI / 'mix_bruto.wav'; final = AQUI / 'mix_final.wav'", "bruto = V70 / 'mix_v70_bruto.wav'; final = V70 / 'mix_v70.wav'")
i = s.index("subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(AQUI / 'taoismo_final.mp4')")
s = s[:i] + "print('ok', final, 'pico antes do loudnorm', round(20 * np.log10(pico + 1e-9), 2), 'dBFS')\n"
(AQUI / 'sonorizar_v70.py').write_text('# GERADO por gerar_sonorizar_v70.py a partir de ../sonorizar.py (v60). Nao editar a mao.\n' + s, encoding='utf-8')
print('ok sonorizar_v70.py')
