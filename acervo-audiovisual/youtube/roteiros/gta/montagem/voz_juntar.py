"""Junta as 3 partes da voz do ElevenLabs (Fernando Will) numa trilha só e gera os tempos por palavra no tempo global.
A parte 2 saiu cortada no meio da última frase: ela é cortada no vale de silêncio antes de "Fim de jogo" e a parte 3
entra no lugar. Os cortes andam até o vale de energia (o Whisper erra o começo da palavra em até 0,3 s).
Uso: python voz_juntar.py <pasta_audio>  (lê voz_parte1..3.mp3 e transcricao_p1/p2/p3.json; grava voz.wav e palavras.json)"""
import json, subprocess, sys, pathlib, numpy as np, soundfile as sf
A = pathlib.Path(sys.argv[1]); SR = 48000


def ler(f):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(pcm, np.float32).copy()


def vale(x, t, janela=0.35):
    """Ponto de menor energia (janelas de 10 ms) entre t-janela e t."""
    a, b = int((t - janela) * SR), int(t * SR)
    seg = x[max(0, a):b]; n = int(0.01 * SR)
    e = [np.sqrt(np.mean(seg[i:i + n] ** 2)) for i in range(0, max(1, len(seg) - n), n // 2)]
    return (max(0, a) + int(np.argmin(e)) * (n // 2) + n // 2) / SR


def palavras(f):
    return [w for s in json.load(open(f, encoding='utf-8')) for w in s['palavras']]


v1, v2, v3 = ler(A / 'voz_parte1.mp3'), ler(A / 'voz_parte2.mp3'), ler(A / 'voz_parte3.mp3')
w1, w2, w3 = palavras(A / 'transcricao_p1.json'), palavras(A / 'transcricao_p2.json'), palavras(A / 'transcricao_p3.json')
i_fim = max(i for i, w in enumerate(w2) if w['p'].lower().startswith('fim'))
corte2 = vale(v2, w2[i_fim]['ini'])
gap = lambda s: np.zeros(int(s * SR), np.float32)
o2 = len(v1) / SR + 0.6
o3 = o2 + corte2 + 0.7
trilha = np.concatenate([v1, gap(0.6), v2[:int(corte2 * SR)], gap(0.7), v3])
sf.write(A / 'voz.wav', trilha, SR, subtype='PCM_24')
todas = ([dict(w, parte=1) for w in w1] + [dict(w, parte=2, ini=round(w['ini'] + o2, 3), fim=round(w['fim'] + o2, 3)) for w in w2[:i_fim]] +
         [dict(w, parte=3, ini=round(w['ini'] + o3, 3), fim=round(w['fim'] + o3, 3)) for w in w3])
json.dump({'offsets': {'p1': 0, 'p2': round(o2, 4), 'p2_corte': round(corte2, 4), 'p3': round(o3, 4)}, 'duracao': round(len(trilha) / SR, 6),
           'palavras': todas}, open(A / 'palavras.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('duracao', round(len(trilha) / SR, 2), 's | p2 cortada em', round(corte2, 2), '| palavras', len(todas))
