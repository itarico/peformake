"""Prepara a mídia e o roteiro de montagem do projeto editável no Premiere (pedido do Italo: camadas separadas e áudio
cortado na linha do tempo, não blocos prontos).
V1 cenas (1 clipe por cena) · V2 vazio (textos estão dentro das cenas) · V3 trechos do trailer e planos do Nim
A1 voz: a gravação ORIGINAL do ElevenLabs (3 partes), cortada por frase com in/out na linha do tempo, corte no silêncio
A2 trilha: 4 faixas (já com a voz abaixando a música), uma por bloco · A3 efeitos: cada efeito como clipe próprio
Uso: python premiere_prep.py <pasta_gta6>   (grava premiere/midia/... e premiere/montagem.json)"""
import json, subprocess, sys, pathlib, numpy as np
G = pathlib.Path(sys.argv[1]); P = G / 'premiere'; M = P / 'midia'
for d in ['cenas', 'trechos', 'trilha']: (M / d).mkdir(parents=True, exist_ok=True)
EV = json.loads((G / 'projeto' / 'eventos.json').read_text(encoding='utf-8'))
VOZ = json.loads((G / 'audio' / 'palavras.json').read_text(encoding='utf-8'))
SR = 48000
mont = {'V1': [], 'V3': [], 'A1': [], 'A2': [], 'A3': []}

# V1: uma cena por clipe (corte exato por quadro, recodificado)
for c in EV['cenas']:
    f = M / 'cenas' / f"{c['id']}.mp4"
    if not f.exists():
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f"{c['ini']:.4f}", '-i', str(G / 'cenas.mp4'), '-t', f"{c['fim'] - c['ini']:.4f}",
                        '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-an', str(f)], check=True)
    mont['V1'].append({'arq': str(f), 'tempo': c['ini']})
# V3: trechos e planos do Nim (MOV com alfa já gerados por trechos.py)
for t in json.loads((G / 'trechos' / 'trechos.json').read_text(encoding='utf-8')):
    mont['V3'].append({'arq': t['mov'], 'tempo': t['t']})


def ler(f):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(pcm, np.float32)


def vale(x, a, b):
    """Ponto de menor energia entre a e b (s)."""
    i, j = int(a * SR), int(b * SR); n = int(0.01 * SR)
    if j - i < 2 * n: return (a + b) / 2
    e = [np.sqrt(np.mean(x[k:k + n] ** 2)) for k in range(i, j - n, n // 2)]
    return (i + int(np.argmin(e)) * (n // 2) + n // 2) / SR


# A1: voz original cortada por frase (segmentos da transcrição), emendas no vale de silêncio entre frases
off = VOZ['offsets']
for p, desloc, limite in [('p1', 0.0, None), ('p2', off['p2'], off['p2_corte']), ('p3', off['p3'], None)]:
    src = G / 'audio' / f'voz_parte{p[1]}.mp3'; x = ler(src); dur = len(x) / SR
    segs = [s for s in json.load(open(G / 'audio' / f'transcricao_{p}.json', encoding='utf-8')) if limite is None or s['ini'] < limite]
    cortes = [0.0]
    for a, b in zip(segs, segs[1:]):
        cortes.append(vale(x, max(a['fim'] - 0.1, a['ini']), max(b['ini'] + 0.1, a['fim'])))
    cortes.append(limite if limite else dur)
    for a, b in zip(cortes, cortes[1:]):
        if b - a > 0.05: mont['A1'].append({'arq': str(src), 'tempo': round(desloc + a, 4), 'in': round(a, 4), 'out': round(b, 4)})
# A2: trilha (já abaixada sob a voz) cortada por bloco
tr = G / 'mix_final_faixas' / 'trilha.wav'
ini = {c['id']: c['ini'] for c in EV['cenas']}
blocos = [0.0, ini['c44'], ini['c68'], ini['c83'], EV['dur']]
for k, (a, b) in enumerate(zip(blocos, blocos[1:])):
    f = M / 'trilha' / f'trilha{k + 1}_bloco.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.4f}', '-i', str(tr), '-t', f'{b - a:.4f}', '-c:a', 'pcm_s24le', str(f)], check=True)
    mont['A2'].append({'arq': str(f), 'tempo': round(a, 4)})
# A3: efeitos (um arquivo por efeito, já no volume certo); posição = quadro - 15 ms - ataque do arquivo
def ataque(f):
    x = ler(f); m = np.abs(x); return float(np.argmax(m > 0.1 * m.max()) / SR) if m.max() > 0 else 0.0
cache = {}
for f in sorted((G / 'mix_final_faixas').glob('fx_*.wav')):
    _, i, t, nome = f.stem.split('_', 3); t = float(t)
    orig = G / 'audio' / 'sfx' / f'{nome}.mp3'
    if orig not in cache: cache[orig] = ataque(orig)
    mont['A3'].append({'arq': str(f), 'tempo': round(max(0, t - 0.015 - cache[orig]), 4)})
json.dump(mont, open(P / 'montagem.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print({k: len(v) for k, v in mont.items()})
